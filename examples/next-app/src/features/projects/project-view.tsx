"use client";

import { Tabs } from "@base-ui/react/tabs";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ChevronRight } from "@/components/ui/icons";
import { useHydrated } from "@/lib/use-hydrated";
import { progress, templates } from "./data";
import { ProgressBar } from "./progress-bar";
import { useProjects } from "./store";
import { TaskList } from "./task-list";

const tabClass =
  "relative z-10 h-8 rounded-[8px] px-3 text-sm font-medium text-neutral-500 outline-none transition-colors duration-150 hover:text-neutral-900 focus-visible:shadow-focus data-[active]:text-neutral-900";

export function ProjectView({ id }: { id: string }) {
  const project = useProjects().find((p) => p.id === id);
  const hydrated = useHydrated();

  if (!project) {
    if (!hydrated) return null;
    return (
      <div className="grid justify-items-start gap-3">
        <h1 className="text-2xl font-semibold">I can't find that project</h1>
        <p className="text-sm">It may have been created in another browser.</p>
        <Link href="/dashboard" className={buttonClass("secondary")}>
          Back to projects
        </Link>
      </div>
    );
  }

  const { done, total } = progress(project.tasks);
  const template = templates.find((t) => t.value === project.template)?.label;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
          <Link href="/dashboard" className="rounded-md hover:text-neutral-900">
            Projects
          </Link>
          <ChevronRight className="text-neutral-400" />
        </nav>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
      </header>

      <Tabs.Root defaultValue="overview" className="grid gap-6">
        <Tabs.List className="relative flex w-fit gap-1 rounded-xl bg-surface p-1">
          <Tabs.Tab value="overview" className={tabClass}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="tasks" className={tabClass}>
            Tasks
          </Tabs.Tab>
          <Tabs.Indicator className="absolute top-1 left-0 h-8 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-[8px] bg-white shadow-raised transition-[translate,width] duration-300 ease-in-out" />
        </Tabs.List>

        <Tabs.Panel value="overview" className="grid gap-6 outline-none">
          <p className="max-w-prose">{project.description || "No description yet."}</p>
          <dl className="grid grid-cols-3 gap-4 rounded-3xl bg-surface p-5 sm:max-w-lg">
            <Stat label="Tasks" value={total} />
            <Stat label="Done" value={done} />
            <Stat label="Template" value={template ?? "Blank"} />
          </dl>
          <div className="sm:max-w-lg">
            <ProgressBar tasks={project.tasks} label={`${project.name} progress`} />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="tasks" className="outline-none sm:max-w-lg">
          <TaskList project={project} />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-neutral-600">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
