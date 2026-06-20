import { useEffect, useState } from "react";
import Home from "./pages/Home";
import News from "./pages/News";

function App() {
  const [page, setPage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [extraPages, setExtraPages] =
    useState<string[]>(() => {
      const saved =
        localStorage.getItem("extraPages");

      if (saved) {
        return JSON.parse(saved);
      }

      return [];
    });

  useEffect(() => {
    localStorage.setItem(
      "extraPages",
      JSON.stringify(extraPages)
    );
  }, [extraPages]);

  const basePages = [
    {
      name: "HOME",
      component: <Home />
    },
    {
      name: "NEWS",
      component: <News />
    }
  ];

  const pages = [
    ...basePages,
    ...extraPages.map((pageName) => ({
      name: pageName,
      component: (
        <div>
          <h1>{pageName}</h1>
          <p
            style={{
              fontSize: "1rem",
              opacity: 0.6
            }}
          >
            Empty Page
          </p>
        </div>
      )
    }))
  ];

  return (
    <div style={appStyle}>
      {pages[page].component}

      <button
        style={menuButtonStyle}
        onClick={() => {
          setMenuOpen(true);
        }}
      >
        ☰
      </button>

      <button
        style={leftButtonStyle}
        onClick={() => {
          setPage(
            (page + pages.length - 1) %
              pages.length
          );
        }}
      >
        ◀
      </button>

      <button
        style={rightButtonStyle}
        onClick={() => {
          setPage(
            (page + 1) % pages.length
          );
        }}
      >
        ▶
      </button>

      {menuOpen && (
        <div
          style={menuOverlayStyle}
          onClick={() => {
            setMenuOpen(false);
          }}
        >
          <div
            style={sideMenuStyle}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <h2>MENU</h2>

            <input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
              }}
              placeholder="ページ検索"
              style={searchInputStyle}
            />

            {pages
              .map((targetPage, index) => ({
                ...targetPage,
                index
              }))
              .filter((targetPage) =>
                targetPage.name
                  .toLowerCase()
                  .includes(
                    searchText.toLowerCase()
                  )
              )
              .map((targetPage) => (
                <button
                  key={targetPage.index}
                  style={menuItemStyle}
                  onClick={() => {
                    setPage(targetPage.index);
                    setMenuOpen(false);
                  }}
                >
                  {targetPage.name}
                </button>
              ))}

            <button
              style={menuActionStyle}
              onClick={() => {
                const name =
                  prompt("ページ名♡");

                if (!name) return;

                setExtraPages([
                  ...extraPages,
                  name
                ]);

                setPage(pages.length);
                setMenuOpen(false);
              }}
            >
              ＋ ページ追加
            </button>

            {page >= basePages.length && (
              <button
                style={menuDangerStyle}
                onClick={() => {
                  const ok = confirm(
                    "このページを削除する？"
                  );

                  if (!ok) return;

                  const index =
                    page - basePages.length;

                  const newPages =
                    [...extraPages];

                  newPages.splice(index, 1);

                  setExtraPages(newPages);
                  setPage(0);
                  setMenuOpen(false);
                }}
              >
                🗑 表示中ページ削除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const appStyle = {
  width: "100vw",
  height: "100vh",
  backgroundColor: "#09090b",
  color: "#e5e7eb",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "1rem",
  position: "relative" as const,
  overflow: "hidden",
  fontFamily: "Segoe UI"
};

const baseButtonStyle = {
  position: "absolute" as const,
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  border: "1px solid #27272a",
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
  cursor: "pointer",
  backdropFilter: "blur(10px)"
};

const menuButtonStyle = {
  ...baseButtonStyle,
  left: "20px",
  top: "20px",
  fontSize: "1.5rem"
};

const leftButtonStyle = {
  ...baseButtonStyle,
  left: "20px",
  top: "50%",
  transform: "translateY(-50%)"
};

const rightButtonStyle = {
  ...baseButtonStyle,
  right: "20px",
  top: "50%",
  transform: "translateY(-50%)"
};

const menuOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(4px)",
  zIndex: 999
};

const sideMenuStyle = {
  width: "min(340px, 90vw)",
  height: "100vh",
  padding: "24px",
  background: "#18181b",
  borderRight: "1px solid #27272a",
  boxSizing: "border-box" as const
};

const searchInputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "16px",
  borderRadius: "10px",
  border: "1px solid #3f3f46",
  background: "#09090b",
  color: "#e5e7eb",
  boxSizing: "border-box" as const
};

const menuItemStyle = {
  display: "block",
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "10px",
  border: "1px solid #3f3f46",
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
  cursor: "pointer",
  textAlign: "left" as const
};

const menuActionStyle = {
  ...menuItemStyle,
  marginTop: "20px"
};

const menuDangerStyle = {
  ...menuItemStyle,
  color: "#fca5a5",
  border: "1px solid #7f1d1d"
};

export default App;