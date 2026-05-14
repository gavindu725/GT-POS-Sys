import { useNavigate } from "react-router-dom";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings as SettingsIcon, UserCog, Palette } from "lucide-react";

export default function SettingsHub() {
  const navigate = useNavigate();

  const settingsCategories = [
    {
      id: "account",
      title: "Account Settings",
      description: "Manage account and admin users",
      icon: UserCog,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      path: "/settings/account",
    },
    {
      id: "preferences",
      title: "Preferences",
      description: "Customize your experience",
      icon: Palette,
      color: "text-green-600",
      bgColor: "bg-green-50",
      path: "/settings/preferences",
    },
    {
      id: "system",
      title: "System Configuration",
      description: "System settings and configuration",
      icon: SettingsIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      path: "/settings/system-configuration",
    },
  ];

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex-1 min-w-[300px] ${
                category.disabled
                  ? "opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0"
                  : ""
              }`}
              onClick={() => !category.disabled && navigate(category.path)}
            >
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${category.bgColor} ${category.color} flex-shrink-0`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base mb-1">
                          {category.title}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-2">
                          {category.description}
                        </CardDescription>
                      </div>
                      {category.disabled && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
