import { describe, expect, it } from 'vitest';

import { parseRobots } from './robots.ts';

const ROBOTS = `
# statistics stay open
User-agent: ClaudeBot
User-agent: GPTBot
Allow: /
Disallow: /anunt/

User-agent: *
Allow: /
Disallow: /api/favourites/
Disallow: /widget/
Disallow: /anunturi/*/telefon$
Sitemap: https://example.test/sitemap.xml
`;

describe('parseRobots', () => {
  it('applies the rules of every agent to a client that is not named', () => {
    const policy = parseRobots(ROBOTS, 'PropertyScore');
    expect(policy.isAllowed('/apartamente-de-vanzare/timisoara/cetate')).toBe(true);
    expect(policy.isAllowed('/anunt/123')).toBe(true);
    expect(policy.isAllowed('/widget/city')).toBe(false);
    expect(policy.isAllowed('/api/favourites/1')).toBe(false);
  });

  it('prefers the group that names the client', () => {
    const policy = parseRobots(ROBOTS, 'gptbot');
    expect(policy.isAllowed('/anunt/123')).toBe(false);
    expect(policy.isAllowed('/widget/city')).toBe(true);
  });

  it('reads wildcards and end anchors, the longest rule winning', () => {
    const policy = parseRobots(ROBOTS, 'PropertyScore');
    expect(policy.isAllowed('/anunturi/42/telefon')).toBe(false);
    expect(policy.isAllowed('/anunturi/42/telefon/afisat')).toBe(true);
  });

  it('allows everything when no group applies', () => {
    expect(parseRobots('User-agent: OtherBot\nDisallow: /', 'PropertyScore').isAllowed('/')).toBe(
      true,
    );
  });

  it('reads the crawl delay of the group that applies', () => {
    const text =
      'User-agent: OtherBot\nCrawl-delay: 30\n\nUser-agent: *\nCrawl-delay: 4\nAllow: /\n';
    expect(parseRobots(text, 'PropertyScore').crawlDelayMs).toBe(4000);
    expect(parseRobots(text, 'OtherBot').crawlDelayMs).toBe(30_000);
    expect(parseRobots(ROBOTS, 'PropertyScore').crawlDelayMs).toBeNull();
  });
});
