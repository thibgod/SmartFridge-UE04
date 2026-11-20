import { emitMascotMood, mascotPose, moodForClosedStatus, subscribeMascotMood, type MascotMood } from '@/features/mascot/mascot';

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
