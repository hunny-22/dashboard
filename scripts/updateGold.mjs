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

  const dateMatch =
    text.match(
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

function extractNumbers(text) {
  return [...String(text).matchAll(/[\d,]+(?:\.\d+)?/g)]
    .map((match) => toNumber(match[0]))
    .filter(Number.isFinite);
}

function parseDateParts(text) {
  const normalized = normalizeText(text);

  const jpDate =
    normalized.match(
      /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/
    );

  if (jpDate) {
    return {
      year: Number(jpDate[1]),
      month: Number(jpDate[2]),
      day: Number(jpDate[3])
    };
  }

  const slashDate =
    normalized.match(
      /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/
    );

  if (slashDate) {
    return {
      year: Number(slashDate[1]),
      month: Number(slashDate[2]),
      day: Number(slashDate[3])
    };
  }

  return null;
}

function toDateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseDailyHistory(html) {
  const $ = cheerio.load(html);

  const items = [];

  $("#price_trends tr, table.price_trends tr").each((_, row) => {
    const dateText = $(row)
      .find("td.date")
      .text()
      .trim();

    const priceText = $(row)
      .find("td.retail_tax")
      .first()
      .text()
      .trim();

    const dateMatch = dateText.match(/(\d{2})\.(\d{2})/);

    if (!dateMatch) return;

    const month = dateMatch[1];
    const day = dateMatch[2];

    const price = toNumber(priceText);

    if (!price) return;

    items.push({
      label: String(Number(day)),
      date: `${new Date().getFullYear()}-${month}-${day}`,
      price
    });
  });

  return dedupeByDate(items).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
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
        currentYear = el.text().replace("年", "").trim();
      }

      if (el.is("dl")) {

        const months = el.find("dt.month");

        months.each((index, monthNode) => {

          const month =
            $(monthNode)
              .text()
              .replace("月", "")
              .trim()
              .padStart(2, "0");

          const dd =
            $(monthNode).next("dd");

          const averageText =
            dd
              .find("td.price_tanaka")
              .last()
              .text()
              .replace(/,/g, "")
              .trim();

          const average =
            Number(averageText);

          if (!average) {
            return;
          }

          items.push({
            date: `${currentYear}-${month}`,
            label: `${Number(month)}月`,
            price: average
          });
        });
      }
    });

  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date)
  );
}

function parseYearlyHistory(html) {
  const $ = cheerio.load(html);
  const items = [];

  $("tr").each((_, row) => {
    const rowText = normalizeText(
      $(row).find("th,td").text()
    );

    const yearMatch =
      rowText.match(/\b(20\d{2}|19\d{2})\b/);

    if (!yearMatch) return;

    const year = yearMatch[1];

    const prices = extractNumbers(rowText)
      .filter((num) => num >= 1000 && num <= 100000);

    const price = prices.at(-1);

    if (!price) return;

    items.push({
      date: year,
      label: year,
      price
    });
  });

  return dedupeByDate(items)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function dedupeByDate(items) {
  const map = new Map();

  for (const item of items) {
    map.set(item.date, item);
  }

  return [...map.values()];
}

function takeLast(items, count) {
  return items.slice(-count);
}

async function main() {
  console.log("現在価格取得中...");
  const latestHtml = await fetchHtml(URLS.latest);
  const latest = parseLatest(latestHtml);

  console.log("日次履歴取得中...");
const dailyHtml = await fetchHtml(URLS.daily);





const daily = parseDailyHistory(dailyHtml);

  console.log("月次履歴取得中...");
const monthlyHtml = await fetchHtml(URLS.monthly);





const monthly = parseMonthlyHistory(monthlyHtml);

  console.log("年次履歴取得中...");
  const yearlyHtml = await fetchHtml(URLS.yearly);
  const yearly = parseYearlyHistory(yearlyHtml);

  if (daily.length < 7) {
    throw new Error(`日次履歴が不足: ${daily.length}件`);
  }

  if (monthly.length < 12) {
    throw new Error(`月次履歴が不足: ${monthly.length}件`);
  }

  if (yearly.length < 10) {
    throw new Error(`年次履歴が不足: ${yearly.length}件`);
  }

const data = {
  ...latest,
  generatedAt: new Date().toISOString(),
  ranges: {
    "1W": takeLast(daily, 7),
    "1M": daily,
    "1Y": takeLast(monthly, 12),
    "10Y": takeLast(yearly, 10)
  }
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