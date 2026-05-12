import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AdditionalInfoDialog } from "./additional-info-dialog";
import { AdditionalInfoTable } from "./additional-info-table";
import { EmployeeDocumentCards } from "./employee-document-cards";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import axios from "axios";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

function AdditionalInfo() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("documents");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [employeeDeleteDialogOpen, setEmployeeDeleteDialogOpen] =
    useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = () => {
    setLoading(true);
    axios
      .get(`${API_URL}/auth/additional-info`, {
        withCredentials: true,
      })
      .then((result) => {
        if (result.data.success) {
          setDocuments(result.data.data);
        }
      })
      .catch((error) => {
        console.error("Error fetching documents:", error);
        toast.error(t("additionalInfo.errors.loadFailed"));
      })
      .finally(() => setLoading(false));
  };

  const handleAdd = () => {
    setSelectedDocument(null);
    setEditMode(false);
    setDialogOpen(true);
  };

  const handleEdit = (document) => {
    setSelectedDocument(document);
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDelete = (documentId) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

  const handleEmployeeDelete = (employeeId) => {
    // Find employee data for the confirmation dialog
    const employee = documents.find((e) => e.id === employeeId);
    setEmployeeToDelete({
      id: employeeId,
      name: employee?.employeeName,
      documentCount: employee?.documentCount,
    });
    setEmployeeDeleteDialogOpen(true);
  };

  const confirmEmployeeDelete = async () => {
    if (!employeeToDelete) return;

    try {
      await axios.delete(
        `${API_URL}/auth/additional-info/${employeeToDelete.id}`,
        { withCredentials: true },
      );
      toast.success(t("additionalInfo.success.deletedMultiple"));
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting employee documents:", error);
      toast.error(t("additionalInfo.errors.deleteFailed"));
    } finally {
      setEmployeeDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleBulkDelete = (documentIds) => {
    setDocumentToDelete(documentIds);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      if (Array.isArray(documentToDelete)) {
        const deletePromises = documentToDelete.map((id) =>
          axios.delete(`${API_URL}/auth/additional-info/document/${id}`, {
            withCredentials: true,
          }),
        );
        await Promise.all(deletePromises);
        toast.success(
          `${documentToDelete.length} documents deleted successfully`,
        );
      } else {
        await axios.delete(
          `${API_URL}/auth/additional-info/document/${documentToDelete}`,
          { withCredentials: true },
        );
        toast.success("Document deleted successfully");
      }
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document(s):", error);
      toast.error("Failed to delete document(s)");
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleSave = () => {
    fetchDocuments();
  };

  return (
    <main className="overflow-y-auto p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold">{t("additionalInfo.title")}</h3>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t("additionalInfo.addDocument")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">{t("additionalInfo.loading")}</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="documents">
              {t("additionalInfo.documents")}
            </TabsTrigger>
            <TabsTrigger value="employees">
              {t("additionalInfo.employees")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-4">
            <AdditionalInfoTable
              data={documents}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
            />
          </TabsContent>

          <TabsContent value="employees" className="mt-4">
            <EmployeeDocumentCards
              data={documents}
              onEdit={handleEdit}
              onDelete={handleEmployeeDelete}
            />
          </TabsContent>
        </Tabs>
      )}

      <AdditionalInfoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        employee={selectedDocument}
        mode={editMode ? "edit" : "add"}
        existingDocuments={documents}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title={t("additionalInfo.deleteDocument")}
        description={
          documentToDelete
            ? Array.isArray(documentToDelete)
              ? t("additionalInfo.deleteMultipleConfirm", {
                  count: documentToDelete.length,
                })
              : t("additionalInfo.deleteConfirm")
            : ""
        }
      />

      <DeleteConfirmationDialog
        open={employeeDeleteDialogOpen}
        onOpenChange={setEmployeeDeleteDialogOpen}
        onConfirm={confirmEmployeeDelete}
        title={t("additionalInfo.deleteAllDocuments")}
        description={
          employeeToDelete
            ? t("additionalInfo.deleteAllConfirm", {
                count: employeeToDelete.documentCount || 0,
                name: employeeToDelete.name,
              })
            : ""
        }
        confirmText={t("additionalInfo.deleteAllButton")}
      />
    </main>
  );
}

export default AdditionalInfo;
