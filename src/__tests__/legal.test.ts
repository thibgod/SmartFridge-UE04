/// <reference types="node" />

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { privacyMarkdown } from '@/data/privacy';
import { listPhotoCredits } from '@/features/legal/photoCredits';
import { formatCredit, OPEN_FOOD_FACTS_CREDIT, photoSource } from '@/services/images/imageCredits';

describe('crédits photo', () => {
  it('connaît l’auteur et une licence libre pour chaque photo embarquée', () => {
    const entries = listPhotoCredits();
    expect(entries.length).toBeGreaterThan(50);
    for (const entry of entries) {
      expect(entry.credit).not.toBeNull();
      expect(entry.credit?.license).toMatch(/^(CC0|CC BY|Public domain|Attribution)/);
      expect(entry.credit?.license).not.toMatch(/GFDL/);
    }
  });

  it('retrouve la source d’une image d’après son adresse', () => {
    expect(photoSource('https://commons.wikimedia.org/wiki/Special:FilePath/Tomato%20je.jpg?width=480')).toEqual({
      kind: 'wikimedia',
      wiki: 'commons',
      file: 'Tomato je.jpg',
    });
    expect(photoSource('https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/480px-Tomato_je.jpg')).toEqual({
      kind: 'wikimedia',
      wiki: 'commons',
      file: 'Tomato je.jpg',
    });
    expect(photoSource('https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.jpg')).toEqual({
      kind: 'openfoodfacts',
    });
    expect(photoSource('file:///var/mobile/photo.jpg')).toEqual({ kind: 'none' });
    expect(photoSource(undefined)).toEqual({ kind: 'none' });
  });

  it('formule le crédit lisiblement', () => {
    expect(formatCredit(OPEN_FOOD_FACTS_CREDIT)).toBe('© Contributeurs Open Food Facts · CC BY-SA 3.0');
    expect(formatCredit({ author: 'USDA', license: 'Public domain', page: 'x' })).toBe('USDA · domaine public');
    expect(formatCredit({ author: 'Benoît Prieur', license: 'CC0', page: 'x' })).toBe('Benoît Prieur · CC0');
    expect(formatCredit({ author: 'Wikimedia Commons', license: '', page: 'x' })).toBe('Wikimedia Commons');
  });
});

describe('politique de confidentialité', () => {
  const file = join(__dirname, '..', '..', 'PRIVACY.md');

  it('PRIVACY.md reprend exactement le texte affiché dans l’app', () => {
    // UPDATE_PRIVACY=1 npx jest legal : réécrit PRIVACY.md depuis src/data/privacy.ts.
    if (process.env.UPDATE_PRIVACY === '1') writeFileSync(file, privacyMarkdown());
    expect(readFileSync(file, 'utf8')).toBe(privacyMarkdown());
  });

  it('ne contient plus de texte à remplacer', () => {
    expect(privacyMarkdown()).not.toMatch(/\[votre|TODO|XXX/i);
  });
});
