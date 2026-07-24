import React, { useState, useEffect } from "react";
import { AlertCircle, ShieldCheck, MessageSquare, CheckCircle2, X, FileText, Lock } from "lucide-react";
import { signInWithGoogle } from "../lib/firebase";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import BrandLogo from "./BrandLogo";

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  logoutMessage?: string | null;
  onClearLogoutMessage?: () => void;
}

export default function AuthScreen({ onAuthSuccess, logoutMessage, onClearLogoutMessage }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLegalModal, setShowLegalModal] = useState<"terms" | "privacy" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(logoutMessage || null);

  // Sync logout message into temporary floating toast with auto-dismiss
  useEffect(() => {
    if (logoutMessage) {
      setToastMessage(logoutMessage);
      const timer = setTimeout(() => {
        setToastMessage(null);
        if (onClearLogoutMessage) onClearLogoutMessage();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [logoutMessage, onClearLogoutMessage]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      console.warn("Google Sign-In notice:", err?.message || err);
      let friendlyMessage = "Failed to sign in with Google. Please try again.";
      const errCode = err?.code;
      const rawMsg = String(err?.message || err || "");

      if (errCode === "auth/popup-closed-by-user") {
        friendlyMessage = "Sign-in window was closed. Please try again.";
      } else if (errCode === "auth/popup-blocked") {
        friendlyMessage = "Sign-in popup was blocked by your browser. Please allow popups for this site.";
      } else if (errCode === "auth/network-request-failed") {
        friendlyMessage = "Network connection failed. Please check your connection and try again.";
      } else if (rawMsg.includes("console.firebase.google.com") || rawMsg.includes("unauthorized-domain")) {
        friendlyMessage = "Google Sign-In is temporarily unavailable. Please try again in a moment.";
      } else if (rawMsg && !rawMsg.includes("http") && !rawMsg.includes("firebase") && !rawMsg.includes("Firebase")) {
        friendlyMessage = rawMsg;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col bg-[#0B192C] justify-between text-slate-100 min-h-screen overflow-y-auto px-4 py-8 sm:px-6 sm:py-12 relative select-none"
      id="auth-screen-container"
    >
      {/* Very Subtle Dark Gradient Base */}
      <div className="absolute inset-0 bg-radial from-[#102444]/40 via-[#0B192C] to-[#071120] pointer-events-none" />

      {/* Floating Logout Snackbar / Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1E293B] border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 max-w-sm w-[90%]"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span className="flex-1 truncate">{toastMessage}</span>
            <button
              onClick={() => {
                setToastMessage(null);
                if (onClearLogoutMessage) onClearLogoutMessage();
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded-full cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Section */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto pt-2 sm:pt-4">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BrandLogo size="xl" variant="full" theme="dark" showTagline={true} className="mb-3" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-slate-300 text-xs sm:text-sm max-w-xs leading-relaxed font-normal"
        >
          India's premium marketplace for genuine automotive spare parts & accessories.
        </motion.p>
      </div>

      {/* Main Login Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="relative z-10 bg-[#0F223D]/90 backdrop-blur-md border border-slate-700/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 max-w-md w-full mx-auto my-6"
      >
        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Sign in to Auto Parts India
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
            Connect directly with verified mechanics, dealers, and sellers across India.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5"
          >
            <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </motion.div>
        )}

        {/* Official Google Sign-In Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-2xl py-3.5 px-5 text-sm flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.98] disabled:opacity-60 cursor-pointer border border-slate-200"
          id="btn-google-signin"
        >
          {loading ? (
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Authenticating...
              </span>
            </div>
          ) : (
            <>
              {/* Official Google 4-Color 'G' Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-bold text-slate-800 tracking-tight text-sm">Sign in with Google</span>
            </>
          )}
        </motion.button>

        {/* Feature Cards Grid */}
        <div className="mt-7 pt-6 border-t border-slate-700/50 grid grid-cols-2 gap-3">
          <motion.div
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#0B1A30] border border-slate-700/70 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Verified Sellers</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Genuine OEM dealers & mechanics</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#0B1A30] border border-slate-700/70 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
              <MessageSquare size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Instant Messaging</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Direct call & real-time chat</p>
            </div>
          </motion.div>
        </div>

        {/* Clickable Legal Footer Links */}
        <div className="text-center text-[11px] text-slate-400 mt-6 leading-relaxed">
          <span>By signing in, you agree to our </span>
          <button
            onClick={() => setShowLegalModal("terms")}
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 cursor-pointer transition-colors"
          >
            Terms of Service
          </button>
          <span> and </span>
          <button
            onClick={() => setShowLegalModal("privacy")}
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 cursor-pointer transition-colors"
          >
            Privacy Policy
          </button>
          <span>.</span>
        </div>
      </motion.div>

      {/* Footer Tag */}
      <div className="relative z-10 text-center pb-2">
        <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">
          Auto Parts India • Secured Marketplace
        </span>
      </div>

      {/* Legal Information Dialog / Modal */}
      <AnimatePresence>
        {showLegalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-[#0F223D] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-200 relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  {showLegalModal === "terms" ? (
                    <FileText className="text-blue-400" size={20} />
                  ) : (
                    <Lock className="text-emerald-400" size={20} />
                  )}
                  <h3 className="text-base font-bold text-white">
                    {showLegalModal === "terms" ? "Terms of Service" : "Privacy Policy"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowLegalModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs leading-relaxed text-slate-300 pr-1">
                {showLegalModal === "terms" ? (
                  <>
                    <p className="font-semibold text-slate-100">Welcome to Auto Parts India.</p>
                    <p>
                      By accessing or using our automotive marketplace, you agree to comply with and be bound by the following terms:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                      <li>Users must accurately describe all listed spare parts, including condition, pricing, and compatibility.</li>
                      <li>Auto Parts India facilitates direct peer-to-peer and dealer listings across India. Buyers are advised to inspect parts prior to completion.</li>
                      <li>Fraudulent listings, counterfeit parts, or spam activities are strictly prohibited and subject to immediate account suspension.</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-slate-100">Your Privacy Matters.</p>
                    <p>
                      Auto Parts India respects your privacy and is committed to protecting your personal data:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                      <li>We use Google Authentication to securely authenticate your identity without storing plain-text passwords.</li>
                      <li>Location data (District/State) is utilized solely to connect you with nearby sellers and mechanics.</li>
                      <li>We do not sell your contact details to third-party advertisers. Chat messages are transmitted securely for transaction communications.</li>
                    </ul>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowLegalModal(null)}
                className="w-full mt-2 bg-[#2563EB] hover:bg-blue-600 text-white font-bold py-2.5 rounded-2xl text-xs transition-colors cursor-pointer"
              >
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
