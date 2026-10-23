import React from "react";
import ReactDOM from "react-dom/client";
import DiceChessApp from "./DiceChessApp.jsx";
import "../index.css";
import "./dicechess.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DiceChessApp />
  </React.StrictMode>
);
