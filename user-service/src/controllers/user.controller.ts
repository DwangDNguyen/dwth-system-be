import { Request, Response, NextFunction } from "express";
import {
    createUserProfile,
    getProfileByAuthUserId,
    updateUserProfile,
    updateUserAvatar,
    removeUserAvatar,
} from "../services/user.service";
import { ApiResponse } from "../types";
import { HTTP_STATUS } from "../constants/http-status";
import { AppError } from "../utils/base.error";

/**
 * HTTP Controller - Get current authenticated user's profile (/me)
 */
export const getMyProfileController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        if (!req.user || !req.user.userId) {
            throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        const profile = await getProfileByAuthUserId(req.user.userId);

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.OK,
            message: "User profile retrieved successfully",
            data: profile,
            timestamp: new Date().toISOString(),
        };

        res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
        next(error);
    }
};

/**
 * HTTP Controller - Update current authenticated user's profile (/me)
 */
export const updateMyProfileController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        if (!req.user || !req.user.userId) {
            throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        const updateData = req.body;
        const isAdmin = req.user.role ? req.user.role.toUpperCase() === "ADMIN" : false;

        const updatedProfile = await updateUserProfile(
            req.user.userId,
            updateData,
            isAdmin,
        );

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.OK,
            message: "User profile updated successfully",
            data: updatedProfile,
            timestamp: new Date().toISOString(),
        };

        res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
        next(error);
    }
};

/**
 * HTTP Controller - Upload & Compress user avatar (/me/avatar)
 */
export const uploadMyAvatarController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        if (!req.user || !req.user.userId) {
            throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        if (!req.file) {
            throw new AppError("Please select an image file to upload", HTTP_STATUS.BAD_REQUEST);
        }

        const updatedProfile = await updateUserAvatar(req.user.userId, req.file.buffer);

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.OK,
            message: "Avatar uploaded and updated successfully",
            data: updatedProfile,
            timestamp: new Date().toISOString(),
        };

        res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
        next(error);
    }
};

/**
 * HTTP Controller - Delete user avatar and reset to default (/me/avatar)
 */
export const deleteMyAvatarController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        if (!req.user || !req.user.userId) {
            throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        const updatedProfile = await removeUserAvatar(req.user.userId);

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.OK,
            message: "Avatar deleted successfully and reset to default",
            data: updatedProfile,
            timestamp: new Date().toISOString(),
        };

        res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
        next(error);
    }
};

/**
 * HTTP Controller - Create User Profile manually via REST API
 */
export const createProfileController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { authUserId, fullName, email, role } = req.body;

        if (!authUserId || !fullName || !email) {
            throw new AppError(
                "Please provide authUserId, fullName, and email",
                HTTP_STATUS.BAD_REQUEST,
            );
        }

        // Security check: Non-Admin users can only create their own profile
        if (req.user) {
            const isOwner = req.user.userId === authUserId;
            const isAdmin = req.user.role ? req.user.role.toUpperCase() === "ADMIN" : false;
            if (!isOwner && !isAdmin) {
                throw new AppError(
                    "You do not have permission to create a profile for another user",
                    HTTP_STATUS.FORBIDDEN,
                );
            }
        }

        const profile = await createUserProfile({
            authUserId,
            fullName,
            email,
            role,
        });

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.CREATED,
            message: "User profile created successfully",
            data: profile,
            timestamp: new Date().toISOString(),
        };

        res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
        next(error);
    }
};

/**
 * HTTP Controller - Get User Profile by authUserId
 */
export const getProfileController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const targetAuthUserId = req.params.authUserId as string;

        if (!targetAuthUserId) {
            throw new AppError(
                "authUserId is required",
                HTTP_STATUS.BAD_REQUEST,
            );
        }

        const profile = await getProfileByAuthUserId(targetAuthUserId);

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.OK,
            message: "User profile retrieved successfully",
            data: profile,
            timestamp: new Date().toISOString(),
        };

        res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
        next(error);
    }
};

/**
 * HTTP Controller - Update User Profile by authUserId (Owner or Admin only)
 */
export const updateProfileController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const targetAuthUserId = req.params.authUserId as string;
        const updateData = req.body;

        if (!targetAuthUserId) {
            throw new AppError(
                "authUserId is required",
                HTTP_STATUS.BAD_REQUEST,
            );
        }

        if (!req.user) {
            throw new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED);
        }

        const isOwner = req.user.userId === targetAuthUserId;
        const isAdmin = req.user.role ? req.user.role.toUpperCase() === "ADMIN" : false;

        // Security check: Only owner or admin can update target profile
        if (!isOwner && !isAdmin) {
            throw new AppError(
                "You do not have permission to update this profile",
                HTTP_STATUS.FORBIDDEN,
            );
        }

        const updatedProfile = await updateUserProfile(
            targetAuthUserId,
            updateData,
            isAdmin,
        );

        const response: ApiResponse = {
            success: true,
            statusCode: HTTP_STATUS.OK,
            message: "User profile updated successfully",
            data: updatedProfile,
            timestamp: new Date().toISOString(),
        };

        res.status(HTTP_STATUS.OK).json(response);
    } catch (error) {
        next(error);
    }
};
