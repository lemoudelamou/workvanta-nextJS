import { attachmentHref, parseCloudinaryUrl } from "@/lib/storage/attachments";

describe("parseCloudinaryUrl", () => {
    it("parses a private (authenticated) image with a signature and version", () => {
        expect(
            parseCloudinaryUrl(
                "https://res.cloudinary.com/demo/image/authenticated/s--Ab_12--/v1712/Workvanta/w1/tasks/t1/logo.png",
            ),
        ).toEqual({
            publicId: "Workvanta/w1/tasks/t1/logo",
            resourceType: "image",
            deliveryType: "authenticated",
            format: "png",
        });
    });

    it("keeps the extension in the public id for raw files", () => {
        expect(
            parseCloudinaryUrl(
                "https://res.cloudinary.com/demo/raw/authenticated/v1/Workvanta/w1/notes.txt",
            ),
        ).toEqual({
            publicId: "Workvanta/w1/notes.txt",
            resourceType: "raw",
            deliveryType: "authenticated",
            format: "",
        });
    });

    it("still understands older public uploads", () => {
        expect(
            parseCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/v1/Workvanta/a.pdf"),
        ).toMatchObject({ publicId: "Workvanta/a", deliveryType: "upload", format: "pdf" });
    });

    it("decodes encoded file names", () => {
        expect(
            parseCloudinaryUrl(
                "https://res.cloudinary.com/demo/raw/authenticated/v1/Workvanta/my%20notes.txt",
            ).publicId,
        ).toBe("Workvanta/my notes.txt");
    });

    it("rejects URLs it can't read", () => {
        expect(() => parseCloudinaryUrl("https://example.com/file.png")).toThrow(
            "Could not determine Cloudinary file.",
        );
    });
});

describe("attachmentHref", () => {
    it("points at the access-checked route", () => {
        expect(attachmentHref("a1")).toBe("/api/attachments/a1");
    });
});
