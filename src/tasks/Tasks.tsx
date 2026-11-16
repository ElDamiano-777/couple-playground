import { useEffect, useMemo, useRef, useState } from 'react';
import type { HouseholdTasksState, HouseholdTask, TaskAssignee, TaskPriority, TaskRepeat } from './useHouseholdTasks';
import './tasks.css';
import TaskBadges from './TaskBadges';

type Viewer = 'masha' | 'damian';
type Filter = 'all' | 'mine' | 'partner' | 'completed';
const weekdays = [[1, 'Monday'], [2, 'Tuesday'], [3, 'Wednesday'], [4, 'Thursday'], [5, 'Friday'], [6, 'Saturday'], [0, 'Sunday']] as const;
const empty = (viewer: Viewer) => ({ title: '', assignee: viewer as TaskAssignee, dueDate: '', priority: 'normal' as TaskPriority, notes: '', repeat: 'never' as TaskRepeat, repeatDays: [] as number[] });
const taskDraft = (task: HouseholdTask) => ({ title: task.title, assignee: task.assignee, dueDate: task.due_date ?? '', priority: task.priority, notes: task.notes ?? '', repeat: task.repeat_rule ?? 'never', repeatDays: task.repeat_days ?? [] });

export default function Tasks({ state, viewer, initialTask = null, initialAdd = false }: { state: HouseholdTasksState; viewer: Viewer; initialTask?: HouseholdTask | null; initialAdd?: boolean }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<HouseholdTask | null>(initialTask);
  const [adding, setAdding] = useState(initialAdd || !!initialTask);
  const [draft, setDraft] = useState(() => initialTask ? taskDraft(initialTask) : empty(viewer));
  const [undo, setUndo] = useState<HouseholdTask | null>(null);
  const [viewportBounds, setViewportBounds] = useState<{ top: number; height: number; bottom: 'auto' } | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const keepFocusedVisible = () => {
    window.requestAnimationFrame(() => {
      const editor = editorRef.current, focused = document.activeElement;
      if (!editor || !(focused instanceof HTMLElement) || !editor.contains(focused)) return;
      const box = editor.getBoundingClientRect(), target = focused.getBoundingClientRect();
      if (target.bottom > box.bottom - 16) editor.scrollTop += target.bottom - box.bottom + 16;
      else if (target.top < box.top + 16) editor.scrollTop -= box.top + 16 - target.top;
    });
  };
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => { setViewportBounds({ top: viewport.offsetTop, height: viewport.height, bottom: 'auto' }); keepFocusedVisible(); };
    viewport.addEventListener('resize', update); viewport.addEventListener('scroll', update);
    update();
    return () => { viewport.removeEventListener('resize', update); viewport.removeEventListener('scroll', update); };
  }, []);
  useEffect(() => { if (adding) keepFocusedVisible(); }, [adding, viewportBounds]);
  const partner = viewer === 'masha' ? 'damian' : 'masha';
  const lists = useMemo(() => {
    const active = state.items.filter(task => !task.completed_at);
    return { all: active, mine: active.filter(task => task.assignee === viewer || task.assignee === 'both'), partner: active.filter(task => task.assignee === partner || task.assignee === 'both'), completed: state.items.filter(task => !!task.completed_at) };
  }, [partner, state.items, viewer]);
  const begin = (task?: HouseholdTask) => { setEditing(task ?? null); setDraft(task ? taskDraft(task) : empty(viewer)); setAdding(true); };
  const invalidRepeat = draft.repeat !== 'never' && (!draft.dueDate || (draft.repeat === 'weekdays' && !draft.repeatDays.length));
  const save = async () => {
    const anchor = editing?.due_date === draft.dueDate && editing.repeat_anchor ? editing.repeat_anchor : draft.dueDate ? Number(draft.dueDate.slice(-2)) : null;
    const success = await state.save({ ...draft, repeatAnchor: anchor, id: editing?.id });
    if (success) { setAdding(false); setEditing(null); }
  };
  return <section className="tasks-page"><p className="eyebrow">SHARED HOUSEHOLD</p><h1>Tasks<span>.</span></h1><p className="tasks-lead">Small things, clearly shared.</p><div className="tasks-actions"><div className="task-filters" role="group" aria-label="Task filters">{([['all', 'All'], ['mine', 'Mine'], ['partner', partner === 'masha' ? 'Masha' : 'Damian'], ['completed', 'Completed']] as [Filter, string][]).map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} <span>{lists[id].length}</span></button>)}</div><button className="primary" disabled={state.busy} onClick={() => begin()}>+ Add task</button></div>
    {state.error && <p className="feedback error-message" role="alert">{state.error}</p>}{state.notice && <p className="feedback" role="status">{state.notice}{undo && <button className="undo-task" onClick={() => { void state.complete(undo, false).then(success => { if (success) setUndo(null); }); }}>Undo</button>}</p>}
    {state.loading ? <p role="status">Loading tasks…</p> : <div className="tasks-list">{lists[filter].length ? lists[filter].map(task => <article className={`task-row ${task.completed_at ? 'done' : ''}`} key={task.id}><input aria-label={`${task.completed_at ? 'Restore' : 'Complete'} ${task.title}`} type="checkbox" checked={!!task.completed_at} disabled={state.busy} onChange={() => { void state.complete(task, !task.completed_at).then(success => { if (success && !task.completed_at) setUndo(task); }); }} /><button className="task-main" onClick={() => begin(task)}><strong>{task.title}</strong><TaskBadges task={task} /></button><button className="task-remove" aria-label={`Delete ${task.title}`} disabled={state.busy} onClick={() => { if (window.confirm(`Delete “${task.title}”?`)) void state.remove(task); }}>×</button></article>) : <p className="tasks-empty">No tasks here.</p>}</div>}
    {adding && <div className="task-overlay" style={viewportBounds ?? undefined}><section ref={editorRef} onFocusCapture={keepFocusedVisible} className="task-editor" role="dialog" aria-modal="true" aria-labelledby="task-editor-title"><div className="task-editor-heading"><h2 id="task-editor-title">{editing ? 'Edit task' : 'New task'}</h2><button onClick={() => setAdding(false)}>Close</button></div><label>Task<input autoFocus maxLength={300} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label><label>Assign to<select value={draft.assignee} onChange={event => setDraft({ ...draft, assignee: event.target.value as TaskAssignee })}><option value="masha">Masha</option><option value="damian">Damian</option><option value="both">Both</option></select></label><label>Due date (optional)<input type="date" value={draft.dueDate} onChange={event => setDraft({ ...draft, dueDate: event.target.value })} /></label><label>Priority<select value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value as TaskPriority })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label><label>Notes (optional)<textarea rows={2} maxLength={10000} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label><label>Repeat<select value={draft.repeat} onChange={event => setDraft({ ...draft, repeat: event.target.value as TaskRepeat })}><option value="never">Never</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option><option value="weekdays">Custom weekdays</option></select></label>{draft.repeat === 'weekdays' && <fieldset className="task-weekdays"><legend>Repeat on</legend>{weekdays.map(([value, label]) => <label key={value}><input type="checkbox" checked={draft.repeatDays.includes(value)} onChange={() => setDraft({ ...draft, repeatDays: draft.repeatDays.includes(value) ? draft.repeatDays.filter(day => day !== value) : [...draft.repeatDays, value] })} />{label}</label>)}</fieldset>}{draft.repeat !== 'never' && !draft.dueDate && <p className="task-repeat-help">Choose a due date for recurring tasks.</p>}{draft.repeat === 'weekdays' && !draft.repeatDays.length && <p className="task-repeat-help">Choose at least one weekday.</p>}<button className="primary" disabled={state.busy || !draft.title.trim() || invalidRepeat} onClick={() => void save()}>Save task</button></section></div>}
  </section>;
}
