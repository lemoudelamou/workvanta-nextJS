/**
 * Who runs Workvanta, as named in the privacy policy and terms. Fill these
 * in before the site is public: under the GDPR the policy must name the
 * controller and a way to reach them. Until then, the pages show what's
 * missing in brackets.
 */
export const LEGAL = {
    /** Your name, or your company's legal name. */
    operator: "[Operator name]",
    /** Postal address: street, postcode, city, country. */
    address: "[Postal address]",
    /** Where people send privacy requests and questions. */
    contactEmail: "[contact email]",
    /** The country whose law governs the terms, e.g. "Germany". */
    governingLaw: "[Country]",
    /** Change this whenever either page changes. */
    lastUpdated: "18 October 2026",
} as const;

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
