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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertCircle,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

export default function Inquiry() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterJobRole, setFilterJobRole] = useState("all");
  const [jobRoles, setJobRoles] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [inquiryForm, setInquiryForm] = useState({
    hasActiveInquiry: false,
    inquiryReason: "",
    holdIncrement: false,
    holdSalary: false,
    disableEmployment: false,
  });
  const [stats, setStats] = useState({
    totalInquiries: 0,
    activeInquiries: 0,
    resolvedInquiries: 0,
    blockedEmployees: 0,
  });

  useEffect(() => {
    fetchInquiries();
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

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/auth/employees`);

      if (response.data.success) {
        const empData = response.data.data || [];

        // Fetch detailed career info for each employee
        const employeesWithInquiries = await Promise.all(
          empData.map(async (emp) => {
            try {
              const detailResponse = await axios.get(
                `${API_URL}/auth/employee/${emp.id}`,
              );
              const detail = detailResponse.data.data;
              const currentCareer = detail.careerHistory?.[0] || {};

              return {
                ...emp,
                hasActiveInquiry: currentCareer.has_active_inquiry === 1,
                inquiryReason: currentCareer.inquiry_reason,
                holdIncrement: currentCareer.hold_increment === 1,
                holdSalary: currentCareer.hold_salary === 1,
                disableEmployment: currentCareer.disable_employment === 1,
                classPromotionDate: currentCareer.current_class_promotion_date,
                yearsInCurrentClass:
                  currentCareer.current_salary_year_in_phase || 0,
                ebExamStatus: currentCareer.eb_exam_status || "Not Done",
                fullName: detail.full_name,
                email: detail.email,
                phone1: detail.phone1,
                phone2: detail.phone2,
                address: detail.address,
                dob: detail.dob,
                gender: detail.gender,
                marital_status: detail.marital_status,
                career_start_date: detail.career_start_date,
                retirement_date: detail.retirement_date,
                eb_exam_date: currentCareer.eb_exam_date,
                fk_job_role_id: currentCareer.fk_job_role_id,
                fk_job_class_id: currentCareer.fk_job_class_id,
                fk_job_role_class_id: currentCareer.fk_job_role_class_id,
                appointment_type: currentCareer.appointment_type,
              };
            } catch (error) {
              console.error(
                `Error fetching details for employee ${emp.id}:`,
                error,
              );
              return { ...emp, hasActiveInquiry: false, inquiryReason: "" };
            }
          }),
        );

        setEmployees(employeesWithInquiries);
        setFilteredEmployees(
          employeesWithInquiries.filter((emp) => emp.hasActiveInquiry),
        );
        calculateStats(employeesWithInquiries);
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      toast.error("Failed to load inquiry data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (empData) => {
    const activeInquiries = empData.filter(
      (emp) => emp.hasActiveInquiry,
    ).length;
    const totalInquiries = activeInquiries; // Can be extended to include historical data
    const resolvedInquiries = 0; // Can be tracked separately in future
    const blockedEmployees = activeInquiries;

    setStats({
      totalInquiries,
      activeInquiries,
      resolvedInquiries,
      blockedEmployees,
    });
  };

  // Filter employees
  useEffect(() => {
    let filtered = [...employees];

    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter((emp) => emp.hasActiveInquiry);
    } else if (filterStatus === "none") {
      filtered = filtered.filter((emp) => !emp.hasActiveInquiry);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          emp.name_with_init
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          emp.nic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.inquiryReason?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Job role filter
    if (filterJobRole !== "all") {
      filtered = filtered.filter((emp) => emp.job_role_name === filterJobRole);
    }

    setFilteredEmployees(filtered);
  }, [searchTerm, filterStatus, filterJobRole, employees]);

  const handleAddInquiry = (employee) => {
    setSelectedEmployee(employee);
    setInquiryForm({
      hasActiveInquiry: employee.hasActiveInquiry || false,
      inquiryReason: employee.inquiryReason || "",
      holdIncrement: employee.holdIncrement || false,
      holdSalary: employee.holdSalary || false,
      disableEmployment: employee.disableEmployment || false,
    });
    setDialogOpen(true);
  };

  const handleSaveInquiry = async () => {
    if (!selectedEmployee) return;

    if (inquiryForm.hasActiveInquiry && !inquiryForm.inquiryReason.trim()) {
      toast.error("Please provide a reason for the inquiry");
      return;
    }

    try {
      // Prepare the payload with all required fields
      const payload = {
        // Include all required fields from the employee
        nameWithInitials: selectedEmployee.name_with_init,
        fullName: selectedEmployee.fullName || selectedEmployee.full_name,
        nic: selectedEmployee.nic,
        dob: selectedEmployee.dob,
        gender: selectedEmployee.gender,
        mstatus: selectedEmployee.marital_status || selectedEmployee.mstatus,
        email: selectedEmployee.email,
        phone1: selectedEmployee.phone1,
        phone2: selectedEmployee.phone2,
        address: selectedEmployee.address,
        permanentStatus:
          selectedEmployee.permanent_status === "P" ? "Permanent" : "Contract",
        careerStartDate: selectedEmployee.career_start_date,
        retirementDate: selectedEmployee.retirement_date,
        jobRole: selectedEmployee.fk_job_role_id,
        jobClass: selectedEmployee.fk_job_class_id,
        jobRoleClass: selectedEmployee.fk_job_role_class_id,
        currentClassPromotionDate: selectedEmployee.classPromotionDate,
        yearsInCurrentClass: selectedEmployee.yearsInCurrentClass,
        ebExamStatus: selectedEmployee.ebExamStatus,
        ebExamDate: selectedEmployee.eb_exam_date,
        hasActiveInquiry: Boolean(inquiryForm.hasActiveInquiry),
        inquiryReason: inquiryForm.hasActiveInquiry
          ? inquiryForm.inquiryReason.trim()
          : null,
        holdIncrement: Boolean(inquiryForm.holdIncrement),
        holdSalary: Boolean(inquiryForm.holdSalary),
        disableEmployment: Boolean(inquiryForm.disableEmployment),
        appointmentType: selectedEmployee.appointment_type || "Recruitment",
      };

      console.log("Saving inquiry with payload:", {
        employeeId: selectedEmployee.id,
        hasActiveInquiry: payload.hasActiveInquiry,
        inquiryReason: payload.inquiryReason,
        holdIncrement: payload.holdIncrement,
        holdSalary: payload.holdSalary,
        disableEmployment: payload.disableEmployment,
        jobRoleClass: payload.jobRoleClass,
        yearsInCurrentClass: payload.yearsInCurrentClass,
      });

      const response = await axios.put(
        `${API_URL}/auth/employee/${selectedEmployee.id}`,
        payload,
      );

      console.log("Backend response:", response.data);

      if (response.data.success) {
        toast.success(
          inquiryForm.hasActiveInquiry
            ? t("inquiry.success.added")
            : t("inquiry.success.resolved"),
        );
        setDialogOpen(false);
        fetchInquiries();
      }
    } catch (error) {
      console.error("Error saving inquiry:", error);
      toast.error(
        error.response?.data?.message || t("inquiry.errors.saveFailed"),
      );
    }
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
      "NIC",
      "Job Role",
      "Class",
      "Status",
      "Inquiry Reason",
      "Email",
      "Phone",
    ];

    const rows = filteredEmployees.map((emp) => [
      emp.id,
      emp.name_with_init,
      emp.nic,
      emp.job_role_name || "N/A",
      emp.class_code || "N/A",
      emp.hasActiveInquiry ? "Active Inquiry" : "No Inquiry",
      emp.inquiryReason || "N/A",
      emp.email || "N/A",
      emp.phone1 || "N/A",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inquiries_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t("inquiry.success.exported"));
  };

  // Calculate inquiry severity level (heat level) based on active restrictions
  const getInquirySeverity = (employee) => {
    if (!employee.hasActiveInquiry) {
      return { level: 0, label: "No Inquiry", color: "green" };
    }

    const activeRestrictions = [
      employee.holdIncrement,
      employee.holdSalary,
      employee.disableEmployment,
    ].filter(Boolean).length;

    if (activeRestrictions === 0) {
      return { level: 1, label: "Low", color: "yellow" };
    } else if (activeRestrictions === 1) {
      return { level: 2, label: "Moderate", color: "orange" };
    } else if (activeRestrictions === 2) {
      return { level: 3, label: "High", color: "red" };
    } else {
      return { level: 4, label: "Critical", color: "red" };
    }
  };

  if (loading) {
    return (
      <main className="overflow-y-auto p-5">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t("inquiry.loading")}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="overflow-y-auto p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold">{t("inquiry.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("inquiry.description")}
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t("inquiry.exportCsv")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("inquiry.activeInquiries")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.activeInquiries}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("inquiry.underInvestigation")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("inquiry.blockedEmployees")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blockedEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("inquiry.incrementsOnHold")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("inquiry.totalEmployees")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("inquiry.inSystem")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clear Records</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.length - stats.activeInquiries}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              No active inquiries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, NIC, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="active">Active Inquiries</SelectItem>
                <SelectItem value="none">No Inquiries</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterJobRole} onValueChange={setFilterJobRole}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Job Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Roles</SelectItem>
                {jobRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity Legend */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Inquiry Severity Levels:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-muted-foreground">
                  No Inquiry - Clear
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span className="text-muted-foreground">
                  Low - Inquiry only, no restrictions
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                <span className="text-muted-foreground">
                  Moderate - 1 restriction active
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span className="text-muted-foreground">
                  High/Critical - 2+ restrictions
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inquiries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Inquiry Records</CardTitle>
          <CardDescription>
            Showing {filteredEmployees.length} of {employees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job Role</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inquiry Details</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        No employees found matching filters
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
                            ID: {emp.id} | NIC: {emp.nic}
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
                      <TableCell>
                        {(() => {
                          const severity = getInquirySeverity(emp);
                          const colors = {
                            green:
                              "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
                            yellow:
                              "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
                            orange:
                              "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
                            red: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
                          };

                          const restrictions = [];
                          if (emp.holdIncrement)
                            restrictions.push("Increment Hold");
                          if (emp.holdSalary) restrictions.push("Salary Hold");
                          if (emp.disableEmployment)
                            restrictions.push("Employment Suspended");

                          return (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-3 w-3 rounded-full ${
                                    severity.color === "green"
                                      ? "bg-green-500"
                                      : severity.color === "yellow"
                                        ? "bg-yellow-500"
                                        : severity.color === "orange"
                                          ? "bg-orange-500"
                                          : "bg-red-500"
                                  }`}
                                />
                                <Badge
                                  className={colors[severity.color]}
                                  variant="outline"
                                >
                                  {severity.label}
                                </Badge>
                              </div>
                              {restrictions.length > 0 && (
                                <div className="text-xs text-muted-foreground pl-5">
                                  {restrictions.join(", ")}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {emp.hasActiveInquiry ? (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Active Inquiry
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Clear
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.hasActiveInquiry && emp.inquiryReason ? (
                          <div className="max-w-xs">
                            <div className="flex items-start gap-1">
                              <FileText className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <p className="text-sm line-clamp-2">
                                {emp.inquiryReason}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="text-muted-foreground">
                            {emp.email || "No email"}
                          </p>
                          <p className="text-muted-foreground">
                            {emp.phone1 || "No phone"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddInquiry(emp)}
                        >
                          {emp.hasActiveInquiry ? (
                            <>
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inquiry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.hasActiveInquiry
                ? "Update Inquiry"
                : "Add Inquiry"}
            </DialogTitle>
            <DialogDescription>
              Manage inquiry status for {selectedEmployee?.name_with_init}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Employee Info */}
            <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div>
                  <p className="font-semibold">
                    {selectedEmployee?.name_with_init}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee?.job_role_name} -{" "}
                    {selectedEmployee?.class_code}
                  </p>
                </div>
                <Badge variant="outline">ID: {selectedEmployee?.id}</Badge>
              </div>
            </div>

            {/* Inquiry Status */}
            <div className="space-y-2">
              <Label htmlFor="inquiryStatus">Inquiry Status</Label>
              <Select
                value={inquiryForm.hasActiveInquiry ? "active" : "none"}
                onValueChange={(value) =>
                  setInquiryForm((prev) => ({
                    ...prev,
                    hasActiveInquiry: value === "active",
                    inquiryReason: value === "none" ? "" : prev.inquiryReason,
                  }))
                }
              >
                <SelectTrigger id="inquiryStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Inquiry</SelectItem>
                  <SelectItem value="none">No Inquiry / Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inquiry Reason */}
            {inquiryForm.hasActiveInquiry && (
              <div className="space-y-2">
                <Label htmlFor="inquiryReason">
                  Inquiry Reason / Details *
                </Label>
                <Textarea
                  id="inquiryReason"
                  placeholder="Enter the reason for the inquiry, case number, investigation details, etc..."
                  value={inquiryForm.inquiryReason}
                  onChange={(e) =>
                    setInquiryForm((prev) => ({
                      ...prev,
                      inquiryReason: e.target.value,
                    }))
                  }
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This information will be stored in the employee record and
                  will block salary increments
                </p>
              </div>
            )}

            {/* Action Switches - Only show when inquiry is active */}
            {inquiryForm.hasActiveInquiry && (
              <div className="space-y-4 p-3 sm:p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50/50 dark:bg-orange-950/50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <Label className="font-semibold text-orange-900 dark:text-orange-100">
                    Inquiry Actions
                  </Label>
                </div>

                {/* Hold Increment Switch */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label
                      htmlFor="holdIncrement"
                      className="text-sm font-medium"
                    >
                      Hold Increment
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Prevent employee from receiving salary increments
                    </p>
                  </div>
                  <Switch
                    id="holdIncrement"
                    checked={inquiryForm.holdIncrement}
                    onCheckedChange={(checked) =>
                      setInquiryForm((prev) => ({
                        ...prev,
                        holdIncrement: checked,
                      }))
                    }
                  />
                </div>

                {/* Hold Salary Switch */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="holdSalary" className="text-sm font-medium">
                      Hold Salary
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Suspend salary payments temporarily
                    </p>
                  </div>
                  <Switch
                    id="holdSalary"
                    checked={inquiryForm.holdSalary}
                    onCheckedChange={(checked) =>
                      setInquiryForm((prev) => ({
                        ...prev,
                        holdSalary: checked,
                      }))
                    }
                  />
                </div>

                {/* Disable Employment Switch */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label
                      htmlFor="disableEmployment"
                      className="text-sm font-medium"
                    >
                      Disable Employment
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Suspend employee from duty (serious cases)
                    </p>
                  </div>
                  <Switch
                    id="disableEmployment"
                    checked={inquiryForm.disableEmployment}
                    onCheckedChange={(checked) =>
                      setInquiryForm((prev) => ({
                        ...prev,
                        disableEmployment: checked,
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {!inquiryForm.hasActiveInquiry &&
              selectedEmployee?.hasActiveInquiry && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <div className="flex gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Resolving Inquiry
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        This will clear the inquiry status and allow the
                        employee to receive salary increments again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveInquiry}>
              {inquiryForm.hasActiveInquiry ? "Save Inquiry" : "Resolve & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
