"use client";

import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Check } from "@/components/ui/icons";
import { SelectField } from "@/components/ui/select";
import { arrive } from "@/lib/motion";
import { useHydrated } from "@/lib/use-hydrated";
import { type BillingDetails, countries } from "./data";
import { saveDetails, useBilling } from "./store";

export function BillingForm() {
  const stored = useBilling().details;
  const hydrated = useHydrated();
  return <DetailsForm key={hydrated ? "client" : "server"} stored={stored} />;
}

function DetailsForm({ stored }: { stored: BillingDetails }) {
  const [details, setDetails] = useState(stored);
  const [saved, setSaved] = useState(false);

  const edit = (patch: Partial<BillingDetails>) => {
    setDetails({ ...details, ...patch });
    setSaved(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveDetails(details);
    setSaved(true);
  };

  return (
    <section aria-labelledby="details-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="details-heading" className="font-medium">
          Billing details
        </h2>
        <p className="text-sm">Invoices go to this email every month.</p>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-3xl bg-white p-5 shadow-raised sm:max-w-lg sm:p-6"
      >
        <TextField
          label="Billing email"
          type="email"
          autoComplete="email"
          placeholder="billing@example.com"
          required
          value={details.email}
          onChange={(e) => edit({ email: e.target.value })}
        />
        <TextField
          label="Card number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4242 4242 4242 4242"
          data-reeldiff-mask
          value={details.card}
          onChange={(e) => edit({ card: e.target.value })}
        />
        <SelectField
          label="Country"
          name="country"
          items={[...countries]}
          value={details.country}
          onValueChange={(country) => edit({ country })}
        />
        <div className="mt-1 flex items-center gap-3">
          <Button type="submit">Save billing details</Button>
          <p aria-live="polite" className="text-sm">
            <AnimatePresence initial={false}>
              {saved && (
                <motion.span
                  key="saved"
                  {...arrive}
                  className="inline-flex items-center gap-1 text-emerald-700"
                >
                  <Check />
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
          </p>
        </div>
      </form>
    </section>
  );
}
