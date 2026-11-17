"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

const REVIEW_COPY = [
  ["Poor", "Sorry it missed the mark."],
  ["Fair", "We’ll do better next time."],
  ["Good", "Glad it landed well."],
  ["Great", "Thanks — that means a lot."],
  ["Superb", "You made our day."],
] as const;

export function OrderReviewSheet({ onClose }: { onClose: () => void }) {
  const [rating, setRating] = useState(3);
  const [thanks, setThanks] = useState(false);
  const copy = REVIEW_COPY[rating - 1] ?? REVIEW_COPY[2];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close review" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-review-title"
        className="relative w-full max-w-lg rounded-t-[28px] bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto h-1 w-9 rounded-full bg-[#E6E6EA]" />
        <h2 id="order-review-title" className="mt-4 text-center text-lg font-extrabold text-black">
          Rate this order
        </h2>
        <div className="mt-4 flex justify-center gap-1">
          {REVIEW_COPY.map((_, i) => {
            const value = i + 1;
            const on = value <= rating;
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                onClick={() => setRating(value)}
                className="grid h-12 w-12 cursor-pointer place-items-center"
              >
                <Star
                  className={cn("h-9 w-9", on ? "fill-[#F5B400] text-[#F5B400]" : "text-[#52525B]")}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-base font-extrabold text-black">{copy[0]}</p>
        <p className="mt-1 text-center text-[13px] font-medium text-muted">{copy[1]}</p>
        <button
          type="button"
          onClick={() => {
            setThanks(true);
            window.setTimeout(onClose, 700);
          }}
          className="mt-4 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-track text-[15px] font-bold text-black"
        >
          <Star className="h-4 w-4" aria-hidden />
          {thanks ? "Thanks for the review" : "Submit review"}
        </button>
      </div>
    </div>
  );
}
