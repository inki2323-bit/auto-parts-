import React, { useState } from "react";
import { Star, X, CheckCircle2 } from "lucide-react";
import { createSellerReview } from "../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  partId?: string;
  partTitle?: string;
  onSuccess?: () => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  buyerId,
  buyerName,
  partId,
  partTitle,
  onSuccess
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createSellerReview({
        sellerId,
        buyerId,
        buyerName,
        rating,
        comment: comment.trim() || "Excellent and prompt transaction!",
        partId,
        partTitle
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setComment("");
        setRating(5);
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Failed to submit seller review:", err);
      setError("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" id="rating-modal-backdrop">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-[28px] w-full max-w-sm overflow-hidden shadow-2xl relative text-slate-900 border border-slate-100"
          id="rating-modal-container"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">Rate Transaction</span>
              <h3 className="text-sm font-extrabold text-white mt-0.5">Review for {sellerName}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              id="close-rating-modal"
            >
              <X size={15} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-3 animate-fade-in">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">Review Submitted!</h4>
                <p className="text-[11px] text-slate-500 max-w-[240px] leading-relaxed">
                  Thank you! Your 1-5 star feedback helps keep our car parts community safe and trustworthy.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold p-3 rounded-xl">
                    {error}
                  </div>
                )}

                {partTitle && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-left">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider block">SPARE PART BOUGHT</span>
                    <span className="text-[10px] font-bold text-slate-700 block truncate mt-0.5">{partTitle}</span>
                  </div>
                )}

                {/* Stars Indicator */}
                <div className="space-y-1.5 text-center">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                    HOW WOULD YOU RATE THE SELLER?
                  </label>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = hoverRating !== null ? star <= hoverRating : star <= rating;
                      return (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="p-1 hover:scale-110 active:scale-95 transition-all text-amber-400 focus:outline-none"
                          id={`star-btn-${star}`}
                        >
                          <Star
                            size={28}
                            fill={isActive ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth={isActive ? 1.5 : 2}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 tracking-wider inline-block mt-1 font-mono">
                    {rating === 5 && "⭐ Outstanding Service!"}
                    {rating === 4 && "⭐ Good Experience!"}
                    {rating === 3 && "⭐ Average Trade"}
                    {rating === 2 && "⭐ Below Average"}
                    {rating === 1 && "⭐ Disappointing Trade"}
                  </span>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block" htmlFor="comment-input">
                    SHARE YOUR EXPERIENCE (OPTIONAL)
                  </label>
                  <textarea
                    id="comment-input"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter a brief comment on payment, pickup, part condition, or coordination..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium leading-relaxed resize-none h-20"
                    maxLength={150}
                  />
                  <div className="text-right text-[8px] text-slate-400 font-mono">
                    {comment.length}/150 characters
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md"
                    id="submit-review-btn"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
