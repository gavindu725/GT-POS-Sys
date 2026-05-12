import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Upload, X, AlertTriangle } from "lucide-react";
import { EmployeeFormField } from "./employee-form-field";
import { EMPLOYEE_FORM_SECTIONS } from "./employee-form-config";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { API_URL } from "@/lib/api";

const formatDateForInput = (date) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

export function EmployeeForm({
  employee,
  open,
  onOpenChange,
  onSave,
  mode = "add",
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("personal");
  const [profileImage, setProfileImage] = useState(null);
  const [imagePublicId, setImagePublicId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [jobRoles, setJobRoles] = useState([]);
  const [jobClasses, setJobClasses] = useState([]);
  const [jobRoleClassWarning, setJobRoleClassWarning] = useState("");
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    nameWithInitials: "",
    fullName: "",
    nic: "",
    dob: "",
    gender: "",
    mstatus: "",
    email: "",
    phone1: "",
    phone2: "",
    address: "",
    jobRole: "",
    jobClass: "",
    jobRoleClass: "",
    permanentStatus: "",
    appointmentType: "",
    careerStartDate: "",
    joinedDate: "",
    retirementDate: "",
    prevRole: "",
    prevWorkplace: "",
    currentClassPromotionDate: "",
    yearsInCurrentClass: "",
    ebExamStatus: "",
    ebExamDate: "",
    hasActiveInquiry: false,
    inquiryReason: "",
    holdIncrement: false,
    holdSalary: false,
    disableEmployment: false,
    careerHistory: [],
    efficiencyBars: [],
    salaryIncrements: [],
  });

  const sectionKeys = Object.keys(EMPLOYEE_FORM_SECTIONS);

  // Helper function to get translated section names
  const getTranslatedSectionName = (key) => {
    const sectionNames = {
      personal: t("employee.form.personal"),
      contact: t("employee.form.contact"),
      employment: t("employee.form.employment"),
      promotionDates: t("employee.form.position"),
      previous: t("employee.form.previous"),
    };
    return sectionNames[key] || key;
  };

  // Auto-fetch job_role_class ID when both jobRole and jobClass are selected
  useEffect(() => {
    if (formData.jobRole && formData.jobClass) {
      setJobRoleClassWarning(""); // Clear previous warning
      axios
        .get(`${API_URL}/auth/job-role-class`, {
          params: {
            jobRoleId: formData.jobRole,
            jobClassId: formData.jobClass,
          },
        })
        .then((result) => {
          if (result.data.success) {
            setFormData((prev) => ({
              ...prev,
              jobRoleClass: result.data.data.id.toString(),
            }));
            setJobRoleClassWarning("");
          }
        })
        .catch((error) => {
          console.error("Error fetching job role class:", error);
          // Reset jobRoleClass if combination not found
          setFormData((prev) => ({
            ...prev,
            jobRoleClass: "",
          }));
          // Find the names for user-friendly message
          const roleName =
            jobRoles.find(
              (r) => r.id.toString() === formData.jobRole.toString(),
            )?.name || "selected role";
          const className =
            jobClasses.find(
              (c) => c.id.toString() === formData.jobClass.toString(),
            )?.name || "selected class";
          setJobRoleClassWarning(
            t("employee.form.combinationWarning", {
              role: roleName,
              class: className,
            }),
          );
        });
    } else {
      // Clear jobRoleClass and warning if either jobRole or jobClass is not selected
      setFormData((prev) => ({
        ...prev,
        jobRoleClass: "",
      }));
      setJobRoleClassWarning("");
    }
  }, [formData.jobRole, formData.jobClass, jobRoles, jobClasses]);

  useEffect(() => {
    if (open) {
      // Fetch job roles
      axios
        .get(`${API_URL}/auth/job-roles`)
        .then((result) => {
          if (result.data.success) setJobRoles(result.data.data);
        })
        .catch((error) => console.error("Error fetching job roles:", error));

      // Fetch job classes
      axios
        .get(`${API_URL}/settings/job-classes`)
        .then((result) => {
          if (result.data.success) setJobClasses(result.data.data);
        })
        .catch((error) => console.error("Error fetching job classes:", error));

      if (mode === "edit" && employee) {
        axios
          .get(`${API_URL}/auth/employee/${employee.id}`)
          .then((result) => {
            if (result.data.success) {
              const emp = result.data.data;
              const currentCareer = emp.careerHistory?.[0] || {};

              // Extract public_id from photo URL for Cloudinary
              if (emp.photo) {
                const urlParts = emp.photo.split("/");
                const publicIdWithExt = urlParts.slice(-2).join("/");
                const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
                setImagePublicId(publicId);
              }

              setProfileImage(emp.photo || null);
              setFormData({
                nameWithInitials: emp.name_with_init || "",
                fullName: emp.full_name || "",
                nic: emp.nic || "",
                dob: formatDateForInput(emp.dob),
                gender: emp.gender || "",
                mstatus: emp.marital_status || "",
                email: emp.email || "",
                phone1: emp.phone1 || "",
                phone2: emp.phone2 || "",
                address: emp.address || "",
                jobRole: currentCareer.fk_job_role_id?.toString() || "",
                jobClass: currentCareer.fk_job_class_id?.toString() || "",
                jobRoleClass:
                  currentCareer.fk_job_role_class_id?.toString() || "",
                permanentStatus: emp.permanent_status || "C",
                appointmentType:
                  currentCareer.appointment_type || "Recruitment",
                careerStartDate: formatDateForInput(emp.career_start_date),
                joinedDate: formatDateForInput(currentCareer.start_date),
                retirementDate: formatDateForInput(emp.retirement_date),
                currentClassPromotionDate: formatDateForInput(
                  currentCareer.current_class_promotion_date,
                ),
                yearsInCurrentClass:
                  currentCareer.current_salary_year_in_phase?.toString() || "",
                ebExamStatus: currentCareer.eb_exam_status || "",
                ebExamDate: formatDateForInput(currentCareer.eb_exam_date),
                hasActiveInquiry:
                  currentCareer.has_active_inquiry === 1 || false,
                inquiryReason: currentCareer.inquiry_reason || "",
                holdIncrement: currentCareer.hold_increment === 1 || false,
                holdSalary: currentCareer.hold_salary === 1 || false,
                disableEmployment:
                  currentCareer.disable_employment === 1 || false,
                prevRole: "",
                prevWorkplace: "",
                promotions: emp.careerHistory
                  ? emp.careerHistory.map((p) => ({
                      ...p,
                      promotion_date: formatDateForInput(p.start_date),
                    }))
                  : [],
                efficiencies: emp.efficiencies
                  ? emp.efficiencies.map((e) => ({
                      ...e,
                      efficiency_date: formatDateForInput(e.cleared_date),
                    }))
                  : [],
              });
            }
          })
          .catch((error) =>
            console.error("Error fetching employee details:", error),
          );
      } else {
        setProfileImage(null);
        setImagePublicId(null);
        setUploadProgress(0);
        setIsUploading(false);
        setFormData({
          nameWithInitials: "",
          fullName: "",
          nic: "",
          dob: "",
          gender: "",
          mstatus: "",
          email: "",
          phone1: "",
          phone2: "",
          address: "",
          jobRole: "",
          jobClass: "",
          permanentStatus: "",
          appointmentType: "",
          careerStartDate: "",
          joinedDate: "",
          retirementDate: "",
          prevRole: "",
          prevWorkplace: "",
          currentClassPromotionDate: "",
          yearsInCurrentClass: "",
          ebExamStatus: "",
          ebExamDate: "",
          hasActiveInquiry: false,
          inquiryReason: "",
          holdIncrement: false,
          holdSalary: false,
          disableEmployment: false,
          careerHistory: [],
          efficiencyBars: [],
          salaryIncrements: [],
        });
        setActiveTab("personal");
      }
    }
  }, [open, employee, mode]);

  // Auto-calculate retirement date when DOB changes (retire at age 60)
  useEffect(() => {
    if (formData.dob) {
      const dobDate = new Date(formData.dob);
      const retirementDate = new Date(dobDate);
      retirementDate.setFullYear(dobDate.getFullYear() + 60);

      setFormData((prev) => ({
        ...prev,
        retirementDate: formatDateForInput(retirementDate),
      }));
    }
  }, [formData.dob]);

  const uploadImage = async (file) => {
    if (!file?.type.startsWith("image/")) return;

    // Validate NIC is filled before upload
    if (!formData.nic || formData.nic.trim() === "") {
      toast.error(t("employee.form.fillNicBeforeUpload"));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const preview = URL.createObjectURL(file);
    setProfileImage(preview);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("image", file);
      uploadFormData.append("employeeNic", formData.nic);

      const { data } = await axios.post(
        `${API_URL}/upload/image`,
        uploadFormData,
        {
          onUploadProgress: (e) =>
            setUploadProgress(Math.round((e.loaded * 100) / e.total)),
        },
      );
      setProfileImage(data.data.url);
      setImagePublicId(data.data.publicId);
    } catch (error) {
      toast.error(t("employee.form.uploadFailed"));
      setProfileImage(null);
      setImagePublicId(null);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async () => {
    if (imagePublicId) {
      try {
        await axios.delete(`${API_URL}/upload/image`, {
          data: { publicId: imagePublicId },
        });
      } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
      }
    }
    setProfileImage(null);
    setImagePublicId(null);
    setUploadProgress(0);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    uploadImage(e.dataTransfer.files[0]);
  };

  const validatePhoneNumber = (phone) => {
    if (!phone || phone.trim() === "") return true; // Allow empty (phone2 is optional)

    // Remove spaces and hyphens
    const cleanPhone = phone.replace(/[\s-]/g, "");

    // Sri Lankan phone number formats:
    // Mobile: 07X XXX XXXX (10 digits starting with 07)
    // Landline: 0XX XXX XXXX (10 digits starting with 0)
    const phoneRegex = /^0\d{9}$/;

    return phoneRegex.test(cleanPhone);
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === "") return true; // Allow empty if not required

    // Standard email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email.trim());
  };

  const isCurrentTabValid = () => {
    const section = EMPLOYEE_FORM_SECTIONS[activeTab];
    if (!section) return true;

    return section.fields.every((field) => {
      if (!field.required) return true;

      // Skip validation for fields with unmet dependencies
      if (field.dependsOn && !formData[field.dependsOn]) {
        return true;
      }

      // Special handling for yearsInClassInput - requires jobRoleClass
      if (field.type === "yearsInClassInput" && !formData.jobRoleClass) {
        return true; // Skip validation if job role class not selected
      }

      // Validate phone numbers
      if (field.id === "phone1" || field.id === "phone2") {
        const phoneValue = formData[field.id];
        if (field.required && (!phoneValue || phoneValue.trim() === "")) {
          return false;
        }
        if (
          phoneValue &&
          phoneValue.trim() !== "" &&
          !validatePhoneNumber(phoneValue)
        ) {
          return false;
        }
        return true;
      }

      // Validate email
      if (field.id === "email") {
        const emailValue = formData[field.id];
        if (field.required && (!emailValue || emailValue.trim() === "")) {
          return false;
        }
        if (
          emailValue &&
          emailValue.trim() !== "" &&
          !validateEmail(emailValue)
        ) {
          return false;
        }
        return true;
      }

      const value = formData[field.id];
      return value && value.toString().trim() !== "";
    });
  };

  const handlePrevious = () => {
    const currentIndex = sectionKeys.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(sectionKeys[currentIndex - 1]);
    } else {
      onOpenChange(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentIndex = sectionKeys.indexOf(activeTab);

    if (currentIndex < sectionKeys.length - 1) {
      if (!isCurrentTabValid()) {
        // Check for specific validation errors
        const section = EMPLOYEE_FORM_SECTIONS[activeTab];
        const hasInvalidPhone = section?.fields.some((field) => {
          if (field.id === "phone1" || field.id === "phone2") {
            const phoneValue = formData[field.id];
            return (
              phoneValue &&
              phoneValue.trim() !== "" &&
              !validatePhoneNumber(phoneValue)
            );
          }
          return false;
        });

        const hasInvalidEmail = section?.fields.some((field) => {
          if (field.id === "email") {
            const emailValue = formData[field.id];
            return (
              emailValue &&
              emailValue.trim() !== "" &&
              !validateEmail(emailValue)
            );
          }
          return false;
        });

        if (hasInvalidPhone) {
          toast.error(
            t("employee.form.invalidPhoneNumber") ||
              "Invalid phone number format. Use 10 digits starting with 0 (e.g., 0771234567)",
          );
        } else if (hasInvalidEmail) {
          toast.error(
            t("employee.form.invalidEmail") ||
              "Invalid email format. Please enter a valid email address.",
          );
        } else {
          toast.error(t("employee.form.requiredFields"));
        }
        return;
      }
      setActiveTab(sectionKeys[currentIndex + 1]);
    } else {
      const employeeData = {
        ...formData,
        profilePhoto: profileImage,
        promotions: JSON.stringify(formData.promotions),
        efficiencies: JSON.stringify(formData.efficiencies),
      };

      const apiCall =
        mode === "edit"
          ? axios.put(`${API_URL}/auth/employee/${employee.id}`, employeeData)
          : axios.post(`${API_URL}/auth/add-employee`, employeeData);

      apiCall
        .then((result) => {
          toast.success(
            mode === "edit"
              ? t("employee.success.updated")
              : t("employee.success.added"),
          );
          onSave(employeeData);
          onOpenChange(false);
        })
        .catch((error) => {
          console.error(
            `Error ${mode === "edit" ? "updating" : "adding"} employee:`,
            error,
          );
          console.error("Error response:", error.response?.data);
          toast.error(
            error.response?.data?.message ||
              (mode === "edit"
                ? t("employee.errors.updateFailed")
                : t("employee.errors.addFailed")),
          );
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? t("employee.form.editEmployee")
              : t("employee.form.addNewEmployee")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 h-auto gap-1 p-1">
              {Object.entries(EMPLOYEE_FORM_SECTIONS).map(([key, section]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="text-xs sm:text-sm"
                >
                  {getTranslatedSectionName(key)}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(EMPLOYEE_FORM_SECTIONS).map(([key, section]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    {key === "personal" && (
                      <div className="flex flex-col items-center mb-6">
                        <div className="relative">
                          <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() =>
                              !profileImage && fileInputRef.current?.click()
                            }
                            className={`cursor-pointer transition-all ${
                              dragActive ? "scale-105" : ""
                            }`}
                          >
                            <Avatar
                              className={`h-32 w-32 border-4 transition-colors ${
                                dragActive
                                  ? "border-primary"
                                  : "border-primary/10"
                              }`}
                            >
                              <AvatarImage src={profileImage} />
                              <AvatarFallback className="text-2xl">
                                {t("employee.form.photo")}
                              </AvatarFallback>
                            </Avatar>
                            {isUploading && (
                              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                <div className="text-white text-sm font-medium">
                                  {uploadProgress}%
                                </div>
                              </div>
                            )}
                            {!profileImage && (
                              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-full shadow-lg">
                                <Upload className="h-4 w-4" />
                              </div>
                            )}
                            {profileImage && !isUploading && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage();
                                }}
                                className="absolute -top-1 -right-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground p-1.5 rounded-full shadow-lg transition-all z-10"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => uploadImage(e.target.files[0])}
                          className="hidden"
                        />
                        {isUploading && (
                          <div className="w-48 mt-4">
                            <Progress value={uploadProgress} className="h-2" />
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {t("employee.form.uploadPhoto")}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {section.fields.map((field) => (
                        <EmployeeFormField
                          key={field.id}
                          field={field}
                          value={formData[field.id]}
                          onChange={(fieldId, value) =>
                            setFormData({ ...formData, [fieldId]: value })
                          }
                          options={
                            field.dataSource === "jobRoles"
                              ? jobRoles
                              : field.dataSource === "jobClasses"
                                ? jobClasses
                                : null
                          }
                          formData={formData}
                          validatePhoneNumber={validatePhoneNumber}
                          validateEmail={validateEmail}
                        />
                      ))}
                    </div>
                    {/* Warning for invalid job role/class combination */}
                    {key === "position" && jobRoleClassWarning && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          {jobRoleClassWarning}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handlePrevious}>
              {activeTab === "personal"
                ? t("common.cancel")
                : t("common.previous")}
            </Button>
            <Button
              type="submit"
              disabled={
                (!isCurrentTabValid() &&
                  sectionKeys.indexOf(activeTab) !== sectionKeys.length - 1) ||
                isUploading
              }
            >
              {sectionKeys.indexOf(activeTab) === sectionKeys.length - 1
                ? mode === "edit"
                  ? t("employee.form.saveChanges")
                  : t("employee.form.addEmployee")
                : t("common.next")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
