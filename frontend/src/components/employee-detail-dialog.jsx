import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Briefcase,
  TrendingUp,
  Award,
  ArrowRightLeft,
  DollarSign,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-CA");
};

const getInitials = (fullName) => {
  if (!fullName) return "";
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function EmployeeDetailDialog({ employee, open, onOpenChange }) {
  const { t } = useTranslation();
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("employee.detail.employeeProfile")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-32 w-32 border-4 border-primary/10">
            <AvatarImage src={employee.profilePhoto} alt={employee.fullName} />
            <AvatarFallback className="text-2xl">
              {getInitials(employee.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h3 className="text-2xl font-bold">
              {employee.name || employee.name_with_init}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {employee.id}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4">
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("employee.detail.personalInfo")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.fullName")}
                  </p>
                  <p className="font-medium">
                    {employee.fullName || employee.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.nic")}
                  </p>
                  <p className="font-medium">{employee.nic}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.dob")}
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(employee.dob)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.gender")}
                  </p>
                  <p className="font-medium">{employee.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.maritalStatus")}
                  </p>
                  <p className="font-medium">
                    {employee.mstatus || employee.marital_status}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t("employee.detail.contactInfo")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.email")}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {employee.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.phone1")}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {employee.phone1}
                  </p>
                </div>
                {employee.phone2 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.detail.phone2")}
                    </p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {employee.phone2}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.address")}
                  </p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {employee.address}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {t("employee.detail.employmentInfo")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.jobRole")}
                  </p>
                  <p className="font-medium">
                    {employee.job_role_name ||
                      employee.jobRole ||
                      employee.role}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.jobClass")}
                  </p>
                  <p className="font-medium">
                    {employee.class_code || t("employee.detail.na")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.salaryScale")}
                  </p>
                  <p className="font-medium">
                    {employee.salary_code || t("employee.detail.na")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.permanentStatus")}
                  </p>
                  <Badge
                    variant={
                      employee.permanent_status === "P"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {employee.permanent_status === "P"
                      ? t("employee.detail.permanent")
                      : t("employee.detail.contract")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.careerStartDate")}
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(employee.career_start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.retirementDate")}
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(employee.retirement_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("employee.detail.positionTracking")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.currentClassPromotionDate")}
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(employee.currentClassPromotionDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.yearsInCurrentClass")}
                  </p>
                  <Badge variant="outline" className="font-mono">
                    {employee.yearsInCurrentClass ||
                      employee.current_salary_year_in_phase ||
                      "0"}{" "}
                    {t("employee.detail.years")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.ebExamStatus")}
                  </p>
                  <Badge
                    variant={
                      employee.ebExamStatus === "EB I" ||
                      employee.ebExamStatus === "EB II" ||
                      employee.ebExamStatus === "EB III"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {employee.ebExamStatus ||
                      employee.eb_exam_status ||
                      t("employee.detail.notDone")}
                  </Badge>
                </div>
                {(employee.ebExamDate || employee.eb_exam_date) && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.detail.ebExamDate")}
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {formatDate(employee.ebExamDate || employee.eb_exam_date)}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    {t("employee.detail.activeInquiry")}
                  </p>
                  {employee.hasActiveInquiry || employee.has_active_inquiry ? (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg mt-1">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          {t("employee.detail.inquiryActive")}
                        </p>
                        {(employee.inquiryReason ||
                          employee.inquiry_reason) && (
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            {employee.inquiryReason || employee.inquiry_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Badge variant="outline" className="mt-1">
                      {t("employee.detail.noActiveInquiry")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t("employee.detail.careerHistory")}
              </h4>
              {employee.promotions && employee.promotions.length > 0 ? (
                <div className="space-y-3">
                  {employee.promotions.map((promo, idx) => (
                    <div key={idx} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">
                            {promo.role_name || `Position ${idx + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {promo.class_code || "Class"} •{" "}
                            {promo.appointment_type || t("employee.detail.na")}
                          </p>
                        </div>
                        <Badge variant="default">
                          {formatDate(promo.promotion_date || promo.start_date)}
                        </Badge>
                      </div>
                      {promo.remarks && (
                        <p className="text-xs text-muted-foreground">
                          {promo.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("employee.detail.noCareerHistory")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="h-4 w-4" />
                {t("employee.detail.efficiencyBarCleared")}
              </h4>
              {employee.efficiencies && employee.efficiencies.length > 0 ? (
                <div className="space-y-3">
                  {employee.efficiencies.map((eff, idx) => (
                    <div key={idx} className="border-l-2 border-green-500 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">
                          {t("employee.detail.efficiencyBar")}{" "}
                          {eff.bar_level || eff.level}
                        </p>
                        <Badge variant="default">
                          {formatDate(eff.efficiency_date || eff.cleared_date)}
                        </Badge>
                      </div>
                      {eff.remarks && (
                        <p className="text-xs text-muted-foreground">
                          {eff.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("employee.detail.noEfficiencyBars")}
                </p>
              )}
            </CardContent>
          </Card>

          {employee.transfers && employee.transfers.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  {t("employee.detail.transferHistory")}
                </h4>
                <div className="space-y-4">
                  {employee.transfers.map((transfer, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-blue-500 pl-4"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("employee.detail.role")}
                          </p>
                          <p className="font-medium text-sm">
                            {transfer.role_name ||
                              transfer.prev_role_name ||
                              transfer.prev_role}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("employee.detail.transferDate")}
                          </p>
                          <p className="font-medium text-sm flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(
                              transfer.transferred_date || transfer.start_date
                            )}
                          </p>
                        </div>
                        {(transfer.prev_workplace || transfer.remarks) && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">
                              {t("employee.detail.details")}
                            </p>
                            <p className="font-medium text-sm">
                              {transfer.prev_workplace || transfer.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
