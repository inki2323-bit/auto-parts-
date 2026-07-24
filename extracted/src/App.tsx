import React, { useState, useEffect, useCallback } from "react";
import { 
  Home as HomeIcon, 
  PlusCircle, 
  User as UserIcon,
  Compass,
  Sparkles,
  Info,
  Calendar,
  X,
  Phone,
  MessageSquare,
  Car,
  MapPin,
  Maximize2,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Share2,
  Heart,
  Image as ImageIcon,
  Tag
} from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import SellScreen from "./components/SellScreen";
import ProfileScreen from "./components/ProfileScreen";
import ChatsScreen from "./components/ChatsScreen";
import ChatRoomWindow from "./components/ChatRoomWindow";
import ImageGalleryModal from "./components/ImageGalleryModal";
import InAppNotification from "./components/InAppNotification";
import SellerProfileView from "./components/SellerProfileView";
import GMap from "./components/GMap";
// VerifyEmailScreen removed
import AdminDashboardScreen from "./components/AdminDashboardScreen";
import { User, SparePart, Chat, Message, AppVersionConfig } from "./types";
import { fetchSpareParts, subscribeToAuth, getOrCreateChat, fetchUserChats, fetchSellerReviews, updateSparePartListing, updateUserProfile, subscribeToUserChats, subscribeToSpareParts, deleteSparePartListing, subscribeToUserNotifications, markChatNotificationsAsRead, subscribeToUserFavorites, addFavorite, removeFavorite, markMessagesAsDelivered, fetchAppVersionConfig, setUserPresence } from "./lib/firebase";
import { playNotificationSound, triggerVibration, showPushNotification, requestNotificationPermission } from "./utils/audioNotification";
import { CURRENT_APP_VERSION, evaluateUpdateStatus } from "./utils/versionUtils";
import { UpdateDialogModal } from "./components/UpdateDialogModal";
import { motion, AnimatePresence } from "motion/react";
import EditListingModal from "./components/EditListingModal";
import { useLanguage } from "./lib/LanguageContext";
import { translateDynamic } from "./lib/translations";
import BrandLogo from "./components/BrandLogo";

// No fallback categories helper is needed as we only display real uploaded images.

export default function App() {
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "chats" | "sell" | "myads" | "account">("home");
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  
  // Spare parts database state
  const [parts, setParts] = useState<SparePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  
  // User's favorites list (store in localStorage for persistent client tracking)
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Detail overlay for spare parts clicked from outside the home feed
  const [detailedPart, setDetailedPart] = useState<SparePart | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  // Local notification & unread management state
  const [activeNotification, setActiveNotification] = useState<{ chat: Chat; text: string; id: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Master Detailed Seller Rating states
  const [detailedSellerRating, setDetailedSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showDetailedReviews, setShowDetailedReviews] = useState(false);

  // App Version & Update system state
  const [versionConfig, setVersionConfig] = useState<AppVersionConfig | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);

  // Automatic app update check on application launch
  useEffect(() => {
    const checkVersionOnLaunch = async () => {
      try {
        const config = await fetchAppVersionConfig();
        setVersionConfig(config);
        const result = evaluateUpdateStatus(CURRENT_APP_VERSION, config);
        if (result.hasUpdate) {
          setShowUpdateModal(true);
          setIsForceUpdate(result.isForceUpdate);
        }
      } catch (err) {
        console.warn("Initial app version check warning:", err);
      }
    };
    checkVersionOnLaunch();
  }, []);

  const currentUserRef = React.useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Android System Navigation & Back Stack Manager
  const handleAndroidBack = useCallback(() => {
    // 1. Force update dialog cannot be dismissed
    if (showUpdateModal && isForceUpdate) {
      return;
    }
    // 2. Dismiss non-force update modal
    if (showUpdateModal && !isForceUpdate) {
      setShowUpdateModal(false);
      return;
    }
    // 3. Close image gallery modal
    if (isGalleryOpen) {
      setIsGalleryOpen(false);
      return;
    }
    // 4. Close seller reviews modal
    if (showDetailedReviews) {
      setShowDetailedReviews(false);
      return;
    }
    // 5. Close detailed part overlay
    if (detailedPart) {
      setDetailedPart(null);
      return;
    }
    // 6. Close active chat conversation
    if (activeChat) {
      setActiveChat(null);
      return;
    }
    // 7. Close admin dashboard overlay
    if (showAdminDashboard) {
      setShowAdminDashboard(false);
      return;
    }
    // 8. If on secondary tab (chats, sell, myads, account), navigate back to home tab
    if (activeTab !== "home") {
      setActiveTab("home");
      return;
    }
  }, [showUpdateModal, isForceUpdate, isGalleryOpen, showDetailedReviews, detailedPart, activeChat, showAdminDashboard, activeTab]);

  // Sync state to history stack
  useEffect(() => {
    const navState = {
      activeTab,
      showAdminDashboard,
      activeChatId: activeChat?.id || null,
      detailedPartId: detailedPart?.id || null,
      isGalleryOpen,
      showDetailedReviews,
      timestamp: Date.now()
    };

    localStorage.setItem("android_app_navigation_state", JSON.stringify(navState));

    try {
      window.history.pushState(navState, "");
    } catch (e) {
      // ignore
    }
  }, [activeTab, showAdminDashboard, activeChat?.id, detailedPart?.id, isGalleryOpen, showDetailedReviews]);

  // Popstate navigation listener
  useEffect(() => {
    const onPopState = () => {
      handleAndroidBack();
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [handleAndroidBack]);

  // Edit/delete own listing states
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      const ok = await updateSparePartListing(partId, updates);
      if (ok) {
        setEditingPart(null);
        setDetailedPart(prev => prev && prev.id === partId ? { ...prev, ...updates } : prev);
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to update listing.");
    }
  };

  useEffect(() => {
    const updateRating = () => {
      const sId = detailedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setDetailedSellerRating({ average, count });
        });
      } else {
        setDetailedSellerRating(null);
      }
    };

    updateRating();
    setDetailImageIndex(0);
    window.addEventListener("autoparts_reviews_updated", updateRating);
    window.addEventListener("storage", updateRating);
    return () => {
      window.removeEventListener("autoparts_reviews_updated", updateRating);
      window.removeEventListener("storage", updateRating);
    };
  }, [detailedPart]);

  // 1. Subscribe to Authentication Changes
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1c. Real-time Firebase favorites subscription
  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      return;
    }

    const unsubscribe = subscribeToUserFavorites(
      currentUser.id,
      (userFavorites) => {
        setFavorites(userFavorites);
      },
      (err) => {
        console.error("Error subscribing to user favorites:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // 1a2. User presence tracking and notification permission request
  useEffect(() => {
    if (!currentUser) return;

    // Request browser system notification permission
    requestNotificationPermission();

    // Set online status in Firestore and LocalStorage
    setUserPresence(currentUser.id, true);

    const handleOnline = () => setUserPresence(currentUser.id, true);
    const handleOffline = () => setUserPresence(currentUser.id, false);
    const handleVisibility = () => {
      if (document.hidden) {
        setUserPresence(currentUser.id, false);
      } else {
        setUserPresence(currentUser.id, true);
      }
    };
    const handleBeforeUnload = () => setUserPresence(currentUser.id, false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setUserPresence(currentUser.id, false);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUser?.id]);

  // 1b. Real-time Firebase notification subscription and unread counts/notifications manager
  useEffect(() => {
    if (!currentUser) {
      setUnreadCounts({});
      return;
    }

    const unsubscribe = subscribeToUserNotifications(
      currentUser.id,
      (notifications) => {
        const nextUnreadCounts: Record<string, number> = {};
        const uniqueChatsToMarkDelivered = new Set<string>();
        
        notifications.forEach((notification) => {
          // Count unread notifications per chat
          nextUnreadCounts[notification.chatId] = (nextUnreadCounts[notification.chatId] || 0) + 1;
          
          // Gather chat IDs that are not currently active to mark their messages as delivered
          if (!activeChat || activeChat.id !== notification.chatId) {
            uniqueChatsToMarkDelivered.add(notification.chatId);
          }
          
          // Trigger floating notification if the message is fresh (within 30 seconds)
          const isFresh = Date.now() - notification.createdAt < 30000;
          const lastNotifiedAtStr = sessionStorage.getItem(`autoparts_notified_at_${notification.chatId}`);
          const lastNotifiedAt = lastNotifiedAtStr ? parseInt(lastNotifiedAtStr, 10) : 0;
          
          if (isFresh && notification.createdAt > lastNotifiedAt) {
            sessionStorage.setItem(`autoparts_notified_at_${notification.chatId}`, notification.createdAt.toString());
            
            // Reconstruct Chat object for the InAppNotification display
            const chatObj: Chat = {
              id: notification.chatId,
              partId: notification.chatId.split("_")[2] || "",
              partTitle: notification.partTitle,
              partImageUrl: notification.partImageUrl,
              partPrice: notification.partPrice,
              buyerId: notification.buyerId,
              buyerName: notification.buyerName,
              sellerId: notification.sellerId,
              sellerName: notification.sellerName,
              lastMessageText: notification.text,
              lastMessageAt: notification.createdAt,
              lastSenderId: notification.senderId
            };
            
            setActiveNotification({
              chat: chatObj,
              text: notification.text,
              id: notification.id
            });

            // Play notification sound chime & trigger vibration
            playNotificationSound();
            triggerVibration([150, 60, 150]);

            // Show native push notification
            const senderName = notification.senderId === notification.buyerId ? notification.buyerName : notification.sellerName;
            showPushNotification({
              title: `💬 New Message from ${senderName}`,
              body: notification.text,
              icon: notification.partImageUrl || "/favicon.ico",
              tag: `chat_${notification.chatId}`,
              onClick: () => {
                setActiveChat(chatObj);
              }
            });
          }
        });

        // Trigger asynchronous updates to mark messages as delivered in the background
        uniqueChatsToMarkDelivered.forEach((chatId) => {
          markMessagesAsDelivered(chatId, currentUser.id);
        });
        
        setUnreadCounts(nextUnreadCounts);
      },
      (err) => {
        console.error("Error subscribing to user notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, activeChat]);

  // Mark notifications as read when viewing an active chat or when new notifications for it arrive
  useEffect(() => {
    if (activeChat && currentUser) {
      markChatNotificationsAsRead(activeChat.id, currentUser.id);
      
      if (activeNotification && activeNotification.chat.id === activeChat.id) {
        setActiveNotification(null);
      }
    }
  }, [activeChat, currentUser, unreadCounts, activeNotification]);

  // 2. Subscribe to Spare Parts in real-time from Firestore / LocalStorage
  useEffect(() => {
    setPartsLoading(true);
    const unsubscribe = subscribeToSpareParts(
      (data) => {
        setParts(data);
        setPartsLoading(false);
      },
      (err) => {
        console.error("Failed to listen to spare parts updates", err);
        setPartsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadPartsData = async () => {
    try {
      const data = await fetchSpareParts();
      setParts(data);
    } catch (err) {
      console.error("Failed to manual load spare parts:", err);
    }
  };

  // 3. Handle Favorite Toggle
  const handleFavoriteToggle = async (partId: string) => {
    if (!currentUser) {
      let updatedFavorites: string[];
      if (favorites.includes(partId)) {
        updatedFavorites = favorites.filter((id) => id !== partId);
      } else {
        updatedFavorites = [...favorites, partId];
      }
      setFavorites(updatedFavorites);
      localStorage.setItem("autoparts_favorites", JSON.stringify(updatedFavorites));
      return;
    }

    try {
      if (favorites.includes(partId)) {
        await removeFavorite(currentUser.id, partId);
      } else {
        await addFavorite(currentUser.id, partId);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // 4. Handle Listing Created
  const handlePublishSuccess = (newPart: SparePart) => {
    // Append to active listings and navigate back to Home feed
    setParts((prevParts) => [newPart, ...prevParts]);
    setActiveTab("home");
  };

  // 5. Handle Listing Deleted
  const handlePartDeleted = async (deletedPartId: string) => {
    setParts((prevParts) => prevParts.filter((p) => p.id !== deletedPartId));
    // Clear from favorites as well if deleted
    if (favorites.includes(deletedPartId)) {
      if (currentUser) {
        try {
          await removeFavorite(currentUser.id, deletedPartId);
        } catch (err) {
          console.error("Failed to remove deleted part from favorites:", err);
        }
      } else {
        const updated = favorites.filter((id) => id !== deletedPartId);
        setFavorites(updated);
        localStorage.setItem("autoparts_favorites", JSON.stringify(updated));
      }
    }
    // Close detailed overlay if it was open and got deleted
    if (detailedPart && detailedPart.id === deletedPartId) {
      setDetailedPart(null);
    }
  };

  // 5b. Handle Profile Update
  const handleUpdateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("autoparts_current_user", JSON.stringify(updatedUser));
    const usersRaw = localStorage.getItem("autoparts_users");
    if (usersRaw) {
      const usersList: any[] = JSON.parse(usersRaw);
      const updatedUsers = usersList.map((u) => 
        u.id === updatedUser.id 
          ? { 
              ...u, 
              name: updatedUser.name, 
              phone: updatedUser.phone, 
              state: updatedUser.state, 
              district: updatedUser.district,
              lat: updatedUser.lat,
              lng: updatedUser.lng 
            } 
          : u
      );
      localStorage.setItem("autoparts_users", JSON.stringify(updatedUsers));
    }

    try {
      await updateUserProfile(updatedUser.id, {
        name: updatedUser.name,
        phone: updatedUser.phone,
        state: updatedUser.state,
        district: updatedUser.district,
        lat: updatedUser.lat,
        lng: updatedUser.lng
      });
    } catch (e) {
      console.error("Failed to update user profile in Firestore:", e);
    }
  };

  // 5c. Handle Toggle Sold Status
  const handleToggleSold = async (partId: string) => {
    const partToToggle = parts.find(p => p.id === partId);
    if (!partToToggle) return;
    const nextSoldState = !partToToggle.sold;

    await updateSparePartListing(partId, { sold: nextSoldState });

    setParts((prevParts) => 
      prevParts.map((p) => p.id === partId ? { ...p, sold: nextSoldState } : p)
    );
    const localData = localStorage.getItem("autoparts_listings");
    if (localData) {
      const list: SparePart[] = JSON.parse(localData);
      const updated = list.map((p) => p.id === partId ? { ...p, sold: nextSoldState } : p);
      localStorage.setItem("autoparts_listings", JSON.stringify(updated));
    }
    // Also update detailedPart if open
    if (detailedPart && detailedPart.id === partId) {
      setDetailedPart((prev) => prev ? { ...prev, sold: nextSoldState } : null);
    }
  };

  // 5d. Handle Update Price Status
  const handleUpdatePrice = async (partId: string, newPrice: number) => {
    await updateSparePartListing(partId, { price: newPrice });
    
    setParts((prevParts) => 
      prevParts.map((p) => p.id === partId ? { ...p, price: newPrice } : p)
    );
    const localData = localStorage.getItem("autoparts_listings");
    if (localData) {
      const list: SparePart[] = JSON.parse(localData);
      const updated = list.map((p) => p.id === partId ? { ...p, price: newPrice } : p);
      localStorage.setItem("autoparts_listings", JSON.stringify(updated));
    }
    // Also update detailedPart if open
    if (detailedPart && detailedPart.id === partId) {
      setDetailedPart((prev) => prev ? { ...prev, price: newPrice } : null);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setLogoutMessage(null);
    setCurrentUser(user);
    // Refresh listing views to pull updated data
    loadPartsData();
  };

  const handleLogout = (msg?: string) => {
    setLogoutMessage(msg || "Signed out successfully.");
    setCurrentUser(null);
    setActiveTab("home");
  };

  const handleStartChat = async (part: SparePart) => {
    if (!currentUser) {
      alert("Please sign in to message sellers.");
      return;
    }
    try {
      const chat = await getOrCreateChat(part, currentUser);
      setActiveChat(chat);
    } catch (err: any) {
      alert(err.message || "Failed to start chat.");
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Brand New":
        return "bg-emerald-500 text-white border-emerald-600";
      case "Like New":
        return "bg-cyan-500 text-white border-cyan-600";
      case "Used (Good)":
        return "bg-amber-500 text-white border-amber-600";
      case "For Scrap/Spares":
        return "bg-rose-500 text-white border-rose-600";
      default:
        return "bg-slate-500 text-white border-slate-600";
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
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 text-slate-900 flex flex-col font-sans select-none relative" id="app-root">
      {authLoading ? (
        // Loading Splash screen
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0B192C] text-white animate-fade-in relative overflow-hidden select-none" id="splash-screen">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center text-center z-10"
          >
            <BrandLogo size="xl" variant="full" theme="dark" showTagline={true} className="mb-6" />
          </motion.div>
          <div className="absolute bottom-12 flex flex-col items-center z-10">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
              Connecting Marketplace...
            </span>
          </div>
        </div>
      ) : !currentUser ? (
        // Login screen
        <AuthScreen 
          onAuthSuccess={handleAuthSuccess} 
          logoutMessage={logoutMessage}
          onClearLogoutMessage={() => setLogoutMessage(null)}
        />
      ) : currentUser.isBlocked ? (
        // Suspended screen
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-800 px-6 text-center select-none" id="suspended-screen">
          <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center shadow-md mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-rose-600">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Account Suspended</h1>
          <p className="text-slate-500 text-xs mt-2 max-w-sm leading-relaxed font-medium">
            Your marketplace account has been suspended by a Super Administrator for policy or terms violations. If you believe this was an error, please contact support.
          </p>
          <button
            onClick={async () => {
              const { signOut: firebaseSignOut } = await import("./lib/firebase");
              await firebaseSignOut();
              handleLogout("Signed out successfully.");
            }}
            className="mt-6 bg-[#0056D2] hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-full text-xs cursor-pointer shadow-md"
          >
            Sign Out
          </button>
        </div>
      ) : showAdminDashboard && (currentUser.email === "wwwautoparts2@gmail.com" || currentUser.email === "ym1950394@gmail.com" || currentUser.isSuperAdmin || currentUser.isAdmin || currentUser.role === "admin") ? (
        <AdminDashboardScreen
          currentUser={currentUser}
          allParts={parts}
          onPartUpdated={async () => {
            const { fetchSpareParts } = await import("./lib/firebase");
            const allParts = await fetchSpareParts();
            setParts(allParts);
          }}
          onBackToApp={() => setShowAdminDashboard(false)}
        />
      ) : (
        // Main App Screen Wrapper
        <div className="flex-1 flex flex-col bg-slate-50 relative h-full overflow-hidden select-none" id="app-shell">
          
          {/* Floating In-App Notifications Banner */}
          <InAppNotification
            notification={activeNotification}
            onClose={() => setActiveNotification(null)}
            onClick={(chat) => {
              setActiveChat(chat);
              setActiveTab("chats");
              setActiveNotification(null);
            }}
          />

          {/* Main Container view switching based on active tab */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                <motion.div
                  key="home-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <HomeScreen 
                    parts={parts} 
                    favorites={favorites}
                    onFavoriteToggle={handleFavoriteToggle} 
                    onStartChat={handleStartChat}
                    currentUser={currentUser}
                  />
                </motion.div>
              )}

              {activeTab === "sell" && (
                <motion.div
                  key="sell-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <SellScreen 
                    currentUser={currentUser} 
                    onPublishSuccess={handlePublishSuccess} 
                    parts={parts}
                  />
                </motion.div>
              )}

              {activeTab === "chats" && (
                <motion.div
                  key="chats-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <ChatsScreen
                    currentUser={currentUser}
                    onSelectChat={(chat) => setActiveChat(chat)}
                    unreadCounts={unreadCounts}
                  />
                </motion.div>
              )}

              {activeTab === "myads" && (
                <motion.div
                  key="myads-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <ProfileScreen
                    currentUser={currentUser}
                    activeTab="myads"
                    onTabChange={(tab) => setActiveTab(tab)}
                    onLogout={handleLogout}
                    parts={parts}
                    favorites={favorites}
                    onPartDeleted={handlePartDeleted}
                    onFavoriteToggle={handleFavoriteToggle}
                    onViewPart={(part) => setDetailedPart(part)}
                    onUpdateUser={handleUpdateUser}
                    onToggleSold={handleToggleSold}
                    onUpdatePrice={handleUpdatePrice}
                    onOpenAdminDashboard={() => setShowAdminDashboard(true)}
                  />
                </motion.div>
              )}

              {activeTab === "account" && (
                <motion.div
                  key="account-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col"
                >
                  <ProfileScreen
                    currentUser={currentUser}
                    activeTab="account"
                    onTabChange={(tab) => setActiveTab(tab)}
                    onLogout={handleLogout}
                    parts={parts}
                    favorites={favorites}
                    onPartDeleted={handlePartDeleted}
                    onFavoriteToggle={handleFavoriteToggle}
                    onViewPart={(part) => setDetailedPart(part)}
                    onUpdateUser={handleUpdateUser}
                    onToggleSold={handleToggleSold}
                    onUpdatePrice={handleUpdatePrice}
                    onOpenAdminDashboard={() => setShowAdminDashboard(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Navigation Tab Bar (Material Design 3 Style) */}
          <nav className="h-16 bg-white border-t border-slate-200 flex items-center justify-around px-1 shrink-0 sticky bottom-0 z-20 shadow-xs select-none">
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab("home")}
              className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
              id="nav-tab-home"
            >
              <div className="relative py-1 px-4 rounded-full transition-colors flex items-center justify-center">
                {activeTab === "home" && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-50 border border-blue-200/60 rounded-full animate-fade-in"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <HomeIcon size={20} className={`relative z-10 transition-colors ${activeTab === "home" ? "text-[#2563EB]" : "text-slate-400 hover:text-slate-600"}`} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight mt-0.5 transition-all ${
                activeTab === "home" ? "text-[#2563EB] font-extrabold" : "text-slate-500"
              }`}>
                Home
              </span>
            </button>

            {/* Chat Tab */}
            <button
              onClick={() => setActiveTab("chats")}
              className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
              id="nav-tab-chats"
            >
              <div className="relative py-1 px-4 rounded-full transition-colors flex items-center justify-center">
                {activeTab === "chats" && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-50 border border-blue-200/60 rounded-full animate-fade-in"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-10">
                  <MessageSquare size={20} className={`transition-colors ${activeTab === "chats" ? "text-[#2563EB]" : "text-slate-400 hover:text-slate-600"}`} />
                  {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-600 text-[8px] text-white font-black h-4 w-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                      {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0)}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-[10px] font-bold tracking-tight mt-0.5 transition-all ${
                activeTab === "chats" ? "text-[#2563EB] font-extrabold" : "text-slate-500"
              }`}>
                Chat
              </span>
            </button>

            {/* Prominent Center Sell Tab */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <div className="absolute -top-5 flex flex-col items-center">
                <button
                  onClick={() => setActiveTab("sell")}
                  className={`h-12 w-12 rounded-full bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center shadow-xs border-2 border-white transform transition-all active:scale-95 cursor-pointer z-30 ${
                    activeTab === "sell" ? "ring-2 ring-blue-200" : ""
                  }`}
                  id="nav-tab-sell"
                >
                  <PlusCircle size={24} className="text-white" />
                </button>
                <span className={`text-[10px] font-extrabold tracking-tight mt-1 transition-all ${
                  activeTab === "sell" ? "text-[#2563EB]" : "text-slate-500"
                }`}>
                  Sell
                </span>
              </div>
            </div>

            {/* My Ads Tab */}
            <button
              onClick={() => setActiveTab("myads")}
              className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
              id="nav-tab-myads"
            >
              <div className="relative py-1 px-4 rounded-full transition-colors flex items-center justify-center">
                {activeTab === "myads" && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-50 border border-blue-200/60 rounded-full animate-fade-in"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Tag size={20} className={`relative z-10 transition-colors ${activeTab === "myads" ? "text-[#2563EB]" : "text-slate-400 hover:text-slate-600"}`} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight mt-0.5 transition-all ${
                activeTab === "myads" ? "text-[#2563EB] font-extrabold" : "text-slate-500"
              }`}>
                My Ads
              </span>
            </button>

            {/* Account Tab */}
            <button
              onClick={() => setActiveTab("account")}
              className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer"
              id="nav-tab-account"
            >
              <div className="relative py-1 px-4 rounded-full transition-colors flex items-center justify-center">
                {activeTab === "account" && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-50 border border-blue-200/60 rounded-full animate-fade-in"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <UserIcon size={20} className={`relative z-10 transition-colors ${activeTab === "account" ? "text-[#2563EB]" : "text-slate-400 hover:text-slate-600"}`} />
              </div>
              <span className={`text-[10px] font-bold tracking-tight mt-0.5 transition-all ${
                activeTab === "account" ? "text-[#2563EB] font-extrabold" : "text-slate-500"
              }`}>
                Account
              </span>
            </button>
          </nav>

          {/* Master Detail Overlay (For clicks outside the home tab e.g. from profile or favorites) */}
          <AnimatePresence>
            {detailedPart && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                className="absolute inset-0 bg-slate-50 z-30 flex flex-col text-slate-900 overflow-hidden"
                id="master-detail-backdrop"
              >
                {/* Custom Toast Alert for sharing link */}
                <AnimatePresence>
                  {showShareToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 10 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg font-bold flex items-center gap-2 z-[99]"
                    >
                      <Sparkles size={14} className="text-amber-400" />
                      <span>Link copied to clipboard!</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sticky Top Header Bar */}
                <div className="sticky top-0 bg-white border-b border-slate-100 px-3.5 py-2.5 flex items-center justify-between z-20 shadow-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetailedPart(null)}
                      className="p-1.5 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-800"
                      id="close-master-detail-btn"
                    >
                      <ArrowLeft size={22} strokeWidth={2.5} />
                    </button>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-xs text-slate-900 tracking-wide uppercase">Ad Details</span>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {detailedPart.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Share Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareUrl = window.location.origin + "?part=" + detailedPart.id;
                        if (navigator.share) {
                          navigator.share({
                            title: detailedPart.title,
                            text: `Check out this ${detailedPart.carBrand} ${detailedPart.carModel} ${detailedPart.title} on Autoparts India!`,
                            url: shareUrl
                          }).catch(() => {
                            navigator.clipboard.writeText(shareUrl);
                            setShowShareToast(true);
                            setTimeout(() => setShowShareToast(false), 2000);
                          });
                        } else {
                          navigator.clipboard.writeText(shareUrl);
                          setShowShareToast(true);
                          setTimeout(() => setShowShareToast(false), 2000);
                        }
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 text-slate-700 cursor-pointer"
                      title="Share"
                    >
                      <Share2 size={20} />
                    </button>

                    {/* Heart/Favorite Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavoriteToggle(detailedPart.id);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-700"
                      title="Favorite"
                    >
                      <Heart
                        size={20}
                        className={favorites.includes(detailedPart.id) ? "fill-red-500 text-red-500 stroke-red-500 animate-pulse" : "text-slate-700"}
                      />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto pb-24 scrollbar-none bg-slate-50">
                  {/* Cover Image Carousel */}
                  {(() => {
                    const imageList: string[] = [];
                    if (detailedPart.imageUrls && detailedPart.imageUrls.length > 0) {
                      detailedPart.imageUrls.forEach(url => {
                        if (url && !imageList.includes(url)) {
                          imageList.push(url);
                        }
                      });
                    } else if (detailedPart.imageUrl) {
                      imageList.push(detailedPart.imageUrl);
                    }

                    // Touch swipe handlers
                    let touchStartX = 0;

                    const handleTouchStartLocal = (e: React.TouchEvent) => {
                      touchStartX = e.touches[0].clientX;
                    };

                    const handleTouchEndLocal = (e: React.TouchEvent) => {
                      const touchEndX = e.changedTouches[0].clientX;
                      const diffX = touchEndX - touchStartX;
                      if (Math.abs(diffX) > 40) {
                        if (diffX > 0) {
                          // swipe right -> previous image
                          setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                        } else {
                          // swipe left -> next image
                          setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                        }
                      }
                    };

                    return (
                      <div 
                        className="h-80 w-full bg-slate-950 relative cursor-pointer group overflow-hidden select-none touch-pan-y flex items-center justify-center border-b border-slate-200"
                        onTouchStart={handleTouchStartLocal}
                        onTouchEnd={handleTouchEndLocal}
                        onClick={() => setIsGalleryOpen(true)}
                        title="Swipe horizontally or click to view gallery"
                      >
                        <AnimatePresence mode="wait">
                          {imageList[detailImageIndex] ? (
                            <motion.img
                              key={detailImageIndex}
                              src={imageList[detailImageIndex]}
                              alt={detailedPart.title}
                              referrerPolicy="no-referrer"
                              initial={{ opacity: 0.85, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0.85, scale: 0.98 }}
                              transition={{ duration: 0.2 }}
                              className="w-full h-full object-contain max-h-80"
                            />
                          ) : (
                            <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-indigo-400 gap-2 p-4">
                              <ImageIcon size={36} className="text-indigo-400/80 animate-pulse" />
                              <span className="text-xs font-bold tracking-wider uppercase opacity-80 text-center">{detailedPart.partName || detailedPart.category}</span>
                            </div>
                          )}
                        </AnimatePresence>

                        {/* Left/Right click arrow buttons for desktop */}
                        {imageList.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                              }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/45 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/45 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </>
                        )}

                        {/* Progress indicators dots or pills */}
                        {imageList.length > 1 && (
                          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 z-10">
                            {imageList.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailImageIndex(idx);
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  idx === detailImageIndex ? "w-4 bg-indigo-500" : "w-1.5 bg-white/45"
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        {/* Image Counter Badge (OLX style) */}
                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xs text-[11px] font-bold text-white px-2.5 py-1 rounded-md tracking-wider font-mono z-10">
                          {detailImageIndex + 1} / {imageList.length}
                        </div>

                        {/* Gallery hint badge (Top Left) */}
                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-[10px] font-black tracking-wider text-white px-2.5 py-1.5 rounded-md flex items-center gap-1 border border-white/10 opacity-90 transition-all z-10">
                          <Maximize2 size={10} className="text-indigo-400 animate-pulse" />
                          VIEW FULLSCREEN
                        </div>

                        {detailedPart.sold && (
                          <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-20">
                            <span className="text-xs font-black tracking-widest text-white bg-rose-600 px-4 py-2 rounded-md uppercase shadow-xl border border-rose-500">
                              SOLD OUT
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-3 mt-3">
                    {/* Price, Title, Location details */}
                    <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                          {formatPrice(detailedPart.price)}
                        </span>
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getConditionColor(detailedPart.condition)}`}>
                          {detailedPart.condition}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 leading-snug tracking-tight">
                        {detailedPart.title}
                      </h3>
                      <div className="h-px bg-slate-100 my-2.5" />
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-bold">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          {detailedPart.district || detailedPart.location}, {detailedPart.state || "All India"}
                        </span>
                        <span>
                          {new Date(detailedPart.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short"
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Key attributes/Specification grid */}
                    <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                        Details & Specifications
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
                        <div className="flex flex-col border-b border-slate-100 pb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Brand</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.carBrand}</span>
                        </div>
                        <div className="flex flex-col border-b border-slate-100 pb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Model Compatibility</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.carModel}</span>
                        </div>
                        <div className="flex flex-col border-b border-slate-100 pb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.category}</span>
                        </div>
                        <div className="flex flex-col border-b border-slate-100 pb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Condition</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.condition}</span>
                        </div>
                        <div className="flex flex-col border-b border-slate-100 pb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">State</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.state || "All India"}</span>
                        </div>
                        <div className="flex flex-col border-b border-slate-100 pb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">District</span>
                          <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.district || "All Districts"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description block */}
                    <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                        Description
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium pt-1">
                        {detailedPart.description}
                      </p>
                    </div>

                    {/* Verified Seller info */}
                    <div 
                      onClick={() => setShowDetailedReviews(true)}
                      className="bg-white p-4 shadow-xs border-y border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full border border-slate-200/80 flex items-center justify-center text-indigo-600 font-bold text-sm uppercase shadow-inner">
                          {detailedPart.contactName.substring(0, 2)}
                        </div>
                        <div>
                          <span className="text-[9px] text-indigo-600 font-black tracking-widest block uppercase leading-none">Verified Seller</span>
                          <h5 className="text-xs font-black text-slate-800 mt-1">{detailedPart.contactName}</h5>
                          
                          {/* Rating details button */}
                          {detailedSellerRating ? (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <Star size={11} className="fill-current text-amber-500" />
                              <span className="text-[10px] text-slate-500 font-bold">
                                {detailedSellerRating.count > 0 ? `${detailedSellerRating.average} (${detailedSellerRating.count} reviews)` : "New Seller (No reviews)"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Click to view reviews</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </div>

                    {/* Map approximate location card */}
                    <div className="bg-white p-4 shadow-xs border-y border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                        Posted In
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                        <MapPin size={14} className="text-indigo-600" />
                        <span>{detailedPart.district || detailedPart.location}, {detailedPart.state || "All India"}</span>
                      </div>
                      <GMap
                        lat={detailedPart.lat}
                        lng={detailedPart.lng}
                        state={detailedPart.state}
                        district={detailedPart.district}
                        height="180px"
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky Bottom Call / Chat Action Bar */}
                <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 flex items-center gap-3 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
                  {currentUser && detailedPart.sellerId === currentUser.id ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingPart(detailedPart);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                        id="edit-own-listing-btn"
                      >
                        Edit Listing
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this listing?")) {
                            try {
                              await deleteSparePartListing(detailedPart.id);
                              setDetailedPart(null);
                            } catch (err: any) {
                              setDeleteError(err.message || "Failed to delete listing.");
                            }
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                        id="delete-own-listing-btn"
                      >
                        Delete Listing
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          if (detailedPart.sold) return;
                          handleStartChat(detailedPart);
                          setDetailedPart(null); // Close the detail drawer so the chat window overlay is visible
                        }}
                        disabled={detailedPart.sold}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                          detailedPart.sold
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                            : "bg-teal-600 hover:bg-teal-500 text-white"
                        }`}
                        id="inapp-chat-btn"
                      >
                        <MessageSquare size={14} />
                        {detailedPart.sold ? t("soldOut") : "Chat Now"}
                      </button>
                      <a
                        href={`tel:${detailedPart.contactPhone}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-md font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] text-center"
                        id="call-seller-btn"
                      >
                        <Phone size={13} />
                        {t("callSeller")}
                      </a>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed Seller Profile View Overlay */}
          <AnimatePresence>
            {showDetailedReviews && detailedPart && (
              <SellerProfileView
                sellerId={detailedPart.sellerId}
                sellerName={detailedPart.contactName}
                currentUser={currentUser}
                onClose={() => setShowDetailedReviews(false)}
                onStartChat={handleStartChat}
                allParts={parts}
                onSelectPart={(part) => setDetailedPart(part)}
              />
            )}
          </AnimatePresence>

          {/* Real-time active Chat room overlay */}
          <AnimatePresence>
            {activeChat && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute inset-0 z-40 bg-slate-50"
              >
                <ChatRoomWindow
                  chat={activeChat}
                  currentUser={currentUser}
                  onClose={() => setActiveChat(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full-screen Image Gallery Modal */}
          <ImageGalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            part={detailedPart}
            initialIndex={detailImageIndex}
          />

          {editingPart && (
            <EditListingModal
              part={editingPart}
              onClose={() => setEditingPart(null)}
              onSave={handleSaveListingChanges}
            />
          )}

          {deleteError && (
            <div className="fixed bottom-4 left-4 right-4 bg-rose-600 text-white p-3 rounded-xl shadow-lg z-50 text-xs flex items-center justify-between">
              <span>{deleteError}</span>
              <button onClick={() => setDeleteError(null)} className="font-bold underline">Dismiss</button>
            </div>
          )}

          {/* App Update Dialog Modal */}
          {showUpdateModal && versionConfig && (
            <UpdateDialogModal
              versionConfig={versionConfig}
              isForceUpdate={isForceUpdate}
              onClose={() => {
                if (!isForceUpdate) {
                  setShowUpdateModal(false);
                }
              }}
            />
          )}

        </div>
      )}
    </div>
  );
}
