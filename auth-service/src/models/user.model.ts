import mongoose from "mongoose";

export enum Role {
    USER = "USER",
    ADMIN = "ADMIN",
    WORKER = "WORKER",
}

export interface IUser {
    fullname: string;
    email: string;
    password?: string;
    role: Role;
    googleId?: string;
    authProvider?: "local" | "google";
}

const userSchema = new mongoose.Schema<IUser>(
    {
        fullname: {
            type: String,
            required: [true, "fullname is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "email is required"],
            trim: true,
            unique: true,
        },
        password: {
            type: String,
            required: false,
            default: "",
        },
        role: {
            type: String,
            enum: Object.values(Role),
            default: Role.USER,
        },
        googleId: {
            type: String,
            required: false,
        },
        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
        },
    },
    {
        timestamps: true,
    },
);

export const User = mongoose.model<IUser>("User", userSchema);
