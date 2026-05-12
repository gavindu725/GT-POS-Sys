import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import {
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  TrendingUp,
  Save,
  X,
  Info,
} from "lucide-react";
import axios from "../utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

/**
 * Promotion Paths Configuration Component
 * Configure department-specific career progression flows
 */
export default function PromotionPaths() {
  const [promotionPaths, setPromotionPaths] = useState([]);
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState(null);
  const [jobRoles, setJobRoles] = useState([]);
  const [jobClasses, setJobClasses] = useState([]);

  const [pathForm, setPathForm] = useState({
    name: "",
    department: "",
    description: "",
    is_active: true,
    steps: [],
  });

  // Delete Confirmation Dialog State
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
  });

  useEffect(() => {
    fetchPromotionPaths();
    fetchJobRoles();
    fetchJobClasses();
  }, []);

  const fetchPromotionPaths = async () => {
    try {
      const response = await axios.get(`${API_URL}/promotion/paths`);
      if (response.data.success) {
        setPromotionPaths(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching promotion paths:", error);
    }
  };

  const fetchJobRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/job-roles`);
      if (response.data.success) {
        setJobRoles(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching job roles:", error);
    }
  };

  const fetchJobClasses = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/job-classes`);
      if (response.data.success) {
        setJobClasses(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching job classes:", error);
    }
  };

  const resetPathForm = () => {
    setPathForm({
      name: "",
      department: "",
      description: "",
      is_active: true,
      steps: [],
    });
    setEditingPath(null);
  };

  const openPathDialog = () => {
    resetPathForm();
    setPathDialogOpen(true);
  };

  const handleEditPath = async (path) => {
    try {
      const response = await axios.get(`${API_URL}/promotion/paths/${path.id}`);
      if (response.data.success) {
        const fullPath = response.data.data;
        setEditingPath(fullPath);
        setPathForm({
          name: fullPath.name || "",
          department: fullPath.department || "",
          description: fullPath.description || "",
          is_active: fullPath.is_active === 1,
          steps: fullPath.steps || [],
        });
        setPathDialogOpen(true);
      }
    } catch (error) {
      console.error("Error fetching path details:", error);
      toast.error("Failed to load path details");
    }
  };

  const handleSavePath = async () => {
    if (!pathForm.name || !pathForm.department) {
      toast.error("Please fill in path name and department");
      return;
    }

    if (pathForm.steps.length === 0) {
      toast.error("Please add at least one step to the promotion path");
      return;
    }

    try {
      if (editingPath) {
        await axios.put(
          `${API_URL}/promotion/paths/${editingPath.id}`,
          pathForm,
        );
        toast.success("Promotion path updated successfully");
      } else {
        await axios.post(`${API_URL}/promotion/paths`, pathForm);
        toast.success("Promotion path created successfully");
      }

      setPathDialogOpen(false);
      resetPathForm();
      fetchPromotionPaths();
    } catch (error) {
      console.error("Error saving promotion path:", error);
      toast.error(
        error.response?.data?.message || "Failed to save promotion path",
      );
    }
  };

  const handleDeletePath = async (id, pathName) => {
    setDeleteDialog({
      open: true,
      title: "Delete Promotion Path",
      description: `Are you sure you want to delete the promotion path "${pathName}"? This action cannot be undone.`,
      onConfirm: async () => {
        await executeDeletePath(id);
        setDeleteDialog({ ...deleteDialog, open: false });
      },
    });
  };

  const executeDeletePath = async (id) => {
    try {
      await axios.delete(`${API_URL}/promotion/paths/${id}`);
      toast.success("Promotion path deleted successfully");
      fetchPromotionPaths();
    } catch (error) {
      console.error("Error deleting promotion path:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete promotion path",
      );
    }
  };

  const addStep = () => {
    setPathForm({
      ...pathForm,
      steps: [
        ...pathForm.steps,
        {
          step_order: pathForm.steps.length + 1,
          fk_job_role_id: "",
          fk_job_class_id: "",
          min_years_required: "",
          requirements: "",
        },
      ],
    });
  };

  const removeStep = (index) => {
    const newSteps = pathForm.steps.filter((_, i) => i !== index);
    // Renumber steps
    const renumberedSteps = newSteps.map((step, i) => ({
      ...step,
      step_order: i + 1,
    }));
    setPathForm({ ...pathForm, steps: renumberedSteps });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...pathForm.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setPathForm({ ...pathForm, steps: newSteps });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Promotion Paths</CardTitle>
          <CardDescription>
            Configure department-specific career progression flows
          </CardDescription>
        </div>
        <Button onClick={openPathDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Promotion Path
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotionPaths.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No promotion paths configured. Create one to define career
                  progression flows.
                </TableCell>
              </TableRow>
            ) : (
              promotionPaths.map((path) => (
                <TableRow key={path.id}>
                  <TableCell className="font-medium">{path.name}</TableCell>
                  <TableCell>{path.department}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{path.total_steps} steps</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{path.employees_assigned} assigned</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={path.is_active ? "default" : "secondary"}>
                      {path.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditPath(path)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePath(path.id, path.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Dialog for Add/Edit Promotion Path */}
        <Dialog open={pathDialogOpen} onOpenChange={setPathDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPath ? "Edit Promotion Path" : "Add New Promotion Path"}
              </DialogTitle>
              <DialogDescription>
                Define a career progression flow with sequential steps. Example:
                Field Officer → Coach → District Officer → Director.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Path Name *</Label>
                  <Input
                    id="name"
                    value={pathForm.name}
                    onChange={(e) =>
                      setPathForm({ ...pathForm, name: e.target.value })
                    }
                    placeholder="e.g., Sports Sector Career Progression"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    value={pathForm.department}
                    onChange={(e) =>
                      setPathForm({ ...pathForm, department: e.target.value })
                    }
                    placeholder="e.g., Sports Department"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={pathForm.description}
                  onChange={(e) =>
                    setPathForm({ ...pathForm, description: e.target.value })
                  }
                  placeholder="Describe the purpose of this promotion path..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={pathForm.is_active}
                  onCheckedChange={(checked) =>
                    setPathForm({ ...pathForm, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">
                  Active (can be assigned to employees)
                </Label>
              </div>

              {/* Promotion Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-lg font-semibold">
                      Promotion Steps
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Define the career progression sequence
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={addStep}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                {pathForm.steps.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No steps added yet. Click "Add Step" to start building the
                      career path.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pathForm.steps.map((step, index) => (
                      <Card key={index} className="relative">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {/* Step Number Badge */}
                            <div className="flex flex-col items-center gap-2">
                              <Badge className="h-8 w-8 flex items-center justify-center rounded-full">
                                {step.step_order}
                              </Badge>
                              {index < pathForm.steps.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                              )}
                            </div>

                            {/* Step Fields */}
                            <div className="flex-1 grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Job Role *</Label>
                                <Select
                                  value={step.fk_job_role_id?.toString() || ""}
                                  onValueChange={(value) =>
                                    updateStep(
                                      index,
                                      "fk_job_role_id",
                                      parseInt(value),
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {jobRoles.map((role) => (
                                      <SelectItem
                                        key={role.id}
                                        value={role.id.toString()}
                                      >
                                        {role.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Job Class *</Label>
                                <Select
                                  value={step.fk_job_class_id?.toString() || ""}
                                  onValueChange={(value) =>
                                    updateStep(
                                      index,
                                      "fk_job_class_id",
                                      parseInt(value),
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {jobClasses.map((cls) => (
                                      <SelectItem
                                        key={cls.id}
                                        value={cls.id.toString()}
                                      >
                                        {cls.class_code}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Min. Years Required</Label>
                                <Input
                                  type="number"
                                  value={step.min_years_required || ""}
                                  onChange={(e) =>
                                    updateStep(
                                      index,
                                      "min_years_required",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Years in previous position"
                                />
                              </div>

                              <div className="space-y-2 col-span-2">
                                <Label>Requirements (Optional)</Label>
                                <Input
                                  value={step.requirements || ""}
                                  onChange={(e) =>
                                    updateStep(
                                      index,
                                      "requirements",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g., EB Level I cleared, Degree required"
                                />
                              </div>
                            </div>

                            {/* Remove Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeStep(index)}
                              className="mt-6"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              {pathForm.steps.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">
                        Promotion Path Preview:
                      </p>
                      <p className="flex items-center gap-2 flex-wrap">
                        {pathForm.steps.map((step, index) => {
                          const role = jobRoles.find(
                            (r) => r.id === step.fk_job_role_id,
                          );
                          const cls = jobClasses.find(
                            (c) => c.id === step.fk_job_class_id,
                          );
                          return (
                            <span
                              key={index}
                              className="flex items-center gap-1"
                            >
                              <span className="font-medium">
                                {role?.name || "?"} ({cls?.class_code || "?"})
                              </span>
                              {index < pathForm.steps.length - 1 && (
                                <ArrowRight className="h-4 w-4" />
                              )}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPathDialogOpen(false);
                  resetPathForm();
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSavePath}>
                <Save className="h-4 w-4 mr-2" />
                {editingPath ? "Update Path" : "Create Path"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
          onConfirm={deleteDialog.onConfirm}
          title={deleteDialog.title}
          description={deleteDialog.description}
        />
      </CardContent>
    </Card>
  );
}
