import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function TransferRequestDialog({ open, onClose }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    transfer_type: "regular",
    to_location: "",
    transfer_date: null,
    reason: "",
    requested_by: "",
    remarks: "",
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/employees`);
      if (response.data.success) {
        setEmployees(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error(
        t("transfer.fetchEmployeesError") || "Failed to fetch employees",
      );
    }
  };

  const handleEmployeeSelect = (empId) => {
    const emp = employees.find((e) => e.id === parseInt(empId));
    setSelectedEmployee(emp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast.error(t("transfer.selectEmployee") || "Please select an employee");
      return;
    }

    if (!formData.to_location.trim()) {
      toast.error(
        t("transfer.toLocationRequired") || "Destination location is required",
      );
      return;
    }

    if (!formData.transfer_date) {
      toast.error(t("transfer.dateRequired") || "Transfer date is required");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/transfer/requests`, {
        fk_emp_id: selectedEmployee.id,
        transfer_type: formData.transfer_type,
        to_location: formData.to_location,
        transfer_date: format(formData.transfer_date, "yyyy-MM-dd"),
        reason: formData.reason,
        requested_by: formData.requested_by,
        remarks: formData.remarks,
      });

      toast.success(
        t("transfer.requestSubmitted") ||
          "Transfer request submitted successfully",
      );
      handleClose(true);
    } catch (error) {
      console.error("Error submitting transfer request:", error);
      toast.error(
        error.response?.data?.message ||
          t("transfer.submitError") ||
          "Failed to submit transfer request",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (refresh = false) => {
    setSelectedEmployee(null);
    setFormData({
      transfer_type: "regular",
      from_location: "",
      to_location: "",
      transfer_date: null,
      reason: "",
      requested_by: "",
      remarks: "",
    });
    onClose(refresh);
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {t("transfer.newTransfer")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>{t("transfer.selectEmployee")}</Label>
            <Select onValueChange={handleEmployeeSelect}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("transfer.selectEmployeePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    <div className="flex items-center gap-2 py-1">
                      {emp.photo ? (
                        <img
                          src={emp.photo}
                          alt={emp.name_with_init || emp.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {(emp.name_with_init || emp.name)?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {emp.name_with_init || emp.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {emp.nic}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEmployee && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mt-2">
                {selectedEmployee.photo ? (
                  <img
                    src={selectedEmployee.photo}
                    alt={
                      selectedEmployee.name_with_init || selectedEmployee.name
                    }
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-medium">
                      {(
                        selectedEmployee.name_with_init || selectedEmployee.name
                      )?.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium">
                    {selectedEmployee.name_with_init || selectedEmployee.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEmployee.job_role_name} - {selectedEmployee.nic}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transfer Type */}
          <div className="space-y-2">
            <Label>{t("transfer.transferType")}</Label>
            <RadioGroup
              value={formData.transfer_type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, transfer_type: value }))
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="regular" id="regular" />
                <Label htmlFor="regular" className="font-normal cursor-pointer">
                  {t("transfer.regular")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pleasant" id="pleasant" />
                <Label
                  htmlFor="pleasant"
                  className="font-normal cursor-pointer"
                >
                  {t("transfer.pleasant")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* To Location */}
          <div className="space-y-2">
            <Label>
              {t("transfer.toLocation")} <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              value={formData.to_location}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  to_location: e.target.value,
                }))
              }
              placeholder={t("transfer.toLocationPlaceholder")}
            />
          </div>

          {/* Transfer Date */}
          <div className="space-y-2">
            <Label>
              {t("transfer.transferDate")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.transfer_date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.transfer_date ? (
                    format(formData.transfer_date, "PPP")
                  ) : (
                    <span>{t("transfer.selectDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.transfer_date}
                  onSelect={(date) =>
                    setFormData((prev) => ({ ...prev, transfer_date: date }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t("transfer.reason")}</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder={t("transfer.reasonPlaceholder")}
              rows={3}
            />
          </div>

          {/* Requested By */}
          <div className="space-y-2">
            <Label>{t("transfer.requestedBy")}</Label>
            <Input
              value={formData.requested_by}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  requested_by: e.target.value,
                }))
              }
              placeholder={t("transfer.requestedByPlaceholder")}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label>{t("transfer.remarks")}</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, remarks: e.target.value }))
              }
              placeholder={t("transfer.remarksPlaceholder")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose()}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("transfer.submitRequest")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
