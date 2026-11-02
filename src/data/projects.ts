/**
 * "Projects & Tools" cards on the home page, in display order.
 * Keep entries real: what you built, your role, and the outcome.
 */
export type ProjectKind = 'product' | 'tool' | 'research';

export interface Project {
  title: string;
  /** Drives the filter chips and the icon colour. */
  kind: ProjectKind;
  /** Label above the title, e.g. "Tool · Open source". */
  kindLabel: string;
  desc: string;
  tags: string[];
  /** Only the links that exist: Code, Live, Case study, Advisory… */
  links?: { label: string; href: string }[];
  /** Optional custom 24×24 icon (inner SVG markup); defaults to the kind's icon. */
  icon?: string;
}

/** Default icon per kind (inner markup of a 24×24 SVG). */
export const KIND_ICONS: Record<ProjectKind, string> = {
  tool: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.5 15.5 5.5 5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 10.5h5M10.5 8v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  research: '<path d="M12 2 4 5.5V11c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  product: '<path d="M12 2 3 7v10l9 5 9-5V7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 7l9 5 9-5M12 12v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
};

export const projects: Project[] = [
  {
    title: 'bookmark-path-finder',
    kind: 'tool',
    kindLabel: 'Tool · Open source',
    desc: 'Finds hidden paths and API routes on any page.',
    tags: ['javascript', 'recon', 'web appsec'],
    links: [{ label: 'Code', href: 'https://github.com/m0442/bookmark-path-finder' }],
  },
  {
    title: 'CVE-2024-36436',
    kind: 'research',
    kindLabel: 'Research · Coordinated disclosure',
    desc: 'Found and reported through coordinated disclosure.',
    tags: ['vulnerability research', 'disclosure'],
  },
];

/** Filter chips shown above the grid (only kinds that have entries are worth listing). */
export const projectFilters: { key: 'all' | ProjectKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'tool', label: 'Tools' },
  { key: 'research', label: 'Research' },
];
