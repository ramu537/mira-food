import { useCallback, useEffect, useRef, useState } from "react";
import { foodApi } from "../api/food";
import { dateRange, shiftDate } from "../lib/dates";
import { defaultGoal } from "../lib/nutrition";
import { dateInZone } from "../lib/foodProfile";

// Compare actual preferences, not object key order or the optimistic-lock version.
function profileSignature(profile) {
  if (!profile) return null;
  return JSON.stringify(Object.keys(profile).filter(key => key !== "version").sort().map(key =>
    [key, Array.isArray(profile[key]) ? [...profile[key]].sort() : profile[key] ?? null]));
}

export function useFoodManager(user = null) {
  const uid = user?.uid || null;
  const activeUser = useRef(uid);
  activeUser.current = uid;
  const [owner, setOwner] = useState(null);
  const [zone, setZone] = useState("Asia/Kolkata");
  const [now, setNow] = useState(() => new Date());
  const today = dateInZone(now, zone);
  const earliestDate = dateRange(today, 30)[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [goal, setGoal] = useState(defaultGoal);
  const [waterByDate, setWaterByDate] = useState({});
  const [loading, setLoading] = useState(false), [ready, setReady] = useState(false), [loadError, setLoadError] = useState("");
  const [analysis, setAnalysis] = useState(null), [analysisLoading, setAnalysisLoading] = useState(false), [analysisError, setAnalysisError] = useState("");
  const [analysisStale, setAnalysisStale] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState(null);
  const analysisCache = useRef(new Map());
  const [revision, setRevision] = useState(0);
  const live = useRef(false), writeLock = useRef(false), reads = useRef(0), analysisReads = useRef(0);
  const previousToday = useRef(today);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; reads.current += 1; analysisReads.current += 1; };
  }, []);
  useEffect(() => {
    const prior = previousToday.current;
    previousToday.current = today;
    setSelectedDate((value) => value === prior || value > today ? today : value < earliestDate ? earliestDate : value);
  }, [today, earliestDate]);

  const load = useCallback(async () => {
    if (!user || writeLock.current) return;
    const sequence = ++reads.current;
    setLoading(true);
    try {
      const [nextEntries, nextGoal, water, profile] = await Promise.all([
        foodApi.listEntries(earliestDate, today), foodApi.getGoal(), foodApi.listWater(earliestDate, today),
        foodApi.getProfile().catch(() => null),
      ]);
      if (!live.current || sequence !== reads.current || activeUser.current !== uid) return;
      setOwner(uid);
      setEntries(Array.isArray(nextEntries) ? nextEntries : []);
      setGoal(nextGoal || defaultGoal);
      setWaterByDate(Object.fromEntries((water || []).map((item) => [item.date, item.glasses])));
      setVerifiedProfile(profile);
      if (profile) setZone(profile.timeZone || "Asia/Kolkata");
      setAnalysisStale(true);
      setLoadError(""); setReady(true); setRevision((value) => value + 1);
    } catch (error) {
      if (live.current && sequence === reads.current && activeUser.current === uid) {
        setLoadError(error.message || "Your food records could not be refreshed.");
        // Keep the last useful facts, but suppress personalised guidance until preferences are verified.
        analysisReads.current += 1;
        setVerifiedProfile(null); setAnalysisStale(true); setAnalysisLoading(false);
        setAnalysisError("Refresh failed. Retry to read your current records and preferences.");
      }
    } finally { if (live.current && sequence === reads.current && activeUser.current === uid) setLoading(false); }
  }, [user?.uid, earliestDate, today]);

  const refreshAnalysis = useCallback(async (regenerate = false) => {
    if (!user || writeLock.current) return;
    const sequence = ++analysisReads.current;
    setAnalysisLoading(true); setAnalysisError("");
    setAnalysisStale(true);
    try {
      const result = await foodApi.analyze(selectedDate, regenerate === true);
      if (!live.current || sequence !== analysisReads.current || activeUser.current !== uid) return;
      analysisCache.current.set(selectedDate, result);
      // Keep the cache bounded to the same 30-day range exposed by the food log.
      for (const date of analysisCache.current.keys()) if (date < earliestDate || date > today) analysisCache.current.delete(date);
      setAnalysis(result); setVerifiedProfile(result.profile || null); setAnalysisStale(false);
      setZone(result.timeZone || "Asia/Kolkata");
    } catch (error) {
      if (live.current && sequence === analysisReads.current && activeUser.current === uid) {
        setAnalysisStale(true); setAnalysisError(error.message || "Food guidance could not be refreshed.");
      }
    } finally { if (live.current && sequence === analysisReads.current && activeUser.current === uid) setAnalysisLoading(false); }
  }, [user?.uid, selectedDate, earliestDate, today]);

  useEffect(() => {
    reads.current++; analysisReads.current++;
    analysisCache.current.clear(); setVerifiedProfile(null); setAnalysisStale(false);
    setEntries([]); setAnalysis(null); setOwner(null); setReady(false);
    setGoal(defaultGoal); setWaterByDate({}); setLoadError(""); setAnalysisError("");
  }, [uid]);
  useEffect(() => {
    setAnalysis(analysisCache.current.get(selectedDate) || null);
    setAnalysisStale(true); setAnalysisError("");
  }, [selectedDate]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void refreshAnalysis(); }, [refreshAnalysis, revision]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") { setNow(new Date()); void load(); } };
    // External MCP writes show up without a page reload. Never poll while the tab is hidden.
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  async function write(operation, apply) {
    const writeOwner = uid;
    if (!writeOwner || activeUser.current !== writeOwner) throw new Error("Sign in again before saving.");
    if (writeLock.current) throw new Error("Another food change is saving. Please wait.");
    writeLock.current = true; reads.current += 1; analysisReads.current += 1;
    setLoading(false); setAnalysisStale(true); setAnalysisLoading(true);
    try {
      const result = await operation();
      if (live.current && activeUser.current === writeOwner) apply(result);
      return result;
    } finally {
      writeLock.current = false;
      if (live.current && activeUser.current === writeOwner) setRevision((value) => value + 1);
    }
  }
  const actions = {
    saveEntry: (payload, id = null) => write(
      () => id ? foodApi.updateEntry(id, payload) : foodApi.createEntry(payload),
      (saved) => setEntries((current) => [...current.filter((entry) => entry.id !== saved.id), saved])),
    deleteEntry: (id) => write(() => foodApi.removeEntry(id), () => setEntries((current) => current.filter((entry) => entry.id !== id))),
    saveGoal: (payload) => write(() => foodApi.updateGoal(payload), setGoal),
    saveProfile: (payload) => {
      // A lost response can still mean new restrictions were saved. Never reuse old advice in that gap.
      setVerifiedProfile(null);
      return write(() => foodApi.updateProfile(payload), (saved) => {
        setVerifiedProfile(saved); setZone(saved.timeZone || "Asia/Kolkata"); setNow(new Date());
      });
    },
    setWater: (glasses) => {
      const date = selectedDate;
      return write(() => foodApi.setWater(date, glasses), (saved) => setWaterByDate((current) => ({ ...current, [date]: saved.glasses })));
    },
  };
  function selectDate(date) { setSelectedDate(date < earliestDate ? earliestDate : date > today ? today : date); }
  return {
    today, earliestDate, selectedDate, selectDate, entries: owner === uid ? entries : [], goal, water: owner === uid ? waterByDate[selectedDate] || 0 : 0,
    loading, ready: ready && owner === uid, loadError, retry: load, actions,
    analysis: owner === uid && analysis?.date === selectedDate ? analysis : null,
    analysisLoading, analysisError, analysisStale,
    analysisAdviceCurrent: Boolean(verifiedProfile && profileSignature(verifiedProfile) === profileSignature(analysis?.profile)),
    refreshAnalysis,
    canGoPrevious: selectedDate > earliestDate, canGoNext: selectedDate < today,
    previousDay: () => selectDate(shiftDate(selectedDate, -1)), nextDay: () => selectDate(shiftDate(selectedDate, 1)),
  };
}
