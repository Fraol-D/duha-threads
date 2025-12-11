"use client";

import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MobileInstallBanner() {
  const { canInstall, promptInstall, dismissed, markDismissed, isStandalone, isMobile } =
    usePwaInstallPrompt();

  // Only show on mobile, when not standalone, install is available, and not dismissed
  const shouldShow = isMobile && !isStandalone && canInstall && !dismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 inset-x-0 z-50 lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          <div className="mx-3 mb-2 rounded-2xl bg-[--surface]/80 backdrop-blur-md border border-white/10 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Install Duha Threads</p>
                <p className="text-xs text-muted-foreground truncate">
                  Add to your home screen for quick access
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={markDismissed}
                  className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  aria-label="Dismiss install banner"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={promptInstall}
                  className="px-4 py-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                >
                  Install
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
