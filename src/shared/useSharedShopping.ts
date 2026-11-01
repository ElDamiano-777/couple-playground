import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import config from "../../app.config.json";
import { supabase } from "./client";

export type ShoppingItem = {
  id: string;
  household_id: string;
  name: string;
  category: `Home` | `Kids` | `Pets`;
  bought: boolean;
  created_by: string | null;
  created_at: string;
};

function friendlyError(error: unknown): string {
  const text =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message || ``);
  if (/Invalid login credentials/i.test(text))
    return `That email and password don’t match. Please try again.`;
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
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(``);
  const [notice, setNotice] = useState(``);
  const [invite, setInvite] = useState(``);
  const [email, setEmail] = useState(``);
  const [password, setPassword] = useState(``);
  const [code, setCode] = useState(``);
  const [draft, setDraft] = useState(``);
  const [category, setCategory] = useState<ShoppingItem[`category`]>(`Home`);
  const userId = session?.user.id;
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const requestVersion = useRef(0);
  const dirty = !!(draft.trim() || code.trim() || email.trim() || password);

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      if (active) {
        if (currentUser.current !== value?.user.id) {
          currentUser.current = value?.user.id;
          ++requestVersion.current;
          setHousehold(null);
          setItems([]);
          setMemberCount(0);
          setInvite(``);
          setDraft(``);
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
    }
    if (currentUser.current !== userId || version !== requestVersion.current)
      return;
    setHousehold(home);
    setItems(nextItems);
    setMemberCount(nextCount);
    setError(``);
  }, [userId]);

  useEffect(() => {
    setHousehold(null);
    setItems([]);
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
    if (busy) return;
    ++requestVersion.current;
    setBusy(true);
    setError(``);
    setNotice(``);
    try {
      await action();
    } catch (error) {
      setError(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

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
        .insert({ household_id: household, name: draft.trim(), category })
        .select()
        .single();
      if (result.error) throw result.error;
      if (currentUser.current !== userId) return;
      ++requestVersion.current;
      setItems((previous) => [result.data as ShoppingItem, ...previous]);
      setDraft(``);
      setNotice(`Added to your shared list.`);
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
      setDraft(``);
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
      setDraft(``);
      setCode(``);
      setInvite(``);
      setNotice(`Your account has been deleted.`);
    });

  return {
    session,
    authReady,
    household,
    items,
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
    category,
    dirty,
    setEmail,
    setPassword,
    setCode,
    setDraft,
    setCategory,
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
