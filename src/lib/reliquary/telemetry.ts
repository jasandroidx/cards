/**
 * Anonymous progress telemetry. Write-only observation — no server, no PII,
 * no network calls. Milestones land in localStorage["reliquary-telemetry"]
 * so a player (or a dev with the triple-click overlay) can see how far
 * a run got. Never touches the reliquary-v3 save.
 */

const KEY = "reliquary-telemetry";
const CAP = 200;

export interface TelemetryEvent {
  name: string;
  at: number;
}

/** Append one milestone. Oldest events fall off past the cap. */
export function logEvent(name: string): void {
  try {
    const raw = localStorage.getItem(KEY);
    const events: TelemetryEvent[] = raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
    events.push({ name, at: Date.now() });
    while (events.length > CAP) events.shift();
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    /* the dark keeps nothing anyway */
  }
}

/** Read the milestone list back, oldest first. */
export function getEvents(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

/** Wipe the milestone list. */
export function clearTelemetry(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* the dark keeps nothing anyway */
  }
}
