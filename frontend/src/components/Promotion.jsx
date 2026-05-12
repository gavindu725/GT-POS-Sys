import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_URL } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
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
  Calendar,
  Search,
  AlertCircle,
  Clock,
  Users,
  TrendingUp,
  Award,
  Filter,
  Download,
  ChevronRight,
  Briefcase,
  GraduationCap,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PromotionApplicationDialog } from "./PromotionApplicationDialog";

export default function Promotion() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterJobRole, setFilterJobRole] = useState("all");
  const [jobRoles, setJobRoles] = useState([]);
  const [applicationDialog, setApplicationDialog] = useState({
    open: false,
    employee: null,
  });
  const [stats, setStats] = useState({
    totalEmployees: 0,
    eligibleForPromotion: 0,
    blockedEmployees: 0,
    averageYears: 0,
  });

  useEffect(() => {
    fetchPromotionData();
    fetchJobRoles();
  }, []);

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

  const fetchPromotionData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/auth/employees`);

      if (response.data.success) {
        const empData = response.data.data || [];

        // Fetch detailed career info for each employee
        const employeesWithDetails = await Promise.all(
          empData.map(async (emp) => {
            try {
              const detailResponse = await axios.get(
                `${API_URL}/auth/employee/${emp.id}`,
              );
              const detail = detailResponse.data.data;
              const currentCareer = detail.careerHistory?.[0] || {};

              // Calculate salary info if available
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

              // Calculate career start date for service years
              const careerStartDate = detail.career_start_date
                ? new Date(detail.career_start_date)
                : null;
              const yearsOfService = careerStartDate
                ? Math.floor(
                    (new Date() - careerStartDate) /
                      (1000 * 60 * 60 * 24 * 365.25),
                  )
                : 0;

              // Calculate years in current class
              const classPromotionDate =
                currentCareer.current_class_promotion_date
                  ? new Date(currentCareer.current_class_promotion_date)
                  : null;
              const yearsInCurrentClass = classPromotionDate
                ? Math.floor(
                    (new Date() - classPromotionDate) /
                      (1000 * 60 * 60 * 24 * 365.25),
                  )
                : currentCareer.current_salary_year_in_phase || 0;

              // Determine if blocked by inquiry or EB exam
              const hasActiveInquiry = currentCareer.has_active_inquiry === 1;
              const ebStatus = currentCareer.eb_exam_status || "Not Done";
              const isEBRequired = yearsInCurrentClass >= 3;
              const isEBFailed = ebStatus === "Failed";
              const isEBBlocked = isEBRequired && isEBFailed;

              const isBlocked = hasActiveInquiry || isEBBlocked;

              const blockReason = hasActiveInquiry
                ? `Active Inquiry: ${currentCareer.inquiry_reason || "Ongoing"}`
                : isEBBlocked
                  ? "EB Exam Failed - Required after 3 years"
                  : "";

              // Check eligibility for next increment
              const isEligible = salaryInfo?.is_eligible_now || false;

              // Determine pending reason if not eligible and not blocked
              let pendingReason = "";
              if (!isBlocked && !isEligible) {
                if (salaryInfo?.has_reached_max) {
                  pendingReason = "Maximum salary reached";
                } else if (salaryInfo?.days_until_increment > 0) {
                  const daysRemaining = salaryInfo.days_until_increment;
                  if (daysRemaining > 365) {
                    pendingReason = `${Math.floor(
                      daysRemaining / 365,
                    )} year(s) until next increment`;
                  } else if (daysRemaining > 30) {
                    pendingReason = `${Math.floor(
                      daysRemaining / 30,
                    )} month(s) until next increment`;
                  } else {
                    pendingReason = `${daysRemaining} day(s) until next increment`;
                  }
                } else if (isEBRequired && ebStatus === "Not Done") {
                  pendingReason = "EB Exam required (3+ years in class)";
                } else {
                  pendingReason = "Not yet eligible for increment";
                }
              }

              return {
                ...emp,
                yearsOfService,
                yearsInCurrentClass:
                  currentCareer.current_salary_year_in_phase || 0,
                classPromotionDate: currentCareer.current_class_promotion_date,
                ebExamStatus: currentCareer.eb_exam_status || "Not Done",
                ebExamDate: currentCareer.eb_exam_date,
                hasActiveInquiry: currentCareer.has_active_inquiry === 1,
                inquiryReason: currentCareer.inquiry_reason,
                isBlocked,
                blockReason,
                isEligible,
                pendingReason,
                nextIncrementDate: salaryInfo?.next_increment_date,
                daysUntilIncrement: salaryInfo?.days_until_increment,
                currentBasicSalary: salaryInfo?.current_basic_salary,
                nextBasicSalary: salaryInfo?.next_basic_salary,
                hasReachedMax: salaryInfo?.has_reached_max,
                efficiencies: detail.efficiencies || [],
              };
            } catch (error) {
              console.error(
                `Error fetching details for employee ${emp.id}:`,
                error,
              );
              return { ...emp, isBlocked: false, isEligible: false };
            }
          }),
        );

        setEmployees(employeesWithDetails);
        setFilteredEmployees(employeesWithDetails);
        calculateStats(employeesWithDetails);
      }
    } catch (error) {
      console.error("Error fetching promotion data:", error);
      toast.error("Failed to load promotion data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (empData) => {
    const totalEmployees = empData.length;
    const eligibleForPromotion = empData.filter((emp) => emp.isEligible).length;
    const blockedEmployees = empData.filter((emp) => emp.isBlocked).length;
    const totalYears = empData.reduce(
      (sum, emp) => sum + (emp.yearsOfService || 0),
      0,
    );
    const averageYears =
      totalEmployees > 0 ? (totalYears / totalEmployees).toFixed(1) : 0;

    setStats({
      totalEmployees,
      eligibleForPromotion,
      blockedEmployees,
      averageYears,
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
          emp.job_role_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.nic?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "eligible") {
        filtered = filtered.filter((emp) => emp.isEligible);
      } else if (filterStatus === "blocked") {
        filtered = filtered.filter((emp) => emp.isBlocked);
      } else if (filterStatus === "pending") {
        filtered = filtered.filter((emp) => !emp.isEligible && !emp.isBlocked);
      }
    }

    // Class filter
    if (filterClass !== "all") {
      filtered = filtered.filter((emp) => emp.class_code === filterClass);
    }

    // Job role filter
    if (filterJobRole !== "all") {
      filtered = filtered.filter((emp) => emp.job_role_name === filterJobRole);
    }

    setFilteredEmployees(filtered);
  }, [searchTerm, filterStatus, filterClass, filterJobRole, employees]);

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
      "Years of Service",
      "Years in Class",
      "EB Exam Status",
      "Next Increment Date",
      "Status",
      "Block Reason",
    ];

    const rows = filteredEmployees.map((emp) => [
      emp.id,
      emp.name_with_init,
      emp.job_role_name || "N/A",
      emp.class_code || "N/A",
      emp.yearsOfService,
      emp.yearsInCurrentClass,
      emp.ebExamStatus,
      emp.nextIncrementDate || "N/A",
      emp.isBlocked ? "Blocked" : emp.isEligible ? "Eligible" : "Pending",
      emp.blockReason || "N/A",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promotions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t("promotion.success.exported"));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              {t("promotion.loading")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold">{t("promotion.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("promotion.description")}
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("promotion.exportCsv")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("promotion.totalEmployees")}
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
              {t("promotion.eligible")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.eligibleForPromotion}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("promotion.readyForIncrement")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("promotion.blocked")}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.blockedEmployees}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("promotion.blockedReason")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("promotion.averageService")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageYears} {t("common.years")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("promotion.acrossAllEmployees")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("promotion.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("promotion.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("promotion.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("promotion.allStatus")}</SelectItem>
                <SelectItem value="eligible">
                  {t("promotion.eligibleStatus")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("promotion.pending")}
                </SelectItem>
                <SelectItem value="blocked">
                  {t("promotion.blockedStatus")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger>
                <SelectValue placeholder={t("promotion.filterByClass")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("promotion.allClasses")}</SelectItem>
                <SelectItem value="I">{t("common.class")} I</SelectItem>
                <SelectItem value="II">{t("common.class")} II</SelectItem>
                <SelectItem value="III">{t("common.class")} III</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterJobRole} onValueChange={setFilterJobRole}>
              <SelectTrigger>
                <SelectValue placeholder={t("promotion.filterByRole")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("promotion.allRoles")}</SelectItem>
                {jobRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Promotions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("promotion.tableTitle")}</CardTitle>
          <CardDescription>
            {t("promotion.showing", {
              filtered: filteredEmployees.length,
              total: employees.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 p-4 sm:p-0">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {t("promotion.noEmployees")}
                </p>
              </div>
            ) : (
              filteredEmployees.map((emp) => (
                <Card key={emp.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-base">
                          {emp.name_with_init}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {emp.id}
                        </p>
                      </div>
                      <div>
                        {emp.isBlocked ? (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Blocked
                          </Badge>
                        ) : emp.hasReachedMax ? (
                          <Badge variant="secondary">Max</Badge>
                        ) : emp.isEligible ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <Award className="h-3 w-3 mr-1" />
                            Eligible
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">
                          {emp.job_role_name || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {emp.class_code || "N/A"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{emp.yearsOfService || 0}y service</span>
                      </div>
                      <div className="text-muted-foreground">
                        {emp.yearsInCurrentClass || 0}y in class
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {emp.ebExamStatus === "Passed" ? (
                          <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                            Passed
                          </Badge>
                        ) : emp.ebExamStatus === "Failed" ? (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            EB Not Done
                          </Badge>
                        )}
                      </div>
                      {emp.nextIncrementDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(emp.nextIncrementDate)}</span>
                          {emp.daysUntilIncrement !== null && (
                            <span className="text-primary">
                              (
                              {emp.daysUntilIncrement > 0
                                ? `${emp.daysUntilIncrement}d`
                                : emp.daysUntilIncrement === 0
                                  ? "Today"
                                  : `${Math.abs(emp.daysUntilIncrement)}d overdue`}
                              )
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {(emp.blockReason || emp.pendingReason) && (
                      <p className="text-xs text-muted-foreground mb-3">
                        {emp.blockReason || emp.pendingReason}
                      </p>
                    )}

                    {emp.isEligible && !emp.isBlocked && !emp.hasReachedMax && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          setApplicationDialog({
                            open: true,
                            employee: emp,
                          })
                        }
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {t("promotion.applyButton")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("promotion.employee")}</TableHead>
                  <TableHead>{t("promotion.jobRole")}</TableHead>
                  <TableHead>{t("promotion.class")}</TableHead>
                  <TableHead className="text-right">
                    {t("promotion.serviceYears")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("promotion.yearsInClass")}
                  </TableHead>
                  <TableHead>{t("promotion.ebExamStatus")}</TableHead>
                  <TableHead>{t("promotion.nextIncrement")}</TableHead>
                  <TableHead>{t("promotion.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {t("promotion.noEmployees")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.name_with_init}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {emp.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {emp.job_role_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {emp.class_code || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {emp.yearsOfService || 0} years
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {emp.yearsInCurrentClass || 0} years
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          {emp.ebExamStatus === "Passed" ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              Passed
                            </Badge>
                          ) : emp.ebExamStatus === "Failed" ? (
                            <Badge variant="destructive">Failed</Badge>
                          ) : (
                            <Badge variant="outline">Not Done</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.nextIncrementDate ? (
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {formatDate(emp.nextIncrementDate)}
                            </div>
                            {emp.daysUntilIncrement !== null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {emp.daysUntilIncrement > 0
                                  ? `in ${emp.daysUntilIncrement} days`
                                  : emp.daysUntilIncrement === 0
                                    ? "Today"
                                    : `${Math.abs(
                                        emp.daysUntilIncrement,
                                      )} days overdue`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            {emp.isBlocked ? (
                              <div>
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Blocked
                                </Badge>
                                {emp.blockReason && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {emp.blockReason}
                                  </p>
                                )}
                              </div>
                            ) : emp.hasReachedMax ? (
                              <Badge variant="secondary">Max Reached</Badge>
                            ) : emp.isEligible ? (
                              <Badge className="bg-green-500 hover:bg-green-600">
                                <Award className="h-3 w-3 mr-1" />
                                Eligible Now
                              </Badge>
                            ) : (
                              <div>
                                <Badge variant="outline">Pending</Badge>
                                {emp.pendingReason && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {emp.pendingReason}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          {emp.isEligible &&
                            !emp.isBlocked &&
                            !emp.hasReachedMax && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setApplicationDialog({
                                    open: true,
                                    employee: emp,
                                  })
                                }
                                className="ml-2"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {t("promotion.applyButton")}
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Promotion Application Dialog */}
      <PromotionApplicationDialog
        employee={applicationDialog.employee}
        open={applicationDialog.open}
        onClose={() => setApplicationDialog({ open: false, employee: null })}
        onSuccess={() => {
          toast.success(t("promotion.applicationSubmitted"));
          fetchPromotionData();
        }}
      />
    </div>
  );
}
