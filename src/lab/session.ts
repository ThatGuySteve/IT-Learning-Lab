import { z } from 'zod';
import { builtinScenario, PORTS, validateScenario, type Port, type Scenario } from './scenario';
import { probe, type PortVlans, type ProbeTarget } from './network';

export type Mode = 'guided' | 'independent';
export type Screen = 'ticket' | 'triage' | 'network' | 'report';
type Inspection = 'ticket' | 'printer' | 'workstation' | 'plan' | 'switch';
type ProbeLog = { target: ProbeTarget; success: boolean; revision: number };
export type Session = {
  version: 1; scenario: Scenario; mode: Mode | null; screen: Screen; role: 'helpdesk' | 'network';
  inspected: Inspection[]; probes: ProbeLog[]; vlans: PortVlans; revision: number; hints: number;
  diagnosis: '' | 'vlan' | 'dns' | 'power' | 'dhcp'; escalation: string; resolution: string;
};
export type Action =
  | { type: 'start'; mode: Mode } | { type: 'screen'; screen: Screen }
  | { type: 'inspect'; item: Inspection } | { type: 'probe'; target: ProbeTarget }
  | { type: 'diagnosis'; value: Session['diagnosis'] } | { type: 'escalation'; value: string }
  | { type: 'resolution'; value: string } | { type: 'escalate' }
  | { type: 'vlan'; port: Port; value: number } | { type: 'hint' }
  | { type: 'reset'; scenario?: Scenario };

export function newSession(scenario: Scenario = builtinScenario): Session {
  return { version: 1, scenario, mode: null, screen: 'ticket', role: 'helpdesk', inspected: [], probes: [],
    vlans: { ...scenario.network.initialVlans }, revision: 0, hints: 0, diagnosis: '', escalation: '', resolution: '' };
}
export function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case 'reset': return newSession(a.scenario ?? s.scenario);
    case 'start': return s.mode ? s : { ...s, mode: a.mode, screen: 'ticket' };
    case 'screen': return (a.screen === 'network' && s.role !== 'network') ? s : { ...s, screen: a.screen };
    case 'inspect': return s.inspected.includes(a.item) ? s : { ...s, inspected: [...s.inspected, a.item] };
    case 'probe': {
      const result = probe(s.scenario, s.vlans, a.target);
      return { ...s, probes: [...s.probes.slice(-199), { target: a.target, success: result.success, revision: s.revision }] };
    }
    case 'diagnosis': return { ...s, diagnosis: a.value };
    case 'escalation': return { ...s, escalation: a.value.slice(0, 3000) };
    case 'resolution': return { ...s, resolution: a.value.slice(0, 3000) };
    case 'escalate': return { ...s, role: 'network', screen: 'network' };
    case 'vlan': {
      if (s.role !== 'network' || !s.inspected.includes('switch') || !PORTS.includes(a.port) ||
          !Number.isInteger(a.value) || a.value < 1 || a.value > 4094 || s.vlans[a.port] === a.value) return s;
      return { ...s, vlans: { ...s.vlans, [a.port]: a.value }, revision: s.revision + 1 };
    }
    case 'hint': return { ...s, hints: Math.min(3, s.hints + 1) };
  }
}

export type Check = { label: string; passed: boolean; feedback: string };
export function grade(s: Session) {
  const before = (target: ProbeTarget, success: boolean) => s.probes.some(p => p.revision === 0 && p.target === target && p.success === success);
  const current = (target: ProbeTarget) => s.revision > 0 && s.probes.some(p => p.revision === s.revision && p.target === target && p.success);
  const noCollateral = PORTS.filter(p => p !== 'eth1').every(p => s.vlans[p] === s.scenario.network.initialVlans[p]);
  const reachable = probe(s.scenario, s.vlans, 'printer').success;
  const escalationOk = s.escalation.trim().length >= 40 && /print/i.test(s.escalation) &&
    /(ping|fail|unreach|offline|no response|cannot|can't)/i.test(s.escalation) && /(switch|port|network)/i.test(s.escalation);
  const resolutionOk = s.resolution.trim().length >= 40 && /(eth1|port)/i.test(s.resolution) && /vlan/i.test(s.resolution) &&
    /(ping|test|reach|reply)/i.test(s.resolution) && /(rollback|roll back|revert|restore|previous)/i.test(s.resolution);
  const checks: Check[] = [
    { label: 'Troubleshooting evidence', passed: ['ticket','printer','workstation','plan'].every(i => s.inspected.includes(i as Inspection)) && before('printer', false) && before('reference', true), feedback: 'Review the ticket, inspect the printer, workstation and network plan, and test both printer and reference before changing a port.' },
    { label: 'Likely diagnosis', passed: s.diagnosis === 'vlan', feedback: 'Choose the likely switch-port or VLAN issue based on the move, link, addressing and test evidence.' },
    { label: 'Configuration and network state', passed: s.inspected.includes('switch') && s.vlans.eth1 === s.scenario.network.intendedVlan && noCollateral && reachable, feedback: 'Inspect the switch, restore the printer access port to the expected VLAN, and leave the other ports unchanged.' },
    { label: 'Post-change verification', passed: current('printer') && current('other') && reachable, feedback: 'After your latest change, test the printer and the separate network pair. A prior test does not verify a later change.' },
    { label: 'Escalation and resolution notes', passed: escalationOk && resolutionOk, feedback: 'Write both notes using the listed evidence and resolution elements. The checker uses simple keywords, not an AI model.' },
  ];
  return { checks, complete: checks.every(c => c.passed), independence: s.mode === 'independent' && s.hints === 0 ? 'Independent' : 'Assisted / guided', reachable, noCollateral };
}

const portsSchema = z.strictObject({ eth0: z.number().int().min(1).max(4094), eth1: z.number().int().min(1).max(4094), eth2: z.number().int().min(1).max(4094), eth3: z.number().int().min(1).max(4094), eth4: z.number().int().min(1).max(4094) });
const savedSchema = z.strictObject({
  version: z.literal(1), scenario: z.unknown(), mode: z.enum(['guided','independent']).nullable(), screen: z.enum(['ticket','triage','network','report']), role: z.enum(['helpdesk','network']),
  inspected: z.array(z.enum(['ticket','printer','workstation','plan','switch'])).max(5),
  probes: z.array(z.strictObject({ target: z.enum(['printer','reference','other']), success: z.boolean(), revision: z.number().int().min(0).max(100000) })).max(200),
  vlans: portsSchema, revision: z.number().int().min(0).max(100000), hints: z.number().int().min(0).max(3),
  diagnosis: z.enum(['','vlan','dns','power','dhcp']), escalation: z.string().max(3000), resolution: z.string().max(3000),
});
export const STORAGE_KEY = 'it-learning-lab.inc1001.v1';
export function parseSaved(text: string): Session | null {
  if (text.length > 100_000) return null;
  try {
    const candidate = savedSchema.safeParse(JSON.parse(text));
    if (!candidate.success) return null;
    const scenario = validateScenario(candidate.data.scenario);
    if (!scenario.success || candidate.data.probes.some(p => p.revision > candidate.data.revision)) return null;
    return { ...candidate.data, scenario: scenario.data };
  } catch { return null; }
}
