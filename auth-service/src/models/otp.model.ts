import mongoose from "mongoose";

export interface IOtp {
    email: string;
    otp: string;
    createdAt: Date;
}

const otpSchema = new mongoose.Schema<IOtp>(
    {
        email: {
            type: String,
            required: [true, "email is required"],
            trim: true,
        },
        otp: {
            type: String,
            required: [true, "otp is required"],
            maxLength: 4,
        },
        createdAt: {
            type: Date,
            default: Date.now(),
            expires: 5 * 60,
        },
    },
    {
        timestamps: true,
    },
);

export const Otp = mongoose.model<IOtp>("Otp", otpSchema);
