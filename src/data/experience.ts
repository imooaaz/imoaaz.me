/**
 * Experience timeline on the home page, newest first.
 * Keep entries factual. `points` are short "Label: text" bullets; `text` may contain inline HTML
 * (e.g. <abbr>, links) and is inserted as-is.
 */
export interface ExperienceEntry {
  dates: string;
  role: string;
  org: string;
  /** Small mono tag after the org, e.g. "Full-time". */
  type: string;
  desc: string;
  points?: { label: string; text: string }[];
  /** Still ongoing: gets the highlighted timeline dot. */
  current?: boolean;
}

export const experience: ExperienceEntry[] = [
  {
    dates: 'Present',
    role: 'Co-Founder & Product Engineer',
    org: 'Raqyan',
    type: 'Co-founder',
    desc: 'Running delivery from code to production, with security built in.',
    current: true,
    points: [
      { label: 'Product delivery', text: 'own the release process.' },
      { label: 'Product security', text: 'keep what we ship safe for customers.' },
      { label: 'DevOps & DevSecOps', text: 'the <abbr title="Continuous Integration / Continuous Delivery">CI/CD</abbr> pipeline and its automated security checks.' },
    ],
  },
  {
    dates: 'Feb 2025 — Present',
    role: 'Cyber Security Consultant & Penetration Tester',
    org: 'GCC',
    type: 'Part-time',
    desc: 'Testing client apps like an attacker, then reporting the fixes.',
    current: true,
    points: [
      { label: 'Penetration testing', text: 'web and mobile applications.' },
      { label: 'Reporting', text: 'reproduction steps, impact, and the fix for every finding.' },
    ],
  },
  {
    dates: '2023 — Present',
    role: 'Cyber Security Researcher',
    org: 'HackerOne',
    type: 'Part-time',
    desc: 'Finding flaws in live products through bug bounty programs.',
    current: true,
    points: [
      { label: 'Bug bounty', text: 'public and private programs.' },
      { label: 'Disclosure', text: 'one report was assigned <a href="#projects" class="nowrap">CVE-2024-36436</a>.' },
    ],
  },
  {
    dates: 'Jun 2025 — Aug 2025',
    role: 'Application Security Engineer',
    org: 'Robusta Technology Group (RTG)',
    type: 'Full-time',
    desc: 'Helping product teams ship without security holes.',
    points: [
      { label: 'Assessments', text: 'reviewing features for vulnerabilities.' },
      { label: 'DevSecOps', text: 'automated security checks in the pipeline.' },
    ],
  },
  {
    dates: 'Oct 2023 — Jan 2024',
    role: 'Offensive Security Engineer',
    org: 'Cybrany',
    type: 'Part-time',
    desc: 'Simulating attacks and researching new vulnerabilities.',
  },
];

export const education = {
  title: 'Computer Science & Engineering',
  place: 'Faculty of Electronic Engineering, Menoufia University',
};

export const volunteering = [
  'Cyber Security Core Member, IEEE Menoufia University Student Branch',
  'Arts Committee Member, FEE Student Union',
];
