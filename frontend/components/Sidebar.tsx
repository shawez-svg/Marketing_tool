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
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-gray-900">
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
                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-white"
                    : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              <div className="flex-1">
                <div>{item.name}</div>
                <div
                  className={cn(
                    "text-xs",
                    isActive
                      ? "text-gray-300"
                      : "text-gray-500 group-hover:text-gray-600"
                  )}
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
            "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-gray-900 text-white"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <Settings
            className={cn(
              "mr-3 h-5 w-5 flex-shrink-0",
              pathname === "/settings"
                ? "text-white"
                : "text-gray-400 group-hover:text-gray-600"
            )}
          />
          Settings & Profile
        </Link>
        <button
          onClick={handleLogout}
          className="group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-600" />
          Logout
        </button>
      </div>
    </div>
  );
}
