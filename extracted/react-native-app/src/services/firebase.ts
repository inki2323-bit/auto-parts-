import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SparePart, User, ChatRoom, ChatMessage, AppVersionConfig, SellerReview } from "../types";
import { uploadImageToCloudinary, deleteImagesFromCloudinary, extractPublicId } from "./cloudinary";
import { getFirebaseConfig, getApiBaseUrl } from "./backendConfig";

const firebaseConfig = getFirebaseConfig();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication Functions
export async function registerWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    await AsyncStorage.setItem("auth_user_email", cred.user.email || "");
  }
  return cred.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    await AsyncStorage.setItem("auth_user_email", cred.user.email || "");
  }
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
  await AsyncStorage.removeItem("auth_user_email");
}

export function subscribeAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

export async function fetchPartsList(): Promise<SparePart[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "spare_parts"));
    if (!querySnapshot.empty) {
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SparePart));
    }
  } catch (err) {
    console.log("Firestore fallback to local cache");
  }

  const cached = await AsyncStorage.getItem("autoparts_cached_parts");
  if (cached) {
    try {
      return JSON.parse(cached) as SparePart[];
    } catch (e) {
      console.warn("Failed to parse cached parts", e);
    }
  }

  return [];
}

// Create Listing with mandatory Cloudinary upload & public_id tracking
export async function createSparePartListing(
  partData: Omit<SparePart, "id" | "imageUrl" | "imageUrls" | "imagePublicIds">,
  imageUris: string[]
): Promise<string> {
  if (!imageUris || imageUris.length === 0) {
    throw new Error("At least one product photo is required to post a listing.");
  }

  const uploadedUrls: string[] = [];
  const uploadedPublicIds: string[] = [];

  // Upload all images to Cloudinary. If any image upload fails, abort listing creation.
  for (const uri of imageUris) {
    try {
      const res = await uploadImageToCloudinary(uri);
      uploadedUrls.push(res.secure_url);
      uploadedPublicIds.push(res.public_id);
    } catch (err) {
      // Clean up any successfully uploaded images prior to failure to prevent orphan images
      if (uploadedPublicIds.length > 0) {
        await deleteImagesFromCloudinary(uploadedPublicIds);
      }
      throw new Error(`Failed to upload product photo to Cloudinary. Listing creation aborted.`);
    }
  }

  const docData = {
    ...partData,
    imageUrl: uploadedUrls[0],
    imageUrls: uploadedUrls,
    imagePublicIds: uploadedPublicIds,
    approved: true,
    status: "approved",
    createdAt: Date.now(),
  };

  const docRef = await addDoc(collection(db, "spare_parts"), docData);
  await AsyncStorage.setItem("autoparts_cached_parts", JSON.stringify([...(await AsyncStorage.getItem("autoparts_cached_parts") ? JSON.parse(await AsyncStorage.getItem("autoparts_cached_parts") as string) : []), { id: docRef.id, ...docData }]));
  return docRef.id;
}

// Delete Listing with automatic Cloudinary image purging
export async function deleteSparePartListing(partId: string): Promise<void> {
  try {
    const docRef = doc(db, "spare_parts", partId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as SparePart;
      const pidsToDelete: string[] = [];

      if (data.imagePublicIds && data.imagePublicIds.length > 0) {
        pidsToDelete.push(...data.imagePublicIds);
      } else if (data.imageUrls && data.imageUrls.length > 0) {
        data.imageUrls.forEach(url => {
          const pid = extractPublicId(url);
          if (pid) pidsToDelete.push(pid);
        });
      } else if (data.imageUrl) {
        const pid = extractPublicId(data.imageUrl);
        if (pid) pidsToDelete.push(pid);
      }

      // Delete document first
      await deleteDoc(docRef);

      // Purge images from Cloudinary upon successful DB deletion
      if (pidsToDelete.length > 0) {
        await deleteImagesFromCloudinary(pidsToDelete);
      }
    }
  } catch (err: any) {
    console.error("Failed to delete spare part listing:", err);
    throw err;
  }
}

// Edit Listing with automatic removal of unused Cloudinary images
export async function updateSparePartListing(
  partId: string,
  updatedData: Partial<SparePart>,
  removedPublicIdsOrUrls: string[] = []
): Promise<void> {
  try {
    const docRef = doc(db, "spare_parts", partId);
    await updateDoc(docRef, updatedData);

    // Delete removed images from Cloudinary to prevent orphans
    if (removedPublicIdsOrUrls.length > 0) {
      await deleteImagesFromCloudinary(removedPublicIdsOrUrls);
    }
  } catch (err: any) {
    console.error("Failed to update spare part listing:", err);
    throw err;
  }
}
