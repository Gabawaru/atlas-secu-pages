# Atlas experimental session (visual demo)

**URL (Pages):** `/atlas-secure/experimental/`  
**Scope:** purely visual / demonstrative. No real auth, RoE, or AuthorizedLaunch wiring.

## Concepts demoed

1. **Login vault** — fade → recenter lockup → credential ghost → vault open  
2. **Logout vault** — pieces rejoin → snappy close → session clear  
3. **Logo (pré-v3)** — wordmark **ATLAS** + restored abstract triangle mark  
 
4. **Landing replay** — return to scroll top replays first-visit intro

## Isolation

Lives under `atlas-secure/` so production `index.html` stays intact aside from a small conversation-style link. Sibling vault-motion work on main should not conflict with this folder.
