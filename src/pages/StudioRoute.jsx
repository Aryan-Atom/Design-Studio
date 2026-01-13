import React from "react";
import DesignStudio from "../components/DesignStudio";

// Simple route wrapper to open the existing DesignStudio
const StudioRoute = () => {
  return (
    <div className="px-0 py-0">
      <DesignStudio />
    </div>
  );
};

export default StudioRoute;
