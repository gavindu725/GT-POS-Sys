import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function LanguageSwitcher({ showLabel = true, className = "" }) {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <Label className="flex items-center gap-2">
          <Languages className="h-4 w-4" />
          {t("settings.language")}
        </Label>
      )}
      <Select value={i18n.language} onValueChange={changeLanguage}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t("settings.selectLanguage")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t("settings.english")}</SelectItem>
          <SelectItem value="si">{t("settings.sinhala")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default LanguageSwitcher;
