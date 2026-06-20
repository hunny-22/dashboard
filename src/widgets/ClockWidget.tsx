import { useEffect, useState } from "react";

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const [tick, setTick] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(true);

      setTimeout(() => {
        setNow(new Date());
        setTick(false);
      }, 120);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const seconds = now.toLocaleTimeString("ja-JP", {
    second: "2-digit"
  });

  return (
    <div style={containerStyle}>
      <div style={clockStyle}>
        <div style={labelStyle}>
          LOCAL TIME
        </div>

        <div
          style={{
            ...timeStyle,
            transform: tick
              ? "translateY(4px)"
              : "translateY(0)"
          }}
        >
          {time}
        </div>

        <div style={secondsStyle}>
          {seconds}
        </div>

        <div style={lineStyle} />
      </div>
    </div>
  );
}

const containerStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "12px",
  boxSizing: "border-box" as const
};

const clockStyle = {
  width: "100%",
  textAlign: "center" as const
};

const labelStyle = {
  fontSize: "0.75rem",
  letterSpacing: "0.22em",
  opacity: 0.55
};

const timeStyle = {
  marginTop: "10px",
  fontSize: "clamp(2.2rem, 7vw, 5rem)",
  fontWeight: "bold",
  lineHeight: 1,
  transition: "transform 0.12s ease"
};

const secondsStyle = {
  marginTop: "8px",
  fontSize: "1rem",
  opacity: 0.55,
  letterSpacing: "0.25em"
};

const lineStyle = {
  width: "60%",
  height: "2px",
  margin: "14px auto 0",
  background:
    "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)"
};