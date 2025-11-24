import Link from "next/link";
import { jobsService } from "../../../services/jobsService";
import { generateJobMetadata } from "../../../utils/seo";
import JobDetailsClient from "./JobDetailsClient";

// ISR: Opdaterer cachen hver 22. time ca.
export const revalidate = 80000;

// SSG: Genererer statiske stier ved build-time
export async function generateStaticParams() {
  try {
    const response = await jobsService.getJobsAttributes();
    // Sikrer at vi kun mapper hvis vi har data, ellers tom array (ISR tager over)
    if (response?.data && Array.isArray(response.data)) {
      return response.data.map((attribute) => ({ id: String(attribute.id) }));
    }
    return [];
  } catch (error) {
    console.warn(
      "API not available during build, using fallback static params:",
      error.message
    );
    return []; // Fallback: Next.js genererer siderne on-demand ved første besøg
  }
}

// Metadata (Standard SEO - ingen Geo her da robotter ikke har en lokation)
export async function generateMetadata({ params }) {
  const { id } = params;
  try {
    const response = await jobsService.getJobById(id);
    if (response?.success) {
      const { job, company } = response.data;
      return {
        ...generateJobMetadata(job, company),
        alternates: { canonical: `/empleos/${id}/` },
      };
    }
  } catch (error) {
    console.warn("Failed to generate metadata for job:", error);
  }
  return {
    title: "Detalles del Empleo | EmpleoSafari",
    description: "Ver información detallada del empleo y postularse a oportunidades emocionantes.",
  };
}

// SERVER COMPONENT
export default async function JobDetailsPage({ params }) {
  const { id } = params;

  let data = null;
  try {
    const response = await jobsService.getJobById(id);
    if (response?.success) {
      data = response.data;
    }
  } catch (e) {
    console.warn("SSR getJobById failed:", e);
  }

  // Fallback UI hvis jobbet ikke findes
  if (!data || !data.job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 py-8 flex items-center justify-center">
        <div className="container max-w-md mx-auto">
          <div className="bg-white shadow-xl p-6 md:p-8 text-center rounded-2xl border border-blue-50">
            <div className="mb-4 text-6xl">🔍</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              Empleo no encontrado
            </h1>
            <p className="text-gray-600 mb-6 leading-relaxed">
              El empleo que buscas no existe o ha sido eliminado de nuestra plataforma.
            </p>
            <Link
              href="/empleos"
              className="inline-block bg-[#facc15] text-yellow-900 px-6 py-3 rounded-xl font-bold hover:bg-[#eab308] hover:scale-[1.02] transition-all shadow-md"
            >
              Ver otros empleos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    job,
    company,
    childJobs = [],
    aiSnapshot = null,
    contacts = [],
    chips = [],
  } = data;

  // 🔹 GEO LABEL INTEGRATION:
  // Vi sender placeholderen "[[GEO_LABEL]]" ned.
  // Middlewaren erstatter denne i HTML'en ved første load.
  // JobDetailsClient skal bruge <GeoText /> til at vise den korrekt ved navigation.
  const locationText = "[[GEO_LABEL]]";

  return (
    <JobDetailsClient
      job={job}
      company={company}
      childJobs={childJobs}
      aiSnapshot={aiSnapshot}
      contacts={contacts}
      chips={chips}
      locationText={locationText}
    />
  );
}
