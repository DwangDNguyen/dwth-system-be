import { User } from "../models/user.model";
import { IUser } from "../types";
import logger from "../utils/logger";
import { AppError } from "../utils/base.error";
import { HTTP_STATUS } from "../constants/http-status";
import { storageService } from "./storage.service";

export interface ICreateUserProfile {
  authUserId: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
}

/**
 * Allowed fields that a regular user can self-update via REST API
 */
const ALLOWED_USER_UPDATE_FIELDS: (keyof IUser)[] = [
  "fullName",
  "phone",
  "avatar",
  "address",
  "skills",
  "experience",
  "serviceCategories",
  "isAvailable",
];

/**
 * Automatically or manually create a new User Profile document in user-service DB.
 */
export const createUserProfile = async (data: ICreateUserProfile) => {
  const { authUserId, fullName, email, role, avatar } = data;

  try {
    // Prevent duplicate profile creation
    const existingProfile = await User.findOne({ authUserId });
    if (existingProfile) {
      logger.warn("User profile already exists for authUserId", { authUserId });
      return existingProfile;
    }

    // Map auth roles (USER/ADMIN/WORKER) to Mongoose schema roles ("User" | "Admin" | "Worker")
    let userRole: "User" | "Admin" | "Worker" = "User";
    const normalizedRole = role ? role.toUpperCase() : "USER";
    if (normalizedRole === "ADMIN") {
      userRole = "Admin";
    } else if (normalizedRole === "WORKER") {
      userRole = "Worker";
    }

    // Create the profile document
    const userAvatar = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;

    const newProfile = await User.create({
      authUserId,
      fullName,
      email,
      role: userRole,
      // Automatically fill in other required/optional schema fields with default values
      address: "Address not specified",
      avatar: userAvatar,
      skills: [],
      serviceCategories: [],
      experience: 0,
      isAvailable: false,
      averageRating: 0,
      totalReviews: 0,
      totalJobsCompleted: 0,
      isVerifiedWorker: false,
      isBlocked: false,
      lastActiveAt: new Date().toISOString(),
    });

    logger.info("Successfully created user profile", {
      authUserId,
      email,
      profileId: newProfile._id,
    });

    return newProfile;
  } catch (error) {
    logger.error("Failed to create user profile", {
      authUserId,
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * Get user profile by authUserId
 */
export const getProfileByAuthUserId = async (authUserId: string) => {
  const user = await User.findOne({ authUserId });
  if (!user) {
    throw new AppError("User profile not found", HTTP_STATUS.NOT_FOUND);
  }
  return user;
};

/**
 * Update user profile by authUserId with field whitelisting and input sanitization
 */
export const updateUserProfile = async (
  authUserId: string,
  updateData: Record<string, any>,
  isAdmin: boolean = false,
) => {
  const sanitizedUpdate: Record<string, any> = {};

  // Filter updatable fields based on user role (Mass-assignment protection)
  Object.keys(updateData).forEach((key) => {
    if (isAdmin) {
      // Admins can update any field except authUserId
      if (key !== "authUserId") {
        sanitizedUpdate[key] = updateData[key];
      }
    } else {
      // Regular users can only update whitelisted fields
      if (ALLOWED_USER_UPDATE_FIELDS.includes(key as keyof IUser)) {
        sanitizedUpdate[key] = updateData[key];
      }
    }
  });

  if (Object.keys(sanitizedUpdate).length === 0) {
    throw new AppError(
      "No valid or allowed fields provided for update",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  sanitizedUpdate.lastActiveAt = new Date().toISOString();

  const updatedUser = await User.findOneAndUpdate(
    { authUserId },
    { $set: sanitizedUpdate },
    { new: true, runValidators: true },
  );

  if (!updatedUser) {
    throw new AppError("User profile not found", HTTP_STATUS.NOT_FOUND);
  }

  logger.info("User profile updated successfully", { authUserId, isAdmin });
  return updatedUser;
};

/**
 * Update user avatar with automatic old file cleanup and sharp compression
 */
export const updateUserAvatar = async (
  authUserId: string,
  fileBuffer: Buffer,
) => {
  const user = await getProfileByAuthUserId(authUserId);

  // Delete old avatar from disk if it was a local upload
  await storageService.deleteOldAvatarFile(user.avatar);

  // Process new avatar with sharp and save to disk
  const avatarPath = await storageService.processAndSaveAvatar(
    fileBuffer,
    authUserId,
  );

  user.avatar = avatarPath;
  user.lastActiveAt = new Date().toISOString();
  await user.save();

  logger.info("Updated user avatar with disk cleanup", { authUserId, avatarPath });
  return user;
};

/**
 * Remove user avatar and reset to default generated avatar, cleaning up disk file
 */
export const removeUserAvatar = async (authUserId: string) => {
  const user = await getProfileByAuthUserId(authUserId);

  // Delete old avatar from disk if it was a local upload
  await storageService.deleteOldAvatarFile(user.avatar);

  // Reset to default generated avatar URL
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`;
  user.avatar = defaultAvatar;
  user.lastActiveAt = new Date().toISOString();
  await user.save();

  logger.info("Removed user avatar and reset to default", { authUserId });
  return user;
};
