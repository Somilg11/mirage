import { useEffect, useRef } from 'react';
import { Button } from './Button';

/**
 * Pagination footer: loads the next page automatically when scrolled into view,
 * with a manual button as a fallback (and for keyboard users).
 */
export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  auto = true,
  label = 'Load more',
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  auto?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!auto || !node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [auto, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hasNextPage) return null;
  return (
    <div ref={ref} className="flex justify-center py-3">
      <Button variant="outline" size="sm" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
        {label}
      </Button>
    </div>
  );
}
