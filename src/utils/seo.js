// SEO utilities for EmpleoSafari.com

// Base site configuration
const SITE_CONFIG = {
  name: "EmpleoSafari",
  domain: "empleosafari.com",
  defaultTitle: "EmpleoSafari - Find Your Next Career Opportunity",
  defaultDescription:
    "Professional employment support platform. Find jobs, connect with companies, and advance your career with verified contacts and opportunities.",
  keywords:
    "empleos, trabajos, empleo, carrera, oportunidades laborales, empresas, contactos verificados",
};

// Generate page title with site name
export function generateTitle(pageTitle) {
  if (!pageTitle) return SITE_CONFIG.defaultTitle;
  return `${pageTitle} | ${SITE_CONFIG.name}`;
}

// Generate meta description
export function generateDescription(customDescription) {
  return customDescription || SITE_CONFIG.defaultDescription;
}

// Generate metadata object for Next.js pages
export function generateMetadata({
  title,
  description,
  keywords,
  openGraph = {},
  alternates = {},
}) {
  const finalTitle = generateTitle(title);
  const finalDescription = generateDescription(description);
  const finalKeywords = keywords
    ? `${SITE_CONFIG.keywords}, ${keywords}`
    : SITE_CONFIG.keywords;

  return {
    title: finalTitle,
    description: finalDescription,
    keywords: finalKeywords,
    openGraph: {
      type: "website",
      title: finalTitle,
      description: finalDescription,
      siteName: SITE_CONFIG.name,
      ...openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
    },
    alternates: {
      canonical: alternates.canonical,
      ...alternates,
    },
  };
}

// Pre-defined page metadata
export const PAGE_METADATA = {
  home: {
    title: "Find Your Next Career Opportunity",
    description:
      "Professional employment support platform. Find jobs, connect with companies, and advance your career with verified contacts and opportunities.",
    keywords: "empleos, trabajos, buscar empleo, oportunidades laborales",
  },

  jobs: {
    title: "Browse Job Opportunities",
    description:
      "Explore thousands of job opportunities from verified companies. Find your perfect role with detailed job descriptions and company insights.",
    keywords:
      "empleos disponibles, ofertas de trabajo, vacantes, búsqueda de empleo",
  },

  companies: {
    title: "Explore Companies",
    description:
      "Discover companies and their open positions. Get insights into company culture, values, and available opportunities.",
    keywords: "empresas, compañías, empleadores, cultura empresarial",
  },

  contacts: {
    title: "Professional Contacts",
    description:
      "Access verified professional contacts to advance your career. Connect with recruiters and hiring managers directly.",
    keywords:
      "contactos profesionales, reclutadores, networking, contactos verificados",
  },

  guide: {
    title: "How It Works - Career Guide",
    description:
      "Learn how to effectively use EmpleoSafari to find job opportunities and connect with the right contacts for your career growth.",
    keywords: "guía de empleo, cómo buscar trabajo, consejos de carrera",
  },

  overview: {
    title: "Career Overview Dashboard",
    description:
      "Your personalized career dashboard with job recommendations, application tracking, and professional insights.",
    keywords: "panel de empleo, seguimiento de aplicaciones, recomendaciones",
  },

  scholarships: {
    title: "Scholarships & Education",
    description:
      "Discover scholarship opportunities and educational programs to advance your skills and career prospects.",
    keywords: "becas, educación, desarrollo profesional, capacitación",
  },
};

// Dynamic metadata generators
export function generateJobMetadata(job, company) {
  if (!job) return PAGE_METADATA.jobs;

  const title = `${job.title} at ${company?.name || "Company"}`;
  const description = `${job.title} opportunity at ${
    company?.name || "a leading company"
  }. ${
    job.description
      ? job.description.substring(0, 120) + "..."
      : "Apply now and advance your career."
  }`;

  return {
    title,
    description,
    keywords: `${job.title}, ${
      company?.name || ""
    }, empleo, vacante, oportunidad laboral`,
  };
}

export function generateCompanyMetadata(company) {
  if (!company) return PAGE_METADATA.companies;

  const title = `${company.name} - Company Profile & Jobs`;
  const description = `Learn about ${company.name}. ${
    company.short_description || ""
  } View open positions and company information.`.trim();

  return {
    title,
    description,
    keywords: `${company.name}, empresa, empleador, vacantes, oportunidades`,
  };
}
