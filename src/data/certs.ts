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
  { abbr: 'eCPPT', name: 'Certified Professional Penetration Tester', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/ecppt.svg' },
  { abbr: 'eWPTX', name: 'Web Penetration Tester eXtreme', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/ewptx.svg' },
  { abbr: 'eMAPT', name: 'Mobile Application Penetration Tester', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/emapt.svg' },
  { abbr: 'eAIS', name: 'AI Systems Security Specialist', issuer: 'eLearnSecurity / INE', badge: '/assets/img/certs/eais.svg' },
  { abbr: 'CAISA', name: 'Certified Artificial Intelligence Security Architect', issuer: 'Red Team Leaders', badge: '/assets/img/certs/caisa.webp', tile: true },
  { abbr: 'CLLMSP', name: 'Certified LLM Security Professional', issuer: 'Red Team Leaders', badge: '/assets/img/certs/cllmsp.webp', tile: true },
  { abbr: 'CRTOM', name: 'Certified Red Team Operations Management', issuer: 'Red Team Leaders', badge: '/assets/img/certs/crtom.webp', tile: true },
  { abbr: 'CCEP', name: 'Certified Cybersecurity Educator Professional', issuer: 'Red Team Leaders', badge: '/assets/img/certs/ccep.webp', tile: true },
  { abbr: 'CTIGA', name: 'Certified Threat Intelligence & Governance Analyst', issuer: 'Red Team Leaders', badge: '/assets/img/certs/ctiga.webp', tile: true },
];

/** Short line for tight spots (hero, about): the first three, then a count. */
export const certsShort = `${certs.slice(0, 3).map((c) => c.abbr).join(' · ')} · +${certs.length - 3} more`;
