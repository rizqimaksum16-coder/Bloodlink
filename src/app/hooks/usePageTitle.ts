import { useEffect } from 'react';

const BASE_TITLE = 'Blood Link';

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} — ${BASE_TITLE}`;
    } else {
      document.title = `${BASE_TITLE} — Platform Donor Darah Surabaya`;
    }
    return () => {
      document.title = `${BASE_TITLE} — Platform Donor Darah Surabaya`;
    };
  }, [pageTitle]);
}
