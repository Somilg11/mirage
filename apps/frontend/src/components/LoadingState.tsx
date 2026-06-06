export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-50">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
        </div>
        <div className="text-xs text-gray-400 animate-pulse">Loading...</div>
      </div>
    </div>
  );
}
