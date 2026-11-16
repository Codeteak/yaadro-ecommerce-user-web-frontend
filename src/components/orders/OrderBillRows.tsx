export function Dash() {
  return <div className="my-2.5 border-t border-dashed border-[#1F1C18]/25" />;
}

export function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-[11px] tracking-wide text-[#1F1C18]/60 uppercase">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
