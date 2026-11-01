import { test, expect } from "@playwright/test";
import { calculateAge, formatAge, type Age } from "../src/family/age";

type AgeCase = [birth: string, today: string, age: Age];
function checkAges(cases: AgeCase[]) {
  for (const [birth, today, age] of cases)
    expect(calculateAge(birth, today), `${birth} through ${today}`).toEqual(age);
}

test(`age counts completed birthdays, months and remaining days`, () => {
  checkAges([
    [`2020-04-15`, `2022-07-16`, { years: 2, months: 3, days: 1 }],
    [`2020-04-15`, `2022-04-15`, { years: 2, months: 0, days: 0 }],
    [`2020-04-15`, `2022-04-14`, { years: 1, months: 11, days: 30 }],
    [`2020-04-15`, `2022-04-16`, { years: 2, months: 0, days: 1 }],
    [`2025-12-20`, `2026-01-25`, { years: 0, months: 1, days: 5 }],
  ]);
});

test(`newborn ages include today and days before the first completed month`, () => {
  checkAges([
    [`2026-11-01`, `2026-11-01`, { years: 0, months: 0, days: 0 }],
    [`2026-10-31`, `2026-11-01`, { years: 0, months: 0, days: 1 }],
    [`2026-10-15`, `2026-11-01`, { years: 0, months: 0, days: 17 }],
    [`2026-01-01`, `2026-02-01`, { years: 0, months: 1, days: 0 }],
    [`2025-12-31`, `2026-01-01`, { years: 0, months: 0, days: 1 }],
  ]);
});

test(`month anniversaries clamp the original birthday without repeated clamping drift`, () => {
  checkAges([
    [`2021-01-31`, `2021-02-27`, { years: 0, months: 0, days: 27 }],
    [`2021-01-31`, `2021-02-28`, { years: 0, months: 1, days: 0 }],
    [`2021-01-31`, `2021-03-01`, { years: 0, months: 1, days: 1 }],
    [`2021-01-31`, `2021-03-30`, { years: 0, months: 1, days: 30 }],
    [`2021-01-31`, `2021-03-31`, { years: 0, months: 2, days: 0 }],
    [`2021-01-31`, `2021-04-30`, { years: 0, months: 3, days: 0 }],
    [`2021-08-31`, `2022-02-28`, { years: 0, months: 6, days: 0 }],
    [`2020-01-31`, `2020-02-29`, { years: 0, months: 1, days: 0 }],
    [`2020-01-30`, `2020-02-29`, { years: 0, months: 1, days: 0 }],
  ]);
});

test(`leap-day birthdays use February's last day in a non-leap year`, () => {
  checkAges([
    [`2020-02-29`, `2021-02-27`, { years: 0, months: 11, days: 29 }],
    [`2020-02-29`, `2021-02-28`, { years: 1, months: 0, days: 0 }],
    [`2020-02-29`, `2021-03-28`, { years: 1, months: 0, days: 28 }],
    [`2020-02-29`, `2021-03-29`, { years: 1, months: 1, days: 0 }],
    [`2020-02-29`, `2024-02-28`, { years: 3, months: 11, days: 30 }],
    [`2020-02-29`, `2024-02-29`, { years: 4, months: 0, days: 0 }],
    [`2000-02-29`, `2100-02-28`, { years: 100, months: 0, days: 0 }],
  ]);
});

test(`calendar days remain whole across US and European daylight saving changes`, () => {
  checkAges([
    [`2026-03-07`, `2026-03-09`, { years: 0, months: 0, days: 2 }],
    [`2026-03-28`, `2026-03-30`, { years: 0, months: 0, days: 2 }],
    [`2026-10-24`, `2026-10-26`, { years: 0, months: 0, days: 2 }],
    [`2026-10-31`, `2026-11-02`, { years: 0, months: 0, days: 2 }],
  ]);
});

test(`years 0001 through 0099 retain their actual calendar years`, () => {
  checkAges([
    [`0001-01-01`, `0001-01-02`, { years: 0, months: 0, days: 1 }],
    [`0001-01-01`, `0099-12-31`, { years: 98, months: 11, days: 30 }],
    [`0004-02-29`, `0005-02-28`, { years: 1, months: 0, days: 0 }],
    [`0099-12-31`, `0100-01-31`, { years: 0, months: 1, days: 0 }],
    [`0001-01-01`, `9999-12-31`, { years: 9998, months: 11, days: 30 }],
    [`9999-12-31`, `9999-12-31`, { years: 0, months: 0, days: 0 }],
  ]);
});

test(`invalid, empty, BC, out-of-range and future dates have no age`, () => {
  const invalid = [
    ``, `2026-02-29`, `2024-02-30`, `1900-02-29`, `2100-02-29`,
    `2026-04-31`, `2026-13-01`, `2026-00-01`, `2026-01-00`, `2026-01-32`,
    `2026-1-01`, `2026-01-1`, `26-01-01`, `2026/01/01`,
    `2026-01-01T00:00:00Z`, ` 2026-01-01`, `2026-01-01 `,
    `0000-01-01`, `-0001-01-01`, `10000-01-01`, `not a date`,
  ];
  for (const date of invalid) {
    expect(calculateAge(date, `9999-12-31`), `Invalid birthday ${date}`).toBeNull();
    expect(calculateAge(`0001-01-01`, date), `Invalid today ${date}`).toBeNull();
  }
  expect(calculateAge(`2026-11-02`, `2026-11-01`)).toBeNull();
  expect(calculateAge(`2027-01-01`, `2026-12-31`)).toBeNull();
});

test(`age wording omits zero units and uses singular and plural English`, () => {
  const cases: [Age, string][] = [
    [{ years: 0, months: 0, days: 0 }, `Born today`],
    [{ years: 0, months: 0, days: 1 }, `1 day old`],
    [{ years: 0, months: 0, days: 2 }, `2 days old`],
    [{ years: 0, months: 1, days: 0 }, `1 month old`],
    [{ years: 0, months: 2, days: 1 }, `2 months, 1 day old`],
    [{ years: 1, months: 0, days: 0 }, `1 year old`],
    [{ years: 2, months: 0, days: 2 }, `2 years, 2 days old`],
    [{ years: 1, months: 1, days: 1 }, `1 year, 1 month, 1 day old`],
    [{ years: 2, months: 3, days: 1 }, `2 years, 3 months, 1 day old`],
  ];
  for (const [age, wording] of cases) expect(formatAge(age)).toBe(wording);
});
