const monthMap = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function normalizeMonthDay(month, day) {
  // Removed 'year' parameter
  if (day === 31) {
    // For simplicity without a year, assume non-31-day months default to their max day
    if ([2, 4, 6, 9, 11].includes(month)) {
      // Feb, Apr, Jun, Sep, Nov
      return new Date(2000, month, 0).getDate(); // Use a leap year (2000) for Feb's max day
    }
  }
  return day;
}

export function parseDateString(dateStr) {
  // Removed currentYear parameter
  const ranges = [];
  dateStr = dateStr
    .toLowerCase()
    .replace(/–|—|to/g, "-")
    .replace(/&|\/| and /g, ",")
    .replace(/\./g, "")
    .replace(/st|nd|rd|th/g, "");

  const parts = dateStr
    .split(/,|\s{2,}| and /)
    .map((p) => p.trim())
    .filter(Boolean);

  for (let part of parts) {
    // "Whole Year" / "All Year"
    if (part === "whole year" || part === "all year") {
      ranges.push({
        startMonth: 1,
        startDay: 1,
        endMonth: 12,
        endDay: 31,
      });
      continue;
    }

    let m;

    // Pattern 1: Day Month - Day Month (e.g., 1 Jan - 31 Mar)
    m = part.match(/(\d{1,2})\s*([a-z]+)\s*-\s*(\d{1,2})\s*([a-z]+)/i);
    if (m) {
      const startMonth = monthMap[m[2].slice(0, 3)];
      const endMonth = monthMap[m[4].slice(0, 3)];

      ranges.push({
        startMonth: startMonth,
        startDay: parseInt(m[1]),
        endMonth: endMonth,
        endDay: parseInt(m[3]),
      });
      continue;
    }

    // Pattern 2: Month - Month (e.g., Jan - Mar, Dec - Feb)
    m = part.match(/([a-z]+)\s*-\s*([a-z]+)/i);
    if (m) {
      const sm = monthMap[m[1].slice(0, 3)];
      const em = monthMap[m[2].slice(0, 3)];
      if (sm && em) {
        ranges.push({
          startMonth: sm,
          startDay: 1,
          endMonth: em,
          endDay: normalizeMonthDay(em, 31),
        });
      }
      continue;
    }

    // Pattern 3: Day Month (e.g., Feb 1st, 15 Dec) - interpreted as single day
    m = part.match(/(\d{1,2})\s*([a-z]+)/i);
    if (m) {
      const month = monthMap[m[2].slice(0, 3)];
      const day = parseInt(m[1]);
      if (month) {
        ranges.push({
          startMonth: month,
          startDay: day,
          endMonth: month,
          endDay: day,
        });
      }
      continue;
    }

    // Pattern 4: Month (e.g., Jan, April) - interpreted as the whole month
    m = part.match(/([a-z]+)/i);
    if (m) {
      const month = monthMap[m[1].slice(0, 3)];
      if (month) {
        ranges.push({
          startMonth: month,
          startDay: 1,
          endMonth: month,
          endDay: normalizeMonthDay(month, 31),
        });
      }
    }
  }
  return ranges;
}
