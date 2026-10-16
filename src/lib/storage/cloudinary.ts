import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_URL) {
    throw new Error(
        "CLOUDINARY_URL is not configured.",
    );
}

cloudinary.config({
    secure: true,
});

export { cloudinary };