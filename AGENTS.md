# Instructions for Coding Agents

## Primary priority
Deliver a **working, verifiable teaching exercise**, not an architectural showcase. Help an actual IT support technician build operational networking skill. The first version must demonstrate a complete help-desk-to-network-repair workflow.

## Operating rules
- Treat `MILESTONE_01.md` as the ONLY authorized scope for the first implementation PR. The broader vision in `PRODUCT_SPEC.md` is architecture guidance, not a feature backlog to build now.
- Start with an evidence-backed feasibility inspection of upstream projects: license and transitive dependency notices, maintenance, build, API boundaries, scenario definitions, supported VLAN/port commands, engine correctness, packaging constraints, tests. Record exact revisions inspected. Do not invent an API or feature.
- Prefer integration/adaptation with a small isolated compatibility layer to copying entire projects. Avoid unbounded forks. Preserve third-party license and attribution.
- REA may be used only if ordinary source review, docs and tests cannot answer a concrete compatibility/behavior question. Record why used and what it established. Never use it for unauthorized or proprietary copying.
- No external paid AI models, AI agents at runtime, accounts, hosted database, telemetry, analytics, payment integration or marketing website.
- No arbitrary host command execution from scenarios, learner text or import files. Simulated terminals are explicitly whitelisted simulation commands and MUST NOT invoke native shells. Scenarios are data, not executable scripts.
- Keep local progress data and imported scenario files confined to app-controlled data. Validate imports, enforce size limits and version the schema; never deserialize executable functions. Sandbox the simulation and deny access to workplace/real networks.
- Do not claim a lab simulates exact vendor behavior without tests. If a necessary protocol feature isn't implemented, document it and either implement the minimal verified behavior or adapt the scenario so it remains honest. Never simulate a successful "ping" with a hard-coded button that has no relationship to network state.
- Work on a dedicated new repository or clearly scoped project directory. Never modify unrelated repos, ProQuote, Webmanship or production systems.
- Avoid speculative plugin systems and generic frameworks. A small, documented interface is enough to prove reuse.
- Implement accessible keyboard navigation and readable contrast. Use an understated design, no gamification as a substitute for demonstrable learning.
- Maintain tests and provide exact commands/results. Fail openly: if Windows install packaging cannot be verified on the current OS, label it unverified.
- If blocker: document the actual blocker, fallback and smallest workable path; complete unaffected deliverables rather than dropping the entire project.

## Completion report format
- Files changed and purpose
- Foundation tested (repos, pinned commits, licensing)
- How to run / how to build
- Tests passed / tests blocked
- Exactly which simulated behaviors are validated
- What is not yet real or supported
- Screenshots or short functional walkthrough if feasible
- Next single milestone recommendation and explicit out-of-scope items
