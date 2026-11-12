import type { Metadata } from "next";
import { NewProjectDialog } from "@/features/projects/new-project-dialog";
import { ProjectCount, ProjectGrid } from "@/features/projects/project-grid";

export const metadata: Metadata = { title: "Projects" };

export default function DashboardPage() {
  return (
    <div className="grid gap-8">
      <header className="flex items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <ProjectCount />
        </div>
        <NewProjectDialog />
      </header>
      <ProjectGrid />
    </div>
  );
}
