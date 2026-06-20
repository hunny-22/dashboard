import { useEffect, useState } from "react";

type FlipUnitProps = {
  label: string;
  value: string;
};

function FlipUnit({ label, value }: FlipUnitProps) {
  const [displayValue, setDisplayValue] =
    useState(value);

  const [flipping, setFlipping] =
    useState(false);

  useEffect(() => {
    if (value === displayValue) return;

    setFlipping(true);

    const timer = setTimeout(() => {
      setDisplayValue(value);
      setFlipping(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [value, displayValue]);

  return (
    <div style={unitWrapStyle}>
      <div style={unitLabelStyle}>
        {label}
      </div>

      <div style={flipBoxStyle}>
        <div
          style={{
            ...flipCardStyle,
            transform: flipping
              ? "rotateX(85deg)"
              : "rotateX(0deg)"
          }}
        >
          {displayValue}
        </div>
      </div>
    </div>
  );
}

export default function CalendarWidget() {
  const [now, setNow] =
    useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const month =
    now.getMonth() + 1;

  const day =
    now.getDate();

  const weekday =
    ["日", "月", "火", "水", "木", "金", "土"][
      now.getDay()
    ];

  const monthTens =
    Math.floor(month / 10).toString();

  const monthOnes =
    (month % 10).toString();

  const dayTens =
    Math.floor(day / 10).toString();

  const dayOnes =
    (day % 10).toString();

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        DATE
      </div>

      <div style={rowStyle}>
        <FlipUnit
          label="月"
          value={monthTens}
        />

        <FlipUnit
          label="月"
          value={monthOnes}
        />

        <div style={separatorStyle}>
          /
        </div>

        <FlipUnit
          label="日"
          value={dayTens}
        />

        <FlipUnit
          label="日"
          value={dayOnes}
        />
      </div>

      <div style={weekdayRowStyle}>
        <FlipUnit
          label="曜日"
          value={weekday}
        />
      </div>
    </div>
  );
}

const containerStyle = {
  width: "100%",
  height: "100%",

  display: "flex",
  flexDirection: "column" as const,

  justifyContent: "center",
  alignItems: "center",

  gap: "14px",

  padding: "12px",

  boxSizing: "border-box" as const
};

const titleStyle = {
  fontSize: "0.75rem",

  letterSpacing: "0.25em",

  opacity: 0.55
};

const rowStyle = {
  display: "flex",

  alignItems: "center",

  justifyContent: "center",

  gap: "8px",

  flexWrap: "wrap" as const
};

const weekdayRowStyle = {
  display: "flex",

  justifyContent: "center"
};

const unitWrapStyle = {
  display: "flex",

  flexDirection: "column" as const,

  alignItems: "center",

  gap: "6px"
};

const unitLabelStyle = {
  fontSize: "0.65rem",

  opacity: 0.45,

  letterSpacing: "0.15em"
};

const flipBoxStyle = {
  width: "clamp(42px, 6vw, 72px)",

  height: "clamp(58px, 8vw, 92px)",

  perspective: "600px"
};

const flipCardStyle = {
  width: "100%",
  height: "100%",

  display: "flex",

  justifyContent: "center",
  alignItems: "center",

  borderRadius: "12px",

  background:
    "linear-gradient(180deg, #27272a, #09090b)",

  border: "1px solid #3f3f46",

  boxShadow:
    "inset 0 -1px 0 rgba(255,255,255,0.12), 0 12px 30px rgba(0,0,0,0.35)",

  color: "#f4f4f5",

  fontSize:
    "clamp(1.8rem, 5vw, 3.5rem)",

  fontWeight: "bold",

  lineHeight: 1,

  transformOrigin: "top center",

  transition:
    "transform 0.22s ease"
};

const separatorStyle = {
  fontSize:
    "clamp(1.4rem, 4vw, 2.4rem)",

  opacity: 0.4,

  paddingTop: "18px"
};