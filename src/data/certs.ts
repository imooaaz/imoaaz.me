/** Certifications shown on the home page and the CV. */
export interface Cert {
  abbr: string;
  name: string;
  issuer: string;
  badge: string;
  /** Badge art has a white background: show it on a white tile. */
  tile?: boolean;
}

export const certs: Cert[] = [
  { abbr: 'OSCP', name: 'OffSec Certified Professional', issuer: 'OffSec', badge: '/assets/img/certs/oscp.svg' },
  { abbr: 'eCPPT', name: 'Certified Professional Penetration Tester', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/ecppt.svg' },
  { abbr: 'eWPTX', name: 'Web Penetration Tester eXtreme', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/ewptx.svg' },
  { abbr: 'eMAPT', name: 'Mobile Application Penetration Tester', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/emapt.svg' },
  { abbr: 'eAIS', name: 'AI Systems Security Specialist', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/eais.svg' },
  { abbr: 'CySA+', name: 'CompTIA Cybersecurity Analyst', issuer: 'CompTIA', badge: '/assets/img/certs/cysa.webp', tile: true },
  { abbr: 'PWPE', name: 'Practical Web Pentest Expert', issuer: 'TCM Security', badge: '/assets/img/certs/pwpe.webp', tile: true },
  { abbr: 'PMPA', name: 'Practical Mobile Pentest Associate', issuer: 'TCM Security', badge: '/assets/img/certs/pmpa.webp', tile: true },
  { abbr: 'PORP', name: 'Practical OSINT Research Professional', issuer: 'TCM Security', badge: '/assets/img/certs/porp.webp', tile: true },
  { abbr: 'CAISA', name: 'Certified Artificial Intelligence Security Architect', issuer: 'Red Team Leaders', badge: '/assets/img/certs/caisa.webp', tile: true },
  { abbr: 'CLLMSP', name: 'Certified LLM Security Professional', issuer: 'Red Team Leaders', badge: '/assets/img/certs/cllmsp.webp', tile: true },
  { abbr: 'CRTOM', name: 'Certified Red Team Operations Management', issuer: 'Red Team Leaders', badge: '/assets/img/certs/crtom.webp', tile: true },
  { abbr: 'CCEP', name: 'Certified Cybersecurity Educator Professional', issuer: 'Red Team Leaders', badge: '/assets/img/certs/ccep.webp', tile: true },
  { abbr: 'CTIGA', name: 'Certified Threat Intelligence & Governance Analyst', issuer: 'Red Team Leaders', badge: '/assets/img/certs/ctiga.webp', tile: true },
];

/** How the count reads on the page: a rounded "10+" rather than the exact number. */
export const certsCount = '10+';

/** Short line for tight spots (about, blog bio): the first three, then "and more". */
export const certsShort = `${certs.slice(0, 3).map((c) => c.abbr).join(' · ')} and more`;
