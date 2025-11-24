"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../components/AuthContext";
import adminService from "../../../services/adminService";

export default function AdminContactsPage() {
  const { user } = useAuth();

  // State management
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters and pagination
  const [filters, setFilters] = useState({
    search: "",
    company_id: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Form data - matching actual database schema
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    position: "",
    email: "",
    city: "",
    location: [],
    whatsapp: "",
    phone: "",
  });

  // Load contacts
  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };

      const response = await adminService.contacts.getAll(params);

      if (response.success) {
        setContacts(response.data || []);

        if (response.meta?.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.meta.pagination.total,
            totalPages: response.meta.pagination.totalPages,
          }));
        }
      } else {
        setError("Failed to load contacts");
      }
    } catch (err) {
      console.error("Load contacts error:", err);
      setError(err.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // Load companies for dropdown
  const loadCompanies = async () => {
    try {
      const response = await adminService.companies.getAll({ limit: 100 });
      if (response.success) {
        setCompanies(response.data || []);
      }
    } catch (err) {
      console.error("Load companies error:", err);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate location selection
    if (formData.location.length === 0) {
      setError("Please select at least one location");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let response;
      if (editingContact) {
        response = await adminService.contacts.update(
          editingContact.id,
          formData,
        );
      } else {
        response = await adminService.contacts.create(formData);
      }

      if (response.success) {
        setSuccess(
          editingContact
            ? "Contact updated successfully"
            : "Contact created successfully",
        );
        resetForm();
        loadContacts();
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

  // Handle delete
  const handleDelete = async (contact) => {
    if (!confirm(`Are you sure you want to delete "${contact.name}"?`)) return;

    try {
      setSubmitting(true);
      setError(null);

      const response = await adminService.contacts.delete(contact.id);

      if (response.success) {
        setSuccess("Contact deleted successfully");
        loadContacts();
      } else {
        setError(response.error || "Failed to delete contact");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete contact");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      company_id: "",
      name: "",
      position: "",
      email: "",
      whatsapp: "",
      phone: "",
      city: "",
      location: [],
    });
    setEditingContact(null);
    setShowForm(false);
  };

  // Handle edit
  const handleEdit = (contact) => {
    setFormData({
      company_id: contact.company_id || "",
      name: contact.name || "",
      position: contact.position || "",
      email: contact.email || "",
      whatsapp: contact.whatsapp || "",
      phone: contact.phone || "",
      city: contact.city || "",
      location: Array.isArray(contact.location) ? contact.location : [],
    });
    setEditingContact(contact);
    setShowForm(true);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Filter companies based on user role
  const availableCompanies =
    user?.role === "super_admin"
      ? companies
      : companies.filter((company) => company.id === user?.company_id);

  // Handle company selection and update location automatically
  const handleCompanyChange = (companyId) => {
    const selectedCompany = availableCompanies.find(
      (company) => company.id === parseInt(companyId),
    );

    setFormData((prev) => ({
      ...prev,
      company_id: companyId,
      // Set location to match the selected company's location
      // Only auto-populate if a company is selected (not empty string)
      location:
        companyId && selectedCompany && Array.isArray(selectedCompany.location)
          ? [...selectedCompany.location]
          : companyId
          ? []
          : prev.location, // Keep existing location if clearing company selection
    }));
  };

  // Effects
  useEffect(() => {
    if (user) {
      loadContacts();
      loadCompanies();
    }
  }, [user, pagination.page, pagination.limit, filters, loadContacts]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

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
                Contacts Management
              </h1>
              <p className="mt-2 text-gray-600">
                {user?.role === "super_admin"
                  ? "Manage all contacts in the system"
                  : "Manage your company contacts"}
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Add Contact
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
              placeholder="Search contacts..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
            />

            {user?.role === "super_admin" && (
              <select
                value={filters.company_id}
                onChange={(e) =>
                  handleFilterChange("company_id", e.target.value)
                }
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading contacts...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No contacts found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      {user?.role === "super_admin" && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
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
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {contact.name}
                            </div>
                          </div>
                        </td>
                        {user?.role === "super_admin" && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {contact.company_name || "-"}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {contact.position || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center">
                                <span className="text-gray-400 mr-1">📧</span>
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {contact.email}
                                </a>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center">
                                <span className="text-gray-400 mr-1">📞</span>
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {contact.phone}
                                </a>
                              </div>
                            )}
                            {contact.whatsapp && (
                              <div className="flex items-center">
                                <span className="text-gray-400 mr-1">💬</span>
                                <a
                                  href={`https://wa.me/${contact.whatsapp}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-800"
                                >
                                  WhatsApp
                                </a>
                              </div>
                            )}
                            {!contact.email &&
                              !contact.phone &&
                              !contact.whatsapp &&
                              "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.city || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Array.isArray(contact.location) &&
                          contact.location.length > 0
                            ? contact.location.join(", ")
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.created_at
                            ? new Date(contact.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(contact)}
                            className="text-purple-600 hover:text-purple-900 mr-1 cursor-pointer"
                            disabled={submitting}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(contact)}
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
                      Showing page {pagination.page} of {pagination.totalPages}{" "}
                      ({pagination.total} total)
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
            </>
          )}
        </div>

        {/* Contact Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white">
              <div className="mt-2">
                <h3 className="text-lg font-medium font-semibold text-gray-900 mb-4">
                  {editingContact ? "Edit Contact" : "Add New Contact"}
                </h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-2">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {user?.role === "super_admin" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Company *
                        </label>
                        <select
                          value={formData.company_id}
                          onChange={(e) => handleCompanyChange(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-[10.5px] focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                          required
                        >
                          <option value={null}>Select Company</option>
                          {availableCompanies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Position
                      </label>
                      <input
                        type="text"
                        placeholder="Position"
                        value={formData.position}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            position: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        WhatsApp (with country code)
                      </label>
                      <input
                        type="text"
                        placeholder="WhatsApp (with country code)"
                        value={formData.whatsapp}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            whatsapp: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Location *
                      </label>
                      <div className="space-y-1 flex flex-col">
                        {[
                          "Argentina",
                          "Chile",
                          "Colombia",
                          "Ecuador",
                          "México",
                          "Peru",
                          "Uruguay",
                        ].map((location) => (
                          <div key={location} className="cursor-pointer w-fit">
                            <input
                              type="checkbox"
                              checked={formData.location.includes(location)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    location: [...prev.location, location],
                                  }));
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    location: prev.location.filter(
                                      (loc) => loc !== location,
                                    ),
                                  }));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-gray-700">
                              {location}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Saving..."
                        : editingContact
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
    </div>
  );
}
