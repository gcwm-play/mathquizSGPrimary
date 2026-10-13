import React from "react";
import ReactDOM from "react-dom/client";
import MayorApp from "./MayorApp.jsx";
import "../index.css";
import "../city/city.css";
import "./mayor.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MayorApp />
  </React.StrictMode>
);
