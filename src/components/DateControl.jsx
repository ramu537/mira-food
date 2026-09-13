import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { fullDate } from "../lib/dates";

export default function DateControl({ date, today, earliestDate, onChange, onPrevious, onNext }) {
  return (
    <div className="date-control" role="group" aria-label="Food log date">
      <button type="button" onClick={onPrevious} disabled={date <= earliestDate} aria-label="Previous day">
        <ChevronLeft size={18} />
      </button>
      <label>
        <CalendarDays size={16} aria-hidden="true" />
        <span>{date === today ? "Today" : fullDate(date)}</span>
        <input
          type="date"
          min={earliestDate}
          max={today}
          value={date}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          aria-label="Choose food log date"
        />
      </label>
      <button type="button" onClick={onNext} disabled={date >= today} aria-label="Next day">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

