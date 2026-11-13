'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from './icons';
import { useStore } from './store';

export function SiteHeader() {
  const { cartCount, session, logout, hydrated } = useStore();
  const visibleSession = hydrated ? session : null;
  const visibleCount = hydrated ? cartCount : 0;
  const [mobileOpen, setMobileOpen] = useState(false);
  return <>
    <div className="announcement">MỖI LY CÀ PHÊ • MỘT KHOẢNH KHẮC ĐÁNG NHỚ <span className="announcement-star">✳</span> BREWLITE EVERYDAY</div>
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="BrewLite - Trang chủ" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark"><Icon name="coffee" size={23}/></span>
          <span className="brand-name">brewlite<span className="brand-dot">.</span><small>COFFEE & GOOD DAYS</small></span>
        </Link>
        <nav className={mobileOpen ? 'site-nav open' : 'site-nav'} aria-label="Điều hướng chính">
          <Link href="/" onClick={() => setMobileOpen(false)}>Trang chủ</Link>
          <Link href="/#menu" onClick={() => setMobileOpen(false)}>Thực đơn</Link>
          <Link href="/orders" onClick={() => setMobileOpen(false)}>Đơn hàng</Link>
          <Link href="/#story" onClick={() => setMobileOpen(false)}>Câu chuyện</Link>
        </nav>
        <div className="header-actions">
          {visibleSession ? <button className="account-chip" onClick={logout} title="Đăng xuất"><Icon name="user" size={17}/><span>{visibleSession.account.fullName.split(' ').at(-1)} · Đăng xuất</span></button> :
            <Link className="account-chip" href="/login"><Icon name="user" size={17}/><span>Đăng nhập</span></Link>}
          <Link className="bag-button" href="/cart" aria-label={`Giỏ hàng (${visibleCount} sản phẩm)`}>
            <Icon name="bag" size={21}/><span>Giỏ hàng</span>{visibleCount > 0 && <span className="bag-count">{visibleCount}</span>}
          </Link>
          <button className="mobile-toggle" aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}><Icon name={mobileOpen ? 'close' : 'menu'} size={24}/></button>
        </div>
      </div>
    </header>
  </>;
}

export function SiteFooter() {
  return <footer id="footer" className="site-footer"><div className="footer-container">
    <div className="footer-brand"><Link href="/" className="brand"><span className="brand-mark"><Icon name="coffee" size={22}/></span><span className="brand-name">brewlite<span className="brand-dot">.</span></span></Link><h2>Coffee tastes better<br/><em>when life slows down.</em></h2><p>Đồ uống được pha chế chỉn chu, những ngày thường trở nên đặc biệt.</p></div>
    <div className="footer-column"><h3>KHÁM PHÁ</h3><Link href="/">Trang chủ</Link><Link href="/#menu">Thực đơn</Link><Link href="/#story">Về BrewLite</Link></div>
    <div className="footer-column"><h3>KHÁCH HÀNG</h3><Link href="/login">Tài khoản</Link><Link href="/cart">Giỏ hàng</Link><Link href="/orders">Đơn hàng của tôi</Link></div>
    <div className="footer-note"><span className="footer-tag">MADE FOR SLOW MORNINGS</span><p>Không chỉ là một ly đồ uống.<br/>Đó là khoảng nghỉ của riêng bạn.</p></div>
  </div><div className="footer-bottom"><span>© 2026 BrewLite. Crafted with care.</span><span>ASSIGNMENT 2 · SAIGON UNIVERSITY</span></div></footer>;
}
