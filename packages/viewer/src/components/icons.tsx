import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Svg(props: IconProps) {
  return <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden {...props} />;
}

export const ChevronRight = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 3.5 10.5 8 6 12.5" {...line} />
  </Svg>
);

export const Restart = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3 8a5 5 0 1 0 1.5-3.5M3 2.5v2.5h2.5" {...line} />
  </Svg>
);

export const Mark = (props: IconProps) => (
  <Svg {...props}>
    <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
    <path
      d="M6.2 5.2v5.6l4.6-2.8z"
      fill="var(--color-page)"
      stroke="var(--color-page)"
      strokeWidth={1}
      strokeLinejoin="round"
    />
  </Svg>
);
