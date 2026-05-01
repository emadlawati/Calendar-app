"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarHeart, Clock, MessageSquare, User, Check, Edit2, Trash2, Archive, RotateCcw } from "lucide-react";
import { useUser } from "@/components/UserProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { CalendarEvent } from "@/lib/types";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event: CalendarEvent | null;
}

export default function DetailsModal({ isOpen, onClose, onSuccess, event }: DetailsModalProps) {
  const { currentUser } = useUser();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  if (!event) return null;

  const isPartner = event.createdBy !== currentUser;
  const isPending = event.status === "pending";

  const handleAction = async (action: string) => {
    try {
      if (action === 'delete') setIsDeleting(true);
      
      const res = await fetch('/api/events/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          eventId: event.id
        })
      });
      if (res.ok) {
        setShowConfirmDelete(false);
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(`${action} Error:`, err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    handleAction('delete');
  };

  const handleAdjust = () => {
    router.push(`/events/adjust?id=${event.id}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-text-dark/20 backdrop-blur-md z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 p-8 plush-card"
          >
            {/* Cat Ear Motifs */}
            <div className="absolute -top-4 -left-1 w-10 h-10 bg-white rotate-45 rounded-tl-2xl border-t border-l border-latte-brown/20" />
            <div className="absolute -top-4 -right-1 w-10 h-10 bg-white rotate-45 rounded-tr-2xl border-t border-r border-latte-brown/20" />

            <button onClick={onClose} className="absolute top-4 right-4 text-latte-brown hover:text-text-dark transition-colors z-10 p-2">
              <X size={24} />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blush-pink rounded-2xl shadow-sm">
                  <CalendarHeart className="text-text-dark" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-sniglet text-text-dark leading-none">Plan Details</h2>
                  <p className="text-xs font-quicksand font-bold text-text-dark/40 uppercase tracking-widest mt-1">Meow! Check it out 🐾</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-milk-white/50 p-4 rounded-3xl border border-soft-peach">
                  <h3 className="text-xl font-bold font-sniglet text-text-dark">{event.title}</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-text-dark/80">
                    <div className="w-10 h-10 rounded-2xl bg-soft-peach/50 flex items-center justify-center shadow-sm">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold opacity-40">When</p>
                      <span className="font-quicksand font-bold text-sm">
                        {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} @ {event.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-text-dark/80">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${event.createdBy === 'Wife' ? 'bg-wife-pink' : 'bg-husband-blue'}`}>
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold opacity-40">Proposed By</p>
                      <span className="font-quicksand font-bold text-sm">{event.createdBy}</span>
                    </div>
                  </div>

                  {event.notes && (
                    <div className="flex gap-4 text-text-dark/80">
                      <div className="w-10 h-10 rounded-2xl bg-latte-brown/20 flex items-center justify-center shrink-0 shadow-sm">
                        <MessageSquare size={20} />
                      </div>
                      <div className="bg-white p-4 rounded-3xl border border-latte-brown/10 flex-1 relative">
                        <div className="absolute -left-2 top-4 w-4 h-4 bg-white rotate-45 border-l border-b border-latte-brown/10" />
                        <p className="text-sm font-quicksand leading-relaxed italic relative z-10">"{event.notes}"</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                   <div className={`text-[10px] px-4 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-sm ${
                     event.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-latte-brown text-white'
                   }`}>
                     {event.status} 🐾
                   </div>

                   <div className="flex items-center gap-2">
                     <button 
                      onClick={() => handleAction(event.archived ? 'unarchive' : 'archive')}
                      className={`transition-colors p-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${
                        event.archived 
                          ? 'text-green-600 hover:text-green-700' 
                          : 'text-latte-brown hover:text-text-dark'
                      }`}
                     >
                       {event.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                       {event.archived ? 'Unarchive' : 'Archive'}
                     </button>
                     <button 
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="text-latte-brown hover:text-red-400 transition-colors p-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                     >
                       <Trash2 size={16} />
                       Delete
                     </button>
                   </div>
                </div>

                {isPartner && isPending && (
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction('accept')}
                      className="bg-blush-pink text-text-dark font-sniglet py-4 rounded-2xl shadow-plush flex items-center justify-center gap-2 border-2 border-white"
                    >
                      <Check size={20} />
                      Accept
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAdjust}
                      className="bg-soft-peach text-text-dark font-sniglet py-4 rounded-2xl shadow-plush flex items-center justify-center gap-2 border-2 border-white"
                    >
                      <Edit2 size={20} />
                      Adjust
                    </motion.button>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full mt-8 text-latte-brown/60 font-sniglet hover:text-text-dark transition-colors text-sm uppercase tracking-widest"
              >
                Go Back 🧶
              </button>
            </div>
          </motion.div>

          <ConfirmDialog
            isOpen={showConfirmDelete}
            onClose={() => setShowConfirmDelete(false)}
            onConfirm={confirmDelete}
            title="Delete Plan?"
            message="Are you sure you want to delete this plan? This can't be undone, meow! 🐾"
            confirmLabel="Delete"
            isLoading={isDeleting}
          />
        </>
      )}
    </AnimatePresence>
  );
}
