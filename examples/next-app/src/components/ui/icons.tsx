import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const solid = {
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinejoin: "round",
} as const;

function Svg(props: IconProps) {
  return <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden {...props} />;
}

export function ChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3.5 10.5 8 6 12.5" {...line} />
    </Svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 6 8 10.5 12.5 6" {...line} />
    </Svg>
  );
}

export function Plus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3v10M3 8h10" {...line} />
    </Svg>
  );
}

export function Check(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3.5 8.5 3 3 6-7" {...line} />
    </Svg>
  );
}

export function Folder(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6a1.5 1.5 0 0 1 1.1.5l.8.9h4.5A1.5 1.5 0 0 1 14 5.9v5.6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z"
        {...solid}
      />
    </Svg>
  );
}

export function Card(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M1.75 5A1.75 1.75 0 0 1 3.5 3.25h9A1.75 1.75 0 0 1 14.25 5v.75H1.75zM1.75 7.75h12.5V11a1.75 1.75 0 0 1-1.75 1.75h-9A1.75 1.75 0 0 1 1.75 11z"
        {...solid}
      />
    </Svg>
  );
}

export function Mark(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3.5" {...solid} />
      <path
        d="M5.5 10.5v-5h3a1.5 1.5 0 0 1 0 3h-3"
        fill="none"
        stroke="white"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
