export type PlanId = "starter" | "team" | "business";

export const plans: {
  id: PlanId;
  name: string;
  price: number;
  summary: string;
  features: string[];
}[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    summary: "For trying Plot on your own.",
    features: ["5 projects", "1 member", "Community support"],
  },
  {
    id: "team",
    name: "Team",
    price: 24,
    summary: "For small teams shipping together.",
    features: ["Unlimited projects", "10 members", "Email support"],
  },
  {
    id: "business",
    name: "Business",
    price: 79,
    summary: "For companies with many teams.",
    features: ["Unlimited projects", "Unlimited members", "SSO and audit log"],
  },
];

export const countries = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "de", label: "Germany" },
  { value: "in", label: "India" },
] as const;

export type Country = (typeof countries)[number]["value"];

export type BillingDetails = { email: string; card: string; country: Country };

export type Billing = { plan: PlanId; details: BillingDetails };

export const seedBilling: Billing = {
  plan: "starter",
  details: { email: "", card: "", country: "us" },
};
