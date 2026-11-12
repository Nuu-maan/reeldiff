"use client";

import { createPersistentStore, usePersistentStore } from "@/lib/persistent-store";
import { type Billing, type BillingDetails, type PlanId, seedBilling } from "./data";

const store = createPersistentStore<Billing>("plot.billing.v1", seedBilling);

export const useBilling = () => usePersistentStore(store);

export const choosePlan = (plan: PlanId) => store.set((billing) => ({ ...billing, plan }));

export const saveDetails = (details: BillingDetails) =>
  store.set((billing) => ({ ...billing, details }));
