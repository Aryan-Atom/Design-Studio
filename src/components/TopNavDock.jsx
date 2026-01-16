import React from "react";
import { User } from "lucide-react";

/**
 * TopNavDock – Standard top navigation bar
 * Props:
 * - items: Array<{ label: string, onClick: () => void, className?: string }>
 * - className?: string
 * - panelHeight?: number
 */
const TopNavDock = ({ items = [], className = "", panelHeight = 64 }) => {
  return (
    <div className={`w-full ${className}`}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto px-6">
          <div className="h-16 grid grid-cols-3 items-center">
            {/* Left: Brand */}
            <div className="flex items-center">
              <span className="text-slate-900 font-semibold text-lg">
                SEM Design Studio
              </span>
            </div>

            {/* Center: Navigation options */}
            <div className="justify-self-center flex items-center gap-6">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className={`text-slate-700 hover:text-slate-900 font-medium transition-colors ${
                    item.className || ""
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right: User profile */}
            <div className="justify-self-end flex items-center">
              <button
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="User profile"
              >
                <User size={20} className="text-slate-700" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      {/* Spacer to push content below nav */}
      <div style={{ height: panelHeight }} />
    </div>
  );
};

export default TopNavDock;
