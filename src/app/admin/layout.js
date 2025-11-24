"use client";

import { useAuth } from "../../components/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (
      !loading &&
      (!user || (user.role !== "super_admin" && user.role !== "company_admin"))
    ) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== "super_admin" && user.role !== "company_admin")) {
    return null;
  }

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: "📊",
      roles: ["super_admin", "company_admin"],
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: "👥",
      roles: ["super_admin", "company_admin"],
    },
    {
      name: "Companies",
      href: "/admin/companies",
      icon: "🏢",
      roles: ["super_admin"],
    },
    {
      name: "Jobs",
      href: "/admin/jobs",
      icon: "💼",
      roles: ["super_admin", "company_admin"],
    },
    {
      name: "Child Jobs",
      href: "/admin/child-jobs",
      icon: "🔗",
      roles: ["super_admin", "company_admin"],
    },
    {
      name: "Contacts",
      href: "/admin/contacts",
      icon: "📞",
      roles: ["super_admin", "company_admin"],
    },
    {
      name: "AI Snapshots",
      href: "/admin/ai-snapshots",
      icon: "🤖",
      roles: ["super_admin", "company_admin"],
    },
    {
      name: "Chips",
      href: "/admin/chips",
      icon: "🏷️",
      roles: ["super_admin", "company_admin"],
    },
  ];

  const filteredNavItems = navigationItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <div className="bg-gray-50 flex max-h-screen min-h-screen">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <button
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-800"
            onClick={() => setSidebarOpen(false)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="mt-6">
          <div className="px-3">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 mb-1 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    isActive
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user.role.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-2 border-b border-gray-200 bg-white px-4 shadow-sm">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-4">
          <div className="mx-auto max-w-7xl px-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
