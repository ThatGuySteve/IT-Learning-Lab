# IT Learning Lab

A small, open-source, offline-first practice environment for IT support. The first incident, **INC-1001 — Warehouse printer offline**, takes a learner from help-desk investigation through a simulated switch-port repair and evidence-based assessment.

This is an early browser prototype with an experimental Windows desktop wrapper. See [status and limitations](docs/STATUS.md) before treating it as a finished desktop product.

## Run locally

Install [Node.js](https://nodejs.org/) 22.12 or newer (Node 24 recommended), then in PowerShell, Windows Terminal or a Linux/macOS terminal:

```sh
git clone https://github.com/ThatGuySteve/IT-Learning-Lab.git
cd IT-Learning-Lab
npm ci
npm run dev
```

Open the local address printed by Vite (normally `http://127.0.0.1:1420`). The development server and dependency installation require the usual local tooling; dependencies must be downloaded before going offline. With dependencies installed, `npm run build` and `npm run preview` serve the production build locally. A browser session can be used offline after it loads; the local server must be available to load or reload it. Progress stays in that browser's local storage, scoped to the origin. Clearing site data deletes it.

## Play the incident

Choose guided practice or independent assessment. Read the ticket; inspect the printer, workstation and network plan; test the printer and a healthy reference; select a likely cause; write an escalation and switch to network support. Inspect the switch, change an access-port VLAN, test the printer and the separate network, write a resolution with rollback considerations, then review the skills report. Use **Reset attempt** to replay. Hints are optional; any hint makes the attempt assisted.

The checks require technical state **and** evidence of the appropriate steps. The handoff records your diagnosis, notes and observations when you send it; update and re-send it before the first change if needed. They do not use an AI model. Notes are checked with simple terms, so read the feedback and limitations rather than treating the text score as a human evaluation.

## Test and build

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The end-to-end tests run against a local production preview. On a fresh Linux installation, Playwright may also need OS packages (`npx playwright install --with-deps chromium`). These setup commands may require internet access. To run with an existing Chromium executable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its absolute path.

## Windows desktop (experimental)

On Windows, install Node.js, [Rust and the Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) including MSVC build tools and WebView2. Then:

```powershell
npm ci
npm run tauri dev
npm run tauri build -- --bundles nsis -- --locked
```

A successful build should place an NSIS setup executable under `src-tauri/target/release/bundle/nsis/`. The configuration requests an embedded WebView2 offline installer. An initial Windows GitHub Actions build produced an experimental installer; check the latest CI run for the current revision. Offline installation and a complete Windows learning session have not yet been verified. The Rust graph is locked and a preliminary notice inventory is in `licenses/RUST-DEPENDENCIES.txt`. Review the notices and the separate Microsoft WebView2 SDK and runtime terms before distributing any artifact.

## Architecture, safety and credits

[Foundation comparison](docs/FOUNDATION.md) records the pinned upstream investigations and integration decision. [Status](docs/STATUS.md) describes actual tests, simulation boundaries and remaining work. The NetSim engine files in `src/vendor/netsim` are reproduced under MIT; its original copyright and permission notice is in `licenses/NETSIM-MIT.txt`. Production npm dependency notices are also in `licenses/`. Original project work is MIT licensed; see [LICENSE](LICENSE).

Only validated, bounded, declarative INC-1001 JSON files can be imported. The simulation runs in memory and performs no host shell or network commands. It does not reproduce proprietary device software or a real workplace network. Do not put real workplace or customer data in this exercise.
