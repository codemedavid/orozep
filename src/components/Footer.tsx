import React from 'react';
import { FlaskConical, Truck, HelpCircle, FileText, BookOpen, Leaf, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer style={{ background: '#2D1212' }}>

      {/* Pink gradient top edge */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #FCD3E5, #F593BC, #E25C95, #C73D7A, #E25C95, #F593BC, #FCD3E5)' }}
      />

      {/* ── Main content ── */}
      <div className="container mx-auto px-5 md:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <img
              src="/orozeplogo.jpg"
              alt="Orozep PH"
              className="h-20 w-auto object-contain mb-5 rounded-2xl"
              style={{ boxShadow: '0 4px 24px rgba(245,160,190,0.35)' }}
            />
            <p className="font-sans text-sm leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <span className="font-heading text-lg" style={{ color: '#FCD3E5' }}>Orozep PH</span> — premium pink peptide essentials.
            </p>
            <p className="font-sans text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Lab-tested peptide essentials with third-party verification and nationwide delivery.
            </p>
            <div className="flex items-center gap-2 text-xs font-sans" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <Leaf className="w-3.5 h-3.5" style={{ color: '#F9B7D2' }} />
              99%+ Purity on every product
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-sans font-semibold text-sm mb-5 tracking-wide" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Products
            </h4>
            <ul className="space-y-3">
              {['Weight Management', 'Performance Peptides', 'Recovery & Repair', 'Anti-Aging', 'Cognitive Support'].map(item => (
                <li key={item}>
                  <a
                    href="#"
                    className="font-sans text-sm transition-colors"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#FCD3E5'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)'; }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-sans font-semibold text-sm mb-5 tracking-wide" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                { icon: BookOpen,    label: 'Protocols',      href: '/protocols' },
                { icon: FileText,    label: 'COA Documents',  href: '/coa' },
                { icon: HelpCircle,  label: 'FAQ',            href: '/faq' },
                { icon: Truck,       label: 'Track Order',    href: '/track-order' },
                { icon: FlaskConical,label: 'Product Catalog',href: '/' },
              ].map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="flex items-center gap-2 font-sans text-sm transition-colors group"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#FCD3E5'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)'; }}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-sans font-semibold text-sm mb-5 tracking-wide" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Stay Updated
            </h4>
            <p className="font-sans text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              New peptides, protocols, and exclusive offers — delivered to your inbox.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 min-w-0 text-sm font-sans px-3.5 py-2.5 rounded-xl focus:outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                }}
                onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(245,160,190,0.45)'; }}
                onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
              <button
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl text-white transition-colors"
                style={{ background: '#E25C95' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#C73D7A'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E25C95'; }}
                aria-label="Subscribe"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
            <p className="font-sans text-[11px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container mx-auto px-5 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
            © {new Date().getFullYear()} Orozep PH. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {['Privacy Policy', 'Terms of Service', 'Shipping Policy'].map(item => (
              <a
                key={item}
                href="#"
                className="font-sans text-xs transition-colors"
                style={{ color: 'rgba(255,255,255,0.28)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.28)'; }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
