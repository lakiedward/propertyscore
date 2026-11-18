type RobotsRule = { isAllowed: boolean; pattern: RegExp; length: number };

type RobotsGroup = { agents: string[]; rules: RobotsRule[]; crawlDelayMs: number | null };

export type RobotsPolicy = {
  isAllowed: (path: string) => boolean;
  crawlDelayMs: number | null;
};

function pathPattern(value: string): RegExp {
  const isAnchored = value.endsWith('$');
  const body = (isAnchored ? value.slice(0, -1) : value)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${isAnchored ? '$' : ''}`);
}

function parseGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let isReadingAgents = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === 'user-agent') {
      if (!current || !isReadingAgents) {
        current = { agents: [], rules: [], crawlDelayMs: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      isReadingAgents = true;
      continue;
    }
    isReadingAgents = false;
    if (current && field === 'crawl-delay') {
      const seconds = Number(value);
      if (value !== '' && Number.isFinite(seconds) && seconds > 0) {
        current.crawlDelayMs = Math.max(current.crawlDelayMs ?? 0, seconds * 1000);
      }
      continue;
    }
    if (!current || (field !== 'allow' && field !== 'disallow') || value === '') continue;
    current.rules.push({
      isAllowed: field === 'allow',
      pattern: pathPattern(value),
      length: value.length,
    });
  }
  return groups;
}

export function parseRobots(text: string, productToken: string): RobotsPolicy {
  const groups = parseGroups(text);
  const token = productToken.toLowerCase();
  const named = groups.filter((group) => group.agents.includes(token));
  const matching = named.length > 0 ? named : groups.filter((group) => group.agents.includes('*'));
  const rules = matching.flatMap((group) => group.rules);
  const delays = matching.flatMap((group) => group.crawlDelayMs ?? []);
  return {
    crawlDelayMs: delays.length > 0 ? Math.max(...delays) : null,
    isAllowed: (path) => {
      let winner: RobotsRule | null = null;
      for (const rule of rules) {
        if (!rule.pattern.test(path)) continue;
        if (
          !winner ||
          rule.length > winner.length ||
          (rule.length === winner.length && rule.isAllowed)
        ) {
          winner = rule;
        }
      }
      return winner?.isAllowed ?? true;
    },
  };
}
