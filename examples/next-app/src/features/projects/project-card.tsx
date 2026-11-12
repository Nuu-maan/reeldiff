import Link from "next/link";
import type { Project } from "./data";
import { ProgressBar } from "./progress-bar";

export function ProjectCard({ project }: { project: Project }) {
  const nameId = `project-${project.id}-name`;
  const descriptionId = `project-${project.id}-description`;
  return (
    <Link
      href={`/projects/${project.id}`}
      aria-labelledby={nameId}
      aria-describedby={descriptionId}
      className="group grid h-full gap-5 rounded-2xl bg-white p-5 shadow-raised outline-none transition-[box-shadow,scale] duration-150 ease-out hover:shadow-popover focus-visible:shadow-[var(--shadow-raised),var(--shadow-focus)] active:scale-[0.98]"
    >
      <div className="grid gap-1">
        <h2 id={nameId} className="font-medium">
          {project.name}
        </h2>
        <p id={descriptionId} className="line-clamp-2 text-sm">
          {project.description || "No description"}
        </p>
      </div>
      <div className="self-end">
        <ProgressBar tasks={project.tasks} label={`${project.name} progress`} />
      </div>
    </Link>
  );
}
