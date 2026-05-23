import mongoose from "mongoose";

export enum Role {
    USER = "USER",
    ADMIN = "ADMIN",
    WORKER = "WORKER",
}

export interface IUser {
    fullname: string;
    email: string;
    password: string;
    role: Role;
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
            required: [true, "password is required"],
        },
        role: {
            type: String,
            enum: Object.values(Role),
            default: Role.USER,
        },
    },
    {
        timestamps: true,
    },
);

export const User = mongoose.model<IUser>("User", userSchema);
