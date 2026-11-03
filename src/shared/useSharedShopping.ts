import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import config from "../../app.config.json";
import { supabase, pocAccounts, type PocUsername } from "./client";
import { formatPetFoodDetails, type PetFoodForShopping } from "./usePetFoodShopping";

export type ShoppingItem = {
  id: string;
  household_id: string;
  name: string;
  notes: string;
  favorite_id: string | null;
  pet_food_id: string | null;
  category: `Home` | `Kids` | `Pets`;
  bought: boolean;
  created_by: string | null;
  created_at: string;
};

export type QuickItem = { id: string; name: string; notes: string; favoriteId?: string; favoritePhoto?: string | null; petFoodId?: string; petFoodPhoto?: string | null };
type ShoppingCategory = ShoppingItem[`category`];
const emptyQuick = (): Record<ShoppingCategory, QuickItem[]> => ({ Home: [], Pets: [], Kids: [] });
const emptyCustom = (): Record<ShoppingCategory, string> => ({ Home: ``, Pets: ``, Kids: `` });

function friendlyError(error: unknown): string {
  const text =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message || ``);
  const code = (error as { code?: string })?.code;
  if (
    code === `email_address_not_authorized` ||
    /Error sending confirmation email/i.test(text)
  )
    return `Your confirmation email couldn’t be sent. Please ask Damian to finish email delivery, then try again.`;
  if (text === `Pet food details are too long`) return `This pet food has too many details to add. Please shorten its notes first.`;
  if (text === `Unknown POC username`)
    return `Use masha or damian as your username.`;
  if (/Invalid login credentials/i.test(text))
    return `That login and password don’t match. Please try again.`;
  if (/Email not confirmed/i.test(text))
    return `Please confirm your email first, then sign in.`;
  if (/Invalid or expired invitation/i.test(text))
    return `That invitation has expired or was already used. Ask your partner for a new code.`;
  if (/already has two/i.test(text)) return `This home already has two people.`;
  if (/Already in a household/i.test(text))
    return `You already have a home. Refresh your list to open it.`;
  if (/rate limit|too many/i.test(text))
    return `Please wait a little before trying again.`;
  return `We couldn’t complete that. Check your connection and try again. Your unfinished text is still here.`;
}

export function useSharedShopping() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [household, setHousehold] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [favoritePhotos, setFavoritePhotos] = useState<Record<string, string | null>>({});
  const [petFoodPhotos, setPetFoodPhotos] = useState<Record<string, string | null>>({});
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(``);
  const [notice, setNotice] = useState(``);
  const [invite, setInvite] = useState(``);
  const [username, setUsername] = useState(``);
  const [email, setEmail] = useState(``);
  const [password, setPassword] = useState(``);
  const [code, setCode] = useState(``);
  const [draft, setDraft] = useState(``);
  const [draftNotes, setDraftNotes] = useState(``);
  const [category, setCategory] = useState<ShoppingItem[`category`]>(`Home`);
  const [edit, setEdit] = useState<{ id: string; name: string; notes: string; category: ShoppingItem[`category`] } | null>(null);
  const [quickItems, setQuickItems] = useState(emptyQuick);
  const [quickCustom, setQuickCustom] = useState(emptyCustom);
  const pocUsername =
    session?.user.app_metadata?.together_poc === true
      ? ((Object.keys(pocAccounts) as PocUsername[]).find(
          (name) => pocAccounts[name] === session.user.email,
        ) ?? null)
      : null;
  const isPoc = pocUsername !== null;
  const userId = session?.user.id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const requestVersion = useRef(0);
  const mutationPending = useRef(false);
  const dirty = !!(draft.trim() || draftNotes.trim() || code.trim() || email.trim() || password || edit || Object.values(quickItems).some(items => items.length) || Object.values(quickCustom).some(value => value.trim()));

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      if (active) {
        if (currentUser.current !== value?.user.id) {
          currentUser.current = value?.user.id;
          ++requestVersion.current;
          setHousehold(null);
          setItems([]);
          setFavoritePhotos({});
          setPetFoodPhotos({});
          setMemberCount(0);
          setInvite(``);
          setDraft(``);
          setDraftNotes(``);
          setEdit(null);
          setQuickItems(emptyQuick());
          setQuickCustom(emptyCustom());
          setCode(``);
          setPassword(``);
          setEmail(``);
        }
        setSession(value);
        setAuthReady(true);
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error)
        setError(`We couldn’t restore your sign-in. Please sign in again.`);
      setSession(data.session);
      setAuthReady(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const version = ++requestVersion.current;
    const { data: home, error: homeError } =
      await supabase.rpc(`current_household`);
    if (homeError) throw homeError;
    let nextItems: ShoppingItem[] = [];
    let nextCount = 0;
    let nextPhotos: Record<string, string | null> = {};
    let nextPetFoodPhotos: Record<string, string | null> = {};
    let photosFailed = false;
    if (home) {
      const [shopping, members] = await Promise.all([
        supabase
          .from(`shopping_items`)
          .select(`*`)
          .eq(`household_id`, home)
          .order(`created_at`, { ascending: false }),
        supabase
          .from(`household_members`)
          .select(`user_id`)
          .eq(`household_id`, home),
      ]);
      if (shopping.error) throw shopping.error;
      if (members.error) throw members.error;
      nextItems = shopping.data as ShoppingItem[];
      nextCount = members.data.length;
      const ids = [...new Set(nextItems.map(item => item.favorite_id).filter((id): id is string => !!id))];
      if (ids.length) {
        const photos = await supabase.from(`shopping_favorites`).select(`id,photo`).eq(`household_id`, home).in(`id`, ids);
        if (photos.error) photosFailed = true;
        else nextPhotos = Object.fromEntries((photos.data as { id: string; photo: string | null }[]).map(item => [item.id, item.photo]));
      }
      const petFoodIds = [...new Set(nextItems.map(item => item.pet_food_id).filter((id): id is string => !!id))];
      if (petFoodIds.length) {
        const photos = await supabase.from(`pet_food`).select(`id,photo`).in(`id`, petFoodIds);
        if (photos.error) photosFailed = true;
        else nextPetFoodPhotos = Object.fromEntries((photos.data as { id: string; photo: string | null }[]).map(item => [item.id, item.photo]));
      }
    }
    if (currentUser.current !== userId || version !== requestVersion.current)
      return;
    setHousehold(home);
    setItems(nextItems);
    setFavoritePhotos(nextPhotos);
    setPetFoodPhotos(nextPetFoodPhotos);
    setMemberCount(nextCount);
    setError(photosFailed ? `We couldn’t load some product photos. Please refresh the list.` : ``);
  }, [userId]);

  useEffect(() => {
    setHousehold(null);
    setItems([]);
    setFavoritePhotos({});
    setPetFoodPhotos({});
    setMemberCount(0);
    setInvite(``);
    setError(``);
    setNotice(``);
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    const sync = async (initial = false) => {
      if (initial) setLoading(true);
      try {
        await refresh();
      } catch (error) {
        if (active) setError(friendlyError(error));
      } finally {
        if (active) setLoading(false);
      }
    };
    void sync(true);
    const onFocus = () => {
      void sync();
    };
    const onVisible = () => {
      if (!document.hidden) void sync();
    };
    document.addEventListener(`visibilitychange`, onVisible);
    const timer = window.setInterval(() => {
      if (!document.hidden) void sync();
    }, 15000);
    window.addEventListener(`focus`, onFocus);
    window.addEventListener(`online`, onFocus);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener(`visibilitychange`, onVisible);
      window.removeEventListener(`focus`, onFocus);
      window.removeEventListener(`online`, onFocus);
    };
  }, [userId, refresh]);

  async function perform(action: () => Promise<void>) {
    if (mutationPending.current) return false;
    mutationPending.current = true;
    ++requestVersion.current;
    setBusy(true);
    setError(``);
    setNotice(``);
    try {
      await action();
      return true;
    } catch (error) {
      setError(friendlyError(error));
      return false;
    } finally {
      mutationPending.current = false;
      setBusy(false);
    }
  }

  const authenticatePoc = () =>
    perform(async () => {
      const name = username.trim().toLowerCase();
      if (name !== `masha` && name !== `damian`)
        throw new Error(`Unknown POC username`);
      const result = await supabase.auth.signInWithPassword({
        email: pocAccounts[name],
        password,
      });
      if (result.error) throw result.error;
      setPassword(``);
      setEmail(``);
      setUsername(name);
    });

  const authenticate = (create: boolean) =>
    perform(async () => {
      const result = create
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: config.appUrl },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) throw result.error;
      setPassword(``);
      setEmail(``);
      setNotice(
        create && !result.data.session
          ? `Check your email and confirm your account. Then return here and sign in.`
          : `You’re signed in.`,
      );
    });

  const createHome = () =>
    perform(async () => {
      const result = await supabase.rpc(`create_household`);
      if (result.error) throw result.error;
      await refresh();
    });
  const joinHome = () =>
    perform(async () => {
      const result = await supabase.rpc(`join_household`, {
        invitation_code: code.trim().toLowerCase(),
      });
      if (result.error) throw result.error;
      setCode(``);
      await refresh();
    });
  const createInvite = () =>
    perform(async () => {
      const result = await supabase.rpc(`create_household_invitation`);
      if (result.error) throw result.error;
      setInvite(result.data);
    });
  const add = () =>
    perform(async () => {
      if (!household || !draft.trim()) return;
      if (!navigator.onLine) throw new Error(`Offline`);
      const result = await supabase
        .from(`shopping_items`)
        .insert({ household_id: household, name: draft.trim(), category, notes: draftNotes.trim() })
        .select()
        .single();
      if (result.error) throw result.error;
      if (currentUser.current !== userId) return;
      ++requestVersion.current;
      setItems((previous) => [result.data as ShoppingItem, ...previous]);
      setDraft(``);
      setDraftNotes(``);
      setNotice(`Added to your shared list.`);
    });
  const addQuickCategories = (targets: ShoppingCategory[]) =>
    perform(async () => {
      const selected = targets.flatMap(category => quickItems[category].map(item => ({ ...item, category })));
      if (!household || !selected.length || !navigator.onLine) throw new Error(`Offline`);
      if (selected.some(item => item.notes.length > 20000)) throw new Error(`Pet food details are too long`);
      const result = await supabase.from(`shopping_items`).insert(selected.map(item => ({
        household_id: household, category: item.category, name: item.name.trim(), notes: item.notes.trim(), favorite_id: item.favoriteId ?? null, pet_food_id: item.petFoodId ?? null,
      }))).select();
      if (result.error || !result.data) throw result.error ?? new Error(`No saved items`);
      if (currentUser.current !== userId) return;
      ++requestVersion.current;
      setItems(previous => [...result.data as ShoppingItem[], ...previous]);
      setFavoritePhotos(previous => ({ ...previous, ...Object.fromEntries(selected.filter(item => item.favoriteId).map(item => [item.favoriteId!, item.favoritePhoto ?? null])) }));
      setPetFoodPhotos(previous => ({ ...previous, ...Object.fromEntries(selected.filter(item => item.petFoodId).map(item => [item.petFoodId!, item.petFoodPhoto ?? null])) }));
      setQuickItems(previous => ({ ...previous, ...Object.fromEntries(targets.map(target => [target, []])) }));
      setNotice(`${selected.length} ${selected.length === 1 ? `item` : `items`} added to your shared list.`);
    });
  const addQuick = (target: ShoppingCategory) => addQuickCategories([target]);
  const addQuickAll = () => addQuickCategories([`Home`, `Pets`, `Kids`]);
  const addRecipeIngredients = (ingredients: { name: string; notes: string }[]) =>
    perform(async () => {
      if (!household || !ingredients.length || !navigator.onLine) throw new Error(`Offline`);
      const result = await supabase.from(`shopping_items`).insert(ingredients.map(item => ({
        household_id: household, category: `Home`, name: item.name, notes: item.notes,
      }))).select();
      if (result.error || !result.data) throw result.error ?? new Error(`No saved items`);
      if (currentUser.current !== userId) return;
      ++requestVersion.current;
      setItems(previous => [...result.data as ShoppingItem[], ...previous]);
      setNotice(`${ingredients.length} ${ingredients.length === 1 ? `item` : `items`} added to your shared list.`);
    });
  const addPetFood = (food: PetFoodForShopping) =>
    perform(async () => {
      if (!household || !navigator.onLine) throw new Error(`Offline`);
      const details = formatPetFoodDetails(food);
      if (details.length > 20000) throw new Error(`Pet food details are too long`);
      const result = await supabase.from(`shopping_items`).insert({ household_id: household, category: `Pets`, name: food.name, notes: details, pet_food_id: food.id }).select().single();
      if (result.error || !result.data) throw result.error ?? new Error(`No saved item`);
      if (currentUser.current !== userId) return;
      ++requestVersion.current;
      setItems(previous => [result.data as ShoppingItem, ...previous]);
      setPetFoodPhotos(previous => ({ ...previous, [food.id]: food.photo }));
      setNotice(`Added to your shared Pets list.`);
    });
  const saveEdit = () =>
    perform(async () => {
      if (!edit || !edit.name.trim() || !navigator.onLine) throw new Error(`Offline`);
      const result = await supabase.from(`shopping_items`)
        .update({ name: edit.name.trim(), notes: edit.notes.trim(), category: edit.category })
        .eq(`id`, edit.id).select().single();
      if (result.error) throw result.error;
      ++requestVersion.current;
      if (currentUser.current === userId) {
        setItems(previous => previous.map(row => row.id === edit.id ? result.data as ShoppingItem : row));
        setEdit(null);
        setNotice(`Your shared list is updated.`);
      }
    });
  const markBought = (item: ShoppingItem) =>
    perform(async () => {
      if (!navigator.onLine) throw new Error(`Offline`);
      // Render only the row confirmed by the server; partner devices poll independently.
      const result = await supabase
        .from(`shopping_items`)
        .update({ bought: !item.bought })
        .eq(`id`, item.id)
        .select()
        .single();
      if (result.error) throw result.error;
      ++requestVersion.current;
      if (currentUser.current === userId)
        setItems((previous) =>
          previous.map((row) =>
            row.id === item.id ? (result.data as ShoppingItem) : row,
          ),
        );
    });
  const remove = (item: ShoppingItem) =>
    perform(async () => {
      if (!navigator.onLine) throw new Error(`Offline`);
      const result = await supabase
        .from(`shopping_items`)
        .delete()
        .eq(`id`, item.id)
        .select(`id`)
        .single();
      if (result.error) throw result.error;
      ++requestVersion.current;
      if (currentUser.current === userId)
        setItems((previous) => previous.filter((row) => row.id !== item.id));
    });
  const signOut = () =>
    perform(async () => {
      const { error } = await supabase.auth.signOut({ scope: `local` });
      if (error) throw error;
      setSession(null);
      setHousehold(null);
      setItems([]);
      setFavoritePhotos({});
      setPetFoodPhotos({});
      setDraft(``);
      setDraftNotes(``);
      setEdit(null);
      setQuickItems(emptyQuick());
      setQuickCustom(emptyCustom());
      setCode(``);
      setInvite(``);
    });
  const deleteAccount = () =>
    perform(async () => {
      const { error } = await supabase.rpc(`delete_my_account`);
      if (error) throw error;
      await supabase.auth.signOut({ scope: `local` });
      setSession(null);
      setHousehold(null);
      setItems([]);
      setFavoritePhotos({});
      setPetFoodPhotos({});
      setDraft(``);
      setDraftNotes(``);
      setEdit(null);
      setQuickItems(emptyQuick());
      setQuickCustom(emptyCustom());
      setCode(``);
      setInvite(``);
      setNotice(`Your account has been deleted.`);
    });

  return {
    session,
    isPoc,
    pocUsername,
    username,
    setUsername,
    authenticatePoc,
    authReady,
    household,
    items,
    favoritePhotos,
    petFoodPhotos,
    memberCount,
    loading,
    busy,
    error,
    notice,
    invite,
    email,
    password,
    code,
    draft,
    draftNotes,
    category,
    dirty,
    setEmail,
    setPassword,
    setCode,
    setDraft,
    setDraftNotes,
    setCategory,
    quickItems,
    quickCustom,
    setQuickItems: (target: ShoppingCategory, items: QuickItem[]) => setQuickItems(previous => ({ ...previous, [target]: items })),
    setQuickCustom: (target: ShoppingCategory, value: string) => setQuickCustom(previous => ({ ...previous, [target]: value })),
    addQuick,
    addQuickAll,
    addRecipeIngredients,
    addPetFood,
    edit,
    startEdit: (item: ShoppingItem) => setEdit({ id: item.id, name: item.name, notes: item.notes ?? ``, category: item.category }),
    setEditName: (name: string) => setEdit(previous => previous && ({ ...previous, name })),
    setEditNotes: (notes: string) => setEdit(previous => previous && ({ ...previous, notes })),
    setEditCategory: (category: ShoppingItem[`category`]) => setEdit(previous => previous && ({ ...previous, category })),
    cancelEdit: () => setEdit(null),
    saveEdit,
    authenticate,
    createHome,
    joinHome,
    createInvite,
    add,
    markBought,
    remove,
    signOut,
    deleteAccount,
    refresh: () => perform(refresh),
  };
}
export type SharedShoppingState = ReturnType<typeof useSharedShopping>;
