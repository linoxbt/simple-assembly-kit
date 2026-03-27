const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <img
        src="/aurumx-logo.png"
        alt="AurumX"
        className="h-16 w-16 loading-pulse mb-4"
        width={64}
        height={64}
      />
      <div className="text-xs text-muted-foreground tracking-widest">LOADING PROTOCOL…</div>
    </div>
  );
};

export default LoadingScreen;
