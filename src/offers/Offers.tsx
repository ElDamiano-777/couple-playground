import { useMemo, useState } from 'react';
import { ProductIllustration } from '../shared/ProductIllustration';
import type { SharedShoppingState } from '../shared/useSharedShopping';
import { euro, offerKey, storeNames, type StoreId } from '../../supabase/functions/_shared/offerMatching';
import { readBrochureScreenshots, type OfferCandidate } from './brochureText';
import { automaticStores, brochureLinks, isoDate, offerWeek, screenshotStores, type Offer, type OfferMatch, type OffersState } from './useOffers';
import './offers.css';

const stores: StoreId[] = [...automaticStores, ...screenshotStores];
const pageSize = 40;

// "Sat 21.11." – English weekday, German day.month like the brochures.
function shortDate(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`;
}
// Kaufland writes "1 kg = 1.66"; show German decimals like the prices.
const germanDecimals = (text: string) => text.replace(/(\d)\.(\d{2})(?!\d)/g, '$1,$2');
export function validity(offer: Pick<Offer, 'valid_from' | 'valid_to'>, today = offerWeek().today) {
  return offer.valid_from > today ? `from ${shortDate(offer.valid_from)}` : `until ${shortDate(offer.valid_to)}`;
}
/** Notes of the shopping item created from an Offer, e.g. "Lidl · 1,29 € · until Sat 22.11". */
export function offerNotes(offer: Offer) {
  return [offer.brand, offer.quantity_text, storeNames[offer.store], euro(offer.price_cents), validity(offer)].filter(Boolean).join(' · ');
}
const sameText = (a: string, b: string) => a.trim().toLocaleLowerCase('de-DE') === b.trim().toLocaleLowerCase('de-DE');

function OfferCard({ offer, offers, shopping, match }: { offer: Offer; offers: OffersState; shopping: SharedShoppingState; match?: OfferMatch }) {
  const onList = shopping.items.some(item => !item.bought && item.category === 'Home' && sameText(item.name, offer.title));
  const saved = offers.favorites.some(favorite => sameText(favorite.name, offer.title) && sameText(favorite.brand, offer.brand));
  const signedIn = !!shopping.household;
  return <article className={`offer-card${match ? ` offer-card-match offer-card-${match.confidence}` : ''}`}>
    <span className="offer-art" aria-hidden="true"><ProductIllustration name={offer.title} /></span>
    <div className="offer-copy">
      {match && <span className="offer-match-label">{match.confidence === 'sure' ? 'Your favorite' : 'Might match'} · {match.favorite.name}</span>}
      <strong>{offer.title}</strong>
      <small>{[offer.brand, offer.quantity_text].filter(Boolean).join(' · ')}</small>
      <small className="offer-meta"><span className="offer-store" data-store={offer.store}>{storeNames[offer.store]}</span> {validity(offer)}{offer.base_price_text ? ` · ${germanDecimals(offer.base_price_text)}` : ''}</small>
    </div>
    <div className="offer-side">
      <strong className="offer-price">{euro(offer.price_cents)}</strong>
      {offer.regular_price_cents && offer.regular_price_cents > offer.price_cents && <del className="offer-regular" aria-label={`Regular price ${euro(offer.regular_price_cents)}`}>{euro(offer.regular_price_cents)}</del>}
    </div>
    <div className="offer-actions">
      <button type="button" className="offer-add" disabled={!signedIn || onList || shopping.busy} onClick={() => void shopping.addOffer(offer.title, offerNotes(offer))}>{onList ? 'On list ✓' : '+ List'}</button>
      <button type="button" className="offer-favorite" aria-pressed={saved} aria-label={saved ? 'Saved as favorite' : 'Save as favorite'} disabled={!signedIn || saved || offers.busy} onClick={() => void offers.saveFavorite(offer)}>{saved ? '♥' : '♡'}</button>
      {match?.confidence === 'maybe' && <button type="button" className="offer-reject" disabled={offers.busy} onClick={() => void offers.rejectMatch(match)}>Doesn’t match</button>}
      {offer.origin === 'screenshot' && <button type="button" className="offer-reject" disabled={offers.busy} onClick={() => { if (window.confirm(`Remove ${offer.title} from this week’s offers?`)) void offers.removeOffer(offer); }}>Remove</button>}
    </div>
  </article>;
}

type Draft = OfferCandidate & { keep: boolean; price: string };

function ScreenshotImport({ store, offers, onClose }: { store: StoreId; offers: OffersState; onClose: () => void }) {
  const week = offerWeek();
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const saturday = new Date(`${week.sunday}T12:00:00`); saturday.setDate(saturday.getDate() - 1);
  // Brochures run until Saturday; on Sunday the screenshot is for the coming days.
  const [from, setFrom] = useState(week.today);
  const [to, setTo] = useState(isoDate(saturday) < week.today ? week.sunday : isoDate(saturday));
  async function read(files: FileList | null) {
    if (!files?.length) return;
    setReading(true); setMessage('');
    try {
      const found = await readBrochureScreenshots([...files].slice(0, 5));
      setDrafts(found.map(item => ({ ...item, keep: true, price: (item.price_cents / 100).toFixed(2).replace('.', ',') })));
      if (!found.length) setMessage('No products with a price found. Try a sharper screenshot of one brochure page.');
    } catch { setMessage('Could not read the screenshot. Check your connection and try again.'); }
    finally { setReading(false); }
  }
  const valid = (draft: Draft) => draft.title.trim().length >= 2 && /^\d{1,4}([.,]\d{1,2})?$/.test(draft.price.trim());
  const chosen = drafts?.filter(draft => draft.keep) ?? [];
  async function save() {
    if (!chosen.length || chosen.some(draft => !valid(draft)) || to < from) return;
    const items = chosen.map(draft => ({ title: draft.title, price_cents: Math.round(Number(draft.price.trim().replace(',', '.')) * 100) }));
    if (await offers.saveScreenshotOffers(store, items, from, to)) onClose();
  }
  const update = (index: number, change: Partial<Draft>) => setDrafts(previous => previous && previous.map((draft, position) => position === index ? { ...draft, ...change } : draft));
  return <div className="shopping-detail-overlay"><section className="shopping-detail-card offer-import" role="dialog" aria-modal="true" aria-labelledby="offer-import-title">
    <h2 id="offer-import-title">{storeNames[store]} brochure</h2>
    {!drafts && <>
      <p className="offer-import-help">1. Open the {storeNames[store]} brochure for Düren. 2. Take screenshots of the pages you like. 3. Pick them here. You check every product before it is saved.</p>
      <a className="offer-brochure-link" href={brochureLinks[store]} target="_blank" rel="noreferrer">Open {storeNames[store]} brochure ↗</a>
      <label className="primary offer-file">{reading ? 'Reading screenshots…' : 'Choose screenshots'}<input type="file" accept="image/*" multiple disabled={reading} onChange={event => void read(event.target.files)} /></label>
    </>}
    {drafts && <>
      <p className="offer-import-help">Untick what is wrong and fix names or prices. Only ticked products are saved, for your home only.</p>
      <div className="offer-import-list">{drafts.map((draft, index) => <div className={`offer-import-row${valid(draft) ? '' : ' offer-import-invalid'}`} key={index}>
        <input type="checkbox" aria-label={`Keep ${draft.title}`} checked={draft.keep} onChange={event => update(index, { keep: event.target.checked })} />
        <input aria-label="Product name" value={draft.title} maxLength={200} onChange={event => update(index, { title: event.target.value })} />
        <input aria-label="Price in euro" inputMode="decimal" value={draft.price} onChange={event => update(index, { price: event.target.value })} />
      </div>)}</div>
      <div className="offer-import-dates"><label>Valid from<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>until<input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label></div>
    </>}
    {(message || offers.error) && <p className="feedback error-message" role="alert">{message || offers.error}</p>}
    <div className="shopping-edit-actions">
      {drafts && <button type="button" className="primary" disabled={offers.busy || !chosen.length || chosen.some(draft => !valid(draft)) || to < from} onClick={() => void save()}>Save {chosen.length} {chosen.length === 1 ? 'offer' : 'offers'}</button>}
      <button type="button" className="text-action" disabled={offers.busy || reading} onClick={onClose}>Cancel</button>
    </div>
  </section></div>;
}

export default function Offers({ offers, shopping, onBack, backLabel }: { offers: OffersState; shopping: SharedShoppingState; onBack: () => void; backLabel: string }) {
  const [store, setStore] = useState<StoreId | null>(null);
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState(pageSize);
  const [importing, setImporting] = useState<StoreId | null>(null);
  const query = search.trim().toLocaleLowerCase('de-DE');
  const visible = (offer: Offer) => (!store || offer.store === store) && (!query || `${offer.brand} ${offer.title} ${offer.category}`.toLocaleLowerCase('de-DE').includes(query));
  const matches = useMemo(() => {
    const seen = new Set<string>();
    return offers.matches.filter(match => visible(match.offer)).filter(match => {
      const key = `${match.favorite.id}|${offerKey(match.offer)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 30);
  }, [offers.matches, store, query]);
  const list = useMemo(() => offers.offers.filter(visible).sort((a, b) => a.category.localeCompare(b.category, 'de') || a.title.localeCompare(b.title, 'de')), [offers.offers, store, query]);
  const counts = useMemo(() => Object.fromEntries(stores.map(id => [id, offers.offers.filter(offer => offer.store === id).length])) as Record<StoreId, number>, [offers.offers]);
  const failed = automaticStores.filter(id => (!store || store === id) && offers.latestRun[id]?.status === 'failed');
  const missing = screenshotStores.filter(id => (!store || store === id) && !counts[id]);
  let lastCategory = '';
  return <section className="preview-page offers-page">
    <button className="text-action navigation-back" onClick={onBack}>← {backLabel}</button>
    <p className="eyebrow">This week in Düren</p>
    <h1>Offers<span>.</span></h1>
    <p className="page-intro">Kaufland and ALDI SÜD update on their own every Monday and Thursday. Add Lidl, REWE, Netto and EDEKA from a brochure screenshot.</p>
    <label className="shopping-search-label" htmlFor="offer-search">Search offers</label>
    <div className="shopping-search offer-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input id="offer-search" type="search" placeholder="Search offers, e.g. Milch" value={search} onChange={event => { setSearch(event.target.value); setShown(pageSize); }} /></div>
    <div className="offer-stores" role="group" aria-label="Stores">{([null, ...stores] as const).map(id => <button type="button" key={id ?? 'all'} aria-pressed={store === id} onClick={() => { setStore(id); setShown(pageSize); }}>{id ? storeNames[id] : 'All'}<small>{id ? counts[id] : offers.offers.length}</small></button>)}</div>
    {(offers.error || shopping.error) && <p className="feedback error-message" role="alert">{offers.error || shopping.error}</p>}
    {shopping.notice && <p className="feedback" role="status">{shopping.notice}</p>}
    {!shopping.household && <p className="notice">Sign in on the Shopping page to add offers to your list or save favorites.</p>}
    {failed.map(id => <p className="notice" key={id}>{storeNames[id]} offers could not be updated this time. They will try again at the next update.</p>)}
    {missing.length > 0 && shopping.household && <section className="offer-brochures" aria-labelledby="offer-brochures-title">
      <h2 id="offer-brochures-title">More brochures</h2>
      {missing.map(id => <div className="offer-brochure" key={id}><strong>{storeNames[id]}</strong><a href={brochureLinks[id]} target="_blank" rel="noreferrer">Open brochure ↗</a><button type="button" onClick={() => setImporting(id)}>Add screenshot</button></div>)}
    </section>}
    {offers.loading && <p className="home-empty">Loading this week’s offers…</p>}
    {matches.length > 0 && <section aria-labelledby="offer-favorites-title"><h2 className="offer-heading" id="offer-favorites-title">Your favorites on offer <span>{matches.length}</span></h2>
      <div className="offer-list">{matches.map(match => <OfferCard key={`${match.favorite.id}:${match.offer.id}`} offer={match.offer} match={match} offers={offers} shopping={shopping} />)}</div></section>}
    {offers.loaded && <section aria-labelledby="offer-all-title"><h2 className="offer-heading" id="offer-all-title">All offers <span>{list.length}</span></h2>
      {list.length ? <div className="offer-list">{list.slice(0, shown).map(offer => {
        const heading = offer.category !== lastCategory ? offer.category : '';
        lastCategory = offer.category;
        return <div key={offer.id}>{heading && <h3 className="offer-category">{heading}</h3>}<OfferCard offer={offer} offers={offers} shopping={shopping} /></div>;
      })}</div> : <p className="home-empty">{query ? 'No offers match your search.' : store && screenshotStores.includes(store) ? `No ${storeNames[store]} offers yet. Add a brochure screenshot above.` : 'No offers for this week yet.'}</p>}
      {list.length > shown && <button type="button" className="offer-more" onClick={() => setShown(value => value + pageSize)}>Show more ({list.length - shown})</button>}
    </section>}
    {importing && <ScreenshotImport store={importing} offers={offers} onClose={() => setImporting(null)} />}
  </section>;
}

/** Top of the Shopping page: hidden until offers exist. */
export function OffersStrip({ offers, onOpen }: { offers: OffersState; onOpen: () => void }) {
  if (!offers.offers.length) return null;
  const favorites = new Set(offers.matches.filter(match => match.confidence === 'sure').map(match => match.favorite.id)).size;
  const storesWithOffers = new Set(offers.offers.map(offer => offer.store)).size;
  return <button type="button" className="offers-strip" onClick={onOpen}>
    <span className="offers-strip-badge" aria-hidden="true">%</span>
    <span className="offers-strip-copy"><strong>This week’s offers</strong><small>{storesWithOffers} {storesWithOffers === 1 ? 'store' : 'stores'}{favorites ? ` · ${favorites} ${favorites === 1 ? 'favorite' : 'favorites'} on offer` : ` · ${offers.offers.length} offers`}</small></span>
    <span className="home-arrow" aria-hidden="true">›</span>
  </button>;
}

/** Home card: only rendered when a saved Favorite is on Offer. */
export function HomeOffersCard({ offers, onOpen }: { offers: OffersState; onOpen: () => void }) {
  const sure = offers.matches.filter(match => match.confidence === 'sure');
  const best = sure.filter((match, index) => sure.findIndex(other => other.favorite.id === match.favorite.id) === index);
  if (!best.length) return null;
  return <section className="dashboard-card dashboard-active home-offers" aria-labelledby="home-offers-title">
    <div className="home-card-header"><h2 id="home-offers-title"><span className="dashboard-icon offers-icon" aria-hidden="true">%</span>{best.length} {best.length === 1 ? 'favorite' : 'favorites'} on offer</h2><button className="home-view-all" onClick={onOpen}>View all</button></div>
    <div className="home-offer-list">{best.slice(0, 2).map(match => <button type="button" className="home-offer" key={match.favorite.id} onClick={onOpen}><span><strong>{match.offer.title}</strong><small>{storeNames[match.offer.store]} · {validity(match.offer)}</small></span><b>{euro(match.offer.price_cents)}</b></button>)}</div>
  </section>;
}
