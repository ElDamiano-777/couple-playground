import { useEffect, useRef, useState } from "react";
import { supabase } from "../shared/client";
import { validBirthday } from './birthdays';

export type FamilyKind = `child` | `pet`;
export type FamilyProfile = {
  id: string;
  household_id: string;
  kind: FamilyKind;
  name: string;
  animal_type: string | null;
  birth_date: string | null;
  created_by: string | null;
  created_at: string;
};
type Draft = { name: string; animalType: string; birthDate: string };
const emptyDraft = (): Draft => ({ name: ``, animalType: ``, birthDate: `` });
const emptyDrafts = () => ({ child: emptyDraft(), pet: emptyDraft() });
const failure = `We couldn’t save that change. Check your connection and try again. Your unfinished text is still here.`;

export function useFamilyProfiles({
  userId,
  household,
  authReady = true,
  contextLoading = false,
  isPoc = false,
}: {
  userId?: string;
  household: string | null;
  authReady?: boolean;
  contextLoading?: boolean;
  isPoc?: boolean;
}) {
  const scope = `${userId ?? ``}:${household ?? ``}`;
  const currentScope = useRef(scope);
  const scopeEpoch = useRef(0);
  // Invalidate old responses during render, including a quick switch away and back.
  if (currentScope.current !== scope) ++scopeEpoch.current;
  currentScope.current = scope;
  const epoch = scopeEpoch.current;
  const isCurrent = () => currentScope.current === scope && scopeEpoch.current === epoch;
  const storedScope = useRef(scope);
  const generation = useRef(0);
  const mutation = useRef(false);
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [kind, setKind] = useState<FamilyKind>(`child`);
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [edit, setEdit] = useState<(Draft & { id: string; kind: FamilyKind }) | null>(null);
  const [loading, setLoading] = useState(!!(userId && household));
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [error, setError] = useState(``);
  const [notice, setNotice] = useState(``);
  const sameScope = storedScope.current === scope;

  useEffect(() => {
    storedScope.current = scope;
    ++generation.current;
    mutation.current = false;
    setProfiles([]);
    setDrafts(emptyDrafts());
    setEdit(null);
    setError(``);
    setNotice(``);
    setBusy(false);
    setLoading(!!(userId && household));
    let active = true;
    const sync = async () => {
      if (!userId || !household || mutation.current || !navigator.onLine) {
        if (active) setLoading(false);
        return;
      }
      const request = ++generation.current;
      try {
        const result = await supabase.from(`family_profiles`).select(`*`)
          .eq(`household_id`, household).order(`created_at`, { ascending: true });
        if (!active || !isCurrent() || request !== generation.current) return;
        if (result.error) throw result.error;
        setProfiles(result.data as FamilyProfile[]);
        setError(``);
      } catch {
        if (active && isCurrent() && request === generation.current)
          setError(`We couldn’t refresh your family. Check your connection and try again.`);
      } finally {
        if (active && isCurrent() && request === generation.current) setLoading(false);
      }
    };
    void sync();
    const focus = () => { if (!document.hidden) void sync(); };
    const network = () => { setOnline(navigator.onLine); focus(); };
    const timer = window.setInterval(focus, 15000);
    window.addEventListener(`focus`, focus);
    document.addEventListener(`visibilitychange`, focus);
    window.addEventListener(`online`, network);
    window.addEventListener(`offline`, network);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener(`focus`, focus);
      document.removeEventListener(`visibilitychange`, focus);
      window.removeEventListener(`online`, network);
      window.removeEventListener(`offline`, network);
    };
  }, [scope, userId, household]);

  async function perform(action: () => Promise<void>) {
    if (!userId || !household || !isCurrent() || mutation.current) return;
    mutation.current = true;
    ++generation.current;
    setBusy(true);
    setError(``);
    setNotice(``);
    try {
      if (!navigator.onLine) throw new Error(`Offline`);
      await action();
    } catch {
      if (isCurrent()) setError(failure);
    } finally {
      if (isCurrent()) {
        mutation.current = false;
        setBusy(false);
        setLoading(false);
      }
    }
  }
  const valid = (draft: Draft, entryKind: FamilyKind) =>
    draft.name.trim().length > 0 && draft.name.trim().length <= 100 &&
    (entryKind !== `pet` || draft.animalType.trim().length <= 80) && validBirthday(draft.birthDate);
  const validationMessage = (draft: Draft) => !validBirthday(draft.birthDate)
    ? `Choose a valid birthday that isn’t in the future.`
    : `Please enter a name of up to 100 characters and a pet type of up to 80 characters.`;
  function add() {
    const draft = drafts[kind];
    if (!valid(draft, kind)) { setError(validationMessage(draft)); return; }
    return perform(async () => {
      const result = await supabase.from(`family_profiles`).insert({
        household_id: household, kind, name: draft.name.trim(),
        animal_type: kind === `pet` ? draft.animalType.trim() || null : null,
        birth_date: draft.birthDate || null,
      }).select().single();
      if (result.error || !result.data) throw result.error ?? new Error(`No saved profile`);
      if (!isCurrent()) return;
      setProfiles((previous) => [...previous, result.data as FamilyProfile]);
      setDrafts((previous) => ({ ...previous, [kind]: emptyDraft() }));
      setNotice(`Added to your shared family.`);
    });
  }
  function saveEdit() {
    if (!edit) return;
    if (!valid(edit, edit.kind)) { setError(validationMessage(edit)); return; }
    return perform(async () => {
      const result = await supabase.from(`family_profiles`).update({
        name: edit.name.trim(), animal_type: edit.kind === `pet` ? edit.animalType.trim() || null : null,
        birth_date: edit.birthDate || null,
      }).eq(`id`, edit.id).eq(`household_id`, household).select().single();
      if (result.error || !result.data) throw result.error ?? new Error(`No saved profile`);
      if (!isCurrent()) return;
      setProfiles((previous) => previous.map((row) => row.id === edit.id ? result.data as FamilyProfile : row));
      setEdit(null);
      setNotice(`Your shared family is updated.`);
    });
  }
  function remove(profile: FamilyProfile) {
    return perform(async () => {
      const result = await supabase.from(`family_profiles`).delete()
        .eq(`id`, profile.id).eq(`household_id`, household).select(`id`).single();
      if (result.error || !result.data) throw result.error ?? new Error(`No deleted profile`);
      if (!isCurrent()) return;
      setProfiles((previous) => previous.filter((row) => row.id !== profile.id));
      if (edit?.id === profile.id) setEdit(null);
      setNotice(`Removed from your shared family.`);
    });
  }
  return {
    userId, household, authReady, contextLoading, isPoc, kind, setKind,
    profiles: sameScope ? profiles : [],
    drafts: sameScope ? drafts : emptyDrafts(), edit: sameScope ? edit : null,
    dirty: sameScope && (!!edit || Object.values(drafts).some((draft) => !!(draft.name || draft.animalType || draft.birthDate))),
    busy: sameScope && busy, loading: !sameScope || loading, online,
    error: sameScope ? error : ``, notice: sameScope ? notice : ``,
    setDraft: (field: keyof Draft, value: string) => setDrafts((previous) => ({ ...previous, [kind]: { ...previous[kind], [field]: value } })),
    startEdit: (profile: FamilyProfile) => {
      if (edit && !window.confirm(`Discard your unfinished changes to this family card?`)) return;
      setEdit({ id: profile.id, kind: profile.kind, name: profile.name, animalType: profile.animal_type ?? ``, birthDate: profile.birth_date ?? `` });
      setNotice(``);
    },
    setEditField: (field: keyof Draft, value: string) => setEdit((previous) => previous && ({ ...previous, [field]: value })),
    cancelEdit: () => { if (window.confirm(`Discard your unfinished changes to this family card?`)) setEdit(null); },
    add, saveEdit, remove,
  };
}
export type FamilyProfilesState = ReturnType<typeof useFamilyProfiles>;
