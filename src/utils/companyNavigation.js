// Utility functions for company navigation with hidden ID

/**
 * Navigate to company details while hiding the ID from URL
 * @param {Object} router - Next.js router instance
 * @param {Object} company - Company object with id and name
 */
export const navigateToCompany = (router, company) => {
  const companySlug = company.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Store company data for retrieval on destination page
  if (typeof window !== "undefined") {
    sessionStorage.setItem(
      "currentCompany",
      JSON.stringify({
        id: company.id,
        slug: companySlug,
        data: company,
        timestamp: Date.now(),
      }),
    );
  }

  router.push(`/empresas/${companySlug}`);
};

/**
 * Retrieve company data on the destination page
 * @param {string} expectedSlug - The slug from the URL to verify
 * @returns {Object|null} Company data or null if not found/expired
 */
export const getCompanyFromNavigation = (expectedSlug) => {
  if (typeof window === "undefined") return null;

  try {
    const storedData = sessionStorage.getItem("currentCompany");
    if (!storedData) return null;

    const companyData = JSON.parse(storedData);

    // Check if data is not too old (5 minutes)
    if (Date.now() - companyData.timestamp > 5 * 60 * 1000) {
      sessionStorage.removeItem("currentCompany");
      return null;
    }

    // Verify the slug matches
    if (companyData.slug !== expectedSlug) {
      return null;
    }

    return companyData;
  } catch (error) {
    console.error("Error retrieving company data:", error);
    sessionStorage.removeItem("currentCompany");
    return null;
  }
};

/**
 * Clear company navigation data
 */
export const clearCompanyNavigation = () => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("currentCompany");
  }
};
