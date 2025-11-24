"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../components/AuthContext";
import adminService from "../../../services/adminService";

export default function AdminCompaniesPage() {
  const { user } = useAuth();

  // State management
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    short_description: "",
    full_description: "",
    location: [],
    color: "#3B82F6",
    is_active: true,
    logo_url: "",
  });

  // File upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Load companies (afhænger af filters/pagination)
  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await adminService.companies.getAll(params);

      if (response.success) {
        setCompanies(response.data || []);
        if (response.meta?.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.meta.pagination.total ?? prev.total,
            totalPages: response.meta.pagination.totalPages ?? prev.totalPages,
          }));
        }
      } else {
        setError(response.error || "Failed to load companies");
      }
    } catch (err) {
      setError(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.location.length === 0) {
      setError("Please select at least one location");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let response;
      const submitData = { ...formData };

      if (logoFile) {
        const formDataObj = new FormData();
        Object.entries(submitData).forEach(([key, value]) => {
          if (key === "location") {
            formDataObj.append(key, JSON.stringify(value));
          } else {
            formDataObj.append(key, value);
          }
        });
        formDataObj.append("logo", logoFile);

        response = editingCompany
          ? await adminService.companies.updateWithLogo(editingCompany.id, formDataObj)
          : await adminService.companies.createWithLogo(formDataObj);
      } else {
        response = editingCompany
          ? await adminService.companies.update(editingCompany.id, submitData)
          : await adminService.companies.create(submitData);
      }

      if (response.success) {
        setSuccess(editingCompany ? "Company updated successfully" : "Company created successfully");
        resetForm();
        loadCompanies();
      } else {
        setError(response.error || "Operation failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async (company) => {
    if (!confirm(`Are you sure you want to delete "${company.name}"?`)) return;
    try {
      setSubmitting(true);
      setError(null);
      const response = await adminService.companies.delete(company.id);
      if (response.success) {
        setSuccess("Company deleted successfully");
        loadCompanies();
      } else {
        setError(response.error || "Failed to delete company");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete company");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      short_description: "",
      full_description: "",
      location: [],
      color: "#3B82F6",
      is_active: true,
      logo_url: "",
    });
    setLogoFile(null);
    setLogoPreview(null);
    setEditingCompany(null);
    setShowForm(false);

    const fileInput = document.getElementById("logo-upload");
    if (fileInput) fileInput.value = "";
  };

  // Edit
  const handleEdit = (company) => {
    setFormData({
      name: company.name ?? "",
      short_description: company.short_description ?? "",
      full_description: company.full_description ?? "",
      location: Array.isArray(company.location) ? company.location : [],
      color: company.color ?? "#3B82F6",
      // FIX: bevar false – brug nullish coalescing, ikke ||
      is_active: company.is_active ?? true,
      logo_url: company.logo_url ?? "",
    });
    setLogoFile(null);
    setLogoPreview(company.logo_url ?? null);
    setEditingCompany(company);
    setShowForm(true);
  };

  // Filters
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Logo file
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const maxSize = 2 * 1024 * 1024;
      if (!allowedTypes.includes(file.type)) {
        setError("Please select a valid image file (JPG, PNG, GIF, WebP)");
        return;
      }
      if (file.size > maxSize) {
        setError("Logo file size must be less than 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target?.result);
      reader.readAsDataURL(file);
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  // Pagination
  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    setPagination((prev) => ({ ...prev, page: Math.min(newPage, prev.totalPages || newPage) }));
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Effects
  // FIX: undgå dobbelt-kørsler – lad loadCompanies' egne deps styre dataændringer
  useEffect(() => {
    if (user) loadCompanies();
  }, [user, loadCompanies]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Permission gate
  if (!user || !["super_admin"].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need Super Admin privileges to access this page.</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Companies Management</h1>
              <p className="mt-2 text-gray-600">Manage all companies in the system</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Add Company
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Search companies..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
            />

            <select
              value={String(filters.status)}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading companies...</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No companies found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Short Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companies.map((company) => (
                      <tr key={company.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {company.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  className="h-10 w-10 rounded-lg object-cover"
                                  src={company.logo_url}
                                  alt={`${company.name} logo`}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-300 flex items-center justify-center">
                                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: company.color || "#3B82F6" }}
                            />
                            <span className="ml-2 text-sm text-gray-600">
                              {company.color || "#3B82F6"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Array.isArray(company.location) && company.location.length > 0
                            ? company.location.join(", ")
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {company.short_description || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              company.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {company.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => handleEdit(company)}
                            className="text-blue-600 hover:text-blue-900 mr-1 cursor-pointer"
                            disabled={submitting}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(company)}
                            className="text-red-600 hover:text-red-900 cursor-pointer"
                            disabled={submitting}
                          >
                            🗑️
                          </button>
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
                      Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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

        {/* Company Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative mx-auto p-4 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white">
              <div className="mt-2">
                <h3 className="text-lg font-medium font-semibold text-gray-900 mb-4">
                  {editingCompany ? "Edit Company" : "Add New Company"}
                </h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-2">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Company name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Location *
                      </label>
                      <div className="space-y-1 flex flex-col">
                        {["Argentina","Chile","Colombia","Ecuador","México","Peru","Uruguay"].map((location) => (
                          <div key={location} className="cursor-pointer w-fit">
                            <input
                              type="checkbox"
                              checked={formData.location.includes(location)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData((prev) => ({ ...prev, location: [...prev.location, location] }));
                                } else {
                                  setFormData((prev) => ({ ...prev, location: prev.location.filter((loc) => loc !== location) }));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-gray-700">{location}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={String(formData.is_active)}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, is_active: e.target.value === "true" }))
                        }
                        className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-300 w-full"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Company Logo
                      </label>
                      <div className="flex items-center space-x-4">
                        {logoPreview && (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                            />
                          </div>
                        )}
                        <div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleLogoChange}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label
                            htmlFor="logo-upload"
                            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                            </svg>
                            {logoFile || logoPreview ? "Change Logo" : "Upload Logo"}
                          </label>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP up to 2MB</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Color</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                        className="h-10 w-16 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value && !value.startsWith("#")) value = "#" + value;
                          setFormData((prev) => ({ ...prev, color: value }));
                        }}
                        placeholder="#3B82F6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-300 flex-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Quick colors:</span>
                      {["#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899","#6B7280","#F97316"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, color }))}
                          className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                          style={{ backgroundColor: color }}
                          aria-label={`Pick ${color}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Preview:</span>
                      <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: formData.color }} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Short Description</label>
                    <textarea
                      placeholder="Short description of the company"
                      value={formData.short_description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, short_description: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Description</label>
                    <textarea
                      placeholder="Full description of the company"
                      value={formData.full_description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, full_description: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder:text-gray-300"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      disabled={submitting}
                    >
                      {submitting ? "Saving..." : editingCompany ? "Update" : "Create"}
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
    </div>
  );
}
