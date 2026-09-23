import { ChevronDown } from 'lucide-react';
import { Reveal } from './shared';

const FAQS = [
  {
    q: 'How does FrameBase integrate with WhatsApp and site messaging?',
    a: "Field foremen can text photos, voice notes, and delivery tickets straight to FrameBase's dedicated WhatsApp bot. Our system transcribes the audio, scans receipt amounts, and automatically attaches them to the specific project phase and line item.",
  },
  {
    q: 'Can subcontractors view our client budget or profit margins?',
    a: 'No. Subcontractors receive strict scope-limited portal access. They only see task descriptions, punchlists, inspection stamps, and upload portals for their own payment claims. Sensitive general contractor markups and client master budgets remain encrypted and invisible.',
  },
  {
    q: 'Does the platform work offline on remote jobsites with poor cell reception?',
    a: "Yes. The FrameBase mobile field app stores drawings, daily log inputs, and snagging photos locally on the worker's device. As soon as the device reconnects to 3G/4G or site Wi-Fi, changes reconcile and sync conflict-free with the master cloud database.",
  },
  {
    q: 'What size of construction firm is FrameBase built for?',
    a: 'FrameBase is deployed by boutique residential builders managing 2 to 5 concurrent sites, as well as large civil engineering firms orchestrating hundreds of millions in infrastructure with complex tender workflows.',
  },
  {
    q: 'How long does team onboarding take?',
    a: 'Most teams import their active Excel estimates and set up active projects within 48 hours. Because the site worker interface requires zero training (single-button check-ins and photo uploads), field adoption typically happens on Day 1.',
  },
] as const;

export function FAQSection() {
  return (
    <section id="faq" className="border-t border-stone-200 bg-white py-24">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal className="mb-16 text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-stone-400">Frequently Asked Questions</span>
          <h2 className="font-display mt-2 text-4xl font-normal text-stone-900 sm:text-5xl">
            Clear answers for construction teams.
          </h2>
        </Reveal>

        <div className="space-y-4">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delayMs={i * 60}>
              <details className="group rounded-xl border border-stone-200 bg-white p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-medium text-stone-900">
                  <span>{f.q}</span>
                  <span className="text-stone-400 transition group-open:rotate-180">
                    <ChevronDown className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                  </span>
                </summary>
                <p className="mt-4 text-sm font-normal leading-relaxed text-stone-600">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
