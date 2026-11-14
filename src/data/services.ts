/** "Services" rows on the home page; also the skills block on the CV. */
export interface Service {
  name: string;
  desc: string;
  tags: string[];
}

export const services: Service[] = [
  {
    name: 'Product security & DevSecOps',
    desc: 'Automated security checks and secure defaults built into the delivery pipeline.',
    tags: ['CI/CD', 'DevOps', 'Linux (Red Hat)', 'Secure delivery'],
  },
  {
    name: 'Application security',
    desc: 'Secure code review and testing, done alongside your developers.',
    tags: ['Secure code review', 'Secure SDLC', 'JavaScript / Node.js', 'MongoDB'],
  },
  {
    name: 'Web & mobile penetration testing',
    desc: 'Web, API, and Android testing. Every finding is verified and comes with a clear fix.',
    tags: ['Web', 'Mobile', 'API', 'Red teaming', 'Reporting'],
  },
  {
    name: 'Security research & bug bounty',
    desc: 'Finding vulnerabilities in live systems and disclosing them responsibly.',
    tags: ['Bug bounty', 'Recon', 'Vulnerability research', 'Disclosure'],
  },
  {
    name: 'AI security',
    desc: 'Testing AI features for prompt injection, weak authentication, and data exposure.',
    tags: ['LLM applications', 'Authentication', 'Abuse cases'],
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
