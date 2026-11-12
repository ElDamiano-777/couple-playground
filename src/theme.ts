export type Theme = 'dark' | 'light';

const prefix = 'together.theme.v1.';
export function readTheme(profile: string | null): Theme {
  try { return profile && localStorage.getItem(prefix + profile) === 'light' ? 'light' : 'dark'; }
  catch { return 'dark'; }
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101014' : '#fff7ed');
}
export function saveTheme(profile: string, theme: Theme) {
  try { localStorage.setItem(prefix + profile, theme); } catch { /* Keep the selection for this session. */ }
  applyTheme(theme);
}
