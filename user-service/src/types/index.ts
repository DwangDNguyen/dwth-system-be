export interface IUser {
  fullName: string;
  email: string;
  role: "client" | "freelancer" | "agency" | "admin";
  phone: string;
  avatar: string;
  authUserId: string;
  skills: object[];
  experience: number;
  serviceCategories: object[];
  isAvailable: boolean;
  averageRating: number;
  totalReviews: number;
  totalJobsCompleted: number;
  address: string;
  isVerifiedWorker: boolean;
  isBlocked: boolean;
  lastActiveAt: string;
}

export * from "./response.types";
