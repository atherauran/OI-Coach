const TZ = "Asia/Shanghai";

export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

// Start of today in TZ as an ISO timestamp, for "done today" queries.
export const startOfToday = () => new Date(`${today()}T00:00:00+08:00`).toISOString();

export const daysToContest = (date: string | null) => {
  if (!date) return null;
  const n = daysBetween(today(), date);
  return n >= 0 ? n : null;
};
