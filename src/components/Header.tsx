import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, FlaskConical, Truck, HelpCircle, FileText, BookOpen, Star } from 'lucide-react';

interface HeaderProps {
  cartItemsCount: number;
  onCartClick: () => void;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartItemsCount, onCartClick, onMenuClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Products',    href: undefined,        isButton: true,  icon: FlaskConical },
    { label: 'Track Order', href: '/track-order',   isButton: false, icon: Truck },
    { label: 'FAQ',         href: '/faq',           isButton: false, icon: HelpCircle },
    { label: 'COA',         href: '/coa',           isButton: false, icon: FileText },
    { label: 'Protocols',   href: '/protocols',     isButton: false, icon: BookOpen },
    { label: 'Reviews',     href: '/reviews',       isButton: false, icon: Star },
  ];

  return (
    <>
      {/* ── Main header ── */}
      <header
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md transition-all duration-300"
        style={{
          borderBottom: scrolled ? '1px solid rgba(245,160,190,0.35)' : '1px solid rgba(91,40,40,0.08)',
          boxShadow: scrolled ? '0 4px 24px rgba(245,160,190,0.14)' : 'none',
        }}
      >
        <div className="container mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => { onMenuClick(); setMobileMenuOpen(false); }}
            className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src="/orozeplogo.jpg" alt="Orozep PH" className="h-12 sm:h-14 w-auto object-contain rounded-xl" />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map(({ label, href, isButton }) =>
              isButton ? (
                <button
                  key={label}
                  onClick={onMenuClick}
                  className="px-4 py-2 text-sm font-sans font-medium rounded-lg transition-colors"
                  style={{ color: '#7E3434' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#E25C95'; (e.currentTarget as HTMLButtonElement).style.background = '#FFEAF3'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7E3434'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {label}
                </button>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="px-4 py-2 text-sm font-sans font-medium rounded-lg transition-colors"
                  style={{ color: '#7E3434' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#E25C95'; (e.currentTarget as HTMLAnchorElement).style.background = '#FFEAF3'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#7E3434'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                >
                  {label}
                </a>
              )
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative p-2.5 rounded-full transition-all"
              style={{ color: '#7E3434' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E3F1FE'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-white text-[10px] font-sans font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none"
                  style={{ background: '#E25C95', boxShadow: '0 2px 8px rgba(226,92,149,0.45)' }}
                >
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </button>

            {/* Shop CTA — desktop */}
            <button onClick={onMenuClick} className="hidden md:inline-flex btn-mint py-2.5 px-6 text-sm">
              Shop Now
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-full transition-colors"
              style={{ color: '#7E3434' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E3F1FE'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: 'rgba(91,40,40,0.25)' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="absolute top-0 right-0 bottom-0 w-[300px] bg-white flex flex-col"
            style={{ boxShadow: '-8px 0 48px rgba(91,40,40,0.14)' }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(245,160,190,0.30)' }}
            >
              <img src="/orozeplogo.jpg" alt="Orozep PH" className="h-12 w-auto rounded-xl" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full transition-colors"
                style={{ color: '#B96A6A' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E3F1FE'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navLinks.map(({ label, href, isButton, icon: Icon }) =>
                isButton ? (
                  <button
                    key={label}
                    onClick={() => { onMenuClick(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left font-sans font-medium transition-colors"
                    style={{ color: '#421C1C' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFEAF3'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFEAF3' }}>
                      <Icon className="w-4 h-4" style={{ color: '#E25C95' }} />
                    </div>
                    {label}
                  </button>
                ) : (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-sans font-medium transition-colors"
                    style={{ color: '#421C1C' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#FFEAF3'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFEAF3' }}>
                      <Icon className="w-4 h-4" style={{ color: '#E25C95' }} />
                    </div>
                    {label}
                  </a>
                )
              )}
            </nav>

            {/* Mobile CTA */}
            <div className="p-4" style={{ borderTop: '1px solid rgba(245,160,190,0.30)' }}>
              <button
                onClick={() => { onMenuClick(); setMobileMenuOpen(false); }}
                className="btn-mint w-full py-3.5"
              >
                Shop Peptides ✨
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
