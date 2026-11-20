import { CATEGORIES } from '@/constants/catalog';
import type { Product } from '@/types/product';
import { computeImpact, formatKg } from '@/utils/impact';
import { formatCents } from '@/utils/price';
import {
  antiWasteScore,
  closedAmounts,
  computeWasteStats,
  monthlyAmounts,
  monthlyBreakdown,
  wasteByCategory,
} from '@/utils/stats';

/**
 * Bilan imprimable (Premium) : une page A4 lisible hors de l’app, à garder ou à partager.
 * Le HTML est converti en PDF sur le téléphone (expo-print) ; aucune donnée ne quitte l’appareil.
 */

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const longDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Nombre de lignes d’historique imprimées : au-delà, l’export CSV prend le relais. */
const HISTORY_ROWS = 40;

export function buildReportHtml(products: readonly Product[], now: Date = new Date()): string {
  const stats = computeWasteStats(products);
  const score = antiWasteScore(stats);
  const impact = computeImpact(products);
  const months = monthlyBreakdown(products, 6, now);
  const amounts = monthlyAmounts(products, 6, now);
  const categories = wasteByCategory(products).slice(0, 5);
  const history = products
    .filter((p) => p.status !== 'active' && p.closedAt)
    .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
  const maxMonth = Math.max(1, ...months.map((m) => m.consumed + m.discarded));

  const monthRows = months
    .map((month, i) => {
      const total = month.consumed + month.discarded;
      const consumedWidth = (month.consumed / maxMonth) * 100;
      const discardedWidth = (month.discarded / maxMonth) * 100;
      return `<tr>
        <td class="month">${escape(month.longLabel)}</td>
        <td class="bar"><span class="ok" style="width:${consumedWidth}%"></span><span class="ko" style="width:${discardedWidth}%"></span></td>
        <td class="num">${total}</td>
        <td class="num">${formatCents(amounts[i]?.consumedCents ?? 0)}</td>
        <td class="num">${formatCents(amounts[i]?.discardedCents ?? 0)}</td>
      </tr>`;
    })
    .join('');

  const categoryRows = categories.length
    ? categories
        .map(
          (c) =>
            `<tr><td>${escape(CATEGORIES[c.category].label)}</td><td class="num">${c.count}</td><td class="num">${formatCents(c.lostCents)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="3" class="muted">Rien jeté : bravo !</td></tr>';

  const historyRows = history
    .slice(0, HISTORY_ROWS)
    .map((p) => {
      const { savedCents, lostCents } = closedAmounts(p);
      const consumed = p.status === 'consumed';
      return `<tr>
        <td>${escape(p.name)}</td>
        <td class="${consumed ? 'tag-ok' : 'tag-ko'}">${consumed ? 'Consommé' : 'Jeté'}</td>
        <td>${shortDate(p.closedAt ?? '')}</td>
        <td class="num">${typeof p.price === 'number' ? formatCents(consumed ? savedCents : lostCents) : '—'}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Bilan SmartFridge</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  /* Sans cette règle, le moteur d’impression retire les fonds : plus de barres ni de légende. */
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; color: #17211B; font-size: 11pt; line-height: 1.4; margin: 0; }
  h1 { font-size: 22pt; margin: 0; letter-spacing: -0.3pt; }
  h2 { font-size: 12pt; margin: 18pt 0 6pt; color: #2F6B4F; text-transform: uppercase; letter-spacing: 0.6pt; }
  .sub { color: #56615A; margin: 2pt 0 0; }
  .kpis { display: flex; gap: 8pt; margin-top: 14pt; }
  .kpi { flex: 1; border: 1px solid #E4DFD2; border-radius: 10pt; padding: 9pt 11pt; }
  .kpi .label { font-size: 9pt; color: #56615A; text-transform: uppercase; letter-spacing: 0.4pt; }
  .kpi .value { font-size: 17pt; font-weight: 800; margin-top: 2pt; }
  .kpi .note { font-size: 9pt; color: #56615A; }
  .green { color: #2E7D32; } .red { color: #B3261E; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9pt; color: #56615A; font-weight: 600; border-bottom: 1px solid #E4DFD2; padding: 4pt 6pt; }
  td { padding: 4pt 6pt; border-bottom: 1px solid #F0ECE3; vertical-align: middle; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .month { width: 26%; } .bar { width: 34%; }
  .bar span { display: inline-block; height: 8pt; vertical-align: middle; }
  .ok { background: #2B6CB0; border-radius: 4pt 0 0 4pt; } .ko { background: #CF6A2E; border-radius: 0 4pt 4pt 0; }
  .tag-ok { color: #2E7D32; font-weight: 600; } .tag-ko { color: #B3261E; font-weight: 600; }
  .muted { color: #6F7A73; }
  .legend { font-size: 9pt; color: #56615A; margin-top: 4pt; }
  .legend i { display: inline-block; width: 8pt; height: 8pt; border-radius: 2pt; margin: 0 3pt 0 8pt; vertical-align: -1pt; }
  footer { margin-top: 18pt; font-size: 8.5pt; color: #6F7A73; }
  tr { page-break-inside: avoid; }
</style>
</head>
<body>
  <h1>Bilan SmartFridge</h1>
  <p class="sub">Au ${longDate(now)} · ${stats.consumedCount + stats.discardedCount} produits suivis jusqu’au bout</p>

  <div class="kpis">
    <div class="kpi"><div class="label">Économisés</div><div class="value green">${formatCents(stats.savedCents)}</div><div class="note">${stats.consumedCount} consommés</div></div>
    <div class="kpi"><div class="label">Perdus</div><div class="value red">${formatCents(stats.lostCents)}</div><div class="note">${stats.discardedCount} jetés</div></div>
    <div class="kpi"><div class="label">Score anti-gaspi</div><div class="value">${score === null ? '—' : `${score}<span class="muted" style="font-size:10pt"> / 100</span>`}</div><div class="note">part consommée</div></div>
    <div class="kpi"><div class="label">Nourriture sauvée</div><div class="value">${formatKg(impact.savedKg)}</div><div class="note">≈ ${formatKg(impact.co2Kg)} de CO₂ évités</div></div>
  </div>

  <h2>Six derniers mois</h2>
  <table>
    <thead><tr><th>Mois</th><th>Consommés / jetés</th><th class="num">Produits</th><th class="num">Économisés</th><th class="num">Perdus</th></tr></thead>
    <tbody>${monthRows}</tbody>
  </table>
  <div class="legend"><i style="background:#2B6CB0"></i>Consommés<i style="background:#CF6A2E"></i>Jetés</div>

  <h2>Ce qui part le plus à la poubelle</h2>
  <table>
    <thead><tr><th>Catégorie</th><th class="num">Jetés</th><th class="num">Perdus</th></tr></thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <h2>Historique${history.length > HISTORY_ROWS ? ` (${HISTORY_ROWS} plus récents sur ${history.length})` : ''}</h2>
  <table>
    <thead><tr><th>Produit</th><th>Statut</th><th>Date</th><th class="num">Montant</th></tr></thead>
    <tbody>${historyRows || '<tr><td colspan="4" class="muted">Aucun produit consommé ou jeté pour l’instant.</td></tr>'}</tbody>
  </table>

  <footer>Généré par SmartFridge sur votre téléphone. Impact estimé d’après des moyennes par catégorie (ADEME).</footer>
</body>
</html>`;
}
