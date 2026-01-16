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
        <div className="flex gap-2">
          {/* <button
            onClick={() => navigate(`/configure/${template.slug}`)}
            className="px-4 py-2 rounded-full bg-slate-800 text-white hover:bg-slate-900"
          >
            Configure
          </button> */}
          <button
            onClick={() =>
              navigate("/studio/new", { state: { initialData: template.json } })
            }
            className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Open in Studio
          </button>
        </div>
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
            <h2 className="font-semibold text-slate-700 text-lg">
              Tech Stack and Current Project Using Template :
            </h2>
            {/* <pre className="mt-2 bg-slate-50 p-3 rounded border border-slate-200 overflow-auto text-xs">
              {JSON.stringify(template.json, null, 2)}
            </pre> */}
            <p className="text-slate-700 mt-2 leading-relaxed pr-20">
              Built using React JS with a modern, component-based architecture,
              this design has been implemented across multiple projects
              including ELM, Davinci, and IDP. It focuses on reusable and
              scalable UI components to ensure consistency across applications.
              The design supports responsive layouts for various screen sizes
              and delivers a clean, intuitive user experience. It is optimized
              for performance, maintainability, and seamless integration with
              backend APIs while following best practices in React development
              and allowing for future scalability and enhancements.
              <br />
              <br />
              <br />
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Porro
              vero, deleniti fugiat dolores perferendis repellendus odio
              recusandae. Corporis quibusdam temporibus aperiam alias fuga ab,
              sed repellendus at nesciunt. Libero, id. A quaerat repellat
              assumenda ratione tenetur voluptatibus reprehenderit tempora omnis
              illo corporis quod placeat nisi non reiciendis, nostrum ab, animi
              doloremque dolorem distinctio quibusdam porro, ea autem
              recusandae! Sit, quisquam? Nesciunt illo, ratione rem debitis
              tempore quas placeat possimus mollitia nulla ea accusamus magnam
              vel voluptas iste eveniet voluptatibus numquam velit fugiat
              corporis deleniti impedit obcaecati delectus repellendus laborum.
              Accusantium. Voluptatum, magni quas fuga cupiditate quisquam
              nesciunt cum ea asperiores alias tempore animi voluptatem quam
              molestiae veniam sunt minus omnis. Cupiditate nemo cumque eligendi
              reprehenderit sequi ratione maxime eaque voluptates. Autem vitae
              itaque sit commodi praesentium nostrum optio, pariatur soluta
              officia repellendus natus omnis aliquid totam, iste asperiores
              veritatis voluptatem atque est minima consectetur accusantium
              provident neque voluptas iure? Fugit. Est quis molestias iste amet
              hic, repellat neque nihil dolore minima quidem omnis autem
              deserunt tempora architecto vitae ipsam maiores ipsa obcaecati
              perspiciatis voluptatem quaerat possimus blanditiis? Nisi,
              deleniti amet. Possimus alias blanditiis commodi ex, culpa quam
              eos molestiae. Quod aliquid excepturi nostrum hic quasi ullam
              natus deserunt, veritatis dolore repellat laborum mollitia
              recusandae soluta non in vero architecto eum! Doloribus autem
              obcaecati ipsam sed ab ratione commodi explicabo et aliquid eaque,
              corporis voluptates fugiat nisi cum numquam cumque accusamus
              nesciunt tenetur aspernatur eos facilis mollitia dolor deleniti
              ut. Iste. Nesciunt fugiat saepe quaerat ab doloremque maiores
              asperiores inventore quod minima nemo. Consequuntur illum sapiente
              et, atque odio perspiciatis perferendis illo ipsam architecto
              dolor necessitatibus natus. Temporibus beatae placeat aspernatur!
              Sequi nulla quia ad? Molestias nemo, recusandae quas corporis
              minus autem, ad voluptatem eveniet expedita reiciendis provident
              distinctio quaerat atque optio. Provident eum laborum non, quia ea
              earum excepturi pariatur?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetail;
