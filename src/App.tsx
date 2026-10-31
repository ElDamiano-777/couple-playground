import { useEffect, useState, type FormEvent } from 'react';
import config from '../app.config.json';
import { readNotes, saveNotes, type Note } from './storage';

type Page = `home` | `notes` | `more`;

function Icon({ name }: { name: `heart` | `home` | `note` | `more` | `arrow` | `plus` | `spark` }) {
  const paths = {
    heart: `M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z`,
    home: `m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z`,
    note: `M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4`,
    more: `M4 12h.01M12 12h.01M20 12h.01`,
    arrow: `M4 12h15m-6-6 6 6-6 6`,
    plus: `M12 5v14M5 12h14`,
    spark: `m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z`,
  };
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function App() {
  const [page, setPage] = useState<Page>(`home`);
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState(``);
  const [message, setMessage] = useState(``);
  const [loadFailed, setLoadFailed] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    try { setNotes(readNotes()); }
    catch { setLoadFailed(true); setMessage(`We couldn’t open your notes. Try reopening the app — we won’t overwrite them.`); }
    const syncConnection = () => setOnline(navigator.onLine);
    window.addEventListener(`online`, syncConnection);
    window.addEventListener(`offline`, syncConnection);
    return () => {
      window.removeEventListener(`online`, syncConnection);
      window.removeEventListener(`offline`, syncConnection);
    };
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (draft.trim()) event.preventDefault();
    };
    window.addEventListener(`beforeunload`, warn);
    return () => window.removeEventListener(`beforeunload`, warn);
  }, [draft]);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const check = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: `no-store` });
        if (!response.ok) return;
        const version = await response.json();
        setUpdateReady(typeof version.commit === `string` && version.commit !== __APP_COMMIT__);
      } catch { /* A missed update check must not interrupt the current screen. */ }
    };
    void check();
    window.addEventListener(`focus`, check);
    return () => window.removeEventListener(`focus`, check);
  }, []);

  function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || loadFailed) return;
    const next = [{ id: crypto.randomUUID(), text: draft.trim(), createdAt: new Date().toISOString() }, ...notes];
    try {
      saveNotes(next);
      setNotes(next);
      setDraft(``);
      setMessage(`Saved on this phone.`);
    } catch {
      setMessage(`We couldn’t save that. Your text is still here — please try again.`);
    }
  }

  function navigate(next: Page) {
    setPage(next);
    if (!loadFailed) setMessage(``);
    window.scrollTo({ top: 0, behavior: `instant` });
  }

  return <div className="app">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="header">
      <a className="wordmark" href={config.basePath} aria-label="Together — home"><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />{config.name}<span>a place for two</span></a>
      <span className="edition"><span />Your story starts here</span>
    </header>

    {!online && <div className="notice" role="status">You’re offline. You can still save notes on this phone.</div>}
    {updateReady && <div className="notice update" role="status">
      <span>{draft.trim() ? `There’s an update. Save your note first.` : `There’s a little update for you.`}</span>
      <button disabled={!!draft.trim()} onClick={() => window.location.replace(`${config.appUrl}?v=${Date.now()}`)}>Update</button>
    </div>}

    <main id="main" className="main">
      {page === `home` && <>
        <section className="hero welcome-hero" lang="en">
          <div className="hero-copy">
            <p className="eyebrow">A LITTLE SPACE FOR THE TWO OF US</p>
            <h1>Masheri<span>!</span></h1>
            <p className="welcome-lead">Nice to see you, my love.</p>
            <div className="welcome-message">
              <p>Taking the first step might feel a little scary, but there’s nothing to be frightened of. You don’t need to know how any of this works. Your little app is already running — a blank canvas for you and your big love.</p>
              <p>Now bring your agent and your imagination, and turn whatever you dream of into something real. Go crazy. There are (almost) no limits.</p>
              <p>Your agent will take care of the complicated bits. If something isn’t possible, it will explain why in the simplest words and help you find another way.</p>
              <p className="welcome-invitation">Now open ChatGPT and build some craziiiee cool stuff for us, my love :)</p>
              <p className="welcome-signoff"><span>SUPERMUCH LOVE,</span><span>HUGS AND KISSES :**</span></p>
            </div>
            <a className="primary welcome-cta" href="https://chatgpt.com/codex/cloud" target="_blank" rel="noopener noreferrer">Open ChatGPT <Icon name="arrow" /></a>
          </div>
          <div className="illustration" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <span className="little-star star-one">✦</span><span className="little-star star-two">✧</span>
            <div className="heart-card heart-back"><Icon name="heart" /><span>you</span></div>
            <div className="heart-card heart-front"><Icon name="heart" /><span>me</span></div>
            <span className="tiny-label">better together</span>
          </div>
        </section>

        <section className="start-section" aria-labelledby="start-title">
          <div className="section-label"><h2 id="start-title">Start with something small</h2><span>No rush. Make it yours.</span></div>
          <div className="starter-grid">
            <button className="start-card note-card" onClick={() => navigate(`notes`)}>
              <span className="card-icon"><Icon name="note" /></span><span className="card-copy"><strong>A thought for later</strong><span>Keep a little something you don’t want to forget.</span></span><Icon name="arrow" />
            </button>
            <button className="start-card create-card" onClick={() => navigate(`more`)}>
              <span className="card-icon"><Icon name="spark" /></span><span className="card-copy"><strong>Your next idea</strong><span>Imagine what this space could become.</span></span><Icon name="arrow" />
            </button>
          </div>
        </section>
        <aside className="gentle-note"><Icon name="heart" /><p>This is only the beginning. There’s just one rule:<br />make it something you’ll love together.</p></aside>
      </>}

      {page === `notes` && <section className="inner-page">
        <p className="eyebrow">THE LITTLE THINGS THAT MATTER</p>
        <h1>Thoughts for later<span>.</span></h1>
        <p className="intro">An idea for an evening, a few kind words, or something just for you.</p>
        <div className="local-label"><span />Only on this phone for now. Not shared with your partner yet.</div>
        <form className="note-form" onSubmit={save}>
          <label htmlFor="thought">What would you like to remember?</label>
          <textarea id="thought" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Maybe watching the sunrise by the sea one day…" rows={4} />
          <button className="primary" disabled={!draft.trim() || loadFailed} type="submit">Save thought <Icon name="plus" /></button>
        </form>
        {message && <p className="feedback" role="status">{message}</p>}
        <div className="saved-heading"><h2>Your notes</h2><span>{notes.length}</span></div>
        {notes.length === 0 && !loadFailed && <div className="empty-state"><Icon name="note" /><p>Your first thought can be a tiny one.</p></div>}
        <div className="notes-list">{notes.map(note => <article className="saved-note" key={note.id}>
          <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(`en-GB`, { day: `numeric`, month: `long` })}</time><p>{note.text}</p>
        </article>)}</div>
      </section>}

      {page === `more` && <section className="inner-page">
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1>It all starts<br />with an idea<span>.</span></h1>
        <p className="intro">You don’t need to know about computers. Just tell your agent what you’d like to change.</p>
        <div className="help-card"><span className="card-icon"><Icon name="spark" /></span><h2>Say it in your own words</h2><p>Open your chat with your agent, tap the microphone on your keyboard, and describe your idea. After making the change, your agent will send you the app link and tell you where to find it.</p><blockquote>“I’d love a shared list of date ideas here.”</blockquote><p className="muted">You can speak Russian, English or German.</p></div>
        <div className="help-card"><span className="card-icon peach"><Icon name="home" /></span><h2>Add it to your iPhone</h2><p>Open this app in Safari. Tap Share, then Add to Home Screen. Now you’ll have your own little app icon.</p></div>
        <div className="local-label"><span />This is a little demo. Notes stay in this browser and aren’t shared with your partner yet.</div>
        <p className="small-print">Clearing your browser data also removes these local notes. Other people using the same browser can read them.</p>
      </section>}
    </main>

    <footer className="footer"><span>Little things bring us closer.</span><span className="footer-heart">♡</span><span>Together · the beginning</span></footer>
    <nav className="bottom-nav" aria-label="Main navigation">
      {([{ id: `home`, icon: `home`, label: `Our space` }, { id: `notes`, icon: `note`, label: `Notes` }, { id: `more`, icon: `more`, label: `More` }] as const).map(item => <button key={item.id} className={page === item.id ? `active` : ``} aria-current={page === item.id ? `page` : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
    </nav>
  </div>;
}
