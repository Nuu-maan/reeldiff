import type { Transition } from "motion/react";

export const easeOut = [0.23, 1, 0.32, 1] as const;

export const arrive = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.4, ease: easeOut } satisfies Transition,
};

export const crossfade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: "linear" } satisfies Transition,
};

export const iconSwap = {
  initial: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  transition: { type: "spring", duration: 0.3, bounce: 0 } satisfies Transition,
};

export const layoutTransition: Transition = { type: "spring", duration: 0.35, bounce: 0 };
