import React from "react";
import { uiComponents } from "../utils/components";
import TemplatePreview from "../components/TemplatePreview";
import { useNavigate } from "react-router-dom";

const ComponentsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Components</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {uiComponents.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
          >
            <TemplatePreview data={c.json} width={300} height={100} />
            <div className="mt-4">
              <h2 className="text-lg font-medium text-slate-800">{c.name}</h2>
              <p className="text-sm text-slate-600 mt-1">{c.description}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate(`/configure-component/${c.slug}`)}
                  className="px-3 py-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-900"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComponentsPage;
