import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useEffect, useState } from "react";
import axios from "../utils/axios";
import { API_URL } from "@/lib/api";
import { useTranslation } from "react-i18next";

export function EmployeeFormField({
  field,
  value,
  onChange,
  options = [],
  formData = {},
  validatePhoneNumber,
  validateEmail,
}) {
  const { t } = useTranslation();
  const [currentSalaryInfo, setCurrentSalaryInfo] = useState(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [salaryError, setSalaryError] = useState(null);

  // Helper function to get translated field label
  const getFieldLabel = (fieldId) => {
    const labelMap = {
      nameWithInitials: t("employee.form.nameWithInitials"),
      fullName: t("employee.form.fullName"),
      nic: t("employee.form.nic"),
      dob: t("employee.form.dob"),
      gender: t("employee.form.gender"),
      mstatus: t("employee.form.maritalStatus"),
      email: t("employee.form.email"),
      phone1: t("employee.form.phone1"),
      phone2: t("employee.form.phone2"),
      address: t("employee.form.address"),
      jobRole: t("employee.form.jobRole"),
      jobClass: t("employee.form.jobClass"),
      permanentStatus: t("employee.form.permanentStatus"),
      careerStartDate: t("employee.form.careerStartDate"),
      joinedDate: t("employee.form.joinedDate"),
      appointmentType: t("employee.form.appointmentType"),
      retirementDate: t("employee.form.retirementDate"),
      currentClassPromotionDate: t("employee.form.currentClassPromotionDate"),
      yearsInCurrentClass: t("employee.form.yearsInCurrentClass"),
      ebExamStatus: t("employee.form.ebExamStatus"),
      ebExamDate: t("employee.form.ebExamDate"),
      hasActiveInquiry: t("employee.form.hasActiveInquiry"),
      inquiryReason: t("employee.form.inquiryReason"),
      holdIncrement: t("employee.form.holdIncrement"),
      holdSalary: t("employee.form.holdSalary"),
      disableEmployment: t("employee.form.disableEmployment"),
      prevRole: t("employee.form.prevRole"),
      prevWorkplace: t("employee.form.prevWorkplace"),
    };
    return labelMap[fieldId] || field.label;
  };

  // Helper function to get translated placeholder
  const getFieldPlaceholder = (fieldId) => {
    const placeholderMap = {
      nameWithInitials: t("employee.form.nameWithInitialsPlaceholder"),
      yearsInCurrentClass: t("employee.form.yearsInCurrentClassPlaceholder"),
      inquiryReason: t("employee.form.inquiryReasonPlaceholder"),
    };
    return placeholderMap[fieldId] || field.placeholder;
  };

  // Helper function to get translated description
  const getFieldDescription = (fieldId) => {
    const descMap = {
      currentClassPromotionDate: t(
        "employee.form.currentClassPromotionDateDesc",
      ),
      yearsInCurrentClass: t("employee.form.yearsInCurrentClassDesc"),
      ebExamStatus: t("employee.form.ebExamStatusDesc"),
      ebExamDate: t("employee.form.ebExamDateDesc"),
      hasActiveInquiry: t("employee.form.hasActiveInquiryDesc"),
      inquiryReason: t("employee.form.inquiryReasonDesc"),
      holdIncrement: t("employee.form.holdIncrementDesc"),
      holdSalary: t("employee.form.holdSalaryDesc"),
      disableEmployment: t("employee.form.disableEmploymentDesc"),
    };
    return descMap[fieldId] || field.description;
  };

  // Helper function to translate select options
  const getTranslatedOptions = (fieldId) => {
    const optionsMap = {
      gender: [
        { value: "Male", label: t("employee.form.male") },
        { value: "Female", label: t("employee.form.female") },
      ],
      mstatus: [
        { value: "Single", label: t("employee.form.single") },
        { value: "Married", label: t("employee.form.married") },
      ],
      permanentStatus: [
        { value: "P", label: t("employee.form.permanent") },
        { value: "C", label: t("employee.form.contract") },
      ],
      appointmentType: [
        { value: "Recruitment", label: t("employee.form.recruitment") },
        { value: "Promotion", label: t("employee.form.promotion") },
        { value: "Transfer", label: t("employee.form.transfer") },
        { value: "Re-designation", label: t("employee.form.reDesignation") },
      ],
      ebExamStatus: [
        { value: "Not Done", label: t("employee.form.notDone") },
        { value: "EB I", label: t("employee.form.ebICleared") },
        { value: "EB II", label: t("employee.form.ebIICleared") },
        { value: "EB III", label: t("employee.form.ebIIICleared") },
      ],
    };
    return optionsMap[fieldId] || field.options;
  };

  // Calculate salary when years and jobRoleClass change
  useEffect(() => {
    if (field.type === "yearsInClassInput") {
      // Reset states
      setSalaryError(null);
      setCurrentSalaryInfo(null);

      // Validate inputs
      if (!formData.jobRoleClass) {
        return;
      }

      const years = formData.yearsInCurrentClass;
      if (!years || years === "") {
        return;
      }

      const yearsNum = parseInt(years);
      if (isNaN(yearsNum)) {
        setSalaryError("Please enter a valid number");
        return;
      }

      if (yearsNum < 0) {
        setSalaryError("Years cannot be negative");
        return;
      }

      if (yearsNum > 40) {
        setSalaryError("Years cannot exceed 40");
        return;
      }

      // All validations passed, calculate salary
      setLoadingSalary(true);
      axios
        .post(`${API_URL}/salary/calculate-from-years`, {
          jobRoleClassId: formData.jobRoleClass,
          totalYears: yearsNum,
          promotionDate: formData.currentClassPromotionDate || null,
        })
        .then((result) => {
          if (result.data.success) {
            setCurrentSalaryInfo(result.data.data);
            setSalaryError(null);
          } else {
            setSalaryError(result.data.message || "Failed to calculate salary");
          }
        })
        .catch((error) => {
          console.error("Error calculating salary:", error);
          const errorMsg =
            error.response?.data?.message ||
            "Unable to calculate salary. Please check your input.";
          setSalaryError(errorMsg);
          setCurrentSalaryInfo(null);
        })
        .finally(() => setLoadingSalary(false));
    }
  }, [
    field.type,
    formData.yearsInCurrentClass,
    formData.jobRoleClass,
    formData.currentClassPromotionDate,
  ]);

  const renderField = () => {
    // Check if phone number validation is needed
    const isPhoneField = field.id === "phone1" || field.id === "phone2";
    const isPhoneInvalid =
      isPhoneField &&
      value &&
      value.trim() !== "" &&
      validatePhoneNumber &&
      !validatePhoneNumber(value);

    // Check if email validation is needed
    const isEmailField = field.id === "email";
    const isEmailInvalid =
      isEmailField &&
      value &&
      value.trim() !== "" &&
      validateEmail &&
      !validateEmail(value);

    switch (field.type) {
      case "text":
      case "email":
      case "date":
      case "number":
        return (
          <div>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={value || ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              required={field.required}
              min={field.type === "number" ? 1 : undefined}
              max={field.type === "number" ? 40 : undefined}
              className={
                isPhoneInvalid || isEmailInvalid ? "border-destructive" : ""
              }
            />
            {isPhoneInvalid && (
              <p className="text-xs text-destructive mt-1">
                {t("employee.form.phoneFormatError") ||
                  "Invalid format. Use 10 digits starting with 0 (e.g., 0771234567)"}
              </p>
            )}
            {isEmailInvalid && (
              <p className="text-xs text-destructive mt-1">
                {t("employee.form.emailFormatError") ||
                  "Invalid email format. Please enter a valid email address."}
              </p>
            )}
          </div>
        );

      case "textarea":
        // Only show if dependency is met
        if (field.dependsOn && !formData[field.dependsOn]) {
          return null;
        }
        return (
          <Textarea
            id={field.id}
            placeholder={getFieldPlaceholder(field.id)}
            value={value || ""}
            onChange={(e) => onChange(field.id, e.target.value)}
            required={field.required}
            rows={field.rows || 3}
          />
        );

      case "switch":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => {
                onChange(field.id, checked);
                // Clear inquiry reason when switch is turned off
                if (!checked && formData.inquiryReason) {
                  onChange("inquiryReason", "");
                }
              }}
            />
            <Label htmlFor={field.id} className="cursor-pointer">
              {value ? "Yes - Inquiry Active" : "No Inquiry"}
            </Label>
          </div>
        );

      case "yearsInClassInput":
        if (!formData.jobRoleClass) {
          return (
            <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
              <p className="text-sm font-medium">
                Please select Job Role and Job Class first
              </p>
              <p className="text-xs mt-1">
                Salary calculations will be available after selection
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            <Input
              id={field.id}
              type="number"
              min="0"
              max="40"
              placeholder={field.placeholder || "e.g., 5"}
              value={value || ""}
              onChange={(e) => onChange(field.id, e.target.value)}
              required={field.required}
            />

            {loadingSalary && (
              <div className="p-4 border rounded-lg text-center text-muted-foreground">
                <p className="text-sm">Calculating salary...</p>
              </div>
            )}

            {salaryError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {salaryError}
                </p>
              </div>
            )}

            {currentSalaryInfo && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm font-medium">
                    Current Basic Salary:
                  </span>
                  <span className="text-sm font-bold text-primary">
                    Rs.{" "}
                    {parseFloat(
                      currentSalaryInfo.current_basic_salary,
                    ).toLocaleString()}
                  </span>
                </div>

                {currentSalaryInfo.current_phase && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      Current Phase:
                    </span>
                    <span className="font-medium">
                      Phase {currentSalaryInfo.current_phase.phase_order}, Year{" "}
                      {currentSalaryInfo.current_phase.year_in_phase} of{" "}
                      {currentSalaryInfo.current_phase.phase_years}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    Annual Increment:
                  </span>
                  <span>
                    Rs.{" "}
                    {parseFloat(
                      currentSalaryInfo.annual_increment,
                    ).toLocaleString()}
                    /year
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    After Next Increment:
                  </span>
                  <span className="font-semibold">
                    Rs.{" "}
                    {parseFloat(
                      currentSalaryInfo.next_basic_salary,
                    ).toLocaleString()}
                  </span>
                </div>

                {currentSalaryInfo.next_increment_date && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Next Increment Date:
                        </span>
                        <span className="text-xs font-medium">
                          {new Date(
                            currentSalaryInfo.next_increment_date,
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {currentSalaryInfo.is_eligible_now ? (
                        <div className="mt-1 p-2 bg-green-100 dark:bg-green-900 rounded text-center">
                          <span className="text-xs font-semibold text-green-800 dark:text-green-200">
                            ✓ Eligible for increment now!
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-center">
                          <span className="text-xs text-muted-foreground">
                            Eligible in {currentSalaryInfo.days_until_increment}{" "}
                            days
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!formData.currentClassPromotionDate && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 text-center">
                      Enter promotion date to see next increment eligibility
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "select":
        const selectOptions = field.dataSource
          ? options
          : getTranslatedOptions(field.id);
        const isDataSource =
          field.dataSource === "jobRoles" || field.dataSource === "jobClasses";

        // Check if this is a conditional field that depends on another field
        if (field.conditional && field.id === "ebExamDate") {
          const ebStatus = formData?.ebExamStatus;
          if (!ebStatus || ebStatus === "Not Done") {
            return (
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                <p className="text-sm">
                  EB exam date will be enabled after selecting EB status
                </p>
              </div>
            );
          }
        }

        return (
          <Select
            value={value || ""}
            onValueChange={(val) => onChange(field.id, val)}
            required={field.required}
            disabled={field.disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={`Select ${field.label.toLowerCase()}`}
                className="truncate"
              />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem
                  key={isDataSource ? option.id : option.value}
                  value={isDataSource ? option.id.toString() : option.value}
                  className="cursor-pointer"
                >
                  <span
                    className="block truncate"
                    title={
                      isDataSource
                        ? option.name || option.class_code
                        : option.label
                    }
                  >
                    {isDataSource
                      ? option.name || option.class_code
                      : option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "dynamic":
        return (
          <div className="space-y-4 col-span-2">
            {field.levels.map((level) => {
              const item = value?.find((v) => v.level === level);
              const dateField =
                field.id === "promotions"
                  ? "promotion_date"
                  : "efficiency_date";

              return (
                <div key={level} className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Class {level}</Label>
                    <Input
                      type="date"
                      value={item?.[dateField] || ""}
                      onChange={(e) => {
                        const newValue = (value || []).filter(
                          (v) => v.level !== level,
                        );
                        if (e.target.value) {
                          newValue.push({
                            level,
                            [dateField]: e.target.value,
                            remarks: item?.remarks || "",
                          });
                        }
                        onChange(field.id, newValue);
                      }}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Remarks</Label>
                    <Input
                      value={item?.remarks || ""}
                      onChange={(e) => {
                        const newValue = (value || []).map((v) =>
                          v.level === level
                            ? { ...v, remarks: e.target.value }
                            : v,
                        );
                        onChange(field.id, newValue);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  if (field.type === "dynamic") {
    return renderField();
  }

  // Don't render if field depends on another field that isn't set
  if (field.dependsOn && !formData[field.dependsOn]) {
    return null;
  }

  // Show description if available
  const hasDescription = field.description && !field.fullWidth;

  return (
    <div className={`space-y-2 ${field.fullWidth ? "col-span-2" : ""}`}>
      <Label htmlFor={field.id}>
        {getFieldLabel(field.id)}{" "}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      {renderField()}
      {hasDescription && (
        <p className="text-xs text-muted-foreground">
          {getFieldDescription(field.id)}
        </p>
      )}
    </div>
  );
}
