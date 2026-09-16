import { useEffect } from 'react';

const BASE_TITLE = 'Mirage Prediction Markets';

/** Sets the tab title for the current page and restores the default on unmount. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Mirage` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
