/**
 * Identifiant local unique (horodatage + aléa). Suffisant pour une base mono-appareil ;
 * une V2 synchronisée pourra basculer sur des UUID v4 sans changer le schéma (TEXT).
 */
export function createId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${time}-${random}`;
}
