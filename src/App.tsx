import {
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from "react";

import {
  type ToolMode,
  type ShapeType,
  type DrawAPI,
  draw,
} from "./draw";

import {
  Pen,
  Eraser,
  Square,
  Circle,
  PenIcon,
  Slash,
  Undo2,
  Redo2,
  Download,
  Trash2,
} from "lucide-react";

const shapeTypes = [
  { type: "rect" as ShapeType, label: "Rectangle", icon: <Square size={18} /> },
  { type: "circle" as ShapeType, label: "Circle", icon: <Circle size={18} /> },
  { type: "line" as ShapeType, label: "Line", icon: <Slash size={18} /> },
];

const toolModes = [
  { tool: "draw" as ToolMode, label: "Draw", icon: <Pen size={18} /> },
  { tool: "erase" as ToolMode, label: "Erase", icon: <Eraser size={18} /> },
  { tool: "select" as ToolMode, label: "Select", icon: <PenIcon size={18} /> },
];

const COLORS = [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#00ffff",
  "#ff00ff",
  "#ffffff",
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<ToolMode>("draw");
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [color, setColor] = useState<string>(COLORS[0]);
  const drawApiRef = useRef<DrawAPI | null>(null);
  // const [, setRenderTick] = useState(0);

  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to fill parent container or window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50; // leave room for toolbar

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawApiRef.current = draw(ctx, canvas, tool, shapeType, color);
  }, [color, shapeType, tool]);

  // Reinitialize on tool, shapeType, or color change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawApiRef.current = draw(ctx, canvas, tool, shapeType, color);
  }, [tool, shapeType, color]);

  // To force redraw to update zoom scale display
  useEffect(() => {
    const interval = setInterval(() => {
      if (drawApiRef.current) {
        // We don't have direct scale from the API yet, so let's extend the API
        // Or we can call getScale if we added it (we did)
        const currentScale = (drawApiRef.current).getScale?.() ?? 1;
        setScale(currentScale);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const undo = () => drawApiRef.current?.undo();
  const redo = () => drawApiRef.current?.redo();
  const exportImage = () => drawApiRef.current?.exportToImage();
  const clear = () => drawApiRef.current?.clear();

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: 12,
          alignItems: "center",
          backgroundColor: "#222",
          color: "white",
          userSelect: "none",
          height: 50,
        }}
      >
        {/* Tool mode buttons */}
        {toolModes.map(({ tool: t, label, icon }) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            title={label}
            style={{
              backgroundColor: tool === t ? "#555" : "transparent",
              color: "white",
              border: "none",
              padding: "6px 12px",
              cursor: "pointer",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {icon}
          </button>
        ))}

        {/* Shape type buttons - only if tool is draw */}
        {tool === "draw" &&
          shapeTypes.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setShapeType(type)}
              title={label}
              style={{
                backgroundColor: shapeType === type ? "#555" : "transparent",
                color: "white",
                border: "none",
                padding: "6px 12px",
                cursor: "pointer",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {icon}
            </button>
          ))}

        {/* Color buttons - only if tool is draw */}
        {tool === "draw" &&
          COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={`Color ${c}`}
              style={{
                backgroundColor: c,
                border: c === color ? "2px solid white" : "1px solid #555",
                width: 24,
                height: 24,
                borderRadius: "50%",
                cursor: "pointer",
              }}
            />
          ))}

        {/* Undo / Redo */}
        <button
          onClick={undo}
          title="Undo"
          style={{
            marginLeft: "auto",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: "white",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={redo}
          title="Redo"
          style={{
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: "white",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Redo2 size={20} />
        </button>

        {/* Export */}
        <button
          onClick={exportImage}
          title="Export PNG"
          style={{
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: "white",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Download size={20} />
        </button>

        {/* Clear */}
        <button
          onClick={clear}
          title="Clear"
          style={{
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            color: "white",
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Trash2 size={20} />
        </button>

        {/* Zoom level display */}
        <div style={{ marginLeft: 12, fontSize: 14 }}>
          Zoom: {(scale * 100).toFixed(0)}%
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          backgroundColor: "black",
          cursor:
            tool === "draw"
              ? "crosshair"
              : tool === "erase"
              ? "not-allowed"
              : "default",
          width: "100vw",
          height: "calc(100vh - 50px)",
        }}
      />
    </>
  );
}
