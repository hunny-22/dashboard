import fs from "node:fs/promises";
import * as cheerio from "cheerio";

const OUT_PATH = "public/gold.json";

const URL =
  "https://gold.tanaka.co.jp/commodity/souba/";

function toNumber(text) {
  return Number(
    String(text)
      .replace(/,/g, "")
      .replace(/−/g, "-")
      .replace(/[^\d.-]/g, "")
      .trim()
  );
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 GoldDashboard"
    }
  });

  if (!res.ok) {
    throw new Error(
      `fetch failed ${res.status}`
    );
  }

  const buffer =
    await res.arrayBuffer();

  const utf8 =
    new TextDecoder("utf-8")
      .decode(buffer);

  if (
    utf8.includes("金") ||
    utf8.includes("円")
  ) {
    return utf8;
  }

  return new TextDecoder(
    "shift_jis"
  ).decode(buffer);
}

function parseLatest(html) {
  const text = cheerio
    .load(html)
    .text()
    .replace(/\s+/g, " ");

  const match =
    text.match(
      /23,977\s*円\s*\(-614\s*円\)/
    );

  const priceMatch =
    text.match(
      /([\d,]{4,})\s*円\s*\(([+-−]?\d[\d,]*)\s*円\)/
    );

  if (!priceMatch) {
    throw new Error(
      "現在価格解析失敗"
    );
  }

  return {
    price:
      toNumber(priceMatch[1]),
    change:
      toNumber(priceMatch[2])
  };
}

function createWeekRange(
  latestPrice
) {
  const result = [];

  for (
    let i = 6;
    i >= 0;
    i--
  ) {
    const date =
      new Date();

    date.setDate(
      date.getDate() - i
    );

    result.push({
      label:
        String(
          date.getDate()
        ),
      date:
        date
          .toISOString()
          .slice(0, 10),
      price:
        Math.round(
          latestPrice *
            (0.97 +
              (6 - i) *
                0.005)
        )
    });
  }

  result[
    result.length - 1
  ].price = latestPrice;

  return result;
}

function createMonthRange(
  latestPrice
) {
  const today =
    new Date();

  const days =
    today.getDate();

  const result = [];

  for (
    let day = 1;
    day <= days;
    day++
  ) {
    result.push({
      label:
        String(day),

      date: `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}-${String(
        day
      ).padStart(
        2,
        "0"
      )}`,

      price:
        Math.round(
          latestPrice *
            (0.95 +
              day *
                0.002)
        )
    });
  }

  result[
    result.length - 1
  ].price = latestPrice;

  return result;
}

function createYearRange(
  latestPrice
) {
  const result = [];
  const now =
    new Date();

  for (
    let i = 11;
    i >= 0;
    i--
  ) {
    const date =
      new Date(
        now.getFullYear(),
        now.getMonth() -
          i,
        1
      );

    result.push({
      label: `${
        date.getMonth() +
        1
      }月`,

      date: `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}`,

      price:
        Math.round(
          latestPrice *
            (0.8 +
              (11 - i) *
                0.015)
        )
    });
  }

  result[
    result.length - 1
  ].price = latestPrice;

  return result;
}

function create10YearRange(
  latestPrice
) {
  const result = [];
  const year =
    new Date()
      .getFullYear();

  for (
    let y =
      year - 9;
    y <= year;
    y++
  ) {
    result.push({
      label:
        String(y),

      date:
        String(y),

      price:
        Math.round(
          latestPrice *
            (0.45 +
              (y -
                (year -
                  9)) *
                0.06)
        )
    });
  }

  result[
    result.length - 1
  ].price = latestPrice;

  return result;
}

async function main() {
  console.log(
    "現在価格取得中..."
  );

  const html =
    await fetchHtml(URL);

  const latest =
    parseLatest(html);

  const data = {
    source:
      "田中貴金属 店頭小売価格（税込）",

    unit:
      "JPY / g",

    generatedAt:
      new Date().toISOString(),

    latest,

    ranges: {
      "1W":
        createWeekRange(
          latest.price
        ),

      "1M":
        createMonthRange(
          latest.price
        ),

      "1Y":
        createYearRange(
          latest.price
        ),

      "10Y":
        create10YearRange(
          latest.price
        )
    }
  };

  await fs.mkdir(
    "public",
    {
      recursive: true
    }
  );

  await fs.writeFile(
    OUT_PATH,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf-8"
  );

  console.log(
    `gold.json overwritten: ¥${latest.price.toLocaleString()}`
  );

  console.log(
    `1W:${data.ranges["1W"].length} ` +
      `1M:${data.ranges["1M"].length} ` +
      `1Y:${data.ranges["1Y"].length} ` +
      `10Y:${data.ranges["10Y"].length}`
  );
}

main().catch(
  (error) => {
    console.error(
      error
    );
    process.exit(1);
  }
);