import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Award,
} from "lucide-react";

export function PromotionApprovalDialog({
  application,
  open,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [approvalLevel, setApprovalLevel] = useState("Director General");

  const handleAction = async (action) => {
    if (action === "approved" && !effectiveDate) {
      toast.error(t("promotion.effectiveDateRequired"));
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `/api/promotion-approval/applications/${application.id}/review`,
        {
          action,
          review_remarks: remarks,
          effective_date: action === "approved" ? effectiveDate : null,
          approval_level: approvalLevel,
          reviewed_by_user_id: 1, // TODO: Get from auth context
        },
      );

      const message =
        action === "approved"
          ? t("promotion.applicationApproved")
          : t("promotion.applicationRejected");
      toast.success(message);

      onSuccess?.();
      onClose();

      // Reset form
      setRemarks("");
      setEffectiveDate("");
    } catch (error) {
      console.error("Error reviewing application:", error);
      toast.error(t("promotion.reviewFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t("promotion.reviewApplication")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Application Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <div>
                <div className="font-semibold">{application.employee_name}</div>
                <div className="text-sm text-muted-foreground">
                  {application.employee_nic}
                </div>
              </div>
            </div>
            <Badge
              variant={
                application.application_status === "approved"
                  ? "default"
                  : application.application_status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
            >
              {t(
                `promotion.status${application.application_status.charAt(0).toUpperCase() + application.application_status.slice(1)}`,
              )}
            </Badge>
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.currentPosition")}
              </Label>
              <div className="font-medium">{application.current_role}</div>
              <div className="text-sm text-muted-foreground">
                {application.current_class}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.appliedPosition")}
              </Label>
              <div className="font-medium">{application.applied_role}</div>
              <div className="text-sm text-muted-foreground">
                {application.applied_class}
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.yearsInService")}
              </Label>
              <div className="font-medium">
                {application.years_in_service || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.yearsInCurrentClass")}
              </Label>
              <div className="font-medium">
                {application.years_in_current_class || "N/A"}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.ebExamStatus")}
              </Label>
              <Badge
                variant={
                  application.eb_exam_status === "Passed"
                    ? "default"
                    : "secondary"
                }
              >
                {application.eb_exam_status}
              </Badge>
            </div>
          </div>

          {/* Merit Scores */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-lg font-semibold">
              {t("promotion.meritScores")}
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {t("promotion.meritService")}
                </div>
                <div className="text-2xl font-bold">
                  {application.merit_score_service || 0}
                  <span className="text-sm text-muted-foreground">/30</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {t("promotion.meritQualifications")}
                </div>
                <div className="text-2xl font-bold">
                  {application.merit_score_qualifications || 0}
                  <span className="text-sm text-muted-foreground">/25</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {t("promotion.meritCompetencies")}
                </div>
                <div className="text-2xl font-bold">
                  {application.merit_score_competencies || 0}
                  <span className="text-sm text-muted-foreground">/20</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {t("promotion.meritExperience")}
                </div>
                <div className="text-2xl font-bold">
                  {application.merit_score_experience || 0}
                  <span className="text-sm text-muted-foreground">/20</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">
                  {t("promotion.meritAptitude")}
                </div>
                <div className="text-2xl font-bold">
                  {application.merit_score_aptitude || 0}
                  <span className="text-sm text-muted-foreground">/5</span>
                </div>
              </div>
              <div className="space-y-1 border-l-2 pl-4">
                <div className="text-sm text-muted-foreground font-semibold">
                  {t("promotion.totalScore")}
                </div>
                <div className="text-3xl font-bold text-primary">
                  {application.merit_score_total || 0}
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Justification */}
          {application.justification && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.justification")}
              </Label>
              <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap">
                {application.justification}
              </div>
            </div>
          )}

          {/* Qualifications */}
          {application.qualification_details && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.qualificationDetails")}
              </Label>
              <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap">
                {application.qualification_details}
              </div>
            </div>
          )}

          {/* Experience */}
          {application.experience_details && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {t("promotion.experienceDetails")}
              </Label>
              <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap">
                {application.experience_details}
              </div>
            </div>
          )}

          {/* Application Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {t("promotion.applicationDate")}:{" "}
            {new Date(application.application_date).toLocaleDateString()}
          </div>

          {/* Review Section */}
          {application.application_status === "pending" && (
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-lg font-semibold">
                {t("promotion.reviewSection")}
              </Label>

              {/* Effective Date */}
              <div className="space-y-2">
                <Label>{t("promotion.effectiveDate")} *</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {/* Approval Level */}
              <div className="space-y-2">
                <Label>{t("promotion.approvalLevel")}</Label>
                <Input
                  value={approvalLevel}
                  onChange={(e) => setApprovalLevel(e.target.value)}
                  placeholder="e.g., Director General, PSC"
                />
              </div>

              {/* Review Remarks */}
              <div className="space-y-2">
                <Label>{t("promotion.remarks")}</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  placeholder={t("promotion.remarksPlaceholder")}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>

          {application.application_status === "pending" && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleAction("rejected")}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" />
                {t("promotion.reject")}
              </Button>
              <Button
                onClick={() => handleAction("approved")}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                {t("promotion.approve")}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
