import { BottomNav } from "@/components/navigation/BottomNav";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
