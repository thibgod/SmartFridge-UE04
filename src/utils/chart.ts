const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Arrondi « lisible » de l’axe au plus proche au-dessus : 22 → 25, 130 → 150. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice = NICE_STEPS.find((step) => fraction <= step) ?? 10;
  return nice * exponent;
}
