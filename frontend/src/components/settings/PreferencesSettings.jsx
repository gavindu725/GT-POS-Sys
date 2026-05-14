import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Palette,
  Type,
  Image,
  Accessibility,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Check,
  Upload,
  X,
  Building2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import {
  usePreferences,
  colorThemes,
  fontFamilies,
  fontWeights,
  fontSizeRange,
} from "@/contexts/PreferencesContext";

export default function PreferencesSettings() {
  const navigate = useNavigate();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const [systemName, setSystemName] = useState("");
  const [systemLogoUrl, setSystemLogoUrl] = useState("");
  const [systemLogoPublicId, setSystemLogoPublicId] = useState("");
  const [systemColor, setSystemColor] = useState("#0ea5e9");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/system`, {
        withCredentials: true,
      });
      if (response.data.success) {
        const settings = response.data.data;
        setSystemName(settings.system_name || "");
        setSystemLogoUrl(settings.system_logo_url || "");
        setSystemLogoPublicId(settings.system_logo_public_id || "");
        setSystemColor(settings.primary_color || "#0ea5e9");
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
      toast.error("Failed to load system settings");
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("uploadType", "system_logo");

    setUploading(true);

    try {
      // Delete old logo from Cloudinary if exists
      if (systemLogoPublicId) {
        try {
          await axios.delete(`${API_URL}/upload/image`, {
            data: { publicId: systemLogoPublicId },
            withCredentials: true,
          });
        } catch (deleteError) {
          console.warn("Failed to delete old logo:", deleteError);
          // Continue with upload even if deletion fails
        }
      }

      const response = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (response.data.success) {
        const { url, publicId } = response.data.data;
        setSystemLogoUrl(url);
        setSystemLogoPublicId(publicId);

        // Save to database
        await axios.put(
          `${API_URL}/settings/system`,
          {
            settings: {
              system_logo_url: url,
              system_logo_public_id: publicId,
            },
          },
          { withCredentials: true },
        );

        toast.success("Logo uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      // Delete from Cloudinary first
      if (systemLogoPublicId) {
        try {
          await axios.delete(`${API_URL}/upload/image`, {
            data: { publicId: systemLogoPublicId },
            withCredentials: true,
          });
        } catch (deleteError) {
          console.warn("Failed to delete logo from Cloudinary:", deleteError);
        }
      }

      // Remove from database
      await axios.put(
        `${API_URL}/settings/system`,
        {
          settings: {
            system_logo_url: null,
            system_logo_public_id: null,
          },
        },
        { withCredentials: true },
      );

      setSystemLogoUrl("");
      setSystemLogoPublicId("");
      toast.success("Logo removed");
    } catch (error) {
      console.error("Error removing logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/settings/system`,
        {
          settings: {
            system_name: systemName,
            primary_color: systemColor,
          },
        },
        { withCredentials: true },
      );

      toast.success("System settings saved successfully");
    } catch (error) {
      console.error("Error saving system settings:", error);
      toast.error("Failed to save system settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    resetPreferences();
    setLogoPreview(null);
    toast.success("All preferences reset to defaults");
  };

  return (
    <main className="overflow-y-auto p-5">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/settings")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h3 className="text-2xl font-bold">Preferences</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Customize appearance, fonts, and accessibility options
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset All
        </Button>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure system name, logo, and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* System Name */}
            <div className="space-y-2">
              <Label htmlFor="system-name">System Name</Label>
              <Input
                id="system-name"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="Enter system name"
              />
            </div>

            <Separator />

            {/* System Logo */}
            <div className="space-y-3">
              <Label>System Logo</Label>
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted">
                  {systemLogoUrl ? (
                    <img
                      src={systemLogoUrl}
                      alt="System logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Image className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Label
                      htmlFor="system-logo-upload"
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload Logo
                          </>
                        )}
                      </div>
                      <Input
                        id="system-logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                      />
                    </Label>
                    {systemLogoUrl && !uploading && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={removeLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG or SVG, max 5MB. Uploads to Cloudinary.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Primary Color */}
            <div className="space-y-3">
              <Label htmlFor="system-color">Primary Color</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="system-color"
                  type="color"
                  value={systemColor}
                  onChange={(e) => setSystemColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={systemColor}
                  onChange={(e) => setSystemColor(e.target.value)}
                  placeholder="#0ea5e9"
                  className="flex-1"
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                onClick={handleSaveSystemSettings}
                disabled={saving || !systemName.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save System Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme & Colors
            </CardTitle>
            <CardDescription>
              Choose your preferred color scheme and accent colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Light/Dark Mode */}
            <div className="space-y-3">
              <Label>Color Mode</Label>
              <div className="flex gap-3">
                <Button
                  variant={
                    preferences.theme === "system" ? "default" : "outline"
                  }
                  className="flex-1"
                  onClick={() => updatePreference("theme", "system")}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                  {preferences.theme === "system" && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant={
                    preferences.theme === "light" ? "default" : "outline"
                  }
                  className="flex-1"
                  onClick={() => updatePreference("theme", "light")}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                  {preferences.theme === "light" && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant={preferences.theme === "dark" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => updatePreference("theme", "dark")}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                  {preferences.theme === "dark" && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Typography
            </CardTitle>
            <CardDescription>
              Customize font family and size for better readability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Font Family */}
            <div className="space-y-3">
              <Label>Font Family</Label>
              <Select
                value={preferences.fontFamily}
                onValueChange={(value) => updatePreference("fontFamily", value)}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fontFamilies).map(([key, font]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      style={{ fontFamily: font.value }}
                    >
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Font Weight */}
            <div className="space-y-3">
              <Label>Font Weight</Label>
              <Select
                value={preferences.fontWeight || "normal"}
                onValueChange={(value) => updatePreference("fontWeight", value)}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (400)</SelectItem>
                  <SelectItem value="medium">Medium (500)</SelectItem>
                  <SelectItem value="semibold">Semi Bold (600)</SelectItem>
                  <SelectItem value="bold">Bold (700)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Font Size with Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Font Size</Label>
                <span className="text-sm font-medium bg-muted px-2 py-1 rounded">
                  {preferences.fontSize}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-8">80%</span>
                <Slider
                  value={[
                    typeof preferences.fontSize === "number"
                      ? preferences.fontSize
                      : 100,
                  ]}
                  onValueChange={([value]) =>
                    updatePreference("fontSize", value)
                  }
                  min={fontSizeRange.min}
                  max={fontSizeRange.max}
                  step={fontSizeRange.step}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-10">150%</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Smaller</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => updatePreference("fontSize", 100)}
                >
                  Reset to Default
                </Button>
                <span>Larger</span>
              </div>
              <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3 py-2 bg-muted/50 rounded-r">
                Preview: The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" />
              Accessibility
            </CardTitle>
            <CardDescription>
              Enable accessibility features for better user experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base">High Contrast Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
              <Switch
                checked={preferences.highContrast}
                onCheckedChange={(checked) =>
                  updatePreference("highContrast", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base">Reduce Motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
              <Switch
                checked={preferences.reduceMotion}
                onCheckedChange={(checked) =>
                  updatePreference("reduceMotion", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base">Large Text</Label>
                <p className="text-sm text-muted-foreground">
                  Use larger text throughout the application
                </p>
              </div>
              <Switch
                checked={preferences.largeText}
                onCheckedChange={(checked) =>
                  updatePreference("largeText", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base">Dyslexia-Friendly Font</Label>
                <p className="text-sm text-muted-foreground">
                  Use OpenDyslexic font for easier reading
                </p>
              </div>
              <Switch
                checked={preferences.dyslexiaFont}
                onCheckedChange={(checked) =>
                  updatePreference("dyslexiaFont", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-base">Focus Highlight</Label>
                <p className="text-sm text-muted-foreground">
                  Show visible focus indicators on interactive elements
                </p>
              </div>
              <Switch
                checked={preferences.focusHighlight}
                onCheckedChange={(checked) =>
                  updatePreference("focusHighlight", checked)
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label className="text-base">
                    Accessibility Quick Access
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    Floating Widget
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show a floating button for quick access to accessibility
                  settings
                </p>
              </div>
              <Switch
                checked={preferences.showAccessibilityWidget}
                onCheckedChange={(checked) =>
                  updatePreference("showAccessibilityWidget", checked)
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
