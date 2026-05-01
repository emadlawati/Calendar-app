"use client";

import { useUser } from "./UserProvider";
import { Cat } from "lucide-react";
import { motion } from "framer-motion";

export default function UserToggle() {
  const { currentUser, setCurrentUser } = useUser();

  const toggleUser = () => {
    setCurrentUser(currentUser === "Wife" ? "Husband" : "Wife");
  };

  return (
    <motion.div 
      className="flex items-center space-x-3 bg-white p-2 rounded-full shadow-plush border border-latte-brown/20 cursor-pointer w-fit" 
      onClick={toggleUser}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${currentUser === "Wife" ? "bg-blush-pink text-text-dark" : "bg-gray-100 text-gray-400"}`}
        animate={{ rotate: currentUser === "Wife" ? -10 : 0 }}
      >
        <Cat size={20} />
      </motion.div>
      <span className="text-text-dark font-sniglet text-sm min-w-[60px] text-center font-bold">
        {currentUser}
      </span>
      <motion.div
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${currentUser === "Husband" ? "bg-soft-peach text-text-dark" : "bg-gray-100 text-gray-400"}`}
        animate={{ rotate: currentUser === "Husband" ? 10 : 0 }}
      >
        <Cat size={20} />
      </motion.div>
    </motion.div>
  );
}
