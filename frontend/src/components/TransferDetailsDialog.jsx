import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MapPin,
  FileText,
  Database,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";

export default function TransferDetailsDialog({ open, transfer, onClose }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!transfer) return null;

  const handleApprove = async () => {
    setLoading(true);
    setActionType("approve");
    try {
      await axios.put(
        `${API_URL}/api/transfer/requests/${transfer.id}/approve`,
      );
      toast.success(
        t("transfer.approveSuccess") || "Transfer approved successfully",
      );
      handleClose(true);
    } catch (error) {
      console.error("Error approving transfer:", error);
      toast.error(
        error.response?.data?.message ||
          t("transfer.approveError") ||
          "Failed to approve transfer",
      );
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setActionType("complete");
    try {
      await axios.put(
        `${API_URL}/api/transfer/requests/${transfer.id}/complete`,
      );
      toast.success(
        t("transfer.completeSuccess") || "Transfer completed successfully",
      );
      handleClose(true);
    } catch (error) {
      console.error("Error completing transfer:", error);
      toast.error(
        error.response?.data?.message ||
          t("transfer.completeError") ||
          "Failed to complete transfer",
      );
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setActionType("cancel");
    try {
      await axios.put(`${API_URL}/api/transfer/requests/${transfer.id}/cancel`);
      toast.success(
        t("transfer.cancelSuccess") || "Transfer cancelled successfully",
      );
      handleClose(true);
    } catch (error) {
      console.error("Error cancelling transfer:", error);
      toast.error(
        error.response?.data?.message ||
          t("transfer.cancelError") ||
          "Failed to cancel transfer",
      );
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    setActionType("backup");
    try {
      // Use fetch with blob response type for file download
      const response = await fetch(
        `${API_URL}/api/transfer/requests/${transfer.id}/backup`,
        { method: "POST" },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Backup failed");
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = `employee_backup_${transfer.id}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) fileName = match[1];
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        t("transfer.backupSuccess") ||
          "Data backed up and downloaded successfully",
      );
      handleClose(true);
    } catch (error) {
      console.error("Error backing up data:", error);
      toast.error(
        error.message || t("transfer.backupError") || "Failed to backup data",
      );
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleDelete = async () => {
    if (!transfer.is_data_backed_up) {
      toast.error(
        t("transfer.backupRequired") || "Backup required before deletion",
      );
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    setActionType("delete");
    try {
      await axios.delete(
        `${API_URL}/api/transfer/requests/${transfer.id}/data`,
      );
      toast.success(
        t("transfer.deleteSuccess") || "Employee data marked for deletion",
      );
      setShowDeleteConfirm(false);
      handleClose(true);
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error(
        error.response?.data?.message ||
          t("transfer.deleteError") ||
          "Failed to delete data",
      );
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleClose = (refresh = false) => {
    setShowDeleteConfirm(false);
    onClose(refresh);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "default", icon: Calendar, color: "text-yellow-600" },
      approved: {
        variant: "secondary",
        icon: CheckCircle,
        color: "text-blue-600",
      },
      completed: {
        variant: "success",
        icon: CheckCircle,
        color: "text-green-600",
      },
      cancelled: {
        variant: "destructive",
        icon: XCircle,
        color: "text-red-600",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {t(
          `transfer.status${status.charAt(0).toUpperCase() + status.slice(1)}`,
        )}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    return (
      <Badge variant={type === "regular" ? "outline" : "default"}>
        {t(`transfer.${type}`)}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ArrowRightLeft className="h-6 w-6" />
              {t("transfer.details")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Employee Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {transfer.photo_url ? (
                    <img
                      src={transfer.photo_url}
                      alt={transfer.employee_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">
                      {transfer.employee_name}
                    </h3>
                    <p className="text-muted-foreground">
                      {transfer.employee_nic}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transfer.job_role_name}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(transfer.transfer_status)}
                    {getTypeBadge(transfer.transfer_type)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transfer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{t("transfer.toLocation")}</span>
                </div>
                <p className="font-medium">{transfer.to_location}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{t("transfer.transferDate")}</span>
                </div>
                <p className="font-medium">
                  {new Date(transfer.transfer_date).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{t("transfer.createdAt")}</span>
                </div>
                <p className="font-medium">
                  {new Date(transfer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Separator />

            {/* Timeline */}
            {transfer.transfer_status !== "pending" && (
              <>
                <div className="space-y-4">
                  <h4 className="font-semibold">{t("transfer.timeline")}</h4>

                  {transfer.approval_date && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium">{t("transfer.approved")}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transfer.approval_date).toLocaleString()}
                        </p>
                        {transfer.approved_by && (
                          <p className="text-sm text-muted-foreground">
                            {t("transfer.by")}: {transfer.approved_by}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {transfer.transfer_status === "completed" && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">{t("transfer.completed")}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transfer.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Additional Info */}
            {transfer.reason && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t("transfer.reason")}
                  </span>
                </div>
                <p className="text-sm p-3 bg-muted rounded-lg">
                  {transfer.reason}
                </p>
              </div>
            )}

            {transfer.requested_by && (
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t("transfer.requestedBy")}
                </span>
                <p className="text-sm">{transfer.requested_by}</p>
              </div>
            )}

            {transfer.remarks && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t("transfer.remarks")}
                  </span>
                </div>
                <p className="text-sm p-3 bg-muted rounded-lg">
                  {transfer.remarks}
                </p>
              </div>
            )}

            {/* Backup Status */}
            {transfer.is_data_backed_up && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    {t("transfer.dataBackedUp")}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-200">
                    {new Date(transfer.backup_date).toLocaleString()}
                  </p>
                  {transfer.backup_file_path && (
                    <p className="text-xs text-green-600 dark:text-green-300 font-mono mt-1">
                      {transfer.backup_file_path}
                    </p>
                  )}
                </div>
              </div>
            )}

            {transfer.is_deleted && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">
                    {t("transfer.dataDeleted")}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-200">
                    {new Date(transfer.deleted_date).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose()}
              disabled={loading}
            >
              {t("common.close")}
            </Button>

            {/* Action Buttons */}
            {transfer.transfer_status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {loading && actionType === "cancel" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("transfer.cancel")}
                </Button>
                <Button onClick={handleApprove} disabled={loading}>
                  {loading && actionType === "approve" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("transfer.approve")}
                </Button>
              </>
            )}

            {transfer.transfer_status === "approved" && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {loading && actionType === "cancel" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("transfer.cancel")}
                </Button>
                <Button onClick={handleComplete} disabled={loading}>
                  {loading && actionType === "complete" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("transfer.complete")}
                </Button>
              </>
            )}

            {transfer.transfer_status === "completed" &&
              !transfer.is_deleted && (
                <>
                  {!transfer.is_data_backed_up && (
                    <Button
                      variant="outline"
                      onClick={handleBackup}
                      disabled={loading}
                    >
                      {loading && actionType === "backup" && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Database className="mr-2 h-4 w-4" />
                      {t("transfer.backup")}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={loading || !transfer.is_data_backed_up}
                  >
                    {loading && actionType === "delete" && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("transfer.delete")}
                  </Button>
                </>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("transfer.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("transfer.deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("transfer.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
