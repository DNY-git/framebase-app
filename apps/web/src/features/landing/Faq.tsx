import { FAQS } from './data';
import { FaqChevron } from './icons';

/** FAQ (reference: FAQSection, id="faq") — native <details>/<summary> accordion, no JS. */
export function Faq() {
  return (
    <section data-purpose="faq-section" id="faq" className="py-24 border-stone-200 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-stone-400">
            Frequently Asked Questions
          </span>
          <h2 className="serif-display text-4xl sm:text-5xl text-stone-900 font-normal mt-2">
            Clear answers for construction teams.
          </h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <details
              key={f.question}
              className="group bg-white rounded-xl border border-stone-200 p-6 [&_summary::-webkit-details-marker]:none"
            >
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none text-stone-900 text-lg">
                <span>{f.question}</span>
                <span className="transition group-open:rotate-180 text-stone-400">
                  <FaqChevron />
                </span>
              </summary>
              <p className="text-stone-600 text-sm mt-4 leading-relaxed font-normal">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
