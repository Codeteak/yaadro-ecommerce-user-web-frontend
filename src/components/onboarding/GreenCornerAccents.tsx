/** Soft organic green washes — top-left and bottom-right like the reference mock. */
export function GreenCornerAccents({ intensity = "strong" }: { intensity?: "strong" | "soft" }) {
  const strong = intensity === "strong";

  return (
    <>
      <div
        className={`pointer-events-none absolute -top-32 -left-28 rounded-[45%_55%_60%_40%] blur-2xl ${
          strong ? "h-[26rem] w-[26rem] bg-leaf/35" : "h-72 w-72 bg-leaf/20"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -top-16 -left-10 rounded-[60%_40%_55%_45%] blur-xl ${
          strong ? "h-56 w-64 bg-leaf-bright/25" : "h-40 w-48 bg-leaf-bright/15"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -right-24 -bottom-28 rounded-[50%_50%_40%_60%] blur-2xl ${
          strong ? "h-[24rem] w-[28rem] bg-leaf/30" : "h-64 w-72 bg-leaf/18"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute right-[-8%] bottom-[-4%] rounded-[40%_60%_55%_45%] blur-xl ${
          strong ? "h-48 w-56 bg-leaf-bright/22" : "h-36 w-44 bg-leaf-bright/12"
        }`}
        aria-hidden
      />
    </>
  );
}
