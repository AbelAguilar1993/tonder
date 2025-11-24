"use client";

import { useRouter } from "next/navigation";

const CompanyCard = ({ company }) => {
  const router = useRouter();
  const navigateCompanyDetails = (company) => {
    // Save the company id to session storage
    sessionStorage.setItem("companyId", company.id);
    router.push(`/empresa/${company.name.toLowerCase().replace(/ /g, "-")}`);
  };

  return (
    <div className="flex flex-col border-1 border-[#e7e7e7] shadow-[0 8px 24px rgba(0, 0, 0, .06)] rounded-lg">
      <div
        className="flex items-center justify-center h-28 border-b rounded-t-lg p-2 md:p-4"
        style={{
          borderBottomColor: company.color || "#e7e7e7",
          background: `
            linear-gradient(180deg, ${
              company.color || "#e7e7e7"
            } 0 20%, transparent 20% 100%),
            radial-gradient(1000px 320px at 90% -80px, rgba(255,255,255,.14), rgba(255,255,255,0) 60%),
            linear-gradient(180deg, ${
              company.color || "#e7e7e7"
            } 0 20%, #fff 85%)
          `,
        }}
      >
        <img
          src={company.logo_url}
          alt="Company logo"
          className="h-22 w-auto rounded-lg"
        />
      </div>
      <div className="flex flex-col gap-2 p-2 md:p-4">
        <div
          className="text-lg text-gray-700 font-semibold hover:underline cursor-pointer"
          onClick={() => navigateCompanyDetails(company)}
        >
          {company.name}
        </div>
        <div className="text-xs text-gray-600">
          {company.jobs_count} oportunidades ⋅ {company.contacts_count}{" "}
          reclutadores
        </div>
        <div className="text-xs text-gray-600">{company.short_description}</div>
      </div>
    </div>
  );
};

export default CompanyCard;
