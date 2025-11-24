"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../components/AuthContext";
import adminService from "../../../services/adminService";

export default function ChildJobsPage() {
  const { user } = useAuth();
  const [childJobs, setChildJobs] = useState([]);
  const [parentJobs, setParentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingChildJob, setEditingChildJob] = useState(null);
  const [formData, setFormData] = useState({
    parent_job_id: "",
    title: "",
    city: "",
    country: "México",
    link: "",
    source: "Computrabajo",
  });

  // Pagination and filtering
  const [filters, setFilters] = useState({
    search: "",
    parent_job_id: "",
    source: "",
    country: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const validCountries = [
    "México",
    "Peru",
    "Argentina",
    "Chile",
    "Colombia",
    "Ecuador",
    "Uruguay",
  ];

  const validSources = [
    "Computrabajo",
    "LinkedIn",
    "Company website",
    "Indeed",
    "Glassdoor",
    "Other",
  ];

  // Load child jobs
  const loadChildJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await adminService.childJobs.getAll(params);

      if (response.success) {
        setChildJobs(response.data);
        setPagination((prev) => ({
          ...prev,
          total: response.meta.pagination.total,
          totalPages: response.meta.pagination.totalPages,
        }));
      } else {
        setError(response.error || "Failed to fetch child jobs");
      }
    } catch (err) {
      console.error("Load child jobs error:", err);
      setError("Failed to fetch child jobs");
    } finally {
      setLoading(false);
    }
  };

  // Load parent jobs for dropdown
  const loadParentJobs = async () => {
    try {
      const response = await adminService.jobs.getAll({ limit: 100 });

      if (response.success) {
        setParentJobs(response.data);
      }
    } catch (err) {
      console.error("Load parent jobs error:", err);
    }
  };

  // Create or update child job
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      let response;
      if (editingChildJob) {
        response = await adminService.childJobs.update(
          editingChildJob.id,
          formData,
        );
      } else {
        response = await adminService.childJobs.create(formData);
      }

      if (response.success) {
        await loadChildJobs();
        setShowForm(false);
        setEditingChildJob(null);
        setFormData({
          parent_job_id: "",
          title: "",
          city: "",
          country: "México",
          link: "",
          source: "Computrabajo",
        });
      } else {
        setError(response.error || "Failed to save child job");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("Failed to save child job");
    } finally {
      setLoading(false);
    }
  };

  // Delete child job
  const handleDelete = async (childJobId) => {
    if (!confirm("Are you sure you want to delete this child job?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminService.childJobs.delete(childJobId);

      if (response.success) {
        await loadChildJobs();
      } else {
        setError(response.error || "Failed to delete child job");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete child job");
    } finally {
      setLoading(false);
    }
  };

  // Edit child job
  const handleEdit = (childJob) => {
    setEditingChildJob(childJob);
    setFormData({
      parent_job_id: childJob.parent_job_id,
      title: childJob.title,
      city: childJob.city,
      country: childJob.country,
      link: childJob.link,
      source: childJob.source,
    });
    setShowForm(true);
  };

  // Apply filters
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  useEffect(() => {
    if (user) {
      loadParentJobs();
      loadChildJobs();
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
                Child Jobs Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage external job listings linked to your posted jobs
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingChildJob(null);
                setFormData({
                  parent_job_id: "",
                  title: "",
                  city: "",
                  country: "México",
                  link: "",
                  source: "Computrabajo",
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Child Job
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  handleFilterChange({ ...filters, search: e.target.value })
                }
                placeholder="Search title, city, source..."
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500 w-full"
              />
            </div>
            <div>
              <select
                value={filters.parent_job_id}
                onChange={(e) =>
                  handleFilterChange({
                    ...filters,
                    parent_job_id: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500 w-full"
              >
                <option value="">All Parent Jobs</option>
                {parentJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} - {job.company?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filters.source}
                onChange={(e) =>
                  handleFilterChange({ ...filters, source: e.target.value })
                }
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500 w-full"
              >
                <option value="">All Sources</option>
                {validSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filters.country}
                onChange={(e) =>
                  handleFilterChange({ ...filters, country: e.target.value })
                }
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500 w-full"
              >
                <option value="">All Countries</option>
                {validCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Child Jobs Table */}
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
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Link
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
                  {childJobs.map((childJob) => (
                    <tr key={childJob.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {childJob.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {childJob.parent_job_title}
                        <br />
                        <span className="text-xs text-gray-400">
                          {childJob.company_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {childJob.city}, {childJob.country}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {childJob.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a
                          href={childJob.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 truncate block max-w-xs"
                        >
                          {childJob.link}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(childJob.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(childJob)}
                          className="text-blue-600 hover:text-blue-900 mr-1 cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(childJob.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {childJobs.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No child jobs found</p>
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
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white mb-24">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingChildJob ? "Edit Child Job" : "Add Child Job"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Job *
                    </label>
                    <select
                      value={formData.parent_job_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          parent_job_id: e.target.value,
                        })
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    >
                      <option value="">Select Parent Job</option>
                      {parentJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} - {job.company?.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    >
                      {validCountries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link *
                    </label>
                    <input
                      type="url"
                      value={formData.link}
                      onChange={(e) =>
                        setFormData({ ...formData, link: e.target.value })
                      }
                      required
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source *
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        setFormData({ ...formData, source: e.target.value })
                      }
                      required
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                    >
                      {validSources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading
                        ? "Saving..."
                        : editingChildJob
                        ? "Update"
                        : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingChildJob(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
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
