import React from "react";
import { TrackingStep, formatDateTime } from "../lib/orders";

function StepIcon({ step }: { step: TrackingStep }) {
  if (step.status === "CANCELLED") {
    return (
      <div className="w-8 h-8 rounded-full bg-error text-white flex items-center justify-center shrink-0 ring-4 ring-error/15">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </div>
    );
  }
  if (step.completed && (!step.current || step.status === "DELIVERED")) {
    return (
      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
    );
  }
  if (step.current) {
    return (
      <div className="relative w-8 h-8 shrink-0">
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        <div className="relative w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center ring-4 ring-primary/15">
          <span className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>
      </div>
    );
  }
  return <div className="w-8 h-8 rounded-full bg-white border-2 border-border shrink-0" />;
}

/** Amazon/Flipkart-style progress tracker for an order's fulfillment steps. */
export default function OrderTracker({ steps }: { steps: TrackingStep[] }) {
  return (
    <>
      {/* Horizontal (md+) */}
      <ol className="hidden md:flex items-start" aria-label="Order progress">
        {steps.map((step, i) => {
          const nextDone = i < steps.length - 1 && steps[i + 1].completed;
          return (
            <li key={step.status} className="flex-1 flex flex-col items-center text-center relative">
              {i < steps.length - 1 && (
                <div className="absolute top-4 left-1/2 w-full h-1 -translate-y-1/2 bg-border rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-700 ${nextDone ? (steps[i + 1].status === "CANCELLED" ? "bg-error w-full" : "bg-primary w-full") : "w-0"}`} />
                </div>
              )}
              <div className="relative z-10"><StepIcon step={step} /></div>
              <p className={`mt-2 text-xs font-semibold px-1 ${step.completed ? (step.status === "CANCELLED" ? "text-error" : "text-charcoal") : "text-muted"}`}>
                {step.title}
              </p>
              {step.at && <p className="text-[10px] text-muted mt-0.5">{formatDateTime(step.at)}</p>}
            </li>
          );
        })}
      </ol>

      {/* Vertical (mobile) */}
      <ol className="md:hidden space-y-0" aria-label="Order progress">
        {steps.map((step, i) => (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepIcon step={step} />
              {i < steps.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-6 ${steps[i + 1].completed ? (steps[i + 1].status === "CANCELLED" ? "bg-error" : "bg-primary") : "bg-border"}`} />
              )}
            </div>
            <div className="pb-5 pt-1">
              <p className={`text-sm font-semibold ${step.completed ? (step.status === "CANCELLED" ? "text-error" : "text-charcoal") : "text-muted"}`}>{step.title}</p>
              {step.at && <p className="text-xs text-muted">{formatDateTime(step.at)}</p>}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
