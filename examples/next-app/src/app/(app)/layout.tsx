import { Sidebar } from "@/components/shell/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-5 md:flex-row md:gap-12 md:px-8 md:py-10">
      <Sidebar />
      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
