import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/legal";

/** The public pages, for search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
        { url: `${SITE_URL}/guide`, changeFrequency: "monthly", priority: 0.7 },
        { url: `${SITE_URL}/signup`, changeFrequency: "yearly", priority: 0.6 },
        { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    ];
}
