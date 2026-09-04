import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./hud.css";
import "./hero.css";
import "./teardown.css";
import "./skills-keyboard.css";
import "./selected-work.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
