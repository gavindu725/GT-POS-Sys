import { useState, useMemo, useEffect } from "react";
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
import { Checkbox } from "./ui/checkbox";
import {
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "./ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useTranslation } from "react-i18next";

export function AdditionalInfoTable({ data, onEdit, onDelete, onBulkDelete }) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [filterType, setFilterType] = useState("employeeName");
  const [filterValue, setFilterValue] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [documentCategories, setDocumentCategories] = useState({});
  const [allDocumentTypes, setAllDocumentTypes] = useState([]);

  // Fetch document categories from API
  useEffect(() => {
    const fetchDocumentCategories = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/document-types/categories`,
        );
        setDocumentCategories(response.data);

        // Flatten all document types for filtering
        const types = [];
        Object.values(response.data).forEach((category) => {
          category.documents.forEach((doc) => {
            types.push({ id: doc.id, name: doc.name });
          });
        });
        setAllDocumentTypes(types.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching document categories:", error);
      }
    };

    fetchDocumentCategories();
  }, []);

  const getDocumentName = (typeId) => {
    for (const category of Object.values(documentCategories)) {
      const doc = category.documents.find((d) => d.id === typeId);
      if (doc) return doc.name;
    }
    return "Unknown Document";
  };

  const documentTypes = useMemo(() => {
    return allDocumentTypes;
  }, [allDocumentTypes]);

  const flattenedData = useMemo(() => {
    const rows = [];
    data.forEach((emp) => {
      if (emp.documents && emp.documents.length > 0) {
        emp.documents.forEach((doc) => {
          rows.push({
            id: doc.id,
            employeeId: emp.id,
            employeeName: emp.employeeName,
            employeeNIC: emp.employeeNIC,
            role: emp.role,
            documentTypeId: doc.fk_document_type_id,
            documentName: getDocumentName(doc.fk_document_type_id),
            page: doc.page_count || "-",
            cloudinaryUrl: doc.cloudinary_url,
            uploadedAt: doc.uploaded_at,
            employeeData: emp,
          });
        });
      }
    });
    return rows;
  }, [data, documentCategories]);

  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "employeeName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("additionalInfo.employee")}{" "}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "employeeNIC",
      header: t("employee.detail.nic"),
    },
    {
      accessorKey: "documentName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("additionalInfo.document")}{" "}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "page",
      header: t("additionalInfo.pageNo"),
    },
    {
      accessorKey: "cloudinaryUrl",
      header: t("additionalInfo.file"),
      cell: ({ row }) => {
        const url = row.getValue("cloudinaryUrl");
        return url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Badge
              variant="outline"
              className="gap-1 cursor-pointer hover:bg-accent"
            >
              <ExternalLink className="h-3 w-3" />
              {t("additionalInfo.view")}
            </Badge>
          </a>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground">
            {t("additionalInfo.noFile")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "uploadedAt",
      header: t("additionalInfo.uploaded"),
      cell: ({ row }) => {
        const date = row.getValue("uploadedAt");
        return date ? new Date(date).toLocaleDateString() : "N/A";
      },
    },
    {
      id: "actions",
      header: () => (
        <div className="text-right">{t("additionalInfo.actions")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEdit(row.original.employeeData)}
              >
                <Pencil className="mr-2 h-4 w-4" /> {t("additionalInfo.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(row.original.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> {t("additionalInfo.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: flattenedData,
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

  const handleBulkDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedDocuments = selectedRows.map((row) => row.original.id);
    onBulkDelete(selectedDocuments);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Select
            value={filterType}
            onValueChange={(value) => {
              setFilterType(value);
              table.getColumn("employeeName")?.setFilterValue("");
              table.getColumn("employeeNIC")?.setFilterValue("");
              setFilterValue("");
            }}
          >
            <SelectTrigger className="w-[100px] sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employeeName">Name</SelectItem>
              <SelectItem value="employeeNIC">NIC</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Filter by ${
                filterType === "employeeName" ? "name" : "NIC"
              }...`}
              value={filterValue}
              onChange={(e) => {
                setFilterValue(e.target.value);
                table.getColumn(filterType)?.setFilterValue(e.target.value);
              }}
              className="pl-8 w-full sm:w-[250px]"
            />
          </div>
          <div className="flex items-center gap-1 flex-1 sm:flex-initial">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-[200px] justify-start text-left overflow-hidden"
                >
                  <span className="truncate">
                    {documentTypeFilter || "Filter by document"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search document..." />
                  <CommandList>
                    <CommandEmpty>No document found.</CommandEmpty>
                    <CommandGroup>
                      {documentTypes.map((doc) => (
                        <CommandItem
                          key={doc.id}
                          value={doc.name}
                          onSelect={(value) => {
                            setDocumentTypeFilter(value);
                            table
                              .getColumn("documentName")
                              ?.setFilterValue(value);
                            setPopoverOpen(false);
                          }}
                        >
                          {doc.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {documentTypeFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 shrink-0"
                onClick={() => {
                  setDocumentTypeFilter("");
                  table.getColumn("documentName")?.setFilterValue("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                {t("additionalInfo.columns")}{" "}
                <ChevronDown className="ml-2 h-4 w-4" />
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
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              className="flex-1 sm:flex-initial"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">
                {t("additionalInfo.deleteSelected")} (
                {table.getFilteredSelectedRowModel().rows.length})
              </span>
              <span className="sm:hidden">
                {t("common.delete")} (
                {table.getFilteredSelectedRowModel().rows.length})
              </span>
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
                <TableRow key={row.id}>
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
                  {t("additionalInfo.noDocumentsFound")}
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
          {table.getFilteredRowModel().rows.length}{" "}
          {t("additionalInfo.rowsSelected")}
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
    </>
  );
}
