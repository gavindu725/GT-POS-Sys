import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Upload, X, Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function DocumentCategoryForm({
  category,
  categoryKey,
  data,
  onChange,
  employeeInfo,
}) {
  const { t } = useTranslation();
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState({});

  const handlePageNumberChange = (docId, index, value) => {
    const newData = { ...data };
    if (!newData[docId]) {
      newData[docId] = { instances: [{ pageNumber: "", file: null }] };
    }
    const instances = [...(newData[docId].instances || [])];
    instances[index] = { ...instances[index], pageNumber: value };
    newData[docId] = { ...newData[docId], instances };
    onChange(newData);
  };

  const handleFileUpload = async (docId, index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadKey = `${docId}-${index}`;
    setIsUploading((prev) => ({ ...prev, [uploadKey]: true }));
    setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));

    const formData = new FormData();
    formData.append("image", file);

    // Add employee NIC for folder naming (required for documents)
    if (!employeeInfo?.nic) {
      console.error("Upload attempt without NIC. Employee info:", employeeInfo);
      toast.error(t("additionalInfo.nicRequired"));
      setIsUploading((prev) => ({ ...prev, [uploadKey]: false }));
      event.target.value = "";
      return;
    }

    console.log("Uploading document with NIC:", employeeInfo.nic);
    formData.append("employeeNic", employeeInfo.nic);
    formData.append("uploadType", "documents");

    try {
      const { data: res } = await axios.post(
        `${API_URL}/upload/image`,
        formData,
        {
          onUploadProgress: (e) => {
            const progress = Math.round((e.loaded * 100) / e.total);
            setUploadProgress((prev) => ({ ...prev, [uploadKey]: progress }));
          },
        },
      );

      // Use callback form to ensure we get the latest data state for concurrent uploads
      onChange((prevData) => {
        const newData = { ...prevData };
        if (!newData[docId]) {
          newData[docId] = { instances: [{ pageNumber: "", file: null }] };
        }
        const instances = [...(newData[docId].instances || [])];
        instances[index] = {
          ...instances[index],
          file: { name: file.name, url: res.url, publicId: res.publicId },
        };
        newData[docId] = { ...newData[docId], instances };
        return newData;
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(t("additionalInfo.uploadFailed"));
    } finally {
      setIsUploading((prev) => ({ ...prev, [uploadKey]: false }));
      setUploadProgress((prev) => ({ ...prev, [uploadKey]: 0 }));
    }
  };

  const handleRemoveFile = async (docId, index) => {
    const newData = { ...data };
    const instances = [...(newData[docId]?.instances || [])];
    const file = instances[index]?.file;

    if (file?.publicId) {
      try {
        await axios.delete(`${API_URL}/upload/image`, {
          data: { publicId: file.publicId },
        });
      } catch (error) {
        console.error("Failed to delete from Cloudinary:", error);
      }
    }

    instances[index] = { ...instances[index], file: null };
    newData[docId] = { ...newData[docId], instances };
    onChange(newData);
  };

  const handleAddInstance = (docId) => {
    const newData = { ...data };
    if (!newData[docId]) {
      newData[docId] = { instances: [] };
    }
    const instances = [...(newData[docId].instances || [])];
    instances.push({ pageNumber: "", file: null });
    newData[docId] = { ...newData[docId], instances };
    onChange(newData);
  };

  const handleRemoveInstance = (docId, index) => {
    const newData = { ...data };
    const instances = [...(newData[docId]?.instances || [])];
    if (instances.length <= 1) return;

    const file = instances[index]?.file;
    if (file?.publicId) {
      axios
        .delete(`${API_URL}/upload/image`, {
          data: { publicId: file.publicId },
        })
        .catch((err) =>
          console.error("Failed to delete from Cloudinary:", err),
        );
    }

    instances.splice(index, 1);
    newData[docId] = { ...newData[docId], instances };
    onChange(newData);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {category.documents.map((doc) => {
        const docData = data[doc.id] || {
          instances: [{ pageNumber: "", file: null }],
        };
        const instances = docData.instances || [{ pageNumber: "", file: null }];

        return (
          <div key={doc.id} className="border rounded-lg p-4 space-y-3">
            <Label className="text-sm font-medium">
              {doc.id}. {doc.name}
            </Label>

            <div className="space-y-3">
              {instances.map((instance, index) => {
                const uploadKey = `${doc.id}-${index}`;
                return (
                  <div
                    key={index}
                    className="border rounded p-3 space-y-2 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        {t("additionalInfo.instance")} {index + 1}
                      </Label>
                      {instances.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInstance(doc.id, index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <Input
                      placeholder={t("additionalInfo.pageNumberPlaceholder")}
                      value={instance.pageNumber || ""}
                      onChange={(e) =>
                        handlePageNumberChange(doc.id, index, e.target.value)
                      }
                      className={`h-8 ${
                        instance.file &&
                        (!instance.pageNumber ||
                          instance.pageNumber.trim() === "")
                          ? "border-destructive"
                          : ""
                      }`}
                      required={!!instance.file}
                    />

                    <div className="space-y-2">
                      {!instance.file ? (
                        <>
                          <Label
                            htmlFor={`file-${doc.id}-${index}`}
                            className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent text-sm w-full justify-center"
                          >
                            <Upload className="h-4 w-4" />
                            <span>{t("additionalInfo.uploadFile")}</span>
                          </Label>
                          <Input
                            id={`file-${doc.id}-${index}`}
                            type="file"
                            onChange={(e) => handleFileUpload(doc.id, index, e)}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={isUploading[uploadKey]}
                          />
                        </>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="gap-1 w-full justify-between"
                        >
                          <a
                            href={instance.file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs truncate"
                          >
                            {instance.file.name}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(doc.id, index)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {isUploading[uploadKey] && (
                        <div className="space-y-1">
                          <Progress
                            value={uploadProgress[uploadKey]}
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            {uploadProgress[uploadKey]}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddInstance(doc.id)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("additionalInfo.addInstance")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
