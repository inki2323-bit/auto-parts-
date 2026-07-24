import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, Users, Tag, PlusCircle, Trash2, Megaphone, 
  Settings, Ban, CheckCircle, Search, Edit2, Check, X,
  MapPin, Car, Plus, AlertCircle, RefreshCw, Globe,
  Sparkles, Download, Star, ShieldCheck, CheckCircle2,
  XCircle, RotateCcw, Eye, UserCheck, CheckSquare, Square,
  Filter, AlertTriangle, DollarSign, Phone, Mail, FileText,
  Clock, Flag, Layers
} from "lucide-react";
import { User, SparePart, AppVersionConfig } from "../types";
import { 
  fetchAllUsers, toggleUserBlockStatus, sendAnnouncement,
  fetchMetadataConfig, saveMetadataConfig, deleteSparePartListing,
  updateSparePartListing, fetchAppVersionConfig, updateAppVersionConfig,
  deleteUserAccount, updateAdminUserProfile, fetchAnnouncementsHistory,
  deleteAnnouncement, updateAnnouncement, AnnouncementItem
} from "../lib/firebase";
import EditListingModal from "./EditListingModal";
import SellerProfileView from "./SellerProfileView";
import AdminTaxonomyCMS from "./AdminTaxonomyCMS";

interface AdminDashboardScreenProps {
  currentUser: User | null;
  allParts: SparePart[];
  onPartUpdated: () => void;
  onBackToApp: () => void;
}

export default function AdminDashboardScreen({
  currentUser,
  allParts,
  onPartUpdated,
  onBackToApp
}: AdminDashboardScreenProps) {
  // Navigation tabs inside Admin Panel
  const [activeTab, setActiveTab] = useState<"users" | "listings" | "metadata" | "announcements" | "version">("users");

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Toast / Alert State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Listing Details Modal State
  const [detailModalPart, setDetailModalPart] = useState<SparePart | null>(null);

  // Edit Listing Modal State
  const [editingModalPart, setEditingModalPart] = useState<SparePart | null>(null);

  // Seller Profile Modal State
  const [sellerProfileModal, setSellerProfileModal] = useState<{ id: string; name: string } | null>(null);

  // Listing Status Filter
  const [listingFilter, setListingFilter] = useState<"all" | "active" | "sold" | "pending" | "featured" | "verified" | "reported" | "trash">("all");

  // Multi-select for bulk actions
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  
  // Metadata state
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<Record<string, string[]>>({});
  const [locations, setLocations] = useState<string[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // New items fields
  const [newCategory, setNewCategory] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandModels, setNewBrandModels] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Announcements state
  const [annTitle, setAnnTitle] = useState("");
  const [annText, setAnnText] = useState("");
  const [annSuccess, setAnnSuccess] = useState(false);
  const [sendingAnn, setSendingAnn] = useState(false);

  // App Version management states
  const [vLatestVersion, setVLatestVersion] = useState("1.0.0");
  const [vMinVersion, setVMinVersion] = useState("1.0.0");
  const [vForceUpdate, setVForceUpdate] = useState(false);
  const [vApkUrl, setVApkUrl] = useState("https://autopartsindia.app/download/app-latest.apk");
  const [vReleaseNotes, setVReleaseNotes] = useState("Performance improvements & bug fixes.");
  const [vReleaseDate, setVReleaseDate] = useState("2026-07-22");
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionSaveSuccess, setVersionSaveSuccess] = useState(false);

  const loadVersionData = async () => {
    setLoadingVersion(true);
    try {
      const config = await fetchAppVersionConfig();
      setVLatestVersion(config.latestVersion);
      setVMinVersion(config.minimumSupportedVersion);
      setVForceUpdate(config.forceUpdate);
      setVApkUrl(config.apkDownloadUrl);
      setVReleaseNotes(config.releaseNotes);
      setVReleaseDate(config.releaseDate);
    } catch (e) {
      console.error("Failed to load app version config in admin:", e);
    } finally {
      setLoadingVersion(false);
    }
  };

  const handleSaveVersionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVersion(true);
    setVersionSaveSuccess(false);
    try {
      const updatedConfig: AppVersionConfig = {
        latestVersion: vLatestVersion.trim(),
        minimumSupportedVersion: vMinVersion.trim(),
        forceUpdate: vForceUpdate,
        apkDownloadUrl: vApkUrl.trim(),
        releaseNotes: vReleaseNotes.trim(),
        releaseDate: vReleaseDate.trim()
      };
      const success = await updateAppVersionConfig(updatedConfig);
      if (success) {
        setVersionSaveSuccess(true);
        showToast("App update configuration saved successfully!");
        setTimeout(() => setVersionSaveSuccess(false), 4000);
      } else {
        showToast("Failed to save app update configuration.", "error");
      }
    } catch (err) {
      showToast("Error saving app update config: " + err, "error");
    } finally {
      setSavingVersion(false);
    }
  };

  // User edit state
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Announcement history state
  const [announcementsList, setAnnouncementsList] = useState<AnnouncementItem[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(false);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loadAnnouncements = async () => {
    setLoadingAnn(true);
    try {
      const history = await fetchAnnouncementsHistory();
      setAnnouncementsList(history);
    } catch (e) {
      console.error("Failed to load announcements history:", e);
    } finally {
      setLoadingAnn(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    if (user.email === "wwwautoparts2@gmail.com" || user.email === "ym1950394@gmail.com") {
      showToast("Cannot delete Super Admin account!", "error");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete user account for ${user.name} (${user.email})? This action cannot be undone.`,
      confirmText: "Delete Account",
      isDanger: true,
      onConfirm: async () => {
        try {
          const success = await deleteUserAccount(user.id);
          if (success) {
            setUsers(prev => prev.filter(u => u.id !== user.id));
            showToast(`User account for ${user.name} permanently deleted.`);
          }
        } catch (e: any) {
          showToast("Failed to delete user account: " + (e?.message || e), "error");
        }
      }
    });
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const success = await updateAdminUserProfile(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        district: editingUser.district,
        state: editingUser.state
      });
      if (success) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
        showToast(`User profile for ${editingUser.name} updated!`);
        setEditingUser(null);
      }
    } catch (e: any) {
      showToast("Failed to update user profile: " + (e?.message || e), "error");
    }
  };

  const exportUsersCSV = () => {
    if (users.length === 0) return;
    const headers = ["ID", "Name", "Email", "Phone", "District", "State", "IsBlocked"];
    const rows = users.map(u => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${(u.phone || "").replace(/"/g, '""')}"`,
      `"${(u.district || "").replace(/"/g, '""')}"`,
      `"${(u.state || "").replace(/"/g, '""')}"`,
      u.isBlocked ? "YES" : "NO"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `autoparts_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported user accounts to CSV.");
  };

  const exportListingsCSV = () => {
    if (allParts.length === 0) return;
    const headers = ["ID", "Title", "Price", "Brand", "Model", "Category", "Condition", "Seller", "Phone", "District", "State", "Featured", "Verified", "Sold", "Approved"];
    const rows = allParts.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.price,
      `"${p.carBrand.replace(/"/g, '""')}"`,
      `"${p.carModel.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      `"${(p.condition || "").replace(/"/g, '""')}"`,
      `"${p.contactName.replace(/"/g, '""')}"`,
      `"${(p.contactPhone || "").replace(/"/g, '""')}"`,
      `"${(p.district || "").replace(/"/g, '""')}"`,
      `"${(p.state || p.location || "").replace(/"/g, '""')}"`,
      p.featured ? "YES" : "NO",
      p.verified ? "YES" : "NO",
      p.sold ? "YES" : "NO",
      p.approved !== false ? "YES" : "NO"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `autoparts_listings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported listings to CSV.");
  };

  const handleDeleteAnnouncement = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Announcement",
      message: `Are you sure you want to delete announcement "${title}"?`,
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteAnnouncement(id);
          setAnnouncementsList(prev => prev.filter(a => a.id !== id));
          showToast(`Announcement "${title}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete announcement: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Load all users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await fetchAllUsers();
      setUsers(allUsers);
    } catch (e) {
      console.error("Failed to load users for admin:", e);
      showToast("Failed to load user accounts.", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load metadata
  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const config = await fetchMetadataConfig();
      setCategories(config.categories);
      setBrands(config.brands);
      setLocations(config.locations);
    } catch (e) {
      console.error("Failed to load metadata config:", e);
      showToast("Failed to load metadata.", "error");
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadUsers();
      loadMeta();
      loadVersionData();
      loadAnnouncements();
    }
  }, [currentUser]);

  // Block/unblock handler
  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    if (userId === currentUser?.id) {
      showToast("You cannot block yourself!", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: currentBlocked ? "Unblock User Account" : "Suspend User Account",
      message: `Are you sure you want to ${currentBlocked ? "unblock" : "suspend/block"} this user account?`,
      confirmText: currentBlocked ? "Unblock Account" : "Suspend Account",
      isDanger: !currentBlocked,
      onConfirm: async () => {
        try {
          const success = await toggleUserBlockStatus(userId, currentBlocked);
          if (success) {
            setUsers(prev => 
              prev.map(u => u.id === userId ? { ...u, isBlocked: !currentBlocked } : u)
            );
            showToast(`User successfully ${currentBlocked ? "unblocked" : "suspended"}.`);
          }
        } catch (e: any) {
          showToast("Failed to change block status: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Category additions
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showToast("Category already exists!", "error");
      return;
    }
    const updated = [...categories, trimmed];
    try {
      await saveMetadataConfig("categories", { list: updated });
      setCategories(updated);
      setNewCategory("");
      showToast(`Category "${trimmed}" added.`);
    } catch (e: any) {
      showToast("Failed to save categories: " + (e?.message || e), "error");
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Category",
      message: `Are you sure you want to delete category "${cat}"?`,
      confirmText: "Delete Category",
      isDanger: true,
      onConfirm: async () => {
        const updated = categories.filter(c => c !== cat);
        try {
          await saveMetadataConfig("categories", { list: updated });
          setCategories(updated);
          showToast(`Category "${cat}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete category: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Brand additions
  const handleAddBrand = async () => {
    const brandName = newBrandName.trim();
    if (!brandName) return;
    const modelsList = newBrandModels
      .split(",")
      .map(m => m.trim())
      .filter(m => m.length > 0);

    if (brands[brandName]) {
      showToast("Brand already exists!", "error");
      return;
    }

    const updated = { ...brands, [brandName]: modelsList };
    try {
      await saveMetadataConfig("brands", { map: updated });
      setBrands(updated);
      setNewBrandName("");
      setNewBrandModels("");
      showToast(`Brand "${brandName}" added.`);
    } catch (e: any) {
      showToast("Failed to save brands: " + (e?.message || e), "error");
    }
  };

  const handleDeleteBrand = async (brand: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Brand",
      message: `Are you sure you want to delete brand "${brand}"?`,
      confirmText: "Delete Brand",
      isDanger: true,
      onConfirm: async () => {
        const updated = { ...brands };
        delete updated[brand];
        try {
          await saveMetadataConfig("brands", { map: updated });
          setBrands(updated);
          showToast(`Brand "${brand}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete brand: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Location additions
  const handleAddLocation = async () => {
    const trimmed = newLocation.trim();
    if (!trimmed) return;
    if (locations.includes(trimmed)) {
      showToast("Location already exists!", "error");
      return;
    }
    const updated = [...locations, trimmed];
    try {
      await saveMetadataConfig("locations", { list: updated });
      setLocations(updated);
      setNewLocation("");
      showToast(`Location "${trimmed}" added.`);
    } catch (e: any) {
      showToast("Failed to save locations: " + (e?.message || e), "error");
    }
  };

  const handleDeleteLocation = async (loc: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Location",
      message: `Are you sure you want to delete location "${loc}"?`,
      confirmText: "Delete Location",
      isDanger: true,
      onConfirm: async () => {
        const updated = locations.filter(l => l !== loc);
        try {
          await saveMetadataConfig("locations", { list: updated });
          setLocations(updated);
          showToast(`Location "${loc}" deleted.`);
        } catch (e: any) {
          showToast("Failed to delete location: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Single Action Handlers for Listings
  const handleToggleFeatured = async (part: SparePart) => {
    const newFeatured = !part.featured;
    try {
      const success = await updateSparePartListing(part.id, { featured: newFeatured });
      if (success) {
        showToast(`Listing "${part.title}" ${newFeatured ? "marked as Featured ⭐" : "removed from Featured"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update featured status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating featured status: " + (e?.message || e), "error");
    }
  };

  const handleToggleVerified = async (part: SparePart) => {
    const newVerified = !part.verified;
    try {
      const success = await updateSparePartListing(part.id, { verified: newVerified });
      if (success) {
        showToast(`Listing "${part.title}" ${newVerified ? "marked as Verified ✓" : "unverified"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update verified status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating verified status: " + (e?.message || e), "error");
    }
  };

  const handleToggleApproved = async (part: SparePart, approve: boolean) => {
    try {
      const success = await updateSparePartListing(part.id, { 
        approved: approve,
        status: approve ? "approved" : "rejected"
      });
      if (success) {
        showToast(`Listing "${part.title}" ${approve ? "approved" : "rejected"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update approval status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating approval status: " + (e?.message || e), "error");
    }
  };

  const handleToggleSold = async (part: SparePart) => {
    const newSold = !part.sold;
    try {
      const success = await updateSparePartListing(part.id, { sold: newSold });
      if (success) {
        showToast(`Listing "${part.title}" ${newSold ? "marked as Sold" : "marked as Available"}.`);
        onPartUpdated();
      } else {
        showToast("Failed to update sold status.", "error");
      }
    } catch (e: any) {
      showToast("Error updating sold status: " + (e?.message || e), "error");
    }
  };

  const handleSoftDelete = async (part: SparePart) => {
    setConfirmModal({
      isOpen: true,
      title: "Move Listing to Trash",
      message: `Are you sure you want to move "${part.title}" to Trash?`,
      confirmText: "Move to Trash",
      isDanger: true,
      onConfirm: async () => {
        try {
          const success = await updateSparePartListing(part.id, { isDeleted: true });
          if (success) {
            showToast(`Listing "${part.title}" moved to Trash.`);
            onPartUpdated();
          } else {
            showToast("Failed to move listing to Trash.", "error");
          }
        } catch (e: any) {
          showToast("Error moving listing to Trash: " + (e?.message || e), "error");
        }
      }
    });
  };

  const handleRestoreListing = async (part: SparePart) => {
    try {
      const success = await updateSparePartListing(part.id, { isDeleted: false });
      if (success) {
        showToast(`Listing "${part.title}" restored from Trash.`);
        onPartUpdated();
      } else {
        showToast("Failed to restore listing.", "error");
      }
    } catch (e: any) {
      showToast("Error restoring listing: " + (e?.message || e), "error");
    }
  };

  const handlePermanentDelete = async (part: SparePart) => {
    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete Listing",
      message: `Are you sure you want to permanently delete "${part.title}"? This cannot be undone and will permanently remove listing images and data.`,
      confirmText: "Delete Permanently",
      isDanger: true,
      onConfirm: async () => {
        try {
          const success = await deleteSparePartListing(part.id);
          if (success) {
            showToast(`Listing "${part.title}" permanently deleted.`);
            onPartUpdated();
          } else {
            showToast("Failed to permanently delete listing.", "error");
          }
        } catch (e: any) {
          showToast("Error permanently deleting listing: " + (e?.message || e), "error");
        }
      }
    });
  };

  // Bulk action handler
  const handleBulkAction = async (action: "verify" | "unverify" | "feature" | "unfeature" | "approve" | "reject" | "sold" | "delete") => {
    if (selectedPartIds.length === 0) return;

    if (action === "delete") {
      setConfirmModal({
        isOpen: true,
        title: "Bulk Move to Trash",
        message: `Are you sure you want to move ${selectedPartIds.length} listing(s) to Trash?`,
        confirmText: `Move ${selectedPartIds.length} to Trash`,
        isDanger: true,
        onConfirm: async () => {
          try {
            let count = 0;
            for (const id of selectedPartIds) {
              const ok = await updateSparePartListing(id, { isDeleted: true });
              if (ok) count++;
            }
            showToast(`Moved ${count} listing(s) to Trash.`);
            setSelectedPartIds([]);
            onPartUpdated();
          } catch (e: any) {
            showToast("Bulk delete error: " + (e?.message || e), "error");
          }
        }
      });
      return;
    }

    try {
      let count = 0;
      const updates: Partial<SparePart> = {};
      if (action === "verify") updates.verified = true;
      if (action === "unverify") updates.verified = false;
      if (action === "feature") updates.featured = true;
      if (action === "unfeature") updates.featured = false;
      if (action === "approve") { updates.approved = true; updates.status = "approved"; }
      if (action === "reject") { updates.approved = false; updates.status = "rejected"; }
      if (action === "sold") updates.sold = true;

      for (const id of selectedPartIds) {
        const ok = await updateSparePartListing(id, updates);
        if (ok) count++;
      }
      showToast(`Successfully updated ${count} listing(s).`);
      setSelectedPartIds([]);
      onPartUpdated();
    } catch (e: any) {
      showToast("Bulk action error: " + (e?.message || e), "error");
    }
  };

  // Broadcast announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = annTitle.trim();
    const text = annText.trim();
    if (!title || !text) return;

    setSendingAnn(true);
    try {
      await sendAnnouncement(title, text);
      setAnnSuccess(true);
      setAnnTitle("");
      setAnnText("");
      showToast("Announcement successfully broadcast!");
      setTimeout(() => setAnnSuccess(false), 5000);
    } catch (e: any) {
      showToast("Failed to send announcement: " + (e?.message || e), "error");
    } finally {
      setSendingAnn(false);
    }
  };

  // Filters users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm))
    );
  }, [users, searchTerm]);

  // Counts for listing status tabs
  const listingCounts = useMemo(() => {
    return {
      all: allParts.filter(p => !p.isDeleted).length,
      active: allParts.filter(p => !p.isDeleted && !p.sold && p.approved !== false).length,
      sold: allParts.filter(p => !p.isDeleted && p.sold).length,
      pending: allParts.filter(p => !p.isDeleted && (p.approved === false || p.status === "pending")).length,
      featured: allParts.filter(p => !p.isDeleted && p.featured).length,
      verified: allParts.filter(p => !p.isDeleted && p.verified).length,
      reported: allParts.filter(p => !p.isDeleted && p.reported).length,
      trash: allParts.filter(p => p.isDeleted).length,
    };
  }, [allParts]);

  // Filters ads list based on status filter & search query
  const filteredParts = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return allParts.filter(part => {
      // 1. Status Filter
      if (listingFilter === "all" && part.isDeleted) return false;
      if (listingFilter === "active" && (part.isDeleted || part.sold || part.approved === false)) return false;
      if (listingFilter === "sold" && (part.isDeleted || !part.sold)) return false;
      if (listingFilter === "pending" && (part.isDeleted || (part.approved !== false && part.status !== "pending"))) return false;
      if (listingFilter === "featured" && (part.isDeleted || !part.featured)) return false;
      if (listingFilter === "verified" && (part.isDeleted || !part.verified)) return false;
      if (listingFilter === "reported" && (part.isDeleted || !part.reported)) return false;
      if (listingFilter === "trash" && !part.isDeleted) return false;

      // 2. Search Query
      if (!query) return true;

      return (
        part.title.toLowerCase().includes(query) ||
        part.carBrand.toLowerCase().includes(query) ||
        part.carModel.toLowerCase().includes(query) ||
        part.category.toLowerCase().includes(query) ||
        part.contactName.toLowerCase().includes(query) ||
        part.sellerEmail.toLowerCase().includes(query) ||
        part.location.toLowerCase().includes(query) ||
        (part.district && part.district.toLowerCase().includes(query)) ||
        (part.state && part.state.toLowerCase().includes(query)) ||
        part.id.toLowerCase().includes(query)
      );
    });
  }, [allParts, listingFilter, searchTerm]);

  // Handle Select All / Deselect All
  const isAllSelected = useMemo(() => {
    if (filteredParts.length === 0) return false;
    return filteredParts.every(p => selectedPartIds.includes(p.id));
  }, [filteredParts, selectedPartIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPartIds([]);
    } else {
      setSelectedPartIds(filteredParts.map(p => p.id));
    }
  };

  const toggleSelectPart = (id: string) => {
    setSelectedPartIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden h-full relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-bounce transition-all ${
          toast.type === "error" 
            ? "bg-rose-600 text-white" 
            : toast.type === "info" 
              ? "bg-indigo-600 text-white" 
              : "bg-emerald-600 text-white"
        }`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-[#0056D2] text-white px-4 py-3.5 flex items-center justify-between shadow-md select-none shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="text-yellow-400 fill-yellow-400" size={24} />
          <div>
            <h1 className="font-sans font-black text-lg tracking-tight leading-none">Super Admin</h1>
            <p className="text-[10px] text-blue-100 mt-0.5 opacity-90">Auto Parts Management Dashboard</p>
          </div>
        </div>
        
        <button 
          onClick={onBackToApp}
          className="bg-white/15 hover:bg-white/20 active:bg-white/10 px-3 py-1.5 rounded-full text-xs font-black tracking-tight flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <X size={14} />
          Exit Admin
        </button>
      </header>

      {/* Admin Quick Tabs */}
      <div className="bg-white border-b border-slate-100 flex items-center justify-around select-none shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-x-auto scrollbar-none">
        <button
          onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "users" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users size={16} />
          Users ({users.length})
        </button>

        <button
          onClick={() => { setActiveTab("listings"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "listings" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Tag size={16} />
          Ads & Listings ({allParts.length})
        </button>

        <button
          onClick={() => { setActiveTab("metadata"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "metadata" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Settings size={16} />
          Catalog Metadata
        </button>

        <button
          onClick={() => { setActiveTab("announcements"); setSearchTerm(""); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "announcements" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Megaphone size={16} />
          Announcements
        </button>

        <button
          onClick={() => { setActiveTab("version"); setSearchTerm(""); loadVersionData(); }}
          className={`px-3 py-3 text-xs font-black tracking-tight border-b-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "version" 
              ? "border-[#0056D2] text-[#0056D2]" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles size={16} />
          App Update
        </button>
      </div>

      {/* Main Panel Content (Scrollable Container) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        
        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search, Export and Refresh bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setUsersPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#0056D2] shadow-xs"
                />
              </div>

              <button 
                onClick={exportUsersCSV}
                className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                title="Export Users to CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button 
                onClick={loadUsers}
                disabled={loadingUsers}
                className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0056D2] hover:border-blue-100 disabled:opacity-50 transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0"
                title="Refresh user accounts"
              >
                <RefreshCw size={16} className={loadingUsers ? "animate-spin" : ""} />
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RefreshCw className="animate-spin text-[#0056D2] mb-2" size={24} />
                <span className="text-xs font-bold">Fetching user accounts...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-150 p-8 text-center text-slate-400">
                <Users className="mx-auto mb-2 opacity-50 text-slate-300" size={32} />
                <p className="text-xs font-bold">No registered users matched your filter.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE).map((user) => (
                  <div 
                    key={user.id}
                    className={`bg-white rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 shadow-xs ${
                      user.isBlocked 
                        ? "border-rose-100 bg-rose-50/10" 
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800 truncate">{user.name}</span>
                        {(user.email === "wwwautoparts2@gmail.com" || user.email === "ym1950394@gmail.com") && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                            <Shield size={8} /> Super Admin
                          </span>
                        )}
                        {user.isBlocked && (
                          <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Suspended
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[10px] text-slate-500 truncate space-y-0.5 font-medium">
                        <p className="truncate">Email: {user.email}</p>
                        {user.phone && <p>Phone: {user.phone}</p>}
                        {(user.state || user.district) && (
                          <p className="text-slate-400 flex items-center gap-0.5 text-[9px]">
                            <MapPin size={10} />
                            {[user.district, user.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        onClick={() => setSellerProfileModal({ id: user.id, name: user.name })}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs transition-all cursor-pointer"
                        title="View User Profile & Listings"
                      >
                        <UserCheck size={14} />
                      </button>

                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#0056D2] rounded-full text-xs transition-all cursor-pointer"
                        title="Edit User Profile"
                      >
                        <Edit2 size={14} />
                      </button>

                      {(user.email === "wwwautoparts2@gmail.com" || user.email === "ym1950394@gmail.com") ? (
                        <span className="text-[10px] text-amber-600 font-bold px-2 py-1 bg-amber-50 rounded-full border border-amber-100 select-none">
                          Immutable
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggleBlock(user.id, !!user.isBlocked)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-tight flex items-center gap-1 transition-all cursor-pointer border ${
                              user.isBlocked 
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-150" 
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-150"
                            }`}
                          >
                            {user.isBlocked ? (
                              <>
                                <CheckCircle size={12} />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Ban size={12} />
                                Suspend
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-full text-xs transition-all cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Users Pagination */}
                {filteredUsers.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-600">
                    <span>
                      Showing {((usersPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(usersPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                        disabled={usersPage === 1}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2">{usersPage} / {Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}</span>
                      <button
                        onClick={() => setUsersPage(p => Math.min(Math.ceil(filteredUsers.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={usersPage >= Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LISTINGS & ADS MANAGEMENT */}
        {activeTab === "listings" && (
          <div className="space-y-3.5">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: "All Ads", count: listingCounts.all },
                { id: "active", label: "Active", count: listingCounts.active },
                { id: "pending", label: "Pending Approval", count: listingCounts.pending },
                { id: "featured", label: "Featured", count: listingCounts.featured },
                { id: "verified", label: "Verified", count: listingCounts.verified },
                { id: "sold", label: "Sold", count: listingCounts.sold },
                { id: "reported", label: "Reported", count: listingCounts.reported },
                { id: "trash", label: "Trash / Deleted", count: listingCounts.trash },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => { setListingFilter(filter.id as any); setSelectedPartIds([]); }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight transition-all shrink-0 cursor-pointer flex items-center gap-1 border ${
                    listingFilter === filter.id
                      ? "bg-[#0056D2] text-white border-[#0056D2] shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{filter.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    listingFilter === filter.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search, Export CSV and Refresh Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search title, brand, seller name/email, category, location..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setListingsPage(1); }}
                  className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:border-[#0056D2] shadow-xs"
                />
              </div>

              <button 
                onClick={exportListingsCSV}
                className="px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
                title="Export Listings to CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button 
                onClick={onPartUpdated}
                className="p-2.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-[#0056D2] transition-all cursor-pointer shadow-xs shrink-0"
                title="Refresh listings"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Bulk Action Controls */}
            {filteredParts.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs text-xs select-none">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-slate-700 font-bold hover:text-[#0056D2] cursor-pointer"
                >
                  {isAllSelected ? <CheckSquare className="text-[#0056D2]" size={16} /> : <Square className="text-slate-400" size={16} />}
                  <span>Select All ({filteredParts.length})</span>
                </button>

                {selectedPartIds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">
                      {selectedPartIds.length} Selected
                    </span>

                    <button
                      onClick={() => handleBulkAction("approve")}
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={12} /> Approve
                    </button>

                    <button
                      onClick={() => handleBulkAction("verify")}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck size={12} /> Verify
                    </button>

                    <button
                      onClick={() => handleBulkAction("feature")}
                      className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Star size={12} /> Feature
                    </button>

                    <button
                      onClick={() => handleBulkAction("sold")}
                      className="bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <DollarSign size={12} /> Mark Sold
                    </button>

                    <button
                      onClick={() => handleBulkAction("delete")}
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Listings List */}
            {filteredParts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-150 p-8 text-center text-slate-400">
                <Tag className="mx-auto mb-2 opacity-50 text-slate-300" size={32} />
                <p className="text-xs font-bold">No spare part listings found matching your current filter.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                {filteredParts.slice((listingsPage - 1) * ITEMS_PER_PAGE, listingsPage * ITEMS_PER_PAGE).map((part) => {
                  const isSelected = selectedPartIds.includes(part.id);
                  return (
                    <div 
                      key={part.id}
                      className={`bg-white rounded-2xl border p-3 flex flex-col gap-2.5 shadow-2xs transition-all ${
                        isSelected ? "border-[#0056D2] ring-1 ring-[#0056D2]/20 bg-blue-50/10" : "border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      {/* Top Row: Thumbnail + Specs + Quick Badges */}
                      <div className="flex gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelectPart(part.id)}
                          className="self-center p-1 text-slate-400 hover:text-[#0056D2] cursor-pointer shrink-0"
                        >
                          {isSelected ? <CheckSquare className="text-[#0056D2]" size={18} /> : <Square size={18} />}
                        </button>

                        {/* Image Thumbnail */}
                        <div 
                          onClick={() => setDetailModalPart(part)}
                          className="h-20 w-20 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center relative cursor-pointer group"
                        >
                          {(part.imageUrls && part.imageUrls[0]) || part.imageUrl ? (
                            <img 
                              src={(part.imageUrls && part.imageUrls[0]) || part.imageUrl} 
                              alt={part.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Car className="text-slate-300" size={28} />
                          )}

                          {part.sold && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-[8px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                Sold
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title, Specs, Badges */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h3 
                                onClick={() => setDetailModalPart(part)}
                                className="font-bold text-xs text-slate-800 leading-tight truncate cursor-pointer hover:text-[#0056D2]"
                              >
                                {part.title}
                              </h3>
                              <span className="font-black text-xs text-[#0056D2] shrink-0">₹{part.price.toLocaleString("en-IN")}</span>
                            </div>

                            <p className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap mt-0.5 font-medium">
                              <span className="text-slate-700 font-semibold">{part.carBrand} {part.carModel}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600">{part.category}</span>
                              {part.condition && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500">{part.condition}</span>
                                </>
                              )}
                            </p>

                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate flex items-center gap-1">
                              <span>Seller:</span>
                              <button
                                onClick={() => setSellerProfileModal({ id: part.sellerId, name: part.contactName })}
                                className="text-[#0056D2] font-bold hover:underline cursor-pointer truncate"
                              >
                                {part.contactName} ({part.sellerEmail || part.contactPhone})
                              </button>
                            </p>

                            <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={9} />
                              {[part.district, part.state || part.location].filter(Boolean).join(", ")}
                            </p>
                          </div>

                          {/* Quick Badges Bar */}
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {part.featured && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star size={8} className="fill-amber-500 text-amber-500" /> Featured
                              </span>
                            )}
                            {part.verified && (
                              <span className="bg-blue-100 text-blue-800 text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <ShieldCheck size={8} /> Verified
                              </span>
                            )}
                            {part.approved === false || part.status === "pending" ? (
                              <span className="bg-orange-100 text-orange-800 text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Clock size={8} /> Pending Approval
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <CheckCircle2 size={8} /> Approved
                              </span>
                            )}
                            {part.reported && (
                              <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Flag size={8} /> Reported
                              </span>
                            )}
                            {part.isDeleted && (
                              <span className="bg-slate-200 text-slate-800 text-[8px] font-black px-1.5 py-0.5 rounded-full">
                                In Trash
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Control Bar for Admin Actions */}
                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between flex-wrap gap-1.5 text-[10px] select-none">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailModalPart(part)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                            title="View Full Listing Details"
                          >
                            <Eye size={12} /> Details
                          </button>

                          <button
                            onClick={() => setEditingModalPart(part)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                            title="Edit Listing Details"
                          >
                            <Edit2 size={12} /> Edit
                          </button>

                          <button
                            onClick={() => setSellerProfileModal({ id: part.sellerId, name: part.contactName })}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                            title="View Seller Profile"
                          >
                            <UserCheck size={12} /> Seller
                          </button>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Verify Toggle */}
                          <button
                            onClick={() => handleToggleVerified(part)}
                            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer border ${
                              part.verified 
                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" 
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                            title={part.verified ? "Unverify Listing" : "Verify Listing"}
                          >
                            <ShieldCheck size={12} /> {part.verified ? "Verified" : "Verify"}
                          </button>

                          {/* Feature Toggle */}
                          <button
                            onClick={() => handleToggleFeatured(part)}
                            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer border ${
                              part.featured 
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" 
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                            title={part.featured ? "Unfeature Listing" : "Feature Listing"}
                          >
                            <Star size={12} className={part.featured ? "fill-amber-500" : ""} /> {part.featured ? "Featured" : "Feature"}
                          </button>

                          {/* Approve / Reject */}
                          {part.approved === false || part.status === "pending" ? (
                            <button
                              onClick={() => handleToggleApproved(part, true)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                              title="Approve Listing"
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleApproved(part, false)}
                              className="px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                              title="Reject Listing"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          )}

                          {/* Sold Toggle */}
                          <button
                            onClick={() => handleToggleSold(part)}
                            className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 cursor-pointer border ${
                              part.sold 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                            title={part.sold ? "Mark as Available" : "Mark as Sold"}
                          >
                            <DollarSign size={12} /> {part.sold ? "Sold" : "Mark Sold"}
                          </button>

                          {/* Soft Delete vs Permanent Delete / Restore */}
                          {part.isDeleted ? (
                            <>
                              <button
                                onClick={() => handleRestoreListing(part)}
                                className="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                                title="Restore from Trash"
                              >
                                <RotateCcw size={12} /> Restore
                              </button>

                              <button
                                onClick={() => handlePermanentDelete(part)}
                                className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                                title="Delete Permanently"
                              >
                                <Trash2 size={12} /> Delete Forever
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleSoftDelete(part)}
                              className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md font-bold flex items-center gap-1 cursor-pointer"
                              title="Delete Listing"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Listings Pagination */}
              {filteredParts.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-600 bg-white p-3 rounded-2xl border border-slate-200">
                  <span>
                    Showing {((listingsPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(listingsPage * ITEMS_PER_PAGE, filteredParts.length)} of {filteredParts.length} listings
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setListingsPage(p => Math.max(1, p - 1))}
                      disabled={listingsPage === 1}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-2">{listingsPage} / {Math.ceil(filteredParts.length / ITEMS_PER_PAGE)}</span>
                    <button
                      onClick={() => setListingsPage(p => Math.min(Math.ceil(filteredParts.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={listingsPage >= Math.ceil(filteredParts.length / ITEMS_PER_PAGE)}
                      className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: METADATA & SCHEMA CONFIG */}
        {activeTab === "metadata" && (
          <div className="pb-6">
            <AdminTaxonomyCMS
              allParts={allParts}
              onPartUpdated={onPartUpdated}
              showToast={showToast}
              setConfirmModal={setConfirmModal}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* TAB 4: BROADCAST SYSTEM */}
        {activeTab === "announcements" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-4">
              <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2.5 select-none">
                <Megaphone className="text-[#0056D2]" size={18} />
                <h2 className="text-xs font-black text-slate-800">Broadcast Announcement</h2>
              </div>

              {annSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-800 font-bold flex items-center gap-2 animate-fade-in select-none">
                  <CheckCircle className="text-emerald-500" size={16} />
                  Announcement successfully broadcast to all registered users!
                </div>
              )}

              <form onSubmit={handleSendAnnouncement} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. App Maintenance Scheduled"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Detailed Content</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type the message details. This will be sent as an instant in-app notification and message to all users in the marketplace..."
                    value={annText}
                    onChange={(e) => setAnnText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingAnn || !annTitle || !annText}
                  className="w-full bg-[#0056D2] hover:bg-blue-700 disabled:opacity-50 text-white font-black py-2.5 rounded-full text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none mt-4"
                >
                  <Megaphone size={14} />
                  {sendingAnn ? "Sending Announcement..." : "Broadcast Message"}
                </button>
              </form>
            </div>

            {/* Announcement History */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2.5 select-none">
                <div className="flex items-center gap-1.5">
                  <Clock className="text-[#0056D2]" size={16} />
                  <h2 className="text-xs font-black text-slate-800">Sent Announcements History ({announcementsList.length})</h2>
                </div>
                <button
                  onClick={loadAnnouncements}
                  disabled={loadingAnn}
                  className="p-1.5 hover:bg-slate-50 text-slate-500 rounded-lg transition-all cursor-pointer"
                  title="Refresh Announcement History"
                >
                  <RefreshCw size={14} className={loadingAnn ? "animate-spin" : ""} />
                </button>
              </div>

              {loadingAnn ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                  <RefreshCw className="animate-spin text-[#0056D2]" size={18} />
                  Loading announcements history...
                </div>
              ) : announcementsList.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400 font-medium">No previous broadcast announcements found.</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {announcementsList.map((ann) => (
                    <div key={ann.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-black text-slate-800">{ann.title}</h4>
                        <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                          {new Date(ann.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{ann.text}</p>
                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                          className="text-[10px] text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: APP VERSION MANAGEMENT */}
        {activeTab === "version" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-4 text-left">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-800">App Version & Update Configuration</h2>
                    <p className="text-[10px] text-slate-400">Manage release metadata stored in Firestore document app_config/version</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadVersionData}
                  disabled={loadingVersion}
                  className="p-1.5 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-200"
                  title="Reload version from Firestore"
                >
                  <RefreshCw size={14} className={loadingVersion ? "animate-spin" : ""} />
                </button>
              </div>

              {versionSaveSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] text-emerald-800 font-bold flex items-center gap-2 animate-fade-in select-none">
                  <CheckCircle className="text-emerald-500" size={16} />
                  App version configuration updated successfully in Firestore!
                </div>
              )}

              <form onSubmit={handleSaveVersionConfig} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Latest Version (latestVersion)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1.1.0"
                      value={vLatestVersion}
                      onChange={(e) => setVLatestVersion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#0056D2]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Minimum Supported (minimumSupportedVersion)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1.0.0"
                      value={vMinVersion}
                      onChange={(e) => setVMinVersion(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[#0056D2]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                  <input
                    type="checkbox"
                    id="forceUpdateCheck"
                    checked={vForceUpdate}
                    onChange={(e) => setVForceUpdate(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="forceUpdateCheck" className="text-xs font-bold text-amber-900 cursor-pointer">
                    Force Update Required (forceUpdate)
                    <span className="block text-[10px] text-amber-700 font-normal mt-0.5">
                      When enabled, users cannot dismiss the update dialog or continue using the app until they update.
                    </span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    APK Download URL (apkDownloadUrl)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://autopartsindia.app/download/app-latest.apk"
                    value={vApkUrl}
                    onChange={(e) => setVApkUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Release Date (releaseDate)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026-07-22"
                    value={vReleaseDate}
                    onChange={(e) => setVReleaseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Release Notes (releaseNotes)
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe changes in this update..."
                    value={vReleaseNotes}
                    onChange={(e) => setVReleaseNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#0056D2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingVersion}
                  className="w-full bg-[#0056D2] hover:bg-blue-700 disabled:opacity-50 text-white font-black py-2.5 rounded-full text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none mt-4"
                >
                  <Sparkles size={14} />
                  {savingVersion ? "Saving Version Config..." : "Publish App Update Config"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Modal Overlay */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl shrink-0 ${confirmModal.isDanger ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-[#0056D2]"}`}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await action();
                }}
                className={`px-4 py-2 rounded-full font-bold text-xs text-white cursor-pointer shadow-xs transition-all ${
                  confirmModal.isDanger ? "bg-rose-600 hover:bg-rose-700" : "bg-[#0056D2] hover:bg-blue-700"
                }`}
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal Overlay */}
      {detailModalPart && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-black text-sm text-slate-800">Listing Details</h3>
              <button 
                onClick={() => setDetailModalPart(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Image Preview */}
              <div className="h-48 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center relative">
                {(detailModalPart.imageUrls && detailModalPart.imageUrls[0]) || detailModalPart.imageUrl ? (
                  <img 
                    src={(detailModalPart.imageUrls && detailModalPart.imageUrls[0]) || detailModalPart.imageUrl} 
                    alt={detailModalPart.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Car size={40} className="text-slate-300" />
                )}
                {detailModalPart.sold && (
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                    Sold
                  </div>
                )}
              </div>

              {/* Title & Price */}
              <div>
                <h2 className="font-bold text-base text-slate-900 leading-tight">{detailModalPart.title}</h2>
                <p className="font-black text-lg text-[#0056D2] mt-0.5">₹{detailModalPart.price.toLocaleString("en-IN")}</p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {detailModalPart.featured && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={10} className="fill-amber-500" /> Featured
                  </span>
                )}
                {detailModalPart.verified && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> Verified
                  </span>
                )}
                {detailModalPart.approved === false || detailModalPart.status === "pending" ? (
                  <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Pending Approval
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                )}
                {detailModalPart.sold && (
                  <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Sold Out
                  </span>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Brand & Model</span>
                  <span className="font-bold text-slate-800">{detailModalPart.carBrand} {detailModalPart.carModel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                  <span className="font-bold text-slate-800">{detailModalPart.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Condition</span>
                  <span className="font-bold text-slate-800">{detailModalPart.condition || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                  <span className="font-bold text-slate-800">{[detailModalPart.district, detailModalPart.state || detailModalPart.location].filter(Boolean).join(", ")}</span>
                </div>
              </div>

              {/* Seller details */}
              <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-2xl text-xs space-y-1">
                <span className="text-[10px] text-blue-600 font-black uppercase tracking-wider block">Seller Information</span>
                <p className="font-bold text-slate-800">{detailModalPart.contactName}</p>
                <p className="text-slate-600">Email: {detailModalPart.sellerEmail || "N/A"}</p>
                <p className="text-slate-600">Phone: {detailModalPart.contactPhone || "N/A"}</p>
                <button
                  onClick={() => {
                    const sellerId = detailModalPart.sellerId;
                    const sellerName = detailModalPart.contactName;
                    setDetailModalPart(null);
                    setSellerProfileModal({ id: sellerId, name: sellerName });
                  }}
                  className="mt-1 text-[11px] font-bold text-[#0056D2] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserCheck size={12} /> View Full Seller Profile
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Description</span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                  {detailModalPart.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 rounded-b-3xl">
              <button
                onClick={() => {
                  const p = detailModalPart;
                  setDetailModalPart(null);
                  setEditingModalPart(p);
                }}
                className="px-3 py-1.5 bg-[#0056D2] text-white rounded-full font-bold text-xs hover:bg-blue-700 cursor-pointer flex items-center gap-1"
              >
                <Edit2 size={12} /> Edit Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingModalPart && (
        <EditListingModal
          part={editingModalPart}
          onClose={() => setEditingModalPart(null)}
          onSave={async (partId, updates) => {
            try {
              const success = await updateSparePartListing(partId, updates);
              if (success) {
                showToast("Listing updated successfully!");
                setEditingModalPart(null);
                onPartUpdated();
              } else {
                showToast("Failed to update listing.", "error");
              }
            } catch (err: any) {
              showToast("Error updating listing: " + (err?.message || err), "error");
            }
          }}
        />
      )}

      {/* Seller Profile Modal */}
      {sellerProfileModal && (
        <SellerProfileView
          sellerId={sellerProfileModal.id}
          sellerName={sellerProfileModal.name}
          currentUser={currentUser}
          onClose={() => setSellerProfileModal(null)}
          allParts={allParts}
          onSelectPart={(part) => {
            setSellerProfileModal(null);
            setDetailModalPart(part);
          }}
        />
      )}

      {/* Edit User Profile Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-800">Edit User Account</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Phone Number</label>
                <input
                  type="text"
                  value={editingUser.phone || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">District</label>
                  <input
                    type="text"
                    value={editingUser.district || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, district: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">State</label>
                  <input
                    type="text"
                    value={editingUser.state || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, state: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#0056D2]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#0056D2] hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
