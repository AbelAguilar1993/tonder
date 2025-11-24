"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../components/AuthContext";
import adminService from "../../../services/adminService";

export default function AISnapshotsPage() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);
  const [formData, setFormData] = useState({
    job_title: "",
    employment_type: "",
    market_insights: "",
    salary_range: "",
    required_skills: "",
    application_tips: "",
    company_specific_tips: "",
    is_active: true,
  });

  // Pagination and filtering
  const [filters, setFilters] = useState({
    search: "",
    employment_type: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const validEmploymentTypes = [
    "full-time",
    "part-time",
    "contract",
    "internship",
    "temporary",
  ];

  // Load AI snapshots
  const loadSnapshots = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await adminService.aiSnapshots.getAll(params);

      if (response.success) {
        setSnapshots(response.data);
        setPagination((prev) => ({
          ...prev,
          total: response.meta.pagination.total,
          totalPages: response.meta.pagination.totalPages,
        }));
      } else {
        setError(response.error || "Failed to fetch AI snapshots");
      }
    } catch (err) {
      console.error("Load snapshots error:", err);
      setError("Failed to fetch AI snapshots");
    } finally {
      setLoading(false);
    }
  };

  // Load jobs for selection
  const loadJobs = async () => {
    try {
      const response = await adminService.jobs.getAll({ limit: 100 });
      if (response.success) {
        setJobs(response.data || []);
      }
    } catch (err) {
      console.error("Load jobs error:", err);
      setJobs([]);
    }
  };

  // Create or update AI snapshot
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Prepare data with JSON parsing
      const submitData = {
        ...formData,
        market_insights: formData.market_insights
          ? typeof formData.market_insights === "string"
            ? formData.market_insights
            : JSON.stringify(formData.market_insights)
          : {},
        salary_range: formData.salary_range
          ? typeof formData.salary_range === "string"
            ? formData.salary_range
            : JSON.stringify(formData.salary_range)
          : {},
        required_skills: formData.required_skills
          ? typeof formData.required_skills === "string"
            ? formData.required_skills
            : JSON.stringify(formData.required_skills)
          : {},
      };

      let response;
      if (editingSnapshot) {
        response = await adminService.aiSnapshots.update(
          editingSnapshot.id,
          submitData,
        );
      } else {
        response = await adminService.aiSnapshots.create(submitData);
      }

      if (response.success) {
        await loadSnapshots(pagination.page);
        setShowForm(false);
        setEditingSnapshot(null);
        resetForm();
      } else {
        setError(response.error || "Failed to save AI snapshot");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to save AI snapshot");
    } finally {
      setLoading(false);
    }
  };

  // Delete AI snapshot
  const handleDelete = async (snapshotId) => {
    if (!confirm("Are you sure you want to delete this AI snapshot?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminService.aiSnapshots.delete(snapshotId);

      if (response.success) {
        await loadSnapshots(pagination.page);
      } else {
        setError(response.error || "Failed to delete AI snapshot");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete AI snapshot");
    } finally {
      setLoading(false);
    }
  };

  // Edit AI snapshot
  const handleEdit = (snapshot) => {
    setEditingSnapshot(snapshot);
    setFormData({
      job_title: snapshot.job_title || "",
      employment_type: snapshot.employment_type || "",
      market_insights: snapshot.market_insights
        ? JSON.stringify(snapshot.market_insights, null, 2)
        : "",
      salary_range: snapshot.salary_range
        ? JSON.stringify(snapshot.salary_range, null, 2)
        : "",
      required_skills: snapshot.required_skills
        ? JSON.stringify(snapshot.required_skills, null, 2)
        : "",
      application_tips: snapshot.application_tips || "",
      company_specific_tips: snapshot.company_specific_tips || "",
      is_active: snapshot.is_active,
    });
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      job_title: "",
      employment_type: "",
      market_insights: "",
      salary_range: "",
      required_skills: "",
      application_tips: "",
      company_specific_tips: "",
      is_active: true,
    });
  };

  // Apply filters
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  useEffect(() => {
    if (user) {
      loadSnapshots(pagination.page);
      loadJobs();
    }
  }, [user, pagination.page, filters]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Snapshots Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage AI-generated job market insights and application tips
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingSnapshot(null);
                resetForm();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add AI Snapshot
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange({ ...filters, search: e.target.value })
                }
                placeholder="Search job title"
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500 w-full"
              />
            </div>
            <div>
              <select
                value={filters.employment_type}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    employment_type: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500 w-full"
              >
                <option value="">All Types</option>
                {validEmploymentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* AI Snapshots Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Targeting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market Insights
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {snapshots.map((snapshot) => (
                    <tr key={snapshot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {snapshot.job_title && (
                            <div className="font-medium">
                              {snapshot.job_title}
                            </div>
                          )}
                          {snapshot.employment_type && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                              {snapshot.employment_type}
                            </span>
                          )}
                          {!snapshot.job_title && !snapshot.employment_type && (
                            <span className="text-gray-500 italic">
                              Generic (Fallback)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        {snapshot.market_insights && (
                          <div className="truncate">
                            {typeof snapshot.market_insights === "object"
                              ? `${
                                  Object.keys(snapshot.market_insights).length
                                } insights`
                              : "Market insights available"}
                          </div>
                        )}
                        {snapshot.salary_range && (
                          <div className="text-xs text-gray-400">
                            Salary range included
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            snapshot.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {snapshot.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(snapshot.created_at).toLocaleDateString()}
                        {snapshot.created_by_full_name && (
                          <div className="text-xs text-gray-400">
                            by {snapshot.created_by_full_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(snapshot)}
                          className="text-blue-600 hover:text-blue-900 mr-1 cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(snapshot.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {snapshots.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No AI snapshots found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
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
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-24">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingSnapshot ? "Edit AI Snapshot" : "Add AI Snapshot"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        value={formData.job_title}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            job_title: e.target.value,
                          })
                        }
                        required
                        placeholder="Leave empty for general"
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employment Type
                      </label>
                      <select
                        value={formData.employment_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            employment_type: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      >
                        <option value="">Leave empty for general</option>
                        {validEmploymentTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Market Insights (JSON)
                    </label>
                    <textarea
                      value={formData.market_insights}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          market_insights: e.target.value,
                        })
                      }
                      placeholder='{"demand": "high", "competition": "medium", "growth": "15%"}'
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary Range (JSON)
                    </label>
                    <textarea
                      value={formData.salary_range}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salary_range: e.target.value,
                        })
                      }
                      placeholder='{"min": 25000, "max": 35000, "currency": "MXN", "period": "monthly"}'
                      rows="2"
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Skills (JSON Array)
                    </label>
                    <textarea
                      value={formData.required_skills}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          required_skills: e.target.value,
                        })
                      }
                      placeholder='["Excel", "Customer Service", "Spanish"]'
                      rows="2"
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Application Tips
                    </label>
                    <textarea
                      value={formData.application_tips}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          application_tips: e.target.value,
                        })
                      }
                      placeholder="General application advice..."
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Specific Tips
                    </label>
                    <textarea
                      value={formData.company_specific_tips}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company_specific_tips: e.target.value,
                        })
                      }
                      placeholder="Tips specific to certain companies..."
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading
                        ? "Saving..."
                        : editingSnapshot
                        ? "Update"
                        : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingSnapshot(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
