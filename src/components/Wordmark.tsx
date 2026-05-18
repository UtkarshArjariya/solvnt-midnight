export const Wordmark = ({ size = 28 }: { size?: number }) => {
  const dot = Math.max(8, size * 0.32);
  return (
    <div
      className="inline-flex items-baseline gap-[0.16em]"
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        fontSize: size,
        lineHeight: 1,
        color: 'var(--ink)',
        fontVariationSettings: "'SOFT' 100, 'opsz' 144",
      }}
    >
      <span>solvnt</span>
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{
          width: dot,
          height: dot,
          background: 'var(--catalyst)',
          boxShadow: '0 0 18px var(--catalyst-glow)',
          transform: 'translateY(0.04em)',
          animation: 'solvnt-dot-pulse 3.6s var(--ease-in-out) infinite',
        }}
      />
    </div>
  );
};
