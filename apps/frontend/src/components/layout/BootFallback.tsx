import { LogoMark } from '../ui/Logo';

/** Minimal first-load screen before the router has resolved a lazy route. */
export function BootFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <LogoMark className="size-8 animate-pulse" />
    </div>
  );
}
