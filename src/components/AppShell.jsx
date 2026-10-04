import ThemeControl from "./ThemeControl";
import { LineChart, LogOut, Plus, Salad, Search, Settings2, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import DateControl from "./DateControl";

const navigation = [
  { to: "/", label: "Daily log", icon: Salad, end: true },
  { to: "/trends", label: "Trends", icon: LineChart },
];

function Brand() {
  return (
    <div className="brand" aria-label="Mira Food Manager">
      <span className="brand-mark" aria-hidden="true"><Salad size={21} strokeWidth={2} /></span>
      <span className="brand-copy"><strong>Mira</strong><small>Food manager</small></span>
    </div>
  );
}

function Navigation({ mobile = false }) {
  return (
    <nav className={mobile ? "mobile-navigation" : "side-navigation"} aria-label="Food manager">
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}>
          <Icon size={mobile ? 20 : 18} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell({ manager, onOpenIntelligence, onOpenAiCapture, onOpenAiSearch, user, onLogout, children }) {
  const location = useLocation();
  const dailyRoute = location.pathname === "/";
  const initialLetter = (user?.displayName || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand />
        <Navigation />
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note__icon"><Salad size={18} /></span>
            <span><strong>Patterns, not perfection</strong><small>Only what you actually log</small></span>
          </div>

          {user && (
            <div className="user-profile">
              <div className="user-profile__info">
                <div className="user-profile__avatar">{initialLetter}</div>
                <div className="user-profile__details">
                  <span className="user-profile__name">{user.displayName || "Mira Member"}</span>
                  <span className="user-profile__email">{user.email}</span>
                </div>
              </div>
              <button
                className="user-profile__signout"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-brand"><Brand /></div>
          {dailyRoute ? (
            <DateControl
              date={manager.selectedDate}
              today={manager.today}
              earliestDate={manager.earliestDate}
              onChange={manager.selectDate}
              onPrevious={manager.previousDay}
              onNext={manager.nextDay}
            />
          ) : <span className="topbar-context">{location.pathname === "/settings" ? "Your food context" : "Latest 14 days"}</span>}
          <ThemeControl />
            <button className="icon-button" type="button" onClick={onOpenAiSearch} aria-label="Search memory" title="AI Vector Memory Search (Ctrl+K)"><Search size={18} /></button>
          <button className="icon-button topbar-intelligence" type="button" onClick={onOpenIntelligence} aria-label="Open food intelligence" title="Food intelligence"><Sparkles size={18} /></button>
          <NavLink className={({ isActive }) => isActive ? "icon-button topbar-settings is-active" : "icon-button topbar-settings"} to="/settings" aria-label="Goals and preferences" title="Goals & preferences"><Settings2 size={18} /></NavLink>
          <button className="button button--primary topbar-add" type="button" onClick={onOpenAiCapture}>
            <Plus size={18} strokeWidth={2.4} /> Log food
          </button>
          {user && (
            <div className="topbar-user">
              <div className="topbar-avatar" title={user.email}>{initialLetter}</div>
              <button
                className="topbar-signout-btn"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
          {manager.loading && <span className="route-progress" aria-label="Loading food records" />}
        </header>

        <main className="main-content">{children}</main>
        <Navigation mobile />
        <div className="mobile-only-actions">
          <button className="mobile-add" type="button" onClick={onOpenAiCapture} aria-label="Log food with text or photo">
            <Plus size={24} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
