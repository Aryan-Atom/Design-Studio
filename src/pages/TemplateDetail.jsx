import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTemplateBySlug } from "../utils/templates";
import TemplatePreview from "../components/TemplatePreview";

const TemplateDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const template = getTemplateBySlug(slug);

  if (!template) {
    return <div className="p-6">Template not found.</div>;
  }

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {template.name}
        </h1>
        <button
          onClick={() => navigate(`/configure/${template.slug}`)}
          className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Configure Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <TemplatePreview data={template.json} width={720} height={400} />
        </div>
        <div>
          <h2 className="text-lg font-medium text-slate-800">Description</h2>
          <p className="text-slate-700 mt-2 leading-relaxed">
            {template.description}
          </p>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">
              JSON Structure
            </h3>
            <pre className="mt-2 bg-slate-50 p-3 rounded border border-slate-200 overflow-auto text-xs">
              {JSON.stringify(template.json, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetail;
