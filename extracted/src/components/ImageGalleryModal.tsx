import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Hand
} from "lucide-react";
import { SparePart } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: SparePart | null;
  initialIndex?: number;
}

// Fallback category images have been removed to show only user-uploaded images.

export default function ImageGalleryModal({ isOpen, onClose, part, initialIndex = 0 }: ImageGalleryModalProps) {
  if (!isOpen || !part) return null;

  // Build images array
  const images: string[] = [];
  if (part.imageUrls && part.imageUrls.length > 0) {
    part.imageUrls.forEach(url => {
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  } else if (part.imageUrl) {
    images.push(part.imageUrl);
  }

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  // Sync index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex < images.length ? initialIndex : 0);
      resetZoom();
    }
  }, [isOpen, initialIndex, images.length]);

  // Helper to check if coordinates are within an element's bounding rect
  const isCoordinatesInsideElement = (el: HTMLElement | null, x: number, y: number) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle back button presses in browser/android to dismiss the modal instead of navigating back
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ galleryOpen: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.galleryOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsPanning(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(images.length - 1); // loop
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // loop
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = prev - 0.5;
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
        setIsPanning(false);
        return 1;
      }
      return next;
    });
  };

  const toggleDoubleTapZoom = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length]);

  // Touch handlers for swipe & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (e.touches.length === 1) {
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        // Double tap gesture detected!
        toggleDoubleTapZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Single touch - either Swipe or Pan depending on zoom scale
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      if (scale > 1) {
        setIsPanning(true);
        dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      } else {
        setIsDragging(true);
      }
    } else if (e.touches.length === 2) {
      // Multi touch - pinch to zoom setup
      setIsDragging(false);
      setIsPanning(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialPinchDistanceRef.current = distance;
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      if (scale > 1 && isPanning) {
        // Pan image smoothly
        const newX = touch.clientX - dragStartRef.current.x;
        const newY = touch.clientY - dragStartRef.current.y;
        
        // Dynamic boundaries scaling with actual screen space
        const limitX = (scale - 1) * (containerRef.current?.clientWidth || 300) / 2;
        const limitY = (scale - 1) * (containerRef.current?.clientHeight || 400) / 2;
        setPosition({
          x: Math.max(-limitX, Math.min(limitX, newX)),
          y: Math.max(-limitY, Math.min(limitY, newY))
        });
      }
    } else if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      // Pinching
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const ratio = distance / initialPinchDistanceRef.current;
      const newScale = Math.max(1, Math.min(initialScaleRef.current * ratio, 4));
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
        setIsPanning(false);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isDragging && touchStartRef.current && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const diffX = touch.clientX - touchStartRef.current.x;
      const diffY = touch.clientY - touchStartRef.current.y;

      if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
        if (diffX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      } else if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
        // Simple tap gesture. If scale is 1 and tap is outside the image, dismiss modal.
        const isInside = isCoordinatesInsideElement(imageRef.current, touch.clientX, touch.clientY);
        if (scale === 1 && !isInside) {
          onClose();
          return;
        }
      }
    }
    
    // Clean up
    touchStartRef.current = null;
    initialPinchDistanceRef.current = null;
    setIsDragging(false);
  };

  // Mouse drag handlers for desktop panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsPanning(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    } else {
      setIsDragging(true);
      touchStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (scale > 1 && isPanning) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      const limitX = (scale - 1) * (containerRef.current?.clientWidth || 300) / 2;
      const limitY = (scale - 1) * (containerRef.current?.clientHeight || 400) / 2;
      setPosition({
        x: Math.max(-limitX, Math.min(limitX, newX)),
        y: Math.max(-limitY, Math.min(limitY, newY))
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && touchStartRef.current) {
      const diffX = e.clientX - touchStartRef.current.x;
      const diffY = e.clientY - touchStartRef.current.y;
      if (Math.abs(diffX) > 60) {
        if (diffX > 0) {
          handlePrev();
        } else {
          handleNext();
        }
      } else if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
        // Simple click. If scale is 1 and click is outside the image, dismiss modal.
        const isInside = isCoordinatesInsideElement(imageRef.current, e.clientX, e.clientY);
        if (scale === 1 && !isInside) {
          onClose();
          return;
        }
      }
    }
    setIsPanning(false);
    setIsDragging(false);
    touchStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 0.15;
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale(prev => {
      const next = Math.max(1, Math.min(prev + direction * zoomFactor, 4));
      if (next === 1) {
        setPosition({ x: 0, y: 0 });
        setIsPanning(false);
      }
      return next;
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden"
        id="image-gallery-modal-backdrop"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl h-[85vh] sm:h-[80vh] md:h-[85vh] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl"
          id="image-gallery-modal-content"
        >
          {/* Top Header Controls */}
          <div className="px-4 py-3.5 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase leading-none">
                AUTO PARTS GALLERY
              </span>
              <span className="text-xs font-extrabold truncate max-w-[200px] sm:max-w-xs mt-1 text-slate-100">
                {part.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Direct counter */}
              <span className="bg-white/10 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full text-slate-300">
                {currentIndex + 1} of {images.length}
              </span>

              {/* Quick zoom reset indicator */}
              {scale > 1 && (
                <button 
                  onClick={resetZoom}
                  className="p-1.5 bg-indigo-600/85 hover:bg-indigo-600 rounded-xl text-white transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw size={14} />
                </button>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-1.5 bg-white/15 hover:bg-red-600/30 border border-white/5 active:scale-95 rounded-xl transition-all cursor-pointer text-white shadow-md"
                id="gallery-close-btn"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Central Display & Gestures Area */}
          <div 
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onMouseLeave={() => { setIsPanning(false); setIsDragging(false); }}
            className={`flex-1 w-full flex items-center justify-center relative touch-none select-none ${
              scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            }`}
            id="gallery-gesture-stage"
            onDoubleClick={toggleDoubleTapZoom}
          >
            {/* Side navigation arrows - hidden when fully zoomed in */}
            {scale === 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-3.5 p-2 bg-black/50 hover:bg-indigo-600 hover:text-white rounded-full text-white border border-white/5 z-20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                  id="gallery-arrow-left"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-3.5 p-2 bg-black/50 hover:bg-indigo-600 hover:text-white rounded-full text-white border border-white/5 z-20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
                  id="gallery-arrow-right"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}

            {/* Main Displayed Image with Zoom/Position Styling */}
            <div className="overflow-hidden p-2 flex items-center justify-center max-w-full max-h-[60vh] sm:max-h-[55vh] md:max-h-[62vh]">
              <img
                ref={imageRef}
                src={images[currentIndex]}
                alt={`Spare Part ${currentIndex + 1}`}
                decoding="async"
                referrerPolicy="no-referrer"
                className="object-contain max-w-full max-h-[60vh] sm:max-h-[55vh] md:max-h-[62vh] select-none pointer-events-none rounded-lg"
                style={{
                  transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                  transition: isPanning ? "none" : "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>

            {/* Prompt banner shown briefly when scale is 1 to inform user */}
            {scale === 1 && (
              <div className="absolute bottom-4 bg-black/60 text-[9px] font-extrabold tracking-wider text-slate-300 px-3.5 py-1.5 rounded-full uppercase flex items-center gap-1 border border-white/5 select-none pointer-events-none">
                <Hand size={11} className="text-indigo-400" />
                Double click/tap to Zoom · Drag or Swipe
              </div>
            )}
          </div>

          {/* Bottom Panel: Thumbnails Strip + Zoom Controller Toolbar */}
          <div className="bg-gradient-to-t from-black/95 via-black/85 to-transparent px-4 pb-5 pt-4 z-10 flex flex-col gap-3">
            
            {/* Magnification Floating Toolbar */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="p-1.5 bg-white/5 hover:bg-white/15 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              
              <span className="text-[10px] font-mono font-bold text-slate-400 w-12 text-center select-none">
                {scale.toFixed(1)}x
              </span>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="p-1.5 bg-white/5 hover:bg-white/15 disabled:opacity-30 rounded-xl text-white transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>

              <div className="h-4 w-px bg-white/10 mx-1" />

              <button
                onClick={toggleDoubleTapZoom}
                className="p-1.5 bg-white/5 hover:bg-indigo-600/40 rounded-xl text-indigo-400 transition-all cursor-pointer"
                title={scale > 1 ? "Actual Size" : "Zoom Fit"}
              >
                {scale > 1 ? <RotateCcw size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>

            {/* Thumbnails strip */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none max-w-full">
              {images.map((url, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    resetZoom();
                  }}
                  className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 transition-all border ${
                    index === currentIndex 
                      ? "border-indigo-500 scale-105 shadow-md shadow-indigo-500/20" 
                      : "border-white/10 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Thumbnail ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Slide Indicator Dots */}
            <div className="flex justify-center gap-1.5">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? "w-3 bg-indigo-500" : "w-1 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
