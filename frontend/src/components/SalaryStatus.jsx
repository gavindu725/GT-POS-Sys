import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_URL } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Briefcase,
  Award,
  Clock,
  AlertCircle,
  Ban,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function SalaryStatus() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJobRole, setFilterJobRole] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [jobRoles, setJobRoles] = useState([]);
  const [jobClasses, setJobClasses] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    averageSalary: 0,
    totalSalaryBudget: 0,
    eligibleForIncrement: 0,
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch all necessary data
  useEffect(() => {
    fetchEmployees();
    fetchJobRoles();
    fetchJobClasses();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/auth/employees`);
      if (response.data.success) {
        const empData = response.data.data || [];

        // Fetch salary details for each employee
        const employeesWithSalary = await Promise.all(
          empData.map(async (emp) => {
            try {
              // Get employee career details
              const detailResponse = await axios.get(
                `${API_URL}/auth/employee/${emp.id}`,
              );
              const detail = detailResponse.data.data;
              const currentCareer = detail.careerHistory?.[0] || {};

              // Calculate salary if we have the required data
              let salaryInfo = null;
              if (
                currentCareer.fk_job_role_class_id &&
                currentCareer.current_salary_year_in_phase !== null
              ) {
                try {
                  const salaryResponse = await axios.post(
                    `${API_URL}/salary/calculate-from-years`,
                    {
                      jobRoleClassId: currentCareer.fk_job_role_class_id,
                      totalYears: currentCareer.current_salary_year_in_phase,
                      promotionDate:
                        currentCareer.current_class_promotion_date || null,
                    },
                  );
                  if (salaryResponse.data.success) {
                    salaryInfo = salaryResponse.data.data;
                  }
                } catch (salaryError) {
                  console.error(
                    `Error calculating salary for employee ${emp.id}:`,
                    salaryError,
                  );
                }
              }

              return {
                ...emp,
                yearsInClass: currentCareer.current_salary_year_in_phase || 0,
                currentClassPromotionDate:
                  currentCareer.current_class_promotion_date || null,
                hasActiveInquiry: currentCareer.has_active_inquiry === 1,
                holdIncrement: currentCareer.hold_increment === 1,
                holdSalary: currentCareer.hold_salary === 1,
                disableEmployment: currentCareer.disable_employment === 1,
                salaryInfo,
                currentPhaseName: salaryInfo?.current_phase_name || "N/A",
                currentBasicSalary: salaryInfo
                  ? parseFloat(salaryInfo.current_basic_salary)
                  : 0,
                nextBasicSalary: salaryInfo
                  ? parseFloat(salaryInfo.next_basic_salary)
                  : 0,
                annualIncrement: salaryInfo
                  ? parseFloat(salaryInfo.annual_increment)
                  : 0,
                isEligibleNow: salaryInfo?.is_eligible_now || false,
                daysUntilIncrement: salaryInfo?.days_until_increment || null,
                nextIncrementDate: salaryInfo?.next_increment_date || null,
                hasReachedMax: salaryInfo?.has_reached_max || false,
              };
            } catch (error) {
              console.error(
                `Error fetching details for employee ${emp.id}:`,
                error,
              );
              return { ...emp, salaryInfo: null };
            }
          }),
        );

        setEmployees(employeesWithSalary);
        setFilteredEmployees(employeesWithSalary);
        calculateStats(employeesWithSalary);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load salary data");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/job-roles`);
      if (response.data.success) {
        setJobRoles(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching job roles:", error);
    }
  };

  const fetchJobClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/job-classes`);
      if (response.data.success) {
        setJobClasses(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching job classes:", error);
    }
  };

  const calculateStats = (empData) => {
    const totalEmployees = empData.length;
    const totalSalary = empData.reduce(
      (sum, emp) => sum + (emp.currentBasicSalary || 0),
      0,
    );
    const averageSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0;
    const eligibleForIncrement = empData.filter(
      (emp) => emp.isEligibleNow,
    ).length;

    setStats({
      totalEmployees,
      averageSalary: averageSalary.toFixed(2),
      totalSalaryBudget: totalSalary.toFixed(2),
      eligibleForIncrement,
    });
  };

  // Filter employees
  useEffect(() => {
    let filtered = [...employees];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.name_with_init
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          emp.nic?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Job role filter
    if (filterJobRole !== "all") {
      filtered = filtered.filter((emp) => emp.job_role_name === filterJobRole);
    }

    // Job class filter
    if (filterClass !== "all") {
      filtered = filtered.filter((emp) => emp.class_code === filterClass);
    }

    setFilteredEmployees(filtered);
    calculateStats(filtered);
  }, [searchTerm, filterJobRole, filterClass, employees]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Employee ID",
      "Name",
      "Job Role",
      "Class",
      "Scale",
      "Phase",
      "Years in Class",
      "Current Salary",
      "Annual Increment",
      "Next Salary",
      "Next Increment Date",
      "Days Until Increment",
      "Hold Increment",
      "Hold Salary",
      "Employment Suspended",
      "Status",
    ];

    const rows = filteredEmployees.map((emp) => [
      emp.id,
      emp.name_with_init,
      emp.job_role_name || "N/A",
      emp.class_code || "N/A",
      emp.salary_code || "N/A",
      emp.currentPhaseName,
      emp.yearsInClass,
      emp.currentBasicSalary,
      emp.annualIncrement,
      emp.nextBasicSalary,
      emp.nextIncrementDate || "N/A",
      emp.daysUntilIncrement || "N/A",
      emp.holdIncrement ? "Yes" : "No",
      emp.holdSalary ? "Yes" : "No",
      emp.disableEmployment ? "Yes" : "No",
      emp.hasReachedMax
        ? "Max Reached"
        : emp.isEligibleNow
          ? "Eligible Now"
          : "Pending",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary_status_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t("salaryStatus.success.exported"));
  };

  if (loading) {
    return (
      <main className="h-full w-full overflow-x-hidden overflow-y-auto p-5">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              {t("salaryStatus.loading")}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full w-full overflow-x-hidden overflow-y-auto p-3 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold">{t("salaryStatus.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("salaryStatus.description")}
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("salaryStatus.exportCsv")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("salaryStatus.totalEmployees")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("salaryStatus.averageSalary")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.averageSalary)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("salaryStatus.totalBudget")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalSalaryBudget)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("salaryStatus.eligible")}
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.eligibleForIncrement}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("salaryStatus.readyForIncrement")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("common.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("salaryStatus.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={filterJobRole} onValueChange={setFilterJobRole}>
              <SelectTrigger>
                <SelectValue placeholder={t("salaryStatus.filterByRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("salaryStatus.allRoles")}
                </SelectItem>
                {jobRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger>
                <SelectValue placeholder={t("salaryStatus.filterByClass")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("salaryStatus.allClasses")}
                </SelectItem>
                {jobClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.class_code}>
                    {cls.class_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Salary Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("salaryStatus.tableTitle")}</CardTitle>
          <CardDescription>
            {t("salaryStatus.showing", {
              filtered: filteredEmployees.length,
              total: employees.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">
                        {t("salaryStatus.employee")}
                      </TableHead>
                      <TableHead className="w-[90px]">
                        {t("salaryStatus.jobRole")}
                      </TableHead>
                      <TableHead className="w-[65px]">
                        {t("salaryStatus.class")}
                      </TableHead>
                      <TableHead className="w-[70px]">
                        {t("salaryStatus.scale")}
                      </TableHead>
                      <TableHead className="w-[80px]">
                        {t("salaryStatus.phase")}
                      </TableHead>
                      <TableHead className="text-right w-[70px]">
                        {t("salaryStatus.years")}
                      </TableHead>
                      <TableHead className="text-right w-[100px]">
                        {t("salaryStatus.salary")}
                      </TableHead>
                      <TableHead className="text-right w-[80px]">
                        {t("salaryStatus.increment")}
                      </TableHead>
                      <TableHead className="w-[130px]">
                        {t("salaryStatus.nextInc")}
                      </TableHead>
                      <TableHead className="w-[90px]">
                        {t("salaryStatus.holds")}
                      </TableHead>
                      <TableHead className="w-[70px]">
                        {t("salaryStatus.status")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          <p className="text-muted-foreground">
                            {t("salaryStatus.noEmployees")}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <TableRow
                          key={emp.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm truncate">
                                {emp.name_with_init}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {emp.id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm truncate block">
                              {emp.job_role_name || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {emp.class_code || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {emp.salary_code || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {emp.currentPhaseName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm">
                              {emp.yearsInClass || 0}y
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {emp.currentBasicSalary > 0
                              ? formatCurrency(emp.currentBasicSalary)
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {emp.annualIncrement > 0
                              ? formatCurrency(emp.annualIncrement)
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {emp.nextIncrementDate ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-xs">
                                  <Calendar className="h-3 w-3 text-primary" />
                                  <span className="font-medium">
                                    {formatDate(emp.nextIncrementDate)}
                                  </span>
                                </div>
                                {emp.daysUntilIncrement !== null && (
                                  <div className="flex items-center gap-1">
                                    {emp.daysUntilIncrement > 0 ? (
                                      <span className="text-xs text-blue-600 dark:text-blue-400">
                                        {emp.daysUntilIncrement}d
                                      </span>
                                    ) : emp.daysUntilIncrement === 0 ? (
                                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        Today
                                      </span>
                                    ) : (
                                      <span className="text-xs text-red-600 dark:text-red-400">
                                        {Math.abs(emp.daysUntilIncrement)}d over
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                N/A
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {emp.holdIncrement ||
                            emp.holdSalary ||
                            emp.disableEmployment ? (
                              <div className="space-y-0.5">
                                {emp.holdIncrement && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] px-1 py-0 h-4 flex items-center gap-0.5 w-fit"
                                  >
                                    Inc
                                  </Badge>
                                )}
                                {emp.holdSalary && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] px-1 py-0 h-4 flex items-center gap-0.5 w-fit"
                                  >
                                    Sal
                                  </Badge>
                                )}
                                {emp.disableEmployment && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] px-1 py-0 h-4 flex items-center gap-0.5 w-fit"
                                  >
                                    Emp
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4 bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800 w-fit"
                              >
                                Clear
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {emp.hasReachedMax ? (
                              <Badge variant="secondary" className="text-xs">
                                Max
                              </Badge>
                            ) : emp.isEligibleNow ? (
                              <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                                Eligible
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed View Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Salary Details</DialogTitle>
            <DialogDescription className="text-xs">
              Comprehensive salary and increment information
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-6 py-4">
              {/* Employee Header */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-3 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold">
                      {selectedEmployee.name_with_init}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedEmployee.id} | {selectedEmployee.nic}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1 text-xs">
                      {selectedEmployee.job_role_name}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {selectedEmployee.class_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Salary Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Current Salary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Scale</p>
                      <p className="text-sm font-semibold">
                        {selectedEmployee.salary_code || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Phase</p>
                      <Badge variant="outline" className="text-xs font-mono">
                        {selectedEmployee.currentPhaseName}
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Years in Class
                      </p>
                      <p className="text-sm font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {selectedEmployee.yearsInClass}y
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Basic Salary
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(selectedEmployee.currentBasicSalary)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Increment Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Increment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Annual Increment
                      </p>
                      <p className="text-base font-bold text-green-600">
                        {formatCurrency(selectedEmployee.annualIncrement)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Next Salary
                      </p>
                      <p className="text-base font-bold text-blue-600">
                        {formatCurrency(selectedEmployee.nextBasicSalary)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Next Date</p>
                      {selectedEmployee.nextIncrementDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          <span className="text-sm font-semibold">
                            {formatDate(selectedEmployee.nextIncrementDate)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">N/A</p>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Status</p>
                      {selectedEmployee.daysUntilIncrement !== null && (
                        <div>
                          {selectedEmployee.daysUntilIncrement > 0 ? (
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {selectedEmployee.daysUntilIncrement}d
                            </span>
                          ) : selectedEmployee.daysUntilIncrement === 0 ? (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Today
                            </span>
                          ) : (
                            <span className="text-xs text-red-600 dark:text-red-400">
                              {Math.abs(selectedEmployee.daysUntilIncrement)}d
                              over
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedEmployee.hasReachedMax && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        Maximum salary reached in current scale
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hold Status */}
              <Card
                className={
                  selectedEmployee.holdIncrement ||
                  selectedEmployee.holdSalary ||
                  selectedEmployee.disableEmployment
                    ? "border-red-200 dark:border-red-800"
                    : "border-green-200 dark:border-green-800"
                }
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedEmployee.holdIncrement ||
                    selectedEmployee.holdSalary ||
                    selectedEmployee.disableEmployment ? (
                      <Ban className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    Holds
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedEmployee.holdIncrement ||
                  selectedEmployee.holdSalary ||
                  selectedEmployee.disableEmployment ? (
                    <div className="space-y-2">
                      <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-xs text-red-800 dark:text-red-200 font-semibold mb-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Active Restrictions
                        </p>
                        <div className="space-y-1.5 ml-4">
                          {selectedEmployee.holdIncrement && (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1 py-0 h-4"
                              >
                                Inc
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                No salary increments
                              </span>
                            </div>
                          )}
                          {selectedEmployee.holdSalary && (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1 py-0 h-4"
                              >
                                Sal
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                Payments suspended
                              </span>
                            </div>
                          )}
                          {selectedEmployee.disableEmployment && (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1 py-0 h-4"
                              >
                                Emp
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                Suspended from duty
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs text-green-800 dark:text-green-200 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        No active holds or restrictions
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-xs">
                        {selectedEmployee.email || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-xs">
                        {selectedEmployee.phone1 || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
