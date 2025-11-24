// next.config.mjs — Cloudflare Pages friendly + ingen webpack-hack

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export til Cloudflare Pages
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: false,

  // Ingen server-side image optimering i static export
  images: { unoptimized: true },

  // Bedre dev-sikkerhed (ingen “pris” i prod)
  reactStrictMode: true,

  // SWC compiler-optimeringer (ingen webpack nødvendig)
  compiler: {
    // Fjern console.* i prod, men behold errors/warns
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,

    // Strip test-attributter i prod
    reactRemoveProperties:
      process.env.NODE_ENV === "production"
        ? { properties: ["^data-testid$", "^data-test$"] }
        : false,
  },

  experimental: {
    // ✅ Inline CSS i <head> (eliminerer render-blokerende <link> CSS)
    inlineCss: true,

    // ⚠️ INGEN Lightning CSS her (konflikt med PostCSS/Tailwind)
    // useLightningcss: false,

    // Import-optimeringer
    optimizePackageImports: [
      "lodash",
      "lodash-es",
      "date-fns",
      "@mui/icons-material",
      "react-icons",
    ],
  },

  // Ingen custom webpack() – bevidst tomt for at være CF Pages-venlig
};

export default nextConfig;
