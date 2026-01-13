import React from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import TopNavDock from "./components/TopNavDock";
import Portfolio from "./pages/Portfolio";
import TemplateDetail from "./pages/TemplateDetail";
import Configurator from "./pages/Configurator";
import ComponentsPage from "./pages/ComponentsPage";
import ConfigComponent from "./pages/ConfigComponent";
import EmailsPage from "./pages/EmailsPage";
import ConfigEmail from "./pages/ConfigEmail";
import GuidelinesPage from "./pages/GuidelinesPage";
import StudioRoute from "./pages/StudioRoute";
import { Briefcase, Boxes, BookOpenText, Mail } from "lucide-react";

const DockNav = () => {
  const navigate = useNavigate();
  const items = [
    {
      icon: <Briefcase size={22} />,
      label: "Portfolio",
      onClick: () => navigate("/"),
    },
    {
      icon: <Boxes size={22} />,
      label: "Components",
      onClick: () => navigate("/components"),
    },
    {
      icon: <BookOpenText size={22} />,
      label: "Guidelines",
      onClick: () => navigate("/guidelines"),
    },
    {
      icon: <Mail size={22} />,
      label: "Emails",
      onClick: () => navigate("/emails"),
    },
  ];
  return <TopNavDock items={items} />;
};

const App = () => {
  return (
    <BrowserRouter>
      <DockNav />
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/portfolio/:slug" element={<TemplateDetail />} />
        <Route path="/configure/:slug" element={<Configurator />} />
        {/* component and email configurators could reuse Configurator if desired */}
        <Route path="/components" element={<ComponentsPage />} />
        <Route
          path="/configure-component/:slug"
          element={<ConfigComponent />}
        />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/configure-email/:slug" element={<ConfigEmail />} />
        <Route path="/guidelines" element={<GuidelinesPage />} />
        <Route path="/studio/new" element={<StudioRoute />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
