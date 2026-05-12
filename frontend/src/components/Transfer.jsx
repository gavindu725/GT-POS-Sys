import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  ArrowRightLeft,
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Database,
  Trash2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import TransferRequestDialog from "./TransferRequestDialog";
import TransferDetailsDialog from "./TransferDetailsDialog";

export default function Transfer() {
  const { t } = useTranslation();
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    regular: 0,
    pleasant: 0,
  });
  const [requestDialog, setRequestDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    transfer: null,
  });

  useEffect(() => {
    fetchTransfers();
    fetchStatistics();
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, filterStatus, filterType]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/transfer/requests`);
      if (response.data.success) {
        setTransfers(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      toast.error(t("transfer.fetchError") || "Failed to fetch transfers");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/transfer/statistics`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const filterTransfers = () => {
    let filtered = [...transfers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.employee_name?.toLowerCase().includes(term) ||
          t.employee_nic?.toLowerCase().includes(term) ||
          t.from_location?.toLowerCase().includes(term) ||
          t.to_location?.toLowerCase().includes(term),
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.transfer_status === filterStatus);
    }

    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.transfer_type === filterType);
    }

    setFilteredTransfers(filtered);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "default", icon: Calendar },
      approved: { variant: "secondary", icon: CheckCircle },
      completed: { variant: "success", icon: CheckCircle },
      cancelled: { variant: "destructive", icon: XCircle },
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

  const handleViewDetails = (transfer) => {
    setDetailsDialog({ open: true, transfer });
  };

  const handleRequestClose = (refresh) => {
    setRequestDialog(false);
    if (refresh) {
      fetchTransfers();
      fetchStatistics();
    }
  };

  const handleDetailsClose = (refresh) => {
    setDetailsDialog({ open: false, transfer: null });
    if (refresh) {
      fetchTransfers();
      fetchStatistics();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t("transfer.title")}</h1>
          <p className="text-muted-foreground">{t("transfer.subtitle")}</p>
        </div>
        <Button onClick={() => setRequestDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("transfer.newTransfer")}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("transfer.totalTransfers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("transfer.statusPending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("transfer.statusApproved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.approved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("transfer.statusCompleted")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("transfer.regular")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.regular}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("transfer.pleasant")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pleasant}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("transfer.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("transfer.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="pending">
                  {t("transfer.statusPending")}
                </SelectItem>
                <SelectItem value="approved">
                  {t("transfer.statusApproved")}
                </SelectItem>
                <SelectItem value="completed">
                  {t("transfer.statusCompleted")}
                </SelectItem>
                <SelectItem value="cancelled">
                  {t("transfer.statusCancelled")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("transfer.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="regular">{t("transfer.regular")}</SelectItem>
                <SelectItem value="pleasant">
                  {t("transfer.pleasant")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t("transfer.noTransfers")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("transfer.employee")}</TableHead>
                  <TableHead>{t("transfer.type")}</TableHead>
                  <TableHead>{t("transfer.fromLocation")}</TableHead>
                  <TableHead>{t("transfer.toLocation")}</TableHead>
                  <TableHead>{t("transfer.transferDate")}</TableHead>
                  <TableHead>{t("transfer.status")}</TableHead>
                  <TableHead className="text-right">
                    {t("common.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {transfer.photo_url ? (
                          <img
                            src={transfer.photo_url}
                            alt={transfer.employee_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {transfer.employee_name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {transfer.employee_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {transfer.employee_nic}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(transfer.transfer_type)}
                    </TableCell>
                    <TableCell>{transfer.from_location || "-"}</TableCell>
                    <TableCell>{transfer.to_location}</TableCell>
                    <TableCell>
                      {new Date(transfer.transfer_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transfer.transfer_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(transfer)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("common.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TransferRequestDialog
        open={requestDialog}
        onClose={handleRequestClose}
      />

      <TransferDetailsDialog
        open={detailsDialog.open}
        transfer={detailsDialog.transfer}
        onClose={handleDetailsClose}
      />
    </div>
  );
}
