import { findExpiryDate } from '@/features/expiry/expiryDateReader';

const TODAY = '2026-10-15';
const read = (...texts: string[]) => findExpiryDate(texts, TODAY);

describe('lecture de la date sur un emballage', () => {
  it('reconnaît une DLC classique, avec année courte ou longue', () => {
    expect(read('A consommer jusqu’au : 22/10/26')).toEqual({ date: '2026-10-22', kind: 'dlc' });
    expect(read('DLC 03.11.2026 L2934')).toEqual({ date: '2026-11-03', kind: 'dlc' });
  });

  it('reconnaît une DDM au mois près (dernier jour du mois)', () => {
    expect(read('A consommer de préférence avant fin :', '10/2027')).toEqual({ date: '2027-10-31', kind: 'ddm' });
    expect(read('À consommer de préférence avant fin MARS 2027')).toEqual({ date: '2027-03-31', kind: 'ddm' });
  });

  it('accepte les mois en lettres et le format ISO', () => {
    expect(read('EXP 2026-12-05')?.date).toBe('2026-12-05');
    expect(read('Best before 12 JAN 27')?.date).toBe('2027-01-12');
  });

  it('écarte la date de fabrication au profit de la péremption', () => {
    expect(read('Fabriqué le 10/10/26', 'A consommer jusqu’au 24/10/26')?.date).toBe('2026-10-24');
    expect(read('EMB 12/10/2026 25/10/2026')).toEqual({ date: '2026-10-25', kind: null });
  });

  it('ignore les dates impossibles ou hors de portée et le texte sans date', () => {
    expect(read('31/02/27')).toBeNull();
    expect(read('Lot 2026 - 450 g - 1,89 €')).toBeNull();
    expect(read('A consommer jusqu’au 01/01/2019')).toBeNull();
  });

  it('lit une étiquette réelle telle que renvoyée par Apple Vision', () => {
    expect(
      read('Yaourt nature - 4 x 125 g', 'EMB 75056A Fabriqué le 08/10/26', "A consommer jusqu'au :", '29/10/26 L2934 08:42'),
    ).toEqual({ date: '2026-10-29', kind: 'dlc' });
  });
});
