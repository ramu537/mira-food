import { Flame } from "lucide-react";
import { percentage } from "../lib/nutrition";

export default function CalorieOrbit({ calories, goal }) {
  const used = percentage(calories, goal, 140);
  const remaining = goal - calories;
  const over = remaining < 0;
  return (
    <div className={over ? "calorie-orbit is-over" : "calorie-orbit"} style={{ "--orbit-progress": `${Math.min(used, 100) * 3.6}deg` }}>
      <div className="calorie-orbit__ring">
        <div className="calorie-orbit__core">
          <Flame size={18} aria-hidden="true" />
          <strong>{Math.round(calories).toLocaleString("en-IN")}</strong>
          <span>kcal logged</span>
        </div>
      </div>
      <div className="calorie-orbit__copy">
        <span>{over ? "Above target" : "Remaining"}</span>
        <strong>{Math.abs(Math.round(remaining)).toLocaleString("en-IN")} <small>kcal</small></strong>
        <p>{over ? "Useful context, not a verdict." : `From a ${goal.toLocaleString("en-IN")} kcal daily target.`}</p>
      </div>
    </div>
  );
}

