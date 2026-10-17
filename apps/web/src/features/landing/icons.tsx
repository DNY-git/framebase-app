/** Small inline SVGs reused across the landing page (markup identical to the reference). */

/** Green permission check (roles console panel). */
export function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Row chevron (rotates to terracotta on the active role tab). */
export function ChevronIcon() {
  return (
    <svg
      className="role-chev w-3.5 h-3.5 shrink-0 transition-all duration-200"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** FAQ accordion chevron (rotates 180° when open via group-open:). */
export function FaqChevron() {
  return (
    <svg
      fill="none"
      height="24"
      shapeRendering="geometricPrecision"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="24"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
