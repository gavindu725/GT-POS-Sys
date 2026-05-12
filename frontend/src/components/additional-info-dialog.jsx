import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import { EmployeeSelector } from "./employee-selector";
import { DocumentCategoryForm } from "./document-category-form";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function AdditionalInfoDialog({
  open,
  onOpenChange,
  onSave,
  employee,
  mode = "add",
  existingDocuments = [],
}) {
  const { t } = useTranslation();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [documentData, setDocumentData] = useState({});
  const [documentCategories, setDocumentCategories] = useState({});
  const [categoryIds, setCategoryIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch document categories from API
  useEffect(() => {
    const fetchDocumentCategories = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/document-types/categories`,
        );
        setDocumentCategories(response.data);
        const ids = Object.keys(response.data);
        setCategoryIds(ids);
        if (ids.length > 0 && !activeCategory) {
          setActiveCategory(ids[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching document categories:", error);
        toast.error(t("additionalInfo.errors.loadCategoriesFailed"));
        setLoading(false);
      }
    };

    if (open) {
      fetchDocumentCategories();
    }
  }, [open]);

  useEffect(() => {
    if (open && Object.keys(documentCategories).length > 0) {
      if (mode === "edit" && employee) {
        setSelectedEmployee({
          id: employee.id,
          first_name: employee.employeeName?.split(" ")[0],
          last_name: employee.employeeName?.split(" ").slice(1).join(" "),
          full_name: employee.employeeName,
          nic: employee.employeeNIC || employee.nic,
        });
        loadDocumentData(employee.documents);
      } else {
        setSelectedEmployee(null);
        setDocumentData({});
        if (categoryIds.length > 0) {
          setActiveCategory(categoryIds[0]);
        }
      }
    }
  }, [open, employee, mode, documentCategories, categoryIds]);

  const loadDocumentData = (documents) => {
    const docData = {};
    if (documents && documents.length > 0) {
      documents.forEach((d) => {
        const docTypeId = d.fk_document_type_id;
        if (!docData[docTypeId]) docData[docTypeId] = { instances: [] };
        docData[docTypeId].instances.push({
          pageNumber:
            d.page_count !== null && d.page_count !== undefined
              ? d.page_count.toString()
              : "",
          file: d.cloudinary_url
            ? {
                name: d.cloudinary_url.split("/").pop() || "file",
                url: d.cloudinary_url,
                publicId: null,
              }
            : null,
        });
      });
    }
    setDocumentData(docData);
  };

  const handleEmployeeSelect = (emp) => {
    // Ensure NIC is present before allowing selection
    if (!emp?.nic) {
      toast.error("Employee NIC is required to upload documents");
      return;
    }
    setSelectedEmployee(emp);
    if (mode === "add" && emp) {
      const existingEmp = existingDocuments.find((e) => e.id === emp.id);
      if (existingEmp && existingEmp.documents) {
        loadDocumentData(existingEmp.documents);
      } else {
        setDocumentData({});
      }
    }
  };

  const handleCategoryDataChange = (categoryKey, dataOrUpdater) => {
    console.log("Category data change:", categoryKey, dataOrUpdater);
    setDocumentData((prev) => {
      // Support both direct data and updater function for concurrent uploads
      const newValues =
        typeof dataOrUpdater === "function"
          ? dataOrUpdater(prev)
          : dataOrUpdater;
      const newData = {
        ...prev,
        ...newValues,
      };
      console.log("Updated documentData:", newData);
      return newData;
    });
  };

  const currentCategoryIndex = categoryIds.indexOf(activeCategory);
  const isLastCategory = currentCategoryIndex === categoryIds.length - 1;
  const isFirstCategory = currentCategoryIndex === 0;

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setActiveCategory(categoryIds[currentCategoryIndex - 1]);
    } else {
      onOpenChange(false);
    }
  };

  const handleNext = () => {
    if (currentCategoryIndex < categoryIds.length - 1) {
      setActiveCategory(categoryIds[currentCategoryIndex + 1]);
    }
  };

  const validateDocuments = () => {
    for (const [docTypeId, docInfo] of Object.entries(documentData)) {
      const instances = docInfo.instances || [];
      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];

        // Only validate that uploaded files must have page numbers
        if (
          instance.file &&
          (!instance.pageNumber || instance.pageNumber.trim() === "")
        ) {
          return {
            valid: false,
            message: t("additionalInfo.pageNumberRequired"),
          };
        }
      }
    }
    return { valid: true };
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!selectedEmployee) {
      toast.error(t("additionalInfo.selectEmployeeError"));
      return;
    }

    const validation = validateDocuments();
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    const payload = {
      employeeId: selectedEmployee.id,
      documentData,
    };

    console.log("=== Frontend Submit ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("Document Data keys:", Object.keys(documentData));
    console.log("Has documents:", Object.keys(documentData).length > 0);

    const apiCall =
      mode === "edit"
        ? axios.put(
            `${API_URL}/auth/additional-info/${selectedEmployee.id}`,
            payload,
            { withCredentials: true },
          )
        : axios.post(`${API_URL}/auth/additional-info`, payload, {
            withCredentials: true,
          });

    apiCall
      .then((result) => {
        console.log("API Response:", result.data);
        toast.success(
          mode === "edit"
            ? t("additionalInfo.success.updated")
            : t("additionalInfo.success.added"),
        );
        onSave();
        onOpenChange(false);
      })
      .catch((error) => {
        console.error(
          `Error ${mode === "edit" ? "updating" : "adding"} document:`,
          error,
        );
        console.error("Error response:", error.response?.data);
        toast.error(
          error.response?.data?.message ||
            (mode === "edit"
              ? t("additionalInfo.errors.updateFailed")
              : t("additionalInfo.errors.addFailed")),
        );
      });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (currentCategoryIndex < categoryIds.length - 1) {
      handleNext();
    } else {
      handleSubmit(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? t("additionalInfo.editDocumentTitle")
              : t("additionalInfo.addDocumentTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? t("additionalInfo.editDescription")
              : t("additionalInfo.addDescription")}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="space-y-4 flex-1 overflow-y-auto px-1">
            <div>
              <Label className="mb-1">
                {t("additionalInfo.selectEmployee")}
              </Label>
              <EmployeeSelector
                selectedEmployee={selectedEmployee}
                onSelect={handleEmployeeSelect}
                disabled={mode === "edit"}
              />
            </div>

            <Tabs
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 h-auto gap-1 p-1">
                {loading ? (
                  <div className="col-span-3 text-center text-sm text-muted-foreground py-2">
                    {t("additionalInfo.loadingCategories")}
                  </div>
                ) : (
                  Object.entries(documentCategories).map(([id, category]) => (
                    <TabsTrigger
                      key={id}
                      value={id}
                      className="text-xs sm:text-sm px-2 py-1.5"
                    >
                      {category.shortName}
                    </TabsTrigger>
                  ))
                )}
              </TabsList>

              {!loading &&
                Object.entries(documentCategories).map(([id, category]) => (
                  <TabsContent key={id} value={id} className="mt-4">
                    <Card>
                      <CardContent className="pt-6">
                        <DocumentCategoryForm
                          category={category}
                          categoryKey={id}
                          data={Object.fromEntries(
                            category.documents.map((doc) => [
                              doc.id,
                              documentData[doc.id] || {
                                instances: [{ pageNumber: "", file: null }],
                              },
                            ]),
                          )}
                          onChange={(data) =>
                            handleCategoryDataChange(id, data)
                          }
                          employeeInfo={
                            selectedEmployee
                              ? {
                                  id: selectedEmployee.id,
                                  name:
                                    selectedEmployee.full_name ||
                                    selectedEmployee.first_name +
                                      " " +
                                      selectedEmployee.last_name,
                                  nic: selectedEmployee.nic,
                                }
                              : null
                          }
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
            </Tabs>
          </div>

          <DialogFooter className="mt-4 flex-shrink-0">
            <Button type="button" variant="outline" onClick={handlePrevious}>
              {isFirstCategory
                ? t("additionalInfo.cancel")
                : t("additionalInfo.previous")}
            </Button>
            <Button type="submit" disabled={!selectedEmployee}>
              {isLastCategory
                ? mode === "edit"
                  ? t("additionalInfo.saveChanges")
                  : t("additionalInfo.addDocumentInfo")
                : t("additionalInfo.next")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
