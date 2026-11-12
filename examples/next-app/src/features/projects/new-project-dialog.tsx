"use client";

import { Dialog } from "@base-ui/react/dialog";
import { type FormEvent, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Plus } from "@/components/ui/icons";
import { SelectField } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { type Template, templates } from "./data";
import { createProject } from "./store";

const empty = { name: "", description: "", template: "blank" as Template };

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    createProject(form);
    setOpen(false);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => !isOpen && setForm(empty)}
    >
      <Dialog.Trigger className={buttonClass("primary", "pl-2.5")}>
        <Plus />
        New project
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="backdrop fixed inset-0 bg-black/20 transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 flex overflow-y-auto p-4">
          <Dialog.Popup
            className={cn(
              "m-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-popover outline-none",
              "transition-[opacity,scale] duration-200 ease-out data-[ending-style]:duration-100",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            )}
          >
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              New project
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm">
              Pick a template to start with a few tasks.
            </Dialog.Description>
            <form onSubmit={submit} className="mt-5 grid gap-4">
              <TextField
                label="Project name"
                name="name"
                autoComplete="off"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextAreaField
                label="Description"
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <SelectField
                label="Template"
                name="template"
                items={templates}
                value={form.template}
                onValueChange={(template) => setForm({ ...form, template })}
              />
              <div className="mt-2 flex justify-end gap-2">
                <Dialog.Close className={buttonClass("ghost")}>Cancel</Dialog.Close>
                <Button type="submit" disabled={!form.name.trim()}>
                  Create
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
