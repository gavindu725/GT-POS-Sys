import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { User, Settings, LogOut, Search, Loader2 } from "lucide-react";
import axios from "@/utils/axios";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

function Header() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState({
    email: "Loading...",
    role: "Administrator",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    // Handle click outside to close search results
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(
          `${API_URL}/auth/search?query=${encodeURIComponent(searchQuery)}`,
        );
        if (response.data.success) {
          setSearchResults(response.data.data);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

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

  const handleEmployeeClick = (employeeId) => {
    setSearchQuery("");
    setShowResults(false);
    setSearchResults([]);
    navigate("/employee");
  };

  const getStatusBadge = (status) => {
    if (status === "P") return "Permanent";
    if (status === "T") return "Training";
    return "Contract";
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger />

        {/* Global Search */}
        <div ref={searchRef} className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
          <Input
            placeholder="Search..."
            className="pl-10 pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1">
                  {searchResults.length}{" "}
                  {searchResults.length === 1 ? "result" : "results"}
                </p>
                {searchResults.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => handleEmployeeClick(employee.id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-md transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={employee.photo}
                        alt={employee.name_with_init}
                      />
                      <AvatarFallback>
                        {employee.name_with_init?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {employee.name_with_init}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {employee.nic} • {employee.job_role_name || "No Role"}{" "}
                        {employee.class_code ? `(${employee.class_code})` : ""}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {getStatusBadge(employee.permanent_status)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results Message */}
          {showResults &&
            searchQuery.length >= 2 &&
            searchResults.length === 0 &&
            !isSearching && (
              <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg p-4 z-50">
                <p className="text-sm text-muted-foreground text-center">
                  No employees found for "{searchQuery}"
                </p>
              </div>
            )}
        </div>
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
