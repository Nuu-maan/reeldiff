import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { MotionPreferences } from "@/components/shell/motion-preferences";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Plot", template: "%s · Plot" },
  description: "A small project tracker used to demo Reeldiff.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={publicSans.variable}>
      <body className="min-h-dvh font-sans">
        <a
          href="#main"
          className="fixed top-3 left-3 z-50 -translate-y-16 rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white transition-transform duration-150 focus:translate-y-0"
        >
          Skip to content
        </a>
        <MotionPreferences />
        {children}
      </body>
    </html>
  );
}
