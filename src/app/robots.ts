import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/legal";

/** Search engines may index the public pages; everything behind sign-in stays out. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: ["/", "/guide", "/privacy", "/terms", "/signin", "/signup"],
            disallow: ["/api/", "/dashboard", "/workspace", "/tasks", "/settings", "/notifications", "/invite"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
