"use client";

import { AnimatePresence, motion } from "motion/react";
import { arrive, layoutTransition } from "@/lib/motion";
import { ProjectCard } from "./project-card";
import { useProjects } from "./store";

export function ProjectGrid() {
  const projects = useProjects();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence initial={false} mode="popLayout">
        {projects.map((project) => (
          <motion.li
            key={project.id}
            layout
            {...arrive}
            transition={{ ...arrive.transition, layout: layoutTransition }}
          >
            <ProjectCard project={project} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function ProjectCount() {
  const count = useProjects().length;
  return <p className="text-sm">{count === 1 ? "1 project" : `${count} projects`}</p>;
}
