import React, { useEffect, useState } from 'react';
import { ArrowRight, FileText, ShieldCheck, Truck } from 'lucide-react';

interface HeroProps {
  onShopAll: () => void;
}

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Batch-tested' },
  { icon: FileText, label: 'COA available' },
  { icon: Truck, label: 'Discreet PH delivery' },
];

const Hero: React.FC<HeroProps> = ({ onShopAll }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#fff7fb]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, #fff7fb 0%, #fff0f7 46%, #ffeaf3 100%)',
        }}
      />
      <div
        className="absolute left-1/2 top-0 h-px w-[min(820px,84vw)] -translate-x-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(245,160,190,0.75), rgba(96,196,190,0.45), transparent)' }}
      />
      <div
        className="absolute left-1/2 top-20 hidden h-[420px] w-[min(880px,88vw)] -translate-x-1/2 rounded-full md:block"
        style={{
          border: '1px solid rgba(245,160,190,0.28)',
          borderBottomColor: 'rgba(96,196,190,0.18)',
          opacity: 0.55,
        }}
      />

      <div className="relative z-10 container mx-auto px-5 md:px-8">
        <div className="mx-auto flex min-h-[580px] max-w-4xl flex-col items-center justify-center py-20 text-center md:min-h-[640px]">
          <img
            src="/orozeplogo.jpg"
            alt="Orozep PH"
            className={`mb-6 h-28 w-28 rounded-3xl object-cover shadow-pink transition-all duration-700 sm:h-32 sm:w-32 ${
              visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
            }`}
            style={{ transitionDelay: '20ms' }}
          />

          <p
            className={`mb-5 inline-flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 font-sans text-xs font-semibold uppercase transition-all duration-700 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
            }`}
            style={{
              color: '#9a2a5c',
              letterSpacing: '0.18em',
              border: '1px solid rgba(245,160,190,0.34)',
              boxShadow: '0 10px 26px rgba(245,160,190,0.12)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#61c8c2' }} />
            Orozep Peptides
          </p>

          <h1
            className={`max-w-3xl text-[3.2rem] font-heading font-light sm:text-[4rem] md:text-[5.6rem] lg:text-[6.4rem] transition-all duration-700 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{
              color: '#5b2828',
              lineHeight: 0.94,
              letterSpacing: 0,
              transitionDelay: '70ms',
            }}
          >
            Premium peptides,
            <span
              className="block italic"
              style={{
                color: '#c73d7a',
                textShadow: '0 14px 36px rgba(245,160,190,0.22)',
              }}
            >
              beautifully verified.
            </span>
          </h1>

          <div
            className={`mt-7 h-px w-28 transition-all duration-700 ${
              visible ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0'
            }`}
            style={{
              background: 'linear-gradient(90deg, #f9b7d2, #61c8c2)',
              transitionDelay: '120ms',
            }}
          />

          <p
            className={`mt-7 max-w-2xl font-sans text-base leading-8 transition-all duration-700 md:text-lg ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{ color: '#7e3434', transitionDelay: '150ms' }}
          >
            A refined peptide shopping experience with verified product details, straightforward protocols, and discreet nationwide delivery.
          </p>

          <div
            className={`mt-10 flex w-full max-w-md flex-col gap-3 transition-all duration-700 sm:max-w-none sm:flex-row sm:justify-center ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{ transitionDelay: '210ms' }}
          >
            <button
              onClick={onShopAll}
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 font-sans text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #f593bc 0%, #e25c95 52%, #c73d7a 100%)',
                boxShadow: '0 14px 34px rgba(226,92,149,0.30)',
              }}
            >
              Shop Peptides
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="/coa"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 font-sans text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                color: '#9a2a5c',
                border: '1px solid rgba(245,160,190,0.40)',
                boxShadow: '0 10px 24px rgba(91,40,40,0.07)',
              }}
            >
              View COAs
            </a>
          </div>

          <div
            className={`mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-full bg-white/62 px-5 py-3 transition-all duration-700 ${
              visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{
              border: '1px solid rgba(245,160,190,0.28)',
              boxShadow: '0 14px 36px rgba(245,160,190,0.12)',
              transitionDelay: '280ms',
            }}
          >
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 font-sans text-sm font-medium" style={{ color: '#7e3434' }}>
                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: '#61c8c2' }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
