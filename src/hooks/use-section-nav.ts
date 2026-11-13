import { useRouterState } from '@tanstack/react-router';
import { sectionNavFor, type SectionNav } from '@/components/layout/site-navigation';

export function useSectionNav(): SectionNav | undefined {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return sectionNavFor(pathname);
}
