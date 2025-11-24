import { NextResponse } from "next/server";
import companiesService from "../../services/companiesService";
import jobsService from "../../services/jobsService";

export const revalidate = 86400; // 1 dag

export async function GET() {
  const base = "https://empleosafari.com";
  const urls = [
    `${base}/`,
    `${base}/empresas/`,
    `${base}/empleos/`,
  ];

  try {
    const [companies, jobs] = await Promise.all([
      companiesService.getCompaniesAttributes(),
      jobsService.getJobsAttributes(),
    ]);

    companies.data.forEach(c => urls.push(`${base}/empresa/${c.slug}/`));
    jobs.data.forEach(j => urls.push(`${base}/empleos/${j.id}/`));
  } catch (e) {
    console.warn("⚠️ Sitemap fallback:", e.message);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map(u => `
    <url>
      <loc>${u}</loc>
      <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    </url>`).join("")}
  </urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
