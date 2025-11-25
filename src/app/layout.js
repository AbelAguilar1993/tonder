// src/app/layout.js
import localFont from "next/font/local";
import Script from "next/script";
import { AuthProvider } from "../components/AuthContext";
import ConditionalLayout from "../components/ConditionalLayout";
import { StickyFooterProvider } from "../components/StickyFooterContext";
import ClientSideWidgets from "../components/ClientSideWidgets"; // klient-wrapper for trackers/modals
import "./globals.css";

// Kun kritiske snit i WOFF2 → preload = true
const lato = localFont({
  src: [
    { path: "../../public/fonts/Lato-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Lato-Italic.woff2",  weight: "400", style: "italic" },
    { path: "../../public/fonts/Lato-Bold.woff2",    weight: "700", style: "normal" },
    { path: "../../public/fonts/Lato-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  display: "swap",
  preload: true,
  fallback: [
    "system-ui","-apple-system","BlinkMacSystemFont","Segoe UI","Roboto",
    "Oxygen","Ubuntu","Cantarell","Open Sans","Helvetica Neue","sans-serif",
  ],
  variable: "--font-lato",
});

// Minimal kritisk CSS (server-inlined)
const criticalCSS = `
  :root { --es-accent:#4f46e5; }
  html {
    text-size-adjust:100%;
    -webkit-text-size-adjust:100%;
    background:#5E3FA6;
  }
  body {
    margin:0;
    font-family: var(--font-lato, system-ui, -apple-system, Segoe UI, Roboto, sans-serif);
    color:#111;
    background:transparent;
  }
  header, .hero { contain: content; }
  .hero { padding:1.25rem; max-width:1000px; margin:0 auto; }
  .btn-primary { display:inline-block; padding:.75rem 1.1rem; border-radius:.5rem; background:var(--es-accent); color:#fff; text-decoration:none; font-weight:700; }
`;

export const viewport = { themeColor: "#5E3FA6" };

export const metadata = {
  title: {
    default: "EmpleoSafari — Accede a contactos verificados y oportunidades reales",
    template: "%s | EmpleoSafari",
  },
  description:
    "Plataforma profesional de apoyo al empleo. Encuentra trabajos, conecta con empresas y avanza en tu carrera con contactos y oportunidades verificadas.",
  keywords:
    "empleos, trabajos, empleo, carrera, oportunidades laborales, empresas, contactos verificados",
  authors: [{ name: "EmpleoSafari" }],
  creator: "EmpleoSafari",
  publisher: "EmpleoSafari",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://empleosafari.com",
    siteName: "EmpleoSafari",
    title: "EmpleoSafari — Accede a contactos verificados y oportunidades reales",
    description:
      "Plataforma profesional de apoyo al empleo. Encuentra trabajos, conecta con empresas y avanza en tu carrera con contactos y oportunidades verificadas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EmpleoSafari — Accede a contactos verificados y oportunidades reales",
    description:
      "Plataforma profesional de apoyo al empleo. Encuentra trabajos, conecta con empresas y avanza en tu carrera con contactos y oportunidades verificadas.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  themeColor: "#5E3FA6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={lato.variable}>
      <head>
        {/* 🔥 Inline kritisk CSS */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
        {/* DNS-prefetch i stedet for preconnect til Meta (PSI-venligt) */}
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        {/* Preconnect til Clicky (må gerne være med CORS) */}
        <link rel="preconnect" href="https://static.getclicky.com" crossOrigin="anonymous" />

        <link rel="preconnect" href="https://js.skyflow.com" crossOrigin="anonymous"/>
        <link rel="preconnect" href="https://openpay.s3.amazonaws.com" crossOrigin="anonymous"/>
      </head>

      <body className={lato.className}>
        {/* Clicky */}
        <Script
          id="clicky-stub"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.clicky_site_ids = window.clicky_site_ids || [];
              window.clicky_site_ids.push(${process.env.NEXT_PUBLIC_CLICKY_SITE_ID || "101493205"});
              window.__clickyQ = window.__clickyQ || [];
              window.trackGoal = window.trackGoal || function(id){
                try {
                  if (window.clicky && typeof window.clicky.goal === "function") {
                    window.clicky.goal(id);
                  } else {
                    window.__clickyQ.push([id]);
                  }
                } catch(e){}
              };
            `,
          }}
        />
        <Script id="clicky-autofire-empleos" strategy="afterInteractive">
          {`
            (function(){
              try {
                var path = location.pathname || "";
                if (/^\\/empleos\\/[^\\/]+\\/?$/.test(path)) {
                  if (typeof window.trackGoal === "function") window.trackGoal(794);
                  else { window.__clickyQ = window.__clickyQ || []; window.__clickyQ.push([794]); }
                }
              } catch(e) {}
            })();
          `}
        </Script>
        <Script id="clicky-loader" src="https://static.getclicky.com/js" strategy="lazyOnload" />
        <Script id="clicky-flush" strategy="lazyOnload">
          {`
            (function flushClickyQ(){
              try {
                if (window.clicky && typeof window.clicky.goal === "function" && Array.isArray(window.__clickyQ)) {
                  while (window.__clickyQ.length) {
                    var item = window.__clickyQ.shift();
                    window.clicky.goal(item[0], item[1]);
                  }
                } else {
                  setTimeout(flushClickyQ, 200);
                }
              } catch(e){}
            })();
          `}
        </Script>

        <Script id="skyflow-sdk" src="https://js.skyflow.com/v1/index.js" strategy="beforeInteractive" />
        <Script id="openpay-sdk" src="https://openpay.s3.amazonaws.com/openpay.v1.min.js" strategy="beforeInteractive"/>
        <Script id="openpay-data-sdk" src="https://openpay.s3.amazonaws.com/openpay-data.v1.min.js" strategy="beforeInteractive"/>
        {/* --- META PIXEL HYBRID --- */}
        {/* 1) FBQ stub + init + PageView ASAP (queue only) + advanced matching inkl. City/Country */}
        <Script id="fbq-stub-init" strategy="afterInteractive">
          {`
            (function(w,d){
              if (w.fbq && w.__PIXEL_INIT__) return;

              var n = w.fbq = function(){
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
              };
              if (!w._fbq) w._fbq = n;
              n.push = n;
              n.loaded = false;
              n.version = '2.0';
              n.queue = n.queue || [];

              // --- små helpers til normalisering ---
              function deaccent(s){
                return s ? s.normalize('NFD').replace(/\\p{Diacritic}/gu, '') : '';
              }
              function normLower(s){
                return deaccent(String(s || '').trim().toLowerCase());
              }
              function toE164(raw, country){
                var c = (country || 'mx').toLowerCase();
                var digits = String(raw || '').replace(/[^\\d]/g, '');
                if (!digits) return '';
                if (c === 'mx') {
                  if (digits.indexOf('52') === 0) return '+' + digits;
                  return '+52' + digits;
                }
                if (c === 'co') {
                  if (digits.indexOf('57') === 0) return '+' + digits;
                  return '+57' + digits;
                }
                if (digits[0] !== '+') return '+' + digits;
                return digits;
              }

              // Hent geo fra window.__GEO__ + <html data-geo-*> (samme logik som i React-koden)
              function getGeo(){
                var city = '';
                var countryCode = '';

                try {
                  var g = w.__GEO__ || {};
                  if (g.city) city = g.city;
                  if (g.country) countryCode = g.country;
                } catch(e){}

                try {
                  var html = d.documentElement;
                  if (html && html.getAttribute) {
                    if (!city) {
                      var cAttr = html.getAttribute('data-geo-city');
                      if (cAttr) city = cAttr;
                    }
                    if (!countryCode) {
                      var ccAttr = html.getAttribute('data-geo-country');
                      if (ccAttr) countryCode = ccAttr;
                    }
                  }
                } catch(e){}

                return {
                  city: city || '',
                  countryCode: (countryCode || '').toLowerCase(),
                };
              }

              function buildUserData(){
                try {
                  var geo = getGeo();
                  var city = geo.city;
                  var countryCode = geo.countryCode || 'mx';

                  // fallback hvis localStorage ikke er tilgængelig → send i det mindste geo-baseret ct/country
                  if (!w.localStorage) {
                    var udFallback = {};
                    var cityNormOnly = normLower(city || '')
                      .replace(/\\s+/g, '')
                      .replace(/[^a-z0-9]/g, '');
                    var countryNormOnly = normLower(countryCode || 'mx');
                    if (cityNormOnly) udFallback.ct = cityNormOnly;
                    if (countryNormOnly) udFallback.country = countryNormOnly;
                    return Object.keys(udFallback).length ? udFallback : null;
                  }

                  var raw = w.localStorage.getItem('es_payer_last');
                  var parsed = raw ? JSON.parse(raw || '{}') : {};

                  var full = String(parsed.fullName || '').trim();
                  var parts = full ? full.split(/\\s+/) : [];
                  var first = parts[0] || '';
                  var last = parts.length > 1 ? parts.slice(1).join(' ') : '';

                  var emailNorm = normLower(parsed.email || '');
                  var phone = toE164(parsed.phone || '', parsed.countryCode || countryCode);

                  var citySource = parsed.city || city;
                  var countrySource = parsed.countryCode || countryCode;

                  var cityNorm = normLower(citySource || '')
                    .replace(/\\s+/g, '')
                    .replace(/[^a-z0-9]/g, '');
                  var countryNorm = normLower(countrySource || 'mx');

                  var ud = {};
                  if (emailNorm) ud.em = emailNorm;
                  if (first) ud.fn = normLower(first);
                  if (last) ud.ln = normLower(last);
                  if (phone) ud.ph = phone.replace(/[^\\d+]/g, '');
                  if (cityNorm) ud.ct = cityNorm;
                  if (countryNorm) ud.country = countryNorm;

                  return Object.keys(ud).length ? ud : null;
                } catch(e){
                  return null;
                }
              }

              try {
                if (!w.__PIXEL_INIT__) {
                  var userData = buildUserData();
                  if (userData) {
                    n('init', '1199512291342375', userData);
                  } else {
                    n('init', '1199512291342375');
                  }
                  n('track', 'PageView');
                  w.__PIXEL_INIT__ = true;
                }
              } catch(e){}
            })(window, document);
          `}
        </Script>

        <Script id="fbq-lib" strategy="lazyOnload">
          {`
            (function(w,d,s,u){
              if (w.__PIXEL_LIB_LOADING__) return; w.__PIXEL_LIB_LOADING__ = true;
              var t=d.createElement(s); t.async=true; t.src=u;
              var f=d.getElementsByTagName(s)[0]; f.parentNode.insertBefore(t,f);
            })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
          `}
        </Script>

        {/* ✅ React-venlig noscript (ingen style-string i JSX) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1199512291342375&ev=PageView&noscript=1" alt=""/>',
          }}
        />

        {/* Server-first rendering: ingen global Suspense der blanker skærmen */}
        <AuthProvider>
          <StickyFooterProvider>
            <ConditionalLayout>{children}</ConditionalLayout>

            {/* Klient-øer (trackers/modals) loader efter hydration uden at påvirke LCP */}
            <ClientSideWidgets />
          </StickyFooterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
