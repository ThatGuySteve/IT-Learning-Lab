# Milestone status

## What works in the browser prototype

INC-1001 contains a ticket, printer/workstation/network-plan observations, simulated connectivity diagnostics, a help-desk handoff, a network-support role with a five-port switch, configurable access VLANs, post-change tests and resolution documentation. Guided and independent sessions share the same checks; requesting a hint or viewing an incomplete assessment marks the attempt assisted. The after-action explanation is shown after completion. Reset starts a clean replay. Progress and imported incident data use local browser storage and no account. The assessment captures observations, diagnosis and notes when the handoff is sent before the first port change. Earlier prototype saves retain notes but cannot receive credit for evidence whose ordering was not recorded; re-send the handoff before a change or reset to replay afterward. Older independent saves without a record of report views are treated as assisted.

The scenario is a strictly validated, size-limited, version 1 JSON document. Import is deliberately limited to the INC-1001 shape and rejects unknown fields, invalid topology and non-private addresses. Text is rendered as text; neither scenario data nor learner notes are commands. The application implements no shell, host command execution, cloud API, account or analytics. The separate Microsoft WebView2 runtime used on Windows has its own diagnostic-data collection and update behavior when online; see [Microsoft's data and privacy documentation](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/data-privacy). A strict requirement of zero platform telemetry is not established by the app's lack of analytics.

## Verification performed

- NetSim: 72 tests and build passed; NetQuest: 283 tests and frontend build passed. Details and exact revisions are in [FOUNDATION.md](FOUNDATION.md).
- This project: `npm test` passed 13 tests; `npm run build` passed. Tests cover simulated isolation, correction, reversal, unrelated traffic, wrong-port/collateral changes, invalid inputs, stale verification, handoff timing, scoring, save parsing and reset.
- `npm run test:e2e`: 5 Playwright tests passed using Chromium 153 on Linux. The complete learner path included a reload, offline browser operation after the page loaded, correct repair, report and reset; additional tests covered hints, early assessment feedback, rejected import, reset on a narrow screen, and automated WCAG checks on five screens. No external request was observed during the workflow. This tests the browser build, not the native Windows wrapper.
- `npm audit --audit-level=moderate`: no known npm vulnerabilities reported at inspection time, including development dependencies. It is not a guarantee of safety or a Rust dependency audit.

## Known limits

- A Windows GitHub Actions runner built and smoke-tested an NSIS installer for PR head `18657b991da305ff1a4b7bb4143f7b861fb3678b`. Later revisions add a clean-prerequisite offline installation and native session test; consult the current PR's CI logs for its actual result. The Linux host has no Windows runtime. All installer artifacts are experimental.
- The requested WebView2 `offlineInstaller` setting embeds a standalone prerequisite. The Windows test is designed to remove the registered runtime on a disposable runner, confirm outbound network access is blocked, install the runtime and app, then exercise the installed executable. Its existence is not proof that it passed. See [the Windows distribution and privacy review](WINDOWS_RELEASE_REVIEW.md) for unresolved runtime terms and diagnostic-data limitations.
- Browser use requires a local preview server to load the built assets. Once loaded, the tested learning session works with browser networking offline. Browser storage belongs to its origin; clearing site data removes progress. Native storage persistence across upgrades has not been tested.
- The model is a teaching approximation, not a real network or vendor OS. The app does not simulate print queues/services, DHCP, DNS, trunking or routing. A link-up display describes this scenario's fixed links, not a complete physical-layer simulator. Each test starts with fresh simulated ARP/MAC state.
- Notes are checked with simple, disclosed keyword/length rules. These may miss good wording or accept poor prose; they do not establish communication competence by themselves. Local data can be edited and is not a tamper-resistant exam or encrypted record.
- Keyboard focus, labels and responsive layout were considered. Automated axe-core WCAG scans passed on five screens; a formal accessibility audit and Windows screen-reader testing remain outstanding.

## Recommended next milestone (approval required)

After validating this first incident on a Windows machine, propose **one** desktop/help-desk printer-service incident (for example a stopped spooler with the network healthy). Use it to test whether the small incident/assessment boundary can support a non-network problem. Do not build it, additional career paths, AI tutoring, accounts or a plugin framework without approval.
