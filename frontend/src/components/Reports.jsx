import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  ExternalLink,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Loader2,
  FileArchive,
  Files,
} from "lucide-react";

function Reports() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await axios.get(`${API_URL}/reports/employees`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error(t("reports.errors.loadEmployeesFailed"));
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchEmployeeDocuments = async (employeeId) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/reports/employee-documents/${employeeId}`,
        { withCredentials: true },
      );
      if (response.data.success) {
        setEmployeeData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching employee documents:", error);
      toast.error(t("reports.errors.loadDocumentsFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (value) => {
    setSelectedEmployeeId(value);
    if (value) {
      fetchEmployeeDocuments(value);
    } else {
      setEmployeeData(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openAllDocuments = () => {
    if (!employeeData?.documents) return;

    Object.values(employeeData.documents)
      .flat()
      .forEach((doc) => {
        if (doc.cloudinaryUrl) {
          window.open(doc.cloudinaryUrl, "_blank");
        }
      });
  };

  const downloadDocument = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAsZip = async () => {
    if (!selectedEmployeeId) return;
    setDownloadingZip(true);
    try {
      const response = await axios.get(
        `${API_URL}/reports/download-zip/${selectedEmployeeId}`,
        {
          withCredentials: true,
          responseType: "blob",
        },
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${employeeData?.employee?.fullName || "employee"}_documents.zip`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("reports.success.downloadedZip"));
    } catch (error) {
      console.error("Error downloading ZIP:", error);
      toast.error(t("reports.errors.downloadZipFailed"));
    } finally {
      setDownloadingZip(false);
    }
  };

  const downloadCombinedPdf = async () => {
    if (!selectedEmployeeId) return;
    setDownloadingPdf(true);
    try {
      const response = await axios.get(
        `${API_URL}/reports/download-combined-pdf/${selectedEmployeeId}`,
        {
          withCredentials: true,
          responseType: "blob",
        },
      );

      // Create download link
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${employeeData?.employee?.fullName || "employee"}_all_documents.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("reports.success.downloadedPdf"));
    } catch (error) {
      console.error("Error downloading combined PDF:", error);
      toast.error(t("reports.errors.downloadPdfFailed"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{t("reports.title")}</h3>
          <p className="text-muted-foreground mt-1">
            {t("reports.description")}
          </p>
        </div>
      </div>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("reports.selectEmployee")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Select
                value={selectedEmployeeId}
                onValueChange={handleEmployeeChange}
                disabled={loadingEmployees}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("reports.selectEmployeePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{emp.full_name}</span>
                        <span className="text-muted-foreground text-sm">
                          ({emp.nic})
                        </span>
                        {emp.role && (
                          <Badge variant="outline" className="text-xs">
                            {emp.role}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {employeeData && (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={openAllDocuments} variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("reports.openAll")}
                </Button>
                <Button
                  onClick={downloadAsZip}
                  variant="outline"
                  disabled={downloadingZip}
                >
                  {downloadingZip ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileArchive className="mr-2 h-4 w-4" />
                  )}
                  {t("reports.downloadZip")}
                </Button>
                <Button
                  onClick={downloadCombinedPdf}
                  variant="default"
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Files className="mr-2 h-4 w-4" />
                  )}
                  {t("reports.exportPdf")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Employee Details and Documents */}
      {!loading && employeeData && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Employee Information */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("reports.employeeInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {employeeData.employee.photo && (
                <div className="flex justify-center">
                  <img
                    src={employeeData.employee.photo}
                    alt={employeeData.employee.fullName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-border"
                  />
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">
                    {t("reports.fullName")}
                  </p>
                  <p className="font-medium">
                    {employeeData.employee.fullName}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">
                    {t("reports.nameWithInitials")}
                  </p>
                  <p className="font-medium">
                    {employeeData.employee.nameWithInit}
                  </p>
                </div>

                <Separator />

                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Email</p>
                    <p className="font-medium">{employeeData.employee.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p className="font-medium">
                      {employeeData.employee.phone1}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Address</p>
                    <p className="font-medium">
                      {employeeData.employee.address}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">Position</p>
                    <p className="font-medium">
                      {employeeData.employee.role || "N/A"}
                    </p>
                    {employeeData.employee.jobClass && (
                      <p className="text-xs text-muted-foreground">
                        Class: {employeeData.employee.jobClass}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Career Start
                    </p>
                    <p className="font-medium">
                      {formatDate(employeeData.employee.careerStartDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge
                    variant={
                      employeeData.employee.permanentStatus === "Permanent"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {employeeData.employee.permanentStatus}
                  </Badge>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs">NIC</p>
                  <p className="font-medium font-mono">
                    {employeeData.employee.nic}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                  <Badge variant="secondary">
                    {employeeData.totalDocuments}
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {employeeData.totalDocuments === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No documents found for this employee</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(employeeData.documents).map(
                    ([category, docs]) => (
                      <div key={category}>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          {category}
                          <Badge variant="outline" className="text-xs">
                            {docs.length}
                          </Badge>
                        </h4>
                        <div className="space-y-2">
                          {docs.map((doc, index) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {doc.documentTypeName}
                                    {doc.instanceIndex > 1 &&
                                      ` (Copy ${doc.instanceIndex})`}
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    {doc.pageCount && (
                                      <span>Pages: {doc.pageCount}</span>
                                    )}
                                    <span>
                                      Uploaded: {formatDate(doc.uploadedAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {doc.cloudinaryUrl ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        window.open(doc.cloudinaryUrl, "_blank")
                                      }
                                    >
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        downloadDocument(
                                          doc.cloudinaryUrl,
                                          `${doc.documentTypeName}_${employeeData.employee.nic}.pdf`,
                                        )
                                      }
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="secondary">No file</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Selection State */}
      {!loading && !employeeData && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Employee Selected</p>
              <p className="text-sm mt-2">
                Select an employee from the dropdown above to view their
                documents
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Reports;
