import mongoose from "mongoose";
import { IUser } from "../types";

const userSchema = new mongoose.Schema<IUser>({
  authUserId: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    required: [true, "Fullname is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    required: true,
    default: "",
  },
  role: {
    type: String,
    enum: ["User", "Admin", "Worker"],
    default: "User",
  },
  skills: [
    {
      type: String,
      trim: true,
    },
  ],
  experience: {
    type: Number,
    default: 0,
  },
  serviceCategories: [
    {
      type: String,
      trim: true,
    },
  ],
  isAvailable: {
    type: Boolean,
    default: false,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  totalJobsCompleted: {
    type: Number,
    default: 0,
  },
  address: {
    type: String,
    required: [true, "Address is required"],
  },
  isVerifiedWorker: {
    type: Boolean,
    default: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  lastActiveAt: {
    type: String,
    default: "",
  },
});

export const User = mongoose.model<IUser>("UserProfile", userSchema);
