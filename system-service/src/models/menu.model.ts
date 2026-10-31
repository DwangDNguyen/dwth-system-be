import mongoose, { Schema, Document } from "mongoose";

export type RoleType = "client" | "freelancer" | "agency" | "admin";
export type MenuSection = "main" | "secondary";

export interface IMenu extends Document {
  title: string;
  url: string;
  icon?: string;
  parentId?: mongoose.Types.ObjectId | null;
  roles: RoleType[];
  order: number;
  isActive: boolean;
  section: MenuSection;
  badge?: string;
  createdAt: Date;
  updatedAt: Date;
}

const menuSchema = new Schema<IMenu>(
  {
    title: {
      type: String,
      required: [true, "Menu title is required"],
      trim: true,
    },
    url: {
      type: String,
      required: [true, "Menu url is required"],
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      default: null,
    },
    roles: {
      type: [String],
      enum: ["client", "freelancer", "agency", "admin"],
      default: ["client"],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "At least one role must be assigned to the menu",
      },
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    section: {
      type: String,
      enum: ["main", "secondary"],
      default: "main",
    },
    badge: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Performance Indexes
menuSchema.index({ roles: 1, isActive: 1, section: 1, order: 1 });
menuSchema.index({ parentId: 1, order: 1 });
menuSchema.index({ url: 1 });

export const Menu = mongoose.model<IMenu>("Menu", menuSchema);
