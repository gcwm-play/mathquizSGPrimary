import React from "react";
import ReactDOM from "react-dom/client";
import DiceGridApp from "./DiceGridApp.jsx";
import "../index.css";
import "./dicegrid.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DiceGridApp />
  </React.StrictMode>
);
