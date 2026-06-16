"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Pause, Play, ChevronLeft, ChevronRight, Heart } from "lucide-react";

const TOTAL = 20;

export default function BirthdaySlideshow() {
  const [current, setCurrent] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev >= TOTAL ? 1 : prev + 1));
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev <= 1 ? TOTAL : prev - 1));
  }, []);

  // Autoplay
  useEffect(() => {
    if (!isPlaying || !isLoaded) return;
    const timer = setInterval(next, 3000);
    return () => clearInterval(timer);
  }, [isPlaying, isLoaded, next]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "p") setIsPlaying((p) => !p);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #fef5fb 0%, #fce4ec 50%, #fff0f5 100%)" }}
    >
      {/* Decorative hearts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {[...Array(12)].map((_, i) => (
          <Heart
            key={i}
            size={20 + Math.random() * 30}
            fill="#e91e63"
            color="transparent"
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${6 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm font-medium z-10 transition-opacity hover:opacity-70"
        style={{ color: "#e91e63" }}
      >
        <ArrowLeft size={16} />
        Calendar
      </Link>

      {/* Header */}
      <div className="text-center mb-8 z-10">
        <h1
          className="text-3xl sm:text-4xl mb-2"
          style={{ fontFamily: "var(--font-caprasimo), cursive", color: "#e91e63" }}
        >
          🎂 Happy Birthday 🎉
        </h1>
        <p className="text-sm opacity-70" style={{ color: "#5d1a3a" }}>
          A little slideshow just for you 💕
        </p>
      </div>

      {/* Main image */}
      <div className="relative w-full max-w-2xl z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
            style={{ boxShadow: "0 30px 80px -20px rgba(233, 30, 99, 0.3)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/birthday/${current}.jpg`}
              alt={`Birthday memory ${current}`}
              className="w-full aspect-[4/3] object-cover"
              onLoad={() => setIsLoaded(true)}
            />

            {/* Nav arrows */}
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ background: "rgba(0,0,0,0.3)", color: "#fff" }}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ background: "rgba(0,0,0,0.3)", color: "#fff" }}
            >
              <ChevronRight size={22} />
            </button>

            {/* Counter badge */}
            <div
              className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
            >
              {current} / {TOTAL}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls bar */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "rgba(233, 30, 99, 0.1)", color: "#e91e63" }}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "#e91e63", color: "#fff" }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            onClick={next}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "rgba(233, 30, 99, 0.1)", color: "#e91e63" }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Thumbnail strip */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto justify-center no-scrollbar">
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setCurrent(n)}
              className="shrink-0 rounded-lg overflow-hidden border-2 transition-all"
              style={{
                width: 40,
                height: 30,
                borderColor: n === current ? "#e91e63" : "transparent",
                opacity: n === current ? 1 : 0.5,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/birthday/${n}.jpg`}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </motion.main>
  );
}
