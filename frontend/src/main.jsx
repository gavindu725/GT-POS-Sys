import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import "./utils/axios";
import "./index.css";
import "./i18n/i18n"; // Initialize i18n

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <PreferencesProvider>
      <ThemeProvider defaultTheme="light">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </PreferencesProvider>
  </React.StrictMode>
);
