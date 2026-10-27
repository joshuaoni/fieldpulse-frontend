export type DatePreset = "TODAY" | "WEEK" | "MONTH";

/** Custom bounds are calendar days (`YYYY-MM-DD`), both inclusive. */
export type DateRange = { preset: DatePreset } | { preset: "CUSTOM"; from: string; to: string };

export const DATE_PRESETS: DatePreset[] = ["TODAY", "WEEK", "MONTH"];

export const DATE_PRESET_LABEL: Record<DatePreset, string> = {
  TODAY: "Today",
  WEEK: "This week",
  MONTH: "This month",
};

export const TODAY: DateRange = { preset: "TODAY" };

/** A local calendar day as `YYYY-MM-DD`. */
export function isoDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

export function windowOf(range: DateRange, now = new Date()): { from: string; to: string } {
  if (range.preset === "CUSTOM") {
    const to = parseDay(range.to);
    to.setDate(to.getDate() + 1);
    return { from: parseDay(range.from).toISOString(), to: to.toISOString() };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  to.setDate(to.getDate() + 1);

  if (range.preset === "WEEK") from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  if (range.preset === "MONTH") from.setDate(1);

  return { from: from.toISOString(), to: to.toISOString() };
}

export function inclusiveWindowOf(
  range: DateRange,
  now = new Date(),
): { from: string; to: string } {
  const { from, to } = windowOf(range, now);
  return { from, to: new Date(Date.parse(to) - 1).toISOString() };
}

const short = { day: "numeric", month: "short" } as const;

/** A heading for the range: "This week", or "3 Oct – 9 Oct 2026". */
export function rangeLabel(range: DateRange): string {
  if (range.preset !== "CUSTOM") return DATE_PRESET_LABEL[range.preset];

  const from = parseDay(range.from);
  const to = parseDay(range.to);
  const last = to.toLocaleDateString([], { ...short, year: "numeric" });

  return range.from === range.to ? last : `${from.toLocaleDateString([], short)} – ${last}`;
}

/** The range inside a sentence: "today", "this week", "between 3 Oct and 9 Oct 2026". */
export function rangePhrase(range: DateRange): string {
  if (range.preset !== "CUSTOM") return DATE_PRESET_LABEL[range.preset].toLowerCase();
  if (range.from === range.to) return `on ${rangeLabel(range)}`;

  const [from, to] = rangeLabel(range).split(" – ");
  return `between ${from} and ${to}`;
}
