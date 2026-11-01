import { useEffect, useRef } from 'react';
import FamilyProfiles from './family/FamilyProfiles';
import type { FamilyProfilesState } from './family/useFamilyProfiles';
import SharedShopping from './shared/SharedShopping';
import type { SharedShoppingState } from './shared/useSharedShopping';

export type HouseholdPage = `home` | `shopping` | `plans` | `family` | `activity`;
type SymbolName = `home` | `shopping` | `plans` | `family` | `bell` | `plus` | `arrow` | `heart`;

export function Symbol({ name }: { name: SymbolName }) {
  const paths: Record<SymbolName, string> = {
    home: `m3 10 9-7 9 7v10H15v-7H9v7H3Z`,
    shopping: `M5 7h14l2 14H3L5 7Zm3 0V6a4 4 0 0 1 8 0v1`,
    plans: `M4 5h16v16H4ZM8 2v6m8-6v6M4 11h16m-12 4h3m2 0h3`,
    family: `M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10v-3a6 6 0 0 1 12 0v3m3-17a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5v1`,
    bell: `M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4`,
    plus: `M12 5v14M5 12h14`,
    arrow: `M4 12h16m-6-6 6 6-6 6`,
    heart: `M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 3 11 8 15 5-4 13-10 8-15Z`,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

const plans = [
  { day: `Today`, time: `18:30`, title: `A little walk together`, detail: `Both of us · A moment to reconnect`, color: `sage` },
  { day: `Tomorrow`, time: `10:00`, title: `Weekly grocery trip`, detail: `Partner A · Everything for the week`, color: `peach` },
  { day: `Later`, time: `Sun`, title: `A slow family breakfast`, detail: `Both of us · No need to rush`, color: `lilac` },
];

export default function HouseholdPreview({ page, navigate, shopping, family }: { page: HouseholdPage; navigate: (page: HouseholdPage) => void; shopping: SharedShoppingState; family: FamilyProfilesState }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.close(); }, [page]);
  const remaining = shopping.items.filter(item => !item.bought).length;
  if (page === `shopping`) return <SharedShopping state={shopping} hasFamilyDraft={family.dirty} />;
  const shoppingRows = () => <div className="grocery-list">
    {shopping.household ? shopping.items.slice(0, 3).map(item => <div className={`grocery-row ${item.bought ? `is-bought` : ``}`} key={item.id}><span className="grocery-copy"><strong>{item.name}</strong><small>{item.bought ? `Bought` : item.category}</small></span></div>) : <p className="page-intro">Sign in to add the things you need and share them with your partner.</p>}
    {shopping.household && shopping.items.length === 0 && <p className="page-intro">Your shared list is ready for its first purchase.</p>}
  </div>;

  return <div className="household-preview" lang="en">
    <div className="preview-label"><span>YOUR SPACE</span><p>Shopping and family cards are shared. Plans and updates are still examples.</p></div>

    {page === `home` && <>
      <section className="household-hero">
        <div><p className="eyebrow">A LITTLE MORE TOGETHER</p><h1>Our home<span>.</span></h1><p>A softer place for your everyday life.</p></div>
        <div className="home-art" aria-hidden="true"><span className="art-spark">✧</span><div className="art-house"><Symbol name="home" /><Symbol name="heart" /></div><span className="art-leaf">a place for us</span></div>
      </section>
      <div className="home-overview"><button onClick={() => navigate(`shopping`)}><span className="overview-icon peach"><Symbol name="shopping" /></span><span><strong>{shopping.household ? `${remaining} little things` : `Your shopping`}</strong><small>one list for both of you</small></span><Symbol name="arrow" /></button><button onClick={() => navigate(`plans`)}><span className="overview-icon sage"><Symbol name="plans" /></span><span><strong>Time for each other</strong><small>your next plan · 18:30</small></span><Symbol name="arrow" /></button></div>
      <div className="dashboard-grid">
        <section className="dashboard-card today-card"><div className="card-heading"><h2>A moment for us</h2><span className="quiet-tag">Today</span></div><div className="plan-highlight"><span className="time-pill">18:30</span><h3>A little walk <br />together</h3><p>No big plans. Just the two of you.</p><div className="sample-avatars" aria-label="Example: both partners"><span>A</span><span>B</span><small>Both of us</small></div></div><button className="text-action" onClick={() => navigate(`plans`)}>See our plans <Symbol name="arrow" /></button></section>
        <section className="dashboard-card"><div className="card-heading"><h2>Pick up a little love</h2><Symbol name="shopping" /></div>{shoppingRows()}<button className="text-action" onClick={() => navigate(`shopping`)}>Open shopping list <Symbol name="arrow" /></button></section>
      </div>
      <section className="activity-peek"><span className="activity-dot" /><div><p>A little update</p><span>Partner B marked berries as bought.</span><small>Example activity</small></div><button aria-label="See example updates" onClick={() => navigate(`activity`)}><Symbol name="arrow" /></button></section>
      <p className="home-signoff">Less to remember. More room for each other. <span>♡</span></p>
    </>}

    {page === `plans` && <section className="preview-page"><p className="eyebrow">MAKE TIME FOR WHAT MATTERS</p><h1>Our plans<span>.</span></h1><p className="page-intro">Everyday errands and moments worth keeping.</p><div className="plan-list">{plans.map(plan => <section key={plan.day}><h2 className="day-label">{plan.day}</h2><article className={`plan-item ${plan.color}`}><span className="plan-time">{plan.time}</span><div><h3>{plan.title}</h3><p>{plan.detail}</p></div><Symbol name="plans" /></article></section>)}</div><p className="preview-hint">Example plans. Real dates and reminders will come after you connect as a couple.</p></section>}

    {page === `family` && <FamilyProfiles state={family} onSignIn={() => navigate(`shopping`)} />}

    {page === `activity` && <section className="preview-page"><p className="eyebrow">KEEPING EACH OTHER IN THE LOOP</p><h1>Little updates<span>.</span></h1><p className="page-intro">This is how your shared activity could look.</p><section className="dashboard-card activity-list">{[`Partner B marked berries as bought.`, `Partner A added colouring pencils.`, `Partner B removed a duplicate item.`].map((text, index) => <div className="activity-entry" key={text}><span className={`activity-avatar ${index === 1 ? `peach` : `sage`}`}>{index === 1 ? `A` : `B`}</span><div><p>{text}</p><small>Example activity</small></div></div>)}</section><div className="notification-note"><Symbol name="bell" /><p>Phone notifications aren’t connected yet. We’ll set them up after your shared space is ready.</p></div></section>}

    <button className="add-fab" aria-label="Add to our home" onClick={() => dialog.current?.showModal()}><Symbol name="plus" /><span>Add</span></button>
    <dialog className="add-dialog" ref={dialog} aria-labelledby="add-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button className="dialog-close" aria-label="Close add menu" onClick={() => dialog.current?.close()}>×</button><p className="eyebrow">A LITTLE SOMETHING NEW</p><h2 id="add-title">What’s on your mind?</h2><p>Add purchases or family members to your shared home. Plans are still a design preview.</p><button className="add-option" onClick={() => { dialog.current?.close(); navigate(`shopping`); }}><Symbol name="shopping" />Add a purchase <Symbol name="arrow" /></button><button className="add-option" onClick={() => { dialog.current?.close(); navigate(`family`); }}><Symbol name="family" />Add a child or pet <Symbol name="arrow" /></button><button className="add-option" onClick={() => { dialog.current?.close(); navigate(`plans`); }}><Symbol name="plans" />Explore plans <Symbol name="arrow" /></button></dialog>
  </div>;
}
