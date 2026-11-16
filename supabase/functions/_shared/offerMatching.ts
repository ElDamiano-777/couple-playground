// Decides whether an Offer looks like a saved Favorite. Shared by the app and the
// push-delivery Edge Function, so the Offers page and the weekly push agree.
// Pure TypeScript without imports: Vite and Deno both load this file directly.

export type StoreId = 'kaufland' | 'aldi_sued' | 'lidl' | 'rewe' | 'netto' | 'edeka';
export const storeNames: Record<StoreId, string> = { kaufland: 'Kaufland', aldi_sued: 'ALDI SÜD', lidl: 'Lidl', rewe: 'REWE', netto: 'Netto', edeka: 'EDEKA' };

export type MatchableOffer = { id: string; store: StoreId; title: string; brand: string; price_cents: number };
export type MatchableFavorite = { id: string; name: string; brand: string };
export type MatchRejection = { favorite_id: string; offer_key: string };
export type Confidence = 'sure' | 'maybe';
export type FavoriteMatch<O extends MatchableOffer, F extends MatchableFavorite> = { favorite: F; offer: O; confidence: Confidence };

// Words that say nothing about which Product it is.
const fillerWords = new Set(['und', 'mit', 'oder', 'der', 'die', 'das', 'für', 'von', 'vom', 'aus', 'ohne', 'pro', 'lose', 'sorte', 'sorten', 'versch', 'verschiedene', 'oder', 'classic', 'original', 'angebot', 'packung', 'stück']);

export function offerWords(text: string) {
  return text.toLocaleLowerCase('de-DE').replace(/ß/g, 'ss').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ')
    .filter(word => word.length >= 3 && !/^\p{N}/u.test(word) && !fillerWords.has(word));
}

/** Stable key of an Offer's Product, used to remember "Doesn't match" across weeks. */
export function offerKey(offer: Pick<MatchableOffer, 'store' | 'brand' | 'title'>) {
  return `${offer.store}|${offer.brand} ${offer.title}`.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim().slice(0, 400);
}

// "whole": same word or a plural/inflected form (Nudel ↔ Nudeln).
// "compound": a German compound ending in the word (Vollmilch for Milch). The
// last part of a compound names what it is, so Milchschokolade is not milk.
function find(words: string[], wanted: string): 'whole' | 'compound' | null {
  const inflected = (long: string, short: string) => short.length >= 4 && long.startsWith(short) && long.length - short.length <= 2;
  if (words.some(word => word === wanted || inflected(word, wanted) || inflected(wanted, word))) return 'whole';
  if (words.some(word => word.length > wanted.length && word.endsWith(wanted))) return 'compound';
  return null;
}

export function matchFavorites<O extends MatchableOffer, F extends MatchableFavorite>(offers: O[], favorites: F[], rejections: MatchRejection[] = []): FavoriteMatch<O, F>[] {
  const rejected = new Set(rejections.map(item => `${item.favorite_id}\u0000${item.offer_key}`));
  const matches: FavoriteMatch<O, F>[] = [];
  const prepared = offers.map(offer => ({ offer, words: offerWords(`${offer.brand} ${offer.title}`) }));
  for (const favorite of favorites) {
    const nameWords = offerWords(favorite.name);
    if (!nameWords.length) continue;
    const brandWords = offerWords(favorite.brand);
    for (const { offer, words } of prepared) {
      const found = nameWords.map(word => find(words, word));
      if (found.some(kind => !kind)) continue;
      if (rejected.has(`${favorite.id}\u0000${offerKey(offer)}`)) continue;
      const sameBrand = brandWords.every(word => find(words, word) === 'whole');
      matches.push({ favorite, offer, confidence: sameBrand && found.every(kind => kind === 'whole') ? 'sure' : 'maybe' });
    }
  }
  return matches.sort((a, b) => Number(a.confidence === 'maybe') - Number(b.confidence === 'maybe') || a.offer.price_cents - b.offer.price_cents);
}

export const euro = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

/** Text of the weekly push, or null when nothing is worth a notification. */
export function weeklyOfferMessage<O extends MatchableOffer, F extends MatchableFavorite>(matches: FavoriteMatch<O, F>[]) {
  const sure = matches.filter(match => match.confidence === 'sure');
  // Matches are sorted cheapest first, so the first one per Favorite is its best Offer.
  const bestPerFavorite = sure.filter((match, index) => sure.findIndex(other => other.favorite.id === match.favorite.id) === index);
  if (!bestPerFavorite.length) {
    const maybe = new Set(matches.map(match => match.favorite.id)).size;
    return maybe ? `This week ${maybe} of your favorites might be on offer.` : null;
  }
  const named = bestPerFavorite.slice(0, 2).map(match => `${match.favorite.name} at ${storeNames[match.offer.store]} ${euro(match.offer.price_cents)}`);
  const more = bestPerFavorite.length - named.length;
  return `On offer this week: ${named.join(', ')}${more ? ` + ${more} more` : ''}.`;
}
