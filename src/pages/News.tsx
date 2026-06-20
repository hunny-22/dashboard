import {
  useEffect,
  useState
} from "react";

const NEWS_REFRESH_TIME =
  1000 * 60 * 5;

type NewsItem = {
  title: string;
  summary: string;
  imageUrl: string;
  articleUrl: string;
  source: string;
  publishedAt: string;
};

export default function News() {
  const [newsList, setNewsList] =
    useState<NewsItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let ignore = false;

    async function loadNews() {
      try {
        setLoading(true);
        setError("");

        const res =
          await fetch("/news.json");

        if (!res.ok) {
          throw new Error(
            "ニュース取得失敗"
          );
        }

        const data =
          await res.json();

        if (ignore) return;

        setNewsList(data);
      } catch (error) {
        if (ignore) return;

        console.error(error);

        setError(
          "ニュース取得失敗"
        );
      } finally {
        if (ignore) return;

        setLoading(false);
      }
    }

    loadNews();

    const timer =
      setInterval(
        loadNews,
        NEWS_REFRESH_TIME
      );

    return () => {
      ignore = true;

      clearInterval(timer);
    };
  }, []);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1
            style={{
              margin: 0
            }}
          >
            NEWS
          </h1>

          <div
            style={{
              opacity: 0.5,
              fontSize: "0.85rem"
            }}
          >
            Latest Updates
          </div>
        </div>

        <div
          style={{
            opacity: 0.5
          }}
        >
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {loading && (
        <div style={infoStyle}>
          更新中...
        </div>
      )}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={newsListStyle}>
        {newsList.map(
          (news, index) => (
            <div
              key={index}
              style={cardStyle}
              onDoubleClick={() => {
                window.open(
                  news.articleUrl,
                  "_blank"
                );
              }}
            >
              <div
                style={
                  thumbnailStyle
                }
              >
                {news.imageUrl ? (
                  <img
                    src={
                      news.imageUrl
                    }
                    alt={
                      news.title
                    }
                    style={
                      imageStyle
                    }
                  />
                ) : (
                  <div
                    style={
                      noImageStyle
                    }
                  >
                    NEWS
                  </div>
                )}
              </div>

              <div
                style={{
                  flex: 1
                }}
              >
                <div
                  style={
                    sourceStyle
                  }
                >
                  {news.source}
                </div>

                <div
                  style={
                    titleStyle
                  }
                >
                  {news.title}
                </div>

                <div
                  style={
                    summaryStyle
                  }
                >
                  {
                    news.summary
                  }
                </div>

                <div
                  style={
                    dateStyle
                  }
                >
                  {
                    news.publishedAt
                  }
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  width:
    "min(1400px, 95vw)",

  height:
    "min(900px, 90vh)",

  border:
    "1px solid #27272a",

  borderRadius: "20px",

  background:
    "rgba(255,255,255,0.04)",

  backdropFilter:
    "blur(10px)",

  padding: "30px",

  boxSizing:
    "border-box" as const,

  overflowY:
    "auto" as const
};

const headerStyle = {
  display: "flex",

  justifyContent:
    "space-between",

  alignItems: "center",

  marginBottom: "20px"
};

const infoStyle = {
  opacity: 0.6,

  marginBottom: "10px"
};

const errorStyle = {
  color: "#f87171",

  marginBottom: "10px"
};

const newsListStyle = {
  display: "flex",

  flexDirection:
    "column" as const,

  gap: "12px"
};

const cardStyle = {
  display: "flex",

  gap: "16px",

  padding: "16px",

  borderRadius: "16px",

  border:
    "1px solid #27272a",

  background:
    "rgba(255,255,255,0.03)",

  cursor: "pointer",

  transition:
    "all 0.2s ease"
};

const thumbnailStyle = {
  width: "160px",

  height: "90px",

  borderRadius: "12px",

  overflow: "hidden",

  flexShrink: 0,

  background:
    "rgba(255,255,255,0.05)"
};

const imageStyle = {
  width: "100%",

  height: "100%",

  objectFit:
    "cover" as const
};

const noImageStyle = {
  width: "100%",

  height: "100%",

  display: "flex",

  justifyContent:
    "center",

  alignItems:
    "center",

  opacity: 0.4
};

const sourceStyle = {
  fontSize: "0.75rem",

  opacity: 0.5,

  marginBottom: "6px"
};

const titleStyle = {
  fontSize: "1.05rem",

  fontWeight: "bold",

  marginBottom: "8px"
};

const summaryStyle = {
  fontSize: "0.9rem",

  opacity: 0.75,

  lineHeight: 1.5
};

const dateStyle = {
  marginTop: "8px",

  fontSize: "0.75rem",

  opacity: 0.45
};