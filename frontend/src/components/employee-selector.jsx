import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

export function EmployeeSelector({
  selectedEmployee,
  onSelect,
  disabled = false,
}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = () => {
    setLoading(true);
    axios
      .get(`${API_URL}/auth/employees`)
      .then((result) => {
        if (result.data.success) {
          const formattedEmployees = result.data.data.map((emp) => ({
            id: emp.id,
            name: emp.name_with_init,
            fullName: emp.full_name,
            role: emp.job_role_name,
            nic: emp.nic,
            photo: emp.photo,
          }));
          setEmployees(formattedEmployees);
        }
      })
      .catch((error) => {
        console.error("Error fetching employees:", error);
        toast.error("Failed to load employees");
      })
      .finally(() => setLoading(false));
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Select
      value={selectedEmployee?.id?.toString() || ""}
      onValueChange={(value) => {
        const employee = employees.find((emp) => emp.id.toString() === value);
        onSelect(employee);
      }}
      disabled={disabled || loading}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={loading ? "Loading employees..." : "Select an employee"}
        >
          {selectedEmployee && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={selectedEmployee.photo}
                  alt={selectedEmployee.name}
                />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedEmployee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {selectedEmployee.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedEmployee.role}
                </span>
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {employees.map((employee) => (
          <SelectItem key={employee.id} value={employee.id.toString()}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={employee.photo} alt={employee.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{employee.name}</span>
                <span className="text-xs text-muted-foreground">
                  {employee.role} • {employee.nic}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
