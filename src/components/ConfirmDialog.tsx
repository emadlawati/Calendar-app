"use client";

import Modal from "@/components/Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel, isLoading }: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="sm"
      centerOnMobile
      closeOnBackdrop={false}
      title={<h3 className="heading-font text-lg" style={{ color: "var(--accent)" }}>{title}</h3>}
    >
      <p className="text-sm mb-5" style={{ color: "var(--text-soft)" }}>{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--chip-bg)", color: "var(--chip-text)" }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--danger)", color: "var(--danger-text)" }}>
          {isLoading ? "..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
