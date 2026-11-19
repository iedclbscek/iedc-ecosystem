const DAY_MS = 24 * 60 * 60 * 1000;
const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const ALLOWED_DAYS = new Set([7, 30, 90]);

const kolkataDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const localDayIndex = (date) => {
  const parts = Object.fromEntries(
    kolkataDateFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
};

const dateAtDayIndex = (dayIndex) => new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);
const kolkataMidnightAtDayIndex = (dayIndex) =>
  new Date(dayIndex * DAY_MS - KOLKATA_OFFSET_MS);

export const parseOverviewDays = (value) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return ALLOWED_DAYS.has(parsed) ? parsed : 30;
};

export const getKolkataActivityWindow = ({ days, now = new Date() }) => {
  const safeDays = parseOverviewDays(days);
  const endDayIndex = localDayIndex(now);
  const startDayIndex = endDayIndex - safeDays + 1;
  const currentEndDayIndex = endDayIndex + 1;
  const previousStartDayIndex = startDayIndex - safeDays;

  return {
    startDate: dateAtDayIndex(startDayIndex),
    endDate: dateAtDayIndex(endDayIndex),
    previousStartDate: dateAtDayIndex(previousStartDayIndex),
    currentStart: kolkataMidnightAtDayIndex(startDayIndex),
    currentEnd: kolkataMidnightAtDayIndex(currentEndDayIndex),
    previousStart: kolkataMidnightAtDayIndex(previousStartDayIndex),
  };
};

export const buildActivityResult = ({ days, window, rows = [] }) => {
  const safeDays = parseOverviewDays(days);
  const counts = new Map(
    rows.map((row) => [String(row?._id || ""), Number(row?.count) || 0]),
  );
  const startDayIndex = Math.floor(Date.parse(`${window.startDate}T00:00:00.000Z`) / DAY_MS);
  const daily = Array.from({ length: safeDays }, (_, offset) => {
    const date = dateAtDayIndex(startDayIndex + offset);
    return { date, count: counts.get(date) || 0 };
  });
  const previousTotal = rows.reduce((total, row) => {
    const date = String(row?._id || "");
    return date >= window.previousStartDate && date < window.startDate
      ? total + (Number(row?.count) || 0)
      : total;
  }, 0);

  return {
    days: safeDays,
    start: window.startDate,
    end: window.endDate,
    daily,
    previousTotal,
  };
};
