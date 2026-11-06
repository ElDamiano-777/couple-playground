import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../shared/client';

export type TaskAssignee = 'masha' | 'damian' | 'both';
export type TaskPriority = 'low' | 'normal' | 'high';
export type HouseholdTask = { id: string; household_id: string; title: string; assignee: TaskAssignee; due_date: string | null; priority: TaskPriority; completed_at: string | null; created_at: string };
const failure = 'We couldn’t update this task. Check your connection and try again.';
export function useHouseholdTasks({ userId, household }: { userId?: string; household: string | null }) {
  const [items, setItems] = useState<HouseholdTask[]>([]); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    if (!userId || !household) { setItems([]); return; }
    setLoading(true);
    try { const result = await supabase.from('household_tasks').select('*').eq('household_id', household).order('completed_at', { ascending: true }).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }); if (result.error) throw result.error; setItems(result.data as HouseholdTask[]); setError(''); }
    catch { setError(failure); } finally { setLoading(false); }
  }, [household, userId]);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000); const focus = () => { if (!document.hidden) void refresh(); }; window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus); return () => { clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); }; }, [refresh]);
  useEffect(() => {
    if (!household) return;
    const channel = supabase.channel(`together-tasks-${household}`).on('postgres_changes', { event: '*', schema: 'public', table: 'household_tasks', filter: `household_id=eq.${household}` }, () => { void refresh(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [household, refresh]);
  const save = async (draft: { id?: string; title: string; assignee: TaskAssignee; dueDate: string; priority: TaskPriority }) => {
    if (!household || busy || !navigator.onLine || !draft.title.trim()) return false;
    setBusy(true); setError(''); setNotice('');
    try { const values = { title: draft.title.trim(), assignee: draft.assignee, due_date: draft.dueDate || null, priority: draft.priority }; const result = draft.id ? await supabase.from('household_tasks').update(values).eq('id', draft.id).eq('household_id', household).select().single() : await supabase.from('household_tasks').insert({ household_id: household, ...values }).select().single(); if (result.error || !result.data) throw result.error; const saved = result.data as HouseholdTask; setItems(previous => [saved, ...previous.filter(item => item.id !== saved.id)]); setNotice('Task saved.'); return true; }
    catch { setError(failure); return false; } finally { setBusy(false); }
  };
  const complete = async (task: HouseholdTask, completed: boolean) => {
    if (busy || !navigator.onLine) return false;
    setBusy(true); setError('');
    try { const result = await supabase.from('household_tasks').update({ completed_at: completed ? new Date().toISOString() : null }).eq('id', task.id).eq('household_id', task.household_id).select().single(); if (result.error || !result.data) throw result.error; const saved = result.data as HouseholdTask; setItems(previous => previous.map(item => item.id === saved.id ? saved : item)); setNotice(completed ? 'Task completed.' : 'Task restored.'); return true; }
    catch { setError(failure); return false; } finally { setBusy(false); }
  };
  const remove = async (task: HouseholdTask) => { if (busy || !navigator.onLine) return false; setBusy(true); setError(''); try { const result = await supabase.from('household_tasks').delete().eq('id', task.id).eq('household_id', task.household_id).select('id').single(); if (result.error) throw result.error; setItems(previous => previous.filter(item => item.id !== task.id)); setNotice('Task removed.'); return true; } catch { setError(failure); return false; } finally { setBusy(false); } };
  return { items, loading, busy, error, notice, refresh, save, complete, remove };
}
export type HouseholdTasksState = ReturnType<typeof useHouseholdTasks>;
