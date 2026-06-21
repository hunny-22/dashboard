import fs from "node:fs/promises";
import * as cheerio from "cheerio";

const OUT_PATH = "public/gold.json";

const URLS = {
  latest: "https://gold.tanaka.co.jp/commodity/souba/",
  daily: "https://gold.tanaka.co.jp/commodity/souba/d-gold_recent.php",
  monthly: "https://gold.tanaka.co.jp/commodity/souba/m-gold.php",
  yearly: "https://gold.tanaka.co.jp/commodity/souba/y-gold.php"
};

function toNumber(text) {
  return Number(
    String(text)
      .replace(/,/g, "")
      .replace(/−/g, "-")
      .replace(/[^\d.-]/g, "")
      .trim()
  );
}

function normalizeText(text) {
  return String(text)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 GoldDashboard"
    }
  });

  if (!res.ok) {
    throw new Error(`fetch failed ${res.status}: ${url}`);
  }

  const buffer = await res.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);

  if (utf8.includes("金") || utf8.includes("円")) {
    return utf8;
  }

  return new TextDecoder("shift_jis").decode(buffer);
}

function extractNumbers(text) {
  return [...String(text).matchAll(/[\d,]+(?:\.\d+)?/g)]
    .map((match) => toNumber(match[0]))
    .filter(Number.isFinite);
}

function isValidGoldPrice(price) {
  return (
    Number.isFinite(price) &&
    price >= 1000 &&
    price <= 100000
  );
}

function pickGoldPriceFromRow(text) {
  const prices = extractNumbers(text).filter(isValidGoldPrice);

  return prices.at(-1) ?? 0;
}

function dedupeByDate(items) {
  const map = new Map();

  for (const item of items) {
    map.set(item.date, item);
  }

  return [...map.values()];
}

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function daysAgo(date, days) {
  const copied = new Date(date);
  copied.setDate(copied.getDate() - days);
  return copied;
}

function monthsAgo(date, months) {
  const copied = new Date(date);
  copied.setMonth(copied.getMonth() - months);
  return copied;
}

function parseLatest(html) {
  const text = normalizeText(
    cheerio.load(html).text()
  );

  const priceMatch =
    text.match(
      /金\s*店頭小売価格.*?([\d,]+)\s*円\s*\(?([+-−]?\d[\d,]*)\s*円?\)?/
    ) ||
    text.match(
      /金\s*([\d,]+)\s*円\s*\(?([+-−]?\d[\d,]*)\s*円?\)?/
    ) ||
    text.match(
      /金.*?([\d,]+)\s*円.*?([+-−]\d[\d,]*)\s*円/
    );

  const dateMatch = text.match(
    /(\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{2}公表)/
  );

  if (!priceMatch) {
    throw new Error("現在価格解析失敗");
  }

  return {
    source: "田中貴金属 店頭小売価格（税込）",
    unit: "JPY / g",
    updatedAt: dateMatch?.[1] ?? "",
    latest: {
      price: toNumber(priceMatch[1]),
      change: toNumber(priceMatch[2])
    }
  };
}

function parseUpdatedAtDate(updatedAt) {
  const match = String(updatedAt).match(
    /(\d{4})年(\d{1,2})月(\d{1,2})日/
  );

  if (!match) return new Date();

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
}

function guessDailyYear(month, anchorDate) {
  const anchorYear = anchorDate.getFullYear();
  const anchorMonth = anchorDate.getMonth() + 1;
  const targetMonth = Number(month);

  if (targetMonth > anchorMonth) {
    return anchorYear - 1;
  }

  return anchorYear;
}

function parseDailyHistory(html, anchorDate) {
  const $ = cheerio.load(html);
  const items = [];

  $("#price_trends tr, table.price_trends tr, tr").each((_, row) => {
    const rowText = normalizeText(
      $(row).find("th,td").text()
    );

    const dateMatch =
      rowText.match(/(\d{2})\.(\d{2})/) ||
      rowText.match(/(\d{1,2})月(\d{1,2})日/);

    if (!dateMatch) return;

    const month = String(Number(dateMatch[1])).padStart(2, "0");
    const day = String(Number(dateMatch[2])).padStart(2, "0");
    const year = guessDailyYear(month, anchorDate);
    const price = pickGoldPriceFromRow(rowText);

    if (!price) return;

    items.push({
      date: `${year}-${month}-${day}`,
      label: `${Number(month)}/${Number(day)}`,
      price
    });
  });

  return dedupeByDate(items)
    .filter((item) => isValidGoldPrice(item.price))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseMonthlyHistory(html) {
  const $ = cheerio.load(html);
  const items = [];

  let currentYear = "";

  $("#price_trends_month_sp")
    .children()
    .each((_, element) => {
      const el = $(element);

      if (el.hasClass("year")) {
        currentYear = el
          .text()
          .replace("年", "")
          .trim();
      }

      if (!el.is("dl")) return;

      el.find("dt.month").each((_, monthNode) => {
        const month = $(monthNode)
          .text()
          .replace("月", "")
          .trim()
          .padStart(2, "0");

        const dd = $(monthNode).next("dd");

        const rowText = normalizeText(
          dd.text()
        );

        const price = pickGoldPriceFromRow(rowText);

        if (!currentYear || !price) return;

        items.push({
          date: `${currentYear}-${month}`,
          label: `${Number(month)}月`,
          price
        });
      });
    });

  return dedupeByDate(items)
    .filter((item) => isValidGoldPrice(item.price))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function parseYearlyHistory(html) {
  const $ = cheerio.load(html);
  const items = [];

  $("#price_trends_year_sp dt").each((_, dt) => {
    const yearText = $(dt)
      .text()
      .trim();

    const yearMatch = yearText.match(/(\d{4})年/);

    if (!yearMatch) return;

    const year = yearMatch[1];

    const dd = $(dt).next("dd");

    let averagePrice = 0;

    dd.find("table.price tr").each((_, row) => {
      const score = $(row)
        .find(".price_score")
        .text()
        .trim();

      if (score !== "平均") return;

      const priceText = $(row)
        .find(".price_tanaka")
        .text()
        .trim();

      averagePrice = toNumber(priceText);
    });

    if (!averagePrice) return;

    items.push({
      date: year,
      label: year,
      price: averagePrice
    });
  });

  return dedupeByDate(items)
    .filter((item) => isValidGoldPrice(item.price))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function filterDailyRange(items, startDate, endDate) {
  const start = toDateString(startDate);
  const end = toDateString(endDate);

  return items.filter((item) =>
    item.date >= start && item.date <= end
  );
}

function buildRanges({ daily, monthly, yearly }) {
  const cleanDaily = daily
    .filter((item) => isValidGoldPrice(item.price))
    .sort((a, b) => a.date.localeCompare(b.date));

  const cleanMonthly = monthly
    .filter((item) => isValidGoldPrice(item.price))
    .sort((a, b) => a.date.localeCompare(b.date));

  const cleanYearly = yearly
    .filter((item) => isValidGoldPrice(item.price))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dailyAnchor =
    cleanDaily.length > 0
      ? new Date(cleanDaily.at(-1).date)
      : new Date();

  const range1W = cleanDaily.slice(-7);

  const range1M = cleanDaily.slice(-30);

  return {
    anchorDate: toDateString(dailyAnchor),
    ranges: {
      "1W": range1W,
      "1M": range1M,
      "1Y": cleanMonthly.slice(-12),
      "10Y": cleanYearly.slice(-10)
    }
  };
}

function assertRange(name, items, min) {
  if (items.length < min) {
    throw new Error(`${name}履歴が不足: ${items.length}件`);
  }
}

async function main() {
  console.log("現在価格取得中...");
  const latestHtml = await fetchHtml(URLS.latest);
  const latest = parseLatest(latestHtml);

  const latestDate = parseUpdatedAtDate(
    latest.updatedAt
  );

  console.log("日次履歴取得中...");
  const dailyHtml = await fetchHtml(URLS.daily);
  const daily = parseDailyHistory(
    dailyHtml,
    latestDate
  );

  console.log("月次履歴取得中...");
  const monthlyHtml = await fetchHtml(URLS.monthly);
  const monthly = parseMonthlyHistory(monthlyHtml);

  console.log("年次履歴取得中...");
  const yearlyHtml = await fetchHtml(URLS.yearly);
  const yearly = parseYearlyHistory(yearlyHtml);

  console.log(
    `daily:${daily.length} monthly:${monthly.length} yearly:${yearly.length}`
  );

  console.log("daily first/last:", daily[0], daily.at(-1));
  console.log("monthly first/last:", monthly[0], monthly.at(-1));
  console.log("yearly first/last:", yearly[0], yearly.at(-1));

  const { anchorDate, ranges } = buildRanges({
    daily,
    monthly,
    yearly
  });

  assertRange("週間", ranges["1W"], 2);
  assertRange("月間", ranges["1M"], 2);
  assertRange("年間", ranges["1Y"], 2);
  assertRange("10年", ranges["10Y"], 2);

  const data = {
    ...latest,
    generatedAt: new Date().toISOString(),
    anchorDate,
    ranges
  };

  await fs.mkdir("public", {
    recursive: true
  });

  await fs.writeFile(
    OUT_PATH,
    JSON.stringify(data, null, 2),
    "utf-8"
  );

  console.log(
    `gold.json overwritten: ¥${latest.latest.price.toLocaleString()}`
  );

  console.log(
    `anchor:${data.anchorDate} ` +
      `1W:${data.ranges["1W"].length} ` +
      `1M:${data.ranges["1M"].length} ` +
      `1Y:${data.ranges["1Y"].length} ` +
      `10Y:${data.ranges["10Y"].length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});