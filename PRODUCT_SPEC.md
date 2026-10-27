# Product Specification — IT Learning Lab

## Purpose and audience
An installable, local-first hands-on training environment. Initial users: help-desk and field-support technicians moving into deeper responsibilities, plus beginners needing structured demonstrations. Measure demonstrated ability to diagnose, correct, verify, escalate and document rather than only course completion.

## Long-term paths (not launch commitments)
1. Help Desk / Service Desk L1–L2 — tickets, communication, identity verification, escalation, SLA judgment.
2. Desktop / Field Support — Windows, printers, hardware, peripherals, diagnostics.
3. Networking — TCP/IP, DHCP, DNS, switching, VLANs, routes, ACLs, monitoring and safe change management.
4. Systems Administration — identity, Linux/Windows services, permissions, storage and backups.
5. Security — hardening, least privilege, defensive incident response.
6. Cloud/Infrastructure — VMs, containers, connectivity and operations.
7. Scripting/Automation — PowerShell, Bash, Python and SQL.
8. General programming — potential future specialization, not a launch requirement.

## Shared learner experience
Choose target job path -> brief baseline assessment -> realistic incident ticket -> explore simulated tools -> optionally request contextual hints -> perform a real simulated state-changing repair -> verify with the engine -> document incident -> receive deterministic competency feedback -> repeat related incident independently later.

## Architecture principles
- **Learning core:** incidents, competency graph, hint stages, local progress and reports.
- **Simulation adapter:** transparent API for controlled operations, read-only observations, grading queries, reset. Exactly one network adapter in first milestone; do not build adapters for systems/cloud/programming yet.
- **Content:** versioned declarative scenario files; validated and importable without allowing code execution.
- **UI:** desktop-first React UI with ticket and topology / device panel. Consider Tauri 2 for distribution after confirming a working browser prototype.
- **Persistence:** offline, per-local-user only; export/import optional in later milestones. No login or tracking.
- **Education correctness:** explanations distinguish observations, likely causes, confirmed root cause, and confidence. Assessment checks the actual simulator state and required procedural steps.

## Differentiation to test, not assume
- Operational ticket workflows and change safety, not only protocol-specific puzzles.
- Skills bridging from existing support experience toward target job roles.
- Shared fictional workplace incidents that span help desk, desktop, and network paths.
- Useful feedback on troubleshooting choices, verification and escalation.

## Long-term non-goals and commercial guardrails
The project is NOT another generic LMS, unrestricted desktop virtualization stack, proprietary network OS replacement, browser-based SaaS or AI chat wrapper. Prioritize learning usefulness, testable adoption, contributor usability and first learner outcomes. No subscription/paywall discussion until usage evidence and buyer discovery. License exact reused dependencies before committing to open-source public distribution or commercial services.

## Career progression and serious gamification — proposed

IT Learning Lab is a fictional workplace where learners progress through realistic incidents. Visible XP, levels, achievements and career-path milestones should make sustained practice rewarding. They must remain separate from evidence of skill: points measure participation; technical competence comes from deterministic assessment of relevant simulated actions, state and verification. Hints are a normal part of instruction and never reduce completion XP or prevent normal learning progression.

A successful unassisted attempt may be recognized as an **independent incident completion**, but replaying a familiar incident is not sufficient evidence of mastery. Future independent mastery requires multiple meaningfully different, validated assessments. Competency evidence is shared across career paths by stable skill identifiers rather than duplicated per path. Replay should help maintain skills without repeatedly awarding completion XP. Progress remains local and offline, with no accounts, paid currencies, gambling mechanics, punitive streaks or required leaderboards.

See [the proposed progression design](docs/design/serious-gamification.md) and [example screen](docs/design/progression-screen.svg). This section is a design proposal only: it does not change the scope or release criteria of milestone 01 or authorize implementation. The first proposed implementation, subject to approval, uses INC-1001 only.
