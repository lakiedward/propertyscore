import { useRouterState } from '@tanstack/react-router';
import { sectionNavFor, type SectionNav } from './site-navigation';

export function useSectionNav(): SectionNav {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return sectionNavFor(pathname);
}
