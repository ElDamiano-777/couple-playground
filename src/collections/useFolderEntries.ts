import { useEffect, useRef, useState } from "react";
import { supabase } from "../shared/client";

export type FolderKind = `recipe` | `wish` | `place`;
export type FolderEntry = {
  id: string;
  household_id: string;
  kind: FolderKind;
  title: string;
  notes: string;
  recipe_category: string | null;
  preparation_minutes: number | null;
  recipe_photo: string | null;
  recipe_source_url: string | null;
  recipe_image_url: string | null;
  recipe_servings: string | null;
  recipe_caption: string;
  recipe_ingredients: string;
  recipe_instructions: string;
  created_by: string | null;
  created_at: string;
};
export type Draft = { title: string; notes: string; recipe_category: string; preparation_minutes: string; recipe_photo: string; recipe_source_url: string; recipe_image_url: string; recipe_servings: string; recipe_caption: string; recipe_ingredients: string; recipe_instructions: string };
type Edit = Draft & { id: string; kind: FolderKind };
const emptyDraft = (): Draft => ({ title: ``, notes: ``, recipe_category: ``, preparation_minutes: ``, recipe_photo: ``, recipe_source_url: ``, recipe_image_url: ``, recipe_servings: ``, recipe_caption: ``, recipe_ingredients: ``, recipe_instructions: `` });
const emptyDrafts = () => ({ recipe: emptyDraft(), wish: emptyDraft(), place: emptyDraft() });
const emptyEdits = (): Record<FolderKind, Edit | null> => ({ recipe: null, wish: null, place: null });
const failure = `We couldn’t save this change. Check your connection and try again. Your text is still here.`;

export function useFolderEntries({
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
  const [entries, setEntries] = useState<FolderEntry[]>([]);
  const [kind, setKind] = useState<FolderKind>(`recipe`);
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [edits, setEdits] = useState(emptyEdits);
  const edit = edits[kind];
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
    setEntries([]);
    setDrafts(emptyDrafts());
    setEdits(emptyEdits());
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
        const result = await supabase.from(`folder_entries`).select(`*`)
          .eq(`household_id`, household).order(`created_at`, { ascending: true });
        if (!active || !isCurrent() || request !== generation.current) return;
        if (result.error) throw result.error;
        setEntries(result.data as FolderEntry[]);
        setError(``);
      } catch {
        if (active && isCurrent() && request === generation.current)
          setError(`We couldn’t refresh your folders. Check your connection and try again.`);
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
    const channel = household ? supabase.channel(`together-folders-${household}`)
      .on(`postgres_changes`, { event: `*`, schema: `public`, table: `folder_entries`, filter: `household_id=eq.${household}` }, () => { void sync(); })
      .subscribe() : null;
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
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
      return true;
    } catch {
      if (isCurrent()) setError(failure);
      return false;
    } finally {
      if (isCurrent()) {
        mutation.current = false;
        setBusy(false);
        setLoading(false);
      }
    }
  }
  const valid = (draft: Draft) => draft.title.trim().length > 0 && draft.title.trim().length <= 150 && draft.notes.length <= 20000;
  const validationMessage = `Enter a title up to 150 characters and a note up to 20,000 characters.`;
  function add() {
    const draft = drafts[kind];
    if (!valid(draft)) { setError(validationMessage); return; }
    return perform(async () => {
      const result = await supabase.from(`folder_entries`).insert({
        household_id: household, kind, title: draft.title.trim(), notes: draft.notes,
        ...(kind === `recipe` ? { recipe_category: draft.recipe_category || null, preparation_minutes: draft.preparation_minutes ? Number(draft.preparation_minutes) : null, recipe_photo: draft.recipe_photo || null, recipe_source_url: draft.recipe_source_url || null, recipe_image_url: draft.recipe_image_url || null, recipe_servings: draft.recipe_servings || null, recipe_caption: draft.recipe_caption, recipe_ingredients: draft.recipe_ingredients, recipe_instructions: draft.recipe_instructions } : {}),
      }).select().single();
      if (result.error || !result.data) throw result.error ?? new Error(`No saved entry`);
      if (!isCurrent()) return;
      setEntries((previous) => [...previous, result.data as FolderEntry]);
      setDrafts((previous) => ({ ...previous, [kind]: emptyDraft() }));
      setNotice(`Added to your shared folder.`);
    });
  }
  function saveEdit() {
    if (!edit) return;
    if (!valid(edit)) { setError(validationMessage); return; }
    return perform(async () => {
      const result = await supabase.from(`folder_entries`).update({
        title: edit.title.trim(), notes: edit.notes,
        ...(edit.kind === `recipe` ? { recipe_category: edit.recipe_category || null, preparation_minutes: edit.preparation_minutes ? Number(edit.preparation_minutes) : null, recipe_photo: edit.recipe_photo || null, recipe_source_url: edit.recipe_source_url || null, recipe_image_url: edit.recipe_image_url || null, recipe_servings: edit.recipe_servings || null, recipe_caption: edit.recipe_caption, recipe_ingredients: edit.recipe_ingredients, recipe_instructions: edit.recipe_instructions } : {}),
      }).eq(`id`, edit.id).eq(`household_id`, household).select().single();
      if (result.error || !result.data) throw result.error ?? new Error(`No saved entry`);
      if (!isCurrent()) return;
      setEntries((previous) => previous.map((row) => row.id === edit.id ? result.data as FolderEntry : row));
      setEdits((previous) => ({ ...previous, [edit.kind]: null }));
      setNotice(`Changes saved in your shared folder.`);
    });
  }
  function remove(entry: FolderEntry) {
    return perform(async () => {
      const result = await supabase.from(`folder_entries`).delete()
        .eq(`id`, entry.id).eq(`household_id`, household).select(`id`).single();
      if (result.error || !result.data) throw result.error ?? new Error(`No deleted entry`);
      if (!isCurrent()) return;
      setEntries((previous) => previous.filter((row) => row.id !== entry.id));
      setEdits((previous) => ({ ...previous, [entry.kind]: previous[entry.kind]?.id === entry.id ? null : previous[entry.kind] }));
      setNotice(`Removed from your shared folder.`);
    });
  }
  return {
    userId, household, authReady, contextLoading, isPoc, kind, setKind,
    entries: sameScope ? entries : [],
    drafts: sameScope ? drafts : emptyDrafts(), edit: sameScope ? edit : null,
    dirty: sameScope && (Object.values(edits).some(Boolean) || Object.values(drafts).some((draft) => !!(draft.title || draft.notes || draft.recipe_category || draft.preparation_minutes || draft.recipe_photo || draft.recipe_source_url || draft.recipe_image_url || draft.recipe_servings || draft.recipe_caption || draft.recipe_ingredients || draft.recipe_instructions))),
    busy: sameScope && busy, loading: !sameScope || loading, online,
    error: sameScope ? error : ``, notice: sameScope ? notice : ``,
    setDraft: (field: keyof Draft, value: string) => setDrafts((previous) => ({ ...previous, [kind]: { ...previous[kind], [field]: value } })),
    startEdit: (entry: FolderEntry) => {
      if (edits[entry.kind] && !window.confirm(`Replace unfinished changes in this folder?`)) return;
      setEdits((previous) => ({ ...previous, [entry.kind]: { id: entry.id, kind: entry.kind, title: entry.title, notes: entry.notes, recipe_category: entry.recipe_category ?? ``, preparation_minutes: entry.preparation_minutes?.toString() ?? ``, recipe_photo: entry.recipe_photo ?? ``, recipe_source_url: entry.recipe_source_url ?? ``, recipe_image_url: entry.recipe_image_url ?? ``, recipe_servings: entry.recipe_servings ?? ``, recipe_caption: entry.recipe_caption ?? ``, recipe_ingredients: entry.recipe_ingredients ?? ``, recipe_instructions: entry.recipe_instructions ?? `` } }));
      setNotice(``);
    },
    setEditField: (field: keyof Draft, value: string) => setEdits((previous) => ({ ...previous, [kind]: previous[kind] && { ...previous[kind], [field]: value } })),
    cancelEdit: () => {
      if (window.confirm(`Discard unfinished changes to this entry?`)) setEdits((previous) => ({ ...previous, [kind]: null }));
    },
    add, saveEdit, remove,
  };
}
export type FolderEntriesState = ReturnType<typeof useFolderEntries>;
