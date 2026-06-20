import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent
} from "react";
import { widgetRegistry } from "../widgetRegistry";

type WidgetId = keyof typeof widgetRegistry;

type HomeWidget = {
  instanceId: string;
  widgetType: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
  settings: Record<string, unknown>;
};

type DragPreview = {
  x: number;
  y: number;
  valid: boolean;
};

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type ResizeState = {
  index: number;
  direction: ResizeDirection;
  startX: number;
  startY: number;
  original: HomeWidget;
  preview: HomeWidget;
  valid: boolean;
};

function createWidgetId() {
  return crypto.randomUUID();
}

const GRID_SIZE = 8;
const MIN_WIDGET_SIZE = 1;

const defaultWidgets: HomeWidget[] = [
  {
    instanceId: createWidgetId(),
    widgetType: "weather",
    x: 0,
    y: 0,
    w: 2,
    h: 2,
    settings: {}
  },
  {
    instanceId: createWidgetId(),
    widgetType: "clock",
    x: 2,
    y: 0,
    w: 2,
    h: 2,
    settings: {}
  },
  {
    instanceId: createWidgetId(),
    widgetType: "calendar",
    x: 0,
    y: 2,
    w: 4,
    h: 2,
    settings: {}
  },
  {
    instanceId: createWidgetId(),
    widgetType: "gold",
    x: 4,
    y: 0,
    w: 2,
    h: 2,
    settings: {}
  }
];

const widgetOptions: {
  id: WidgetId;
  label: string;
}[] = [
  { id: "clock", label: "時計" },
  { id: "weather", label: "天気" },
  { id: "calendar", label: "カレンダー" },
  { id: "gold", label: "金相場" }
];

const sizeOptions = [
  { label: "小 2×2", w: 2, h: 2 },
  { label: "横長 4×2", w: 4, h: 2 },
  { label: "大 4×4", w: 4, h: 4 }
];

export default function Home() {
  const homeRef = useRef<HTMLDivElement | null>(null);

  const [widgets, setWidgets] =
    useState<HomeWidget[]>(() => {
      const saved =
        localStorage.getItem("homeWidgets");

      if (!saved) return defaultWidgets;

      const parsed = JSON.parse(saved);

      if (
        Array.isArray(parsed) &&
        typeof parsed[0] === "string"
      ) {
        return parsed.map(
          (widgetId, index) => ({
            instanceId: createWidgetId(),
            widgetType: widgetId,
            x: (index % 4) * 2,
            y: Math.floor(index / 4) * 2,
            w: 2,
            h: 2,
            settings: {}
          })
        );
      }

      if (
        Array.isArray(parsed) &&
        parsed[0]?.size
      ) {
        return parsed.map(
          (widget, index) => ({
            instanceId: createWidgetId(),
            widgetType: widget.id,
            x: (index % 4) * 2,
            y: Math.floor(index / 4) * 2,
            w:
              widget.size === "small"
                ? 2
                : 4,
            h:
              widget.size === "large"
                ? 4
                : 2,
            settings: {}
          })
        );
      }

      if (
        Array.isArray(parsed) &&
        parsed[0]?.id
      ) {
        return parsed.map((widget) => ({
          instanceId: createWidgetId(),
          widgetType: widget.id,
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
          settings: {}
        }));
      }

      return parsed;
    });

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null);

  const [draggingIndex, setDraggingIndex] =
    useState<number | null>(null);

  const [dragPreview, setDragPreview] =
    useState<DragPreview | null>(null);

  const [resizeState, setResizeState] =
    useState<ResizeState | null>(null);

  useEffect(() => {
    localStorage.setItem(
      "homeWidgets",
      JSON.stringify(widgets)
    );
  }, [widgets]);

  useEffect(() => {
    function handleMouseMove(e: globalThis.MouseEvent) {
      if (!resizeState || !homeRef.current) return;

      const rect =
        homeRef.current.getBoundingClientRect();

      const cellWidth =
        rect.width / GRID_SIZE;

      const cellHeight =
        rect.height / GRID_SIZE;

      const dx = Math.round(
        (e.clientX - resizeState.startX) /
          cellWidth
      );

      const dy = Math.round(
        (e.clientY - resizeState.startY) /
          cellHeight
      );

      const nextWidget =
        getResizedWidget(
          resizeState.original,
          resizeState.direction,
          dx,
          dy
        );

      const valid =
        canPlaceWidget(
          nextWidget,
          widgets,
          resizeState.index
        );

      setResizeState({
        ...resizeState,
        preview: nextWidget,
        valid
      });
    }

    function handleMouseUp() {
      if (!resizeState) return;

      if (resizeState.valid) {
        const newWidgets = [...widgets];

        newWidgets[resizeState.index] =
          resizeState.preview;

        setWidgets(newWidgets);
      }

      setResizeState(null);
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };
  }, [resizeState, widgets]);

  function isOverlapping(
    a: HomeWidget,
    b: HomeWidget
  ) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function canPlaceWidget(
    widget: HomeWidget,
    widgetList: HomeWidget[],
    ignoreIndex: number | null = null
  ) {
    if (
      widget.x < 0 ||
      widget.y < 0 ||
      widget.x + widget.w > GRID_SIZE ||
      widget.y + widget.h > GRID_SIZE
    ) {
      return false;
    }

    return !widgetList.some(
      (otherWidget, index) =>
        index !== ignoreIndex &&
        isOverlapping(
          widget,
          otherWidget
        )
    );
  }

  function findEmptyPosition(
    widgetList: HomeWidget[],
    w: number,
    h: number
  ) {
    for (
      let y = 0;
      y <= GRID_SIZE - h;
      y++
    ) {
      for (
        let x = 0;
        x <= GRID_SIZE - w;
        x++
      ) {
        const testWidget: HomeWidget = {
          instanceId: "temp",
          widgetType: "clock",
          x,
          y,
          w,
          h,
          settings: {}
        };

        if (
          canPlaceWidget(
            testWidget,
            widgetList
          )
        ) {
          return { x, y };
        }
      }
    }

    return null;
  }

  function getResizedWidget(
    widget: HomeWidget,
    direction: ResizeDirection,
    dx: number,
    dy: number
  ) {
    let x = widget.x;
    let y = widget.y;
    let w = widget.w;
    let h = widget.h;

    if (direction.includes("e")) {
      w = widget.w + dx;
    }

    if (direction.includes("s")) {
      h = widget.h + dy;
    }

    if (direction.includes("w")) {
      x = widget.x + dx;
      w = widget.w - dx;
    }

    if (direction.includes("n")) {
      y = widget.y + dy;
      h = widget.h - dy;
    }

    if (w < MIN_WIDGET_SIZE) {
      if (direction.includes("w")) {
        x =
          widget.x +
          widget.w -
          MIN_WIDGET_SIZE;
      }

      w = MIN_WIDGET_SIZE;
    }

    if (h < MIN_WIDGET_SIZE) {
      if (direction.includes("n")) {
        y =
          widget.y +
          widget.h -
          MIN_WIDGET_SIZE;
      }

      h = MIN_WIDGET_SIZE;
    }

    return {
      ...widget,
      x,
      y,
      w,
      h
    };
  }

  function getDragPosition(
    e: DragEvent<HTMLDivElement>,
    widget: HomeWidget
  ) {
    const rect =
      e.currentTarget.getBoundingClientRect();

    const cellWidth =
      rect.width / GRID_SIZE;

    const cellHeight =
      rect.height / GRID_SIZE;

    const rawX = Math.floor(
      (e.clientX - rect.left) / cellWidth
    );

    const rawY = Math.floor(
      (e.clientY - rect.top) / cellHeight
    );

    const x = Math.max(
      0,
      Math.min(
        GRID_SIZE - widget.w,
        rawX - Math.floor(widget.w / 2)
      )
    );

    const y = Math.max(
      0,
      Math.min(
        GRID_SIZE - widget.h,
        rawY - Math.floor(widget.h / 2)
      )
    );

    return { x, y };
  }

  function changeWidget(widgetId: WidgetId) {
    if (selectedIndex === null) return;

    const newWidgets = [...widgets];

    newWidgets[selectedIndex] = {
      ...newWidgets[selectedIndex],
      widgetType: widgetId
    };

    setWidgets(newWidgets);
  }

  function changeWidgetSize(
    w: number,
    h: number
  ) {
    if (selectedIndex === null) return;

    const newWidgets = [...widgets];
    const widget =
      newWidgets[selectedIndex];

    const nextWidget = {
      ...widget,
      w,
      h
    };

    if (
      !canPlaceWidget(
        nextWidget,
        widgets,
        selectedIndex
      )
    ) {
      return;
    }

    newWidgets[selectedIndex] =
      nextWidget;

    setWidgets(newWidgets);
  }

  function moveWidget(
    dx: number,
    dy: number
  ) {
    if (selectedIndex === null) return;

    const newWidgets = [...widgets];
    const widget =
      newWidgets[selectedIndex];

    const nextWidget = {
      ...widget,
      x: Math.max(
        0,
        Math.min(
          GRID_SIZE - widget.w,
          widget.x + dx
        )
      ),
      y: Math.max(
        0,
        Math.min(
          GRID_SIZE - widget.h,
          widget.y + dy
        )
      )
    };

    if (
      !canPlaceWidget(
        nextWidget,
        widgets,
        selectedIndex
      )
    ) {
      return;
    }

    newWidgets[selectedIndex] =
      nextWidget;

    setWidgets(newWidgets);
  }

  function addWidget() {
    const position =
      findEmptyPosition(
        widgets,
        2,
        2
      );

    if (!position) {
      alert(
        "配置できる場所がありません♡"
      );

      return;
    }

    const newWidget: HomeWidget = {
      instanceId: createWidgetId(),
      widgetType: "clock",
      x: position.x,
      y: position.y,
      w: 2,
      h: 2,
      settings: {}
    };

    setWidgets([
      ...widgets,
      newWidget
    ]);
  }

  function deleteWidget() {
    if (selectedIndex === null) return;

    const ok = confirm(
      "このWidgetを削除する？"
    );

    if (!ok) return;

    const newWidgets = [...widgets];

    newWidgets.splice(
      selectedIndex,
      1
    );

    setWidgets(newWidgets);
    setMenuOpen(false);
  }

  function handleDragOver(
    e: DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();

    if (
      draggingIndex === null ||
      resizeState !== null
    ) {
      return;
    }

    const widget =
      widgets[draggingIndex];

    const position =
      getDragPosition(e, widget);

    const previewWidget = {
      ...widget,
      x: position.x,
      y: position.y
    };

    const valid =
      canPlaceWidget(
        previewWidget,
        widgets,
        draggingIndex
      );

    setDragPreview({
      x: position.x,
      y: position.y,
      valid
    });
  }

  function handleDrop() {
    if (
      draggingIndex === null ||
      dragPreview === null
    ) {
      return;
    }

    const widget =
      widgets[draggingIndex];

    const nextWidget = {
      ...widget,
      x: dragPreview.x,
      y: dragPreview.y
    };

    if (
      !canPlaceWidget(
        nextWidget,
        widgets,
        draggingIndex
      )
    ) {
      setDraggingIndex(null);
      setDragPreview(null);
      return;
    }

    const newWidgets = [...widgets];

    newWidgets[draggingIndex] =
      nextWidget;

    setWidgets(newWidgets);
    setDraggingIndex(null);
    setDragPreview(null);
  }

  function startResize(
    e: MouseEvent<HTMLDivElement>,
    index: number,
    direction: ResizeDirection
  ) {
    e.preventDefault();
    e.stopPropagation();

    const widget = widgets[index];

    setResizeState({
      index,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      original: widget,
      preview: widget,
      valid: true
    });

    setSelectedIndex(index);
  }

  return (
    <div
      ref={homeRef}
      style={homeStyle}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {(
          menuOpen ||
          draggingIndex !== null ||
          resizeState !== null
      ) && (
          <div style={gridGuideStyle} />
      )}

      {draggingIndex !== null &&
        dragPreview !== null && (
          <div
            style={{
              ...previewStyle,
              border:
                dragPreview.valid
                  ? "2px solid rgba(74,222,128,0.9)"
                  : "2px solid rgba(248,113,113,0.9)",
              background:
                dragPreview.valid
                  ? "rgba(74,222,128,0.12)"
                  : "rgba(248,113,113,0.12)",
              gridColumn: `${
                dragPreview.x + 1
              } / span ${
                widgets[draggingIndex].w
              }`,
              gridRow: `${
                dragPreview.y + 1
              } / span ${
                widgets[draggingIndex].h
              }`
            }}
          />
        )}

      {resizeState && (
        <div
          style={{
            ...previewStyle,
            border: resizeState.valid
              ? "2px solid rgba(74,222,128,0.9)"
              : "2px solid rgba(248,113,113,0.9)",
            background: resizeState.valid
              ? "rgba(74,222,128,0.12)"
              : "rgba(248,113,113,0.12)",
            gridColumn: `${
              resizeState.preview.x + 1
            } / span ${
              resizeState.preview.w
            }`,
            gridRow: `${
              resizeState.preview.y + 1
            } / span ${
              resizeState.preview.h
            }`
          }}
        />
      )}

      {widgets.map((widget, index) => {
        const Widget =
          widgetRegistry[
            widget.widgetType
          ];

        return (
          <div
            key={widget.instanceId}
            draggable={resizeState === null}
            onDragStart={() => {
              setDraggingIndex(index);
            }}
            onDragEnd={() => {
              setDraggingIndex(null);
              setDragPreview(null);
            }}
            style={{
              ...panelStyle,
              opacity:
                draggingIndex === index
                  ? 0.35
                  : 1,
              transform:
                draggingIndex === index
                  ? "scale(1.03)"
                  : "scale(1)",
              gridColumn: `${
                widget.x + 1
              } / span ${widget.w}`,
              gridRow: `${
                widget.y + 1
              } / span ${widget.h}`
            }}
            onContextMenu={(e) => {
              e.preventDefault();

              setSelectedIndex(index);
              setMenuOpen(true);
            }}
          >
            <Widget />

            <ResizeHandle
              direction="n"
              onMouseDown={(e) =>
                startResize(e, index, "n")
              }
            />

            <ResizeHandle
              direction="s"
              onMouseDown={(e) =>
                startResize(e, index, "s")
              }
            />

            <ResizeHandle
              direction="e"
              onMouseDown={(e) =>
                startResize(e, index, "e")
              }
            />

            <ResizeHandle
              direction="w"
              onMouseDown={(e) =>
                startResize(e, index, "w")
              }
            />

            <ResizeHandle
              direction="ne"
              onMouseDown={(e) =>
                startResize(e, index, "ne")
              }
            />

            <ResizeHandle
              direction="nw"
              onMouseDown={(e) =>
                startResize(e, index, "nw")
              }
            />

            <ResizeHandle
              direction="se"
              onMouseDown={(e) =>
                startResize(e, index, "se")
              }
            />

            <ResizeHandle
              direction="sw"
              onMouseDown={(e) =>
                startResize(e, index, "sw")
              }
            />
          </div>
        );
      })}

      {menuOpen && (
        <div
          style={overlayStyle}
          onClick={() => {
            setMenuOpen(false);
          }}
        >
          <div
            style={menuStyle}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Widget選択♡
            </h3>

            <div style={menuGridStyle}>
              {widgetOptions.map((widget) => (
                <button
                  key={widget.id}
                  style={menuButtonStyle}
                  onClick={() => {
                    changeWidget(widget.id);
                  }}
                >
                  {widget.label}
                </button>
              ))}
            </div>

            <h3 style={{ marginTop: "22px" }}>
              サイズ♡
            </h3>

            <div style={menuGridStyle}>
              {sizeOptions.map((option) => (
                <button
                  key={option.label}
                  style={menuButtonStyle}
                  onClick={() => {
                    changeWidgetSize(
                      option.w,
                      option.h
                    );
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <h3 style={{ marginTop: "22px" }}>
              位置♡
            </h3>

            <div style={moveGridStyle}>
              <div />

              <button
                style={menuButtonStyle}
                onClick={() => {
                  moveWidget(0, -1);
                }}
              >
                ↑
              </button>

              <div />

              <button
                style={menuButtonStyle}
                onClick={() => {
                  moveWidget(-1, 0);
                }}
              >
                ←
              </button>

              <button
                style={menuButtonStyle}
                onClick={() => {
                  moveWidget(0, 1);
                }}
              >
                ↓
              </button>

              <button
                style={menuButtonStyle}
                onClick={() => {
                  moveWidget(1, 0);
                }}
              >
                →
              </button>
            </div>

            <h3 style={{ marginTop: "22px" }}>
              Widget管理♡
            </h3>

            <div style={menuGridStyle}>
              <button
                style={menuButtonStyle}
                onClick={addWidget}
              >
                ＋ Widget追加
              </button>

              <button
                style={{
                  ...menuButtonStyle,
                  border:
                    "1px solid #7f1d1d",
                  color: "#fca5a5"
                }}
                onClick={deleteWidget}
              >
                🗑 Widget削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ResizeHandleProps = {
  direction: ResizeDirection;
  onMouseDown: (
    e: MouseEvent<HTMLDivElement>
  ) => void;
};

function ResizeHandle({
  direction,
  onMouseDown
}: ResizeHandleProps) {
  const [hover, setHover] =
    useState(false);

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => {
        setHover(true);
      }}
      onMouseLeave={() => {
        setHover(false);
      }}
      style={getResizeHandleStyle(direction)}
    >
      {hover && (
        <div style={handleDotStyle} />
      )}
    </div>
  );
}

function getResizeHandleStyle(
  direction: ResizeDirection
) {
  const base = {
    position: "absolute" as const,
    zIndex: 5,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  };

  if (direction === "n") {
    return {
      ...base,
      top: "-8px",
      left: "24px",
      right: "24px",
      height: "16px",
      cursor: "ns-resize"
    };
  }

  if (direction === "s") {
    return {
      ...base,
      bottom: "-8px",
      left: "24px",
      right: "24px",
      height: "16px",
      cursor: "ns-resize"
    };
  }

  if (direction === "e") {
    return {
      ...base,
      top: "24px",
      right: "-8px",
      bottom: "24px",
      width: "16px",
      cursor: "ew-resize"
    };
  }

  if (direction === "w") {
    return {
      ...base,
      top: "24px",
      left: "-8px",
      bottom: "24px",
      width: "16px",
      cursor: "ew-resize"
    };
  }

  if (direction === "ne") {
    return {
      ...base,
      top: "-10px",
      right: "-10px",
      width: "24px",
      height: "24px",
      cursor: "nesw-resize"
    };
  }

  if (direction === "nw") {
    return {
      ...base,
      top: "-10px",
      left: "-10px",
      width: "24px",
      height: "24px",
      cursor: "nwse-resize"
    };
  }

  if (direction === "se") {
    return {
      ...base,
      right: "-10px",
      bottom: "-10px",
      width: "24px",
      height: "24px",
      cursor: "nwse-resize"
    };
  }

  return {
    ...base,
    left: "-10px",
    bottom: "-10px",
    width: "24px",
    height: "24px",
    cursor: "nesw-resize"
  };
}

const homeStyle = {
  width: "min(1400px, 95vw)",
  height: "min(900px, 90vh)",
  display: "grid",
  gridTemplateColumns:
    "repeat(8, minmax(0, 1fr))",
  gridTemplateRows:
    "repeat(8, minmax(0, 1fr))",
  gap: "12px",
  padding: "4px",
  boxSizing: "border-box" as const,
  overflow: "hidden",
  position: "relative" as const
};

const gridGuideStyle = {
  gridColumn: "1 / -1",
  gridRow: "1 / -1",
  pointerEvents: "none" as const,
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
  backgroundSize:
    "calc(100% / 8) calc(100% / 8)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  zIndex: 0
};

const panelStyle = {
  position: "relative" as const,
  border: "1px solid #27272a",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(10px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "clamp(1rem, 2vw, 2rem)",
  overflow: "visible",
  transition:
    "transform 0.2s ease, opacity 0.2s ease",
  zIndex: 2,
  cursor: "grab"
};

const previewStyle = {
  borderRadius: "20px",
  pointerEvents: "none" as const,
  zIndex: 1,
  boxSizing: "border-box" as const
};

const handleDotStyle = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background:
    "rgba(255,255,255,0.9)",
  boxShadow:
    "0 0 10px rgba(255,255,255,0.8), 0 0 18px rgba(74,222,128,0.55)",
  opacity: 0.75,
  pointerEvents: "none" as const
};

const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  backdropFilter: "blur(3px)",
  zIndex: 999
};

const menuStyle = {
  position: "fixed" as const,
  top: "50%",
  left: "50%",
  transform:
    "translate(-50%, -50%)",
  width: "min(90vw, 360px)",
  maxHeight: "80vh",
  overflowY: "auto" as const,
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "16px",
  padding: "20px",
  boxSizing: "border-box" as const,
  zIndex: 1000
};

const menuGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px"
};

const moveGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px"
};

const menuButtonStyle = {
  width: "100%",
  minHeight: "58px",
  padding: "12px",
  background:
    "rgba(255,255,255,0.05)",
  border: "1px solid #3f3f46",
  borderRadius: "10px",
  color: "white",
  cursor: "pointer",
  fontSize:
    "clamp(0.8rem, 2vw, 1rem)",
  fontWeight: "bold",
  transition: "0.2s"
};