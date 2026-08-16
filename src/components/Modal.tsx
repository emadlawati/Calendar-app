"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "./icons";

/**
 * The one true modal scaffold.
 *
 * Structure: backdrop (z-40) → flex-centered overlay (z-50) → modal-shell card
 * with max-height cap → SCROLLABLE inner body. The scroll must live on an
 * inner element — putting it on the shell together with `.modal-shell`'s
 * layout styles is what made the old DetailsModal unscrollable.
 *
 * Also handles what the 10 hand-rolled copies each did slightly differently:
 * body scroll-lock, Escape-to-close, aria dialog attributes, focus handling,
 * and a consistent z-index scale (backdrop 40 < panel 50 < confirm 60 <
 * lightbox 90 < toast 100).
 */

type ModalWidth = "sm" | "md" | "lg";

const WIDTHS: Record<ModalWidth, string> = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[460px]",
  lg: "sm:max-w-[720px]",
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional header row with title + close button. */
  title?: ReactNode;
  /** Header content that replaces the default close button (rare). */
  headerExtra?: ReactNode;
  /** Scrollable body content. */
  children: ReactNode;
  /** Pinned, non-scrolling footer (actions). */
  footer?: ReactNode;
  width?: ModalWidth;
  /** Center on mobile too instead of the bottom-sheet style. */
  centerOnMobile?: boolean;
  /** Body area has no horizontal padding (for edge-to-edge photos). */
  flush?: boolean;
  /** Hide the default close button (when the header renders its own). */
  hideCloseButton?: boolean;
  /** "onPhoto" renders the floating close button white-on-dark (photo headers). */
  closeVariant?: "default" | "onPhoto";
  /** Defaults to true — set false for confirm-style dialogs. */
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  headerExtra,
  children,
  footer,
  width = "md",
  centerOnMobile = false,
  flush = false,
  hideCloseButton = false,
  closeVariant = "default",
  closeOnBackdrop = true,
  ariaLabel,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Body scroll-lock with scrollbar-width compensation so the page doesn't
  // jump when the scrollbar disappears.
  useEffect(() => {
    if (!isOpen) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
      restoreFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const placement = centerOnMobile
    ? "items-center justify-center p-4"
    : "items-end sm:items-center justify-center sm:p-6";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 z-40 modal-backdrop"
          />
          <div className={`fixed inset-0 z-50 flex ${placement} pointer-events-none`}>
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={ariaLabel}
              initial={{ opacity: 0, y: centerOnMobile ? 12 : 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: centerOnMobile ? 12 : 32, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`modal-shell pointer-events-auto w-full ${WIDTHS[width]} rounded-t-[28px] sm:rounded-[28px] max-h-[92vh] sm:max-h-[88vh] outline-none`}
            >
              {title !== undefined && (
                <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3 shrink-0">
                  <div className="min-w-0">{title}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    {headerExtra}
                    {!hideCloseButton && (
                      <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors hover:opacity-80"
                        style={{ color: "var(--text-soft)" }}
                      >
                        <XIcon size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              {title === undefined && !hideCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                  style={
                    closeVariant === "onPhoto"
                      ? { background: "rgba(0,0,0,0.35)", color: "#fff" }
                      : { color: "var(--text-soft)" }
                  }
                >
                  <XIcon size={18} />
                </button>
              )}
              <div
                className={`flex-1 min-h-0 overflow-y-auto ${flush ? "" : "px-6 pb-6"} ${title === undefined && !flush ? "pt-6" : ""}`}
              >
                {children}
              </div>
              {footer && (
                <div
                  className="shrink-0 px-6 py-3.5 border-t"
                  style={{ background: "var(--panel-softer)", borderColor: "var(--divider)" }}
                >
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
