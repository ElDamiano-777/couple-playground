import type { FolderEntriesState } from './useFolderEntries';
import './collections.css';

const labels = {
  recipe: { heading: `Рецепты`, title: `Название рецепта`, notes: `Рецепт (необязательно)`, add: `Добавить рецепт` },
  wish: { heading: `Wishlist`, title: `Желание`, notes: `Заметка (необязательно)`, add: `Добавить желание` },
  place: { heading: `Места`, title: `Название места`, notes: `Адрес или заметка (необязательно)`, add: `Добавить место` },
};
export function FolderEntries({ state, onSignIn }: { state: FolderEntriesState; onSignIn: () => void }) {
  const copy = labels[state.kind];
  const disabled = state.busy || !state.online;
  const draft = state.drafts[state.kind];
  return <section className="preview-page collection-page" lang="ru">
    <p className="eyebrow">ВАША ОБЩАЯ ПАПКА</p><h1>{copy.heading}<span>.</span></h1>
    {!state.authReady || state.contextLoading ? <p role="status">Открываем вашу папку…</p>
      : !state.userId || !state.household ? <section className="dashboard-card">
        <h2>{state.userId ? `Подключите ваш дом` : `Войдите в свой аккаунт`}</h2>
        <p>Эта папка общая для двух аккаунтов вашего дома. {state.userId ? `Подключите дом в покупках, чтобы сохранять записи.` : `Войдите через покупки, чтобы сохранять записи.`}</p>
        <button className="primary" onClick={onSignIn}>{state.userId ? `Подключить дом` : `Войти через покупки`}</button>
      </section> : <>
        <p className="page-intro">Сохранённые записи видны обоим участникам вашего дома. Изменения появляются на обоих телефонах.</p>
        {state.isPoc && <p className="notice">Общее тестовое пространство POC. Не добавляйте конфиденциальные личные данные.</p>}
        {!state.online && <p className="notice" role="status">Вы не в сети. Ваш текст остаётся здесь. Для сохранения нужно соединение.</p>}
        {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
        {state.notice && <p className="feedback" role="status">{state.notice}</p>}
        {state.loading ? <p role="status">Загружаем сохранённые записи…</p> : state.entries.filter((entry) => entry.kind === state.kind).length === 0 && <section className="dashboard-card collection-empty"><h2>Эта папка пока пуста.</h2><p>Добавьте первую запись ниже.</p></section>}
        <div className="collection-list">
          {state.entries.filter((entry) => entry.kind === state.kind).map((entry) => <article key={entry.id} className="dashboard-card">
            {state.edit?.id === entry.id ? <form className="note-form" onSubmit={(event) => { event.preventDefault(); void state.saveEdit(); }}>
              <h2>Изменить запись</h2>
              <label htmlFor="collection-edit-title">{copy.title}</label>
              <input id="collection-edit-title" required maxLength={150} disabled={state.busy} value={state.edit.title} onChange={(event) => state.setEditField(`title`, event.target.value)} />
              <label htmlFor="collection-edit-notes">{copy.notes}</label>
              <textarea id="collection-edit-notes" rows={6} maxLength={20000} disabled={state.busy} value={state.edit.notes} onChange={(event) => state.setEditField(`notes`, event.target.value)} />
              <button className="primary" type="submit" disabled={disabled || !state.edit.title.trim()}>Сохранить изменения</button>
              <button className="text-action" type="button" disabled={state.busy} onClick={state.cancelEdit}>Отменить изменения</button>
            </form> : <>
              <h2>{entry.title}</h2>
              {entry.notes && <p className="collection-notes">{entry.notes}</p>}
              <div className="collection-actions"><button className="text-action" disabled={state.busy} aria-label={`Изменить ${entry.title}`} onClick={() => state.startEdit(entry)}>Изменить</button>
                <button className="text-action" disabled={disabled} aria-label={`Удалить ${entry.title}`} onClick={() => {
                  if (window.confirm(`Удалить «${entry.title}» из общей папки для вас обоих?`)) void state.remove(entry);
                }}>Удалить</button></div>
            </>}
          </article>)}
        </div>
        <form className="note-form" onSubmit={(event) => { event.preventDefault(); void state.add(); }}>
          <h2>{copy.add}</h2>
          <label htmlFor="collection-add-title">{copy.title}</label>
          <input id="collection-add-title" required maxLength={150} disabled={state.busy} value={draft.title} onChange={(event) => state.setDraft(`title`, event.target.value)} />
          <label htmlFor="collection-add-notes">{copy.notes}</label>
          <textarea id="collection-add-notes" rows={6} maxLength={20000} disabled={state.busy} value={draft.notes} onChange={(event) => state.setDraft(`notes`, event.target.value)} />
          <button className="primary" disabled={disabled || !draft.title.trim()} type="submit">{state.busy ? `Сохраняем…` : copy.add}</button>
          <p className="small-print">Запись сохраняется онлайн в общей папке вашего дома.</p>
        </form>
      </>}
  </section>;
}
export default FolderEntries;
