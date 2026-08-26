import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { VisualizerApp } from "./VisualizerApp";
import "./styles.css";
import "./extension.css";

const root = document.getElementById("root");
if (!root) throw new Error("DVS webview root was not created.");

createRoot(root).render(
  <StrictMode>
    <VisualizerApp />
  </StrictMode>,
);
