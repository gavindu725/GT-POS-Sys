import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import PageLayout from "./pages/DashboardLayout";
import { Toaster } from "sonner";
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import Suppliers from "./components/Suppliers";
import Purchases from "./components/Purchases";
import SalesPage from "./components/SalesPage";
import SettingsRouter from "./components/settings/SettingsRouter";
import { AccessibilityWidget } from "./components/AccessibilityWidget";

function App() {
  return (
    <>
      <Routes>
        <Route path="auth/register" element={<Register />} />
        <Route path="auth/adminlogin" element={<Login />} />

        <Route path="/" element={<PageLayout />}>
          <Route index element={<Navigate to="auth/adminlogin" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="settings/*" element={<SettingsRouter />} />
        </Route>
      </Routes>

      <AccessibilityWidget />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
