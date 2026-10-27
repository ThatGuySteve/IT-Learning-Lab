import { describe, expect, it } from 'vitest';
import { builtinScenario, parseScenarioFile, type Scenario } from './scenario';
import { probe } from './network';
import { grade, newSession, parseSaved, reducer, type Action, type Session } from './session';

const start = () => newSession(builtinScenario);
const step = (s: Session, ...actions: Action[]) => actions.reduce(reducer, s);
const notes = {
  escalation: 'Printer is unreachable after the move; ping failed. Please inspect the switch port and network.',
  resolution: 'Printer port eth1 changed to VLAN 20. Ping received a reply. Rollback: restore the previous VLAN 10.',
};
function triaged(): Session {
  return step(start(), {type:'start',mode:'independent'}, {type:'inspect',item:'ticket'},
    {type:'inspect',item:'printer'}, {type:'inspect',item:'workstation'}, {type:'inspect',item:'plan'},
    {type:'probe',target:'printer'}, {type:'probe',target:'reference'}, {type:'diagnosis',value:'vlan'},
    {type:'escalation',value:notes.escalation}, {type:'escalate'}, {type:'inspect',item:'switch'});
}
function completed(): Session {
  return step(triaged(), {type:'vlan',port:'eth1',value:20}, {type:'probe',target:'printer'},
    {type:'probe',target:'other'}, {type:'resolution',value:notes.resolution});
}

describe('actual NetSim packet behavior', () => {
  it('isolates the wrong VLAN, repairs it, and fails again when reverted', () => {
    const initial = start().vlans;
    const bad = probe(builtinScenario, initial, 'printer');
    expect(bad.success).toBe(false);
    expect(bad.frames).toBeGreaterThan(0);
    expect(probe(builtinScenario, initial, 'reference').success).toBe(true);
    expect(probe(builtinScenario, initial, 'other').success).toBe(true);
    const fixed = {...initial, eth1:20};
    expect(probe(builtinScenario, fixed, 'printer').success).toBe(true);
    expect(probe(builtinScenario, fixed, 'other').success).toBe(true);
    expect(probe(builtinScenario, {...fixed, eth1:10}, 'printer').success).toBe(false);
    expect(probe(builtinScenario, {...initial, eth2:20}, 'printer').success).toBe(false);
    expect(probe(builtinScenario, {...initial, eth1:30}, 'printer').success).toBe(false);
  });
  it('does not pass the collateral network when its peer is moved', () => {
    expect(probe(builtinScenario, {...start().vlans, eth4:20}, 'other').success).toBe(false);
  });
});

describe('incident workflow and grading', () => {
  it('passes a complete independent attempt and reset returns an unsolved incident', () => {
    const s = completed();
    expect(grade(s).checks.every(c=>c.passed)).toBe(true);
    expect(grade(s).complete).toBe(true);
    expect(grade(s).independence).toBe('Independent');
    const reset = reducer(s, {type:'reset'});
    expect(reset).toEqual(start());
    expect(grade(reset).complete).toBe(false);
    expect(probe(reset.scenario, reset.vlans, 'printer').success).toBe(false);
  });
  it('does not pass from notes or marking the report alone', () => {
    const s = step(start(), {type:'start',mode:'guided'}, {type:'escalation',value:notes.escalation},
      {type:'resolution',value:notes.resolution}, {type:'screen',screen:'report'});
    expect(grade(s).complete).toBe(false);
  });
  it('rejects wrong-port repair, collateral changes, and stale verification', () => {
    const wrong = step(triaged(), {type:'vlan',port:'eth2',value:10}, {type:'probe',target:'printer'}, {type:'probe',target:'other'}, {type:'resolution',value:notes.resolution});
    expect(grade(wrong).complete).toBe(false);
    const fixedWithCollateral = step(wrong, {type:'vlan',port:'eth1',value:20}, {type:'probe',target:'printer'}, {type:'probe',target:'other'});
    expect(grade(fixedWithCollateral).complete).toBe(false);
    const stale = step(completed(), {type:'vlan',port:'eth1',value:10}, {type:'vlan',port:'eth1',value:20});
    expect(grade(stale).checks.find(c=>c.label==='Post-change verification')?.passed).toBe(false);
    expect(grade(stale).complete).toBe(false);
    const restored = step(stale, {type:'probe',target:'printer'}, {type:'probe',target:'other'});
    expect(grade(restored).complete).toBe(true);
  });
  it('requires pre-change evidence and changes the independence label when hints are used', () => {
    const noEvidence = step(start(), {type:'start',mode:'independent'}, {type:'escalate'}, {type:'inspect',item:'switch'},
      {type:'vlan',port:'eth1',value:20}, {type:'probe',target:'printer'}, {type:'probe',target:'other'},
      {type:'diagnosis',value:'vlan'}, {type:'escalation',value:notes.escalation}, {type:'resolution',value:notes.resolution});
    expect(grade(noEvidence).complete).toBe(false);
    expect(grade(step(completed(), {type:'hint'})).independence).toBe('Assisted / guided');
    expect(grade({...completed(),mode:'guided'}).independence).toBe('Assisted / guided');
  });
  it('blocks a configuration change before escalation or switch inspection', () => {
    const s = start();
    expect(reducer(s,{type:'vlan',port:'eth1',value:20})).toBe(s);
    const network = step(s,{type:'escalate'});
    expect(reducer(network,{type:'vlan',port:'eth1',value:20})).toBe(network);
    const inspected = step(network,{type:'inspect',item:'switch'});
    expect(reducer(inspected,{type:'vlan',port:'eth1',value:4095})).toBe(inspected);
  });
  it('round trips local progress and rejects malformed or oversized saved state', () => {
    const s = completed();
    expect(parseSaved(JSON.stringify(s))).toEqual(s);
    expect(parseSaved('{broken')).toBeNull();
    expect(parseSaved('x'.repeat(100001))).toBeNull();
    expect(parseSaved(JSON.stringify({...s, vlans:{...s.vlans,eth1:9999}}))).toBeNull();
    expect(parseSaved(JSON.stringify({...s, probes:[{target:'printer',success:true,revision:999}]}))).toBeNull();
  });
});

describe('declarative scenario validation', () => {
  it('accepts the bundled file and rejects unknown executable fields and invalid topology', () => {
    const file = JSON.stringify(builtinScenario);
    expect(parseScenarioFile(file)).toEqual(builtinScenario);
    expect(() => parseScenarioFile(JSON.stringify({...builtinScenario, command:'rm -rf /'}))).toThrow();
    const altered: Scenario = structuredClone(builtinScenario);
    altered.network.initialVlans.eth1 = altered.network.intendedVlan;
    expect(() => parseScenarioFile(JSON.stringify(altered))).toThrow();
    altered.network.initialVlans.eth1 = 10;
    altered.network.hosts.printer.address = '8.8.8.8/24';
    expect(() => parseScenarioFile(JSON.stringify(altered))).toThrow();
    expect(() => parseScenarioFile(' '.repeat(32769))).toThrow('32 KB');
    expect(() => parseScenarioFile('{bad')).toThrow('valid JSON');
  });
});
