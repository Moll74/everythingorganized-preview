import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import { Cursor } from "./components/Cursor";
import { Page } from "./components/Page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
    <Cursor />
  </StrictMode>,
);
