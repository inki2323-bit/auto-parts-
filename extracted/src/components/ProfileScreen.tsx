import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  LogOut, 
  Trash2, 
  Heart, 
  Tag, 
  Grid, 
  MapPin, 
  ChevronRight, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  MessageSquare, 
  HelpCircle,
  Lock,
  ArrowLeft,
  ExternalLink,
  Settings,
  ShieldCheck,
  Star,
  Compass,
  Database,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Download,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { User, SparePart, AppVersionConfig } from "../types";
import BrandLogo from "./BrandLogo";
import { 
  signOut, 
  deleteSparePartListing, 
  updateSparePartListing,
  fetchSellerReviews,
  fetchAppVersionConfig
} from "../lib/firebase";
import { CURRENT_APP_VERSION, compareVersions } from "../utils/versionUtils";
import EditListingModal from "./EditListingModal";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import MapLocationModal from "./MapLocationModal";

interface ProfileScreenProps {
  currentUser: User;
  onLogout: (message?: string) => void;
  parts: SparePart[];
  favorites: string[];
  onPartDeleted: (partId: string) => void;
  onFavoriteToggle?: (partId: string) => void;
  onViewPart?: (part: SparePart) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onToggleSold?: (partId: string) => void;
  onUpdatePrice?: (partId: string, newPrice: number) => void;
  activeTab?: string;
  onTabChange?: (tab: "home" | "chats" | "sell" | "myads" | "account") => void;
  onOpenAdminDashboard?: () => void;
}

type SubScreen = "menu" | "personal_info" | "my_listings" | "saved" | "privacy" | "support" | "about" | "my_reviews" | "app_update";

export default function ProfileScreen({ 
  currentUser, 
  onLogout, 
  parts, 
  favorites, 
  onPartDeleted,
  onFavoriteToggle,
  onViewPart,
  onUpdateUser,
  onToggleSold,
  onUpdatePrice,
  activeTab,
  onTabChange,
  onOpenAdminDashboard
}: ProfileScreenProps) {
  const [activeSubScreen, setActiveSubScreen] = useState<SubScreen>(
    activeTab === "myads" ? "my_listings" : "menu"
  );

  useEffect(() => {
    if (activeTab === "myads") {
      setActiveSubScreen("my_listings");
    } else if (activeTab === "account") {
      if (activeSubScreen === "my_listings") {
        setActiveSubScreen("menu");
      }
    }
  }, [activeTab]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [myAdsTab, setMyAdsTab] = useState<"active" | "sold" | "expired">("active");
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);

  // Personal Info Form State
  const [editName, setEditName] = useState(currentUser.name || "");
  const [editPhone, setEditPhone] = useState(currentUser.phone || "");
  const [editState, setEditState] = useState(currentUser.state || "");
  const [editDistrict, setEditDistrict] = useState(currentUser.district || "");
  const [editLat, setEditLat] = useState<number | undefined>(currentUser.lat);
  const [editLng, setEditLng] = useState<number | undefined>(currentUser.lng);
  const [showMapModal, setShowMapModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Privacy confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Seller ratings and reviews for logged-in user
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [userRating, setUserRating] = useState<{ average: number; count: number } | null>(null);

  // App Update System state
  const [appVersionConfig, setAppVersionConfig] = useState<AppVersionConfig | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(() => localStorage.getItem("app_version_last_checked") || null);
  const [versionStatusMessage, setVersionStatusMessage] = useState<string | null>(null);

  const handleCheckForUpdates = async () => {
    setCheckingVersion(true);
    setVersionStatusMessage(null);
    try {
      const config = await fetchAppVersionConfig();
      setAppVersionConfig(config);
      const nowStr = new Date().toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      setLastChecked(nowStr);
      localStorage.setItem("app_version_last_checked", nowStr);

      const comp = compareVersions(CURRENT_APP_VERSION, config.latestVersion);
      if (comp >= 0) {
        setVersionStatusMessage("You're using the latest version.");
      } else {
        setVersionStatusMessage(`New update v${config.latestVersion} is available!`);
      }
    } catch (e) {
      console.error("Error checking for app updates:", e);
      setVersionStatusMessage("Unable to check for updates right now. Please try again later.");
    } finally {
      setCheckingVersion(false);
    }
  };

  useEffect(() => {
    const loadUserRating = async () => {
      try {
        const data = await fetchSellerReviews(currentUser.id);
        setUserReviews(data);
        const count = data.length;
        const average = count > 0 
          ? parseFloat((data.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
          : 0;
        setUserRating({ average, count });
      } catch (err) {
        console.error("Failed to load user ratings in profile screen", err);
      }
    };
    loadUserRating();
    window.addEventListener("autoparts_reviews_updated", loadUserRating);
    window.addEventListener("storage", loadUserRating);
    return () => {
      window.removeEventListener("autoparts_reviews_updated", loadUserRating);
      window.removeEventListener("storage", loadUserRating);
    };
  }, [currentUser.id]);

  // Sync edits when currentUser changes
  useEffect(() => {
    setEditName(currentUser.name || "");
    setEditPhone(currentUser.phone || "");
    setEditState(currentUser.state || "");
    setEditDistrict(currentUser.district || "");
    setEditLat(currentUser.lat);
    setEditLng(currentUser.lng);
  }, [currentUser]);

  // Filter listings
  const myParts = parts.filter(p => p.sellerId === currentUser.id);
  const favParts = parts.filter(p => favorites.includes(p.id));

  // Cascading Location Helpers for Editing Profile Default Location
  const availableDistricts = editState 
    ? INDIAN_STATES_AND_DISTRICTS.find(s => s.state === editState)?.districts || [] 
    : [];

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      onLogout("Logged out successfully. Select a Google account to sign in.");
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    setIsDeletingId(id);
    setDeleteError(null);
    try {
      const ok = await deleteSparePartListing(id);
      if (ok) {
        onPartDeleted(id);
      }
    } catch (e: any) {
      console.error("Delete failed", e);
      setDeleteError(e.message || String(e));
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      await updateSparePartListing(partId, updates);
    } catch (e) {
      console.error("Save listing changes failed:", e);
    }
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    if (onUpdateUser) {
      onUpdateUser({
        ...currentUser,
        name: editName,
        phone: editPhone,
        state: editState,
        district: editDistrict,
        lat: editLat,
        lng: editLng
      });
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveSubScreen("menu");
    }, 1500);
  };

  const handleDeleteAccountConfirm = async () => {
    // Perform simulated account deletion
    try {
      // 1. Delete all user listings
      for (const part of myParts) {
        await deleteSparePartListing(part.id);
        onPartDeleted(part.id);
      }
      
      // 2. Erase from localStorage
      const usersRaw = localStorage.getItem("autoparts_users");
      if (usersRaw) {
        const users: any[] = JSON.parse(usersRaw);
        const remainingUsers = users.filter(u => u.id !== currentUser.id);
        localStorage.setItem("autoparts_users", JSON.stringify(remainingUsers));
      }

      // 3. Clear session and log out
      await signOut();
      onLogout("Account deleted and signed out successfully.");
    } catch (err) {
      console.error("Error deleting account", err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 overflow-y-auto h-full" id="profile-screen-container">
      
      {/* 1. MAIN OPTIONS MENU SCREEN */}
      {activeSubScreen === "menu" && (
        <div className="flex-1 flex flex-col animate-fade-in" id="profile-main-menu">
          {/* Top Banner Cover */}
          <div className="bg-[#0B1220] text-white px-4 pt-4 pb-4 relative shadow-md border-b border-[#18233C]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-[#2563EB] via-[#1D4ED8] to-[#1E3A8A] rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md border border-blue-400/30 uppercase shrink-0">
                {currentUser.name ? currentUser.name.substring(0, 2) : "ME"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold tracking-tight leading-tight flex items-center gap-1 flex-wrap">
                  <span className="truncate max-w-[140px]">{currentUser.name || "Auto Parts Seller"}</span>
                  <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-[8px] uppercase tracking-wider font-extrabold border border-emerald-500/30 shrink-0 flex items-center gap-0.5">
                    <ShieldCheck size={10} /> Verified
                  </span>
                </h2>

                {userRating && (
                  <button 
                    onClick={() => setActiveSubScreen("my_reviews")}
                    className="flex items-center gap-1 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-full text-[9px] text-amber-300 font-extrabold mt-1 transition-all cursor-pointer shadow-xs"
                    id="profile-view-ratings-btn"
                  >
                    <Star size={10} className="fill-current text-amber-400" />
                    {userRating.count > 0 ? `${userRating.average} (${userRating.count} Reviews)` : "No ratings yet"}
                  </button>
                )}
                {(currentUser.phone || editPhone) && (
                  <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5 font-mono">
                    <Phone size={10} className="text-slate-400 shrink-0" />
                    {currentUser.phone || editPhone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Account Options Navigation List */}
          <div className="p-3 space-y-2.5 max-w-2xl mx-auto w-full pb-20">
            <h3 className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">
              Account Settings
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(11,18,32,0.04)] overflow-hidden divide-y divide-slate-100">
              
              {/* Super Admin Control Center */}
              {(currentUser.email === "wwwautoparts2@gmail.com" || currentUser.email === "ym1950394@gmail.com" || currentUser.isSuperAdmin || currentUser.isAdmin || currentUser.role === "admin") && onOpenAdminDashboard && (
                <button
                  onClick={onOpenAdminDashboard}
                  className="w-full flex items-center justify-between p-4 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left cursor-pointer"
                  id="menu-opt-admin-dashboard"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="p-2.5 bg-amber-100 text-amber-600 rounded-xl animate-pulse">
                      <ShieldAlert size={18} />
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        Super Admin Panel
                        <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      </h4>
                      <p className="text-[10px] text-amber-700 mt-0.5 font-bold">Manage Users, Listings, Categories & Announcements</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-500" />
                </button>
              )}

              {/* Personal Information Option */}
              <button
                onClick={() => setActiveSubScreen("personal_info")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-personal-info"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-[#2563EB]/10 text-[#2563EB] rounded-2xl">
                    <UserIcon size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Personal Information</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Edit Name, Contact Number & Default Location</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* My Listings Option */}
              <button
                onClick={() => {
                  if (onTabChange) {
                    onTabChange("myads");
                  } else {
                    setActiveSubScreen("my_listings");
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-my-listings"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Tag size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">My Listings / My Ads</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage uploaded spare parts & Mark as Sold</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                    {myParts.length}
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

              {/* My Seller Reviews Option */}
              <button
                onClick={() => setActiveSubScreen("my_reviews")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-my-reviews"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl">
                    <Star size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">My Seller Ratings / Reviews</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">View comments and 1-5 star ratings from buyers</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {userRating && userRating.count > 0 ? (
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono flex items-center gap-0.5 shadow-xs">
                      {userRating.average} <Star size={9} fill="currentColor" />
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">0 Reviews</span>
                  )}
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

              {/* Saved Option */}
              <button
                onClick={() => setActiveSubScreen("saved")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-favorites"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-rose-50 text-rose-500 rounded-2xl">
                    <Heart size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Saved / Favorites</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Your bookmarked automobile spare parts</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
                    {favParts.length}
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

              {/* Privacy Option */}
              <button
                onClick={() => setActiveSubScreen("privacy")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-privacy"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Lock size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Privacy & Security</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage data guidelines and delete account</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* Help & Support Option */}
              <button
                onClick={() => setActiveSubScreen("support")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-support"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
                    <HelpCircle size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Help & Support</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Get direct help, support emails & FAQs</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* About Option */}
              <button
                onClick={() => setActiveSubScreen("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                id="menu-opt-about"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl">
                    <Info size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">About Auto Parts</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">App details and version v{CURRENT_APP_VERSION}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              {/* Check for Updates Option */}
              <button
                onClick={() => {
                  setActiveSubScreen("app_update");
                  handleCheckForUpdates();
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer border-t border-slate-100"
                id="menu-opt-check-updates"
              >
                <div className="flex items-center gap-3.5">
                  <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Check for Updates</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">App version check & release notes</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-mono">
                    v{CURRENT_APP_VERSION}
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </button>

            </div>

            {/* Logout Action Area */}
            <div className="pt-4">
              <button
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100/80 text-rose-600 font-extrabold py-3.5 rounded-2xl text-xs transition-all active:scale-[0.98] border border-rose-200/80 cursor-pointer disabled:opacity-50 shadow-xs"
                id="btn-logout-main"
              >
                <LogOut size={16} />
                {isLoggingOut ? "Signing Out..." : "Log Out Account"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 2. PERSONAL INFORMATION EDIT SCREEN */}
      {activeSubScreen === "personal_info" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-white" id="profile-sub-personal-info">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-personal-info"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Personal Information</h2>
          </div>

          <form onSubmit={handleSaveChanges} className="p-5 space-y-4">
            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-bounce">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                Profile changes updated successfully!
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block" htmlFor="edit-name">FULL NAME</label>
              <div className="relative">
                <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-bold"
                  required
                  placeholder="Enter full name"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block" htmlFor="edit-phone">CONTACT NUMBER</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  id="edit-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                  placeholder="e.g. +91 98765 XXXXX"
                />
              </div>
            </div>

            {/* Location (Cascading Indian states & districts dropdown) */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Default Location (Cascading Selector)
              </span>

              <div className="grid grid-cols-2 gap-3.5">
                {/* State Select */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 block">STATE</span>
                  <div className="relative">
                    <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <select
                      value={editState}
                      onChange={(e) => {
                        setEditState(e.target.value);
                        setEditDistrict(""); // Reset district
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-7 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-bold appearance-none cursor-pointer"
                      id="edit-state-picker"
                    >
                      <option value="">Choose State</option>
                      {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                        <option key={s.state} value={s.state}>{s.state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* District Select */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 block">DISTRICT</span>
                  <div className="relative">
                    <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                    <select
                      value={editDistrict}
                      disabled={!editState}
                      onChange={(e) => setEditDistrict(e.target.value)}
                      className="w-full bg-white disabled:opacity-50 border border-slate-200 rounded-xl py-2 pl-7 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-bold appearance-none cursor-pointer"
                      id="edit-district-picker"
                    >
                      <option value="">Choose District</option>
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Map Coordinates Picker for Profile */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm active:scale-95 ${
                    typeof editLat === "number" && typeof editLng === "number"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-extrabold"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/60"
                  }`}
                  id="profile-map-picker-trigger"
                >
                  <Compass size={13} className={typeof editLat === "number" && typeof editLng === "number" ? "text-indigo-600 animate-spin-slow" : "text-slate-500"} />
                  {typeof editLat === "number" && typeof editLng === "number" ? (
                    <span>📍 Shop Pin Placed ({editLat.toFixed(4)}, {editLng.toFixed(4)})</span>
                  ) : (
                    <span>Add Shop Location Pin on Map</span>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold py-3 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer mt-4"
              id="save-personal-info-btn"
            >
              Save Profile Changes
            </button>
          </form>

          {/* Map picker modal view */}
          {showMapModal && (
            <MapLocationModal
              initialLat={editLat}
              initialLng={editLng}
              state={editState}
              district={editDistrict}
              onConfirm={(selectedLat, selectedLng) => {
                setEditLat(selectedLat);
                setEditLng(selectedLng);
              }}
              onClose={() => setShowMapModal(false)}
            />
          )}
        </div>
      )}


      {/* 3. MY LISTINGS / MY ADS SCREEN */}
      {activeSubScreen === "my_listings" && (() => {
        const now = Date.now();
        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
        
        const activeMyParts = myParts.filter(p => p.sold !== true && (now - p.createdAt) <= ninetyDaysMs);
        const soldMyParts = myParts.filter(p => p.sold === true);
        const expiredMyParts = myParts.filter(p => p.sold !== true && (now - p.createdAt) > ninetyDaysMs);

        const currentTabParts = myAdsTab === "active" 
          ? activeMyParts 
          : myAdsTab === "sold" 
            ? soldMyParts 
            : expiredMyParts;

        const formatExpiredDate = (createdAt: number) => {
          const expiredAt = createdAt + ninetyDaysMs;
          return new Date(expiredAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
          });
        };

        return (
          <div className="flex-1 flex flex-col animate-fade-in bg-slate-50 animate-fade-in" id="profile-sub-my-listings">
            {/* Sub Header & Segmented Tabs */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-50">
                {activeTab !== "myads" && (
                  <button
                    onClick={() => {
                      setActiveSubScreen("menu");
                      setDeleteError(null);
                    }}
                    className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
                    id="back-btn-my-listings"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h2 className="text-sm font-extrabold text-slate-800">My Listings / My Ads</h2>
              </div>
              
              <div className="flex px-4 py-2 gap-1.5 bg-slate-50/50">
                {(["active", "sold", "expired"] as const).map((tab) => {
                  const count = tab === "active" ? activeMyParts.length : tab === "sold" ? soldMyParts.length : expiredMyParts.length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setMyAdsTab(tab)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                        myAdsTab === tab
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm font-extrabold"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      id={`tab-btn-${tab}`}
                    >
                      <span>{tab}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                        myAdsTab === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {deleteError && (
                <div className="mx-4 my-2 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 flex items-start gap-2 animate-fade-in" id="delete-error-banner">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Deletion Failed</p>
                    <p className="text-[11px] mt-0.5">{deleteError}</p>
                  </div>
                  <button 
                    onClick={() => setDeleteError(null)}
                    className="text-rose-400 hover:text-rose-600 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Ads List */}
            <div className="p-4 space-y-3.5 flex-1 pb-16 overflow-y-auto">
              {currentTabParts.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                    <Tag size={20} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">No {myAdsTab} Ads</h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
                    {myAdsTab === "active" 
                      ? "You do not have any active advertisements. Post high-quality ads to reach potential buyers." 
                      : myAdsTab === "sold" 
                        ? "You have not marked any automobile parts as sold yet." 
                        : "No expired ads. Every listing is valid and active for 90 days."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentTabParts.map(part => (
                    <div
                      key={part.id}
                      className="bg-white p-3 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 relative hover:border-slate-200 transition-all"
                      id={`manage-part-${part.id}`}
                    >
                      <div 
                        onClick={() => onViewPart && onViewPart(part)}
                        className="flex gap-3 cursor-pointer"
                      >
                        <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-50">
                          <img
                            src={part.imageUrl}
                            alt={part.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {part.sold && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[9px] font-black tracking-widest text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase">
                                SOLD
                              </span>
                            </div>
                          )}
                          {myAdsTab === "expired" && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[9px] font-black tracking-widest text-white bg-amber-600 px-1.5 py-0.5 rounded uppercase">
                                EXPIRED
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 truncate">
                              {part.title}
                            </h4>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wide mt-0.5">
                              {part.carBrand} · {part.carModel}
                            </p>
                            {myAdsTab === "expired" && (
                              <p className="text-[9px] font-mono text-amber-600 font-extrabold mt-1 uppercase">
                                Expired on: {formatExpiredDate(part.createdAt)}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-900 font-mono">
                              {formatPrice(part.price)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {deleteConfirmId === part.id ? (
                        <div className="border-t border-slate-50 pt-2.5 flex flex-col gap-2 w-full animate-fade-in">
                          <p className="text-[10px] font-extrabold text-rose-600 leading-tight">
                            Delete listing permanently from Firestore? This action is irreversible.
                          </p>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteListing(part.id);
                                setDeleteConfirmId(null);
                              }}
                              className="bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-sm transition-all"
                            >
                              Confirm Delete
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-slate-50 pt-2.5 flex items-center justify-between">
                          {myAdsTab === "active" ? (
                            <>
                              <div className="flex gap-2">
                                {/* Edit Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPart(part);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                  id={`edit-listing-btn-${part.id}`}
                                >
                                  Edit Ad
                                </button>

                                {/* Mark as Sold Button */}
                                <button
                                  onClick={() => onToggleSold && onToggleSold(part.id)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                  id={`sold-toggle-${part.id}`}
                                >
                                  Mark as Sold
                                </button>
                              </div>

                              {/* Delete button */}
                              <button
                                onClick={() => setDeleteConfirmId(part.id)}
                                disabled={isDeletingId === part.id}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                id={`delete-listing-${part.id}`}
                                title="Delete Listing"
                              >
                                {isDeletingId === part.id ? (
                                  <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <div>
                                {myAdsTab === "sold" ? (
                                  <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Sold Section
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                    Expired Ad
                                  </span>
                                )}
                              </div>

                              {/* Delete button (only action for Sold and Expired ads) */}
                              <button
                                onClick={() => setDeleteConfirmId(part.id)}
                                disabled={isDeletingId === part.id}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                id={`delete-listing-${part.id}`}
                                title="Delete Listing"
                              >
                                {isDeletingId === part.id ? (
                                  <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin block" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}


      {/* 4. SAVED / FAVORITES SCREEN */}
      {activeSubScreen === "saved" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-slate-50" id="profile-sub-favorites">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-favorites"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Saved / Favorites</h2>
          </div>

          <div className="p-4 space-y-3 flex-1 pb-16">
            {favParts.length === 0 ? (
              <div className="text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                  <Heart size={20} />
                </div>
                <h4 className="text-xs font-bold text-slate-700">No Favorites Yet</h4>
                <p className="text-[10px] text-slate-400 mt-1.5 max-w-[200px] mx-auto">
                  Bookmark car parts while browsing the feed by tapping the Heart icon. They will show up here for easy access!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {favParts.map(part => (
                  <div
                    key={part.id}
                    onClick={() => onViewPart && onViewPart(part)}
                    className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex gap-3 cursor-pointer hover:border-slate-200 transition-all group relative"
                    id={`favorite-part-${part.id}`}
                  >
                    <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-50">
                      <img
                        src={part.imageUrl}
                        alt={part.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {part.sold && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-[8px] font-black tracking-widest text-white bg-rose-600 px-1 py-0.5 rounded uppercase">
                            SOLD
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {part.title}
                        </h4>
                        <p className="text-[10px] text-indigo-600 mt-0.5 font-bold uppercase tracking-wide">
                          {part.carBrand} · {part.carModel}
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 font-mono">
                        {formatPrice(part.price)}
                      </span>
                    </div>

                    {/* Quick toggle favorite status */}
                    {onFavoriteToggle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle(part.id);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl self-center transition-all active:scale-95 shrink-0"
                        id={`toggle-fav-${part.id}`}
                        title="Remove Bookmark"
                      >
                        <Heart size={15} fill="currentColor" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* 5. PRIVACY & SECURITY SCREEN */}
      {activeSubScreen === "privacy" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-slate-50" id="profile-sub-privacy">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-privacy"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Privacy & Security</h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Rules */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3.5">
              <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert size={14} />
                Core Data Protection
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                We believe in total user data sovereignty. Below are the absolute privacy rules of <strong>Auto Parts</strong>:
              </p>
              <ul className="text-[11px] text-slate-500 space-y-2 list-disc list-inside">
                <li>Your uploaded listings are shown publicly for buyer inquiries.</li>
                <li>Your contact number is only accessible to logged-in verified users.</li>
                <li>No automated scraping or bulk sharing of database lists takes place.</li>
                <li>All sessions and messages are sandboxed to assure peer safety.</li>
              </ul>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-50/20 border border-rose-100 rounded-3xl p-5 space-y-3">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                <Trash2 size={13} />
                Danger Zone
              </h3>
              <p className="text-[10px] text-slate-500">
                Permanently delete your entire workspace profile and all corresponding active automobile spare part listings. This action is irreversible.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold py-2.5 rounded-xl transition-colors cursor-pointer"
                  id="btn-delete-account-trigger"
                >
                  Delete Account & Ads
                </button>
              ) : (
                <div className="bg-white border border-rose-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                  <p className="text-[10px] font-bold text-rose-600 leading-tight">
                    Are you absolutely sure? This will delete your Auto Parts account and remove all your listed spare parts immediately.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-[10px] font-bold transition-all"
                      id="btn-delete-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccountConfirm}
                      className="bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-[10px] font-bold transition-all"
                      id="btn-delete-confirm"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* 6. HELP & SUPPORT SCREEN */}
      {activeSubScreen === "support" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-slate-50" id="profile-sub-support">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 w-full shrink-0">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-support"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Help & Support</h2>
          </div>

          {/* Centered Email Support Container */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center gap-4">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Mail size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">Email Support</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                  Have questions or need assistance? Reach out to our support team and we will get back to you as soon as possible.
                </p>
              </div>
              
              <a
                href="mailto:wwwautoparts2@gmail.com"
                className="w-full flex items-center justify-center gap-2 p-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
                id="email-support-link"
              >
                <span>Contact Support</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}


      {/* 7. ABOUT AUTO PARTS SCREEN */}
      {activeSubScreen === "about" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-slate-50" id="profile-sub-about">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
              id="back-btn-about"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">About Auto Parts</h2>
          </div>

          <div className="p-5 flex flex-col items-center justify-center text-center space-y-5">
            {/* Official Auto Parts India Logo */}
            <BrandLogo size="lg" variant="icon" theme="dark" showTagline={false} className="mt-4" />

            <div className="space-y-1">
              <h3 className="text-base font-black tracking-tight text-slate-900">Auto Parts</h3>
              <p className="text-[10px] font-mono text-indigo-600 font-extrabold uppercase bg-indigo-50 px-2 py-0.5 rounded-full inline-block border border-indigo-100">
                Version 1.0.0
              </p>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed max-w-[280px]">
              Auto Parts is India's premium C2C platform dedicated to trading new, used, and scrap car spare parts.
            </p>

            <div className="w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-left space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Core Highlights</h4>
              <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc list-inside">
                <li>Comprehensive car brands & models mapping.</li>
                <li>Cascading locations covering major Indian states.</li>
                <li>Verified local sellers & peer listings.</li>
                <li>Real-time chat and communication.</li>
              </ul>
            </div>

            <p className="text-[9px] text-slate-400 pt-6">
              © 2026 Auto Parts India. All rights reserved. Built with pride for local workshops, mechanics, and car owners.
            </p>
          </div>
        </div>
      )}

      {/* 8. MY SELLER REVIEWS SCREEN */}
      {activeSubScreen === "my_reviews" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-slate-50" id="profile-sub-reviews">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shadow-sm">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer"
              id="back-btn-reviews"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">My Seller Feedback</h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Rating Summary Card */}
            {userRating && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-2 text-center border-r border-slate-100 pr-2">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter block font-mono">
                      {userRating.count > 0 ? userRating.average : "0.0"}
                    </span>
                    <div className="flex items-center justify-center gap-0.5 text-amber-400 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          fill={s <= Math.round(userRating.average) && userRating.count > 0 ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 block">
                      {userRating.count} {userRating.count === 1 ? "review" : "reviews"}
                    </span>
                  </div>

                  <div className="col-span-3 pl-2">
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-wider">
                      TRUSTWORTHY SELLER RATING
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      Your ratings breakdown is computed from verified auto parts buyer feedback. Deliver quality parts to keep it green!
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Feedbacks From Buyers
              </h4>

              {userReviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center shadow-sm">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <MessageSquare size={16} />
                  </div>
                  <h5 className="text-xs font-bold text-slate-700">No Reviews Yet</h5>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Once buyers purchase parts from you, they can leave feedback about their experience.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userReviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left space-y-2.5 animate-fade-in"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-[11px] font-bold text-slate-800 leading-none">{rev.buyerName}</h5>
                          <span className="text-[8px] text-slate-400 font-bold block mt-1 font-mono">
                            BUYER · {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              size={10} 
                              fill={s <= rev.rating ? "currentColor" : "none"} 
                              stroke="currentColor" 
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        "{rev.comment}"
                      </p>

                      {rev.partTitle && (
                        <div className="flex items-center gap-1 text-[9px] text-indigo-600 bg-indigo-50/40 px-2 py-1 rounded-lg border border-indigo-100/30 truncate">
                          <Tag size={10} />
                          <span className="font-bold truncate">Item: {rev.partTitle}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. CHECK FOR UPDATES SUBSCREEN */}
      {activeSubScreen === "app_update" && (
        <div className="flex-1 flex flex-col animate-fade-in bg-slate-50" id="profile-sub-updates">
          {/* Sub Header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shadow-sm">
            <button
              onClick={() => setActiveSubScreen("menu")}
              className="p-1.5 hover:bg-slate-50 text-slate-700 rounded-xl transition-all cursor-pointer"
              id="back-btn-updates"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800">Check for Updates</h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Main Version Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-100">
                <Sparkles size={28} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Auto Parts Market</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Android APK & Web Version Management</p>
              </div>

              {/* Version Metrics Table (Current, Last Checked, Latest Version) */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100/80 font-mono text-left">
                <div className="p-2 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-sans">Current Version</span>
                  <span className="text-xs font-black text-slate-800 block">v{CURRENT_APP_VERSION}</span>
                </div>
                <div className="p-2 border-x border-slate-200/60 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-sans">Last Checked</span>
                  <span className="text-[10px] font-bold text-slate-600 block truncate">{lastChecked || "Just now"}</span>
                </div>
                <div className="p-2 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 block font-sans">Latest Version</span>
                  <span className="text-xs font-black text-indigo-700 block">
                    {appVersionConfig ? `v${appVersionConfig.latestVersion}` : "v" + CURRENT_APP_VERSION}
                  </span>
                </div>
              </div>

              {/* Version Status Badge / Notification */}
              {versionStatusMessage && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 ${
                    versionStatusMessage.includes("latest")
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                      : "bg-indigo-50 text-indigo-800 border-indigo-200/80"
                  }`}
                >
                  {versionStatusMessage.includes("latest") ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Sparkles size={16} className="text-indigo-600 shrink-0" />
                  )}
                  <span>{versionStatusMessage}</span>
                </div>
              )}

              {/* Update details & Release Notes if update available */}
              {appVersionConfig && compareVersions(CURRENT_APP_VERSION, appVersionConfig.latestVersion) < 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Release Notes (v{appVersionConfig.latestVersion})</span>
                    <span className="text-[10px] font-medium text-slate-500">{appVersionConfig.releaseDate}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                    {appVersionConfig.releaseNotes}
                  </p>
                  
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (appVersionConfig.apkDownloadUrl) {
                          window.open(appVersionConfig.apkDownloadUrl, "_blank");
                        }
                      }}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Download & Update Now</span>
                      <ArrowUpRight size={14} className="opacity-70" />
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Check Button */}
              <button
                onClick={handleCheckForUpdates}
                disabled={checkingVersion}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={15} className={checkingVersion ? "animate-spin" : ""} />
                <span>{checkingVersion ? "Checking Firestore..." : "Check for Updates Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPart && (
        <EditListingModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={handleSaveListingChanges}
        />
      )}

    </div>
  );
}
