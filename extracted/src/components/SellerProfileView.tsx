import React, { useState, useEffect } from "react";
import { 
  Star, X, MessageSquare, Phone, ShieldCheck, Calendar, 
  MapPin, ChevronRight, Award, Package, CheckCircle, Image as ImageIcon
} from "lucide-react";
import { User, SparePart, SellerReview } from "../types";
import { fetchSellerReviews, fetchUserProfile } from "../lib/firebase";
import SellerReviewsView from "./SellerReviewsView";
import { motion, AnimatePresence } from "motion/react";

interface SellerProfileViewProps {
  sellerId: string;
  sellerName: string;
  currentUser: User | null;
  onClose: () => void;
  onStartChat?: (part: SparePart) => void;
  allParts: SparePart[];
  onSelectPart?: (part: SparePart) => void;
}

export default function SellerProfileView({
  sellerId,
  sellerName,
  currentUser,
  onClose,
  onStartChat,
  allParts,
  onSelectPart
}: SellerProfileViewProps) {
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [sellerProfile, setSellerProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewsOverlay, setShowReviewsOverlay] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const [reviewsData, profileData] = await Promise.all([
          fetchSellerReviews(sellerId),
          fetchUserProfile(sellerId)
        ]);
        setReviews(reviewsData);
        setSellerProfile(profileData);
      } catch (err) {
        console.error("Failed to load seller profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();

    const handleReviewsUpdated = async () => {
      try {
        const reviewsData = await fetchSellerReviews(sellerId);
        setReviews(reviewsData);
      } catch (err) {
        console.warn("Failed to reload reviews:", err);
      }
    };

    window.addEventListener("autoparts_reviews_updated", handleReviewsUpdated);
    return () => {
      window.removeEventListener("autoparts_reviews_updated", handleReviewsUpdated);
    };
  }, [sellerId]);

  // Statistics calculations
  const sellerParts = allParts.filter(p => p.sellerId === sellerId);
  const activeAds = sellerParts.filter(p => !p.sold);
  const soldAds = sellerParts.filter(p => p.sold);

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  // Formatting date nicely
  const getJoinedDate = () => {
    const ts = sellerProfile?.createdAt || (sellerParts.length > 0 ? sellerParts[sellerParts.length - 1].createdAt : null);
    if (ts) {
      try {
        const date = new Date(ts);
        return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      } catch (e) {
        return "January 2026";
      }
    }
    return "January 2026";
  };

  // Avatar initials & consistent gradient color
  const getInitials = (name: string) => {
    return name.trim().split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  const getAvatarGradient = (id: string) => {
    const colors = [
      "from-indigo-500 to-sky-500",
      "from-violet-600 to-indigo-600",
      "from-teal-500 to-emerald-500",
      "from-pink-500 to-rose-500",
      "from-amber-500 to-orange-500"
    ];
    const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Any single active part to pass for initiating chat
  const refPart = activeAds[0] || sellerParts[0];

  const handlePartClick = (part: SparePart) => {
    if (onSelectPart) {
      onSelectPart(part);
      onClose(); // Close the profile view so they see the selected part detail
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-45 animate-fade-in select-none" id="seller-profile-view-root">
      {/* Top Header */}
      <div className="bg-slate-900 text-white py-4 px-4 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-400" />
          <div>
            <span className="text-[8px] font-black tracking-widest text-indigo-400 uppercase">Verified Seller</span>
            <h3 className="text-sm font-extrabold text-white mt-0.5">Seller Profile</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors"
          id="close-profile-view-btn"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fetching Profile...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Seller Info Card */}
            <div className="bg-white p-5 border-b border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className={`w-20 h-20 bg-gradient-to-tr ${getAvatarGradient(sellerId)} rounded-full flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-white`}>
                {getInitials(sellerName)}
              </div>
              
              <div className="mt-3 flex items-center gap-1.5">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">{sellerName}</h2>
                <span className="bg-indigo-50 text-indigo-600 p-0.5 rounded-full" title="Verified Marketplace Seller">
                  <ShieldCheck size={14} className="fill-current text-indigo-600" />
                </span>
              </div>

              {/* Verified Badge and Location */}
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                <Award size={12} className="text-amber-500" />
                <span>Verified Autoparts Seller</span>
              </p>

              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 font-semibold flex-wrap justify-center">
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Joined {getJoinedDate()}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>{sellerProfile?.district || refPart?.district || "All India"}, {sellerProfile?.state || refPart?.state || ""}</span>
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="px-4">
              <div className="grid grid-cols-3 gap-3">
                
                {/* Rating Block (Clickable) */}
                <button
                  onClick={() => setShowReviewsOverlay(true)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center text-center hover:bg-slate-50 active:scale-95 transition-all"
                  id="profile-reviews-btn"
                >
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star size={14} className="fill-current" />
                    <span className="text-sm font-black text-slate-800">{averageRating > 0 ? averageRating : "N/A"}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">
                    {totalReviews > 0 ? `${totalReviews} Reviews` : "No Reviews"}
                  </span>
                </button>

                {/* Active Ads Block */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center text-center">
                  <span className="text-sm font-black text-slate-800">{activeAds.length}</span>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 flex items-center gap-0.5 justify-center">
                    <Package size={10} className="text-indigo-500" />
                    Active Ads
                  </span>
                </div>

                {/* Sold Ads Block */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center text-center">
                  <span className="text-sm font-black text-slate-800">{soldAds.length}</span>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase mt-1 flex items-center gap-0.5 justify-center">
                    <CheckCircle size={10} className="text-teal-500" />
                    Sold Ads
                  </span>
                </div>

              </div>
            </div>

            {/* Tap Ratings & Reviews shortcut line */}
            <div className="px-4">
              <button 
                onClick={() => setShowReviewsOverlay(true)}
                className="w-full bg-indigo-50/60 hover:bg-indigo-50 transition-colors p-3 rounded-2xl flex items-center justify-between border border-indigo-100/40 text-left"
                id="profile-ratings-shortcut"
              >
                <div className="flex items-center gap-2">
                  <Star size={15} className="text-indigo-600 fill-indigo-600/25" />
                  <div>
                    <p className="text-xs font-black text-indigo-900">Ratings & Reviews</p>
                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Click to read honest feedback and write a review</p>
                  </div>
                </div>
                <ChevronRight size={15} className="text-indigo-500" />
              </button>
            </div>

            {/* Quick Contact Panel */}
            <div className="px-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact Seller</h4>
                
                <div className="flex gap-2">
                  {onStartChat && refPart && (
                    <button
                      onClick={() => {
                        if (refPart.sold) return;
                        onStartChat(refPart);
                        onClose(); // Close profile view so chat room window shows nicely
                      }}
                      disabled={refPart.sold}
                      className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      id="profile-chat-action-btn"
                    >
                      <MessageSquare size={14} />
                      Chat Now
                    </button>
                  )}

                  {refPart?.contactPhone && (
                    <a
                      href={`tel:${refPart.contactPhone}`}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all text-center cursor-pointer"
                      id="profile-call-action-btn"
                    >
                      <Phone size={13} />
                      Call Seller
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Seller Ads listings list */}
            <div className="px-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Listings from this Seller</span>
                  <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {sellerParts.length}
                  </span>
                </h3>
              </div>

              {sellerParts.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center space-y-2">
                  <Package size={24} className="text-slate-300" />
                  <p className="text-xs text-slate-400 font-bold">No listed spare parts found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3" id="seller-parts-grid">
                  {sellerParts.map((part) => (
                    <div
                      key={part.id}
                      onClick={() => handlePartClick(part)}
                      className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer relative"
                      id={`seller-part-card-${part.id}`}
                    >
                      {/* Image */}
                      <div className="h-24 w-full bg-slate-100 relative overflow-hidden">
                        {part.imageUrl ? (
                          <img
                            src={part.imageUrl}
                            alt={part.title}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-indigo-400 p-2">
                            <ImageIcon size={18} className="text-indigo-400/85" />
                            <span className="text-[8px] font-bold uppercase text-center line-clamp-1 mt-1">
                              {part.partName || part.category}
                            </span>
                          </div>
                        )}

                        {part.sold && (
                          <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center z-10">
                            <span className="text-[8px] font-black tracking-widest text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase">
                              SOLD
                            </span>
                          </div>
                        )}

                        <div className="absolute top-1.5 left-1.5">
                          <span className="text-[8px] font-black tracking-wider px-1 py-0.5 rounded bg-slate-900/75 text-white backdrop-blur-xs uppercase border border-white/10">
                            {part.condition}
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2 flex-1 flex flex-col justify-between space-y-1 bg-white">
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
                            {part.title}
                          </h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 truncate font-medium">
                            {part.carBrand} • {part.carModel}
                          </p>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100/80">
                          <span className="text-xs font-black text-indigo-600">
                            ₹{part.price.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Ratings & Reviews Overlay triggered from Seller Profile */}
      <AnimatePresence>
        {showReviewsOverlay && (
          <SellerReviewsView
            sellerId={sellerId}
            sellerName={sellerName}
            currentUser={currentUser}
            onClose={() => setShowReviewsOverlay(false)}
            currentPart={refPart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
