// Narrow adapter around the vendored NetSim engine. It never accesses host networking.
import { Network } from "../vendor/netsim/network";
import { Host, type IcmpEvent } from "../vendor/netsim/ipdevice";
import { SwitchDevice } from "../vendor/netsim/switch";
import { parseCidr, parseIp } from "../vendor/netsim/ip";
import { PORTS, type Port, type Scenario } from "./scenario";

export type PortVlans = Record<Port, number>;
export type ProbeTarget = "printer" | "reference" | "other";
export type ProbeResult = { success: boolean; detail: string; frames: number };

export function probe(
  s: Scenario,
  vlans: PortVlans,
  target: ProbeTarget,
): ProbeResult {
  // Fresh network per probe prevents stale ARP/MAC state from fabricating success
  // after a configuration change. All frames exist only in this object graph.
  const net = new Network();
  const sw = new SwitchDevice(net, "switch", s.network.switchName, "switch", 5);
  net.register(sw);
  const keys = [
    "workstation",
    "printer",
    "reference",
    "otherA",
    "otherB",
  ] as const;
  const hosts = keys.map((key, i) => {
    const h = new Host(net, key, s.network.hosts[key].name);
    net.register(h);
    h.getInterface("eth0")!.ip = parseCidr(s.network.hosts[key].address)!;
    sw.vlans.set(PORTS[i], vlans[PORTS[i]]);
    net.connect(h.id, sw.id, { aIface: "eth0", bIface: PORTS[i] });
    return h;
  });
  let frames = 0;
  net.onWireTransfer = () => {
    frames++;
  };
  const from = target === "other" ? hosts[3] : hosts[0];
  const toIndex = target === "printer" ? 1 : target === "reference" ? 2 : 4;
  const address = s.network.hosts[keys[toIndex]].address.split("/")[0];
  const destination = parseIp(address)!;
  const events: IcmpEvent[] = [];
  const id = from.allocIcmpId();
  from.onIcmp(id, (event) => events.push(event));
  const error = from.sendEcho(destination, id, 1);
  net.scheduler.advanceTo(net.scheduler.now + 15_000);
  from.offIcmp(id);
  const success = events.some(
    (event) => event.type === "reply" && event.from === destination,
  );
  return {
    success,
    frames,
    detail: success
      ? `ICMP echo reply received from ${address}.`
      : `${error ?? "No ICMP echo reply received"} (${address}).`,
  };
}
