import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, deleteSparePartListing as deleteListingService } from "./firebase";
import { deleteImagesFromCloudinary, extractPublicId } from "./cloudinary";
import { getApiBaseUrl } from "./backendConfig";

export interface AdminDashboardStats {
  totalListings: number;
  pendingListings: number;
  approvedListings: number;
  totalUsers: number;
  blockedUsers: number;
  totalReports: number;
}

async function ensureAdminAccess(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    throw new Error("You must be signed in to access the admin dashboard.");
  }

  const profileRef = doc(db, "users", currentUser.uid);
  const profileSnap = await getDoc(profileRef);
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const isAdmin = Boolean(
    currentUser.email === "wwwautoparts2@gmail.com" ||
    currentUser.email === "ym1950394@gmail.com" ||
    profile?.role === "admin" ||
    profile?.isAdmin
  );

  if (!isAdmin) {
    throw new Error("You do not have permission to access the admin dashboard.");
  }
}

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  await ensureAdminAccess();

  const [listingsSnap, usersSnap, pendingSnap, reportsSnap] = await Promise.all([
    getDocs(collection(db, "spare_parts")),
    getDocs(collection(db, "users")),
    getDocs(query(collection(db, "spare_parts"), where("status", "==", "pending"))),
    getDocs(query(collection(db, "reports"), where("resolved", "==", false))),
  ]);

  const listings = listingsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const users = usersSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  return {
    totalListings: listings.length,
    pendingListings: pendingSnap.size,
    approvedListings: listings.filter((listing: any) => listing.approved || listing.status === "approved").length,
    totalUsers: users.length,
    blockedUsers: users.filter((user: any) => user.isBlocked).length,
    totalReports: reportsSnap.size,
  };
}

export async function fetchAdminUsers(): Promise<any[]> {
  await ensureAdminAccess();
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function updateUserAccess(userId: string, updates: Record<string, any>): Promise<void> {
  await ensureAdminAccess();
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { ...updates, updatedAt: Date.now() });
  await logAdminActivity("user_updated", { userId, updates });
}

export async function fetchAdminListings(): Promise<any[]> {
  await ensureAdminAccess();
  const snapshot = await getDocs(query(collection(db, "spare_parts"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function moderateListing(listingId: string, decision: "approved" | "rejected"): Promise<void> {
  await ensureAdminAccess();
  const ref = doc(db, "spare_parts", listingId);
  const payload = {
    status: decision,
    approved: decision === "approved",
    updatedAt: Date.now(),
  };
  await updateDoc(ref, payload);
  await logAdminActivity("listing_moderated", { listingId, decision });
}

export async function deleteListingAdmin(listingId: string): Promise<void> {
  await ensureAdminAccess();
  const ref = doc(db, "spare_parts", listingId);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    const data = snapshot.data() as any;
    const publicIds = Array.isArray(data.imagePublicIds)
      ? data.imagePublicIds
      : [data.imageUrl].filter(Boolean).map((url: string) => extractPublicId(url)).filter(Boolean);

    await deleteListingService(listingId);

    if (publicIds.length > 0) {
      try {
        await deleteImagesFromCloudinary(publicIds);
      } catch (error) {
        console.warn("Cloudinary cleanup during admin delete failed", error);
      }
    }
  }

  await logAdminActivity("listing_deleted", { listingId });
}

export async function deleteListingImage(listingId: string, imageUrl: string): Promise<void> {
  await ensureAdminAccess();
  const ref = doc(db, "spare_parts", listingId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;

  const data = snapshot.data() as any;
  const imageUrls = (data.imageUrls || [data.imageUrl]).filter((url: string) => url !== imageUrl);
  const publicIds = (data.imagePublicIds || []).filter((pid: string) => pid !== extractPublicId(imageUrl));

  await updateDoc(ref, {
    imageUrl: imageUrls[0] || "",
    imageUrls,
    imagePublicIds: publicIds,
    updatedAt: Date.now(),
  });

  const publicId = extractPublicId(imageUrl);
  if (publicId) {
    try {
      await deleteImagesFromCloudinary([publicId]);
    } catch (error) {
      console.warn("Cloudinary cleanup for image removal failed", error);
    }
  }

  await logAdminActivity("listing_image_removed", { listingId, imageUrl });
}

export async function fetchAdminCategories(): Promise<any[]> {
  await ensureAdminAccess();
  const snapshot = await getDocs(query(collection(db, "categories"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function saveCategory(category: { id?: string; name: string; description?: string }): Promise<void> {
  await ensureAdminAccess();
  const payload = {
    name: category.name,
    description: category.description || "",
    updatedAt: Date.now(),
    createdAt: category.id ? (await getDoc(doc(db, "categories", category.id))).data()?.createdAt || Date.now() : Date.now(),
  };

  if (category.id) {
    await updateDoc(doc(db, "categories", category.id), payload);
  } else {
    await setDoc(doc(collection(db, "categories")), payload);
  }

  await logAdminActivity("category_saved", { category: category.name });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await ensureAdminAccess();
  await deleteDoc(doc(db, "categories", categoryId));
  await logAdminActivity("category_deleted", { categoryId });
}

export async function fetchAdminReports(): Promise<any[]> {
  await ensureAdminAccess();
  const snapshot = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function resolveReport(reportId: string, resolution: string): Promise<void> {
  await ensureAdminAccess();
  await updateDoc(doc(db, "reports", reportId), {
    resolved: true,
    resolution,
    resolvedAt: Date.now(),
  });
  await logAdminActivity("report_resolved", { reportId, resolution });
}

export async function fetchAdminNotifications(): Promise<any[]> {
  await ensureAdminAccess();
  const snapshot = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function sendBroadcastAnnouncement(message: string): Promise<void> {
  await ensureAdminAccess();
  const payload = {
    message,
    type: "admin",
    createdAt: Date.now(),
    senderEmail: auth.currentUser?.email || "admin",
  };

  await setDoc(doc(collection(db, "announcements")), payload);
  await setDoc(doc(collection(db, "notifications")), {
    ...payload,
    title: "Admin Broadcast",
    body: message,
    read: false,
    recipientId: "all",
  });

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      console.warn("Announcement relay to backend failed", response.status);
    }
  } catch (error) {
    console.warn("Announcement relay error", error);
  }

  await logAdminActivity("broadcast_sent", { message });
}

export async function saveAppConfig(config: Record<string, any>): Promise<void> {
  await ensureAdminAccess();
  await setDoc(doc(db, "app_config", "default"), {
    ...config,
    updatedAt: Date.now(),
  }, { merge: true });
  await logAdminActivity("app_config_saved", config);
}

export async function fetchActivityLogs(): Promise<any[]> {
  await ensureAdminAccess();
  const snapshot = await getDocs(query(collection(db, "admin_activity"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function logAdminActivity(action: string, details: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(collection(db, "admin_activity")), {
      action,
      details,
      actorEmail: auth.currentUser?.email || "system",
      createdAt: Date.now(),
    });
  } catch (error) {
    console.warn("Admin activity logging failed", error);
  }
}

export async function trackAdminEvent(eventName: string, params?: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(collection(db, "analytics_events")), {
      eventName,
      params: params || {},
      createdAt: Date.now(),
    });
  } catch (error) {
    console.warn("Analytics event logging failed", error);
  }
}

export async function reportCrash(error: Error | string, context?: Record<string, any>): Promise<void> {
  try {
    await setDoc(doc(collection(db, "crash_reports")), {
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "string" ? "" : error.stack,
      context: context || {},
      createdAt: Date.now(),
    });
  } catch (reportError) {
    console.warn("Crash reporting failed", reportError);
  }
}
