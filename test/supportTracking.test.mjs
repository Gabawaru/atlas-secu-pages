/**
 * Node smoke for multi-device support tracking (no browser).
 * Run: node --test test/supportTracking.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'supportTracking.js'), 'utf8');

function loadModule(env = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const fetches = [];
  const global = {
    localStorage,
    ATLAS_API_BASE: env.ATLAS_API_BASE,
    fetch: env.fetch || (async (url, init) => {
      fetches.push({ url: String(url), init });
      return new Response(JSON.stringify({ error: 'offline' }), { status: 503 });
    }),
    AbortController,
    setTimeout,
    clearTimeout,
    Response,
    /* Default PC-confirmed path for existing handoff tests. */
    __ATLAS_C1_FORCE_PHONE__: env.forcePhone ?? false,
    __ATLAS_C1_CONFIRM__: env.confirm ?? (() => true),
  };
  vm.runInNewContext(src, global, { filename: 'supportTracking.js' });
  return { api: global.AtlasSupportTracking, fetches, localStorage, store, global };
}

describe('AtlasSupportTracking multi-device', () => {
  it('tables empty until handoff — no supportSessionId', () => {
    const { api } = loadModule();
    const s = api.getState();
    assert.equal(s.handoffRequested, false);
    assert.equal(s.supportSessionId, null);
    assert.equal(s.tickets.length, 0);
    assert.equal(s.vulns.length, 0);
  });

  it('local handoff seeds soft twin without PII keys', async () => {
    const { api } = loadModule();
    const r = await api.requestHandoff();
    assert.equal(r.ok, true);
    assert.equal(r.state.handoffRequested, true);
    assert.equal(r.state.mode, 'local');
    assert.ok(r.state.tickets.length >= 1);
    const raw = JSON.stringify(r.state);
    assert.equal(/email|firstName|password|sessionToken/i.test(raw), false);
  });

  it('remote handoff stores opaque supportSessionId and syncs collections', async () => {
    const sid = 'sup_opaque_abc123xyz';
    const { api, fetches } = loadModule({
      ATLAS_API_BASE: 'https://api.example.test',
      fetch: async (url, init) => {
        const u = String(url);
        if (u.endsWith('/v1/support/handoff') && init?.method === 'POST') {
          const body = JSON.parse(init.body);
          assert.equal(body.source, 'atlas-secu-pages');
          assert.equal(body.email, undefined);
          assert.equal(body.name, undefined);
          assert.equal(body.initiatedFrom, 'pc');
          assert.ok(typeof body.pcConfirmedAt === 'string' && body.pcConfirmedAt.length > 10);
          return new Response(
            JSON.stringify({
              supportSessionId: sid,
              ticketId: 'TKT-REMOTE',
              tickets: [
                {
                  id: 'TKT-REMOTE',
                  subject: 'Prise en charge Pragma',
                  status: 'ouvert',
                  updatedAt: '2026-11-12T00:00:00.000Z',
                },
              ],
              vulns: [],
              progress: [
                {
                  ticketId: 'TKT-REMOTE',
                  label: 'Reçu',
                  pct: 10,
                  note: 'ok',
                  updatedAt: '2026-11-12T00:00:00.000Z',
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (u.includes('/v1/support/tickets')) {
          assert.equal(init.headers['X-Atlas-Support-Session'], sid);
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 'TKT-REMOTE',
                  subject: 'Prise en charge Pragma',
                  status: 'en cours',
                  updatedAt: '2026-11-12T01:00:00.000Z',
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (u.includes('/v1/support/vulns')) {
          return new Response(JSON.stringify({ items: [] }), { status: 200 });
        }
        if (u.includes('/v1/support/progress')) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  ticketId: 'TKT-REMOTE',
                  label: 'Reçu',
                  pct: 25,
                  note: 'sync',
                  updatedAt: '2026-11-12T01:00:00.000Z',
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response('nope', { status: 404 });
      },
    });

    const r = await api.requestHandoff();
    assert.equal(r.ok, true);
    assert.equal(r.state.supportSessionId, sid);
    assert.equal(r.state.mode, 'remote');
    assert.equal(r.state.tickets[0].id, 'TKT-REMOTE');

    const sync = await api.syncFromRemote();
    assert.equal(sync.synced, true);
    assert.equal(sync.state.tickets[0].status, 'en cours');
    assert.equal(sync.state.progress[0].pct, 25);
    void fetches;
  });

  it('API failure → soft-twin, still usable', async () => {
    const { api } = loadModule({
      ATLAS_API_BASE: 'https://api.example.test',
    });
    const r = await api.requestHandoff();
    assert.equal(r.ok, true);
    assert.equal(r.state.mode, 'soft-twin');
    assert.ok(r.state.tickets.length >= 1);
    assert.equal(r.state.supportSessionId, null);
  });

  it('ingestVulns refused before handoff', async () => {
    const { api } = loadModule();
    const r = await api.ingestVulns([{ title: 'HSTS', risk: 'moyen' }]);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no_handoff');
  });

  it('C1 phone fail-closed — no soft twin seed', async () => {
    const { api } = loadModule({ forcePhone: true });
    const r = await api.requestHandoff();
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'phone_blocked');
    assert.equal(api.getState().handoffRequested, false);
    assert.equal(api.getState().tickets.length, 0);
  });

  it('C1 cancel — no soft twin seed', async () => {
    const { api } = loadModule({ confirm: () => false });
    const r = await api.requestHandoff();
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'c1_cancelled');
    assert.equal(api.getState().handoffRequested, false);
  });

  it('gateSupportHandoffC1 PC ok returns pcConfirmedAt', () => {
    const { api } = loadModule();
    const g = api.gateSupportHandoffC1();
    assert.equal(g.ok, true);
    assert.equal(g.initiatedFrom, 'pc');
    assert.ok(g.pcConfirmedAt);
  });
});
