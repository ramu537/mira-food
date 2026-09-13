import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

export function LoadingState() {
  return (
    <div className="page-state" role="status">
      <LoaderCircle className="spin" size={28} />
      <strong>Loading your food log</strong>
      <span>Gathering meals, goals, and hydration.</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="page-state" role="alert">
      <span className="state-icon"><AlertCircle size={24} /></span>
      <strong>We couldn’t load your food data</strong>
      <span>{message}</span>
      <button className="button button--secondary" type="button" onClick={onRetry}>
        <RefreshCw size={17} /> Try again
      </button>
    </div>
  );
}

