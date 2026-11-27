import { emitMascotMood, mascotPose, moodForClosedStatus, subscribeMascotMood, type MascotMood } from '@/features/mascot/mascot';
import { isMascotId, MASCOT_ORDER } from '@/features/mascot/mascots';
import { sanitizeSettings } from '@/repositories/settingsRepository';
import { buildBackup, parseBackup } from '@/services/backup/format';
import { DEFAULT_SETTINGS } from '@/types/settings';

describe('mascotte', () => {
  it('est contente quand un produit est consommé et fâchée quand il est jeté', () => {
    expect(moodForClosedStatus('consumed')).toBe('happy');
    expect(moodForClosedStatus('discarded')).toBe('angry');
  });

  it('prévient les abonnés, et plus après le désabonnement', () => {
    const received: MascotMood[] = [];
    const unsubscribe = subscribeMascotMood((mood) => {
      received.push(mood);
    });
    emitMascotMood('happy');
    emitMascotMood('shocked');
    unsubscribe();
    emitMascotMood('angry');
    expect(received).toEqual(['happy', 'shocked']);
  });

  it('dit si la mascotte a pris la réaction en charge (sinon on garde le message classique)', () => {
    expect(emitMascotMood('happy')).toBe(false);
    const stopIdle = subscribeMascotMood(() => false);
    expect(emitMascotMood('happy')).toBe(false);
    const stopShown = subscribeMascotMood(() => true);
    expect(emitMascotMood('happy')).toBe(true);
    stopIdle();
    stopShown();
  });
});

describe('position de la mascotte', () => {
  const base = { focused: true, scrolled: false, rowOpen: false, reacting: false, reduceMotion: false };

  it('respire au repos, en haut de la liste de l’écran affiché', () => {
    expect(mascotPose(base)).toEqual({ tucked: false, breathing: true });
  });

  it('se cache derrière la barre quand la liste défile ou qu’une ligne est ouverte, pour ne couvrir aucun produit', () => {
    expect(mascotPose({ ...base, scrolled: true })).toEqual({ tucked: true, breathing: false });
    expect(mascotPose({ ...base, rowOpen: true })).toEqual({ tucked: true, breathing: false });
  });

  it('ressort le temps de réagir à un produit consommé ou jeté, même cachée', () => {
    expect(mascotPose({ ...base, scrolled: true, reacting: true }).tucked).toBe(false);
  });

  it('ne s’anime pas hors de l’écran ni avec « Réduire les animations »', () => {
    expect(mascotPose({ ...base, focused: false }).breathing).toBe(false);
    expect(mascotPose({ ...base, reduceMotion: true }).breathing).toBe(false);
  });
});

describe('choix de la mascotte', () => {
  it('garde le frigo par défaut et accepte les autres mascottes', () => {
    expect(DEFAULT_SETTINGS.mascot).toBe('fridge');
    for (const id of MASCOT_ORDER) expect(sanitizeSettings({ mascot: id }).mascot).toBe(id);
  });

  it('revient au frigo pour une valeur inconnue ou absente (anciennes sauvegardes)', () => {
    expect(sanitizeSettings({ mascot: 'dragon' }).mascot).toBe('fridge');
    expect(sanitizeSettings({}).mascot).toBe('fridge');
    expect(isMascotId(42)).toBe(false);
  });

  it('suit la sauvegarde : la mascotte choisie revient à la restauration', () => {
    const backup = buildBackup([], { ...DEFAULT_SETTINGS, mascot: 'jar' });
    expect(parseBackup(JSON.stringify(backup)).settings?.mascot).toBe('jar');
  });
});
