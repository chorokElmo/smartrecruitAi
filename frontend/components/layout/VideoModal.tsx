"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";

export function VideoModal() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause video when closed
  useEffect(() => {
    if (!open) videoRef.current?.pause();
    else videoRef.current?.play().catch(() => {});
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Voir la démo"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 h-11 pl-3 pr-4 rounded-full gradient-bg shadow-lg shadow-primary/30 text-white text-sm font-semibold hover:scale-105 active:scale-95 transition-transform"
        style={{ boxShadow: "0 0 0 4px rgba(107,78,255,0.15), 0 8px 24px rgba(107,78,255,0.35)" }}
      >
        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Play className="w-3 h-3 fill-white text-white ml-0.5" />
        </span>
        Voir la démo
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Video */}
              <video
                ref={videoRef}
                src="/demo.mp4"
                controls
                playsInline
                className="w-full max-h-[80vh] object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
