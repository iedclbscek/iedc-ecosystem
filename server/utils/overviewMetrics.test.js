import test from "node:test";
import assert from "node:assert/strict";

import {
  buildActivityResult,
  getKolkataActivityWindow,
  parseOverviewDays,
} from "./overviewMetrics.js";

test("overview days accepts only 7, 30, or 90 and defaults to 30", () => {
  assert.equal(parseOverviewDays("7"), 7);
  assert.equal(parseOverviewDays(30), 30);
  assert.equal(parseOverviewDays("90"), 90);
  assert.equal(parseOverviewDays("14"), 30);
  assert.equal(parseOverviewDays(undefined), 30);
});

test("Kolkata windows use local midnight and adjacent equal periods", () => {
  const window = getKolkataActivityWindow({
    days: 7,
    now: new Date("2026-11-19T20:00:00.000Z"), // 2026-11-20 01:30 IST
  });

  assert.equal(window.startDate, "2026-11-14");
  assert.equal(window.endDate, "2026-11-20");
  assert.equal(window.currentStart.toISOString(), "2026-11-13T18:30:00.000Z");
  assert.equal(window.currentEnd.toISOString(), "2026-11-20T18:30:00.000Z");
  assert.equal(window.previousStart.toISOString(), "2026-11-06T18:30:00.000Z");
});

test("activity includes every local date, zeros, and only prior-window totals", () => {
  const window = getKolkataActivityWindow({
    days: 7,
    now: new Date("2026-11-19T12:00:00.000Z"),
  });
  const result = buildActivityResult({
    days: 7,
    window,
    rows: [
      { _id: "2026-11-05", count: 99 }, // outside both windows
      { _id: "2026-11-06", count: 2 }, // first previous day
      { _id: "2026-11-12", count: 3 }, // last previous day
      { _id: "2026-11-13", count: 4 }, // first current day
      { _id: "2026-11-19", count: 1 }, // last current day
      { _id: "2026-11-20", count: 99 }, // future/outside
    ],
  });

  assert.equal(result.start, "2026-11-13");
  assert.equal(result.end, "2026-11-19");
  assert.equal(result.daily.length, 7);
  assert.deepEqual(result.daily, [
    { date: "2026-11-13", count: 4 },
    { date: "2026-11-14", count: 0 },
    { date: "2026-11-15", count: 0 },
    { date: "2026-11-16", count: 0 },
    { date: "2026-11-17", count: 0 },
    { date: "2026-11-18", count: 0 },
    { date: "2026-11-19", count: 1 },
  ]);
  assert.equal(result.previousTotal, 5);
});
