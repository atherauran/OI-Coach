type P = { size?: number; className?: string };
const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Logo = () => (
  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink">
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 3.5h16a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z" fill="#fff" />
      <path d="M7.5 13.5v-2M12 13.5V9M16.5 13.5V6.5" stroke="#15171C" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  </span>
);
export const Check = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2.5} className={className}><path d="M5 12l5 5L20 7" /></svg>
);
export const Cross = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={3} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Star = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 16.5 5.5 21l2-7.5L2 9h7z" /></svg>
);
export const Globe = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
  </svg>
);
export const Chevron = ({ size, className }: P) => (
  <svg {...base(size)} strokeWidth={2.5} className={className}><path d="M6 9l6 6 6-6" /></svg>
);
export const Eye = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const Cycle = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4" /></svg>
);
export const Pen = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
);
export const Bulb = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </svg>
);
export const Arrow = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const External = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><path d="M7 17L17 7M8 7h9v9" /></svg>
);
export const Copy = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
);
export const Question = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01" />
  </svg>
);
export const Lock = ({ size, className }: P) => (
  <svg {...base(size)} className={className}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
