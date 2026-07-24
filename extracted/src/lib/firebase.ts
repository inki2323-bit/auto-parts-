import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  getDocFromServer
} from "firebase/firestore";
import { SparePart, User, Chat, Message, SellerReview, Notification, CAR_PART_CATEGORIES, INDIAN_CAR_BRANDS, CAR_SPARE_PARTS_BY_CATEGORY, DEFAULT_MODEL_VARIANTS, POPULAR_LOCATIONS, AppVersionConfig } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { INITIAL_SPARE_PARTS, INITIAL_SELLER_REVIEWS } from "../data/mockData";
import firebaseAppletConfig from "../../firebase-applet-config.json";

const metaEnv = (import.meta as any).env || {};

const configFromFile = (firebaseAppletConfig || {}) as any;

const getFirebaseConfigValue = (key: string, envVal: string | undefined): string => {
  const fileVal = configFromFile[key];
  if (typeof fileVal === "string" && fileVal.trim()) {
    return fileVal.trim();
  }
  if (typeof envVal === "string" && envVal.trim()) {
    let val = envVal.trim();
    if (val.includes(" ")) {
      const parts = val.split(/\s+/);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].trim();
        if (p && !p.includes("VITE_") && !p.includes("FIREBASE_")) {
          return p;
        }
      }
      return parts[parts.length - 1].trim();
    }
    return val;
  }
  return "";
};

// Prioritize clean values from firebase-applet-config.json
const firebaseConfig = {
  apiKey: getFirebaseConfigValue("apiKey", metaEnv.VITE_FIREBASE_API_KEY) || "AIzaSyAGYut7q3nCW-qSDPSldGSbxAjnna_-bvo",
  authDomain: getFirebaseConfigValue("authDomain", metaEnv.VITE_FIREBASE_AUTH_DOMAIN) || "auto-parts-market-place-20312.firebaseapp.com",
  projectId: getFirebaseConfigValue("projectId", metaEnv.VITE_FIREBASE_PROJECT_ID) || "auto-parts-market-place-20312",
  storageBucket: getFirebaseConfigValue("storageBucket", metaEnv.VITE_FIREBASE_STORAGE_BUCKET) || "auto-parts-market-place-20312.firebasestorage.app",
  messagingSenderId: getFirebaseConfigValue("messagingSenderId", metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID) || "751764116522",
  appId: getFirebaseConfigValue("appId", metaEnv.VITE_FIREBASE_APP_ID) || "1:751764116522:web:c7eb06038e6a85337adf53",
  databaseId: getFirebaseConfigValue("firestoreDatabaseId", metaEnv.VITE_FIREBASE_DATABASE_ID) || configFromFile.firestoreDatabaseId || ""
};

// Determine if configuration is valid and fully provided
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId
);

let app: any = null;
let auth: any = null;
let db: any = null;
let useFirebase = false;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = firebaseConfig.databaseId && firebaseConfig.databaseId !== "(default)"
      ? getFirestore(app, firebaseConfig.databaseId)
      : getFirestore(app);
    useFirebase = true;
    console.log("Firebase initialized successfully with configuration:", firebaseConfig.projectId, "Database:", firebaseConfig.databaseId);
    
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  } catch (error) {
    console.error("Failed to initialize Firebase, falling back to LocalStorage:", error);
    useFirebase = false;
  }
} else {
  console.log("Firebase config not found or incomplete. Falling back to LocalStorage mode.");
}

// Ensure local storage has initial spare parts if empty
const LOCAL_STORAGE_PARTS_KEY = "autoparts_listings";
const LOCAL_STORAGE_USERS_KEY = "autoparts_users";
const LOCAL_STORAGE_CURRENT_USER_KEY = "autoparts_current_user";
const LOCAL_STORAGE_REVIEWS_KEY = "autoparts_seller_reviews";

if (!localStorage.getItem(LOCAL_STORAGE_PARTS_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify([]));
}

if (!localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify([]));
}

// ----------------------------------------------------
// DATABASE SERVICES (FIRESTORE / LOCALSTORAGE)
// ----------------------------------------------------

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.warn('Firestore Access Warning: ', JSON.stringify(errInfo));
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

export async function uploadProductImage(base64Data: string, partId?: string): Promise<string> {
  try {
    const url = "https://api.cloudinary.com/v1_1/rqf1hlrx/image/upload";
    const formData = new FormData();
    formData.append("file", base64Data);
    formData.append("upload_preset", "autoparts_upload");

    const response = await withTimeout(
      fetch(url, {
        method: "POST",
        body: formData,
      }),
      15000,
      "Cloudinary upload timed out. Please check your network connection."
    );

    if (!response.ok) {
      const errText = await response.text();
      let cleanErrorMessage = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          cleanErrorMessage = parsed.error.message;
        }
      } catch (e) {}
      throw new Error(`Cloudinary error: ${cleanErrorMessage}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error("Cloudinary response is missing secure_url.");
    }
    console.log("Image uploaded successfully to Cloudinary:", data.secure_url);
    return data.secure_url;
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error(error.message || "Failed to upload image to Cloudinary.");
  }
}

export function extractPublicId(url: string): string | null {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  try {
    const uploadIndex = url.indexOf("/image/upload/");
    if (uploadIndex === -1) return null;
    
    let path = url.substring(uploadIndex + "/image/upload/".length);
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    const cleanSegments: string[] = [];
    for (const seg of segments) {
      // Skip transformation options and version prefixes
      if (
        seg.includes(",") ||
        /^(c|w|h|q|f|e|b|r|a|dpr|fl|co|l|u|pg|so|eo|s|bo|o|x|y|g|p|m|t|ar|cs|d|ki|dl)_/.test(seg) ||
        /^v\d+$/.test(seg)
      ) {
        continue;
      }
      cleanSegments.push(seg);
    }

    if (cleanSegments.length === 0) return null;

    let publicId = cleanSegments.join("/");
    const lastDotIndex = publicId.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      publicId = publicId.substring(0, lastDotIndex);
    }

    return publicId || null;
  } catch (e) {
    console.error("Failed to extract public_id from Cloudinary URL:", url, e);
    return null;
  }
}

export async function deleteImagesFromCloudinary(publicIds: string[]): Promise<void> {
  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) return;

  const cleanedPids: string[] = [];
  for (const item of publicIds) {
    if (!item) continue;
    const pid = extractPublicId(item) || item;
    if (pid && !cleanedPids.includes(pid)) {
      cleanedPids.push(pid);
    }
  }

  if (cleanedPids.length === 0) return;

  try {
    const response = await fetch("/api/delete-cloudinary-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicIds: cleanedPids }),
    });

    if (!response.ok) {
      console.warn(`Cloudinary deletion API returned status ${response.status}. Continuing with Firestore document deletion.`);
      return;
    }

    const data = await response.json();
    console.log(`Cloudinary deletion API response:`, data);
  } catch (err) {
    console.warn("Non-fatal error calling Cloudinary image deletion API:", err);
  }
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  await deleteImagesFromCloudinary([publicId]);
}

export function isUsingFirebase(): boolean {
  return useFirebase;
}

export function convertTimestampToNumber(timestamp: any): number {
  if (!timestamp) return Date.now();
  if (typeof timestamp === "number") return timestamp;
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  return Date.now();
}

export async function fetchSpareParts(): Promise<SparePart[]> {
  let firestoreParts: SparePart[] = [];
  if (useFirebase && db) {
    const path = "products/listings/items";
    try {
      const partsRef = collection(db, "products", "listings", "items");
      const q = query(partsRef);
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          firestoreParts.push({ 
            ...data, 
            id: docSnapshot.id,
            createdAt: convertTimestampToNumber(data.createdAt)
          } as SparePart);
        });
      } else {
        console.log("Firestore parts collection is empty. Auto-seeding initial parts into Firestore...");
        for (const item of INITIAL_SPARE_PARTS) {
          try {
            const itemRef = doc(db, "products", "listings", "items", item.id);
            await setDoc(itemRef, {
              ...item,
              createdAt: serverTimestamp()
            });
            firestoreParts.push({
              ...item,
              createdAt: Date.now()
            });
          } catch (seedErr) {
            console.warn("Failed to seed initial part to Firestore:", item.id, seedErr);
          }
        }
      }
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, path);
      } else {
        console.warn("Firestore fetch issue, falling back to LocalStorage:", err);
      }
    }
  }

  // Fallback / merge LocalStorage for local user created listings
  let localPartsList: SparePart[] = [];
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    try {
      localPartsList = JSON.parse(localData);
    } catch (e) {
      console.warn("Failed to parse local parts:", e);
    }
  }

  // Combine Firestore and Local parts
  const allParts = firestoreParts.length > 0 ? [...firestoreParts] : [...INITIAL_SPARE_PARTS];
  for (const lp of localPartsList) {
    if (!allParts.some(p => p.id === lp.id)) {
      allParts.push(lp);
    }
  }

  allParts.sort((a, b) => b.createdAt - a.createdAt);
  return allParts;
}

export async function createSparePartListing(part: Omit<SparePart, "id" | "createdAt">): Promise<SparePart> {
  if (useFirebase && db) {
    const path = "products/listings/items";
    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
      }
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be logged in to create a listing.");
      }

      // Generate a temporary ID for file upload naming if needed
      const tempId = "part-" + Math.random().toString(36).substr(2, 9);
      let finalImageUrl = part.imageUrl;
      if (part.imageUrl && part.imageUrl.startsWith("data:image/")) {
        finalImageUrl = await uploadProductImage(part.imageUrl, tempId);
      }

      // Construct a clean payload for Firestore without an empty id field
      const publicIds: string[] = [];
      const urlsToProcess = [finalImageUrl, ...(part.imageUrls || [])];
      for (const url of urlsToProcess) {
        if (url) {
          const pid = extractPublicId(url);
          if (pid && !publicIds.includes(pid)) {
            publicIds.push(pid);
          }
        }
      }

      const payload = {
        title: part.title,
        description: part.description,
        price: part.price,
        carBrand: part.carBrand,
        carModel: part.carModel,
        category: part.category,
        partName: part.partName || "",
        condition: part.condition,
        location: part.location,
        state: part.state || "",
        district: part.district || "",
        lat: part.lat ?? null,
        lng: part.lng ?? null,
        contactName: part.contactName,
        contactPhone: part.contactPhone,
        imageUrl: finalImageUrl,
        imageUrls: part.imageUrls || [finalImageUrl],
        imagePublicIds: publicIds,
        sellerId: currentUser.uid, // Explicitly set to current authenticated user ID
        sellerEmail: currentUser.email || part.sellerEmail,
        sold: part.sold || false,
        createdAt: serverTimestamp()
      };

      const partsRef = collection(db, "products", "listings", "items");
      console.log(`[Firestore Write] Creating new listing in products/listings/items...`);
      const docRef = await withTimeout(
        addDoc(partsRef, payload),
        10000,
        "Firestore listing creation timed out. Please check your database connection or try again."
      );
      
      const exactPath = `products/listings/items/${docRef.id}`;
      console.log(`[Firestore Write] Listing created successfully in Firestore. Document ID: ${docRef.id}, exact Firestore path: ${exactPath}`);

      // Immediately fetch and verify the document exists in Firestore
      const savedDoc = await withTimeout(
        getDoc(docRef),
        10000,
        "Firestore verification timed out. Failed to confirm listing creation."
      );
      if (!savedDoc.exists()) {
        throw new Error(`Failed to verify listing after creation in Firestore. Document at path "${exactPath}" does not exist.`);
      }

      const savedData = savedDoc.data();
      console.log(`[Firestore Readback Verification] Verified document exists at ${exactPath}. ID: ${docRef.id}`);
      return {
        ...savedData,
        id: docRef.id,
        createdAt: convertTimestampToNumber(savedData.createdAt)
      } as SparePart;
    } catch (err: any) {
      console.error(`[Firestore Write Failure] Error during listing creation/verification at products/listings/items:`, err);
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      // CRITICAL: We MUST throw the complete error here so that the UI can capture and display it!
      throw new Error(`Firestore listing creation failed: ${err.message || err}`);
    }
  }

  // Fallback / standard LocalStorage save if Firebase is disabled
  const tempId = "part-" + Math.random().toString(36).substr(2, 9);
  const localPids: string[] = [];
  const localUrls = [part.imageUrl, ...(part.imageUrls || [])];
  for (const url of localUrls) {
    if (url) {
      const pid = extractPublicId(url);
      if (pid && !localPids.includes(pid)) {
        localPids.push(pid);
      }
    }
  }

  const newPart: SparePart = {
    ...part,
    imagePublicIds: localPids,
    id: "local-part-" + tempId,
    createdAt: Date.now()
  };
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  const partsList: SparePart[] = localData ? JSON.parse(localData) : [];
  partsList.unshift(newPart);
  localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
  window.dispatchEvent(new Event("autoparts_listings_updated"));
  return newPart;
}

export function subscribeToSpareParts(
  callback: (parts: SparePart[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Listener] subscribeToSpareParts requested...`);

  const processAndDeliverParts = (firestoreParts: SparePart[]) => {
    let localPartsList: SparePart[] = [];
    const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
    if (localData) {
      try {
        localPartsList = JSON.parse(localData);
      } catch (e) {
        // ignore
      }
    }

    const allParts = firestoreParts.length > 0 ? [...firestoreParts] : [...INITIAL_SPARE_PARTS];
    for (const lp of localPartsList) {
      if (!allParts.some(p => p.id === lp.id)) {
        allParts.push(lp);
      }
    }

    allParts.sort((a, b) => b.createdAt - a.createdAt);
    callback(allParts);
  };

  if (useFirebase && db) {
    try {
      const partsRef = collection(db, "products", "listings", "items");
      const q = query(partsRef);

      const unsub = onSnapshot(q, (snapshot) => {
        console.log(`[Firestore Listener Callback] Received parts snapshot update. Size: ${snapshot.size}`);
        
        const firestoreParts: SparePart[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            firestoreParts.push({
              ...data,
              id: docSnapshot.id,
              createdAt: convertTimestampToNumber(data.createdAt)
            } as SparePart);
          });
        }
        
        processAndDeliverParts(firestoreParts);
      }, (err) => {
        console.error(`[Firestore Listener Error] subscribeToSpareParts failed:`, err);
        if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
          handleFirestoreError(err, OperationType.LIST, "products/listings/items");
        }
        processAndDeliverParts([]);
        if (onError) onError(err);
      });

      return unsub;
    } catch (err: any) {
      console.error(`[Firestore Query Exception] Error starting parts listener:`, err);
      processAndDeliverParts([]);
      if (onError) onError(err);
      return () => {};
    }
  }

  // Fallback / standard LocalStorage fallback with simulated event or interval
  console.log(`[LocalStorage Fallback] Using localStorage listener for parts.`);
  const loadLocalParts = () => {
    processAndDeliverParts([]);
  };

  loadLocalParts();

  // Listen to custom events or simple storage event for local updates
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_PARTS_KEY) {
      loadLocalParts();
    }
  };
  
  const handleCustomUpdate = () => {
    loadLocalParts();
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("autoparts_listings_updated", handleCustomUpdate);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("autoparts_listings_updated", handleCustomUpdate);
  };
}

export async function deleteSparePartListing(partId: string): Promise<boolean> {
  if (partId.startsWith("local-part-")) {
    const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
    if (localData) {
      let partsList: SparePart[] = JSON.parse(localData);
      partsList = partsList.filter(p => p.id !== partId);
      localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
      window.dispatchEvent(new Event("autoparts_listings_updated"));
    }
    return true;
  }

  if (useFirebase && db) {
    const path = `products/listings/items/${partId}`;
    try {
      const docRef = doc(db, "products", "listings", "items", partId);
      
      // Step 1: Fetch document first to retrieve Cloudinary public IDs and image URLs
      let pidsToDelete: string[] = [];
      try {
        const docSnap = await withTimeout(
          getDoc(docRef),
          5000,
          "Fetching listing details before deletion timed out."
        );
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pids = data.imagePublicIds || [];
          
          const extractedPids: string[] = [];
          const urls = [data.imageUrl, ...(data.imageUrls || [])];
          for (const url of urls) {
            if (url) {
              const pid = extractPublicId(url);
              if (pid && !extractedPids.includes(pid) && !pids.includes(pid)) {
                extractedPids.push(pid);
              }
            }
          }
          pidsToDelete = [...pids, ...extractedPids];
        }
      } catch (getErr) {
        console.warn("Could not fetch document before deletion, proceeding directly with document deletion:", getErr);
      }

      // Step 2: Attempt non-blocking Cloudinary image cleanup
      if (pidsToDelete.length > 0) {
        try {
          await deleteImagesFromCloudinary(pidsToDelete);
        } catch (cloudErr) {
          console.warn("Cloudinary cleanup failed non-fatally, proceeding with Firestore document deletion:", cloudErr);
        }
      }

      // Step 3: Primary operation: Delete document from Firestore
      console.log(`[Firestore Delete] Deleting document at ${path}...`);
      await withTimeout(
        deleteDoc(docRef),
        10000,
        "Firestore document deletion timed out. Please try again."
      );

      // Step 4: Also clean up local storage cache if present
      const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
      if (localData) {
        let partsList: SparePart[] = JSON.parse(localData);
        partsList = partsList.filter(p => p.id !== partId);
        localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
        window.dispatchEvent(new Event("autoparts_listings_updated"));
      }

      console.log(`[Firestore Delete Success] Listing ${partId} deleted successfully.`);
      return true;
    } catch (err: any) {
      console.error(`[Firestore Delete Failure] Error deleting listing ${partId}:`, err);
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.DELETE, path);
        throw new Error("Permission denied: You do not have permission to delete this listing.");
      } else {
        throw new Error(`Failed to delete listing: ${err.message || String(err)}`);
      }
    }
  }

  // LocalStorage delete fallback when Firebase is disabled
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    let partsList: SparePart[] = JSON.parse(localData);
    partsList = partsList.filter(p => p.id !== partId);
    localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
    window.dispatchEvent(new Event("autoparts_listings_updated"));
    return true;
  }
  return false;
}

export async function updateSparePartListing(partId: string, updates: Partial<SparePart>): Promise<boolean> {
  if (useFirebase && db && !partId.startsWith("local-part-")) {
    const path = `products/listings/items/${partId}`;
    try {
      const docRef = doc(db, "products", "listings", "items", partId);
      
      // If imageUrl or imageUrls are updated, compute new public IDs and clean up orphaned ones
      if (updates.imageUrl || updates.imageUrls) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const oldData = docSnap.data();
          const oldPids = oldData.imagePublicIds || [];
          
          // Compute new public IDs
          const newUrls = [updates.imageUrl || oldData.imageUrl, ...(updates.imageUrls || oldData.imageUrls || [])];
          const newPids: string[] = [];
          for (const url of newUrls) {
            if (url) {
              const pid = extractPublicId(url);
              if (pid && !newPids.includes(pid)) {
                newPids.push(pid);
              }
            }
          }
          updates.imagePublicIds = newPids;

          // Find old public IDs that are no longer in new public IDs (orphaned)
          const orphanedPids = oldPids.filter((pid: string) => !newPids.includes(pid));
          for (const pid of orphanedPids) {
            try {
              await deleteImageFromCloudinary(pid);
            } catch (err) {
              console.warn(`Failed to clean up orphaned image ${pid} during update:`, err);
            }
          }
        }
      }

      await updateDoc(docRef, updates);
      return true;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.UPDATE, path);
        throw err;
      } else {
        console.warn("Firestore update issue:", err);
        throw err;
      }
    }
  }

  // LocalStorage update fallback
  const localData = localStorage.getItem(LOCAL_STORAGE_PARTS_KEY);
  if (localData) {
    let partsList: SparePart[] = JSON.parse(localData);
    partsList = partsList.map(p => p.id === partId ? { ...p, ...updates } : p);
    localStorage.setItem(LOCAL_STORAGE_PARTS_KEY, JSON.stringify(partsList));
    return true;
  }
  return false;
}

// ----------------------------------------------------
// AUTHENTICATION SERVICES (FIREBASE AUTH / LOCALSTORAGE)
// ----------------------------------------------------

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Active callbacks for local auth updates
const authCallbacks = new Set<(user: User | null) => void>();

function dispatchAuthChange() {
  const localUserRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  let currentUser: User | null = null;
  if (localUserRaw) {
    try {
      currentUser = JSON.parse(localUserRaw);
    } catch (e) {}
  }
  for (const cb of authCallbacks) {
    cb(currentUser);
  }
  window.dispatchEvent(new Event("autoparts_auth_changed"));
  window.dispatchEvent(new Event("storage"));
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  authCallbacks.add(callback);
  
  let unsubscribeFirebase: (() => void) | null = null;
  
  if (useFirebase && auth) {
    // Immediately check cached user from local storage so authenticated users skip login screen instantly
    const cachedUserRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (cachedUserRaw) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw);
        if (cachedUser && cachedUser.id) {
          callback(cachedUser);
        }
      } catch (e) {}
    }

    try {
      unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // Resolve user display details
          const rawName = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
          const u: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: rawName.includes("@") ? rawName.split("@")[0] : rawName,
            phone: firebaseUser.phoneNumber || undefined,
            emailVerified: firebaseUser.emailVerified,
          };
          
          try {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              const fetchedName = data.name || u.name;
              u.name = fetchedName.includes("@") ? fetchedName.split("@")[0] : fetchedName;
              u.phone = data.phone || u.phone;
              u.state = data.state || u.state;
              u.district = data.district || u.district;
              u.isBlocked = data.isBlocked || false;
            }
          } catch (e: any) {
            if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Missing or insufficient permissions")) {
              handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
            } else {
              console.warn("Failed to load user profile from Firestore:", e);
            }
          }
          // Save locally so fallback is in sync
          localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(u));
          callback(u);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
          callback(null);
        }
      });
    } catch (e) {
      console.warn("Firebase onAuthStateChanged failed:", e);
    }
  } else {
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    callback(null);
  }

  // Handle storage / custom event for dynamic local auth changes
  const handleLocalAuthChange = () => {
    const localUserRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (localUserRaw) {
      try {
        callback(JSON.parse(localUserRaw));
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
  };

  window.addEventListener("autoparts_auth_changed", handleLocalAuthChange);
  window.addEventListener("storage", handleLocalAuthChange);

  return () => {
    authCallbacks.delete(callback);
    if (unsubscribeFirebase) {
      unsubscribeFirebase();
    }
    window.removeEventListener("autoparts_auth_changed", handleLocalAuthChange);
    window.removeEventListener("storage", handleLocalAuthChange);
  };
}

export async function updateUserProfile(userId: string, profile: Partial<User>): Promise<void> {
  if (useFirebase && db) {
    try {
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        ...profile,
        id: userId,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e: any) {
      if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
      } else {
        console.warn("Failed to update user profile in Firestore:", e);
      }
    }
  }

  // Also update in LocalStorage CURRENT_USER
  const currentRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  if (currentRaw) {
    try {
      const current: User = JSON.parse(currentRaw);
      if (current.id === userId) {
        const updated = { ...current, ...profile };
        localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Failed to parse local current user profile:", e);
    }
  }

  dispatchAuthChange();
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (useFirebase && db) {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
    } catch (e) {
      console.warn("Failed to fetch user profile from Firestore:", e);
    }
  }

  // Fallback to searching all users list
  const allUsers = await fetchAllUsers();
  const found = allUsers.find((u) => u.id === userId);
  return found || null;
}

export async function signInWithGoogle(): Promise<User> {
  if (useFirebase && auth) {
    try {
      const provider = new GoogleAuthProvider();
      // Always prompt account selection to force displaying the Google Account Picker on every login
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const initialName = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
      const u: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: initialName.includes("@") ? initialName.split("@")[0] : initialName,
        phone: firebaseUser.phoneNumber || undefined,
        emailVerified: firebaseUser.emailVerified,
      };

      if (db) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              id: firebaseUser.uid,
              name: u.name,
              email: u.email,
              phone: u.phone,
              createdAt: Date.now()
            });
          } else {
            const data = userDoc.data();
            u.name = data.name || u.name;
            u.phone = data.phone || u.phone;
            u.state = data.state || u.state;
            u.district = data.district || u.district;
            u.isBlocked = data.isBlocked || false;
          }
        } catch (e: any) {
          if (e?.code === "permission-denied" || e?.message?.includes("permission") || e?.message?.includes("Missing or insufficient permissions")) {
            handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`);
          } else {
            console.warn("Failed to check or create user document in Firestore on Google Login:", e);
          }
        }
      }

      localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(u));
      dispatchAuthChange();
      return u;
    } catch (err: any) {
      console.warn("Google Auth error:", err?.code || err?.message || err);
      if (err?.message && (err.message.includes("console.firebase.google.com") || err.message.includes("unauthorized-domain"))) {
        const cleanErr = new Error("Google Sign-In is temporarily unavailable. Please try again.");
        (cleanErr as any).code = err.code || "auth/unauthorized-domain";
        throw cleanErr;
      }
      throw err;
    }
  }

  // Fallback / mock Google Sign-In for development/offline
  const mockUser: User = {
    id: "google-mock-user-123",
    email: "googleuser@example.com",
    name: "Google User",
    emailVerified: true
  };
  localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(mockUser));
  dispatchAuthChange();
  return mockUser;
}

export async function signOut(): Promise<void> {
  // Clear all cached credentials, tokens, and local storage related to auth
  localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  localStorage.removeItem("autoparts_auth_token");
  localStorage.removeItem("firebase:host:ai-studio-autopartsmarketp-6b6de595-2abc-431d-a6dc-0141a5eff96f");
  
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn("Could not clear sessionStorage:", e);
  }

  if (auth) {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Firebase signOut failed:", e);
    }
  }

  dispatchAuthChange();
}

// Unused Email-based auth functions removed

// ----------------------------------------------------
// IN-APP CHAT SERVICES (FIRESTORE / LOCALSTORAGE FALLBACK)
// ----------------------------------------------------

const LOCAL_STORAGE_CHATS_KEY = "autoparts_chats_list";

export async function fetchUserChats(userId: string): Promise<Chat[]> {
  if (useFirebase && db) {
    try {
      const chatsRef = collection(db, "chats");
      
      // Query as buyer
      const qBuyer = query(chatsRef, where("buyerId", "==", userId));
      const buyerSnap = await getDocs(qBuyer);
      
      // Query as seller
      const qSeller = query(chatsRef, where("sellerId", "==", userId));
      const sellerSnap = await getDocs(qSeller);
      
      const chatsMap = new Map<string, Chat>();
      
      buyerSnap.forEach((d) => {
        chatsMap.set(d.id, { id: d.id, ...d.data() } as Chat);
      });
      
      sellerSnap.forEach((d) => {
        chatsMap.set(d.id, { id: d.id, ...d.data() } as Chat);
      });
      
      return Array.from(chatsMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, "chats");
      } else {
        console.warn("Firestore chats fetch failed:", err);
      }
    }
  }

  // LocalStorage Mock
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  if (localChatsRaw) {
    const chats: Chat[] = JSON.parse(localChatsRaw);
    return chats
      .filter((c) => c.buyerId === userId || c.sellerId === userId)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }
  return [];
}

export function subscribeToUserChats(
  userId: string,
  callback: (chats: Chat[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Query/Listener] subscribeToUserChats requested for userId: "${userId}"`);

  if (useFirebase && auth && db) {
    let unsubBuyer: (() => void) | null = null;
    let unsubSeller: (() => void) | null = null;
    let isUnsubscribed = false;

    // Helper to start the actual Firestore listeners
    const startListeners = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      
      try {
        console.log(`[Firestore Query] Starting chats queries for authenticated user "${authenticatedUid}"...`);
        const chatsRef = collection(db, "chats");
        const qBuyer = query(chatsRef, where("buyerId", "==", authenticatedUid));
        const qSeller = query(chatsRef, where("sellerId", "==", authenticatedUid));
        
        let buyerChats: Chat[] = [];
        let sellerChats: Chat[] = [];
        let buyerLoaded = false;
        let sellerLoaded = false;
        let buyerError: any = null;
        let sellerError: any = null;
        
        const emit = () => {
          if (isUnsubscribed) return;
          
          if (buyerError || sellerError) {
            const error = buyerError || sellerError;
            console.error(`[Firestore Listener Error] subscribeToUserChats error:`, error);
            if (onError) {
              onError(error instanceof Error ? error : new Error(String(error)));
            } else {
              callback([]);
            }
            return;
          }

          if (buyerLoaded && sellerLoaded) {
            const chatsMap = new Map<string, Chat>();
            buyerChats.forEach(c => chatsMap.set(c.id, c));
            sellerChats.forEach(c => chatsMap.set(c.id, c));
            const sorted = Array.from(chatsMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
            console.log(`[Firestore Query] subscribeToUserChats successfully emitted ${sorted.length} chats.`);
            callback(sorted);
          }
        };
        
        console.log(`[Firestore Listener] Subscribing to buyer chats (buyerId == "${authenticatedUid}")...`);
        unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received buyer chats update. Document count: ${snapshot.size}`);
          buyerChats = [];
          snapshot.forEach((d) => {
            buyerChats.push({ id: d.id, ...d.data() } as Chat);
          });
          buyerLoaded = true;
          buyerError = null;
          emit();
        }, (err) => {
          console.error(`[Firestore Listener Error] Failed on qBuyer snapshot subscription:`, err);
          handleFirestoreError(err, OperationType.LIST, `chats (buyerId == ${authenticatedUid})`);
          buyerLoaded = true;
          buyerError = err;
          emit();
        });
        
        console.log(`[Firestore Listener] Subscribing to seller chats (sellerId == "${authenticatedUid}")...`);
        unsubSeller = onSnapshot(qSeller, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received seller chats update. Document count: ${snapshot.size}`);
          sellerChats = [];
          snapshot.forEach((d) => {
            sellerChats.push({ id: d.id, ...d.data() } as Chat);
          });
          sellerLoaded = true;
          sellerError = null;
          emit();
        }, (err) => {
          console.error(`[Firestore Listener Error] Failed on qSeller snapshot subscription:`, err);
          handleFirestoreError(err, OperationType.LIST, `chats (sellerId == ${authenticatedUid})`);
          sellerLoaded = true;
          sellerError = err;
          emit();
        });
      } catch (err: any) {
        console.error("[Firestore Query Exception] Error inside subscribeToUserChats startListeners:", err);
        if (onError) {
          onError(err);
        } else {
          callback([]);
        }
      }
    };

    // Listen to Auth State changes to ensure we have a valid, non-null Firebase user UID
    console.log(`[Firestore Auth Watch] Registering onAuthStateChanged listener to delay query until user is authenticated.`);
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;

      if (firebaseUser) {
        console.log(`[Firestore Auth Watch] User is authenticated with UID: "${firebaseUser.uid}". Starting chat listeners.`);
        // Stop any old listeners just in case
        if (unsubBuyer) { unsubBuyer(); unsubBuyer = null; }
        if (unsubSeller) { unsubSeller(); unsubSeller = null; }
        
        startListeners(firebaseUser.uid);
      } else {
        console.warn(`[Firestore Auth Watch] User is NOT authenticated in Firebase. Delaying chat queries.`);
        if (unsubBuyer) { unsubBuyer(); unsubBuyer = null; }
        if (unsubSeller) { unsubSeller(); unsubSeller = null; }
        // For security, if they are not authenticated, we return empty list and stop loader
        callback([]);
      }
    });

    return () => {
      console.log(`[Firestore Listener Cleanup] Cleaning up subscribeToUserChats wrapper for user "${userId}".`);
      isUnsubscribed = true;
      unsubAuth();
      if (unsubBuyer) unsubBuyer();
      if (unsubSeller) unsubSeller();
    };
  }
  
  // LocalStorage Fallback
  console.log(`[LocalStorage Fallback] Initiating subscribeToUserChats for user "${userId}"`);
  const loadLocal = () => {
    try {
      const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
      if (localChatsRaw) {
        const chats: Chat[] = JSON.parse(localChatsRaw);
        const filtered = chats
          .filter((c) => c.buyerId === userId || c.sellerId === userId)
          .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        callback(filtered);
      } else {
        callback([]);
      }
    } catch (err: any) {
      console.error("[LocalStorage Error] Failed to read or parse local chats:", err);
      if (onError) onError(err);
      else callback([]);
    }
  };
  
  loadLocal();
  const handleUpdate = () => {
    loadLocal();
  };
  
  window.addEventListener("autoparts_chat_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);
  
  return () => {
    console.log(`[LocalStorage Cleanup] Unsubscribing from LocalStorage events for user "${userId}".`);
    window.removeEventListener("autoparts_chat_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  console.log(`[Firestore Query] fetchChatMessages requested for chatId: "${chatId}"`);
  if (useFirebase && db) {
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, orderBy("createdAt", "asc"));
      console.log(`[Firestore Query] Running getDocs query on chats/${chatId}/messages...`);
      const snapshot = await getDocs(q);
      console.log(`[Firestore Query] fetchChatMessages completed for "${chatId}". Retried size: ${snapshot.size}`);
      const messages: Message[] = [];
      snapshot.forEach((d) => {
        messages.push({ id: d.id, ...d.data() } as Message);
      });
      return messages;
    } catch (err: any) {
      console.error(`[Firestore Query Error] fetchChatMessages failed for "${chatId}":`, err);
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
      } else {
        console.warn("Firestore message fetch failed:", err);
      }
      throw err;
    }
  }

  // LocalStorage Mock
  console.log(`[LocalStorage Fallback] fetchChatMessages for "${chatId}"`);
  try {
    const localMsgKey = `autoparts_chat_messages_${chatId}`;
    const localMsgRaw = localStorage.getItem(localMsgKey);
    return localMsgRaw ? JSON.parse(localMsgRaw) : [];
  } catch (err: any) {
    console.error("[LocalStorage Error] Failed to fetch local messages:", err);
    return [];
  }
}

export function subscribeToChatMessages(
  chatId: string,
  callback: (messages: Message[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Query/Listener] subscribeToChatMessages requested for chatId: "${chatId}"`);
  
  if (useFirebase && auth && db) {
    let unsubMessages: (() => void) | null = null;
    let isUnsubscribed = false;

    const startMessagesListener = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      try {
        const msgRef = collection(db, "chats", chatId, "messages");
        const q = query(msgRef, orderBy("createdAt", "asc"));
        console.log(`[Firestore Listener] Subscribing to messages in subcollection: chats/${chatId}/messages for authenticated UID: ${authenticatedUid}`);
        unsubMessages = onSnapshot(q, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received messages snapshot update for chatId: "${chatId}". Size: ${snapshot.size}`);
          const messages: Message[] = [];
          snapshot.forEach((d) => {
            messages.push({ id: d.id, ...d.data() } as Message);
          });
          callback(messages);
        }, (err) => {
          console.error(`[Firestore Listener Error] subscribeToChatMessages onSnapshot failed for chatId: "${chatId}":`, err);
          if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
            handleFirestoreError(err, OperationType.GET, `chats/${chatId}/messages`);
          } else {
            console.warn("Firestore messages subscription error:", err);
          }
          if (onError) onError(err);
        });
      } catch (err: any) {
        console.error(`[Firestore Query Exception] Error starting messages listener for chatId: "${chatId}":`, err);
        if (onError) onError(err);
      }
    };

    console.log(`[Firestore Auth Watch] Registering onAuthStateChanged listener to delay message query until user is authenticated.`);
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;
      if (firebaseUser) {
        console.log(`[Firestore Auth Watch] User is authenticated: "${firebaseUser.uid}". Starting messages listener for chatId: "${chatId}".`);
        if (unsubMessages) { unsubMessages(); unsubMessages = null; }
        startMessagesListener(firebaseUser.uid);
      } else {
        console.warn(`[Firestore Auth Watch] User is NOT authenticated. Delaying message query for chatId: "${chatId}".`);
        if (unsubMessages) { unsubMessages(); unsubMessages = null; }
        callback([]);
      }
    });

    return () => {
      console.log(`[Firestore Listener Cleanup] Cleaning up subscribeToChatMessages for chatId: "${chatId}".`);
      isUnsubscribed = true;
      unsubAuth();
      if (unsubMessages) unsubMessages();
    };
  }

  // LocalStorage Mock with Custom Event and polling fallback
  console.log(`[LocalStorage Fallback] subscribeToChatMessages for chatId: "${chatId}"`);
  const getLocalMessages = () => {
    try {
      const localMsgKey = `autoparts_chat_messages_${chatId}`;
      const localMsgRaw = localStorage.getItem(localMsgKey);
      callback(localMsgRaw ? JSON.parse(localMsgRaw) : []);
    } catch (err: any) {
      console.error("[LocalStorage Error] Failed to read or parse local messages:", err);
      if (onError) onError(err);
    }
  };

  // Run once immediately
  getLocalMessages();

  // Listen to custom updates inside the app simulator
  const handleUpdate = () => {
    getLocalMessages();
  };

  window.addEventListener("autoparts_chat_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);
  
  return () => {
    console.log(`[LocalStorage Cleanup] Removing messages storage listeners for chatId: "${chatId}".`);
    window.removeEventListener("autoparts_chat_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function sendChatMessage(
  chatId: string, 
  senderId: string, 
  text: string, 
  chatMeta?: Omit<Chat, "id" | "lastMessageText" | "lastMessageAt">,
  imageUrl?: string
): Promise<Message> {
  const timestamp = Date.now();
  const newMessageId = "msg-" + Math.random().toString(36).substring(2, 11);
  const displayMessageText = text.trim() || (imageUrl ? "📷 Photo" : "");
  
  const newMessage: Omit<Message, "id"> = {
    senderId,
    text: displayMessageText,
    createdAt: timestamp,
    status: "sent",
    ...(imageUrl ? { imageUrl } : {})
  };

  if (useFirebase && db) {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      // If chat document does not exist, initialize it with metadata
      if (!chatDoc.exists()) {
        if (!chatMeta) {
          throw new Error("Chat metadata is required to initialize a new conversation document");
        }
        await setDoc(chatDocRef, {
          ...chatMeta,
          lastMessageText: displayMessageText,
          lastMessageAt: timestamp,
          lastSenderId: senderId
        });
      } else {
        await updateDoc(chatDocRef, {
          lastMessageText: displayMessageText,
          lastMessageAt: timestamp,
          lastSenderId: senderId
        });
      }
      
      // Add message
      const msgCollectionRef = collection(db, "chats", chatId, "messages");
      const addedDoc = await addDoc(msgCollectionRef, newMessage);
      
      // Create/update unread notification in Firestore for the receiver only (overwrites to avoid duplicates)
      try {
        const finalChatData = chatDoc.exists() ? chatDoc.data() : chatMeta;
        if (finalChatData) {
          const recipientId = senderId === finalChatData.buyerId ? finalChatData.sellerId : finalChatData.buyerId;
          const notificationId = `${chatId}_${recipientId}`;
          const notificationDocRef = doc(db, "notifications", notificationId);
          
          await setDoc(notificationDocRef, {
            id: notificationId,
            chatId,
            recipientId,
            senderId,
            text: displayMessageText,
            createdAt: timestamp,
            read: false,
            partTitle: finalChatData.partTitle || "",
            partPrice: finalChatData.partPrice || 0,
            partImageUrl: finalChatData.partImageUrl || "",
            buyerId: finalChatData.buyerId,
            buyerName: finalChatData.buyerName,
            sellerId: finalChatData.sellerId,
            sellerName: finalChatData.sellerName
          }, { merge: true });
          console.log(`[Firestore Notification] Created/Updated notification ${notificationId} for recipient ${recipientId}`);
        }
      } catch (notifErr) {
        console.warn("Failed to create Firestore notification:", notifErr);
      }
      
      return { id: addedDoc.id, ...newMessage };
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
      } else {
        console.warn("Firestore message send error, falling back to LocalStorage:", err);
      }
    }
  }

  // LocalStorage Mock
  // 1. Update/Create Chat Room
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  const chatsList: Chat[] = localChatsRaw ? JSON.parse(localChatsRaw) : [];
  let existingChat = chatsList.find((c) => c.id === chatId);
  
  if (!existingChat) {
    if (!chatMeta) {
      throw new Error("Chat metadata is required to initialize a new conversation");
    }
    existingChat = {
      ...chatMeta,
      id: chatId,
      lastMessageText: displayMessageText,
      lastMessageAt: timestamp,
      lastSenderId: senderId
    };
    chatsList.push(existingChat);
  } else {
    existingChat.lastMessageText = displayMessageText;
    existingChat.lastMessageAt = timestamp;
    existingChat.lastSenderId = senderId;
  }
  localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(chatsList));

  // 2. Append Message
  const localMsgKey = `autoparts_chat_messages_${chatId}`;
  const localMsgRaw = localStorage.getItem(localMsgKey);
  const messages: Message[] = localMsgRaw ? JSON.parse(localMsgRaw) : [];
  
  const fullMessage: Message = { id: newMessageId, ...newMessage };
  messages.push(fullMessage);
  localStorage.setItem(localMsgKey, JSON.stringify(messages));

  // Create or update unread notification in LocalStorage (overwrites to avoid duplicates)
  try {
    const finalChatMeta = existingChat || chatMeta;
    if (finalChatMeta) {
      const recipientId = senderId === finalChatMeta.buyerId ? finalChatMeta.sellerId : finalChatMeta.buyerId;
      const notificationId = `${chatId}_${recipientId}`;
      
      const localNotificationsRaw = localStorage.getItem("autoparts_notifications");
      let localNotifications: any[] = [];
      if (localNotificationsRaw) {
        try {
          localNotifications = JSON.parse(localNotificationsRaw);
        } catch (e) {}
      }
      
      // Filter out existing unread notification for the same chat/recipient to prevent duplicates
      localNotifications = localNotifications.filter(n => n.id !== notificationId);
      
      localNotifications.push({
        id: notificationId,
        chatId,
        recipientId,
        senderId,
        text: displayMessageText,
        createdAt: timestamp,
        read: false,
        partTitle: finalChatMeta.partTitle || "",
        partPrice: finalChatMeta.partPrice || 0,
        partImageUrl: finalChatMeta.partImageUrl || "",
        buyerId: finalChatMeta.buyerId,
        buyerName: finalChatMeta.buyerName,
        sellerId: finalChatMeta.sellerId,
        sellerName: finalChatMeta.sellerName
      });
      
      localStorage.setItem("autoparts_notifications", JSON.stringify(localNotifications));
      window.dispatchEvent(new Event("autoparts_notifications_updated"));
    }
  } catch (notifErr) {
    console.warn("Failed to create LocalStorage notification:", notifErr);
  }

  // Dispatch custom events to refresh any active chat drawers in real-time
  window.dispatchEvent(new CustomEvent("autoparts_chat_updated", { detail: { chatId } }));
  window.dispatchEvent(new Event("storage"));
  
  return fullMessage;
}

// ----------------------------------------------------
// TYPING INDICATOR & PRESENCE SERVICES
// ----------------------------------------------------

export async function setTypingStatus(chatId: string, userId: string, isTyping: boolean): Promise<void> {
  if (!chatId || !userId) return;
  if (useFirebase && db) {
    try {
      const typingDocRef = doc(db, "chats", chatId, "typing", userId);
      await setDoc(typingDocRef, {
        isTyping,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.warn("Failed to set typing status in Firestore:", err);
    }
  }
  try {
    const key = `autoparts_typing_${chatId}_${userId}`;
    localStorage.setItem(key, JSON.stringify({ isTyping, updatedAt: Date.now() }));
    window.dispatchEvent(new CustomEvent("autoparts_typing_changed", { detail: { chatId, userId, isTyping } }));
  } catch (e) {}
}

export function subscribeToTypingStatus(
  chatId: string,
  partnerUserId: string,
  callback: (isTyping: boolean) => void
): () => void {
  if (!chatId || !partnerUserId) {
    callback(false);
    return () => {};
  }

  if (useFirebase && db) {
    try {
      const typingDocRef = doc(db, "chats", chatId, "typing", partnerUserId);
      const unsub = onSnapshot(typingDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isFresh = Date.now() - (data.updatedAt || 0) < 6000;
          callback(!!data.isTyping && isFresh);
        } else {
          callback(false);
        }
      }, () => {
        callback(false);
      });
      return unsub;
    } catch (e) {}
  }

  const handleCustomEvent = (e: any) => {
    if (e.detail && e.detail.chatId === chatId && e.detail.userId === partnerUserId) {
      callback(!!e.detail.isTyping);
    }
  };

  window.addEventListener("autoparts_typing_changed", handleCustomEvent);
  return () => {
    window.removeEventListener("autoparts_typing_changed", handleCustomEvent);
  };
}

export async function setUserPresence(userId: string, isOnline: boolean): Promise<void> {
  if (!userId) return;
  const payload = { online: isOnline, lastSeen: Date.now() };

  if (useFirebase && db) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, payload, { merge: true });
    } catch (err) {
      console.warn("Failed to set user presence in Firestore:", err);
    }
  }

  try {
    localStorage.setItem(`autoparts_presence_${userId}`, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("autoparts_presence_changed", { detail: { userId, ...payload } }));
  } catch (e) {}
}

export function subscribeToUserPresence(
  userId: string,
  callback: (presence: { online: boolean; lastSeen: number }) => void
): () => void {
  if (!userId) {
    callback({ online: false, lastSeen: Date.now() });
    return () => {};
  }

  if (useFirebase && db) {
    try {
      const userRef = doc(db, "users", userId);
      const unsub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          callback({
            online: !!data.online,
            lastSeen: data.lastSeen || Date.now()
          });
        } else {
          callback({ online: false, lastSeen: Date.now() });
        }
      }, () => {
        callback({ online: false, lastSeen: Date.now() });
      });
      return unsub;
    } catch (e) {}
  }

  const checkLocal = () => {
    try {
      const raw = localStorage.getItem(`autoparts_presence_${userId}`);
      if (raw) {
        callback(JSON.parse(raw));
      } else {
        callback({ online: false, lastSeen: Date.now() });
      }
    } catch (e) {
      callback({ online: false, lastSeen: Date.now() });
    }
  };

  checkLocal();
  const handleCustomEvent = (e: any) => {
    if (e.detail && e.detail.userId === userId) {
      callback({ online: !!e.detail.online, lastSeen: e.detail.lastSeen || Date.now() });
    }
  };

  window.addEventListener("autoparts_presence_changed", handleCustomEvent);
  return () => {
    window.removeEventListener("autoparts_presence_changed", handleCustomEvent);
  };
}

export async function getOrCreateChat(part: SparePart, buyer: User): Promise<Chat> {
  const chatId = `${buyer.id}_${part.sellerId}_${part.id}`;
  
  if (useFirebase && db) {
    try {
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      if (chatDoc.exists()) {
        return { id: chatDoc.id, ...chatDoc.data() } as Chat;
      }
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
      } else {
        console.warn("Firestore getOrCreateChat check failed:", err);
      }
    }
  }

  // LocalStorage Mock check
  const localChatsRaw = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
  const chatsList: Chat[] = localChatsRaw ? JSON.parse(localChatsRaw) : [];
  const foundChat = chatsList.find((c) => c.id === chatId);
  
  if (foundChat) {
    return foundChat;
  }

  // Return non-existing metadata with computed ID. Sending a message will automatically persist it.
  return {
    id: chatId,
    partId: part.id,
    partTitle: part.title,
    partImageUrl: part.imageUrl,
    partPrice: part.price,
    buyerId: buyer.id,
    buyerName: buyer.name,
    sellerId: part.sellerId,
    sellerName: part.contactName,
    lastMessageText: "",
    lastMessageAt: Date.now()
  };
}

// ----------------------------------------------------
// SELLER RATING & REVIEWS SERVICES
// ----------------------------------------------------

export async function fetchSellerReviews(sellerId: string): Promise<SellerReview[]> {
  if (useFirebase && db) {
    try {
      const reviewsRef = collection(db, "seller_reviews");
      const q = query(reviewsRef, where("sellerId", "==", sellerId));
      const snapshot = await getDocs(q);
      
      const reviews: SellerReview[] = [];
      snapshot.forEach((docSnapshot) => {
        reviews.push({ id: docSnapshot.id, ...docSnapshot.data() } as SellerReview);
      });

      if (reviews.length > 0) {
        return reviews.sort((a, b) => b.createdAt - a.createdAt);
      }

      // If it's a demo seller and no reviews exist in Firestore, return initial sample reviews
      if (sellerId.startsWith("demo-seller-")) {
        return INITIAL_SELLER_REVIEWS.filter((r) => r.sellerId === sellerId);
      }

      return [];
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.LIST, "seller_reviews");
      } else {
        console.warn("Firestore reviews fetch error, falling back to LocalStorage", err);
      }
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
  if (localData) {
    const reviews: SellerReview[] = JSON.parse(localData);
    const filtered = reviews.filter((r) => r.sellerId === sellerId);
    if (filtered.length > 0) {
      return filtered.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  if (sellerId.startsWith("demo-seller-")) {
    return INITIAL_SELLER_REVIEWS.filter((r) => r.sellerId === sellerId);
  }

  return [];
}

export async function createSellerReview(review: Omit<SellerReview, "id" | "createdAt">): Promise<SellerReview> {
  if (review.sellerId.startsWith("demo-seller-")) {
    throw new Error("Reviews can only be submitted for live seller profiles.");
  }
  const newReview: SellerReview = {
    ...review,
    id: useFirebase ? "" : "local-rev-" + Math.random().toString(36).substr(2, 9),
    createdAt: Date.now()
  };

  if (useFirebase && db) {
    try {
      const reviewsRef = collection(db, "seller_reviews");
      const docRef = await addDoc(reviewsRef, newReview);
      newReview.id = docRef.id;
      return newReview;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, "seller_reviews");
      } else {
        console.warn("Firestore review save error, saving to LocalStorage fallback:", err);
      }
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(LOCAL_STORAGE_REVIEWS_KEY);
  const reviewsList: SellerReview[] = localData ? JSON.parse(localData) : [];
  if (!newReview.id) {
    newReview.id = "local-rev-" + Math.random().toString(36).substr(2, 9);
  }
  reviewsList.unshift(newReview);
  localStorage.setItem(LOCAL_STORAGE_REVIEWS_KEY, JSON.stringify(reviewsList));
  
  // Dispatch custom events to refresh real-time reviews
  window.dispatchEvent(new Event("autoparts_reviews_updated"));
  window.dispatchEvent(new Event("storage"));
  
  return newReview;
}

// ----------------------------------------------------
// NOTIFICATION SERVICES
// ----------------------------------------------------

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Listener] subscribeToUserNotifications requested for userId: "${userId}"`);

  if (useFirebase && auth && db) {
    let unsubNotifications: (() => void) | null = null;
    let isUnsubscribed = false;

    const startListener = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef, 
          where("recipientId", "==", authenticatedUid),
          where("read", "==", false)
        );

        console.log(`[Firestore Listener] Subscribing to unread notifications for recipientId == "${authenticatedUid}"`);
        unsubNotifications = onSnapshot(q, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received notifications update. Size: ${snapshot.size}`);
          const list: Notification[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Notification);
          });
          callback(list);
        }, (err) => {
          console.error(`[Firestore Listener Error] subscribeToUserNotifications failed:`, err);
          if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
            handleFirestoreError(err, OperationType.LIST, `notifications (recipientId == ${authenticatedUid})`);
          }
          if (onError) onError(err);
        });
      } catch (err: any) {
        console.error(`[Firestore Exception] subscribeToUserNotifications exception:`, err);
        if (onError) onError(err);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;
      if (firebaseUser) {
        if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
        startListener(firebaseUser.uid);
      } else {
        if (unsubNotifications) { unsubNotifications(); unsubNotifications = null; }
        callback([]);
      }
    });

    return () => {
      isUnsubscribed = true;
      unsubAuth();
      if (unsubNotifications) unsubNotifications();
    };
  }

  // LocalStorage Fallback
  console.log(`[LocalStorage Fallback] subscribeToUserNotifications for userId: "${userId}"`);
  const loadLocal = () => {
    try {
      const raw = localStorage.getItem("autoparts_notifications");
      if (raw) {
        const list: Notification[] = JSON.parse(raw);
        const filtered = list.filter(n => n.recipientId === userId && !n.read);
        callback(filtered);
      } else {
        callback([]);
      }
    } catch (e: any) {
      if (onError) onError(e);
      else callback([]);
    }
  };

  loadLocal();
  const handleUpdate = () => {
    loadLocal();
  };

  window.addEventListener("autoparts_notifications_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener("autoparts_notifications_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function markChatNotificationsAsRead(chatId: string, userId: string): Promise<void> {
  if (useFirebase && db) {
    const notificationId = `${chatId}_${userId}`;
    const path = `notifications/${notificationId}`;
    try {
      const notificationDocRef = doc(db, "notifications", notificationId);
      const docSnap = await getDoc(notificationDocRef);
      if (docSnap.exists()) {
        await updateDoc(notificationDocRef, { read: true });
        console.log(`[Firestore Notification] Marked notification ${notificationId} as read.`);
      }
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      } else {
        console.warn("Failed to mark notifications as read in Firestore:", err);
      }
    }
  }

  // LocalStorage Fallback
  const localNotificationsRaw = localStorage.getItem("autoparts_notifications");
  if (localNotificationsRaw) {
    try {
      const localNotifications: Notification[] = JSON.parse(localNotificationsRaw);
      const notificationId = `${chatId}_${userId}`;
      const updated = localNotifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
      localStorage.setItem("autoparts_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("autoparts_notifications_updated"));
    } catch (e) {
      console.warn("Failed to update local notifications as read:", e);
    }
  }
}

export async function markMessagesAsRead(chatId: string, currentUserId: string): Promise<void> {
  if (useFirebase && db) {
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, where("senderId", "!=", currentUserId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (data.status !== "read") {
          await updateDoc(docSnap.ref, { status: "read" });
        }
      });
      console.log(`[Firestore Messages] Marked incoming messages as read for chatId: ${chatId}`);
    } catch (err: any) {
      console.warn("Failed to mark messages as read in Firestore:", err);
    }
  }

  // LocalStorage Fallback
  try {
    const localMsgKey = `autoparts_chat_messages_${chatId}`;
    const localMsgRaw = localStorage.getItem(localMsgKey);
    if (localMsgRaw) {
      const messages: Message[] = JSON.parse(localMsgRaw);
      let updated = false;
      const nextMessages = messages.map(m => {
        if (m.senderId !== currentUserId && m.status !== "read") {
          updated = true;
          return { ...m, status: "read" as const };
        }
        return m;
      });
      if (updated) {
        localStorage.setItem(localMsgKey, JSON.stringify(nextMessages));
        window.dispatchEvent(new CustomEvent("autoparts_chat_updated", { detail: { chatId } }));
      }
    }
  } catch (err: any) {
    console.warn("Failed to mark local messages as read:", err);
  }
}

export async function markMessagesAsDelivered(chatId: string, currentUserId: string): Promise<void> {
  if (useFirebase && db) {
    try {
      const msgRef = collection(db, "chats", chatId, "messages");
      const q = query(msgRef, where("senderId", "!=", currentUserId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (!data.status || data.status === "sent") {
          await updateDoc(docSnap.ref, { status: "delivered" });
        }
      });
      console.log(`[Firestore Messages] Marked incoming messages as delivered for chatId: ${chatId}`);
    } catch (err: any) {
      console.warn("Failed to mark messages as delivered in Firestore:", err);
    }
  }

  // LocalStorage Fallback
  try {
    const localMsgKey = `autoparts_chat_messages_${chatId}`;
    const localMsgRaw = localStorage.getItem(localMsgKey);
    if (localMsgRaw) {
      const messages: Message[] = JSON.parse(localMsgRaw);
      let updated = false;
      const nextMessages = messages.map(m => {
        if (m.senderId !== currentUserId && (!m.status || m.status === "sent")) {
          updated = true;
          return { ...m, status: "delivered" as const };
        }
        return m;
      });
      if (updated) {
        localStorage.setItem(localMsgKey, JSON.stringify(nextMessages));
        window.dispatchEvent(new CustomEvent("autoparts_chat_updated", { detail: { chatId } }));
      }
    }
  } catch (err: any) {
    console.warn("Failed to mark local messages as delivered:", err);
  }
}

export function subscribeToUserFavorites(
  userId: string,
  callback: (favorites: string[]) => void,
  onError?: (err: Error) => void
): () => void {
  console.log(`[Firestore Listener] subscribeToUserFavorites requested for userId: "${userId}"`);

  if (useFirebase && auth && db) {
    let unsubFavorites: (() => void) | null = null;
    let isUnsubscribed = false;

    const startListener = (authenticatedUid: string) => {
      if (isUnsubscribed) return;
      try {
        const favoritesRef = collection(db, "favorites");
        const q = query(favoritesRef, where("userId", "==", authenticatedUid));

        console.log(`[Firestore Listener] Subscribing to favorites for userId == "${authenticatedUid}"`);
        unsubFavorites = onSnapshot(q, (snapshot) => {
          console.log(`[Firestore Listener Callback] Received favorites update. Size: ${snapshot.size}`);
          const list: string[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.partId) {
              list.push(data.partId);
            }
          });
          callback(list);
        }, (err) => {
          console.error(`[Firestore Listener Error] subscribeToUserFavorites failed:`, err);
          if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
            handleFirestoreError(err, OperationType.LIST, `favorites (userId == ${authenticatedUid})`);
          }
          if (onError) onError(err);
        });
      } catch (err: any) {
        console.error(`[Firestore Exception] subscribeToUserFavorites exception:`, err);
        if (onError) onError(err);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (isUnsubscribed) return;
      if (firebaseUser) {
        if (unsubFavorites) { unsubFavorites(); unsubFavorites = null; }
        startListener(firebaseUser.uid);
      } else {
        if (unsubFavorites) { unsubFavorites(); unsubFavorites = null; }
        callback([]);
      }
    });

    return () => {
      isUnsubscribed = true;
      unsubAuth();
      if (unsubFavorites) unsubFavorites();
    };
  }

  // LocalStorage Fallback
  console.log(`[LocalStorage Fallback] subscribeToUserFavorites for userId: "${userId}"`);
  const loadLocal = () => {
    try {
      const raw = localStorage.getItem(`autoparts_favorites_${userId}`);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        callback(list);
      } else {
        const sharedRaw = localStorage.getItem("autoparts_favorites");
        if (sharedRaw) {
          const list: string[] = JSON.parse(sharedRaw);
          callback(list);
        } else {
          callback([]);
        }
      }
    } catch (e: any) {
      if (onError) onError(e);
      else callback([]);
    }
  };

  loadLocal();
  const handleUpdate = () => {
    loadLocal();
  };

  window.addEventListener("autoparts_favorites_updated", handleUpdate);
  window.addEventListener("storage", handleUpdate);

  return () => {
    window.removeEventListener("autoparts_favorites_updated", handleUpdate);
    window.removeEventListener("storage", handleUpdate);
  };
}

export async function addFavorite(userId: string, partId: string): Promise<void> {
  const favoriteId = `${userId}_${partId}`;
  const path = `favorites/${favoriteId}`;
  console.log(`[Firestore Write] addFavorite requested for favoriteId: "${favoriteId}"`);

  if (useFirebase && db) {
    try {
      const docRef = doc(db, "favorites", favoriteId);
      await setDoc(docRef, {
        id: favoriteId,
        userId,
        partId,
        createdAt: Date.now()
      }, { merge: true });
      console.log(`[Firestore Favorite] Saved favorite ${favoriteId}`);
      return;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, path);
      } else {
        console.warn("Failed to add favorite in Firestore:", err);
      }
      throw err;
    }
  }

  // LocalStorage Fallback
  try {
    const localKey = `autoparts_favorites_${userId}`;
    const raw = localStorage.getItem(localKey) || localStorage.getItem("autoparts_favorites");
    let list: string[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch (e) {}
    }
    if (!list.includes(partId)) {
      list.push(partId);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
    localStorage.setItem("autoparts_favorites", JSON.stringify(list));
    window.dispatchEvent(new Event("autoparts_favorites_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (err: any) {
    console.error("[LocalStorage Error] Failed to add favorite:", err);
  }
}

export async function removeFavorite(userId: string, partId: string): Promise<void> {
  const favoriteId = `${userId}_${partId}`;
  const path = `favorites/${favoriteId}`;
  console.log(`[Firestore Delete] removeFavorite requested for favoriteId: "${favoriteId}"`);

  if (useFirebase && db) {
    try {
      const docRef = doc(db, "favorites", favoriteId);
      await deleteDoc(docRef);
      console.log(`[Firestore Favorite] Removed favorite ${favoriteId}`);
      return;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.DELETE, path);
      } else {
        console.warn("Failed to remove favorite in Firestore:", err);
      }
      throw err;
    }
  }

  // LocalStorage Fallback
  try {
    const localKey = `autoparts_favorites_${userId}`;
    const raw = localStorage.getItem(localKey) || localStorage.getItem("autoparts_favorites");
    let list: string[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch (e) {}
    }
    list = list.filter(id => id !== partId);
    localStorage.setItem(localKey, JSON.stringify(list));
    localStorage.setItem("autoparts_favorites", JSON.stringify(list));
    window.dispatchEvent(new Event("autoparts_favorites_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (err: any) {
    console.error("[LocalStorage Error] Failed to remove favorite:", err);
  }
}

// ----------------------------------------------------
// SUPER ADMIN MANAGEMENT SERVICES
// ----------------------------------------------------

export async function fetchAllUsers(): Promise<User[]> {
  if (useFirebase && db) {
    const path = "users";
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const list: User[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          ...data,
          id: d.id,
        } as User);
      });
      return list;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.GET, path);
      } else {
        console.warn("Firestore fetchAllUsers failed:", err);
      }
    }
  }

  // LocalStorage Fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export async function toggleUserBlockStatus(userId: string, currentStatus: boolean): Promise<boolean> {
  const nextStatus = !currentStatus;
  if (useFirebase && db) {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, { isBlocked: nextStatus }, { merge: true });
      return true;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, path);
      } else {
        console.warn("Firestore toggleUserBlockStatus failed:", err);
      }
      throw err;
    }
  }

  // LocalStorage Fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    const list: User[] = JSON.parse(raw);
    const updated = list.map((u) => {
      if (u.id === userId) {
        return { ...u, isBlocked: nextStatus };
      }
      return u;
    });
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));

    // Also update current user if we blocked ourselves
    const currentRaw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (currentRaw) {
      const current = JSON.parse(currentRaw);
      if (current.id === userId) {
        current.isBlocked = nextStatus;
        localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(current));
        dispatchAuthChange();
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

export interface FullTaxonomyConfig {
  categories: string[];
  categoryImages: Record<string, string>;
  subcategories: Record<string, string[]>;
  brands: Record<string, string[]>;
  brandLogos: Record<string, string>;
  variants: Record<string, string[]>;
  states: string[];
  districts: Record<string, string[]>;
  cities: Record<string, string[]>;
  locations: string[];
}

export async function fetchFullTaxonomyConfig(): Promise<FullTaxonomyConfig> {
  let categories: string[] = [];
  let categoryImages: Record<string, string> = {};
  let subcategories: Record<string, string[]> = {};
  let brands: Record<string, string[]> = {};
  let brandLogos: Record<string, string> = {};
  let variants: Record<string, string[]> = {};
  let states: string[] = [];
  let districts: Record<string, string[]> = {};
  let cities: Record<string, string[]> = {};
  let locations: string[] = [];

  if (useFirebase && db) {
    try {
      const [
        catSnap, catImgSnap, subSnap, brandSnap, brandImgSnap,
        varSnap, stateSnap, distSnap, citySnap, locSnap
      ] = await Promise.all([
        getDoc(doc(db, "config", "categories")),
        getDoc(doc(db, "config", "category_images")),
        getDoc(doc(db, "config", "subcategories")),
        getDoc(doc(db, "config", "brands")),
        getDoc(doc(db, "config", "brand_images")),
        getDoc(doc(db, "config", "variants")),
        getDoc(doc(db, "config", "states")),
        getDoc(doc(db, "config", "districts")),
        getDoc(doc(db, "config", "cities")),
        getDoc(doc(db, "config", "locations"))
      ]);

      if (catSnap.exists()) categories = catSnap.data().list || [];
      if (catImgSnap.exists()) categoryImages = catImgSnap.data().map || {};
      if (subSnap.exists()) subcategories = subSnap.data().map || {};
      if (brandSnap.exists()) brands = brandSnap.data().map || {};
      if (brandImgSnap.exists()) brandLogos = brandImgSnap.data().map || {};
      if (varSnap.exists()) variants = varSnap.data().map || {};
      if (stateSnap.exists()) states = stateSnap.data().list || [];
      if (distSnap.exists()) districts = distSnap.data().map || {};
      if (citySnap.exists()) cities = citySnap.data().map || {};
      if (locSnap.exists()) locations = locSnap.data().list || [];
    } catch (e) {
      console.warn("Firestore fetchFullTaxonomyConfig failed:", e);
    }
  } else {
    try {
      categories = JSON.parse(localStorage.getItem("config_categories") || "[]");
      categoryImages = JSON.parse(localStorage.getItem("config_category_images") || "{}");
      subcategories = JSON.parse(localStorage.getItem("config_subcategories") || "{}");
      brands = JSON.parse(localStorage.getItem("config_brands") || "{}");
      brandLogos = JSON.parse(localStorage.getItem("config_brand_images") || "{}");
      variants = JSON.parse(localStorage.getItem("config_variants") || "{}");
      states = JSON.parse(localStorage.getItem("config_states") || "[]");
      districts = JSON.parse(localStorage.getItem("config_districts") || "{}");
      cities = JSON.parse(localStorage.getItem("config_cities") || "{}");
      locations = JSON.parse(localStorage.getItem("config_locations") || "[]");
    } catch (e) {
      console.warn("LocalStorage taxonomy read failed:", e);
    }
  }

  // Merge with complete default catalog taxonomies to ensure no missing categories, subcategories, brands, models, variants or locations
  if (!categories || categories.length === 0) {
    categories = [...CAR_PART_CATEGORIES];
  } else {
    for (const c of CAR_PART_CATEGORIES) {
      if (!categories.includes(c)) categories.push(c);
    }
  }

  if (!subcategories || Object.keys(subcategories).length === 0) {
    subcategories = { ...CAR_SPARE_PARTS_BY_CATEGORY };
  } else {
    for (const [cat, parts] of Object.entries(CAR_SPARE_PARTS_BY_CATEGORY)) {
      if (!subcategories[cat]) {
        subcategories[cat] = [...parts];
      } else {
        for (const p of parts) {
          if (!subcategories[cat].includes(p)) subcategories[cat].push(p);
        }
      }
    }
  }

  if (!brands || Object.keys(brands).length === 0) {
    brands = { ...INDIAN_CAR_BRANDS };
  } else {
    for (const [bName, models] of Object.entries(INDIAN_CAR_BRANDS)) {
      if (!brands[bName]) {
        brands[bName] = [...models];
      } else {
        for (const m of models) {
          if (!brands[bName].includes(m)) brands[bName].push(m);
        }
      }
    }
  }

  if (!variants || Object.keys(variants).length === 0) {
    variants = { ...DEFAULT_MODEL_VARIANTS };
  } else {
    for (const [mName, vars] of Object.entries(DEFAULT_MODEL_VARIANTS)) {
      if (!variants[mName]) {
        variants[mName] = [...vars];
      } else {
        for (const v of vars) {
          if (!variants[mName].includes(v)) variants[mName].push(v);
        }
      }
    }
  }

  if (!states || states.length === 0) {
    states = INDIAN_STATES_AND_DISTRICTS.map(s => s.state);
  } else {
    for (const s of INDIAN_STATES_AND_DISTRICTS) {
      if (!states.includes(s.state)) states.push(s.state);
    }
  }

  if (!districts || Object.keys(districts).length === 0) {
    districts = INDIAN_STATES_AND_DISTRICTS.reduce((acc, s) => ({ ...acc, [s.state]: s.districts }), {});
  } else {
    for (const s of INDIAN_STATES_AND_DISTRICTS) {
      if (!districts[s.state]) {
        districts[s.state] = [...s.districts];
      } else {
        for (const d of s.districts) {
          if (!districts[s.state].includes(d)) districts[s.state].push(d);
        }
      }
    }
  }

  if (!locations || locations.length === 0) {
    locations = [...POPULAR_LOCATIONS];
  } else {
    for (const l of POPULAR_LOCATIONS) {
      if (!locations.includes(l)) locations.push(l);
    }
  }

  // Auto-persist merged taxonomy back to Firestore config collection if active
  if (useFirebase && db) {
    try {
      saveTaxonomyDoc("categories", { list: categories }).catch(() => {});
      saveTaxonomyDoc("subcategories", { map: subcategories }).catch(() => {});
      saveTaxonomyDoc("brands", { map: brands }).catch(() => {});
      saveTaxonomyDoc("variants", { map: variants }).catch(() => {});
      saveTaxonomyDoc("states", { list: states }).catch(() => {});
      saveTaxonomyDoc("districts", { map: districts }).catch(() => {});
      saveTaxonomyDoc("locations", { list: locations }).catch(() => {});
    } catch (e) {
      console.warn("Auto-persist taxonomy failed:", e);
    }
  }

  return {
    categories,
    categoryImages,
    subcategories,
    brands,
    brandLogos,
    variants,
    states,
    districts,
    cities,
    locations
  };
}

export async function saveTaxonomyDoc(docName: string, data: any): Promise<boolean> {
  if (useFirebase && db) {
    try {
      const docRef = doc(db, "config", docName);
      await setDoc(docRef, data);
    } catch (err: any) {
      console.warn(`Firestore saveTaxonomyDoc failed for ${docName}:`, err);
      throw err;
    }
  }

  try {
    if (data.list !== undefined) {
      localStorage.setItem(`config_${docName}`, JSON.stringify(data.list));
    } else if (data.map !== undefined) {
      localStorage.setItem(`config_${docName}`, JSON.stringify(data.map));
    }
  } catch (e) {
    console.warn("LocalStorage save error:", e);
  }

  window.dispatchEvent(new Event("config_updated"));
  return true;
}

export async function fetchMetadataConfig(): Promise<{
  categories: string[];
  brands: Record<string, string[]>;
  locations: string[];
  subcategories: Record<string, string[]>;
  categoryImages: Record<string, string>;
  brandLogos: Record<string, string>;
  variants: Record<string, string[]>;
  states: string[];
  districts: Record<string, string[]>;
  cities: Record<string, string[]>;
}> {
  const full = await fetchFullTaxonomyConfig();
  return {
    categories: full.categories,
    brands: full.brands,
    locations: full.locations,
    subcategories: full.subcategories,
    categoryImages: full.categoryImages,
    brandLogos: full.brandLogos,
    variants: full.variants,
    states: full.states,
    districts: full.districts,
    cities: full.cities
  };
}

export async function saveMetadataConfig(type: string, data: any): Promise<void> {
  await saveTaxonomyDoc(type, data);
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  if (useFirebase && db) {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
      return true;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.DELETE, path);
      } else {
        console.warn("Firestore deleteUserAccount failed:", err);
      }
      throw err;
    }
  }

  // LocalStorage Fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    const list: User[] = JSON.parse(raw);
    const updated = list.filter((u) => u.id !== userId);
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    return false;
  }
}

export async function updateAdminUserProfile(userId: string, updates: Partial<User>): Promise<boolean> {
  if (useFirebase && db) {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, updates, { merge: true });
      return true;
    } catch (err: any) {
      if (err?.code === "permission-denied" || err?.message?.includes("permission") || err?.message?.includes("Missing or insufficient permissions")) {
        handleFirestoreError(err, OperationType.WRITE, path);
      } else {
        console.warn("Firestore updateAdminUserProfile failed:", err);
      }
      throw err;
    }
  }

  // LocalStorage Fallback
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  try {
    const list: User[] = JSON.parse(raw);
    const updated = list.map((u) => {
      if (u.id === userId) {
        return { ...u, ...updates };
      }
      return u;
    });
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    return false;
  }
}

export interface AnnouncementItem {
  id: string;
  title: string;
  text: string;
  createdAt: number;
}

export async function fetchAnnouncementsHistory(): Promise<AnnouncementItem[]> {
  if (useFirebase && db) {
    try {
      const annRef = collection(db, "announcements");
      const q = query(annRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: AnnouncementItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || "",
          text: data.text || "",
          createdAt: data.createdAt || Date.now()
        });
      });
      return list;
    } catch (e) {
      console.warn("Firestore fetchAnnouncementsHistory failed:", e);
    }
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  try {
    const anns = JSON.parse(rawAnn);
    return anns.map((a: any, idx: number) => ({
      id: a.id || `local_ann_${idx}_${a.createdAt || Date.now()}`,
      title: a.title || "",
      text: a.text || "",
      createdAt: a.createdAt || Date.now()
    }));
  } catch (e) {
    return [];
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<boolean> {
  if (useFirebase && db) {
    try {
      const docRef = doc(db, "announcements", announcementId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.warn("Firestore deleteAnnouncement failed:", e);
      throw e;
    }
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  try {
    let anns = JSON.parse(rawAnn);
    anns = anns.filter((a: any) => a.id !== announcementId);
    localStorage.setItem("announcements", JSON.stringify(anns));
    return true;
  } catch (e) {
    return false;
  }
}

export async function updateAnnouncement(announcementId: string, title: string, text: string): Promise<boolean> {
  if (useFirebase && db) {
    try {
      const docRef = doc(db, "announcements", announcementId);
      await setDoc(docRef, { title, text }, { merge: true });
      return true;
    } catch (e) {
      console.warn("Firestore updateAnnouncement failed:", e);
      throw e;
    }
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  try {
    let anns = JSON.parse(rawAnn);
    anns = anns.map((a: any) => {
      if (a.id === announcementId) {
        return { ...a, title, text };
      }
      return a;
    });
    localStorage.setItem("announcements", JSON.stringify(anns));
    return true;
  } catch (e) {
    return false;
  }
}

export async function sendAnnouncement(title: string, text: string): Promise<void> {
  if (useFirebase && db) {
    try {
      // 1. Save announcement in "announcements" collection
      const annRef = collection(db, "announcements");
      const docRef = await addDoc(annRef, {
        title,
        text,
        createdAt: Date.now()
      });

      // 2. Send in-app notification to all registered users
      const users = await fetchAllUsers();
      for (const u of users) {
        const notifId = `announcement_${Date.now()}_${u.id}`;
        const notifRef = doc(db, "notifications", notifId);
        await setDoc(notifRef, {
          id: notifId,
          chatId: "announcement",
          recipientId: u.id,
          senderId: "admin",
          text: `[ANNOUNCEMENT] ${title}: ${text}`,
          createdAt: Date.now(),
          read: false,
          partTitle: "System Announcement",
          partPrice: 0,
          partImageUrl: "",
          buyerId: u.id,
          buyerName: u.name,
          sellerId: "admin",
          sellerName: "System Administrator"
        });
      }
    } catch (e) {
      console.warn("Firestore sendAnnouncement failed:", e);
      throw e;
    }
    return;
  }

  // LocalStorage Fallback
  const rawAnn = localStorage.getItem("announcements") || "[]";
  const anns = JSON.parse(rawAnn);
  const newAnn = { id: `ann_${Date.now()}`, title, text, createdAt: Date.now() };
  anns.unshift(newAnn);
  localStorage.setItem("announcements", JSON.stringify(anns));

  const rawUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY) || "[]";
  const usersList: User[] = JSON.parse(rawUsers);
  const localNotifsRaw = localStorage.getItem("autoparts_notifications") || "[]";
  const localNotifs = JSON.parse(localNotifsRaw);

  for (const u of usersList) {
    localNotifs.unshift({
      id: `announcement_${Date.now()}_${u.id}`,
      chatId: "announcement",
      recipientId: u.id,
      senderId: "admin",
      text: `[ANNOUNCEMENT] ${title}: ${text}`,
      createdAt: Date.now(),
      read: false,
      partTitle: "System Announcement",
      partPrice: 0,
      partImageUrl: "",
      buyerId: u.id,
      buyerName: u.name,
      sellerId: "admin",
      sellerName: "System Administrator"
    });
  }
  localStorage.setItem("autoparts_notifications", JSON.stringify(localNotifs));
  window.dispatchEvent(new Event("autoparts_notifications_updated"));
  window.dispatchEvent(new Event("storage"));
}

export const DEFAULT_APP_VERSION_CONFIG: AppVersionConfig = {
  latestVersion: "1.0.0",
  minimumSupportedVersion: "1.0.0",
  forceUpdate: false,
  apkDownloadUrl: "https://github.com/autoparts/app/releases/download/v1.1.0/AutoParts-v1.1.0.apk",
  releaseNotes: "• Performance optimizations and faster listing loads\n• Enhanced state & district search filters across India\n• Improved buyer-seller direct messaging and call security\n• General stability improvements and bug fixes",
  releaseDate: "2026-07-22"
};

export async function fetchAppVersionConfig(): Promise<AppVersionConfig> {
  if (db) {
    try {
      const docRef = doc(db, "app_config", "version");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as AppVersionConfig;
        return {
          latestVersion: data.latestVersion || "1.0.0",
          minimumSupportedVersion: data.minimumSupportedVersion || "1.0.0",
          forceUpdate: typeof data.forceUpdate === "boolean" ? data.forceUpdate : false,
          apkDownloadUrl: data.apkDownloadUrl || DEFAULT_APP_VERSION_CONFIG.apkDownloadUrl,
          releaseNotes: data.releaseNotes || DEFAULT_APP_VERSION_CONFIG.releaseNotes,
          releaseDate: data.releaseDate || DEFAULT_APP_VERSION_CONFIG.releaseDate
        };
      } else {
        // Seed initial version configuration document in Firestore
        try {
          await setDoc(docRef, DEFAULT_APP_VERSION_CONFIG);
        } catch (e) {
          console.warn("Could not seed app_config/version document in Firestore:", e);
        }
        return DEFAULT_APP_VERSION_CONFIG;
      }
    } catch (e) {
      console.warn("Firestore fetchAppVersionConfig failed, returning fallback:", e);
      return DEFAULT_APP_VERSION_CONFIG;
    }
  }

  // Fallback to LocalStorage
  const saved = localStorage.getItem("app_version_config");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  return DEFAULT_APP_VERSION_CONFIG;
}

export async function updateAppVersionConfig(config: AppVersionConfig): Promise<boolean> {
  if (db) {
    try {
      const docRef = doc(db, "app_config", "version");
      await setDoc(docRef, config, { merge: true });
      localStorage.setItem("app_version_config", JSON.stringify(config));
      return true;
    } catch (e) {
      console.error("Firestore updateAppVersionConfig failed:", e);
      throw e;
    }
  }

  localStorage.setItem("app_version_config", JSON.stringify(config));
  return true;
}



