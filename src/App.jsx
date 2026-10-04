import FloatingAssistant from "./components/FloatingAssistant";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, signInWithPopup, signOut } from "./config/firebase";
import { configureAccessTokenProvider } from "./api/client";
import AppShell from "./components/AppShell";
import FoodEntryDialog from "./components/FoodEntryDialog";
import FoodIntelligenceDialog from "./components/FoodIntelligenceDialog";
import GoalDialog from "./components/GoalDialog";
import LoginScreen from "./components/LoginScreen";
import { ErrorState, LoadingState } from "./components/PageState";
import Toast from "./components/Toast";
import AiFoodCaptureModal from "./components/AiFoodCaptureModal";
import AiMemorySearchDialog from "./components/AiMemorySearchDialog";
import { useFoodManager } from "./hooks/useFoodManager";
import DailyLogPage from "./pages/DailyLogPage";
import TrendsPage from "./pages/TrendsPage";
import FoodSettingsPage from "./pages/FoodSettingsPage";

function loginMessage(error) {
  const code = error?.code || "";
  if (code === "auth/popup-closed-by-user") return "Sign-in was closed before it finished. Try again when you are ready.";
  if (code === "auth/popup-blocked") return "Your browser blocked the sign-in window. Allow pop-ups for Mira and try again.";
  if (code === "auth/network-request-failed") return "Could not reach Google authentication. Check your connection and try again.";
  return "Could not sign you in right now. Please try again.";
}

if (typeof window !== "undefined" && import.meta.env.DEV && window.location.search.includes("dev=true")) {
  localStorage.setItem("mira-dev-user", "true");
}

export default function App() {
  const [user, setUser] = useState(() => {
    if (import.meta.env.DEV && typeof window !== "undefined" && (window.location.search.includes("dev=true") || localStorage.getItem("mira-dev-user") === "true")) {
      return { uid: "dev-user", email: "mani@mira.app", displayName: "Mani", getIdToken: async () => "dev-mock-token" };
    }
    return null;
  });
  const [authReady, setAuthReady] = useState(() => {
    if (import.meta.env.DEV && typeof window !== "undefined" && (window.location.search.includes("dev=true") || localStorage.getItem("mira-dev-user") === "true")) {
      return true;
    }
    return false;
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        configureAccessTokenProvider(async () => currentUser.getIdToken());
        setUser(currentUser);
      } else if (import.meta.env.DEV && (window.location.search.includes("dev=true") || localStorage.getItem("mira-dev-user") === "true")) {
        configureAccessTokenProvider(async () => "dev-mock-token");
        setUser({ uid: "dev-user", email: "mani@mira.app", displayName: "Mani", getIdToken: async () => "dev-mock-token" });
      } else {
        configureAccessTokenProvider(null);
        setUser(null);
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  async function login() {
    setAuthBusy(true);
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(loginMessage(err));
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    setAuthError("");
    try {
      localStorage.removeItem("mira-dev-user");
      await signOut(auth);
      configureAccessTokenProvider(null);
      setUser(null);
    } catch {
      setAuthError("Could not sign you out right now. Please try again.");
    }
  }

  if (!authReady) return <LoadingState message="Connecting to your nutrition workspace..." />;
  if (!user) return <LoginScreen onLogin={login} error={authError} loading={authBusy} />;
  return <FoodWorkspace key={user.uid} user={user} onLogout={logout} />;
}

function FoodWorkspace({ user, onLogout }) {
  const manager = useFoodManager(user);
  const waterWriteLock = useRef(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(false);
  const [aiCaptureOpen, setAiCaptureOpen] = useState(false);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [initialMeal, setInitialMeal] = useState(null);
  const [initialDate, setInitialDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [waterSaving, setWaterSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAiSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openManualCreate(meal = null, date = null) {
    setEditingEntry(null);
    setInitialMeal(meal);
    setInitialDate(date);
    setEntryDialogOpen(true);
  }

  function openCreate(meal = null, date = null) {
    setInitialMeal(meal); setInitialDate(date || manager.selectedDate); setAiCaptureOpen(true);
  }

  function openEdit(entry) {
    setEditingEntry(entry);
    setInitialMeal(entry.meal);
    setInitialDate(entry.loggedOn);
    setEntryDialogOpen(true);
  }

  function closeEntryDialog() {
    if (saving) return;
    setEntryDialogOpen(false);
    setEditingEntry(null);
    setInitialMeal(null);
    setInitialDate(null);
  }

  async function saveEntry(payload) {
    setSaving(true);
    try {
      await manager.actions.saveEntry(payload, editingEntry?.id);
      setToast({ tone: "success", message: editingEntry ? "Food entry updated." : "Food logged." });
      setEntryDialogOpen(false);
      setEditingEntry(null);
      setInitialMeal(null);
      setInitialDate(null);
      return true;
    } catch (error) {
      setToast({ tone: "error", message: error.message });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id) {
    setDeletingId(id);
    try {
      await manager.actions.deleteEntry(id);
      setToast({ tone: "success", message: "Food entry deleted." });
      return true;
    } catch (error) {
      setToast({ tone: "error", message: error.message });
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  async function saveGoal(payload) {
    setSaving(true);
    try {
      await manager.actions.saveGoal(payload);
      setGoalDialogOpen(false);
      setToast({ tone: "success", message: "Nutrition goals updated." });
    } catch (error) {
      setToast({ tone: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function changeWater(glasses) {
    if (waterWriteLock.current) return;
    waterWriteLock.current = true;
    setWaterSaving(true);
    try {
      await manager.actions.setWater(glasses);
    } catch (error) {
      setToast({ tone: "error", message: error.message });
    } finally {
      waterWriteLock.current = false;
      setWaterSaving(false);
    }
  }

  let content;
  if (!manager.ready && manager.loading) content = <LoadingState />;
  else if (!manager.ready && manager.loadError) content = <ErrorState message={manager.loadError} onRetry={manager.retry} />;
  else content = (
    <Routes>
      <Route path="/" element={<DailyLogPage key={user.uid} manager={manager} deletingId={deletingId} quickSaving={saving} waterSaving={waterSaving} onAdd={openCreate} onQuickSave={saveEntry} onEdit={openEdit} onDelete={deleteEntry} onWaterChange={changeWater} />} />
      <Route path="/trends" element={<TrendsPage entries={manager.entries} goal={manager.goal} today={manager.today} />} />
      <Route path="/settings" element={<FoodSettingsPage onSave={manager.actions.saveProfile} onEditTargets={() => setGoalDialogOpen(true)} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <>
      <AppShell
        manager={manager}
        onAdd={openManualCreate}
        onOpenIntelligence={() => setIntelligenceOpen(true)}
        onOpenAiCapture={() => openCreate()}
        onOpenAiSearch={() => setAiSearchOpen(true)}
        user={user}
        onLogout={onLogout}
      >
        {manager.ready && manager.loadError && <div className="food-refresh-warning" role="alert"><p>Food records could not be refreshed. The log and trends may be out of date.</p><button className="button button--secondary" type="button" disabled={manager.loading} onClick={manager.retry}>{manager.loading ? "Refreshing…" : "Refresh records"}</button></div>}
        {content}
      </AppShell>
      <FoodEntryDialog open={entryDialogOpen} entry={editingEntry} date={initialDate || manager.selectedDate} initialMeal={initialMeal} earliestDate={manager.earliestDate} today={manager.today} busy={saving} onClose={closeEntryDialog} onSave={saveEntry} />
      <GoalDialog open={goalDialogOpen} goal={manager.goal} busy={saving} onClose={() => { if (!saving) setGoalDialogOpen(false); }} onSave={saveGoal} />
      <FoodIntelligenceDialog userId={user.uid} open={intelligenceOpen} manager={manager} onClose={() => setIntelligenceOpen(false)} />
      <AiFoodCaptureModal
        onManual={() => { setAiCaptureOpen(false); openManualCreate(initialMeal, initialDate || manager.selectedDate); }}
        key={user.uid}
        open={aiCaptureOpen}
        initialDate={initialDate || manager.selectedDate}
        initialMeal={initialMeal}
        onClose={() => setAiCaptureOpen(false)}
        onSuccess={(msg) => {
          manager.retry();
          setToast({ tone: "success", message: msg });
        }}
      />
      <AiMemorySearchDialog
        open={aiSearchOpen}
        onClose={() => setAiSearchOpen(false)}
        onSelectDate={(date) => manager.selectDate(date)}
      />
      <FloatingAssistant domain={"food"} userId={user.uid} date={manager.selectedDate} />
      <Toast toast={toast} onClose={closeToast} />
    </>
  );
}
