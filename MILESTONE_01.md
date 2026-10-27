# Milestone 01 — Working Help-Desk-to-Network Incident

## Target outcome
A learner can start an offline-capable local prototype, receive a warehouse printer ticket, gather diagnostic observations, escalate or switch roles, perform a correct simulated switch-port VLAN repair, verify connectivity, close the incident with documentation and see a skills assessment. The same scenario can be reset and replayed without manually modifying files.

## Phase A — Evidence before integration
1. Inspect the newest accessible revisions of `michael-borck/netsim` and `iamgroot400/NetQuest`, record pinned SHAs, licenses, transitive dependencies, build/test outputs, APIs and lab authoring paths.
2. Run their existing test suites. Confirm what switch port assignments and connectivity checks REALLY do; inspect false-positive/false-negative risks. Do not assume trunking/OSPF, or vendor-specific syntax.
3. Choose one candidate and record 1-page architecture decision. If neither supports the exercise honestly, build a minimal in-memory, testable VLAN simulation adapter from first principles **only for this incident**, not a generic networking platform.
4. REA only if a specific behavior cannot be understood with source inspection or tests.

## Phase B — Minimal playable vertical slice
- Local-first UI: incident inbox (one ticket), ticket detail/history, diagnostics, network topology, device inspection/configuration, staged hints, verification, documentation, skills report.
- A single versioned declarative incident definition, separate from UI code.
- Simulated objects: help-desk workstation, printer, access switch with two VLANs, simplified reachable reference host where useful. The link may be up while the port is assigned to the wrong VLAN.
- Help desk mode: choose diagnostics and record evidence, then escalate. No need for live phone/chat simulation.
- Network mode: inspect port; change VLAN via validated simulation control or supported terminal commands; retest connectivity.
- Hint stages: gentle prompt -> target subsystem -> detailed diagnostic hint -> worked explanation after completion.
- Assessment combines technical end-state and procedural evidence: no score based only on a self-reported answer.
- Save progress locally without login and support reset/replay. It must run offline after assets and dependencies have been installed/built.
- Keyboard accessibility and clear device/port labels; no deceptive controls.

## Phase C — Evidence and packaging
- Unit tests: engine state, VLAN isolation, VLAN correction, connectivity, grading and reset/idempotence.
- End-to-end or equivalent functional test: open ticket -> diagnose -> escalate -> repair -> verify -> document -> pass -> reset.
- README commands to install dependencies, run, test and build. Record tested OS and runtime versions.
- Windows-first packaging via Tauri 2 only after the prototype works. Attempt installer on Windows CI/runner where available; distinguish a *runtime-offline* app from a truly *offline install*, which may require bundling WebView2.
- Licenses and third-party notices retained.

## Definition of done
A new contributor can clone and launch the prototype; the learner can complete the scenario end-to-end. A wrong VLAN produces actual simulated failure, changing it produces successful verification, reverting it produces failure, and grading isn't defeated by clicking 'resolved'. All results repeat deterministically; tests run in CI. Windows installer built/tested or clearly marked pending with a written blocker. The product remains one exercise plus the minimal shared learning contract—no speculative features.

## Explicitly out of scope
Full course marketplace; 50 scenarios; real Active Directory; real Windows remote desktop; third-party ticket systems; advanced packet capture; AI assistant; mobile builds; cloud backend; subscription billing; organizational dashboard; broad plug-in framework; unapproved modifications to other repos.
