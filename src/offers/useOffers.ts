import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../shared/client';
import { matchFavorites, offerKey, type FavoriteMatch, type MatchRejection, type StoreId } from '../../supabase/functions/_shared/offerMatching';

export type Offer = {
  id: string;
  store: StoreId;
  origin: 'import' | 'screenshot';
  household_id: string | null;
  title: string;
  brand: string;
  quantity_text: string;
  price_cents: number;
  regular_price_cents: number | null;
  base_price_text: string;
  category: string;
  valid_from: string;
  valid_to: string;
};
export type OfferFavorite = { id: string; name: string; brand: string; quantity: string; category: string };
export type ImportRun = { store: StoreId; status: 'running' | 'ok' | 'failed'; started_at: string; finished_at: string | null };
export type OfferMatch = FavoriteMatch<Offer, OfferFavorite>;
export type ScreenshotOffer = { title: string; price_cents: number };

export const automaticStores: StoreId[] = ['kaufland', 'aldi_sued'];
export const screenshotStores: StoreId[] = ['lidl', 'rewe', 'netto', 'edeka'];
// Each Store's current Düren Brochure for people to open; kaufDA expressly allows links.
export const brochureLinks: Record<StoreId, string> = {
  kaufland: 'https://filiale.kaufland.de/angebote/uebersicht.html',
  aldi_sued: 'https://www.aldi-sued.de/angebote',
  lidl: 'https://www.kaufda.de/Dueren/Lidl/p-r74',
  rewe: 'https://www.kaufda.de/Dueren/REWE/p-r101',
  netto: 'https://www.kaufda.de/Dueren/Netto-Marken-Discount/p-r9',
  edeka: 'https://www.kaufda.de/Dueren/EDEKA/p-r107',
};

const columns = 'id,store,origin,household_id,title,brand,quantity_text,price_cents,regular_price_cents,base_price_text,category,valid_from,valid_to';

export function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
/** Monday and Sunday of the current Offer week, as local ISO dates. */
export function offerWeek(now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { today: isoDate(now), monday: isoDate(monday), sunday: isoDate(sunday) };
}

// The same Product can be imported for two overlapping periods; show the one valid now.
function currentOffers(rows: Offer[], today: string) {
  const byProduct = new Map<string, Offer>();
  for (const row of rows) {
    const key = offerKey(row);
    const known = byProduct.get(key);
    const live = (offer: Offer) => offer.valid_from <= today;
    if (!known || (live(row) && !live(known)) || (live(row) === live(known) && row.price_cents < known.price_cents)) byProduct.set(key, row);
  }
  return [...byProduct.values()];
}

async function loadAllOffers(sunday: string, today: string) {
  const rows: Offer[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const page = await supabase.from('offers').select(columns).gte('valid_to', today).lte('valid_from', sunday).order('id').range(from, from + 999);
    if (page.error) throw page.error;
    rows.push(...page.data as Offer[]);
    if (page.data.length < 1000) break;
  }
  return rows;
}

export function useOffers(userId: string | undefined, household: string | null, active: boolean) {
  const [rows, setRows] = useState<Offer[]>([]);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [favorites, setFavorites] = useState<OfferFavorite[]>([]);
  const [rejections, setRejections] = useState<MatchRejection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scope = `${userId ?? ''}:${household ?? ''}`;
  const current = useRef(scope);
  current.current = scope;

  const load = useCallback(async () => {
    const requested = scope;
    const { today, sunday } = offerWeek();
    setLoading(true);
    try {
      const [offers, latestRuns, favoriteRows, rejectionRows] = await Promise.all([
        loadAllOffers(sunday, today),
        supabase.from('offer_import_runs').select('store,status,started_at,finished_at').order('started_at', { ascending: false }).limit(20),
        household ? supabase.from('shopping_favorites').select('id,name,brand,quantity,category').eq('household_id', household) : Promise.resolve({ data: [], error: null }),
        household ? supabase.from('offer_match_rejections').select('favorite_id,offer_key').eq('household_id', household) : Promise.resolve({ data: [], error: null }),
      ]);
      if (current.current !== requested) return;
      if (latestRuns.error || favoriteRows.error || rejectionRows.error) throw latestRuns.error ?? favoriteRows.error ?? rejectionRows.error;
      setRows(currentOffers(offers, today));
      setRuns(latestRuns.data as ImportRun[]);
      setFavorites(favoriteRows.data as OfferFavorite[]);
      setRejections(rejectionRows.data as MatchRejection[]);
      setError('');
      setLoaded(true);
    } catch {
      if (current.current === requested) setError('Could not load offers. Check your connection.');
    } finally {
      if (current.current === requested) setLoading(false);
    }
  }, [scope, household]);

  useEffect(() => {
    setRows([]); setFavorites([]); setRejections([]); setLoaded(false);
  }, [scope]);
  useEffect(() => {
    if (!active) return;
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [active, load]);

  const matches = useMemo(() => matchFavorites(rows, favorites, rejections), [rows, favorites, rejections]);
  // Latest finished or running import per automatic Store.
  const latestRun = useMemo(() => Object.fromEntries(automaticStores.map(store => [store, runs.find(run => run.store === store) ?? null])) as Record<StoreId, ImportRun | null>, [runs]);

  async function mutate(action: () => Promise<boolean>) {
    if (busy) return false;
    if (!household || !navigator.onLine) { setError('Connect to the internet to change offers.'); return false; }
    setBusy(true); setError('');
    try { return await action(); } finally { setBusy(false); }
  }

  const saveFavorite = (offer: Offer) => mutate(async () => {
    const result = await supabase.from('shopping_favorites').insert({ household_id: household, category: 'Home', name: offer.title.slice(0, 200), brand: offer.brand.slice(0, 150), quantity: offer.quantity_text.slice(0, 150) }).select('id,name,brand,quantity,category').single();
    if (result.error || !result.data) { setError(result.error?.code === '23505' ? 'This product is already in your favorites.' : 'Could not save the favorite. Please try again.'); return false; }
    setFavorites(previous => [...previous, result.data as OfferFavorite]);
    return true;
  });

  const rejectMatch = (match: OfferMatch) => mutate(async () => {
    const rejection = { favorite_id: match.favorite.id, offer_key: offerKey(match.offer) };
    const result = await supabase.from('offer_match_rejections').insert({ household_id: household, ...rejection });
    if (result.error && result.error.code !== '23505') { setError('Could not hide this match. Please try again.'); return false; }
    setRejections(previous => [...previous, rejection]);
    return true;
  });

  const saveScreenshotOffers = (store: StoreId, items: ScreenshotOffer[], validFrom: string, validTo: string) => mutate(async () => {
    const result = await supabase.from('offers').insert(items.map(item => ({ store, household_id: household, title: item.title.trim().slice(0, 200), price_cents: item.price_cents, valid_from: validFrom, valid_to: validTo, category: 'From brochure screenshot' }))).select(columns);
    if (result.error) { setError('Could not save these offers. Check the prices and dates, then try again.'); return false; }
    setRows(previous => currentOffers([...previous, ...result.data as Offer[]], offerWeek().today));
    return true;
  });

  const removeOffer = (offer: Offer) => mutate(async () => {
    const result = await supabase.from('offers').delete().eq('id', offer.id).eq('origin', 'screenshot');
    if (result.error) { setError('Could not remove this offer. Please try again.'); return false; }
    setRows(previous => previous.filter(row => row.id !== offer.id));
    return true;
  });

  return { offers: rows, favorites, matches, latestRun, loading: loading && !loaded, loaded, busy, error, reload: load, saveFavorite, rejectMatch, saveScreenshotOffers, removeOffer };
}
export type OffersState = ReturnType<typeof useOffers>;
