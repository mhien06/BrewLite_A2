import './style.css';
import { StoreProvider } from './components/store';
import { SiteHeader, SiteFooter } from './components/site-shell';

export const metadata = {
  title: { default: 'BrewLite — A little pause, a lot of flavor', template: '%s | BrewLite' },
  description: 'BrewLite — cà phê, trà và những khoảnh khắc rất riêng.',
};

export default function RootLayout({ children }) {
  return <html lang="vi"><body><StoreProvider><SiteHeader/><main id="main-content">{children}</main><SiteFooter/></StoreProvider></body></html>;
}
