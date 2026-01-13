import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEmailTemplateBySlug } from "../utils/emailTemplates";
import TemplatePreview from "../components/TemplatePreview";

const ConfigEmail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const base = getEmailTemplateBySlug(slug);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(base?.json || { elements: [], comments: [] }, null, 2)
  );
  const [error, setError] = useState(null);

  let parsed = null;
  try {
    parsed = JSON.parse(jsonText);
    setError(null);
  } catch (e) {
    if (!error) setError("Invalid JSON");
  }

  const downloadJson = () => {
    try {
      const blob = new Blob([jsonText], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "email-template.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  };

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          Configure Email Template
        </h1>
        <div className="flex gap-2">
          <button
            onClick={downloadJson}
            className="px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Download JSON
          </button>
          <button
            onClick={() => navigate("/studio/new")}
            className="px-3 py-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-900"
          >
            Open Studio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Preview</h2>
          <div className="mt-2">
            {parsed ? (
              <TemplatePreview data={parsed} width={360} height={300} />
            ) : (
              <div className="p-6 border rounded bg-slate-50 text-slate-600">
                Fix JSON to see preview
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Tip: Download the JSON and import it in the Design Studio using the
            Import button.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-700">
            Email Template JSON
          </h2>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="mt-2 w-full h-[420px] font-mono text-xs p-3 border rounded"
          />
          {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default ConfigEmail;
