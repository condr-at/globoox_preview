export default function LoadingSettings() {
  return (
    <div className="min-h-screen bg-background pb-[calc(60px+env(safe-area-inset-bottom))]">
      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-4 space-y-4">
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-4 w-56 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-0 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 border-b border-border/50 last:border-b-0 bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
