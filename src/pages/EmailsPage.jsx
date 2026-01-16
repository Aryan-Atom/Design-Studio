import React from "react";
import { emailTemplates } from "../utils/emailTemplates";
import TemplatePreview from "../components/TemplatePreview";
import { useNavigate } from "react-router-dom";

const EmailsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="px-6 py-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">
        Email Templates
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {emailTemplates.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
          >
            <TemplatePreview data={t.json} width={360} height={300} />
            <div className="mt-4">
              <h2 className="text-lg font-medium text-slate-800">{t.name}</h2>
              <p className="text-sm text-slate-600 mt-1">{t.description}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigate(`/configure-email/${t.slug}`)}
                  className="px-3 py-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-900"
                >
                  Configure
                </button>
                <button
                  onClick={() =>
                    navigate("/studio/new", { state: { initialData: t.json } })
                  }
                  className="px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Open in Studio
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailsPage;
