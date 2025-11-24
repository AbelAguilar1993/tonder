/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { jobsService } from "../../../services/jobsService";
import JobDetailsClient from "./JobDetailsClient";
import JobDetailsSkeleton from "./JobDetailsSkeleton";

// --- helpers: geo fra query + cookies ---
function getCookie(name) {
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}

function parseGeoFromUrl() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const geo = sp.get("geo"); // FX: MX:puebla
    if (!geo) return { cc: "", city: "" };
    const [ccPart, citySlug] = geo.split(":");
    const cc = (ccPart || "").toUpperCase().slice(0, 2);
    const city = (citySlug || "").replace(/[-_]+/g, " ").trim();
    return { cc, city };
  } catch {
    return { cc: "", city: "" };
  }
}

export default function JobDetailsPageClient({ params, initial }) {
  const { id } = params;

  // —— initialize from server data (if present) ——
  const [job, setJob] = useState(initial?.job ?? null);
  const [company, setCompany] = useState(initial?.company ?? null);
  const [childJobs, setChildJobs] = useState(initial?.childJobs ?? []);
  const [aiSnapshot, setAiSnapshot] = useState(initial?.aiSnapshot ?? null);
  const [contacts, setContacts] = useState(initial?.contacts ?? []);
  const [chips, setChips] = useState(initial?.chips ?? []);
  const [locationText, setLocationText] = useState(initial?.locationText ?? "");
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState(null);

  const router = useRouter();

  const loadJobData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1) Hent geo fra URL (hvis tilstede), ellers cookies
      const fromUrl = parseGeoFromUrl();
      const ccCookie = getCookie("__geo_cc");
      const cityCookie = getCookie("__geo_city");

      const opts = {
        country: fromUrl.cc || ccCookie || "",     // <- vigtigt: send country til API
        city: fromUrl.city || cityCookie || "",    // (kun hvis backend bruger den)
      };

      const response = await jobsService.getJobById(id, opts);

      if (response.success) {
        setJob(response.data.job || {});
        setCompany(response.data.company || {});
        setChildJobs(response.data.childJobs || []);
        setAiSnapshot(response.data.aiSnapshot || null);
        setContacts(response.data.contacts || []);
        setChips(response.data.chips || []);
        setLocationText(response.data.locationText || initial?.locationText || "");
      } else {
        setError(response.error || "Failed to load job details");
      }
    } catch (err) {
      setError(err.message || "Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [id, initial?.locationText]);

  // VIGTIGT: Refetch ALTID én gang ved mount / id-skift med geo-opts
  useEffect(() => {
    loadJobData();
  }, [id, loadJobData]);

  if (loading) return <JobDetailsSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 py-2">
        <div className="container max-w-screen-md mx-auto py-2">
          <div className="bg-white shadow-lg p-2 md:p-4 rounded-lg">
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Job Not Found</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/empleos")}
                className="text-blue-500 hover:underline font-medium"
              >
                ← Back to Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 py-2">
        <div className="container max-w-screen-md mx-auto py-2">
          <div className="bg-white shadow-lg p-2 md:p-4 text-center">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Job Not Found</h1>
            <p className="text-gray-600 mb-4">
              The job you're looking for doesn't exist or has been removed.
            </p>
            <Link
              href="/empleos"
              className="bg-yellow-400 text-yellow-900 px-2 md:px-4 py-2 rounded-xl font-bold hover:bg-yellow-300 transition-colors"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
