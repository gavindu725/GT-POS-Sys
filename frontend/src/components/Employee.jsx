import { useState, useEffect } from "react";
import { EmployeeDataTable } from "./employee-data-table";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const Employee = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, [refresh]);

  const fetchEmployees = () => {
    setLoading(true);
    axios
      .get(`${API_URL}/auth/employees`)
      .then((result) => {
        const employees = result.data.data || result.data;
        if (Array.isArray(employees)) {
          const formattedData = employees.map((emp) => ({
            id: emp.id,
            name: emp.name_with_init,
            fullName: emp.full_name,
            role: emp.job_role_name,
            salary_code: emp.salary_code || "N/A",
            phone1: emp.phone1,
            phone2: emp.phone2 || "",
            nic: emp.nic,
            address: emp.address,
            dob: emp.dob,
            gender: emp.gender,
            mstatus: emp.m_status,
            email: emp.email,
            profilePhoto: emp.photo
              ? `data:image/jpeg;base64,${emp.photo}`
              : "",
            permanentStatus:
              emp.permanent_status === "P" ? "Permanent" : "Contract",
            careerStartDate: emp.career_st_date,
            joinedDate: emp.pos_st_date,
            retirementDate: emp.date_of_retire,
            transferredDate: emp.transferred_date,
            prevRole: emp.prev_role,
          }));
          setEmployees(formattedData);
        }
      })
      .catch((error) => {
        console.error("Error fetching employees:", error);
        toast.error(t("employee.errors.loadFailed"));
      })
      .finally(() => setLoading(false));
  };

  return (
    <main className="overflow-y-auto p-5">
      <div className="flex justify-between mb-4">
        <h3 className="text-2xl font-bold">{t("employee.title")}</h3>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">{t("employee.loading")}</p>
        </div>
      ) : (
        <EmployeeDataTable
          data={employees}
          onRefresh={() => setRefresh((prev) => prev + 1)}
        />
      )}
    </main>
  );
};

export default Employee;
