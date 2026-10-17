/**
 * Role & permissions console data (ported verbatim from the reference design's
 * ROLES object). Copy, colors and levels must match the reference exactly.
 */

export type LandingRoleKey = 'owner' | 'pm' | 'engineer' | 'qs' | 'procurement' | 'sub';

export interface LandingRole {
  /** data-role value on the tab button */
  key: LandingRoleKey;
  /** DOM id of the tab button (also referenced by aria-labelledby) */
  tabId: string;
  /** Display name on the directory row */
  rowName: string;
  /** Optional "(you)" suffix on the directory row */
  you?: boolean;
  email: string;
  /** Avatar path served from /public — falls back to initials when missing */
  avatar?: string;
  /** Initials used for the fallback avatar (and the avatar-less subcontractor row) */
  initials: string;
  /** Role label shown in the row CTA (owner row shows a pill instead) */
  rowRole: string;
  /** Panel heading */
  name: string;
  /** Panel category eyebrow */
  cat: string;
  /** Panel description */
  desc: string;
  /** Panel core permissions (4) */
  perms: string[];
  /** Panel access pill */
  pill: string;
  /** Panel access level (1–5) */
  level: number;
  /** Tailwind class for the category text color */
  catText: string;
  /** Tailwind class for the meter/pill dot color */
  dot: string;
}

export const ROLES: Record<LandingRoleKey, LandingRole> = {
  owner: {
    key: 'owner',
    tabId: 'tab-owner',
    rowName: 'john ademola',
    you: true,
    email: 'john@buildco.ng',
    avatar: '/avatars/john.jpg',
    initials: 'JA',
    rowRole: 'Owner',
    name: 'Project Owner / CEO',
    cat: 'Executive',
    desc: 'Full portfolio ROI, budget release signoff, macro burn rates.',
    perms: ['Portfolio ROI dashboards', 'Budget release signoff', 'Macro burn-rate analytics', 'Change order approval'],
    pill: 'Full Read & Write',
    level: 5,
    catText: 'text-terracotta-600',
    dot: 'bg-terracotta-500',
  },
  pm: {
    key: 'pm',
    tabId: 'tab-pm',
    rowName: 'darry fraser',
    email: 'darry@buildco.ng',
    avatar: '/avatars/darry.jpg',
    initials: 'DF',
    rowRole: 'Project Manager',
    name: 'Project Manager',
    cat: 'Management',
    desc: 'Gantt scheduling, contractor milestone approvals, risk logs.',
    perms: ['Gantt & milestone planning', 'Contractor approvals', 'Risk register management', 'Daily progress reports'],
    pill: 'Milestone & Task Authority',
    level: 4,
    catText: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  engineer: {
    key: 'engineer',
    tabId: 'tab-engineer',
    rowName: 'tunde bakare',
    email: 'tunde@buildco.ng',
    avatar: '/avatars/tunde.jpg',
    initials: 'TB',
    rowRole: 'Site Engineer',
    name: 'Site Engineer / Foreman',
    cat: 'Jobsite',
    desc: 'Mobile daily logs, material intake, worker headcount check-in.',
    perms: ['Mobile daily site logs', 'Material intake records', 'Crew headcount check-in', 'Photo & voice notes'],
    pill: 'Site Operations Only',
    level: 3,
    catText: 'text-blue-600',
    dot: 'bg-blue-500',
  },
  qs: {
    key: 'qs',
    tabId: 'tab-qs',
    rowName: 'amara okafor',
    email: 'amara@buildco.ng',
    avatar: '/avatars/amara.jpg',
    initials: 'AO',
    rowRole: 'Quantity Surveyor',
    name: 'Quantity Surveyor',
    cat: 'Finance',
    desc: 'BOQ tracking, valuation claims, material variance reports.',
    perms: ['BOQ line-item tracking', 'Interim valuation claims', 'Material variance reports', 'Cost audit trail export'],
    pill: 'Cost & Billing Audit',
    level: 3,
    catText: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  procurement: {
    key: 'procurement',
    tabId: 'tab-procurement',
    rowName: 'fatima bello',
    email: 'fatima@buildco.ng',
    avatar: '/avatars/fatima.jpg',
    initials: 'FB',
    rowRole: 'Procurement Lead',
    name: 'Procurement Lead',
    cat: 'Logistics',
    desc: 'Vendor tenders, delivery manifests, warehouse inventory dispatch.',
    perms: ['Vendor tender comparison', 'Purchase order issuance', 'Delivery manifest tracking', 'Warehouse dispatch control'],
    pill: 'Supplier & PO Hub',
    level: 3,
    catText: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  sub: {
    key: 'sub',
    tabId: 'tab-sub',
    rowName: 'mekur & sons',
    email: 'works@mekus.ng',
    initials: 'MS',
    rowRole: 'Subcontractor',
    name: 'Subcontractors',
    cat: 'Partner',
    desc: 'Assigned work orders, snagging resolution photos, submission only.',
    perms: ['Assigned work orders', 'Snagging photo uploads', 'Payment claim submissions', 'Scope-limited visibility'],
    pill: 'Restricted Scope View',
    level: 1,
    catText: 'text-stone-500',
    dot: 'bg-stone-400',
  },
};

export const ROLE_ORDER: LandingRoleKey[] = ['owner', 'pm', 'engineer', 'qs', 'procurement', 'sub'];

/** FAQ entries (native <details>/<summary> accordion, copy verbatim from the reference). */
export const FAQS: { question: string; answer: string }[] = [
  {
    question: 'How does FrameBase integrate with WhatsApp and site messaging?',
    answer:
      "Field foremen can text photos, voice notes, and delivery tickets straight to FrameBase's dedicated WhatsApp bot. Our system transcribes the audio, scans receipt amounts, and automatically attaches them to the specific project phase and line item.",
  },
  {
    question: 'Can subcontractors view our client budget or profit margins?',
    answer:
      'No. Subcontractors receive strict scope-limited portal access. They only see task descriptions, punchlists, inspection stamps, and upload portals for their own payment claims. Sensitive general contractor markups and client master budgets remain encrypted and invisible.',
  },
  {
    question: 'Does the platform work offline on remote jobsites with poor cell reception?',
    answer:
      "Yes. The FrameBase mobile field app stores drawings, daily log inputs, and snagging photos locally on the worker's device. As soon as the device reconnects to 3G/4G or site Wi-Fi, changes reconcile and sync conflict-free with the master cloud database.",
  },
  {
    question: 'What size of construction firm is FrameBase built for?',
    answer:
      'FrameBase is deployed by boutique residential builders managing 2 to 5 concurrent sites, as well as large civil engineering firms orchestrating hundreds of millions in infrastructure with complex tender workflows.',
  },
  {
    question: 'How long does team onboarding take?',
    answer:
      'Most teams import their active Excel estimates and set up active projects within 48 hours. Because the site worker interface requires zero training (single-button check-ins and photo uploads), field adoption typically happens on Day 1.',
  },
];

/** Footer link columns (verbatim from the reference). */
export const FOOTER_COLUMNS: { title: string; links: string[] }[] = [
  {
    title: 'Product',
    links: ['Budget & Cost Variance', 'Equipment Tracking', 'Tender Comparison', 'Site Daily Logs', 'Drawing Vault'],
  },
  {
    title: 'Solutions',
    links: [
      'General Contractors',
      'Civil Infrastructure',
      'Real Estate Developers',
      'Quantity Surveyors',
      'Subcontractor Networks',
    ],
  },
  {
    title: 'Company',
    links: [
      'About FrameBase',
      'Construction Benchmark Report',
      'Privacy Policy',
      'Terms of Service',
      'Contact Engineering',
    ],
  },
];

/** One half of the footer marquee band (duplicated in markup for a seamless loop). */
export const MARQUEE_ITEMS: { text: string; variant: 'roman' | 'out-it' | 'terra' }[] = [
  { text: 'Budget Clarity', variant: 'roman' },
  { text: 'Live Site Sync', variant: 'out-it' },
  { text: 'Daily Site Logs', variant: 'roman' },
  { text: 'Drawing Vault', variant: 'out-it' },
  { text: 'Zero Cost Surprises', variant: 'terra' },
  { text: 'Tender Comparison', variant: 'out-it' },
  { text: 'Equipment Tracking', variant: 'roman' },
];
