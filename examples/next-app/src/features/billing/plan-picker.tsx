"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { crossfade } from "@/lib/motion";
import { plans } from "./data";
import { choosePlan, useBilling } from "./store";

export function PlanPicker() {
  const { plan: currentId } = useBilling();
  const current = plans.find((p) => p.id === currentId) ?? plans[0];

  return (
    <section aria-labelledby="plan-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="plan-heading" className="font-medium">
          Plan
        </h2>
        <p className="relative text-sm" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={current?.id} {...crossfade} className="inline-block">
              You're on {current?.name}.
            </motion.span>
          </AnimatePresence>
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === current?.id;
          const isUpgrade = plan.price > (current?.price ?? 0);
          return (
            <li
              key={plan.id}
              className={cn(
                "grid gap-5 rounded-2xl bg-white p-5 transition-shadow duration-200 ease-out",
                isCurrent ? "shadow-[0_0_0_1.5px_var(--color-neutral-900)]" : "shadow-raised",
              )}
            >
              <div className="grid gap-1">
                <h3 className="font-medium">{plan.name}</h3>
                <p className="text-sm">{plan.summary}</p>
              </div>
              <p className="text-neutral-900">
                <span className="text-3xl font-semibold">${plan.price}</span>
                <span className="text-sm text-muted"> / month</span>
              </p>
              <ul className="grid gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="shrink-0 text-neutral-900" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent || !isUpgrade ? "secondary" : "primary"}
                disabled={isCurrent}
                onClick={() => choosePlan(plan.id)}
                className="self-end"
              >
                {isCurrent ? "Current plan" : `${isUpgrade ? "Upgrade" : "Switch"} to ${plan.name}`}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
