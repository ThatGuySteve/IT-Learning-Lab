import { z } from "zod";
import { parseCidr, networkOf } from "../vendor/netsim/ip";
import incident from "../scenarios/inc-1001.json";

export const PORTS = ["eth0", "eth1", "eth2", "eth3", "eth4"] as const;
export type Port = (typeof PORTS)[number];
export const MAX_SCENARIO_BYTES = 32 * 1024;
const label = z.string().trim().min(1).max(120);
const paragraph = z.string().trim().min(1).max(600);
const vlan = z.number().int().min(1).max(4094);
const host = z.strictObject({ name: label, address: z.string().max(18) });
const scenarioSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id: z.literal("INC-1001"),
    title: label,
    ticket: z.strictObject({
      reporter: label,
      summary: paragraph,
      impact: paragraph,
      history: paragraph,
    }),
    network: z.strictObject({
      switchName: label,
      intendedVlan: vlan,
      initialVlans: z.strictObject({
        eth0: vlan,
        eth1: vlan,
        eth2: vlan,
        eth3: vlan,
        eth4: vlan,
      }),
      hosts: z.strictObject({
        workstation: host,
        printer: host,
        reference: host,
        otherA: host,
        otherB: host,
      }),
    }),
  })
  .superRefine((s, ctx) => {
    const n = s.network;
    if (
      n.initialVlans.eth0 !== n.intendedVlan ||
      n.initialVlans.eth2 !== n.intendedVlan ||
      n.initialVlans.eth1 === n.intendedVlan ||
      n.initialVlans.eth3 !== n.initialVlans.eth4 ||
      n.initialVlans.eth3 === n.intendedVlan
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "VLANs must begin with an isolated printer, a healthy reference and a separate healthy pair.",
      });
    }
    const values = Object.values(n.hosts).map((h) => parseCidr(h.address));
    if (
      values.some(
        (v) =>
          !v ||
          v.prefix !== 24 ||
          (v.addr & 255) === 0 ||
          (v.addr & 255) === 255,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Each host needs a valid IPv4 host address with a /24 mask.",
      });
      return;
    }
    const [a, b, c, d, e] = values.map((v) => v!);
    const privateIp = (ip: number) =>
      ip >>> 24 === 10 || ip >>> 20 === 0xac1 || ip >>> 16 === 0xc0a8;
    if (
      values.some((v) => !privateIp(v!.addr)) ||
      new Set(values.map((v) => v!.addr)).size !== 5 ||
      networkOf(a.addr, 24) !== networkOf(b.addr, 24) ||
      networkOf(a.addr, 24) !== networkOf(c.addr, 24) ||
      networkOf(d.addr, 24) !== networkOf(e.addr, 24) ||
      networkOf(a.addr, 24) === networkOf(d.addr, 24)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Use five unique private addresses: three on one /24 and the other pair on a different /24.",
      });
    }
  });
export type Scenario = z.infer<typeof scenarioSchema>;
export const validateScenario = (input: unknown) =>
  scenarioSchema.safeParse(input);
export const builtinScenario: Scenario = scenarioSchema.parse(incident);

export function parseScenarioFile(text: string): Scenario {
  if (new TextEncoder().encode(text).byteLength > MAX_SCENARIO_BYTES)
    throw new Error("Scenario is larger than 32 KB.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Scenario is not valid JSON.");
  }
  const result = validateScenario(data);
  if (!result.success)
    throw new Error(
      `Unsupported or invalid incident: ${result.error.issues[0]?.message ?? "invalid data"}`,
    );
  return result.data;
}
