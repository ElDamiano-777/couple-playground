import { useEffect, useState } from 'react';
import { supabase } from '../shared/client';
import { prepareNotePhoto } from '../notes/notePhotos';
import { useMobileModal } from '../ui/useMobileModal';
import './wishlist.css';

type Wish = { id: string; title: string; notes: string; created_by: string | null; wish_photo: string | null; wish_url: string | null; wish_price_cents: number | null; wish_priority: 'idea' | 'want' | 'dream'; wish_fulfilled_at: string | null };
type Draft = { title: string; notes: string; photo: string; url: string; price: string; priority: Wish['wish_priority'] };
const blank = (): Draft => ({ title: '', notes: '', photo: '', url: '', price: '', priority: 'idea' });
const priority = { idea: 'Just an idea', want: 'Really want', dream: 'Dream gift' };

export default function Wishlist({ userId, household, onSignIn }: { userId?: string; household: string | null; onSignIn: () => void }) {
  const [wishes, setWishes] = useState<Wish[]>([]), [plans, setPlans] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'mine' | 'partner'>('mine'), [fulfilled, setFulfilled] = useState(false);
  const [editing, setEditing] = useState<Wish | null>(null), [adding, setAdding] = useState(false), [detail, setDetail] = useState<Wish | null>(null);
  const [draft, setDraft] = useState<Draft>(blank), [error, setError] = useState(''), [busy, setBusy] = useState(false), [photoBusy, setPhotoBusy] = useState(false), [loading, setLoading] = useState(true);
  const { bounds, keepFocusedVisible } = useMobileModal(adding, '.wish-editor');
  useEffect(() => {
    if (!userId || !household) { setWishes([]); setPlans([]); setLoading(false); return; }
    let active = true;
    const refresh = async () => {
      const [items, marks, profiles] = await Promise.all([
        supabase.from('folder_entries').select('id,title,notes,created_by,wish_photo,wish_url,wish_price_cents,wish_priority,wish_fulfilled_at').eq('household_id', household).eq('kind', 'wish').order('created_at', { ascending: false }),
        supabase.from('wish_gift_plans').select('wish_id'),
        supabase.from('household_member_profiles').select('user_id,display_name').eq('household_id', household),
      ]);
      if (!active) return;
      if (items.error || marks.error || profiles.error) { setError('Could not load wishes. Please try again.'); setLoading(false); return; }
      setWishes(items.data as Wish[]); setPlans((marks.data ?? []).map(row => row.wish_id));
      setNames(Object.fromEntries((profiles.data ?? []).map(row => [row.user_id, row.display_name]))); setLoading(false);
    };
    void refresh();
    const channel = supabase.channel(`wishlist-${household}-${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'folder_entries', filter: `household_id=eq.${household}` }, () => void refresh()).subscribe();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    const focus = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); void supabase.removeChannel(channel); };
  }, [userId, household]);
  const other = Object.keys(names).find(id => id !== userId);
  const displayed = wishes.filter(w => (tab === 'mine' ? w.created_by === userId || w.created_by === null : w.created_by !== userId) && !!w.wish_fulfilled_at === fulfilled);
  const begin = (wish?: Wish) => { setEditing(wish ?? null); setDraft(wish ? { title: wish.title, notes: wish.notes, photo: wish.wish_photo ?? '', url: wish.wish_url ?? '', price: wish.wish_price_cents === null ? '' : (wish.wish_price_cents / 100).toFixed(2), priority: wish.wish_priority } : blank()); setError(''); setAdding(true); };
  const save = async () => {
    if (busy || !userId || !household) return;
    const title = draft.title.trim(), price = draft.price.trim();
    let url: string | null = null;
    try { if (draft.url.trim()) { const parsed = new URL(draft.url.trim()); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); url = parsed.href; } } catch { setError('Enter a valid http or https link.'); return; }
    if (!title || title.length > 150 || (price && (!/^\d+(?:[.,]\d{1,2})?$/.test(price) || Number(price.replace(',', '.')) > 1000000))) { setError('Enter a name and a valid price in euros.'); return; }
    setBusy(true); setError('');
    const values = { title, notes: draft.notes, wish_photo: draft.photo || null, wish_url: url, wish_price_cents: price ? Math.round(Number(price.replace(',', '.')) * 100) : null, wish_priority: draft.priority };
    try {
    const result = editing ? await supabase.from('folder_entries').update(values).eq('id', editing.id).eq('created_by', userId).select().single() : await supabase.from('folder_entries').insert({ ...values, household_id: household, kind: 'wish' }).select().single();
    if (result.error || !result.data) setError('Could not save your wish. Your changes are still here.');
    else { const saved = result.data as Wish; setWishes(old => editing ? old.map(w => w.id === saved.id ? saved : w) : [saved, ...old]); setAdding(false); setDetail(null); }
    } catch { setError('Could not save your wish. Your changes are still here.'); } finally { setBusy(false); }
  };
  const togglePlan = async (wish: Wish) => {
    if (busy || !userId || wish.created_by === userId || wish.created_by === null) return;
    setBusy(true); setError(''); const marked = plans.includes(wish.id);
    try {
    const result = marked ? await supabase.from('wish_gift_plans').delete().eq('wish_id', wish.id).eq('planner_id', userId) : await supabase.from('wish_gift_plans').insert({ wish_id: wish.id });
    if (result.error) setError('Could not update your private plan. Please try again.'); else setPlans(old => marked ? old.filter(id => id !== wish.id) : [...old, wish.id]);
    } catch { setError('Could not update your private plan. Please try again.'); } finally { setBusy(false); }
  };
  const changeStatus = async (wish: Wish, remove = false) => {
    if (busy || wish.created_by !== userId) return;
    if (remove && !window.confirm('Delete this wish?')) return;
    setBusy(true); setError('');
    try {
    const result = remove ? await supabase.from('folder_entries').delete().eq('id', wish.id).eq('created_by', userId).select('id').single() : await supabase.from('folder_entries').update({ wish_fulfilled_at: wish.wish_fulfilled_at ? null : new Date().toISOString() }).eq('id', wish.id).eq('created_by', userId).select().single();
    if (result.error || !result.data) setError('Could not update this wish. Please try again.');
    else { setWishes(old => remove ? old.filter(w => w.id !== wish.id) : old.map(w => w.id === wish.id ? result.data as Wish : w)); setDetail(null); }
    } catch { setError('Could not update this wish. Please try again.'); } finally { setBusy(false); }
  };
  return <section className="preview-page wishlist-page"><p className="eyebrow">LITTLE THINGS TO WISH FOR</p><h1>Wishlist<span>.</span></h1>
    {!userId || !household ? <div className="dashboard-card"><p>Sign in to see your wishlists.</p><button className="primary" onClick={onSignIn}>Sign in</button></div> : <>
      <div className="wish-tabs" role="group" aria-label="Wishlists"><button aria-pressed={tab === 'mine'} onClick={() => { setTab('mine'); setFulfilled(false); }}>My Wishlist <small>{names[userId] ?? 'You'}</small></button><button aria-pressed={tab === 'partner'} onClick={() => { setTab('partner'); setFulfilled(false); }}>Partner’s Wishlist <small>{other ? names[other] : 'Partner'}</small></button></div>
      <div className="wish-toolbar"><span>{displayed.length} {displayed.length === 1 ? 'wish' : 'wishes'}</span><button onClick={() => setFulfilled(!fulfilled)}>{fulfilled ? 'Active wishes' : 'Fulfilled wishes'}</button>{tab === 'mine' && <button className="primary" onClick={() => begin()}>+ Add wish</button>}</div>
      {error && !adding && <p className="feedback error-message" role="alert">{error}</p>}{loading ? <p role="status">Loading wishes…</p> : displayed.length === 0 ? <p className="wish-empty">{fulfilled ? 'No fulfilled wishes yet.' : 'No wishes here yet.'}</p> : <div className="wish-grid">{displayed.map(wish => <article className="wish-card" key={wish.id}><button className="wish-open" onClick={() => setDetail(wish)}><span className="wish-photo">{wish.wish_photo ? <img src={wish.wish_photo} alt="" /> : <span aria-hidden="true">✧</span>}</span><strong>{wish.title}</strong><span>{priority[wish.wish_priority] ?? 'Just an idea'}</span>{wish.wish_price_cents !== null && <b>€{(wish.wish_price_cents / 100).toFixed(2)}</b>}</button>{wish.wish_url && <a className="wish-product-link" href={wish.wish_url} target="_blank" rel="noopener noreferrer">View product ↗</a>}{wish.created_by === null && <small>Earlier wish</small>}{plans.includes(wish.id) && wish.created_by !== userId && <small className="wish-plan">🎁 Planning as a gift</small>}</article>)}</div>}
      {detail && <div className="wish-overlay"><section className="wish-detail" role="dialog" aria-modal="true" aria-label="Wish details"><button className="wish-close" onClick={() => setDetail(null)}>Close</button><div className="wish-photo detail-photo">{detail.wish_photo ? <img src={detail.wish_photo} alt="" /> : '✧'}</div><h2>{detail.title}</h2><p>{priority[detail.wish_priority]}</p>{detail.wish_price_cents !== null && <p>€{(detail.wish_price_cents / 100).toFixed(2)}</p>}{detail.notes && <p className="wish-notes">{detail.notes}</p>}{detail.wish_url && <a href={detail.wish_url} target="_blank" rel="noopener noreferrer">Open product link ↗</a>}{detail.created_by === userId ? <div className="wish-actions"><button onClick={() => { setDetail(null); begin(detail); }}>Edit</button><button disabled={busy} onClick={() => void changeStatus(detail)}>{detail.wish_fulfilled_at ? 'Restore wish' : 'Mark fulfilled'}</button><button disabled={busy} onClick={() => void changeStatus(detail, true)}>Delete</button></div> : detail.created_by && <button className="wish-plan-button" disabled={busy} onClick={() => void togglePlan(detail)}>{plans.includes(detail.id) ? '🎁 Remove private gift plan' : '🎁 Planning as a gift'}</button>}<p className="small-print">{detail.created_by !== userId && detail.created_by ? 'Your gift plan is private to you.' : ''}</p></section></div>}
      {adding && <div className="wish-overlay" style={bounds ?? undefined}><form className="wish-editor" role="dialog" aria-modal="true" aria-label={editing ? 'Edit wish' : 'New wish'} onFocusCapture={keepFocusedVisible} onSubmit={e => { e.preventDefault(); void save(); }}><div className="wish-editor-heading"><h2>{editing ? 'Edit wish' : 'New wish'}</h2><button type="button" onClick={() => setAdding(false)}>Cancel</button></div><label>Wish name<input required maxLength={150} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label><label>Photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e => { const file = e.target.files?.[0]; if (file) { setPhotoBusy(true); void prepareNotePhoto(file).then(photo => setDraft(old => ({ ...old, photo }))).catch(err => setError(err instanceof Error ? err.message : 'Could not open photo.')).finally(() => setPhotoBusy(false)); } }} /></label>{draft.photo && <div className="wish-photo preview-photo"><img src={draft.photo} alt="Selected wish" /><button type="button" onClick={() => setDraft({ ...draft, photo: '' })}>Remove photo</button></div>}<label>Product link (optional)<input type="url" value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })} /></label><label>Estimated price in EUR (optional)<input inputMode="decimal" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} /></label><label>Priority<select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Wish['wish_priority'] })}><option value="idea">Just an idea</option><option value="want">Really want</option><option value="dream">Dream gift</option></select></label><label>Notes (optional)<textarea rows={3} maxLength={20000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>{error && <p role="alert">{error}</p>}<button className="primary" disabled={busy || photoBusy || !draft.title.trim()}>{busy ? 'Saving…' : photoBusy ? 'Preparing photo…' : 'Save wish'}</button></form></div>}
    </>}</section>;
}
