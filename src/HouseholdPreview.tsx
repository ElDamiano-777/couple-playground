import { useEffect, useState } from 'react';
import FamilyProfiles from './family/FamilyProfiles';
import Pets from './family/Pets';
import type { FamilyProfilesState } from './family/useFamilyProfiles';
import SharedShopping from './shared/SharedShopping';
import QuickAdd from './shared/QuickAdd';
import UsShopping from './shared/UsShopping';
import type { ShoppingItem, SharedShoppingState } from './shared/useSharedShopping';
import FolderPages, { HomeNavigation, type FolderPage } from './folders/FolderPages';
import { Symbol } from './ui/Symbol';
import FolderEntries from './collections/FolderEntries';
import Recipes from './collections/Recipes';
import type { FolderEntriesState } from './collections/useFolderEntries';
import Calendar from './calendar/Calendar';
import MealPlanner from './meals/MealPlanner';
import { activeMealSlots, localDate, monday, type MealPlanItem, type MealPlanState, type MealSlot } from './meals/useMealPlan';
import Tasks from './tasks/Tasks';
import TaskBadges from './tasks/TaskBadges';
import type { HouseholdTask, HouseholdTasksState } from './tasks/useHouseholdTasks';
import Expenses from './expenses/Expenses';
import PartnerNotes from './notes/PartnerNotes';

export { Symbol } from './ui/Symbol';
export type HouseholdPage = FolderPage | `activity`;

export default function HouseholdPreview({ page, navigate, shopping, family, collections, meals, tasks, viewer, shoppingCategory, onShoppingCategory, sharedRecipe, onClearSharedRecipe }: {
  page: HouseholdPage;
  navigate: (page: HouseholdPage) => void;
  shopping: SharedShoppingState;
  family: FamilyProfilesState;
  collections: FolderEntriesState;
  meals: MealPlanState;
  tasks: HouseholdTasksState;
  viewer: `masha` | `damian`;
  shoppingCategory: ShoppingItem['category'] | null;
  onShoppingCategory: (category: ShoppingItem['category']) => void;
  sharedRecipe: string | null;
  onClearSharedRecipe: () => void;
}) {
  const [dinnerToOpen, setDinnerToOpen] = useState<MealPlanItem | null>(null);
  const [dinnerToPlan, setDinnerToPlan] = useState<MealPlanItem | { day_index: number; meal_slot: MealSlot } | null>(null);
  const [taskToOpen, setTaskToOpen] = useState<HouseholdTask | null>(null);
  const [addTask, setAddTask] = useState(false);
  useEffect(() => { if (page === `folders`) { setDinnerToOpen(null); setDinnerToPlan(null); setTaskToOpen(null); setAddTask(false); } }, [page]);
  if (page === `activity`) return <section className="preview-page">
    <button className="text-action" onClick={() => navigate(`folders`)}>← Us</button>
    <p className="eyebrow">KEEPING EACH OTHER IN THE LOOP</p>
    <h1>Little updates<span>.</span></h1>
    <p className="page-intro">This is how your shared activity could look.</p>
    <section className="dashboard-card activity-list">
      {[`Partner B marked berries as bought.`, `Partner A added colouring pencils.`, `Partner B removed a duplicate item.`].map((text, index) => <div className="activity-entry" key={text}>
        <span className={`activity-avatar ${index === 1 ? `peach` : `sage`}`}>{index === 1 ? `A` : `B`}</span>
        <div><p>{text}</p><small>Example activity</small></div>
      </div>)}
    </section>
    <div className="notification-note"><Symbol name="bell" /><p>Phone notifications aren’t connected yet. We’ll set them up after your shared space is ready.</p></div>
  </section>;

  if (page === `folders`) return <Dashboard key={`${shopping.session?.user.id ?? 'guest'}:${shopping.household ?? ''}`} navigate={navigate} shopping={shopping} meals={meals} tasks={tasks} onShoppingCategory={onShoppingCategory} onDinner={meal => { setDinnerToOpen(meal); navigate('meals'); }} onPlan={meal => { setDinnerToPlan(meal); navigate('meals'); }} onTask={task => { setTaskToOpen(task); navigate('tasks'); }} onAddTask={() => { setAddTask(true); navigate('tasks'); }} />;

  return <div className="household-preview">
    {[`home`, `shopping`, `recipes`, `meals`, `tasks`, `expenses`, `partner-notes`, `calendar`, `children`, `pets`].includes(page) && <HomeNavigation page={page} navigate={navigate} />}
    {page === `shopping` ? <SharedShopping state={shopping} hasOtherDraft={family.dirty || collections.dirty} initialCategory={shoppingCategory} />
      : page === `pets` ? <Pets key={`${family.userId}:${family.household}`} state={family} onSignIn={() => navigate(`shopping`)} />
      : page === `children` ? <FamilyProfiles state={family} fixedKind="child" onSignIn={() => navigate(`shopping`)} />
      : page === `recipes` ? <Recipes key={`${collections.userId}:${collections.household}`} state={collections} shopping={shopping} sharedRecipe={sharedRecipe} onClearSharedRecipe={onClearSharedRecipe} onSignIn={() => navigate(`shopping`)} />
      : page === `meals` ? <MealPlanner initialMeal={dinnerToOpen} initialPlan={dinnerToPlan} plan={meals} recipes={collections.entries.filter(entry => entry.kind === `recipe`)} shopping={shopping} />
      : page === `tasks` ? <Tasks state={tasks} viewer={viewer} initialTask={taskToOpen} initialAdd={addTask} />
      : page === `expenses` ? <Expenses userId={shopping.session?.user.id} household={shopping.household} viewer={viewer} />
      : page === `partner-notes` ? <PartnerNotes userId={shopping.session?.user.id} household={shopping.household} viewer={viewer} />
      : page === `calendar` ? <Calendar shopping={shopping} />
      : page === `wishlist` || page === `places` ? <FolderEntries state={collections} onSignIn={() => navigate(`shopping`)} />
      : <FolderPages page={page} navigate={navigate} />}
  </div>;
}

function Dashboard({ navigate, shopping, meals, tasks, onShoppingCategory, onDinner, onPlan, onTask, onAddTask }: { onShoppingCategory: (category: ShoppingItem['category']) => void; navigate: (page: HouseholdPage) => void; shopping: SharedShoppingState; meals: MealPlanState; tasks: HouseholdTasksState; onDinner: (meal: MealPlanItem) => void; onPlan: (meal: MealPlanItem | { day_index: number; meal_slot: MealSlot }) => void; onTask: (task: HouseholdTask) => void; onAddTask: () => void }) {
  const [addingShopping, setAddingShopping] = useState(false);
  const now = new Date(); const today = localDate(now); const todayIndex = (now.getDay() + 6) % 7;
  const dinner = meals.items.find(item => item.week_start === monday(now) && item.day_index === todayIndex && activeMealSlots.includes(item.meal_slot));
  const priorityRank = { high: 0, normal: 1, low: 2 };
  const openTasks = tasks.items.filter(task => !task.completed_at).sort((a, b) => {
    const overdueA = !!a.due_date && a.due_date < today; const overdueB = !!b.due_date && b.due_date < today;
    return Number(overdueB) - Number(overdueA) || (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99') || priorityRank[a.priority] - priorityRank[b.priority] || a.created_at.localeCompare(b.created_at);
  });
  const active = shopping.items.filter(item => !item.bought);
  const openShopping = () => { if (!shopping.session || !shopping.household) navigate('shopping'); else setAddingShopping(true); };
  const dinnerReady = !!shopping.household && !shopping.loading && !meals.loading && !meals.error && meals.weekStart === monday(now);
  const planDinner = () => { if (dinnerReady) onPlan(dinner ?? { day_index: todayIndex, meal_slot: 'Dinner' }); };
  return <section className="preview-page home-dashboard"><h1>Us<span>.</span></h1><p className="page-intro">Your shared space at a glance.</p>{shopping.isPoc && <p className="notice">POC test space. Don’t enter sensitive personal information.</p>}
    <div className="dashboard-sections">
      <section className={`dashboard-card task-dashboard${openTasks.length ? ' dashboard-active' : ''}${openTasks[0]?.due_date && openTasks[0].due_date < today ? ' dashboard-overdue' : ''}`} aria-labelledby="dashboard-tasks-title">
        <div className="home-card-header"><h2 id="dashboard-tasks-title"><span className="dashboard-icon"><Symbol name="plans" /></span>Upcoming tasks</h2><button className="home-view-all" onClick={() => navigate('tasks')}>View all</button></div>
        {openTasks.length ? <div className="home-task-list">{openTasks.slice(0, 2).map(task => <button className="home-task" key={task.id} onClick={() => onTask(task)}><strong>{task.title}</strong><TaskBadges task={task} /></button>)}</div> : <p className="home-empty">No open tasks.</p>}
      </section>
      <section className={`dashboard-card shopping-dashboard${active.length ? ' dashboard-active' : ''}`}><button className="home-shortcut" onClick={() => navigate('shopping')}><span className="dashboard-icon"><Symbol name="shopping" /></span><span className="home-shortcut-copy"><strong>Shopping</strong><small>{active.length} {active.length === 1 ? 'item' : 'items'} to buy</small></span><span className="home-arrow" aria-hidden="true">›</span></button>{shopping.items.length > 0 && <details className="home-manage-shopping"><summary>Manage shopping here</summary><UsShopping state={shopping} onCategory={onShoppingCategory} onSignIn={() => navigate('shopping')} /></details>}</section>
      <button className={`dashboard-card home-shortcut dinner-dashboard${dinner ? ' dashboard-active' : ''}`} disabled={!dinnerReady} onClick={() => dinner ? onDinner(dinner) : planDinner()}><span className="dashboard-icon"><Symbol name="utensils" /></span><span className="home-shortcut-copy"><strong>Tonight’s dinner</strong><small>{dinner ? dinner.title : 'Plan dinner'}</small></span><span className="home-arrow" aria-hidden="true">›</span></button>
      <section className="home-quick-actions" aria-labelledby="home-actions-title"><h2 id="home-actions-title">Quick actions</h2><div><button onClick={onAddTask}><span aria-hidden="true">＋</span>Add task</button><button onClick={openShopping}><span aria-hidden="true">＋</span>Add shopping item</button><button disabled={!dinnerReady} onClick={planDinner}><span aria-hidden="true">＋</span>Plan dinner</button></div></section>
    </div>
    {addingShopping && <div className="shared-shopping"><QuickAdd category="Home" state={shopping} onClose={() => setAddingShopping(false)} dashboard /></div>}
  </section>;
}
