// SERVER COMPONENT (ingen "use client")
import companiesService from "../../../services/companiesService";
import jobsService from "../../../services/jobsService";
import contactsService from "../../../services/contactsService";

// ⬇️ importér klient-komponenter direkte (ingen dynamic/Boundary)
import CompanyJobs from "./CompanyJobs.client";
import CompanyContacts from "./CompanyContacts.client";

import StickyApplyFooter from "./StickyApplyFooter.client";
import ActualizadoBadge from "./ActualizadoBadge.client";
import ContactsTotalBadge from "./ContactsTotalBadge.client"; // klient-ø til total
import { GeoText } from "../../../components/GeoText"; // <<<<< NY IMPORT

// Krævet ved output:"export" for dynamiske routes
export async function generateStaticParams() {
  try {
    const response = await companiesService.getCompaniesAttributes();
    return response.data.map((attribute) => ({ company_name: attribute.slug }));
  } catch (error) {
    console.warn("Error generating static params for companies:", error);
    return [{ company_name: "0" }];
  }
}

export async function generateMetadata({ params }) {
  const { company_name } = await params;

  // Capitalize first letter for safety
  const cleanName =
    company_name.charAt(0).toUpperCase() + company_name.slice(1);

  const title = `💼 Empleos en ${cleanName} | Aplica directo al reclutador`;
  // [DK: Jobtitler og branding: virksomhed + handlingsopfordring]

  const description = `Descubre vacantes reales en ${cleanName}. 💜 Conecta con reclutadores verificados, conoce la cultura de la empresa y aplica en segundos desde EmpleoSafari.`;
  // [DK: Beskrivelse: lokker med autenticitet, hurtighed og tillid]

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "EmpleoSafari",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

// Server-only helper
function truncateAtWord(str, max) {
  const s = (str || "").trim();
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const cut = slice.lastIndexOf(" ");
  return (cut > 0 ? slice.slice(0, cut) : slice).trim();
}

// ===== Server-only helper =====
function getTextColorForBackground(hexColor) {
  if (!hexColor) return "#1f2937";
  const c = hexColor.replace("#", "");
  if (c.length !== 6) return "#1f2937";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#fff";
}

// Robust total-udtræk uanset API-form
function pluckTotal(res) {
  return (
    res?.meta?.pagination?.total ??
    res?.data?.meta?.pagination?.total ??
    res?.data?.pagination?.total ??
    res?.data?.total ??
    0
  );
}

// Server-renderet hero (ActualizadoBadge og ContactsTotalBadge er små client-øer)
function CompanyHeroSectionServer({
  company,
  contactsTotal,
  jobsTotal,
  locationText,
}) {
  const base = company.color || "#e7e7e7";
  const heroTextColor = getTextColorForBackground(base);
  const onDark = heroTextColor === "#fff";

  return (
    <header
      className="text-gray-600 mb-4 min-h-32 border-b p-4"
      style={{
        borderBottomColor: base,
        background: `
          linear-gradient(180deg, ${base} 0 20%, transparent 20% 100%),
          radial-gradient(1000px 320px at 90% -80px, rgba(255,255,255,.14), rgba(255,255,255,0) 60%),
          linear-gradient(180deg, ${base} 0 20%, #fff 85%)
        `,
      }}
    >
      <div className="flex gap-4">
        <div
          className="rounded-lg shadow-md border w-20 h-20 flex-shrink-0 flex justify-center items-center"
          style={{
            backgroundColor: base,
            borderColor: heroTextColor,
            boxShadow: "0 4px 12px rgba(0,0,0,.12), 0 0 4px rgba(0,0,0,.08)",
          }}
        >
          <img
            src={company.logo_url || "/company-logo.png"}
            alt={`${company.name} logo`}
            className="h-full w-full object-contain rounded-lg"
          />
        </div>

        <div className="flex flex-col w-full gap-1 justify-between">
          <h1
            className={`text-xl font-bold drop-shadow-lg ${
              onDark ? "text-white" : "text-gray-800"
            }`}
          >
            {company.name}
          </h1>

          {company.short_description
            ? (() => {
                const full = (company.short_description || "").trim();
                const MAX = 25;
                const truncated =
                  full.length > MAX
                    ? truncateAtWord(full, MAX) + "…"
                    : full;
                const id = `desc-toggle-${company.id || company.slug || "x"}`;
                const linkClass = onDark
                  ? "text-white/90 underline decoration-white/50 hover:decoration-white"
                  : "text-[#5E3FA6] hover:underline";

                return (
                  <p
                    className={`text-sm drop-shadow leading-relaxed ${
                      onDark ? "text-white/90" : "text-slate-900/90"
                    }`}
                  >
                    <input id={id} type="checkbox" className="peer hidden" />
                    <span className="peer-checked:hidden">{truncated}</span>
                    <span className="hidden peer-checked:inline">{full}</span>
                    {full.length > MAX && (
                      <>
                        {" "}
                        <label
                          htmlFor={id}
                          className={`ml-1 cursor-pointer align-baseline text-[13px] font-medium ${linkClass}`}
                        >
                          <span className="inline peer-checked:hidden">
                            Ver más
                          </span>
                          <span className="hidden peer-checked:inline">
                            Ver menos
                          </span>
                        </label>
                      </>
                    )}
                  </p>
                );
              })()
            : null}

          <div className="flex items-center gap-1 mt-1">
            <svg
              className={`w-4 h-4 ${
                onDark ? "text-white/80" : "text-gray-800/80"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {/* VIGTIGT: BRUG GeoText her for at erstatte [[GEO_LABEL]] på klientsiden */}
            <GeoText
              type="label"
              fallback={locationText} // sender [[GEO_LABEL]] ind
              className={`${
                onDark ? "text-white" : "text-gray-800"
              } text-sm drop-shadow`}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1 mt-4 justify-center">
        <div className="flex items-center p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]">
          <div className="flex flex-col text-xs">
            <span>Reclutadores</span>
            <ContactsTotalBadge
              companyId={company.id}
              initial={contactsTotal}
            />
          </div>
        </div>
        <div className="flex items-center p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]">
          <div className="flex flex-col text-xs">
            <span>Empleos</span>
            <span className="font-bold">431 activas</span>
          </div>
        </div>
        <div className="flex items-center p-2 rounded-lg bg-white border border-gray-300 w-[6.5rem] md:w-[7.5rem]">
          <div className="flex flex-col text-xs">
            <span>Actualizado</span>
            <ActualizadoBadge initialLabel="—" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default async function Page({ params }) {
  const { company_name } = await params;

  // 1) Hent virksomhed server-side
  const companyRes = await companiesService.getCompany(company_name);
  if (!companyRes?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
        <div className="container max-w-screen-md mx-auto">
          <div className="bg-white shadow-lg p-4 rounded-lg">
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Empresa no encontrada
              </h2>
              <p className="text-gray-600 mb-4">
                {companyRes?.error || "Unknown error"}
              </p>
              <a
                href="/empresas"
                className="text-blue-500 hover:underline font-medium"
              >
                ← Volver a empresas
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const company = companyRes.data.company;

  // GEO håndteres nu af middleware via [[GEO_LABEL]]
  const locationText = "[[GEO_LABEL]]";

  // 2) Første jobs-side server-side (til total m.m.)
  const jobsRes = await jobsService.getJobs({
    page: 1,
    limit: 7,
    company_id: company.id,
  });
  const initialJobs = jobsRes?.data?.jobs || [];
  const jobsMeta = jobsRes?.meta?.pagination || { total: 0, totalPages: 0 };
  const jobsTotal = Number(jobsMeta.total || 0);

  // 3) Contactos total via meta (robust)
  let contactsTotal = 0;
  try {
    const cRes = await contactsService.getContacts({
      page: 1,
      limit: 1,
      company_id: company.id,
    });
    contactsTotal = pluckTotal(cRes);
  } catch {
    contactsTotal = 0;
  }

  // 🧱 Reserve min-height to prevent any collapse during hydration
  const ROW_H = 92; // approx card height on mobile
  const MIN_ROWS = Math.max(1, initialJobs.length || 6);
  const reserveJobsPx = ROW_H * MIN_ROWS;

  // Optional: reserve a little height for contacts too (adjust to your UI)
  const reserveContactsPx = 2 * 84;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden p-2 md:p-4">
          <CompanyHeroSectionServer
            company={company}
            contactsTotal={contactsTotal}
            jobsTotal={jobsTotal}
            locationText={locationText}
          />

          {/* Jobs (SSR content + reserved height to avoid collapse) */}
          <section
            id="elige-tu-oportunidad"
            className="scroll-mt-[80px]"
            aria-label="Elige tu oportunidad"
          >
            <CompanyJobs
              companyId={company.id}
              initialJobs={initialJobs}
              initialPagination={{
                page: 1,
                limit: 7,
                total: jobsMeta.total || 0,
                totalPages: jobsMeta.totalPages || 0,
              }}
              locationText={locationText}
              reserveHeightPx={reserveJobsPx}
            />
          </section>

          {/* Contacts (same idea) */}
          <CompanyContacts
            companyId={company.id}
            initialTotal={contactsTotal}
            reserveHeightPx={reserveContactsPx}
          />

          <div className="p-0 mb-2">
            <h2 className="text-[#222] text-[18px] font-bold mb-4 mt-3">
              🏢 Descripción de la empresa
            </h2>
            <div
              className="mt-1 border-l-[3px] pl-3 mr-2"
              style={{ borderLeftColor: company.color || "#e7e7e7" }}
            >
              {company.short_description ? (
                <p className="text-base text-gray-600 font-bold">
                  {company.short_description}
                </p>
              ) : null}
              <div className="mt-2 text-sm text-gray-600 space-y-2">
                {(company.full_description || "")
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((paragraph, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {paragraph.trim()}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <StickyApplyFooter />
    </div>
  );
}
