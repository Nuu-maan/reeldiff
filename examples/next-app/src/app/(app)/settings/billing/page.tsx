import type { Metadata } from "next";
import { BillingForm } from "@/features/billing/billing-form";
import { PlanPicker } from "@/features/billing/plan-picker";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="grid gap-10">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm">Change your plan or where invoices go.</p>
      </header>
      <PlanPicker />
      <BillingForm />
    </div>
  );
}
