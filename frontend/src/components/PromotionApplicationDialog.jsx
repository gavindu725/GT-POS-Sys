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
import { useTranslation } from "react-i18next";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PromotionApplicationDialog({
  employee,
  open,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    justification: "",
    qualifications: "",
    experience: "",
    meritScores: {
      service: 0,
      qualifications: 0,
      competencies: 0,
      experience: 0,
      aptitude: 0,
    },
  });

  const totalScore = Object.values(formData.meritScores).reduce(
    (a, b) => a + b,
    0,
  );

  const handleSubmit = async () => {
    if (!formData.justification.trim()) {
      toast.error(t("promotion.justificationRequired"));
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/promotion-approval/applications", {
        fk_emp_id: employee.id,
        fk_current_role_class_id: employee.current_role_class_id,
        fk_applied_role_class_id: employee.next_role_class_id,
        justification: formData.justification,
        years_in_service: employee.total_years,
        years_in_current_class: employee.years_in_class,
        qualification_details: formData.qualifications,
        experience_details: formData.experience,
        merit_scores: formData.meritScores,
        eb_exam_status: employee.eb_exam_status || "Not Required",
        eb_exam_date: employee.eb_exam_date || null,
      });

      toast.success(t("promotion.applicationSubmitted"));
      onSuccess?.();
      onClose();

      // Reset form
      setFormData({
        justification: "",
        qualifications: "",
        experience: "",
        meritScores: {
          service: 0,
          qualifications: 0,
          competencies: 0,
          experience: 0,
          aptitude: 0,
        },
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error(t("promotion.applicationFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("promotion.applyForPromotion")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">
                {t("promotion.employeeName")}:
              </span>
              <span>{employee.name_with_init}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t("promotion.employeeNIC")}:</span>
              <span>{employee.employee_nic}</span>
            </div>
          </div>

          {/* Current Position */}
          <div className="space-y-2">
            <Label>{t("promotion.currentPosition")}</Label>
            <Input
              disabled
              value={`${employee.current_role} - ${employee.current_class}`}
            />
          </div>

          {/* Applied Position */}
          <div className="space-y-2">
            <Label>{t("promotion.appliedPosition")}</Label>
            <Input
              disabled
              value={`${employee.next_role} - ${employee.next_class}`}
            />
          </div>

          {/* Service Years */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("promotion.yearsInService")}</Label>
              <Input disabled value={employee.total_years || "N/A"} />
            </div>
            <div className="space-y-2">
              <Label>{t("promotion.yearsInCurrentClass")}</Label>
              <Input disabled value={employee.years_in_class || "N/A"} />
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label>{t("promotion.justification")} *</Label>
            <Textarea
              value={formData.justification}
              onChange={(e) =>
                setFormData({ ...formData, justification: e.target.value })
              }
              rows={4}
              placeholder={t("promotion.justificationPlaceholder")}
            />
          </div>

          {/* Qualifications */}
          <div className="space-y-2">
            <Label>{t("promotion.qualificationDetails")}</Label>
            <Textarea
              value={formData.qualifications}
              onChange={(e) =>
                setFormData({ ...formData, qualifications: e.target.value })
              }
              rows={3}
              placeholder={t("promotion.qualificationPlaceholder")}
            />
          </div>

          {/* Experience */}
          <div className="space-y-2">
            <Label>{t("promotion.experienceDetails")}</Label>
            <Textarea
              value={formData.experience}
              onChange={(e) =>
                setFormData({ ...formData, experience: e.target.value })
              }
              rows={3}
              placeholder={t("promotion.experiencePlaceholder")}
            />
          </div>

          {/* Merit Scores */}
          <div className="space-y-3">
            <Label className="text-lg font-semibold">
              {t("promotion.meritScores")}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("promotion.meritService")} (0-30)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={formData.meritScores.service}
                  onChange={(e) => {
                    const val = Math.min(
                      30,
                      Math.max(0, Number(e.target.value)),
                    );
                    setFormData({
                      ...formData,
                      meritScores: { ...formData.meritScores, service: val },
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("promotion.meritQualifications")} (0-25)</Label>
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={formData.meritScores.qualifications}
                  onChange={(e) => {
                    const val = Math.min(
                      25,
                      Math.max(0, Number(e.target.value)),
                    );
                    setFormData({
                      ...formData,
                      meritScores: {
                        ...formData.meritScores,
                        qualifications: val,
                      },
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("promotion.meritCompetencies")} (0-20)</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={formData.meritScores.competencies}
                  onChange={(e) => {
                    const val = Math.min(
                      20,
                      Math.max(0, Number(e.target.value)),
                    );
                    setFormData({
                      ...formData,
                      meritScores: {
                        ...formData.meritScores,
                        competencies: val,
                      },
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("promotion.meritExperience")} (0-20)</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={formData.meritScores.experience}
                  onChange={(e) => {
                    const val = Math.min(
                      20,
                      Math.max(0, Number(e.target.value)),
                    );
                    setFormData({
                      ...formData,
                      meritScores: { ...formData.meritScores, experience: val },
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("promotion.meritAptitude")} (0-5)</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={formData.meritScores.aptitude}
                  onChange={(e) => {
                    const val = Math.min(
                      5,
                      Math.max(0, Number(e.target.value)),
                    );
                    setFormData({
                      ...formData,
                      meritScores: { ...formData.meritScores, aptitude: val },
                    });
                  }}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="w-full">
                  <Label className="font-semibold">
                    {t("promotion.totalScore")}
                  </Label>
                  <Input
                    disabled
                    value={`${totalScore} / 100`}
                    className="font-bold text-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* EB Status */}
          {employee.eb_exam_status && (
            <div className="space-y-2">
              <Label>{t("promotion.ebExamStatus")}</Label>
              <Input disabled value={employee.eb_exam_status} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("promotion.submitApplication")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
