import React, { useEffect } from "react";
import { MessageSquare, X, Bell } from "lucide-react";
import { Chat } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface InAppNotificationProps {
  notification: { chat: Chat; text: string; id: string } | null;
  onClose: () => void;
  onClick: (chat: Chat) => void;
}

export default function InAppNotification({ notification, onClose, onClick }: InAppNotificationProps) {
  
  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!notification) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -80, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 15, stiffness: 180 }}
        className="absolute top-3 left-4 right-4 z-50 pointer-events-auto"
        id="in-app-notification-toast"
      >
        <div 
          onClick={() => onClick(notification.chat)}
          className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-3 rounded-2xl shadow-xl border border-slate-850 flex items-center gap-3 cursor-pointer group active:scale-[0.99] transition-all duration-200"
        >
          {/* Glowing Ring Bell/Inquiry Indicator */}
          <div className="relative shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Bell size={18} className="text-indigo-400 animate-bounce" />
            <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>

          {/* Text Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  NEW INQUIRY
                </span>
                <span className="text-[8px] bg-slate-800 text-slate-300 font-extrabold px-1 rounded">
                  MESSAGE
                </span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 font-mono">
                Just now
              </span>
            </div>

            <p className="text-[11px] font-extrabold text-slate-100 truncate mt-0.5">
              {notification.chat.lastSenderId === notification.chat.buyerId ? notification.chat.buyerName : notification.chat.sellerName}
            </p>
            
            <p className="text-[10px] text-slate-300 truncate font-semibold">
              "{notification.text}"
            </p>
            
            <p className="text-[8px] text-slate-400 truncate mt-1 bg-white/5 px-1.5 py-0.5 rounded inline-block max-w-[180px]">
              Regarding: {notification.chat.partTitle} ({formatPrice(notification.chat.partPrice)})
            </p>
          </div>

          {/* Action indicator and close buttons */}
          <div className="flex flex-col items-center justify-between self-stretch pl-1 shrink-0 gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 rounded-full transition-all cursor-pointer"
              title="Dismiss"
              id="close-notification-btn"
            >
              <X size={13} />
            </button>
            
            <span className="text-[9px] text-indigo-400 font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">
              TAP →
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
