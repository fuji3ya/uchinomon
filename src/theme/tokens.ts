// うちのモン design tokens — lifted verbatim from the approved prototype CSS
// (:root in zukan-card.html / living-zoo.html). Single source of truth so RN
// screens stay in parity with the HTML reference.

export const C = {
  ink: '#2b2540',
  inkSoft: '#3a3550',
  cream: '#fff8ef',
  paper: '#fdf6e9',
  card: '#fffdfa',
  accent: '#ff8bb0',
  accentDeep: '#e96997',
  leaf: '#7ec98f',
  gold: '#ffd06b',
  goldDeep: '#9a6a1e',
  muted: '#a89db8',
  mutedInk: '#8a8298',
  nightTop: '#2b2540',
  cardCreamGrad: ['#fbeede', '#f6e7d4'] as const,
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#3c2850',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  soft: {
    shadowColor: '#3c2850',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
} as const;

export const RADIUS = { card: 24, chip: 12, btn: 16, pill: 999 } as const;
export const SPACE = { xs: 6, sm: 10, md: 16, lg: 22, xl: 28 } as const;
