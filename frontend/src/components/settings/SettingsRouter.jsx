import { Routes, Route, Navigate } from "react-router-dom";
import SettingsHub from "./SettingsHub";
import Settings from "../Settings";
import AccountSettings from "./AccountSettings";
import PreferencesSettings from "./PreferencesSettings";
import ProductSetup from "./ProductSetup";

export default function SettingsRouter() {
  return (
    <Routes>
      <Route index element={<SettingsHub />} />
      <Route path="system-configuration" element={<Settings />} />
      <Route path="product-setup" element={<ProductSetup />} />
      <Route path="account" element={<AccountSettings />} />
      <Route path="preferences" element={<PreferencesSettings />} />
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
}
