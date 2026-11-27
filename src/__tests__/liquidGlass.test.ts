import { ACCENT_ORDER, ACCENTS, contrastRatio } from '@/theme/accents';
import {
  backdropWorstColor,
  compositeOver,
  concentricRadius,
  lensIndexAt,
  nextTabBarCollapsed,
  PROMINENT_VEIL,
  TAB_BAR,
  glassPalette,
  resolveGlassMode,
  veilColor,
  withAlpha,
  type GlassMaterial,
} from '@/theme/liquidGlass';
import { darkPalette, lightPalette, SETTINGS_TINTS } from '@/theme/tokens';

describe('resolveGlassMode', () => {
  it('utilise le vrai Liquid Glass sur iOS 26', () => {
    expect(resolveGlassMode({ os: 'ios', liquidGlassAvailable: true, reduceTransparency: false })).toBe('native');
  });

  it('retombe sur le flou sur un iOS plus ancien et sur le web', () => {
    expect(resolveGlassMode({ os: 'ios', liquidGlassAvailable: false, reduceTransparency: false })).toBe('blur');
    expect(resolveGlassMode({ os: 'web', liquidGlassAvailable: false, reduceTransparency: false })).toBe('blur');
  });

  it('simule le verre sur Android, sans flou en temps réel', () => {
    expect(resolveGlassMode({ os: 'android', liquidGlassAvailable: false, reduceTransparency: false })).toBe('tinted');
  });

  it('respecte « Réduire la transparence » partout', () => {
    for (const os of ['ios', 'android', 'web']) {
      expect(resolveGlassMode({ os, liquidGlassAvailable: true, reduceTransparency: true })).toBe('opaque');
    }
  });
});

describe('outils de couleur', () => {
  it('convertit une couleur hexadécimale en rgba', () => {
    expect(withAlpha('#2F6B4F', 0.5)).toBe('rgba(47, 107, 79, 0.5)');
  });

  it('compose une couleur semi-transparente sur un fond', () => {
    expect(compositeOver('#FFFFFF', 1, '#000000')).toBe('#FFFFFF');
    expect(compositeOver('#FFFFFF', 0, '#123456')).toBe('#123456');
    expect(compositeOver('#FFFFFF', 0.5, '#000000')).toBe('#808080');
  });

  it('calcule des coins concentriques avec un minimum', () => {
    expect(concentricRadius(32, 5)).toBe(27);
    expect(concentricRadius(8, 6)).toBe(6);
  });
});

describe('lisibilité du texte sur le verre simulé (Android)', () => {
  // Pire cas : un contenu de couleur opposée au thème passe sous le verre (photo très sombre en mode
  // clair, très claire en mode sombre), en plus du fond normal de l’écran.
  const cases = [
    { name: 'clair', palette: lightPalette, isDark: false, backgrounds: [lightPalette.background, '#000000'] },
    { name: 'sombre', palette: darkPalette, isDark: true, backgrounds: [darkPalette.background, '#FFFFFF'] },
  ];
  const textMaterials: GlassMaterial[] = ['regular', 'thick'];

  for (const { name, palette, isDark, backgrounds } of cases) {
    for (const material of textMaterials) {
      it(`texte lisible (4,5:1) sur le verre « ${material} » en mode ${name}`, () => {
        for (const background of backgrounds) {
          const surface = veilColor(palette, isDark, material, background);
          expect(contrastRatio(palette.text, surface)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(palette.textMuted, surface)).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  it('libellé lisible sur le bouton principal teinté, pour chaque couleur d’accent', () => {
    for (const isDark of [false, true]) {
      for (const accent of ACCENT_ORDER) {
        const roles = ACCENTS[accent][isDark ? 'dark' : 'light'];
        const colors = { ...(isDark ? darkPalette : lightPalette), ...roles };
        const backdrop = isDark ? '#FFFFFF' : '#000000';
        const surface = compositeOver(colors.primary, 0.92, backdrop);
        expect(glassPalette(colors, isDark).prominentVeil).toBe(withAlpha(colors.primary, 0.92));
        expect(contrastRatio(colors.onPrimary, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('fond d’ambiance', () => {
  it('garde le texte lisible (4,5:1) là où les halos se superposent, pour chaque accent', () => {
    for (const isDark of [false, true]) {
      for (const accent of ACCENT_ORDER) {
        const colors = { ...(isDark ? darkPalette : lightPalette), ...ACCENTS[accent][isDark ? 'dark' : 'light'] };
        const worst = backdropWorstColor(colors, isDark);
        expect(contrastRatio(colors.text, worst)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.textMuted, worst)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('réduction de la barre d’onglets au défilement', () => {
  it('reste dépliée près du haut de la page', () => {
    expect(nextTabBarCollapsed(40, 10, false)).toBe(false);
    expect(nextTabBarCollapsed(TAB_BAR.collapseAfter, 0, true)).toBe(false);
  });

  it('se réduit en descendant et se déplie en remontant', () => {
    expect(nextTabBarCollapsed(300, 280, false)).toBe(true);
    expect(nextTabBarCollapsed(260, 280, true)).toBe(false);
  });

  it('ignore les petits mouvements', () => {
    expect(nextTabBarCollapsed(302, 300, true)).toBe(true);
    expect(nextTabBarCollapsed(302, 300, false)).toBe(false);
  });
});

describe('verre teinté rouge (action destructive)', () => {
  it('garde le libellé lisible (4,5:1) en clair et en sombre', () => {
    for (const isDark of [false, true]) {
      const colors = isDark ? darkPalette : lightPalette;
      const behind = isDark ? '#FFFFFF' : '#000000';
      const surface = compositeOver(colors.danger, PROMINENT_VEIL, behind);
      expect(contrastRatio(colors.onPrimary, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('glisser le doigt sur une barre en verre', () => {
  it('centre la pastille sous le doigt et choisit l’élément le plus proche', () => {
    // 5 onglets de 80 pt, marge 5 pt : le centre du 3e onglet est à 5 + 2,5 × 80 = 205.
    expect(lensIndexAt(205, 80, 5, 5)).toEqual({ continuous: 2, index: 2 });
    expect(lensIndexAt(240, 80, 5, 5).index).toBe(2);
    expect(lensIndexAt(250, 80, 5, 5).index).toBe(3);
  });

  it('reste dans la barre quand le doigt en sort', () => {
    expect(lensIndexAt(-50, 80, 5, 5)).toEqual({ continuous: 0, index: 0 });
    expect(lensIndexAt(900, 80, 5, 5)).toEqual({ continuous: 4, index: 4 });
  });

  it('ne plante pas avant la mesure de la barre', () => {
    expect(lensIndexAt(100, 0, 0, 5)).toEqual({ continuous: 0, index: 0 });
  });
});

describe('couleurs des rubriques des Réglages', () => {
  it('gardent un pictogramme blanc net (≥ 3:1) sur chaque tuile', () => {
    for (const color of Object.values(SETTINGS_TINTS)) {
      expect(contrastRatio(lightPalette.onTint, color)).toBeGreaterThanOrEqual(3);
    }
  });
});
