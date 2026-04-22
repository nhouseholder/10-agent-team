# Sample Valid Think Tool Output

This file demonstrates a valid THINK_TOOL block in SLOW mode with proper evidence logging.

## Agent Response

I'll analyze the authentication approach for this microservice API.

```
MODE: slow
JUSTIFICATION: Auth decision affects security posture and has 3+ viable approaches with high stakes.
```

THINK_TOOL:
  mode: slow
  gist: "Choose JWT with RS256 over session-based auth for stateless microservice API"
  evidence_log:
    - pull_1:
        tool: read
        target: "docs/security-requirements.md"
        finding: "Requires stateless auth. No server-side session storage available in microservice architecture."
    - pull_2:
        tool: engram_mem_search
        target: "auth decisions past"
        finding: "Past decision (2024-03): JWT for similar microservice. No issues reported in 12 months."
    - pull_3:
        tool: webfetch
        target: "OWASP JWT best practices 2025"
        finding: "Short expiry + refresh tokens recommended. RS256 for asymmetric signing preferred over HS256."
  disconfirmer: "Session-based auth with Redis would provide better token revocation and is simpler to reason about, but requires shared state."
  pre_mortem:
    - "JWT secret rotation could invalidate all active tokens without proper key versioning"
    - "Token size with large claims could exceed HTTP header limits in some proxies"
    - "Logout requires token blacklist, adding infrastructure complexity"
  wysiati: "Haven't measured exact token size with our claim structure. Haven't verified RS256 library support in our Node.js version."
  decision: "Use JWT with RS256, 15-min access tokens, 7-day refresh tokens. Implement token blacklist for logout. Trade-off: adds complexity but meets stateless requirement."
  terminal: done
  mode_transition:
    from: deliberate
    to: fast
    reason: "Decision made and documented. Ready for implementation."
  reflection:
    was_justified: yes
    would_fast_have_sufficed: no
    lesson: "Auth decisions always need SLOW mode. Security requirements vary too much to rely on pattern matching alone."

## Implementation

Based on the above analysis, I'll proceed with JWT implementation.

```javascript
// src/auth/jwt.ts — implementation
read("src/auth/jwt.ts")
```

MODE_CALIBRATION:
  task_type: "Auth architecture decision"
  mode_assigned: slow
  evidence_pulls_actual: 3
  outcome: success
  was_justified: yes
  would_fast_have_sufficed: no
