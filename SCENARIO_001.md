# Scenario 001 — The Missing Warehouse Printer

**Working title:** INC-1001 — Printer unreachable after desk move

## Workplace context
A fictional distribution center runs print stations. A network printer has been moved to a different access-switch port during planned maintenance. The cable link is active, but the workstation on the printers' expected network cannot communicate with the printer.

## Ground truth for engine design
- Intended printer subnet (example): 192.168.20.0/24; printer static address 192.168.20.50/24.
- Access port where the printer is newly attached has been assigned VLAN 10; intended VLAN is 20.
- The reference workstation/source resides in VLAN 20 and should be able to reach the printer when the access port is correctly in VLAN 20.
- The simulation must make traffic fail for the relevant source/destination while the port is in the wrong VLAN, and succeed after appropriate VLAN correction. Model only what can be verified.
- DNS and DHCP are distractors, not root causes. Don't falsely claim DNS/DHCP diagnostic output that the engine does not support.

## Help desk learner tasks
1. Read ticket and ask/choose appropriate triage questions (recent equipment move, who is affected, any known outages).
2. Inspect link state, printer address, workstation/source network, and available port/VLAN evidence.
3. Identify the likely fault and either escalate with useful evidence or switch to network role in the same practice session.
4. Record what was observed rather than selecting the correct diagnosis blindly.

## Network learner tasks
1. Review target device, correct port and expected VLAN; distinguish investigation from making changes.
2. In the simulated environment, inspect current VLAN and change access port to VLAN 20.
3. Verify the expected source can reach the printer and that at least one unrelated network behavior still passes, if supported.
4. Record concise root cause and remediation, including a rollback consideration.

## Assessment contract
- Primary technical condition: correct access port assigned VLAN 20 and connectivity test passes by actual engine evaluation.
- Negative tests: before the change verification fails; assigning wrong VLAN still fails; changing an unrelated port doesn't earn success.
- Procedure checks: recorded diagnostic evidence, correct root cause, verification action, ticket resolution note. Hints influence 'independence' but not whether connectivity truly works.
- Grading categories: diagnosis, change correctness, verification, documentation and independence. Differentiate 'guided completion' from 'independent completion'.

## Feedback
Explain what the learner observed, what the cause was, why the change worked, when escalation is appropriate in a real workplace, and that production switch changes require authorization and change procedures.

## Important caveat
This is a proposed educational scenario, **not** a specification of a real corporate network or a claim to reproduce Cisco IOS exactly. Keep tests based on the implemented engine's actual capabilities.
