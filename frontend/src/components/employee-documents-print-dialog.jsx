import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Printer } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { useTranslation } from "react-i18next";

export function EmployeeDocumentsPrintDialog({ open, onOpenChange, employee }) {
  const { t } = useTranslation();
  const [documentCategories, setDocumentCategories] = useState({});
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  // Store the computed result to prevent recalculation after print
  const computedDocumentsRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Reset and fetch fresh data when dialog opens
      setCategoriesLoaded(false);
      computedDocumentsRef.current = null; // Clear cached result
      const fetchDocumentCategories = async () => {
        try {
          const response = await axios.get(
            `${API_URL}/document-types/categories`,
          );
          setDocumentCategories(response.data);
          setCategoriesLoaded(true);
        } catch (error) {
          console.error("Error fetching document categories:", error);
          setCategoriesLoaded(true); // Still mark as loaded to show error state
        }
      };
      fetchDocumentCategories();
    } else {
      // Reset when dialog closes
      setDocumentCategories({});
      setCategoriesLoaded(false);
      computedDocumentsRef.current = null;
    }
  }, [open]);

  const handlePrint = () => {
    window.print();
  };

  // Build lookup maps for efficient access - memoized to prevent recalculation
  const { docTypeToCategory, docTypeToName } = useMemo(() => {
    const categoryMap = {};
    const nameMap = {};

    for (const category of Object.values(documentCategories)) {
      if (category.documents) {
        for (const doc of category.documents) {
          categoryMap[doc.id] = category.name;
          nameMap[doc.id] = doc.name;
        }
      }
    }

    return { docTypeToCategory: categoryMap, docTypeToName: nameMap };
  }, [documentCategories]);

  // Compute and cache documents by category
  const documentsByCategory = useMemo(() => {
    // Return cached result if categories are not loaded (prevents issues after print)
    if (!categoriesLoaded || Object.keys(documentCategories).length === 0) {
      return computedDocumentsRef.current || {};
    }

    if (!employee?.documents) return {};

    const result = employee.documents.reduce((acc, doc) => {
      const categoryName =
        docTypeToCategory[doc.fk_document_type_id] || "Other Documents";
      const docName =
        docTypeToName[doc.fk_document_type_id] || "Unknown Document";
      const docTypeId = doc.fk_document_type_id;

      if (!acc[categoryName]) acc[categoryName] = {};

      if (!acc[categoryName][docTypeId]) {
        acc[categoryName][docTypeId] = {
          name: docName,
          pageNumbers: [],
        };
      }

      if (doc.page_count) {
        acc[categoryName][docTypeId].pageNumbers.push(doc.page_count);
      }

      return acc;
    }, {});

    // Cache the result to prevent loss after print re-render
    computedDocumentsRef.current = result;
    return result;
  }, [
    categoriesLoaded,
    documentCategories,
    employee?.documents,
    docTypeToCategory,
    docTypeToName,
  ]);

  // Early return AFTER all hooks are called
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-none print:overflow-visible">
        <style>
          {`
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              @page {
                size: A4;
                margin: 1.5cm;
              }
              
              * {
                overflow: visible !important;
              }
              
              .print\\:p-12 {
                padding: 0 !important;
              }
            }
          `}
        </style>
        <DialogHeader className="print:hidden">
          <DialogTitle>{t("printDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("printDialog.description")}{" "}
            {employee.employeeName || "the selected employee"}
          </DialogDescription>
          <Button onClick={handlePrint} className="absolute right-12 top-4">
            <Printer className="mr-2 h-4 w-4" />
            {t("printDialog.print")}
          </Button>
        </DialogHeader>

        <div className="print:p-0 print:bg-white">
          {/* Official Header */}
          <div className="hidden print:block text-center mb-8 pb-4 border-b-2 border-black">
            <h1 className="text-2xl font-bold uppercase mb-2">
              {t("printDialog.title")}
            </h1>
            <p className="text-sm">{t("printDialog.officialDocument")}</p>
          </div>

          {/* Employee Information Section */}
          <div className="mb-6">
            <div className="flex gap-6 mb-6">
              {/* Photo */}
              <div className="flex-shrink-0">
                <div className="w-32 h-40 border-2 border-black flex items-center justify-center overflow-hidden">
                  {employee.photo ? (
                    <img
                      src={employee.photo}
                      alt={employee.employeeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-xs text-gray-500">
                      {t("printDialog.noPhoto")}
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Details */}
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">
                  {t("printDialog.personalInformation")}
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <span className="font-semibold">
                      {t("printDialog.fullName")}:
                    </span>
                    <p className="mt-1">
                      {employee.employeeName || t("printDialog.na")}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {t("printDialog.nameWithInitials")}:
                    </span>
                    <p className="mt-1">
                      {employee.nameWithInit || t("printDialog.na")}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {t("printDialog.nicNumber")}:
                    </span>
                    <p className="mt-1">
                      {employee.employeeNIC || t("printDialog.na")}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {t("printDialog.dateOfBirth")}:
                    </span>
                    <p className="mt-1">
                      {employee.dob
                        ? new Date(employee.dob).toLocaleDateString()
                        : t("printDialog.na")}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {t("printDialog.gender")}:
                    </span>
                    <p className="mt-1">
                      {employee.gender || t("printDialog.na")}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">
                      {t("printDialog.maritalStatus")}:
                    </span>
                    <p className="mt-1">
                      {employee.mStatus || t("printDialog.na")}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">
                      {t("printDialog.address")}:
                    </span>
                    <p className="mt-1">
                      {employee.address || t("printDialog.na")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">
                {t("printDialog.contactInformation")}
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="font-semibold">
                    {t("printDialog.email")}:
                  </span>
                  <p className="mt-1">
                    {employee.email || t("printDialog.na")}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">
                    {t("printDialog.phone1")}:
                  </span>
                  <p className="mt-1">
                    {employee.phone1 || t("printDialog.na")}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">
                    {t("printDialog.phone2")}:
                  </span>
                  <p className="mt-1">
                    {employee.phone2 || t("printDialog.na")}
                  </p>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">
                {t("printDialog.employmentInformation")}
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <span className="font-semibold">
                    {t("printDialog.jobRole")}:
                  </span>
                  <p className="mt-1">{employee.role || t("printDialog.na")}</p>
                </div>
                <div>
                  <span className="font-semibold">
                    {t("printDialog.employmentStatus")}:
                  </span>
                  <p className="mt-1">
                    {employee.permanentStatus || t("printDialog.na")}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">
                    {t("printDialog.careerStartDate")}:
                  </span>
                  <p className="mt-1">
                    {employee.careerStartDate
                      ? new Date(employee.careerStartDate).toLocaleDateString()
                      : t("printDialog.na")}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">
                    {t("printDialog.positionStartDate")}:
                  </span>
                  <p className="mt-1">
                    {employee.joinedDate
                      ? new Date(employee.joinedDate).toLocaleDateString()
                      : t("printDialog.na")}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">
                    {t("printDialog.retirementDate")}:
                  </span>
                  <p className="mt-1">
                    {employee.retirementDate
                      ? new Date(employee.retirementDate).toLocaleDateString()
                      : t("printDialog.na")}
                  </p>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 pb-2 border-b-2 border-black">
                {t("printDialog.documentsOnFile")}
              </h2>
              {!categoriesLoaded ? (
                <p className="text-sm text-gray-600">Loading documents...</p>
              ) : Object.keys(documentsByCategory).length === 0 ? (
                <p className="text-sm text-gray-600">
                  {t("printDialog.noDocumentsAvailable")}
                </p>
              ) : (
                <table className="w-full text-sm border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left w-1/3">
                        {t("printDialog.category")}
                      </th>
                      <th className="border border-black p-2 text-left w-1/2">
                        {t("printDialog.documentName")}
                      </th>
                      <th className="border border-black p-2 text-left w-1/6">
                        {t("printDialog.pageNo")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(documentsByCategory).map(
                      ([categoryName, docTypes]) => {
                        const docTypeArray = Object.values(docTypes);
                        return docTypeArray.map((docType, index) => (
                          <tr key={`${categoryName}-${index}`}>
                            {index === 0 && (
                              <td
                                className="border border-black p-2 font-semibold align-top"
                                rowSpan={docTypeArray.length}
                              >
                                {categoryName}
                              </td>
                            )}
                            <td className="border border-black p-2">
                              {docType.name}
                            </td>
                            <td className="border border-black p-2 text-center">
                              {docType.pageNumbers.length > 0
                                ? docType.pageNumbers.join(", ")
                                : "-"}
                            </td>
                          </tr>
                        ));
                      },
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Official Footer */}
          <div className="hidden print:block mt-12 pt-6 border-t-2 border-black">
            <div className="flex justify-between text-xs">
              <div>
                <p className="font-semibold">
                  {t("printDialog.documentGenerated")}
                </p>
                <p>{new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {t("printDialog.fileReference")}
                </p>
                <p>
                  EMP-{employee.id}-{new Date().getFullYear()}
                </p>
              </div>
            </div>
            <div className="mt-6 text-center text-xs text-gray-600">
              <p>{t("printDialog.officialNotice")}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
