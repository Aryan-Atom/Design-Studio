import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * TopNavDock – simplified Dock component inspired by reactbits.dev
 * Props:
 * - items: Array<{ icon: ReactNode, label: string, onClick: () => void, className?: string }>
 * - className?: string
 * - distance?: number (mouse proximity effect)
 * - panelHeight?: number
 * - baseItemSize?: number
 * - magnification?: number
 */
const TopNavDock = ({
  items = [],
  className = "",
  distance = 200,
  panelHeight = 68,
  baseItemSize = 42,
  magnification = 68,
}) => {
  const containerRef = useRef(null);
  const [mouseX, setMouseX] = useState(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  };

  const handleMouseLeave = () => setMouseX(null);

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <div
        ref={containerRef}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center"
        style={{ height: panelHeight }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="rounded-full bg-white/80 backdrop-blur border border-slate-200 shadow-sm px-3 py-2 mt-2">
          <div className="flex items-end gap-3">
            {items.map((item, idx) => {
              let size = baseItemSize;
              if (mouseX != null && containerRef.current) {
                const itemEl = containerRef.current.querySelector(
                  `#dock-item-${idx}`
                );
                if (itemEl) {
                  const rect = itemEl.getBoundingClientRect();
                  const centerX =
                    rect.left +
                    rect.width / 2 -
                    containerRef.current.getBoundingClientRect().left;
                  const d = Math.abs(centerX - mouseX);
                  const influence = Math.max(0, distance - d) / distance;
                  size =
                    baseItemSize + influence * (magnification - baseItemSize);
                }
              }
              return (
                <motion.button
                  id={`dock-item-${idx}`}
                  key={idx}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center text-slate-700 hover:text-slate-900 transition-colors ${
                    item.className || ""
                  }`}
                  style={{ width: size, height: size }}
                  whileHover={{ scale: 1.02 }}
                  transition={{
                    type: "spring",
                    mass: 0.1,
                    stiffness: 150,
                    damping: 12,
                  }}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    {item.icon}
                  </div>
                  <span className="text-[10px] leading-none mt-1">
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Spacer to push content below dock */}
      <div style={{ height: panelHeight + 8 }} />
    </div>
  );
};

export default TopNavDock;
