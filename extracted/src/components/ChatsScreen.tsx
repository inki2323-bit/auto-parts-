import React, { useState, useEffect } from "react";
import { MessageSquare, ArrowRight, Compass, Search } from "lucide-react";
import { User, Chat } from "../types";
import { subscribeToUserChats } from "../lib/firebase";
import BrandLogo from "./BrandLogo";

interface ChatsScreenProps {
  currentUser: User;
  onSelectChat: (chat: Chat) => void;
  unreadCounts: Record<string, number>;
}

export default function ChatsScreen({ currentUser, onSelectChat, unreadCounts = {} }: ChatsScreenProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    console.log(`[ChatsScreen] Subscribing to chats for user ${currentUser.id}`);
    const unsubscribe = subscribeToUserChats(
      currentUser.id,
      (data) => {
        console.log(`[ChatsScreen] Chats received in ChatsScreen. Size: ${data.length}`);
        setChats(data);
        setLoading(false);
      },
      (err) => {
        console.error(`[ChatsScreen] Error syncing chats in ChatsScreen:`, err);
        setError(err.message || String(err));
        setLoading(false);
      }
    );
    return () => {
      console.log(`[ChatsScreen] Unsubscribing from chats listener in ChatsScreen`);
      unsubscribe();
    };
  }, [currentUser.id]);

  const filteredChats = chats.filter((chat) => {
    const isUserBuyer = currentUser.id === chat.buyerId;
    const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
    return (
      partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.partTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") {
      const parsed = Date.parse(ts);
      return isNaN(parsed) ? Date.now() : parsed;
    }
    if (typeof ts === "object") {
      if (typeof ts.toMillis === "function") return ts.toMillis();
      if (typeof ts.seconds === "number") return ts.seconds * 1000;
    }
    return Date.now();
  };

  const getRelativeTime = (timestamp: any) => {
    const millis = parseTimestamp(timestamp);
    const difference = Date.now() - millis;
    if (difference < 0) return "Just now";
    const minutes = Math.floor(difference / (60 * 1000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days > 30) return "Recently";
    return `${days}d ago`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full relative" id="chats-screen-container">
      {/* Title Header */}
      <div className="bg-[#0B1220] text-white pt-4 pb-3.5 px-4 sticky top-0 z-10 shadow-xl border-b border-[#18233C]">
        <div className="flex items-center justify-between mb-3">
          <BrandLogo size="sm" variant="horizontal" theme="dark" showTagline={false} />
          <span className="text-[10px] font-extrabold bg-[#2563EB]/20 text-[#60A5FA] px-2.5 py-1 rounded-full border border-[#2563EB]/30 uppercase tracking-wider">
            Instant Messages
          </span>
        </div>
        
        {/* Custom Inbox Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages by name or spare part..."
            className="w-full bg-[#131D31] border border-[#1E2D4A] rounded-2xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] font-medium transition-all"
            id="chats-search-input"
          />
        </div>
      </div>

      {/* Main Lists Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {error ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-red-50 rounded-3xl border border-red-100 shadow-sm" id="chats-error">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3 text-lg font-black">
              ⚠
            </div>
            <h4 className="text-xs font-extrabold text-red-800">Failed to Sync Chats</h4>
            <p className="text-[11px] text-red-600 mt-1 max-w-xs leading-relaxed font-semibold">
              {error}
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm" id="chats-empty">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
              <MessageSquare size={28} />
            </div>
            <h4 className="text-xs font-extrabold text-slate-800">No active conversations yet</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              When you contact a spare part seller or a buyer messages your ad, your chats will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5" id="chats-list">
            {filteredChats.map((chat) => {
              const isUserBuyer = currentUser.id === chat.buyerId;
              const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
              const unreadCount = unreadCounts[chat.id] || 0;

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className="bg-white hover:bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-200 shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-3.5 relative group"
                  id={`chat-item-${chat.id}`}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-200 relative">
                    {chat.partImageUrl ? (
                      <img src={chat.partImageUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <MessageSquare size={18} />
                      </div>
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate font-display">
                        {partnerName}
                      </span>
                      <span className="text-[9px] font-mono font-semibold text-slate-400 shrink-0">
                        {getRelativeTime(chat.updatedAt)}
                      </span>
                    </div>

                    <div className="text-[10px] font-bold text-indigo-600 truncate mt-0.5">
                      {chat.partTitle}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[11px] text-slate-500 truncate line-clamp-1">
                        {chat.lastMessage || "Click to open chat conversation..."}
                      </span>

                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
