"use client";

import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Check } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { arrive, iconSwap } from "@/lib/motion";
import type { Project } from "./data";
import { addTask, toggleTask } from "./store";

export function TaskList({ project }: { project: Project }) {
  const [title, setTitle] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    addTask(project.id, title);
    setTitle("");
  };

  return (
    <div className="grid gap-5">
      <form onSubmit={submit} className="flex items-end gap-2">
        <TextField
          label="New task"
          placeholder="What needs doing?"
          autoComplete="off"
          className="flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!title.trim()}>
          Add task
        </Button>
      </form>
      {project.tasks.length === 0 ? (
        <p className="text-sm">No tasks yet. Add the first one above.</p>
      ) : (
        <ul className="grid gap-1 rounded-2xl bg-white p-1 shadow-raised">
          <AnimatePresence initial={false}>
            {project.tasks.map((task) => (
              <motion.li key={task.id} {...arrive}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-black/[0.04]">
                  <span className="relative grid size-5 shrink-0 place-items-center">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(project.id, task.id)}
                      className="peer size-5 cursor-pointer appearance-none rounded-md bg-control transition-colors duration-150 checked:bg-neutral-900 focus-visible:shadow-focus focus-visible:outline-none"
                    />
                    <AnimatePresence initial={false}>
                      {task.done && (
                        <motion.span
                          key="check"
                          {...iconSwap}
                          className="pointer-events-none absolute text-white"
                        >
                          <Check width={14} height={14} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <span
                    className={cn(
                      "text-sm transition-colors duration-150",
                      task.done ? "text-neutral-400 line-through" : "text-neutral-900",
                    )}
                  >
                    {task.title}
                  </span>
                </label>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
