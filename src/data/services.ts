/** "Services" rows on the home page; also the skills block on the CV. */
export interface Service {
  name: string;
  desc: string;
  tags: string[];
}

export const services: Service[] = [
  {
    name: 'Product Security & DevSecOps',
    desc: 'Automated security checks and secure defaults built into the delivery pipeline.',
    tags: ['CI/CD', 'DevOps', 'Linux (Red Hat)', 'Secure Delivery'],
  },
  {
    name: 'Application Security',
    desc: 'Secure code review and testing, done alongside your developers.',
    tags: ['Secure Code Review', 'Secure SDLC', 'JavaScript / Node.js', 'MongoDB'],
  },
  {
    name: 'Web & Mobile Penetration Testing',
    desc: 'Web, API, and Android testing. Every finding is verified and comes with a clear fix.',
    tags: ['Web', 'Mobile', 'API', 'Red Teaming', 'Reporting'],
  },
  {
    name: 'Security Research & Bug Bounty',
    desc: 'Finding vulnerabilities in live systems and disclosing them responsibly.',
    tags: ['Bug Bounty', 'Recon', 'Vulnerability Research', 'Disclosure'],
  },
  {
    name: 'AI Security',
    desc: 'Testing AI features for prompt injection, weak authentication, and data exposure.',
    tags: ['LLM Applications', 'Authentication', 'Abuse Cases'],
  },
];

export const domains = [
  'Product security',
  'Application security',
  'DevSecOps & CI/CD',
  'API security',
  'Mobile security',
  'Cloud security (AWS)',
  'Kubernetes & container security',
  'Infrastructure-as-Code security',
  'Software supply chain (SBOM, SLSA)',
  'Threat modeling',
  'AI security',
];

export const languages = ['Arabic', 'English'];
