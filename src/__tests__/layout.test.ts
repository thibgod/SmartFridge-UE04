import { CONTENT_MAX_WIDTH, TABLET_CONTENT_MAX_WIDTH, spacing } from '@/theme/tokens';
import { computeLayout, isTabletDevice } from '@/utils/layout';

describe('isTabletDevice', () => {
  it('suit Platform.isPad sur iOS', () => {
    expect(isTabletDevice({ os: 'ios', isPad: true, screenWidth: 834, screenHeight: 1194 })).toBe(true);
    // iPhone Pro Max et iPhone Duo déplié : des téléphones, même larges.
    expect(isTabletDevice({ os: 'ios', isPad: false, screenWidth: 440, screenHeight: 956 })).toBe(false);
    expect(isTabletDevice({ os: 'ios', isPad: false, screenWidth: 700, screenHeight: 1000 })).toBe(false);
  });

  it('se fie au plus petit côté de l’écran sur Android (600 points)', () => {
    expect(isTabletDevice({ os: 'android', isPad: false, screenWidth: 800, screenHeight: 1280 })).toBe(true);
    // Même tenue à l’horizontale, c’est le plus petit côté qui compte.
    expect(isTabletDevice({ os: 'android', isPad: false, screenWidth: 1280, screenHeight: 800 })).toBe(true);
    expect(isTabletDevice({ os: 'android', isPad: false, screenWidth: 412, screenHeight: 915 })).toBe(false);
  });

  it('ne traite jamais le web comme une tablette', () => {
    expect(isTabletDevice({ os: 'web', isPad: false, screenWidth: 1024, screenHeight: 1366 })).toBe(false);
  });
});

describe('computeLayout', () => {
  it('ne change rien sur téléphone : colonne large = colonne de lecture, pas de deux colonnes', () => {
    const phone = computeLayout(390, false);
    expect(phone.size).toBe('compact');
    expect(phone.gutter).toBe(spacing.lg);
    expect(phone.wideGutter).toBe(phone.gutter);
    expect(phone.wideContentWidth).toBe(phone.contentWidth);
    expect(phone.gridColumns).toBe(2);
    expect(phone.twoPane).toBe(false);
  });

  it('garde la colonne de lecture centrée sur un grand écran qui n’est pas une tablette', () => {
    const wide = computeLayout(1200, false);
    expect(wide.gutter).toBe((1200 - CONTENT_MAX_WIDTH) / 2);
    expect(wide.wideGutter).toBe(wide.gutter);
    expect(wide.gridColumns).toBe(3);
    expect(wide.twoPane).toBe(false);
  });

  it('iPad en portrait : colonne large, 3 colonnes de grille, une seule colonne d’écran', () => {
    const portrait = computeLayout(834, true);
    expect(portrait.isTablet).toBe(true);
    expect(portrait.wideContentWidth).toBe(834);
    expect(portrait.gridColumns).toBe(3);
    expect(portrait.twoPane).toBe(false);
  });

  it('iPad à l’horizontale : deux colonnes et 4 colonnes de grille, contenu borné', () => {
    const landscape = computeLayout(1366, true);
    expect(landscape.twoPane).toBe(true);
    expect(landscape.gridColumns).toBe(4);
    expect(landscape.wideGutter).toBe((1366 - TABLET_CONTENT_MAX_WIDTH) / 2);
    expect(landscape.wideContentWidth).toBe(TABLET_CONTENT_MAX_WIDTH + spacing.lg * 2);
    // La colonne de lecture (listes, formulaires) reste à sa largeur habituelle.
    expect(landscape.gutter).toBe((1366 - CONTENT_MAX_WIDTH) / 2);
  });

  it('tablette en Split View étroit : mise en page de téléphone', () => {
    const split = computeLayout(375, true);
    expect(split.twoPane).toBe(false);
    expect(split.gridColumns).toBe(2);
    expect(split.gutter).toBe(spacing.lg);
  });
});
