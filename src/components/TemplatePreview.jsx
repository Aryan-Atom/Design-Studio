import React from "react";

// Simple preview renderer: renders rectangles and text in a scaled container
// Props: { data: { elements: [] }, width?: number, height?: number }
const TemplatePreview = ({ data, width = 600, height = 340 }) => {
  if (!data || !data.elements) return null;

  // Find design bounds from the first background element or default
  const bg = data.elements.find(
    (el) =>
      el.type === "rectangle" && el.name?.toLowerCase().includes("background")
  ) || { width: 1920, height: 1080 };
  const scaleX = width / (bg.width || 1920);
  const scaleY = height / (bg.height || 1080);

  return (
    <div
      className="relative border border-slate-200 rounded-lg overflow-hidden bg-white"
      style={{ width, height }}
    >
      {data.elements.map((el) => {
        const style = {
          position: "absolute",
          left: (el.x || 0) * scaleX,
          top: (el.y || 0) * scaleY,
          width: (el.width || 0) * scaleX,
          height: (el.height || 0) * scaleY,
          opacity: el.opacity ?? 1,
          borderRadius: (el.borderRadius || 0) * Math.max(scaleX, scaleY),
        };

        if (el.type === "rectangle") {
          const isGradient =
            typeof el.fill === "string" &&
            el.fill.startsWith("linear-gradient");
          return (
            <div
              key={el.id}
              style={style}
              className="border"
              {...(isGradient
                ? { style: { ...style, backgroundImage: el.fill } }
                : { style: { ...style, background: el.fill } })}
            />
          );
        }
        if (el.type === "text") {
          const fontSize = (el.fontSize || 16) * Math.min(scaleX, scaleY);
          return (
            <div
              key={el.id}
              style={{
                ...style,
                border: "none",
                color: el.textColor || "#111827",
                fontSize,
                lineHeight: 1.2,
              }}
            >
              {el.text}
            </div>
          );
        }
        if (el.type === "image") {
          return (
            <img
              key={el.id}
              src={el.src}
              alt={el.name || "Image"}
              style={{
                ...style,
                border: "none",
                objectFit: "cover",
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default TemplatePreview;
