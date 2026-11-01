import { useEffect, useRef, useState } from 'react';

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

const groceries = [
  { id: `bread`, name: `Fresh bread`, detail: `For breakfast`, category: `Home` },
  { id: `berries`, name: `Berries`, detail: `One little basket`, category: `Home` },
  { id: `pencils`, name: `Colouring pencils`, detail: `For a creative afternoon`, category: `Kids` },
  { id: `food`, name: `Pet food`, detail: `The usual favourite`, category: `Pets` },
];
const plans = [
  { day: `Today`, time: `18:30`, title: `A little walk together`, detail: `Both of us · A moment to reconnect`, color: `sage` },
  { day: `Tomorrow`, time: `10:00`, title: `Weekly grocery trip`, detail: `Partner A · Everything for the week`, color: `peach` },
  { day: `Later`, time: `Sun`, title: `A slow family breakfast`, detail: `Both of us · No need to rush`, color: `lilac` },
];

export default function HouseholdPreview({ page, navigate }: { page: HouseholdPage; navigate: (page: HouseholdPage) => void }) {
  const [checked, setChecked] = useState<string[]>([`berries`]);
  const [category, setCategory] = useState(`All`);
  const [family, setFamily] = useState<`Kids` | `Pets`>(`Kids`);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.close(); }, [page]);
  const remaining = groceries.length - checked.length;

  const shoppingRows = (compact = false) => <div className="grocery-list">
    {groceries.filter(item => compact ? item.category === `Home` : category === `All` || category === item.category).sort((a, b) => Number(checked.includes(a.id)) - Number(checked.includes(b.id))).map(item => <label className={`grocery-row ${checked.includes(item.id) ? `is-bought` : ``}`} key={item.id}>
      <input type="checkbox" checked={checked.includes(item.id)} onChange={() => setChecked(previous => previous.includes(item.id) ? previous.filter(id => id !== item.id) : [...previous, item.id])} />
      <span className="grocery-copy"><strong>{item.name}</strong><small>{checked.includes(item.id) ? `Bought · sample` : item.detail}</small></span>
      <span className={`category-tag ${item.category.toLowerCase()}`}>{item.category}</span>
    </label>)}
  </div>;

  return <div className="household-preview" lang="en">
    <div className="preview-label"><span>DESIGN PREVIEW</span><p>Sample content to explore. Nothing here is shared or saved.</p></div>

    {page === `home` && <>
      <section className="household-hero">
        <div><p className="eyebrow">A LITTLE MORE TOGETHER</p><h1>Our home<span>.</span></h1><p>A softer place for your everyday life.</p></div>
        <div className="home-art" aria-hidden="true"><span className="art-spark">✧</span><div className="art-house"><Symbol name="home" /><Symbol name="heart" /></div><span className="art-leaf">a place for us</span></div>
      </section>
      <div className="home-overview"><button onClick={() => navigate(`shopping`)}><span className="overview-icon peach"><Symbol name="shopping" /></span><span><strong>{remaining} little things</strong><small>on the shopping list</small></span><Symbol name="arrow" /></button><button onClick={() => navigate(`plans`)}><span className="overview-icon sage"><Symbol name="plans" /></span><span><strong>Time for each other</strong><small>your next plan · 18:30</small></span><Symbol name="arrow" /></button></div>
      <div className="dashboard-grid">
        <section className="dashboard-card today-card"><div className="card-heading"><h2>A moment for us</h2><span className="quiet-tag">Today</span></div><div className="plan-highlight"><span className="time-pill">18:30</span><h3>A little walk <br />together</h3><p>No big plans. Just the two of you.</p><div className="sample-avatars" aria-label="Example: both partners"><span>A</span><span>B</span><small>Both of us</small></div></div><button className="text-action" onClick={() => navigate(`plans`)}>See our plans <Symbol name="arrow" /></button></section>
        <section className="dashboard-card"><div className="card-heading"><h2>Pick up a little love</h2><Symbol name="shopping" /></div>{shoppingRows(true)}<button className="text-action" onClick={() => navigate(`shopping`)}>Open shopping list <Symbol name="arrow" /></button></section>
      </div>
      <section className="activity-peek"><span className="activity-dot" /><div><p>A little update</p><span>Partner B marked berries as bought.</span><small>Example activity</small></div><button aria-label="See example updates" onClick={() => navigate(`activity`)}><Symbol name="arrow" /></button></section>
      <p className="home-signoff">Less to remember. More room for each other. <span>♡</span></p>
    </>}

    {page === `shopping` && <section className="preview-page"><p className="eyebrow">THE LITTLE THINGS WE NEED</p><h1>Shopping<span>.</span></h1><p className="page-intro">One list for all the corners of your life.</p><div className="filter-tabs" aria-label="Shopping categories">{[`All`, `Home`, `Kids`, `Pets`].map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div><section className="dashboard-card"><div className="card-heading"><h2>Our little list</h2><span className="quiet-tag">{remaining} to buy</span></div>{shoppingRows()}<p className="preview-hint">Try the checkboxes. These examples reset when you reopen the app.</p></section></section>}

    {page === `plans` && <section className="preview-page"><p className="eyebrow">MAKE TIME FOR WHAT MATTERS</p><h1>Our plans<span>.</span></h1><p className="page-intro">Everyday errands and moments worth keeping.</p><div className="plan-list">{plans.map(plan => <section key={plan.day}><h2 className="day-label">{plan.day}</h2><article className={`plan-item ${plan.color}`}><span className="plan-time">{plan.time}</span><div><h3>{plan.title}</h3><p>{plan.detail}</p></div><Symbol name="plans" /></article></section>)}</div><p className="preview-hint">Example plans. Real dates and reminders will come after you connect as a couple.</p></section>}

    {page === `family` && <section className="preview-page"><p className="eyebrow">EVERYONE WE LOVE</p><h1>Our family<span>.</span></h1><p className="page-intro">A little space for every member of your home.</p><div className="family-grid">{([`Kids`, `Pets`] as const).map(value => <button className={`family-card ${value === `Kids` ? `peach` : `sage`}`} key={value} aria-pressed={family === value} onClick={() => setFamily(value)}><span className="family-drawing" aria-hidden="true">{value === `Kids` ? `☀` : `♧`}</span><strong>{value === `Kids` ? `Little humans` : `Furry friends`}</strong><span>{value === `Kids` ? `Their days, their little needs` : `A happy life, paws included`}</span><small>Example section <Symbol name="arrow" /></small></button>)}</div><section className="dashboard-card family-detail"><div className="card-heading"><h2>{family === `Kids` ? `For the little ones` : `For our furry friends`}</h2><span className="quiet-tag">Example</span></div><p>{family === `Kids` ? `Colouring pencils for a creative afternoon` : `Pet food — the usual favourite`}</p><p className="preview-hint">Names, individual cards and family tasks can be added in a later step.</p><button className="text-action" onClick={() => navigate(`shopping`)}>See shopping <Symbol name="arrow" /></button></section></section>}

    {page === `activity` && <section className="preview-page"><p className="eyebrow">KEEPING EACH OTHER IN THE LOOP</p><h1>Little updates<span>.</span></h1><p className="page-intro">This is how your shared activity could look.</p><section className="dashboard-card activity-list">{[`Partner B marked berries as bought.`, `Partner A added colouring pencils.`, `Partner B removed a duplicate item.`].map((text, index) => <div className="activity-entry" key={text}><span className={`activity-avatar ${index === 1 ? `peach` : `sage`}`}>{index === 1 ? `A` : `B`}</span><div><p>{text}</p><small>Example activity</small></div></div>)}</section><div className="notification-note"><Symbol name="bell" /><p>Phone notifications aren’t connected yet. We’ll set them up after your shared space is ready.</p></div></section>}

    <button className="add-fab" aria-label="Add to our home" onClick={() => dialog.current?.showModal()}><Symbol name="plus" /><span>Add</span></button>
    <dialog className="add-dialog" ref={dialog} aria-labelledby="add-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button className="dialog-close" aria-label="Close add menu" onClick={() => dialog.current?.close()}>×</button><p className="eyebrow">A LITTLE SOMETHING NEW</p><h2 id="add-title">What’s on your mind?</h2><p>This is a design preview. Adding and sharing will be available after we connect your shared space.</p><button className="add-option" onClick={() => { dialog.current?.close(); navigate(`shopping`); }}><Symbol name="shopping" />Explore shopping <Symbol name="arrow" /></button><button className="add-option" onClick={() => { dialog.current?.close(); navigate(`plans`); }}><Symbol name="plans" />Explore plans <Symbol name="arrow" /></button></dialog>
  </div>;
}
