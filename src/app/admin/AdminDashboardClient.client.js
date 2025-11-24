"use client";

import Link from "next/link";
import { useAuth } from "../../components/AuthContext";
import adminService from "../../services/adminService";
import { useState, useEffect } from "react";

export default function AdminDashboardClient() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    companies: 0,
    jobs: 0,
    childJobs: 0,
    aiSnapshots: 0,
    chips: 0,
    contacts: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.stats.get();

      if (response?.success || response?.companies !== undefined) {
        setStats({
          companies: response.companies || 0,
          jobs: response.jobs || 0,
          childJobs: response.childJobs || 0,
          aiSnapshots: response.aiSnapshots || 0,
          chips: response.chips || 0,
          contacts: response.contacts || 0,
          users: response.users || 0,
        });
        setLastUpdated(new Date());
      } else {
        setError("Failed to load statistics");
      }
    } catch (err) {
      console.error("Load stats error:", err);
      setError(err.message || "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        <span className="ml-3 text-gray-600">Loading session…</span>
      </div>
    );
  }

  const statCards = [
    { name: "Companies", value: stats.companies, icon: "🏢", color: "bg-blue-500", show: user.role === "super_admin" },
    { name: "Active Jobs", value: stats.jobs, icon: "💼", color: "bg-green-500", show: true },
    { name: "Child Jobs", value: stats.childJobs, icon: "🔗", color: "bg-cyan-500", show: true },
    { name: "AI Snapshots", value: stats.aiSnapshots, icon: "🤖", color: "bg-indigo-500", show: true },
    { name: "Chips", value: stats.chips, icon: "🏷️", color: "bg-pink-500", show: true },
    { name: "Contacts", value: stats.contacts, icon: "📞", color: "bg-purple-500", show: true },
    { name: "Users", value: stats.users, icon: "👥", color: "bg-orange-500", show: user.role === "super_admin" },
  ].filter((c) => c.show);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.firstName}!</h1>
            <p className="text-gray-600 mt-2">
              {user.role === "super_admin" ? "Super Administrator Dashboard" : "Company Administrator Dashboard"}
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color} text-white text-2xl`}>{stat.icon}</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <div className="flex items-center">
                  <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                  {loading && (
                    <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.role === "super_admin" && (
              <Link href="/admin/companies" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-150 group">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors"><span className="text-xl">🏢</span></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Manage Companies</p>
                    <p className="text-xs text-gray-500">Add, edit, and manage companies</p>
                  </div>
                </div>
              </Link>
            )}
            <Link href="/admin/jobs" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-150 group">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors"><span className="text-xl">💼</span></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Manage Jobs</p>
                  <p className="text-xs text-gray-500">Create and update job postings</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/contacts" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-150 group">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors"><span className="text-xl">📞</span></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Manage Contacts</p>
                  <p className="text-xs text-gray-500">Handle contact opportunities</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/child-jobs" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-150 group">
              <div className="flex items-center">
                <div className="p-2 bg-cyan-100 rounded-lg group-hover:bg-cyan-200 transition-colors"><span className="text-xl">🔗</span></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Manage Child Jobs</p>
                  <p className="text-xs text-gray-500">Create and update child jobs</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/ai-snapshots" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-150 group">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors"><span className="text-xl">🤖</span></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Manage AI Snapshots</p>
                  <p className="text-xs text-gray-500">Create and update AI snapshots</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/chips" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-150 group">
              <div className="flex items-center">
                <div className="p-2 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition-colors"><span className="text-xl">🏷️</span></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Manage Chips</p>
                  <p className="text-xs text-gray-500">Create and update chips</p>
                </div>
              </div>
            </Link>
            <Link href="/admin/users" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-150 group">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors"><span className="text-xl">👥</span></div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Manage Users</p>
                  <p className="text-xs text-gray-500">
                    {user.role === "super_admin" ? "Add and manage all users" : "Manage company users"}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="text-gray-500 text-center py-12">
            <span className="text-4xl mb-4 block">📊</span>
            <p className="text-sm">Recent activity will be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
