"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Mic,
  Target,
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

const navigation = [
  {
    name: "Brand Interview",
    href: "/interview",
    icon: Mic,
    description: "Start AI conversation",
  },
  {
    name: "Marketing Strategy",
    href: "/strategy",
    icon: Target,
    description: "View strategy",
  },
  {
    name: "Content Library",
    href: "/content",
    icon: FileText,
    description: "Generated content",
  },
  {
    name: "Approval & Posting",
    href: "/approval",
    icon: CheckSquare,
    description: "Review & publish",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Performance reports",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("demoUser");
    localStorage.removeItem("userProfile");
    router.push("/login");
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-gray-50">
      {/* Logo/Header */}
      <div className="flex h-16 items-center border-b px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <h1 className="text-xl font-bold text-white">
          Content AI
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-md"
                  : "hover:bg-blue-50"
              )}
              style={{ color: isActive ? "#ffffff" : "#374151" }}
            >
              <Icon
                className="mr-3 h-5 w-5 flex-shrink-0 transition-colors"
                style={{ color: isActive ? "#ffffff" : "#9ca3af" }}
              />
              <div className="flex-1">
                <div style={{ color: isActive ? "#ffffff" : "#374151" }}>{item.name}</div>
                <div
                  className="text-xs transition-colors"
                  style={{ color: isActive ? "#bfdbfe" : "#6b7280" }}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Settings & Profile at bottom */}
      <div className="border-t p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
            pathname === "/settings"
              ? "bg-gradient-to-r from-blue-600 to-purple-600 shadow-md"
              : "hover:bg-blue-50"
          )}
          style={{ color: pathname === "/settings" ? "#ffffff" : "#374151" }}
        >
          <Settings
            className="mr-3 h-5 w-5 flex-shrink-0 transition-colors"
            style={{ color: pathname === "/settings" ? "#ffffff" : "#9ca3af" }}
          />
          <span style={{ color: pathname === "/settings" ? "#ffffff" : "#374151" }}>
            Settings & Profile
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-red-50"
          style={{ color: "#374151" }}
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0" style={{ color: "#9ca3af" }} />
          <span style={{ color: "#374151" }}>Logout</span>
        </button>
      </div>
    </div>
  );
}
