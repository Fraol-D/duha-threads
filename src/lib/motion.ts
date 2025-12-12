// Framer Motion animation variants for consistent micro-interactions
import type { Variants, Transition } from "framer-motion";

const easeOutQuart: [number, number, number, number] = [0.16, 1, 0.3, 1];
const easeShowcase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const shortEaseTransition: Transition = { duration: 0.3, ease: easeOutQuart };
const mediumEaseTransition: Transition = { duration: 0.4, ease: easeShowcase };
const longEaseTransition: Transition = { duration: 0.5, ease: easeShowcase };

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: shortEaseTransition },
  exit: { opacity: 0, transition: shortEaseTransition },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: mediumEaseTransition },
  exit: { opacity: 0, y: 20, transition: shortEaseTransition },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0, transition: shortEaseTransition },
  exit: { opacity: 0, y: -20, transition: shortEaseTransition },
};

export const hoverLift: Variants = {
  rest: { y: 0, scale: 1, boxShadow: "0px 0px 0px rgba(0,0,0,0)" },
  hover: {
    y: -4,
    scale: 1.01,
    boxShadow: "0px 10px 20px rgba(0,0,0,0.1)",
    transition: shortEaseTransition,
  },
};

export const buttonMotion: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2, ease: easeOutQuart } },
  tap: { scale: 0.96, transition: { duration: 0.1, ease: easeOutQuart } },
};

export const cardMotion: Variants = {
  rest: {
    y: 0,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  hover: {
    y: -5,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: shortEaseTransition,
  },
};

export const staggerChildren: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0, transition: shortEaseTransition },
  exit: { opacity: 0, x: -30, transition: shortEaseTransition },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: shortEaseTransition },
  exit: { opacity: 0, scale: 0.95, transition: shortEaseTransition },
};

export const textReveal: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: longEaseTransition },
};

export const viewportConfig = { once: true, margin: "-10% 0px" };
