import { addDays, addMonths, daysBetween, daysUntil, isValidLocalDate, todayLocalDate } from '@/utils/date';
import { getCompactExpiryLabel, getExpiryInfo, getExpiryLabel, getExpiryLevel, getShortExpiryLabel } from '@/utils/expiry';

describe('dates locales', () => {
  it('calcule les écarts en jours calendaires, y compris autour du changement d’heure', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // passage à l’heure d’été (France)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); // passage à l’heure d’hiver
    expect(daysBetween('2026-01-10', '2026-01-08')).toBe(-2);
  });

  it('compte depuis la date locale du jour, quelle que soit l’heure', () => {
    const lateEvening = new Date(2026, 9, 14, 23, 59);
    const earlyMorning = new Date(2026, 9, 14, 0, 1);
    expect(todayLocalDate(lateEvening)).toBe('2026-10-14');
    expect(daysUntil('2026-10-15', lateEvening)).toBe(1);
    expect(daysUntil('2026-10-15', earlyMorning)).toBe(1);
  });

  it('valide le format et l’existence de la date', () => {
    expect(isValidLocalDate('2026-02-28')).toBe(true);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('14/10/2026')).toBe(false);
  });

  it('ajoute jours et mois sans débordement', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('statut de péremption', () => {
  it('classe expiré / urgent / OK', () => {
    expect(getExpiryLevel(-1)).toBe('expired');
    expect(getExpiryLevel(0)).toBe('urgent');
    expect(getExpiryLevel(3)).toBe('urgent');
    expect(getExpiryLevel(4)).toBe('ok');
  });

  it('produit les libellés attendus', () => {
    expect(getExpiryLabel(0)).toBe('Périme aujourd’hui');
    expect(getExpiryLabel(1)).toBe('Périme demain');
    expect(getExpiryLabel(5)).toBe('Périme dans 5 jours');
    expect(getExpiryLabel(-1)).toBe('Périmé depuis 1 jour');
    expect(getExpiryLabel(-4)).toBe('Périmé depuis 4 jours');
  });

  it('propose un libellé court', () => {
    expect(getShortExpiryLabel(0)).toBe('Aujourd’hui');
    expect(getShortExpiryLabel(1)).toBe('Demain');
    expect(getShortExpiryLabel(4)).toBe('Dans 4 jours');
    expect(getShortExpiryLabel(-2)).toBe('Périmé (2 j)');
  });

  it('résume l’échéance en une pastille de quelques lettres', () => {
    expect([-3, 0, 1, 5, 13, 14, 45, 90].map(getCompactExpiryLabel)).toEqual([
      'Périmé',
      'Auj.',
      'Demain',
      '5 j',
      '13 j',
      '2 sem.',
      '6 sem.',
      '3 mois',
    ]);
  });

  it('combine date et statut', () => {
    const now = new Date(2026, 9, 14, 10);
    expect(getExpiryInfo('2026-10-12', now)).toEqual({ days: -2, level: 'expired', label: 'Périmé depuis 2 jours' });
  });
});
