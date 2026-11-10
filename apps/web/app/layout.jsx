import './style.css';
import Link from 'next/link';

export const metadata = { title: 'BrewLite' };

export default function Layout({ children }) {
  return (
    <html lang="vi">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link className="brand" href="/">
              <span className="brand-icon">☕</span>
              <span>BrewLite<small>MORE THAN JUST COFFEE</small></span>
            </Link>

            <nav aria-label="Điều hướng chính">
              <Link href="/">Trang chủ</Link>
              <Link href="/">Menu</Link>
              <a href="#footer">Về chúng tôi</a>
            </nav>

            <div className="header-actions">
              <span className="search-pill">⌕ Tìm kiếm</span>
              <span className="login-pill">Đăng nhập</span>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer id="footer">
          <div>
            <strong>☕ BrewLite</strong>
            <p>Đặt cà phê nhanh chóng và tận hưởng những khoảnh khắc tuyệt vời.</p>
          </div>
          <div><strong>Khám phá</strong><p>Trang chủ<br />Menu<br />Về chúng tôi</p></div>
          <div><strong>Tài khoản</strong><p>Đăng nhập<br />Đơn hàng của tôi</p></div>
        </footer>
      </body>
    </html>
  );
}
