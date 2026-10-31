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
    catch { setLoadFailed(true); setMessage(`Не удалось открыть заметки. Попробуй открыть приложение ещё раз — мы не будем их перезаписывать.`); }
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
      setMessage(`Сохранено на этом телефоне.`);
    } catch {
      setMessage(`Не получилось сохранить. Текст остался здесь — попробуй ещё раз.`);
    }
  }

  function navigate(next: Page) {
    setPage(next);
    if (!loadFailed) setMessage(``);
    window.scrollTo({ top: 0, behavior: `instant` });
  }

  return <div className="app">
    <a className="skip-link" href="#main">К содержимому</a>
    <header className="header">
      <a className="wordmark" href={config.basePath} aria-label="Рядом — главная"><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />{config.name}<span>место для двоих</span></a>
      <span className="edition"><span />Начало вашей истории</span>
    </header>

    {!online && <div className="notice" role="status">Сейчас нет связи. Заметки можно сохранить на этом телефоне.</div>}
    {updateReady && <div className="notice update" role="status">
      <span>{draft.trim() ? `Есть обновление. Сначала сохрани свою заметку.` : `Для вас есть обновление.`}</span>
      <button disabled={!!draft.trim()} onClick={() => window.location.replace(`${config.appUrl}?v=${Date.now()}`)}>Обновить</button>
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
          <div className="section-label"><h2 id="start-title">Начнём с малого</h2><span>Без спешки. По-вашему.</span></div>
          <div className="starter-grid">
            <button className="start-card note-card" onClick={() => navigate(`notes`)}>
              <span className="card-icon"><Icon name="note" /></span><span className="card-copy"><strong>Мысль на потом</strong><span>Сохрани то, что не хочется забыть.</span></span><Icon name="arrow" />
            </button>
            <button className="start-card create-card" onClick={() => navigate(`more`)}>
              <span className="card-icon"><Icon name="spark" /></span><span className="card-copy"><strong>А дальше — твоя идея</strong><span>Придумай, каким станет ваше место.</span></span><Icon name="arrow" />
            </button>
          </div>
        </section>
        <aside className="gentle-note"><Icon name="heart" /><p>Это только начало. Здесь пока нет правил,<br />кроме одного: пусть вам будет хорошо вместе.</p></aside>
      </>}

      {page === `notes` && <section className="inner-page">
        <p className="eyebrow">МАЛЕНЬКИЕ ВАЖНЫЕ ВЕЩИ</p>
        <h1>Мысли на потом<span>.</span></h1>
        <p className="intro">Идея для вечера, тёплые слова или что-то совсем ваше.</p>
        <div className="local-label"><span />Пока только на этом телефоне. Общего доступа ещё нет.</div>
        <form className="note-form" onSubmit={save}>
          <label htmlFor="thought">Что хочется сохранить?</label>
          <textarea id="thought" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Например, однажды встретить рассвет у моря…" rows={4} />
          <button className="primary" disabled={!draft.trim() || loadFailed} type="submit">Сохранить мысль <Icon name="plus" /></button>
        </form>
        {message && <p className="feedback" role="status">{message}</p>}
        <div className="saved-heading"><h2>Твои заметки</h2><span>{notes.length}</span></div>
        {notes.length === 0 && !loadFailed && <div className="empty-state"><Icon name="note" /><p>Первая мысль может быть совсем маленькой.</p></div>}
        <div className="notes-list">{notes.map(note => <article className="saved-note" key={note.id}>
          <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(`ru-RU`, { day: `numeric`, month: `long` })}</time><p>{note.text}</p>
        </article>)}</div>
      </section>}

      {page === `more` && <section className="inner-page">
        <p className="eyebrow">ПУСТЬ ЭТО БУДЕТ ВАШИМ</p>
        <h1>Всё начинается<br />с идеи<span>.</span></h1>
        <p className="intro">Не нужно разбираться в компьютерах. Просто расскажи помощнику, что хочется изменить.</p>
        <div className="help-card"><span className="card-icon"><Icon name="spark" /></span><h2>Скажи своими словами</h2><p>Открой свою беседу с помощником, нажми микрофон на клавиатуре и расскажи, что придумала. После изменения он даст ссылку на приложение и объяснит, где всё найти.</p><blockquote>«Хочу, чтобы здесь была наша общая коллекция идей для свиданий»</blockquote><p className="muted">Можно по-русски, по-английски или по-немецки.</p></div>
        <div className="help-card"><span className="card-icon peach"><Icon name="home" /></span><h2>Добавь на экран iPhone</h2><p>Открой это приложение в Safari. Нажми «Поделиться», затем «На экран „Домой“». Теперь ваше место будет открываться по своему значку.</p></div>
        <div className="local-label"><span />Пробная версия. Заметки хранятся в этом браузере и пока не передаются партнёру.</div>
        <p className="small-print">Если удалить данные браузера, локальные заметки тоже удалятся. На общем устройстве их смогут прочитать другие пользователи браузера.</p>
      </section>}
    </main>

    <footer className="footer"><span>С маленьких вещей начинается близость.</span><span className="footer-heart">♡</span><span>Рядом · первый шаг</span></footer>
    <nav className="bottom-nav" aria-label="Основная навигация">
      {([{ id: `home`, icon: `home`, label: `Наше место` }, { id: `notes`, icon: `note`, label: `Заметки` }, { id: `more`, icon: `more`, label: `Ещё` }] as const).map(item => <button key={item.id} className={page === item.id ? `active` : ``} aria-current={page === item.id ? `page` : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}
    </nav>
  </div>;
}
