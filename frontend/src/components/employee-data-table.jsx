import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Plus, ChevronDown, Search, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { EmployeeDetailDialog } from "./employee-detail-dialog";
import { EmployeeForm } from "./employee-form";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { createColumns } from "./employee-columns";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

export function EmployeeDataTable({ data, onRefresh }) {
  const { t } = useTranslation();
  // Dialog states
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [formMode, setFormMode] = useState("add");

  // Table states
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [filterType, setFilterType] = useState("name");
  const [filterValue, setFilterValue] = useState("");

  // Action handlers
  const handleViewDetail = (employee) => {
    axios
      .get(`${API_URL}/auth/employee/${employee.id}`)
      .then((result) => {
        if (result.data.success) {
          const emp = result.data.data;
          const currentCareer = emp.careerHistory?.[0] || {};
          const formatDate = (date) =>
            date ? new Date(date).toISOString().split("T")[0] : null;

          setSelectedEmployee({
            // Basic employee info
            id: emp.id,
            name: emp.name_with_init,
            fullName: emp.full_name,
            nic: emp.nic,
            dob: emp.dob,
            gender: emp.gender,
            mstatus: emp.marital_status,
            email: emp.email,
            phone1: emp.phone1,
            phone2: emp.phone2,
            address: emp.address,
            profilePhoto: emp.photo,

            // Employment info
            job_role_name: currentCareer.role_name || employee.job_role_name,
            class_code: currentCareer.class_code || employee.class_code,
            salary_code: currentCareer.salary_code || employee.salary_code,
            permanent_status: emp.permanent_status,
            career_start_date: emp.career_start_date,
            retirement_date: emp.retirement_date,

            // Position tracking fields
            currentClassPromotionDate:
              currentCareer.current_class_promotion_date,
            yearsInCurrentClass: currentCareer.current_salary_year_in_phase,
            ebExamStatus: currentCareer.eb_exam_status,
            ebExamDate: currentCareer.eb_exam_date,
            hasActiveInquiry: currentCareer.has_active_inquiry === 1,
            inquiryReason: currentCareer.inquiry_reason,

            // History arrays
            promotions: emp.careerHistory
              ? emp.careerHistory.map((p) => ({
                  ...p,
                  promotion_date: formatDate(p.start_date),
                }))
              : [],
            efficiencies: emp.efficiencies
              ? emp.efficiencies.map((e) => ({
                  ...e,
                  efficiency_date: formatDate(e.cleared_date),
                }))
              : [],
            transfers: emp.careerHistory
              ? emp.careerHistory
                  .filter((c) => c.appointment_type !== "Recruitment")
                  .map((t) => ({
                    ...t,
                    transferred_date: formatDate(t.start_date),
                  }))
              : [],
          });
          setDialogOpen(true);
        }
      })
      .catch((error) =>
        console.error("Error fetching employee details:", error),
      );
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormMode("edit");
    setFormDialogOpen(true);
  };

  const handleSave = (updatedEmployee) => {
    onRefresh();
  };

  const handleAdd = (newEmployee) => {
    onRefresh();
  };

  const handleDelete = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedEmployees = selectedRows.map((row) => row.original);
    setEmployeeToDelete(selectedEmployees);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      if (Array.isArray(employeeToDelete)) {
        // Bulk delete
        const deletePromises = employeeToDelete.map((emp) =>
          axios.delete(`${API_URL}/auth/employee/${emp.id}`, {
            withCredentials: true,
          }),
        );
        await Promise.all(deletePromises);
        toast.success(
          `${employeeToDelete.length} employees deleted successfully`,
        );
        table.resetRowSelection();
      } else {
        // Single delete
        const response = await axios.delete(
          `${API_URL}/auth/employee/${employeeToDelete.id}`,
          {
            withCredentials: true,
          },
        );
        if (response.data.success) {
          toast.success("Employee deleted successfully");
        } else {
          toast.error(response.data.message || "Failed to delete employee");
        }
      }
      onRefresh();
    } catch (error) {
      console.error("Error deleting employee(s):", error);
      toast.error(
        error.response?.data?.message || "Failed to delete employee(s)",
      );
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  // Initialize table with columns and features
  const columns = createColumns(handleViewDetail, handleEdit, handleDelete);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  });

  return (
    <>
      {/* Toolbar: Search, Column Visibility, Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2 flex-1">
          <Select
            value={filterType}
            onValueChange={(value) => {
              setFilterType(value);
              table.getColumn("name")?.setFilterValue("");
              table.getColumn("nic")?.setFilterValue("");
              setFilterValue("");
            }}
          >
            <SelectTrigger className="w-[100px] sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t("employee.filterByName")}</SelectItem>
              <SelectItem value="nic">{t("employee.filterByNic")}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.filters", { type: filterType })}
              value={filterValue}
              onChange={(e) => {
                setFilterValue(e.target.value);
                table.getColumn(filterType)?.setFilterValue(e.target.value);
              }}
              className="pl-8 w-full sm:w-[250px]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                {t("common.columns")} <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  >
                    {col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {table.getFilteredSelectedRowModel().rows.length > 0 ? (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="flex-1 sm:flex-initial"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">
                {t("employee.deleteMultiple", {
                  count: table.getFilteredSelectedRowModel().rows.length,
                })}
              </span>
              <span className="sm:hidden">
                {t("common.delete")} (
                {table.getFilteredSelectedRowModel().rows.length})
              </span>
            </Button>
          ) : (
            <Button
              onClick={() => {
                setSelectedEmployee(null);
                setFormMode("add");
                setFormDialogOpen(true);
              }}
              className="flex-1 sm:flex-initial"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">
                {t("employee.addEmployee")}
              </span>
              <span className="sm:hidden">{t("common.add")}</span>
            </Button>
          )}
        </div>
      </div>
      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("employee.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} {t("common.of")}{" "}
          {table.getFilteredRowModel().rows.length} {t("common.selected")}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("common.previous")}
          </Button>
          <div className="text-sm">
            {t("common.page")} {table.getState().pagination.pageIndex + 1}{" "}
            {t("common.of")} {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>
      {/* Dialogs */}
      <EmployeeDetailDialog
        employee={selectedEmployee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <EmployeeForm
        employee={selectedEmployee}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSave={handleSave}
        mode={formMode}
      />
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        description={
          employeeToDelete
            ? Array.isArray(employeeToDelete)
              ? t("employee.deleteMultipleConfirm", {
                  count: employeeToDelete.length,
                })
              : t("employee.deleteConfirm", { name: employeeToDelete.name })
            : ""
        }
      />
    </>
  );
}
