//
"use client";

import { useAuth } from "../../../components/AuthContext";
import adminService from "../../../services/adminService";
import { useState, useEffect, useCallback } from "react";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "user",
    company_id: "",
    credits: 0,
    is_active: true,
  });

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    page: 1,
  });

  // Auto-clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Load users
  const loadUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
        search: filters.search,
        role: filters.role,
      };

      const response = await adminService.users.getAll(params);

      if (response.success && response.data) {
        setUsers(response.data);
        setPagination(response.meta.pagination);
      } else {
        setError("Failed to load users");
      }
    } catch (err) {
      console.error("Load users error:", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Load companies for super admin
  const loadCompanies = async () => {
    if (user.role === "super_admin") {
      try {
        const response = await adminService.companies.getAll({ limit: 100 });
        if (response.companies) {
          setCompanies(response.companies);
        }
      } catch (err) {
        console.error("Load companies error:", err);
      }
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      loadUsers();
      loadCompanies();
    }
  }, [user, filters]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (editingUser) {
        // Update existing user
        const updateData = { ...formData };
        delete updateData.password; // Don't update password in edit mode
        delete updateData.email; // Don't update email in edit mode

        // Convert empty string to null for company_id
        if (updateData.company_id === "") {
          updateData.company_id = null;
        }

        const response = await adminService.users.update(
          editingUser.id,
          updateData,
        );

        if (response.success && response.data) {
          setSuccess("User updated successfully");
          loadUsers(pagination.page);
          resetForm();
        } else {
          setError(response.error || "Failed to update user");
        }
      } else {
        // Create new user
        const createData = { ...formData };
        // Convert empty string to null for company_id
        if (createData.company_id === "") {
          createData.company_id = null;
        }

        const response = await adminService.users.create(createData);

        if (response.success && response.data) {
          setSuccess("User created successfully");
          loadUsers(pagination.page);
          resetForm();
        } else {
          setError(response.error || "Failed to create user");
        }
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role: "user",
      company_id: user.role === "company_admin" ? user.company_id : "",
      credits: 0,
      is_active: true,
    });
    setEditingUser(null);
    setShowForm(false);
  };

  // Handle edit
  const handleEdit = (userToEdit) => {
    setFormData({
      email: userToEdit.email,
      password: "", // Don't pre-fill password
      first_name: userToEdit.first_name,
      last_name: userToEdit.last_name,
      role: userToEdit.role,
      company_id: userToEdit.company_id || "",
      credits: userToEdit.credits || 0,
      is_active: userToEdit.is_active,
    });
    setEditingUser(userToEdit);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }

    try {
      setError(null);
      const response = await adminService.users.delete(userId);

      if (response.success) {
        setSuccess("User deleted successfully");
        loadUsers(pagination.page);
      } else {
        setError(response.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete user");
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
    loadUsers(newPage);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const roleOptions = [
    { value: "user", label: "User", description: "Regular user access" },
    {
      value: "company_admin",
      label: "Company Admin",
      description: "Can manage company users and content",
    },
    {
      value: "super_admin",
      label: "Super Admin",
      description: "Full system access",
    },
  ];

  // Filter role options based on current user's permissions
  const availableRoles =
    user.role === "super_admin"
      ? roleOptions
      : roleOptions.filter((role) => role.value === "user");

  // Filter role options for form based on current user's permissions
  const availableFormRoles =
    user.role === "super_admin"
      ? roleOptions
      : roleOptions.filter((role) => role.value === "user");

  // Check permissions
  if (!user || !["super_admin", "company_admin"].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You need Admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Users Management
              </h1>
              <p className="mt-2 text-gray-600">
                {user?.role === "super_admin"
                  ? "Manage all users in the system"
                  : "Manage users in your company"}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Add User
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
            />

            <select
              value={filters.role}
              onChange={(e) => handleFilterChange("role", e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
            >
              <option value="">All Roles</option>
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                      .filter((userItem) => userItem.id !== user.id)
                      .map((userItem) => (
                        <tr key={userItem.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {userItem.first_name} {userItem.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {userItem.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userItem.role === "super_admin"
                                  ? "bg-red-100 text-red-800"
                                  : userItem.role === "company_admin"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {userItem.role.replace("_", " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {userItem.company_name || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {userItem.credits || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userItem.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {userItem.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(userItem.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit(userItem)}
                              className="text-blue-600 hover:text-blue-900 mr-1 cursor-pointer"
                              disabled={submitting}
                            >
                              ✏️
                            </button>
                            {userItem.id !== user.id && (
                              <button
                                onClick={() =>
                                  handleDelete(
                                    userItem.id,
                                    `${userItem.first_name} ${userItem.last_name}`,
                                  )
                                }
                                className="text-red-600 hover:text-red-900 cursor-pointer"
                                disabled={submitting}
                              >
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing page {pagination.page} of {pagination.totalPages}{" "}
                      ({pagination.total} total)
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrev || loading}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNext || loading}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white">
            <div className="mt-2">
              <h3 className="text-lg font-medium font-semibold text-gray-900 mb-4">
                {editingUser ? "Edit User" : "Add New User"}
              </h3>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-2">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        placeholder="user@example.com"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                      />
                    </div>
                  )}

                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        placeholder="Enter password"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      required
                      placeholder="First name"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      required
                      placeholder="Last name"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                    />
                  </div>

                  {user.role === "super_admin" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-[10.5px] focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                      >
                        {availableFormRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {
                          availableFormRoles.find(
                            (r) => r.value === formData.role,
                          )?.description
                        }
                      </p>
                    </div>
                  )}

                  {companies.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Company{" "}
                        {user.role === "company_admin" &&
                        (formData.role === "company_admin" ||
                          formData.role === "super_admin")
                          ? "*"
                          : ""}
                      </label>
                      <select
                        value={formData.company_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            company_id: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-[10.5px] focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                        required={
                          user.role === "company_admin" &&
                          (formData.role === "company_admin" ||
                            formData.role === "super_admin")
                        }
                      >
                        <option value="">
                          {user.role === "company_admin" &&
                          (formData.role === "company_admin" ||
                            formData.role === "super_admin")
                            ? "Select Company *"
                            : "No Company"}
                        </option>
                        {user.role === "super_admin"
                          ? // Super admin sees all companies
                            companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))
                          : // Company admin sees only their company, but can assign users to it
                            companies
                              .filter((company) =>
                                user.role === "company_admin"
                                  ? company.id === user.company_id
                                  : true,
                              )
                              .map((company) => (
                                <option key={company.id} value={company.id}>
                                  {company.name}
                                </option>
                              ))}
                      </select>
                      {user.role === "company_admin" && (
                        <p className="mt-1 text-xs text-gray-500">
                          {formData.role === "user"
                            ? "Users can optionally be assigned to your company"
                            : "Admin users must be assigned to your company"}
                        </p>
                      )}
                    </div>
                  )}

                  {user.role === "super_admin" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Credits
                      </label>
                      <input
                        type="number"
                        value={formData.credits}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            credits: parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="is_active"
                      className="ml-2 block text-sm text-gray-700"
                    >
                      Active User
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Processing..."
                      : editingUser
                      ? "Update"
                      : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
