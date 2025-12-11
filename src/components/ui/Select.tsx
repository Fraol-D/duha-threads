"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export function Select({ value, onChange, options, placeholder = "Select...", label, className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={clsx("relative space-y-1.5", className)} ref={containerRef}>
      {label && <label className="text-xs font-medium text-muted-foreground ml-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all duration-200",
          "bg-[--surface] border border-[--muted-border] text-[--fg] shadow-sm hover:bg-[--surface]/80 focus:outline-none focus:ring-2 focus:ring-[--ring]/20",
          isOpen && "ring-2 ring-[--ring]/20"
        )}
      >
        <span className={clsx("truncate", !selectedOption && "text-[--muted-text]")}> 
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={clsx("w-4 h-4 text-[--muted-text] transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 overflow-hidden rounded-xl bg-[--surface]/95 backdrop-blur-xl border border-[--muted-border] shadow-xl"
          >
            <div className="max-h-60 overflow-auto py-1 custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors",
                    "hover:bg-[--surface]",
                    option.value === value ? "text-[--fg] font-medium bg-[--surface]" : "text-[--muted-text]"
                  )}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
