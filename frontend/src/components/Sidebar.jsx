import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  ReceiptText,
  Truck,
  Zap,
} from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "@/lib/api";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: ReceiptText, label: "Sales", href: "/sales" },
  { icon: ShoppingCart, label: "Purchases", href: "/purchases" },
  { icon: Truck, label: "Suppliers", href: "/suppliers" },
];

function Sidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [systemSettings, setSystemSettings] = useState({
    system_name: "GT Electricals",
    system_logo_url: null,
  });

  useEffect(() => {
    axios
      .get(`${API_URL}/settings/system`, { withCredentials: true })
      .then((r) => {
        if (r.data.success) setSystemSettings(r.data.data);
      })
      .catch(() => {});
  }, []);

  const handleMenuClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:justify-center"
            >
              {systemSettings.system_logo_url ? (
                <img
                  src={systemSettings.system_logo_url}
                  alt="Logo"
                  className="shrink-0 w-10 h-10 object-contain"
                />
              ) : (
                <Zap className="shrink-0 w-10 h-10" />
              )}
              <span
                className="text-xl font-extrabold tracking-wide group-data-[collapsible=icon]:hidden uppercase"
                style={{
                  fontFamily:
                    '"Bank Gothic", "Agency FB", "Impact", sans-serif',
                  letterSpacing: "0.1em",
                }}
              >
                {systemSettings.system_name || "GT POS"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={location.pathname === item.href}
                    className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:justify-center"
                  >
                    <Link to={item.href} onClick={handleMenuClick}>
                      <item.icon className="shrink-0 w-5 h-5" />
                      <span className="text-base group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={location.pathname.startsWith("/settings")}
              className="data-[active=true]:bg-black data-[active=true]:text-white group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/settings" onClick={handleMenuClick}>
                <Settings className="shrink-0 w-5 h-5" />
                <span className="text-base group-data-[collapsible=icon]:hidden">
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}

export default Sidebar;
