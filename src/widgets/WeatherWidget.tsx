import { useEffect, useState } from "react";

const WEATHER_REFRESH_TIME =
  1000 * 60 * 5;

const WEATHER_CITY_STORAGE_KEY =
  "weatherCity";

const cities = [
  {
    name: "大阪府和泉市",
    latitude: 34.4833,
    longitude: 135.4333
  },
  {
    name: "東京都新宿区",
    latitude: 35.6896,
    longitude: 139.7006
  },
  {
    name: "北海道札幌市",
    latitude: 43.0618,
    longitude: 141.3545
  },
  {
    name: "福岡県福岡市",
    latitude: 33.5902,
    longitude: 130.4017
  }
];

function getWeatherIcon(
  code: number | null
) {
  if (code === null) return "？";
  if (code === 0) return "☀";
  if ([1, 2, 3].includes(code)) return "☁";
  if ([45, 48].includes(code)) return "🌫";
  if (
    [
      51, 53, 55, 61, 63, 65, 80, 81, 82
    ].includes(code)
  ) {
    return "🌧";
  }
  if (
    [
      71, 73, 75, 77, 85, 86
    ].includes(code)
  ) {
    return "❄";
  }
  if ([95, 96, 99].includes(code)) return "⛈";

  return "☁";
}

function getWeatherLabel(
  code: number | null
) {
  if (code === null) return "取得中";
  if (code === 0) return "晴れ";
  if ([1, 2].includes(code)) {
    return "晴れ時々くもり";
  }
  if (code === 3) return "くもり";
  if ([45, 48].includes(code)) return "霧";
  if ([51, 53, 55].includes(code)) {
    return "霧雨";
  }
  if (
    [
      61, 63, 65, 80, 81, 82
    ].includes(code)
  ) {
    return "雨";
  }
  if (
    [
      71, 73, 75, 77, 85, 86
    ].includes(code)
  ) {
    return "雪";
  }
  if ([95, 96, 99].includes(code)) {
    return "雷雨";
  }

  return "くもり";
}

export default function WeatherWidget() {
  const [city, setCity] = useState(() => {
    return (
      localStorage.getItem(
        WEATHER_CITY_STORAGE_KEY
      ) ?? "大阪府和泉市"
    );
  });

  const [temperature, setTemperature] =
    useState<number | null>(null);

  const [weatherCode, setWeatherCode] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  const selectedCity =
    cities.find(
      (cityItem) => cityItem.name === city
    ) ?? cities[0];

  useEffect(() => {
    localStorage.setItem(
      WEATHER_CITY_STORAGE_KEY,
      city
    );
  }, [city]);

  useEffect(() => {
    let ignore = false;

async function loadWeather() {
  try {
    setError("");

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${selectedCity.latitude}` +
      `&longitude=${selectedCity.longitude}` +
      `&current=temperature_2m,weather_code` +
      `&hourly=temperature_2m,weather_code` +
      `&forecast_days=1` +
      `&timezone=Asia%2FTokyo`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("天気API取得失敗");
    }

    const data = await res.json();

    const temp =
      data.current?.temperature_2m ??
      data.current_weather?.temperature ??
      data.hourly?.temperature_2m?.[0];

    const code =
      data.current?.weather_code ??
      data.current_weather?.weathercode ??
      data.hourly?.weather_code?.[0];

    if (ignore) return;

    if (typeof temp === "number") {
      setTemperature(temp);
    }

    if (typeof code === "number") {
      setWeatherCode(code);
    }

    if (
      typeof temp !== "number" &&
      typeof code !== "number"
    ) {
      throw new Error(
        "天気データの形式が不正"
      );
    }

    setLastUpdated(
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

    console.log(
      "天気取得エラー",
      error
    );

    // ここでは temperature/weatherCode を消さない
    // 前回成功した表示を残す
    setError("");
  }
}

    loadWeather();

    const timer = setInterval(() => {
      loadWeather();
    }, WEATHER_REFRESH_TIME);

    return () => {
      ignore = true;

      clearInterval(timer);
    };
  }, [
    selectedCity.latitude,
    selectedCity.longitude
  ]);

  return (
    <div style={weatherStyle}>
      <div style={iconStyle}>
        {getWeatherIcon(weatherCode)}
      </div>

      <div style={tempStyle}>
        {temperature === null
          ? "--"
          : temperature.toFixed(1)}
        ℃
      </div>

      <div style={cityStyle}>
        {city}
      </div>

      <div style={labelStyle}>
        {error ||
          getWeatherLabel(weatherCode)}
      </div>

      {lastUpdated && (
        <div style={updatedStyle}>
          {lastUpdated} 更新
        </div>
      )}

      <select
        value={city}
        onChange={(e) => {
          setCity(e.target.value);
        }}
        style={selectStyle}
      >
        {cities.map((cityItem) => (
          <option
            key={cityItem.name}
            value={cityItem.name}
          >
            {cityItem.name}
          </option>
        ))}
      </select>
    </div>
  );
}

const weatherStyle = {
  textAlign: "center" as const,
  width: "100%",
  padding: "8px",
  boxSizing: "border-box" as const
};

const iconStyle = {
  fontSize: "clamp(2rem, 5vw, 4rem)",
  lineHeight: 1
};

const tempStyle = {
  marginTop: "10px",
  fontSize:
    "clamp(1.5rem, 4vw, 2.5rem)",
  fontWeight: "bold"
};

const cityStyle = {
  marginTop: "8px",
  fontSize:
    "clamp(0.75rem, 2vw, 1rem)",
  opacity: 0.7
};

const labelStyle = {
  fontSize:
    "clamp(0.75rem, 2vw, 1rem)",
  opacity: 0.7
};

const updatedStyle = {
  marginTop: "4px",
  fontSize: "0.75rem",
  opacity: 0.5
};

const selectStyle = {
  marginTop: "14px",
  maxWidth: "100%",
  padding: "8px 14px",
  borderRadius: "999px",
  border: "1px solid #3f3f46",
  background: "#18181b",
  color: "#e5e7eb",
  cursor: "pointer"
};