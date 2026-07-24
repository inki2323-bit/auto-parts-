import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, ShoppingBag, Check, CheckCheck, ImageIcon, Loader2, AlertCircle, X, ZoomIn } from "lucide-react";
import { User, Chat, Message } from "../types";
import { 
  subscribeToChatMessages, 
  sendChatMessage, 
  markMessagesAsRead, 
  setTypingStatus, 
  subscribeToTypingStatus,
  subscribeToUserPresence,
  uploadProductImage
} from "../lib/firebase";
import { compressImageFile } from "../utils/imageCompressor";

interface ChatRoomWindowProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
}

export default function ChatRoomWindow({ chat, currentUser, onClose }: ChatRoomWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState<{ online: boolean; lastSeen: number }>({
    online: false,
    lastSeen: Date.now()
  });
  const [failedMessageQueue, setFailedMessageQueue] = useState<Array<{ id: string; text: string; imageUrl?: string }>>([]);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine other participant's details
  const isUserBuyer = currentUser.id === chat.buyerId;
  const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
  const partnerId = isUserBuyer ? chat.sellerId : chat.buyerId;
  const partnerRole = isUserBuyer ? "Seller" : "Buyer";

  // 1. Subscribe to real-time chat messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(chat.id, (msgs) => {
      setMessages(msgs);
      
      // Mark unread messages from the other user as read
      const hasUnread = msgs.some(m => m.senderId !== currentUser.id && m.status !== "read");
      if (hasUnread) {
        markMessagesAsRead(chat.id, currentUser.id);
      }
    });
    return () => unsubscribe();
  }, [chat.id, currentUser.id]);

  // 2. Subscribe to partner's typing status
  useEffect(() => {
    const unsubscribe = subscribeToTypingStatus(chat.id, partnerId, (isTyping) => {
      setPartnerIsTyping(isTyping);
    });
    return () => unsubscribe();
  }, [chat.id, partnerId]);

  // 3. Subscribe to partner's online/offline presence
  useEffect(() => {
    const unsubscribe = subscribeToUserPresence(partnerId, (presence) => {
      setPartnerPresence(presence);
    });
    return () => unsubscribe();
  }, [partnerId]);

  // 4. Handle auto-retry when network comes back online
  useEffect(() => {
    const handleOnline = () => {
      if (failedMessageQueue.length > 0) {
        failedMessageQueue.forEach((item) => {
          retrySendMessage(item.id, item.text, item.imageUrl);
        });
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [failedMessageQueue]);

  // 5. Scroll to bottom on new messages, typing state, or image preview
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerIsTyping, isUploadingImage]);

  // Handle typing input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Notify backend that current user is typing
    if (val.trim()) {
      setTypingStatus(chat.id, currentUser.id, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(chat.id, currentUser.id, false);
      }, 2500);
    } else {
      setTypingStatus(chat.id, currentUser.id, false);
    }
  };

  const executeSend = async (msgText: string, imageUrl?: string, existingTempId?: string) => {
    const tempId = existingTempId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Add optimistic message to state if not retrying
    if (!existingTempId) {
      const optimisticMsg: Message = {
        id: tempId,
        senderId: currentUser.id,
        text: msgText || (imageUrl ? "📷 Photo" : ""),
        createdAt: Date.now(),
        status: "pending",
        ...(imageUrl ? { imageUrl } : {})
      };
      setMessages(prev => [...prev.filter(m => m.id !== tempId), optimisticMsg]);
    }

    try {
      await sendChatMessage(chat.id, currentUser.id, msgText, chat, imageUrl);
      setTypingStatus(chat.id, currentUser.id, false);
      setFailedMessageQueue(prev => prev.filter(item => item.id !== tempId));
    } catch (err) {
      console.error("Failed to send chat message:", err);
      // Mark message as failed in UI state
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
      setFailedMessageQueue(prev => {
        if (!prev.some(item => item.id === tempId)) {
          return [...prev, { id: tempId, text: msgText, imageUrl }];
        }
        return prev;
      });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !isUploadingImage) || isSending) return;

    const msgText = inputText.trim();
    setInputText("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTypingStatus(chat.id, currentUser.id, false);
    setIsSending(true);

    try {
      await executeSend(msgText);
    } finally {
      setIsSending(false);
    }
  };

  const retrySendMessage = async (tempId: string, text: string, imageUrl?: string) => {
    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "pending" } : m));
    await executeSend(text, imageUrl, tempId);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // Compress client-side first
      const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.85);
      // Upload to Cloudinary
      const cloudinaryUrl = await uploadProductImage(compressedBase64);
      // Send image message
      await executeSend("", cloudinaryUrl);
    } catch (err: any) {
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  const formatMessageTime = (ts: any) => {
    const millis = parseTimestamp(ts);
    try {
      return new Date(millis).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Just now";
    }
  };

  const getRelativePresenceTime = (lastSeen: number) => {
    if (!lastSeen) return "Offline";
    const diff = Math.floor((Date.now() - lastSeen) / 1000);
    if (diff < 60) return "Active just now";
    if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
    return `Last seen ${Math.floor(diff / 86400)}d ago`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="absolute inset-0 bg-slate-50 flex flex-col z-40" id={`chat-room-${chat.id}`}>
      {/* Top Header Bar */}
      <div className="bg-[#0B1220] text-white pt-4 pb-3.5 px-4 flex items-center gap-3 shadow-md border-b border-[#18233C] shrink-0">
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-[#18233C] rounded-full transition-colors text-slate-300 hover:text-white cursor-pointer"
          id="chat-back-btn"
        >
          <ArrowLeft size={18} />
        </button>
        
        {/* Partner Name & Role & Presence Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-extrabold text-xs text-white truncate">{partnerName}</h3>
            <span className="text-[8px] bg-[#2563EB]/25 text-[#60A5FA] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
              {partnerRole}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${partnerPresence.online ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            <p className="text-[10px] text-slate-300 font-medium truncate">
              {partnerIsTyping ? (
                <span className="text-sky-400 font-bold flex items-center gap-1">
                  Typing
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 bg-sky-400 rounded-full animate-ping" />
                    <span className="w-1 h-1 bg-sky-400 rounded-full animate-ping delay-100" />
                  </span>
                </span>
              ) : partnerPresence.online ? (
                <span className="text-emerald-400 font-semibold">Online</span>
              ) : (
                getRelativePresenceTime(partnerPresence.lastSeen)
              )}
            </p>
          </div>
        </div>

        {/* Partner Avatar */}
        <div className="w-9 h-9 bg-[#2563EB]/25 text-[#60A5FA] border border-[#2563EB]/30 rounded-full flex items-center justify-center font-extrabold text-xs uppercase shrink-0 relative">
          {partnerName.substring(0, 2)}
          {partnerPresence.online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0B1220]" />
          )}
        </div>
      </div>

      {/* Linked product bar */}
      <div className="bg-white border-b border-slate-100 p-2.5 flex items-center gap-2.5 shadow-xs shrink-0">
        <img 
          src={chat.partImageUrl} 
          alt={chat.partTitle} 
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0" 
        />
        <div className="flex-1 min-w-0">
          <span className="text-[8px] font-black text-indigo-600 tracking-wider uppercase block">INQUIRY ABOUT</span>
          <h4 className="text-[11px] font-bold text-slate-800 truncate leading-snug">{chat.partTitle}</h4>
          <span className="text-[10px] font-black text-slate-900 font-mono">{formatPrice(chat.partPrice)}</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-extrabold border border-emerald-100">
            Active Chat
          </span>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col bg-slate-50/80">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-indigo-500">
              <ShoppingBag size={20} />
            </div>
            <p className="text-[11px] font-extrabold text-slate-700">Start the Conversation</p>
            <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
              Ask about condition, price negotiation, pick up details or fitment compatibility.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isFailed = msg.status === "failed";
            const isPending = msg.status === "pending";

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
              >
                <div 
                  className={`p-3 rounded-2xl text-xs leading-relaxed font-medium shadow-xs break-words relative group ${
                    isMe 
                      ? isFailed
                        ? "bg-rose-500 text-white rounded-tr-none"
                        : "bg-[#2563EB] text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none"
                  }`}
                >
                  {/* Optional Image attachment */}
                  {msg.imageUrl && (
                    <div 
                      onClick={() => setSelectedPreviewImage(msg.imageUrl || null)}
                      className="mb-2 rounded-xl overflow-hidden border border-black/10 cursor-pointer relative group/img max-w-xs"
                    >
                      <img 
                        src={msg.imageUrl} 
                        alt="Shared attachment" 
                        loading="lazy" 
                        decoding="async" 
                        className="w-full max-h-56 object-cover rounded-xl hover:opacity-95 transition-opacity" 
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <ZoomIn size={18} />
                      </div>
                    </div>
                  )}

                  {msg.text && <div>{msg.text}</div>}
                </div>

                {/* Footer time and checkmark status */}
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="text-[8px] text-slate-400 font-bold font-mono">
                    {formatMessageTime(msg.createdAt)}
                  </span>

                  {isMe && (
                    <span className="shrink-0 flex items-center gap-1">
                      {isPending ? (
                        <Loader2 size={10} className="animate-spin text-slate-400" />
                      ) : isFailed ? (
                        <button 
                          onClick={() => retrySendMessage(msg.id, msg.text, msg.imageUrl)}
                          className="flex items-center gap-0.5 text-rose-500 hover:text-rose-600 font-black text-[9px]"
                          title="Tap to retry"
                        >
                          <AlertCircle size={11} />
                          <span>Retry</span>
                        </button>
                      ) : msg.status === "read" ? (
                        <CheckCheck size={12} className="text-sky-500 font-black" title="Seen" />
                      ) : msg.status === "delivered" ? (
                        <CheckCheck size={12} className="text-slate-400 font-black" title="Delivered" />
                      ) : (
                        <Check size={12} className="text-slate-400 font-black" title="Sent" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {partnerIsTyping && (
          <div className="self-start bg-white p-2.5 px-3 rounded-2xl rounded-tl-none border border-slate-200/80 shadow-xs flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-semibold">{partnerName} is typing</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
          </div>
        )}

        {/* Uploading image progress indicator */}
        {isUploadingImage && (
          <div className="self-end bg-[#2563EB]/10 p-3 rounded-2xl rounded-tr-none border border-[#2563EB]/20 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-indigo-600" />
            <span className="text-[10px] font-bold text-indigo-700">Uploading photo to Cloudinary...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hidden File Input for Image Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageFileSelect} 
        accept="image/*" 
        className="hidden" 
        id="chat-file-input"
      />

      {/* Message Input Composer */}
      <form 
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 sticky bottom-0 z-10 shadow-md shrink-0"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingImage || isSending}
          className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          title="Share Photo"
          id="chat-attach-photo-btn"
        >
          <ImageIcon size={18} />
        </button>

        <input 
          type="text" 
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type your message here..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-full py-2.5 px-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
          maxLength={500}
          id="chat-message-input"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !isUploadingImage) || isSending}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-full transition-colors shrink-0 flex items-center justify-center shadow-sm cursor-pointer"
          id="chat-send-btn"
        >
          {isSending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} className={inputText.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
          )}
        </button>
      </form>

      {/* Fullscreen Image View Modal */}
      {selectedPreviewImage && (
        <div 
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm cursor-pointer"
        >
          <button 
            onClick={() => setSelectedPreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <img 
            src={selectedPreviewImage} 
            alt="Full view" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
          />
        </div>
      )}
    </div>
  );
}
