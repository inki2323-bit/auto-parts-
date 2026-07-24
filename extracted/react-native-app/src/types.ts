export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  district?: string;
  address?: string;
  avatarUrl?: string;
  rating?: number;
  reviewsCount?: number;
  isBlocked?: boolean;
  createdAt?: number;
}

export interface SparePart {
  id: string;
  title: string;
  category: string;
  carBrand: string;
  carModel: string;
  year?: number;
  condition: "New" | "Used - Like New" | "Used - Fair" | "Refurbished";
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  imagePublicIds?: string[];
  description: string;
  location: string;
  state?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  contactName: string;
  contactPhone: string;
  sellerId: string;
  sellerEmail: string;
  sold?: boolean;
  featured?: boolean;
  verified?: boolean;
  approved?: boolean;
  status?: "pending" | "approved" | "rejected";
  isDeleted?: boolean;
  reported?: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  partId: string;
  partTitle: string;
  partImage?: string;
  partPrice: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount?: number;
}

export interface SellerReview {
  id: string;
  sellerId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  type?: "system" | "chat" | "admin";
}

export interface AppVersionConfig {
  latestVersion: string;
  minimumSupportedVersion: string;
  forceUpdate: boolean;
  apkDownloadUrl: string;
  releaseNotes: string;
  releaseDate: string;
}
