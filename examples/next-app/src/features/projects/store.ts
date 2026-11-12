"use client";

import { createPersistentStore, usePersistentStore } from "@/lib/persistent-store";
import { newProject, type Project, seedProjects, type Template, uniqueId } from "./data";

const store = createPersistentStore<Project[]>("plot.projects.v1", seedProjects);

export const useProjects = () => usePersistentStore(store);

export const createProject = (input: { name: string; description: string; template: Template }) =>
  store.set((projects) => [newProject(input, projects), ...projects]);

const updateTasks = (projectId: string, update: (tasks: Project["tasks"]) => Project["tasks"]) =>
  store.set((projects) =>
    projects.map((p) => (p.id === projectId ? { ...p, tasks: update(p.tasks) } : p)),
  );

export const addTask = (projectId: string, title: string) =>
  updateTasks(projectId, (tasks) => [
    ...tasks,
    {
      id: uniqueId(
        `t${tasks.length + 1}`,
        tasks.map((t) => t.id),
      ),
      title: title.trim(),
      done: false,
    },
  ]);

export const toggleTask = (projectId: string, taskId: string) =>
  updateTasks(projectId, (tasks) =>
    tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
  );
