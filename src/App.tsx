import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ChangeEvent,
} from "react";
import {
  builtinScenario,
  parseScenarioFile,
  PORTS,
  MAX_SCENARIO_BYTES,
  type Port,
} from "./lab/scenario";
import { type ProbeTarget } from "./lab/network";
import {
  grade,
  newSession,
  parseSaved,
  reducer,
  STORAGE_KEY,
  type Screen,
  type Session,
} from "./lab/session";

function initialSession(): Session {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (parseSaved(saved) ?? newSession()) : newSession();
  } catch {
    return newSession();
  }
}
const labels: Record<ProbeTarget, string> = {
  printer: "Printer",
  reference: "Reference host",
  other: "Other network pair",
};
const hints = [
  "Start with the change that happened just before the failure. Compare the printer to something known to work.",
  "A link light and a valid static address do not guarantee that two devices are in the same Layer 2 network. Ask the network team to inspect the access port.",
  "Compare the printer port’s access VLAN with the expected VLAN in the network plan. Change only that port, then test the printer and another network.",
];

export default function App() {
  const [session, dispatch] = useReducer(reducer, undefined, initialSession);
  const [storageOk, setStorageOk] = useState(true);
  const [message, setMessage] = useState("");
  const [port, setPort] = useState<Port>("eth1");
  const [vlan, setVlan] = useState("");
  const result = useMemo(() => grade(session), [session]);
  const s = session.scenario;
  const host = s.network.hosts;
  const seen = (item: Session["inspected"][number]) =>
    session.inspected.includes(item);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, [session]);
  useEffect(() => {
    if (!session.mode) return;
    const main = document.getElementById("main");
    main?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [session.mode, session.screen]);
  function go(screen: Screen) {
    dispatch({ type: "screen", screen });
  }
  function run(target: ProbeTarget) {
    dispatch({ type: "probe", target });
  }
  function reset() {
    if (
      window.confirm(
        "Reset this attempt? Your current notes and progress will be removed.",
      )
    ) {
      dispatch({ type: "reset" });
      setMessage("Attempt reset. Choose a mode to play again.");
    }
  }
  async function importScenario(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_SCENARIO_BYTES) {
      setMessage("Scenario is larger than 32 KB.");
      return;
    }
    try {
      const loaded = parseScenarioFile(await file.text());
      if (
        session.mode &&
        !window.confirm(
          "Importing starts a new attempt and replaces current progress. Continue?",
        )
      )
        return;
      dispatch({ type: "reset", scenario: loaded });
      setMessage("Scenario validated and loaded. Choose a mode to begin.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to read scenario.",
      );
    }
  }
  const lastProbe = (target: ProbeTarget) =>
    [...session.probes].reverse().find((p) => p.target === target);
  function probeControl(target: ProbeTarget, description: string) {
    const last = lastProbe(target);
    return (
      <div className="probe-row">
        <div>
          <strong>{labels[target]}</strong>
          <p>{description}</p>
          {last && (
            <p
              className={last.success ? "outcome good" : "outcome bad"}
              role="status"
            >
              {last.success ? "Reply received" : "No reply"} ·{" "}
              {last.revision === session.revision
                ? "current configuration"
                : "before a later change"}
            </p>
          )}
        </div>
        <button className="secondary" onClick={() => run(target)}>
          Test {labels[target].toLowerCase()}
        </button>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          IT
        </div>
        <div>
          <strong>IT Learning Lab</strong>
          <span> Practice with purpose</span>
        </div>
        <div className="top-status">
          <span className="status-dot" /> Local practice · no account
        </div>
      </header>
      {!session.mode ? (
        <main id="main" className="welcome" tabIndex={-1}>
          <div className="eyebrow">
            FIRST PRACTICE INCIDENT <span> / </span> INC-1001
          </div>
          <h1>
            Build confidence,
            <br />
            <em>one incident at a time.</em>
          </h1>
          <p className="lead">
            Investigate a warehouse printer outage, hand off your findings, and
            make a simulated network change. Your work stays on this device.
          </p>
          <div className="welcome-grid">
            <section className="card intro-card">
              <div className="card-top">
                <span className="ticket-badge">OPEN TICKET</span>
                <span>01 / 01</span>
              </div>
              <h2>{s.title}</h2>
              <p>{s.ticket.summary}</p>
              <div className="meta-line">
                <span>Help desk → Network support</span>
                <span>Simulation · offline</span>
              </div>
            </section>
            <section className="card mode-card">
              <h2>Choose how to practice</h2>
              <p>
                Both modes use the same incident and assessment. Hints are
                optional and recorded.
              </p>
              <button
                className="primary wide"
                onClick={() => dispatch({ type: "start", mode: "guided" })}
              >
                Start guided practice <span>→</span>
              </button>
              <button
                className="secondary wide"
                onClick={() => dispatch({ type: "start", mode: "independent" })}
              >
                Start independent assessment <span>→</span>
              </button>
              <p className="fine">
                Independent completion requires independent mode, no hints, and
                no feedback viewed before all checks are met.
              </p>
            </section>
          </div>
          <details className="import">
            <summary>Load an incident file</summary>
            <p>
              Only validated version 1 INC-1001 JSON files are accepted, up to
              32 KB. Import starts a fresh attempt.
            </p>
            <label className="file-label">
              Choose JSON file
              <input
                type="file"
                accept="application/json,.json"
                onChange={importScenario}
              />
            </label>
            <button
              className="text-button"
              onClick={() => {
                dispatch({ type: "reset", scenario: builtinScenario });
                setMessage("Original incident restored.");
              }}
            >
              Use original incident
            </button>
          </details>
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </main>
      ) : (
        <div className="workspace">
          <aside className="sidebar" aria-label="Incident navigation">
            <div className="side-label">CURRENT INCIDENT</div>
            <div className="side-incident">
              <strong>INC-1001</strong>
              <span>{s.title}</span>
            </div>
            <nav>
              {(
                [
                  { id: "ticket", n: "01", name: "Ticket" },
                  { id: "triage", n: "02", name: "Help desk" },
                  { id: "network", n: "03", name: "Network support" },
                  { id: "report", n: "04", name: "Skills report" },
                ] as const
              ).map((x) => (
                <button
                  key={x.id}
                  className={`nav-item ${session.screen === x.id ? "active" : ""}`}
                  onClick={() => go(x.id)}
                  disabled={x.id === "network" && session.role !== "network"}
                  aria-current={session.screen === x.id ? "page" : undefined}
                >
                  <span>{x.n}</span>
                  {x.name}
                </button>
              ))}
            </nav>
            {session.mode === "independent" && (
              <p className="fine side-warning">
                Viewing an incomplete report marks the attempt as assisted.
              </p>
            )}
            <div className="side-footer">
              <span>SESSION MODE</span>
              <strong>
                {session.mode === "guided"
                  ? "Guided practice"
                  : "Independent assessment"}
              </strong>
              <button className="text-button" onClick={reset}>
                Reset attempt
              </button>
            </div>
          </aside>
          <main id="main" className="main-content" tabIndex={-1}>
            <div className="page-heading">
              <div>
                <div className="eyebrow">INCIDENT / INC-1001</div>
                <h1>
                  {session.screen === "ticket"
                    ? "Read the ticket"
                    : session.screen === "triage"
                      ? "Investigate & escalate"
                      : session.screen === "network"
                        ? "Inspect & repair"
                        : "Skills report"}
                </h1>
                <p>
                  {session.screen === "ticket"
                    ? "Start with the employee’s report and the recent change."
                    : session.screen === "triage"
                      ? "Gather evidence before handing the incident to network support."
                      : session.screen === "network"
                        ? "Make a controlled change in the simulated switch."
                        : "Review evidence, verification and documentation together."}
                </p>
              </div>
              <div className="role-chip">
                {session.role === "helpdesk" ? "HELP DESK" : "NETWORK SUPPORT"}
              </div>
            </div>
            {!storageOk && (
              <div className="notice error" role="alert">
                Progress could not be saved on this device. Your current work
                may be lost when you close the app.
              </div>
            )}
            {message && (
              <p role="status" className="notice">
                {message}
              </p>
            )}
            {session.screen === "ticket" && (
              <>
                <section className="card ticket">
                  <div className="section-kicker">
                    SUPPORT TICKET <span className="ticket-badge">OPEN</span>
                  </div>
                  <h2>{s.title}</h2>
                  <p className="ticket-summary">{s.ticket.summary}</p>
                  <div className="ticket-details">
                    <div>
                      <span>REPORTED BY</span>
                      <strong>{s.ticket.reporter}</strong>
                    </div>
                    <div>
                      <span>IMPACT</span>
                      <strong>{s.ticket.impact}</strong>
                    </div>
                    <div>
                      <span>RECENT HISTORY</span>
                      <strong>{s.ticket.history}</strong>
                    </div>
                  </div>
                </section>
                <div className="next-bar">
                  <p>Review the report, then start collecting observations.</p>
                  <button
                    className="primary"
                    onClick={() => {
                      dispatch({ type: "inspect", item: "ticket" });
                      go("triage");
                    }}
                  >
                    Review ticket & investigate →
                  </button>
                </div>
              </>
            )}
            {session.screen === "triage" && (
              <>
                <section className="card">
                  <div className="section-kicker">01 / OBSERVATIONS</div>
                  <h2>Gather the facts</h2>
                  <p className="muted">
                    Open each diagnostic. These are simulated observations from
                    a fictional workplace.
                  </p>
                  <div className="diagnostic-grid">
                    <Diagnostic
                      title="Printer"
                      description="Power, cable and address"
                      opened={seen("printer")}
                      onOpen={() =>
                        dispatch({ type: "inspect", item: "printer" })
                      }
                    >
                      <p>
                        Power on · Ethernet link up · static IPv4{" "}
                        <strong>{host.printer.address}</strong> · connected to{" "}
                        {s.network.switchName} port <strong>eth1</strong>.
                      </p>
                    </Diagnostic>
                    <Diagnostic
                      title="Workstation"
                      description="Source device and address"
                      opened={seen("workstation")}
                      onOpen={() =>
                        dispatch({ type: "inspect", item: "workstation" })
                      }
                    >
                      <p>
                        Ethernet link up · static IPv4{" "}
                        <strong>{host.workstation.address}</strong> · connected
                        to {s.network.switchName} port <strong>eth0</strong>.
                      </p>
                    </Diagnostic>
                    <Diagnostic
                      title="Network plan"
                      description="Documented intended network"
                      opened={seen("plan")}
                      onOpen={() => dispatch({ type: "inspect", item: "plan" })}
                    >
                      <p>
                        The shipping printer and workstation are intended to use
                        access VLAN <strong>{s.network.intendedVlan}</strong>.
                        The printer is recorded on switch port{" "}
                        <strong>eth1</strong>.
                      </p>
                    </Diagnostic>
                  </div>
                </section>
                <section className="card">
                  <div className="section-kicker">02 / CONNECTIVITY</div>
                  <h2>Compare the results</h2>
                  <p className="muted">
                    These tests send simulated traffic; no packets leave your
                    computer.
                  </p>
                  {probeControl("printer", "Shipping workstation → printer")}
                  {probeControl(
                    "reference",
                    "Shipping workstation → known reference host",
                  )}
                </section>
                <section className="card">
                  <div className="section-kicker">03 / HANDOFF</div>
                  <h2>Document and escalate</h2>
                  <label htmlFor="diagnosis">
                    Most likely area to investigate
                  </label>
                  <select
                    id="diagnosis"
                    value={session.diagnosis}
                    onChange={(e) =>
                      dispatch({
                        type: "diagnosis",
                        value: e.target.value as Session["diagnosis"],
                      })
                    }
                  >
                    <option value="">Choose an assessment</option>
                    <option value="vlan">Switch port / VLAN assignment</option>
                    <option value="dns">DNS name resolution</option>
                    <option value="power">Printer has no power</option>
                    <option value="dhcp">DHCP lease issue</option>
                  </select>
                  <label htmlFor="escalation">Escalation note</label>
                  <p className="field-help" id="escalation-help">
                    Include the printer symptom, a failed or unreachable test,
                    and a request to inspect the network, switch, or port. Use
                    at least 40 characters.
                  </p>
                  <textarea
                    id="escalation"
                    aria-describedby="escalation-help"
                    rows={4}
                    value={session.escalation}
                    onChange={(e) =>
                      dispatch({ type: "escalation", value: e.target.value })
                    }
                    placeholder="Record observations and what you need the network team to check."
                  />
                  {session.revision > 0 && (
                    <p className="fine">
                      The handoff sent before the first change is used for
                      assessment. Reset the attempt to send a new handoff before
                      a repair.
                    </p>
                  )}
                  <button
                    className="primary"
                    onClick={() => dispatch({ type: "escalate" })}
                  >
                    {session.role === "network"
                      ? "Return to network support"
                      : "Escalate to network support"}{" "}
                    →
                  </button>
                  <p className="fine">
                    In a real workplace, follow your authorization and
                    change-control process.
                  </p>
                </section>
              </>
            )}
            {session.screen === "network" && (
              <>
                <section className="card">
                  <div className="section-kicker">01 / NETWORK MAP</div>
                  <h2>Trace the connections</h2>
                  <div className="topology" aria-label="Network topology">
                    <div>
                      <span>eth0</span>
                      <strong>{host.workstation.name}</strong>
                      <small>{host.workstation.address}</small>
                    </div>
                    <div className="switch-node">
                      <span>ACCESS SWITCH</span>
                      <strong>{s.network.switchName}</strong>
                      <small>Five simulated access ports</small>
                    </div>
                    <div>
                      <span>eth1</span>
                      <strong>{host.printer.name}</strong>
                      <small>{host.printer.address}</small>
                    </div>
                  </div>
                  <p className="muted">
                    eth2 connects the reference host. eth3 and eth4 connect a
                    separate network pair.
                  </p>
                  <button
                    className="secondary"
                    onClick={() =>
                      dispatch({ type: "inspect", item: "switch" })
                    }
                  >
                    Inspect switch ports
                  </button>
                  {seen("switch") && (
                    <div className="table-wrap">
                      <table>
                        <caption>Simulated access-port configuration</caption>
                        <thead>
                          <tr>
                            <th>Port</th>
                            <th>Connected device</th>
                            <th>Access VLAN</th>
                            <th>Link</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PORTS.map((p, i) => (
                            <tr key={p}>
                              <td>{p}</td>
                              <td>
                                {
                                  [
                                    host.workstation.name,
                                    host.printer.name,
                                    host.reference.name,
                                    host.otherA.name,
                                    host.otherB.name,
                                  ][i]
                                }
                              </td>
                              <td>{session.vlans[p]}</td>
                              <td>Up</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
                <section className="card">
                  <div className="section-kicker">02 / CHANGE CONTROL</div>
                  <h2>Configure an access port</h2>
                  <p className="muted">
                    The network plan expects the shipping devices on VLAN{" "}
                    {s.network.intendedVlan}. This changes only the simulated
                    switch.
                  </p>
                  <div className="form-row">
                    <div>
                      <label htmlFor="port">Port</label>
                      <select
                        id="port"
                        value={port}
                        onChange={(e) => setPort(e.target.value as Port)}
                      >
                        {PORTS.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vlan">Access VLAN</label>
                      <input
                        id="vlan"
                        type="number"
                        min="1"
                        max="4094"
                        value={vlan}
                        onChange={(e) => setVlan(e.target.value)}
                        placeholder="1–4094"
                      />
                    </div>
                    <button
                      className="primary"
                      disabled={!seen("switch")}
                      onClick={() => {
                        const n = Number(vlan);
                        if (
                          !vlan ||
                          !Number.isInteger(n) ||
                          n < 1 ||
                          n > 4094
                        ) {
                          setMessage("Enter a VLAN number from 1 to 4094.");
                          return;
                        }
                        dispatch({ type: "vlan", port, value: n });
                        setMessage(
                          `Simulated ${port} set to VLAN ${n}. Run verification after the change.`,
                        );
                      }}
                    >
                      Apply change
                    </button>
                  </div>
                  {!seen("switch") && (
                    <p className="fine">
                      Inspect the switch before making changes.
                    </p>
                  )}
                </section>
                <section className="card">
                  <div className="section-kicker">03 / VERIFY</div>
                  <h2>Test the change</h2>
                  {probeControl("printer", "Shipping workstation → printer")}
                  {probeControl("other", "Other network host A → host B")}
                  <label htmlFor="resolution">Resolution note</label>
                  <p className="field-help" id="resolution-help">
                    Include the port, VLAN, verification test or reply, and a
                    rollback or previous-setting consideration. Use at least 40
                    characters.
                  </p>
                  <textarea
                    id="resolution"
                    aria-describedby="resolution-help"
                    rows={4}
                    value={session.resolution}
                    onChange={(e) =>
                      dispatch({ type: "resolution", value: e.target.value })
                    }
                    placeholder="Record the cause, change, test result and rollback consideration."
                  />
                  {session.mode === "independent" && (
                    <p className="fine">
                      Viewing the report before all checks are met marks this
                      attempt as assisted.
                    </p>
                  )}
                  <button className="primary" onClick={() => go("report")}>
                    Review skills report →
                  </button>
                </section>
              </>
            )}
            {session.screen === "report" && (
              <>
                <section
                  className={`card result-card ${result.complete ? "complete" : ""}`}
                >
                  <div className="section-kicker">ASSESSMENT / INC-1001</div>
                  <h2>
                    {result.complete
                      ? "Incident completed"
                      : "More evidence needed"}
                  </h2>
                  <p>
                    {result.complete
                      ? "The simulated repair, verification and documentation meet the incident checks."
                      : "A completed incident requires every check below. You can return to any stage and continue."}
                  </p>
                  <div className="report-meta">
                    <span>
                      Completion:{" "}
                      <strong>
                        {result.complete ? "Complete" : "In progress"}
                      </strong>
                    </span>
                    <span>
                      Independence: <strong>{result.independence}</strong>
                    </span>
                    <span>
                      Hints used: <strong>{session.hints}</strong>
                    </span>
                    <span>
                      Early feedback:{" "}
                      <strong>
                        {session.feedbackUsed ? "Viewed" : "Not viewed"}
                      </strong>
                    </span>
                  </div>
                </section>
                <section className="card">
                  <h2>What you demonstrated</h2>
                  <ul className="checks">
                    {result.checks.map((c) => (
                      <li key={c.label}>
                        <span
                          className={
                            c.passed ? "check-icon passed" : "check-icon"
                          }
                          aria-hidden="true"
                        >
                          {c.passed ? "✓" : "○"}
                        </span>
                        <div>
                          <strong>
                            {c.label}{" "}
                            <span className="check-state">
                              {c.passed ? "Met" : "Not yet met"}
                            </span>
                          </strong>
                          <p>{c.feedback}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="fine">
                    Text checks look for the listed terms and cannot judge
                    nuance. The repair and connectivity checks use the
                    simulator, not the notes.
                  </p>
                </section>
                {result.complete && (
                  <section className="card">
                    <div className="section-kicker">AFTER-ACTION REVIEW</div>
                    <h2>Why the repair worked</h2>
                    <p>
                      The printer link was up, but its access port was in a
                      different VLAN from the shipping workstation. That
                      isolated its Layer 2 traffic even though both devices had
                      addresses in the same subnet. Putting the printer port in
                      the expected VLAN allowed the simulated ARP and ICMP
                      exchange to complete.
                    </p>
                    <p>
                      In a real environment, verify the approved VLAN and port,
                      obtain authorization, follow change procedures, and keep a
                      rollback plan. This exercise models a simplified switch
                      and does not reproduce a specific vendor’s configuration.
                    </p>
                    <button className="secondary" onClick={reset}>
                      Reset and try again
                    </button>
                  </section>
                )}
              </>
            )}
          </main>
          <aside className="helper" aria-label="Guidance">
            <div className="side-label">FIELD NOTES</div>
            <h2>Work the incident</h2>
            <p>
              Separate what you observed from what you suspect. Verify after
              each change.
            </p>
            <div className="helper-divider" />
            <span className="side-label">ASSISTANCE</span>
            <p>
              {session.mode === "independent"
                ? "Hints and viewing an incomplete skills report mark this attempt as assisted."
                : "Reveal hints one at a time when you need a nudge."}
            </p>
            {hints.slice(0, session.hints).map((h, i) => (
              <p className="hint" key={h}>
                <strong>Hint {i + 1}</strong>
                <br />
                {h}
              </p>
            ))}
            <button
              className="secondary wide"
              onClick={() => dispatch({ type: "hint" })}
              disabled={session.hints >= 3}
            >
              {session.hints >= 3 ? "All hints revealed" : "Reveal next hint"}
            </button>
            <div className="helper-divider" />
            <p className="fine">
              Your progress is saved locally. This is a simplified simulation,
              not a live workplace network.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
function Diagnostic({
  title,
  description,
  opened,
  onOpen,
  children,
}: {
  title: string;
  description: string;
  opened: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="diagnostic">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {opened ? (
        <div className="diagnostic-result">{children}</div>
      ) : (
        <button className="secondary" onClick={onOpen}>
          Inspect {title.toLowerCase()}
        </button>
      )}
    </div>
  );
}
