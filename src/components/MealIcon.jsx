import { Apple, MoonStar, Sun, Sunrise } from "lucide-react";
import { mealTypes } from "../lib/nutrition";

const icons = { Apple, MoonStar, Sun, Sunrise };

export default function MealIcon({ meal, size = "regular" }) {
  const item = mealTypes.find((candidate) => candidate.value === meal) || mealTypes[2];
  const Icon = icons[item.icon] || Apple;
  return (
    <span
      className={`meal-icon meal-icon--${size}`}
      style={{ "--meal-color": item.color }}
      aria-hidden="true"
    >
      <Icon size={size === "small" ? 16 : 19} strokeWidth={1.9} />
    </span>
  );
}

