import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import axios from "@/utils/axios";
import { toast } from "sonner";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState({
    email: "Loading...",
    role: "Administrator",
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/admin-profile`);
      if (response.data.Status === "Success") {
        setUserProfile(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Use default values if fetch fails
    }
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/adminlogout`);
      if (response.data.Status === "Success") {
        toast.success("Logged out successfully");
        navigate("/auth/adminlogin");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const getInitials = (email) => {
    if (!email || email === "Loading...") return "AD";
    return email.substring(0, 2).toUpperCase();
  };

  const getSectionTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "Dashboard";
    if (path.startsWith("/products")) return "Products";
    if (path.startsWith("/sales")) return "Sales";
    if (path.startsWith("/purchases")) return "Purchases";
    if (path.startsWith("/suppliers")) return "Suppliers";
    if (path.startsWith("/settings")) return "Settings";

    // Fallback: capitalize the first word of the route
    const segments = path.split("/").filter(Boolean);
    if (segments.length > 0) {
      return segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
    }
    return "Dashboard";
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger />

        {/* Section Title */}
        <h1 className="text-xl font-semibold tracking-tight hidden sm:block">
          {getSectionTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none">
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImage src="" alt="Admin" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(userProfile.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold">{userProfile.email}</p>
                <p className="text-xs text-muted-foreground">
                  {userProfile.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userProfile.role}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userProfile.email}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/settings/account")}>
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>System Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
