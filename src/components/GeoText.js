"use client"; // VIGTIGT: Dette er nødvendigt for useState, useEffect og browser API'er.

import React, { useState, useEffect } from 'react';

// --- STANDARD VÆRDIER OG HJÆLPEFUNKTIONER ---

const FALLBACK_LABEL = "[[GEO_LABEL]]"; // Placeholder for server-rendered content
const DEFAULT_LOADING_LOCATION = "Indlæser placering...";
const LOCAL_STORAGE_KEY = 'geoData'; // Nøgle for GeoIP cache

/**
 * Synkron funktion: Henter Geo-data fra den bedste kilde:
 * 1. window.__GEO__ (Injektion fra Cloudflare Middleware - kun ved initial load)
 * 2. localStorage (Cache for client-side navigation)
 */
function getLocalGeoData() {
    if (typeof window === 'undefined') {
        return { label: null, iso: null, source: 'Server' };
    }

    // 1. PRIMÆR KILDE: Cloudflare Injektion (window.__GEO__)
    // Middlewaren giver os hele objektet: { country, city, citySlug, label, contactsCount }
    // Vi tjekker og fjerner det straks for at undgå at genindlæse det ved Hot Reload
    const geoBootstrapped = window.__GEO__;
    if (geoBootstrapped && geoBootstrapped.label && geoBootstrapped.country) {
        // Gemmer i localStorage til client-side navigation
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            label: geoBootstrapped.label,
            iso: geoBootstrapped.country, // Bruger country som ISO
        }));

        // Rydder op i globalt scope
        delete window.__GEO__;

        return {
            label: geoBootstrapped.label,
            iso: geoBootstrapped.country,
            source: 'Window_Bootstrap',
        };
    }

    // 2. SEKUNDÆR KILDE: Persistent Cache
    const storedGeo = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedGeo) {
        try {
            const data = JSON.parse(storedGeo);
            if (data?.label || data?.iso) {
                return {
                    label: data.label || 'Ukendt sted',
                    iso: data.iso || 'UKN',
                    source: 'LocalStorage',
                };
            }
        } catch (e) {
            console.error("Fejl ved parsing af geoData fra localStorage:", e);
        }
    }

    // 3. FALLBACK: Ingen data fundet
    return { label: null, iso: null, source: 'Ingen data' };
}

/**
 * GeoText Komponent
 * Erstat [[GEO_LABEL]] med enten cached data eller en loading placeholder.
 */
export const GeoText = ({ fallback = FALLBACK_LABEL, type = 'label', className = '' }) => {
    // Initialiser state med den hurtige, synkrone data.
    const initialData = getLocalGeoData();

    // Vi antager, at vi kun 'loader', hvis der ingen data er overhovedet.
    const [geo] = useState(initialData);
    const [isLoaded] = useState(!!initialData.label);

    // Bemærk: Med window.__GEO__ bootstrapping er en useEffect/storage lytter unødvendig.
    // Dataen er enten tilgængelig med det samme eller gemt i localStorage.


    // 3. Rendering logik
    const rawDisplayValue = type === 'iso' ? (geo.iso || fallback) : (geo.label || fallback);
    const isPlaceholder = !isLoaded || rawDisplayValue === FALLBACK_LABEL;

    return (
        <span className={className}>
            {isPlaceholder
                // Vis en puls-effekt, når vi afventer data, eller den originale placeholder
                ? (geo.label === null
                    ? <span className="animate-pulse bg-gray-200 rounded w-20 h-4 inline-block align-middle" aria-label={DEFAULT_LOADING_LOCATION}></span>
                    : rawDisplayValue
                  )
                : rawDisplayValue
            }
        </span>
    );
};

// Standard eksport
export default GeoText;
