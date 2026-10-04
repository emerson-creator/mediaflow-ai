interface Props {
  size?: "md" | "lg";
  showWordmark?: boolean;
}

export function Logo({ size = "md", showWordmark = true }: Props) {
  const isLarge = size === "lg";

  const iconSize = isLarge ? 32 : 24;

  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="mediaflow-gradient"
            x1="4"
            y1="28"
            x2="28"
            y2="4"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#eef1f0" />
            <stop offset="0.5" stopColor="#40464b" />
            <stop offset="1" stopColor="#3a3d3f" />
          </linearGradient>
        </defs>

        <rect
          x="3"
          y="19"
          width="7"
          height="10"
          rx="3.5"
          fill="url(#mediaflow-gradient)"
        />

        <rect
          x="12.5"
          y="12"
          width="7"
          height="17"
          rx="3.5"
          fill="url(#mediaflow-gradient)"
        />

        <rect
          x="22"
          y="3"
          width="7"
          height="26"
          rx="3.5"
          fill="url(#mediaflow-gradient)"
        />
      </svg>

      {showWordmark && (
        <span
          className={
            isLarge
              ? "text-xl font-semibold tracking-[-0.025em]"
              : "text-sm font-semibold tracking-[-0.015em]"
          }
        >
          MediaFlow
        </span>
      )}
    </span>
  );
}
