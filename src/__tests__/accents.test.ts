import { ACCENTS, ACCENT_ORDER, applyAccent, contrastRatio, resolveAccent } from '@/theme/accents';
import { darkPalette, lightPalette } from '@/theme/tokens';

describe('couleurs d’accent (Premium)', () => {
  it('reste lisible : texte sur le bouton et liens sur le fond, en clair comme en sombre (WCAG AA)', () => {
    for (const id of ACCENT_ORDER) {
      for (const [mode, base] of [
        ['clair', lightPalette],
        ['sombre', darkPalette],
      ] as const) {
        const palette = applyAccent(base, id, mode === 'sombre');
        const label = `${ACCENTS[id].label} (${mode})`;
        expect([label, contrastRatio(palette.onPrimary, palette.primary) >= 4.5]).toEqual([label, true]);
        expect([label, contrastRatio(palette.primary, palette.background) >= 4.5]).toEqual([label, true]);
        expect([label, contrastRatio(palette.primary, palette.primarySoft) >= 4.5]).toEqual([label, true]);
      }
    }
  });

  it('garde la couleur d’origine par défaut, et sans Premium', () => {
    expect(applyAccent(lightPalette, 'foret', false)).toEqual(lightPalette);
    expect(resolveAccent('ocean', false)).toBe('foret');
    expect(resolveAccent('ocean', true)).toBe('ocean');
    expect(resolveAccent('inconnu', true)).toBe('foret');
  });
});
