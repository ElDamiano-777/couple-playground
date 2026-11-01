import "./family.css";
import type { FamilyProfilesState } from "./useFamilyProfiles";
import PetTypeSelect from './PetTypeSelect';

function FamilyBody({ state, onSignIn }: { state: FamilyProfilesState; onSignIn: () => void }) {
  if (!state.authReady || state.contextLoading)
    return <p role="status">Opening your family…</p>;
  if (!state.userId || !state.household)
    return <section className="dashboard-card">
      <h2>Your shared family</h2>
      <p>{state.userId ? `Connect your home in Shopping to add your children and pets here.` : `Sign in to add your children and pets to your shared home.`}</p>
      <button className="primary" onClick={onSignIn}>{state.userId ? `Connect our home` : `Sign in to Family`}</button>
    </section>;
  const pet = state.kind === `pet`;
  const draft = state.drafts[state.kind];
  const rows = state.profiles.filter((row) => row.kind === state.kind);
  const disabled = state.busy || !state.online;
  return <div className="family-profiles">
    <p className="page-intro">Your children and pets, together in your shared home. Saved changes appear on both phones.</p>
    {state.isPoc && <p className="notice">POC test space shared by both test accounts. Don’t enter sensitive personal information.</p>}
    <div className="filter-tabs" role="tablist" aria-label="Family members">
      <button role="tab" aria-selected={!pet} aria-pressed={!pet} onClick={() => state.setKind(`child`)}>Kids</button>
      <button role="tab" aria-selected={pet} aria-pressed={pet} onClick={() => state.setKind(`pet`)}>Pets</button>
    </div>
    {!state.online && <p className="notice" role="status">You’re offline. Your unfinished text stays here. Reconnect to save changes.</p>}
    {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}
    {state.notice && <p className="feedback" role="status">{state.notice}</p>}
    <section aria-label={pet ? `Pets` : `Kids`}>
      {state.loading ? <p role="status">Opening your shared family…</p> : rows.length === 0 && <section className="dashboard-card"><h2>{pet ? `No pets added yet` : `No children added yet`}</h2><p>{pet ? `Add your first pet below.` : `Add your first child below.`}</p></section>}
      {rows.map((profile) => <article className="dashboard-card" key={profile.id}>
        {state.edit?.id === profile.id ? <form className="note-form" onSubmit={(event) => { event.preventDefault(); void state.saveEdit(); }}>
          <h2>Edit {profile.name}</h2>
          <label htmlFor="family-edit-name">Name</label>
          <input id="family-edit-name" required maxLength={100} value={state.edit.name} disabled={state.busy} onChange={(event) => state.setEditField(`name`, event.target.value)} />
          {pet && <PetTypeSelect id="family-edit-type" value={state.edit.animalType} disabled={state.busy} onChange={value => state.setEditField(`animalType`, value)} />}
          <button className="primary" disabled={disabled} type="submit">Save changes</button>
          <button type="button" disabled={state.busy} onClick={state.cancelEdit}>Cancel editing</button>
        </form> : <>
          <h2>{profile.name}</h2>
          <p>{profile.kind === `pet` ? profile.animal_type || `Pet` : `Child`}</p>
          <button className="text-action" disabled={state.busy} aria-label={`Edit ${profile.name}`} onClick={() => state.startEdit(profile)}>Edit</button>
          <button className="text-action" disabled={disabled} aria-label={`Remove ${profile.name}`} onClick={() => {
            if (window.confirm(`Remove “${profile.name}” from your shared family? This removes the card for both of you.`)) void state.remove(profile);
          }}>Remove</button>
        </>}
      </article>)}
    </section>
    <form className="note-form" onSubmit={(event) => { event.preventDefault(); void state.add(); }}>
      <h2>{pet ? `Add a pet` : `Add a child`}</h2>
      <label htmlFor="family-add-name">{pet ? `Pet’s name` : `Child’s name`}</label>
      <input id="family-add-name" required maxLength={100} value={draft.name} disabled={state.busy} onChange={(event) => state.setDraft(`name`, event.target.value)} />
      {pet && <PetTypeSelect id="family-add-type" value={draft.animalType} disabled={state.busy} onChange={value => state.setDraft(`animalType`, value)} />}
      <button className="primary" disabled={disabled || !draft.name.trim()} type="submit">{state.busy ? `Saving…` : pet ? `Add pet to our home` : `Add child to our home`}</button>
      <p className="small-print">Saved online and shared with the accounts in your home. You need a connection to save changes.</p>
    </form>
  </div>;
}
export function FamilyProfiles(props: { state: FamilyProfilesState; onSignIn: () => void }) {
  return <section className="preview-page"><p className="eyebrow">EVERYONE WE LOVE</p><h1>Our family<span>.</span></h1><FamilyBody {...props} /></section>;
}
export default FamilyProfiles;
