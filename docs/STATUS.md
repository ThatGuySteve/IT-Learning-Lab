# Milestone status

## What works in the browser prototype

INC-1001 contains a ticket, printer/workstation/network-plan observations, simulated connectivity diagnostics, a help-desk handoff, a network-support role with a five-port switch, configurable access VLANs, post-change tests and resolution documentation. Guided and independent sessions share the same checks; requesting a hint marks the attempt assisted. The after-action explanation is shown after completion. Reset starts a clean replay. Progress and imported incident data use local browser storage and no account.

The scenario is a strictly validated, size-limited, version 1 JSON document. Import is deliberately limited to the INC-1001 shape and rejects unknown fields, invalid topology and non-private addresses. Text is rendered as text; neither scenario data nor learner notes are commands. There is no shell, host command execution, cloud API, account or telemetry.

## Verification performed

- NetSim: 72 tests and build passed; NetQuest: 283 tests and frontend build passed. Details and exact revisions are in [FOUNDATION.md](FOUNDATION.md).
- This project: `npm test` passed 9 tests; `npm run build` passed. Tests cover simulated isolation, correction, reversal, unrelated traffic, wrong-port/collateral changes, invalid inputs, stale verification, scoring, save parsing and reset.
- `npm run test:e2e`: 3 Playwright tests passed using Chromium 153 on Linux. The complete learner path included a reload, offline browser operation after the page loaded, correct repair, report and reset; additional tests covered hints, rejected import and reset on a narrow screen. No external request was observed during the workflow. This tests the browser build, not the native Windows wrapper.
- `npm audit --audit-level=moderate`: no known npm vulnerabilities reported at inspection time, including development dependencies. It is not a guarantee of safety or a Rust dependency audit.

## Known limits

- Windows NSIS/Tauri installer configuration and CI job are present but **not yet verified on Windows**, and the Rust dependency graph/third-party notices need review before distribution. The Linux host had no Rust toolchain or Windows runtime. CI artifacts, if produced, are experimental; a build alone does not prove offline installation or runtime behavior.
- The requested WebView2 `offlineInstaller` setting intends a self-contained prerequisite for offline installation, but it still needs a successful Windows build and an actual offline installation test. Installation and updates require a separate review; ordinary sessions use local assets.
- Browser use requires a local preview server to load the built assets. Once loaded, the tested learning session works with browser networking offline. Browser storage belongs to its origin; clearing site data removes progress. Native storage persistence across upgrades has not been tested.
- The model is a teaching approximation, not a real network or vendor OS. The app does not simulate print queues/services, DHCP, DNS, trunking or routing. A link-up display describes this scenario's fixed links, not a complete physical-layer simulator. Each test starts with fresh simulated ARP/MAC state.
- Notes are checked with simple, disclosed keyword/length rules. These may miss good wording or accept poor prose; they do not establish communication competence by themselves. Local data can be edited and is not a tamper-resistant exam or encrypted record.
- Keyboard focus, labels and responsive layout were considered; formal accessibility audit and Windows screen-reader testing remain outstanding.

## Recommended next milestone (approval required)

After validating this first incident on a Windows machine, propose **one** desktop/help-desk printer-service incident (for example a stopped spooler with the network healthy). Use it to test whether the small incident/assessment boundary can support a non-network problem. Do not build it, additional career paths, AI tutoring, accounts or a plugin framework without approval.
