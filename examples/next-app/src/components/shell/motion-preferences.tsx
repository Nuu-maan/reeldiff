"use client";

import { MotionGlobalConfig } from "motion/react";
import { useEffect } from "react";

export function MotionPreferences() {
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      MotionGlobalConfig.skipAnimations = query.matches;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return null;
}
