/**
 * Jeu de produits de référence pour les tests automatisés.
 * Ne fait pas partie de l’application : aucun écran ne l’importe.
 */
import type { ProductInput } from '@/types/product';
import { addDays, todayLocalDate } from '@/utils/date';

export function buildDemoProducts(today: string = todayLocalDate()): ProductInput[] {
  const at = (days: number) => addDays(today, days);
  return [
    { name: 'Yaourts nature', category: 'produits_laitiers', quantity: '4 pots', expiresAt: at(1), location: 'frigo', price: 1.6, source: 'manual' },
    { name: 'Courgettes', category: 'fruits_legumes', quantity: '3', expiresAt: at(2), location: 'frigo', price: 2.2, source: 'manual' },
    { name: 'Crème fraîche', category: 'produits_laitiers', quantity: '20 cl', expiresAt: at(0), location: 'frigo', price: 1.35, source: 'manual' },
    { name: 'Blancs de poulet', category: 'viande_poisson', quantity: '2', expiresAt: at(3), location: 'frigo', price: 5.9, source: 'manual' },
    { name: 'Jambon blanc', category: 'viande_poisson', quantity: '4 tranches', expiresAt: at(-1), location: 'frigo', price: 2.8, source: 'manual' },
    { name: 'Œufs', category: 'produits_laitiers', quantity: '6', expiresAt: at(9), location: 'frigo', price: 2.4, source: 'manual' },
    { name: 'Bananes', category: 'fruits_legumes', quantity: '5', expiresAt: at(2), location: 'placard', source: 'manual' },
    { name: 'Riz basmati', category: 'feculents', quantity: '1 kg', expiresAt: at(240), location: 'placard', price: 2.1, source: 'manual' },
    { name: 'Lasagnes maison', category: 'plats_prepares', quantity: '2 parts', expiresAt: at(60), location: 'congelateur', source: 'manual' },
    { name: 'Petits pois', category: 'fruits_legumes', quantity: '1 sachet', expiresAt: at(120), location: 'congelateur', price: 1.9, source: 'manual' },
  ];
}
