import { useEffect, useMemo, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from "recharts";

const GOLD_REFRESH_TIME = 1000 * 60 * 5;

const GOLD_STORAGE_KEY =
  "goldWidgetData";

type RangeType = "10Y" | "1Y" | "1M" | "1W";

type GoldPoint = {
  label: string;
  price: number;
};

type GoldData = {
  source: string;
  unit: string;
  updatedAt?: string;
  generatedAt: string;
  latest: {
    price: number;
    change: number;
  };
  ranges: Record<RangeType, GoldPoint[]>;
};

const rangeOptions: {
  value: RangeType;
  label: string;
}[] = [
  { value: "1W", label: "週間" },
  { value: "1M", label: "月間" },
  { value: "1Y", label: "1年" },
  { value: "10Y", label: "10年" }
];

const fallbackGoldData: GoldData = {
  source: "読み込み前",
  unit: "JPY / g",
  generatedAt: "",
  latest: {
    price: 0,
    change: 0
  },
  ranges: {
    "10Y": [],
    "1Y": [],
    "1M": [],
    "1W": []
  }
};

function loadSavedGoldData() {
  const saved =
    localStorage.getItem(GOLD_STORAGE_KEY);

  if (!saved) return fallbackGoldData;

  try {
    return JSON.parse(saved) as GoldData;
  } catch {
    return fallbackGoldData;
  }
}

function formatYen(value: number) {
  return `¥${Math.round(value).toLocaleString()}`;
}

function formatShortYen(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }

  return `${Math.round(value)}`;
}

export default function GoldWidget() {
  const [range, setRange] =
    useState<RangeType>("1W");

  const [goldData, setGoldData] =
    useState<GoldData>(() =>
      loadSavedGoldData()
    );

  const [error, setError] =
    useState("");

  const [loadedAt, setLoadedAt] =
    useState("");

  useEffect(() => {
    let ignore = false;

    async function loadGold() {
      try {
        setError("");

        /*
         * ユラメモ♡
         *
         * ページ移動でGoldWidgetが再マウントされると、
         * 通信が終わるまで初期値に戻って "--" になる。
         *
         * なので最後に成功した gold.json を localStorage に保存して、
         * 戻ってきた瞬間は保存済みデータを表示。
         * その裏で新しい gold.json を取りに行く。
         */
        /*
 * ユラメモ♡
 *
 * GitHub Pagesでは /dashboard/ 配下で公開される。
 * /gold.json だと github.io 直下を見に行って404になるので、
 * Viteの BASE_URL を使って正しい場所から読む。
 */
const res = await fetch(
  `${import.meta.env.BASE_URL}gold.json?time=${Date.now()}`
);

        if (!res.ok) {
          throw new Error(
            "金相場データ取得失敗"
          );
        }

        const data: GoldData =
          await res.json();

        if (ignore) return;

        setGoldData(data);

        localStorage.setItem(
          GOLD_STORAGE_KEY,
          JSON.stringify(data)
        );

        setLoadedAt(
          new Date().toLocaleTimeString(
            "ja-JP",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          )
        );
      } catch (error) {
        if (ignore) return;

        console.error(error);
        setError("取得失敗");
      }
    }

    loadGold();

    const timer = setInterval(() => {
      loadGold();
    }, GOLD_REFRESH_TIME);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, []);

  const history = useMemo(() => {
    return goldData.ranges[range] ?? [];
  }, [goldData, range]);

  const stats = useMemo(() => {
    const prices =
      history.map((item) => item.price);

    if (prices.length === 0) {
      return {
        min: 0,
        max: 0,
        base: 0
      };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      base: history[0].price
    };
  }, [history]);

  const latestPrice =
    goldData.latest.price;

  const change =
    goldData.latest.change;

  const previousPrice =
    latestPrice - change;

  const changeRate =
    previousPrice === 0
      ? 0
      : (change / previousPrice) * 100;

  const isPlus = change >= 0;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <div style={labelStyle}>
            GOLD
          </div>

          <div style={subLabelStyle}>
            {goldData.unit}
          </div>
        </div>

        <div style={rangeButtonGroupStyle}>
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setRange(option.value);
              }}
              style={{
                ...rangeButtonStyle,
                ...(range === option.value
                  ? activeRangeButtonStyle
                  : {})
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={priceRowStyle}>
        <div style={priceStyle}>
          {latestPrice === 0
            ? "--"
            : formatYen(latestPrice)}
        </div>

        <div
          style={{
            ...changeStyle,
            color: isPlus
              ? "#facc15"
              : "#60a5fa"
          }}
        >
          {isPlus ? "+" : ""}
          {change.toLocaleString()}
          {" "}
          (
          {isPlus ? "+" : ""}
          {changeRate.toFixed(2)}
          %)
        </div>
      </div>

      <div style={statsStyle}>
        <div>
          <span style={statLabelStyle}>
            HIGH
          </span>
          {formatYen(stats.max)}
        </div>

        <div>
          <span style={statLabelStyle}>
            LOW
          </span>
          {formatYen(stats.min)}
        </div>
      </div>

      <div style={chartHeaderStyle}>
        <span>価格推移</span>
        <span>Y: 金額 / X: 期間</span>
      </div>

      <div style={chartAreaStyle}>
        {history.length > 0 ? (
          <ResponsiveContainer
            width="99%"
            height="99%"
          >
            <LineChart
              data={history}
              margin={{
                top: 8,
                right: 10,
                bottom: 2,
                left: -8
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.12)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{
                  fill: "rgba(255,255,255,0.48)",
                  fontSize: 10
                }}
                axisLine={{
                  stroke: "rgba(255,255,255,0.25)"
                }}
                tickLine={false}
                interval={
                  range === "1M" ? 4 : 0
                }
              />

              <YAxis
                tick={{
                  fill: "rgba(255,255,255,0.48)",
                  fontSize: 10
                }}
                axisLine={{
                  stroke: "rgba(255,255,255,0.25)"
                }}
                tickLine={false}
                tickFormatter={formatShortYen}
                domain={[
                  "dataMin",
                  "dataMax"
                ]}
                width={42}
              />

              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(value) => [
                  formatYen(Number(value)),
                  "価格"
                ]}
              />

              {stats.base > 0 && (
                <ReferenceLine
                  y={stats.base}
                  stroke="rgba(250,204,21,0.35)"
                  strokeDasharray="4 4"
                />
              )}

              {/*
               * ユラメモ♡
               *
               * type="linear" は折れ線。
               * type="monotone" は滑らかな曲線。
               *
               * 金相場は変化点をそのまま見たいから linear。
               * dot=false でマーカー線っぽさを消す。
               * strokeWidthは細め固定で、太さが暴れないようにする。
               */}
              <Line
                type="linear"
                dataKey="price"
                stroke="#facc15"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 3
                }}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={emptyStyle}>
            NO DATA
          </div>
        )}
      </div>

      <div style={footerStyle}>
        <span>
          公表 {goldData.updatedAt ?? "--"}
        </span>

        <span>
          読込 {loadedAt || "--:--"}
        </span>
      </div>

      <div style={sourceStyle}>
        {error || goldData.source}
      </div>
    </div>
  );
}

const containerStyle = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column" as const,
  padding: "clamp(8px, 1.5vw, 14px)",
  boxSizing: "border-box" as const,
  overflow: "hidden"
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "8px",
  flexShrink: 0
};

const labelStyle = {
  fontSize:
    "clamp(0.65rem, 1.4vw, 0.85rem)",
  letterSpacing: "0.22em",
  opacity: 0.65
};

const subLabelStyle = {
  marginTop: "3px",
  fontSize:
    "clamp(0.55rem, 1.2vw, 0.7rem)",
  opacity: 0.4
};

const rangeButtonGroupStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
  gap: "4px"
};

const rangeButtonStyle = {
  padding:
    "clamp(3px, 0.8vw, 5px) clamp(5px, 1vw, 8px)",
  borderRadius: "999px",
  border: "1px solid #3f3f46",
  background:
    "rgba(255,255,255,0.04)",
  color: "#a1a1aa",
  cursor: "pointer",
  fontSize:
    "clamp(0.55rem, 1.2vw, 0.68rem)",
  fontWeight: "bold"
};

const activeRangeButtonStyle = {
  background:
    "rgba(250,204,21,0.14)",
  border: "1px solid #ca8a04",
  color: "#facc15"
};

const priceRowStyle = {
  marginTop:
    "clamp(6px, 1.3vw, 10px)",
  flexShrink: 0
};

const priceStyle = {
  fontSize:
    "clamp(1.35rem, 5vw, 3rem)",
  fontWeight: "bold",
  lineHeight: 1
};

const changeStyle = {
  marginTop: "5px",
  fontSize:
    "clamp(0.72rem, 1.8vw, 1rem)",
  fontWeight: "bold"
};

const statsStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  marginTop:
    "clamp(6px, 1.2vw, 8px)",
  fontSize:
    "clamp(0.58rem, 1.4vw, 0.75rem)",
  opacity: 0.7,
  flexShrink: 0
};

const statLabelStyle = {
  marginRight: "4px",
  opacity: 0.45
};

const chartHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop:
    "clamp(6px, 1.2vw, 8px)",
  fontSize:
    "clamp(0.52rem, 1.2vw, 0.68rem)",
  opacity: 0.48,
  letterSpacing: "0.08em",
  flexShrink: 0
};

const chartAreaStyle = {
  width: "100%",
  height: "100%",
  flex: 1,
  minWidth: 0,
  minHeight: "160px",
  marginTop: "4px",
  borderRadius: "12px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
  overflow: "hidden"
};

const emptyStyle = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0.4,
  fontSize: "0.75rem"
};

const footerStyle = {
  marginTop:
    "clamp(6px, 1.2vw, 8px)",
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  fontSize:
    "clamp(0.52rem, 1.2vw, 0.68rem)",
  opacity: 0.45,
  flexShrink: 0
};

const sourceStyle = {
  marginTop: "3px",
  fontSize:
    "clamp(0.5rem, 1.1vw, 0.62rem)",
  opacity: 0.35,
  whiteSpace: "nowrap" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
  flexShrink: 0
};

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "10px",
  color: "#f4f4f5",
  fontSize: "0.75rem"
};

const tooltipLabelStyle = {
  color: "#d4d4d8",
  fontSize: "0.72rem"
};