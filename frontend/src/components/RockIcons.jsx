export function BoltIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="m14 2-10 12h7l-1 8L21 9h-8l1-7Z" fill="currentColor" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Equalizer() {
  return (
    <span className="equalizer" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ "--bar": i }} />)}
    </span>
  );
}
