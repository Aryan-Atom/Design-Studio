import React from "react";
import { useLocation } from "react-router-dom";
import DesignStudio from "../components/DesignStudio";

// Simple route wrapper to open the existing DesignStudio
const StudioRoute = () => {
  const location = useLocation();
  const initialData = location.state?.initialData || null;
  return (
    <div className="px-0 py-0">
      <DesignStudio initialData={initialData} />
    </div>
  );
};

export default StudioRoute;
