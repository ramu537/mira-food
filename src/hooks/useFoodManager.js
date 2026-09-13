import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { foodApi } from "../api/food";
import { dateRange, localDateKey, shiftDate } from "../lib/dates";
import { defaultGoal } from "../lib/nutrition";

export function useFoodManager(user = null) {
  const today = localDateKey();
  const earliestDate = dateRange(today, 30)[0];
  const requestSequence = useRef(0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [goal, setGoal] = useState(defaultGoal);
  const [waterByDate, setWaterByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError("");
    try {
      const [nextEntries, nextGoal, waterEntries] = await Promise.all([
        foodApi.listEntries(earliestDate, today),
        foodApi.getGoal(),
        foodApi.listWater(earliestDate, today),
      ]);
      if (requestId !== requestSequence.current) return;
      setEntries(Array.isArray(nextEntries) ? nextEntries : []);
      setGoal(nextGoal || defaultGoal);
      setWaterByDate(Object.fromEntries((waterEntries || []).map((item) => [item.date, item.glasses])));
      setReady(true);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      setLoadError(error.message);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [user, earliestDate, today]);

  useEffect(() => {
    if (user) {
      load();
    }
    return () => { requestSequence.current += 1; };
  }, [load, user]);

  function selectDate(date) {
    if (date < earliestDate) setSelectedDate(earliestDate);
    else if (date > today) setSelectedDate(today);
    else setSelectedDate(date);
  }

  const actions = useMemo(() => ({
    async saveEntry(payload, editingId = null) {
      const saved = editingId
        ? await foodApi.updateEntry(editingId, payload)
        : await foodApi.createEntry(payload);
      setEntries((current) => editingId
        ? current.map((entry) => entry.id === saved.id ? saved : entry)
        : [...current, saved]);
      return saved;
    },
    async deleteEntry(id) {
      await foodApi.removeEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    },
    async saveGoal(payload) {
      const saved = await foodApi.updateGoal(payload);
      setGoal(saved);
      return saved;
    },
    async setWater(glasses) {
      const date = selectedDate;
      const previous = waterByDate[date] || 0;
      setWaterByDate((current) => ({ ...current, [date]: glasses }));
      try {
        await foodApi.setWater(date, glasses);
      } catch (error) {
        setWaterByDate((current) => ({ ...current, [date]: previous }));
        throw error;
      }
    },
  }), [selectedDate, waterByDate]);

  return {
    today,
    earliestDate,
    selectedDate,
    selectDate,
    entries,
    goal,
    water: waterByDate[selectedDate] || 0,
    loading,
    ready,
    loadError,
    retry: load,
    actions,
    canGoPrevious: selectedDate > earliestDate,
    canGoNext: selectedDate < today,
    previousDay: () => selectDate(shiftDate(selectedDate, -1)),
    nextDay: () => selectDate(shiftDate(selectedDate, 1)),
  };
}

