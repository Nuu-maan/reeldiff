export type Task = { id: string; title: string; done: boolean };

export type Template = "blank" | "launch" | "research";

export type Project = {
  id: string;
  name: string;
  description: string;
  template: Template;
  tasks: Task[];
};

export const templates: { value: Template; label: string }[] = [
  { value: "blank", label: "Blank" },
  { value: "launch", label: "Product launch" },
  { value: "research", label: "User research" },
];

const templateTasks: Record<Template, string[]> = {
  blank: [],
  launch: ["Write the announcement", "Record a demo", "Update the pricing page"],
  research: ["Draft interview script", "Book five interviews", "Share findings"],
};

export const seedProjects: Project[] = [
  {
    id: "website-refresh",
    name: "Website refresh",
    description: "New homepage, docs navigation and a lighter footer.",
    template: "blank",
    tasks: [
      { id: "t1", title: "Audit current pages", done: true },
      { id: "t2", title: "Design the new homepage", done: true },
      { id: "t3", title: "Rebuild docs navigation", done: false },
      { id: "t4", title: "Ship the new footer", done: false },
    ],
  },
  {
    id: "mobile-onboarding",
    name: "Mobile onboarding",
    description: "Cut sign-up to three screens and add a guided first project.",
    template: "research",
    tasks: [
      { id: "t1", title: "Map the current funnel", done: true },
      { id: "t2", title: "Prototype three-screen sign-up", done: false },
      { id: "t3", title: "Test with five new users", done: false },
    ],
  },
  {
    id: "pricing-page",
    name: "Pricing page",
    description: "Clearer plan comparison and annual billing.",
    template: "launch",
    tasks: [
      { id: "t1", title: "Write plan copy", done: true },
      { id: "t2", title: "Add annual toggle", done: true },
      { id: "t3", title: "Launch to everyone", done: true },
    ],
  },
];

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";

export function uniqueId(base: string, taken: string[]) {
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export function newProject(
  input: { name: string; description: string; template: Template },
  existing: Project[],
): Project {
  const name = input.name.trim();
  return {
    id: uniqueId(
      slugify(name),
      existing.map((p) => p.id),
    ),
    name,
    description: input.description.trim(),
    template: input.template,
    tasks: templateTasks[input.template].map((title, i) => ({
      id: `t${i + 1}`,
      title,
      done: false,
    })),
  };
}

export const progress = (tasks: Task[]) => ({
  done: tasks.filter((t) => t.done).length,
  total: tasks.length,
});
