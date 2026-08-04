import type { SupportedPlatform } from './types';

export const OFFICIAL_PLATFORM_URLS = {
  linkedin: 'https://www.linkedin.com/',
  github: 'https://github.com/',
  gitlab: 'https://gitlab.com/',
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  x: 'https://x.com/',
  youtube: 'https://www.youtube.com/',
} as const;

const PLATFORM_ALIASES: Record<Exclude<SupportedPlatform, 'website' | 'unknown'>, readonly string[]> = {
  linkedin: ['linkedin', 'linked in', 'linkdin', 'lindin', 'linkdn', 'linkedn'],
  github: ['github', 'git hub', 'gitub', 'githb'],
  gitlab: ['gitlab', 'git lab'],
  instagram: ['instagram', 'insta'],
  facebook: ['facebook', 'fb'],
  x: ['x', 'twitter'],
  youtube: ['youtube', 'you tube', 'yt'],
};

export function detectPlatform(normalizedQuery: string): SupportedPlatform {
  const padded = ` ${normalizedQuery} `;
  for (const [platform, aliases] of Object.entries(PLATFORM_ALIASES) as Array<[Exclude<SupportedPlatform, 'website' | 'unknown'>, readonly string[]]>) {
    if (aliases.some((alias) => padded.includes(` ${alias} `))) return platform;
  }
  if (/\b(?:website|web site|webpage|site)\b/.test(normalizedQuery)) return 'website';
  return 'unknown';
}

export function getOfficialPlatformUrl(platform: SupportedPlatform) {
  return platform in OFFICIAL_PLATFORM_URLS
    ? OFFICIAL_PLATFORM_URLS[platform as keyof typeof OFFICIAL_PLATFORM_URLS]
    : null;
}
