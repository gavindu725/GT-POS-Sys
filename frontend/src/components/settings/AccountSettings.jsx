import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Lock,
  Save,
  AlertTriangle,
  UserPlus,
  Users,
  Shield,
  ShieldOff,
  Trash2,
} from "lucide-react";
import axios from "@/utils/axios";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AccountSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  // Email change form
  const [emailForm, setEmailForm] = useState({
    currentEmail: "",
    newEmail: "",
    confirmEmail: "",
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // New admin account form
  const [newAdminForm, setNewAdminForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Admin list management
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [actionType, setActionType] = useState(""); // 'enable', 'disable', 'delete'

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);

  // Fetch current user profile and admin list
  useEffect(() => {
    fetchCurrentUser();
    fetchAdmins();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/admin-profile`);
      setCurrentUserEmail(response.data.email);

      // Fetch current user's ID from admin list
      const adminsResponse = await axios.get(`${API_URL}/auth/admins`);
      const currentAdmin = adminsResponse.data.admins?.find(
        (admin) => admin.email === response.data.email,
      );
      if (currentAdmin) {
        setCurrentUserId(currentAdmin.id);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/admins`);
      setAdmins(response.data.admins || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
      toast.error("Failed to fetch admin list");
    }
  };

  const handleAdminAction = async () => {
    if (!selectedAdmin) return;

    // Additional frontend validation to prevent self-modification
    if (selectedAdmin.id === currentUserId) {
      toast.error(
        actionType === "delete"
          ? "Cannot delete your own account"
          : "Cannot modify your own account status",
      );
      setShowActionDialog(false);
      return;
    }

    try {
      setLoading(true);

      if (actionType === "delete") {
        await axios.delete(`${API_URL}/auth/admins/${selectedAdmin.id}`);
        toast.success("Admin deleted successfully");
      } else {
        const newStatus = actionType === "enable" ? 1 : 0;
        await axios.put(`${API_URL}/auth/admins/${selectedAdmin.id}/status`, {
          is_active: newStatus,
        });
        toast.success(
          actionType === "enable"
            ? "Admin enabled successfully"
            : "Admin disabled successfully",
        );
      }

      // Refresh admin list
      await fetchAdmins();
      setShowActionDialog(false);
      setSelectedAdmin(null);
      setActionType("");
    } catch (error) {
      console.error("Error performing admin action:", error);
      const errorKey =
        actionType === "delete"
          ? "settings.account.adminList.errors.deleteFailed"
          : "settings.account.adminList.errors.toggleFailed";
      toast.error(error.response?.data?.Error || t(errorKey));
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (admin, action) => {
    // Double-check that it's not the current user
    if (admin.id === currentUserId) {
      toast.error("Cannot modify your own account");
      return;
    }

    setSelectedAdmin(admin);
    setActionType(action);
    setShowActionDialog(true);
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();

    if (emailForm.newEmail !== emailForm.confirmEmail) {
      toast.error("Emails do not match");
      return;
    }

    if (!emailForm.currentEmail || !emailForm.newEmail) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await axios.put(`${API_URL}/auth/update-email`, {
        currentEmail: emailForm.currentEmail,
        newEmail: emailForm.newEmail,
      });
      toast.success("Email updated successfully");
      setEmailForm({ currentEmail: "", newEmail: "", confirmEmail: "" });
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error(error.response?.data?.Error || "Failed to update email");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await axios.put(`${API_URL}/auth/update-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password updated successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(error.response?.data?.Error || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newAdminForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!newAdminForm.email || !newAdminForm.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/create-admin`, {
        email: newAdminForm.email,
        password: newAdminForm.password,
        confirmPassword: newAdminForm.confirmPassword,
      });
      toast.success("Admin account created successfully");
      setNewAdminForm({ email: "", password: "", confirmPassword: "" });
      setShowCreateDialog(false);

      // Refresh admin list
      await fetchAdmins();
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error(
        error.response?.data?.Error || "Failed to create admin account",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/settings")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground mt-1">
          Manage your admin account email and password
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Email Change Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <CardTitle>Email Address</CardTitle>
            </div>
            <CardDescription>Change your email address</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentEmail">Current Email *</Label>
                <Input
                  id="currentEmail"
                  type="email"
                  value={emailForm.currentEmail}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, currentEmail: e.target.value })
                  }
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email *</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={emailForm.newEmail}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, newEmail: e.target.value })
                  }
                  placeholder="newemail@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmEmail">Confirm Email *</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  value={emailForm.confirmEmail}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, confirmEmail: e.target.value })
                  }
                  placeholder="newemail@example.com"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Updating..." : "Update Email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <CardTitle>Password</CardTitle>
            </div>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters long
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone - Create New Admin Account */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </div>
            <CardDescription>Create new administrator accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-400 mb-1">
                    Caution
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-400/80">
                    Creating a new admin account grants full system access. Only
                    add trusted users.
                  </p>
                </div>
              </div>

              <AlertDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Admin Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Create New Admin Account
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        Are you sure? This will create a new administrator
                        account with full access.
                      </p>

                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="newAdminEmail">Email *</Label>
                          <Input
                            id="newAdminEmail"
                            type="email"
                            value={newAdminForm.email}
                            onChange={(e) =>
                              setNewAdminForm({
                                ...newAdminForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="admin@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newAdminPassword">Password *</Label>
                          <Input
                            id="newAdminPassword"
                            type="password"
                            value={newAdminForm.password}
                            onChange={(e) =>
                              setNewAdminForm({
                                ...newAdminForm,
                                password: e.target.value,
                              })
                            }
                            placeholder="••••••••"
                            minLength={6}
                          />
                          <p className="text-xs text-muted-foreground">
                            Must be at least 6 characters
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newAdminConfirmPassword">
                            Confirm Password *
                          </Label>
                          <Input
                            id="newAdminConfirmPassword"
                            type="password"
                            value={newAdminForm.confirmPassword}
                            onChange={(e) =>
                              setNewAdminForm({
                                ...newAdminForm,
                                confirmPassword: e.target.value,
                              })
                            }
                            placeholder="••••••••"
                            minLength={6}
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCreateAdmin}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {loading ? "Creating..." : "Create"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Admin List - Manage Existing Administrators */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <CardTitle>Administrators</CardTitle>
            </div>
            <CardDescription>Manage administrator accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {admins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No administrators found
                </p>
              ) : (
                admins.map((admin) => {
                  const isCurrentUser = admin.id === currentUserId;
                  const isActive = admin.is_active === 1;

                  return (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            {admin.email}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground font-normal">
                                (You)
                              </span>
                            )}
                          </p>
                          <Badge
                            variant={isActive ? "default" : "secondary"}
                            className={
                              isActive
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                            }
                          >
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created on{" "}
                          {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {!isCurrentUser && (
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(admin, "disable")}
                              className="text-orange-600 hover:text-orange-700 hover:border-orange-300"
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Disable
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openActionDialog(admin, "enable")}
                              className="text-green-600 hover:text-green-700 hover:border-green-300"
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Enable
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionDialog(admin, "delete")}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "delete"
                ? "Delete Admin"
                : actionType === "enable"
                  ? "Enable Admin"
                  : "Disable Admin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "delete"
                ? "Are you sure you want to delete this admin? This action cannot be undone."
                : actionType === "enable"
                  ? "Are you sure you want to enable this admin?"
                  : "Are you sure you want to disable this admin?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAdminAction}
              disabled={loading}
              className={
                actionType === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : actionType === "enable"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {loading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
