import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'mid-void': 'var(--mid-void)',
        'mid-base': 'var(--mid-base)',
        'mid-raise': 'var(--mid-raise)',
        'mid-raise-2': 'var(--mid-raise-2)',
        'mid-line': 'var(--mid-line)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-dim': 'var(--ink-dim)',
        catalyst: 'var(--catalyst)',
        'catalyst-deep': 'var(--catalyst-deep)',
        vouch: 'var(--vouch)',
        alert: 'var(--alert)',
        pending: 'var(--pending)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        pill: 'var(--r-pill)',
      },
      transitionTimingFunction: { out: 'var(--ease-out)' },
    },
  },
  plugins: [],
};

export default config;
