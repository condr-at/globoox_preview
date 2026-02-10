export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <span className="ios-spinner" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
