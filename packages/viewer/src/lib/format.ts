export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

export function formatDuration(ms: number) {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const shortSha = (sha: string) => sha.slice(0, 7);
