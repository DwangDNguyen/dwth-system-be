import sharp from "sharp";
import path from "path";
import fs from "fs";
import logger from "../utils/logger";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");

// Ensure upload directories exist on startup
if (!fs.existsSync(AVATARS_DIR)) {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

/**
 * Image Storage & Processing Service
 */
export const storageService = {
    /**
     * Resizes, compresses, and saves an avatar image to local storage as WebP.
     * @param fileBuffer Buffer of the uploaded raw image file
     * @param userId Unique user ID for filename generation
     * @returns Relative path stored in database (e.g., "/uploads/avatars/avatar-123-1722.webp")
     */
    processAndSaveAvatar: async (
        fileBuffer: Buffer,
        userId: string,
    ): Promise<string> => {
        const filename = `avatar-${userId}-${Date.now()}.webp`;
        const outputPath = path.join(AVATARS_DIR, filename);

        await sharp(fileBuffer)
            .resize(400, 400, {
                fit: "cover",
                position: "center",
            })
            .toFormat("webp", { quality: 80 })
            .toFile(outputPath);

        logger.info("Avatar processed and saved successfully", {
            userId,
            filename,
        });

        return `/uploads/avatars/${filename}`;
    },

    /**
     * Safely deletes a previously uploaded avatar file from disk.
     * Prevents orphaned files when updating or deleting avatars.
     * @param avatarPath Relative path stored in DB (e.g. "/uploads/avatars/avatar-123.webp")
     */
    deleteOldAvatarFile: async (avatarPath?: string): Promise<void> => {
        if (!avatarPath || !avatarPath.startsWith("/uploads/")) {
            return; // Ignore external URLs (like Google OAuth avatars or ui-avatars)
        }

        try {
            // Strip leading "/" to resolve path correctly within project working directory
            const relativePath = avatarPath.startsWith("/")
                ? avatarPath.slice(1)
                : avatarPath;
            const fullPath = path.join(process.cwd(), relativePath);

            if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
                logger.info("Deleted old avatar file from disk", { fullPath });
            }
        } catch (error) {
            logger.warn("Failed to delete old avatar file", {
                avatarPath,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    },
};
