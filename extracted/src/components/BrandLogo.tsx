import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "horizontal";
  theme?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
}

export default function BrandLogo({
  size = "md",
  variant = "full",
  theme = "dark",
  showTagline = true,
  className = ""
}: BrandLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  const textSizes = {
    sm: "text-xs font-bold",
    md: "text-sm font-extrabold",
    lg: "text-lg font-black",
    xl: "text-xl font-black"
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Emblem Logo Vector SVG */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-[1.02]`}
      >
        <svg viewBox="0 0 1024 1024" fill="none" className="w-full h-full">
          {/* Dynamic Tri-Chevron Delta Node */}
          {/* Top Spark Diamond - Metallic Silver */}
          <path d="M 512 172 L 548 212 L 512 252 L 476 212 Z" fill="#CBD5E1"/>

          {/* Primary Outer Chevron - Royal Blue */}
          <path d="M 512 222 L 812 562 L 712 562 L 512 332 L 312 562 L 212 562 Z" fill="#2563EB"/>

          {/* Secondary Mid Chevron - Royal Blue Dark */}
          <path d="M 512 372 L 732 632 L 642 632 L 512 462 L 382 632 L 292 632 Z" fill="#1D4ED8"/>

          {/* Core Apex Chevron - Pure White on dark theme, Deep Navy on light theme */}
          <path d="M 512 502 L 652 682 L 572 682 L 512 592 L 452 682 L 372 682 Z" fill={theme === "light" ? "#0B192C" : "#FFFFFF"}/>

          {/* Bottom Anchor Node - Metallic Silver */}
          <circle cx="512" cy="742" r="28" fill="#CBD5E1"/>
        </svg>
      </div>

      {/* Brand Name & Tagline */}
      {variant !== "icon" && (
        <div className="flex flex-col">
          <div className={`tracking-tight flex items-center gap-1.5 ${textSizes[size]}`}>
            <span className={theme === "dark" ? "text-white" : "text-[#0B1A30]"}>AUTO PARTS</span>
            <span className="text-white font-extrabold uppercase tracking-wider text-[0.62em] px-1.5 py-0.5 rounded bg-[#2563EB]">
              INDIA
            </span>
          </div>

          {showTagline && (
            <span
              className={`text-[9px] font-semibold tracking-wider uppercase mt-0.5 ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Automotive Marketplace
            </span>
          )}
        </div>
      )}
    </div>
  );
}

