import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { requireProjectAccess } from "@/lib/auth/members";
import { prisma } from "@/lib/db/prisma";
import { cloudinary } from "@/lib/storage/cloudinary";
import {
    ATTACHMENT_LINK_TTL_SECONDS,
    parseCloudinaryUrl,
} from "@/lib/storage/attachments";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

function notFound() {
    // Same response whether the file doesn't exist or the user can't see it,
    // so attachment ids can't be probed.
    return NextResponse.json(
        { error: "Attachment not found." },
        { status: 404, headers: NO_STORE },
    );
}

/**
 * Opens a task attachment: checks the signed-in user can open the project,
 * then redirects to a short-lived signed Cloudinary link.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ attachmentId: string }> },
) {
    const { attachmentId } = await params;

    const session = await getSession();

    if (!session?.user?.id) {
        const signIn = new URL("/signin", request.url);
        signIn.searchParams.set("callbackUrl", `/api/attachments/${attachmentId}`);
        return NextResponse.redirect(signIn, { headers: NO_STORE });
    }

    const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        select: {
            url: true,
            filename: true,
            task: {
                select: {
                    projectId: true,
                    project: { select: { workspace: { select: { slug: true } } } },
                },
            },
        },
    });

    if (!attachment) return notFound();

    try {
        await requireProjectAccess(
            attachment.task.project.workspace.slug,
            attachment.task.projectId,
        );
    } catch {
        return notFound();
    }

    let parsed: ReturnType<typeof parseCloudinaryUrl>;

    try {
        parsed = parseCloudinaryUrl(attachment.url);
    } catch {
        return notFound();
    }

    // Files uploaded before private storage was introduced are public.
    if (parsed.deliveryType === "upload") {
        return NextResponse.redirect(attachment.url, { headers: NO_STORE });
    }

    const signedUrl = cloudinary.utils.private_download_url(
        parsed.publicId,
        parsed.format,
        {
            resource_type: parsed.resourceType,
            type: parsed.deliveryType,
            expires_at: Math.floor(Date.now() / 1000) + ATTACHMENT_LINK_TTL_SECONDS,
        },
    );

    return NextResponse.redirect(signedUrl, { headers: NO_STORE });
}
