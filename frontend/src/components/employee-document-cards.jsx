import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Pencil,
  Trash2,
  FileText,
  Eye,
  CheckCircle2,
  AlertCircle,
  Users,
  FileCheck,
  FileWarning,
} from "lucide-react";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { EmployeeDocumentsPrintDialog } from "./employee-documents-print-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useTranslation } from "react-i18next";

export function EmployeeDocumentCards({ data, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = data.length;
    const healthy = data.filter((emp) => emp.isFileHealthy).length;
    const unhealthy = total - healthy;
    return { total, healthy, unhealthy };
  }, [data]);

  const filteredData = data.filter((emp) => {
    const matchesSearch =
      emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNIC.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHealth =
      healthFilter === "all" ||
      (healthFilter === "healthy" && emp.isFileHealthy) ||
      (healthFilter === "unhealthy" && !emp.isFileHealthy);

    return matchesSearch && matchesHealth;
  });

  const getInitials = (name) => {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="relative overflow-hidden rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("additionalInfo.summary.totalEmployees")}
            </CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.stats.totalRecords")}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
        </Card>

        <Card className="relative overflow-hidden rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("additionalInfo.summary.healthyFiles")}
            </CardTitle>
            <div className="rounded-full bg-green-600/10 dark:bg-green-500/10 p-2">
              <FileCheck className="h-4 w-4 text-green-600 dark:text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-500">
              {summary.healthy}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("additionalInfo.summary.completeDocumentation")}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-600/20 via-green-600/40 to-green-600/20" />
        </Card>

        <Card className="relative overflow-hidden rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("additionalInfo.summary.incompleteFiles")}
            </CardTitle>
            <div className="rounded-full bg-amber-600/10 dark:bg-amber-500/10 p-2">
              <FileWarning className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">
              {summary.unhealthy}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("additionalInfo.summary.missingDocuments")}
            </p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600/20 via-amber-600/40 to-amber-600/20" />
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or NIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue
              placeholder={t("additionalInfo.filter.filterByStatus")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("additionalInfo.filter.allFiles")}
            </SelectItem>
            <SelectItem value="healthy">
              {t("additionalInfo.filter.healthyFiles")}
            </SelectItem>
            <SelectItem value="unhealthy">
              {t("additionalInfo.filter.incompleteFiles")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredData.map((emp) => (
            <Card key={emp.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <Avatar className="h-20 w-20 border-2 border-muted">
                    <AvatarImage src={emp.photo} alt={emp.employeeName} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(emp.employeeName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 w-full">
                    <h4 className="font-semibold text-lg truncate">
                      {emp.employeeName}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {emp.employeeNIC}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {emp.role || "N/A"}
                    </Badge>
                  </div>

                  {/* File Health Status */}
                  <div className="w-full pt-2">
                    {emp.isFileHealthy ? (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-md">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">
                          {t("additionalInfo.health.healthy")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">
                          {emp.missingDocumentTypes}{" "}
                          {emp.missingDocumentTypes === 1
                            ? t("additionalInfo.health.incomplete")
                            : t("additionalInfo.health.incompleteMultiple")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <FileText className="h-4 w-4" />
                    <span>
                      {emp.documentCount}{" "}
                      {emp.documentCount === 1 ? "document" : "documents"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 pt-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setViewDialogOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onEdit(emp)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onDelete(emp.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <EmployeeDocumentsPrintDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        employee={selectedEmployee}
      />
    </>
  );
}
