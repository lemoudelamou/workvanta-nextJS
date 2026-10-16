/**
 * Helpers for task attachments stored on Cloudinary.
 *
 * New uploads use Cloudinary's "authenticated" delivery type, so the stored
 * URL does not work on its own. Files are opened through
 * /api/attachments/[id], which checks project access and then redirects to a
 * short-lived signed download link. Attachments uploaded before this change
 * used the public "upload" type and keep working through the same route.
 */

export type CloudinaryResourceType = "image" | "video" | "raw";
export type CloudinaryDeliveryType = "upload" | "authenticated" | "private";

/** Delivery type used for every new attachment. */
export const ATTACHMENT_DELIVERY_TYPE: CloudinaryDeliveryType = "authenticated";

/** How long a signed attachment link stays valid. */
export const ATTACHMENT_LINK_TTL_SECONDS = 5 * 60;

export type ParsedCloudinaryUrl = {
    publicId: string;
    resourceType: CloudinaryResourceType;
    deliveryType: CloudinaryDeliveryType;
    /** File extension for image/video assets ("" for raw files). */
    format: string;
};

const CLOUDINARY_URL_PATTERN =
    /\/(image|video|raw)\/(upload|authenticated|private)\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/;

/** Extracts the identifiers Cloudinary needs from a stored delivery URL. */
export function parseCloudinaryUrl(url: string): ParsedCloudinaryUrl {
    const match = url.match(CLOUDINARY_URL_PATTERN);
    if (!match) throw new Error("Could not determine Cloudinary file.");

    const resourceType = match[1] as CloudinaryResourceType;
    const deliveryType = match[2] as CloudinaryDeliveryType;
    const path = decodeURIComponent(match[3].split("?")[0]);

    // Raw files keep their extension as part of the public id.
    if (resourceType === "raw") {
        return { publicId: path, resourceType, deliveryType, format: "" };
    }

    const lastDot = path.lastIndexOf(".");
    const lastSlash = path.lastIndexOf("/");

    if (lastDot > lastSlash) {
        return {
            publicId: path.slice(0, lastDot),
            resourceType,
            deliveryType,
            format: path.slice(lastDot + 1),
        };
    }

    return { publicId: path, resourceType, deliveryType, format: "" };
}

/** The in-app link that opens an attachment after an access check. */
export function attachmentHref(attachmentId: string) {
    return `/api/attachments/${encodeURIComponent(attachmentId)}`;
}
