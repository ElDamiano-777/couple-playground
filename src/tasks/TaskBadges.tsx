import type { HouseholdTask } from './useHouseholdTasks';
import { localDate } from '../meals/useMealPlan';
import './task-badges.css';

const assigneeLabel = { masha: 'Masha', damian: 'Damian', both: 'Both' };
const priorityLabel = { high: 'High', normal: 'Normal', low: 'Low' };

export default function TaskBadges({ task }: { task: HouseholdTask }) {
  const overdue = !!task.due_date && !task.completed_at && task.due_date < localDate(new Date());
  const due = task.due_date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${task.due_date}T12:00:00`)) : '';
  return <span className="task-badges">
    <span className="task-badge badge-assignee"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>{assigneeLabel[task.assignee]}</span>
    {due && <span className={`task-badge badge-due${overdue ? ' badge-overdue' : ''}`} aria-label={`${overdue ? 'Overdue' : 'Due'} ${due}`}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 2v6m10-6v6M3 10h18" /></svg>{overdue ? `Overdue · ${due}` : due}</span>}
    <span className={`task-badge badge-priority badge-${task.priority}`} aria-label={`${priorityLabel[task.priority]} priority`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 22V3m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0" /></svg>{priorityLabel[task.priority]}</span>
  </span>;
}
