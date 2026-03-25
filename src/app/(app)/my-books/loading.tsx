export default function LoadingMyBooks() {
  return (
    <div className="min-h-screen bg-background pb-[calc(60px+env(safe-area-inset-bottom))]">
      <div className="container max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(2rem+env(safe-area-inset-top)+72px)] pb-4 space-y-6 overflow-x-clip">
        <div className="flex items-center gap-2 relative">
          <div className="h-9 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-muted animate-pulse" />
          <div className="ml-auto h-8 w-36 rounded-full bg-muted animate-pulse" />
        </div>

        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[2/3] rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
