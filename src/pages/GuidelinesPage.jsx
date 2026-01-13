import React from "react";
import { guidelines } from "../utils/guidelines";

const GuidelinesPage = () => {
  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Guidelines</h1>
      <div className="space-y-6">
        {guidelines.map((g, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
          >
            <h2 className="text-lg font-medium text-slate-800">{g.title}</h2>
            <p className="text-slate-700 mt-1 leading-relaxed">{g.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuidelinesPage;
