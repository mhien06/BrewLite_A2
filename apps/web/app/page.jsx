'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatVndPrice, stockLabel } from './catalog.mjs';
import { Icon } from './components/icons';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003';
const categories = [{ id: 'all', name: 'Tất cả' }, { id: 'coffee', name: 'Cà phê' }, { id: 'tea', name: 'Trà trái cây' }, { id: 'matcha', name: 'Matcha & sữa' }];

function categoryFor(product) {
  const name = product.name.toLowerCase();
  if (/matcha|sữa tươi|latte/.test(name)) return 'matcha';
  if (/trà|đào|vải|chanh|trái cây/.test(name)) return 'tea';
  return 'coffee';
}

export default function Menu() {
  const [products, setProducts] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const request = new AbortController();
    fetch(api + '/products', { signal: request.signal })
      .then((response) => { if (!response.ok) throw new Error('Không tải được menu.'); return response.json(); })
      .then((items) => { if (!request.signal.aborted) setProducts(items); })
      .catch(() => { if (!request.signal.aborted) setFailed(true); });
    return () => request.abort();
  }, [attempt]);

  function retry() { setFailed(false); setProducts(null); setAttempt((value) => value + 1); }
  const filtered = useMemo(() => (products || []).filter((product) => (category === 'all' || categoryFor(product) === category) && `${product.name} ${product.description}`.toLocaleLowerCase('vi').includes(keyword.trim().toLocaleLowerCase('vi'))), [products, category, keyword]);

  return <>
    <section className="home-hero" aria-labelledby="hero-heading">
      <div className="hero-text">
        <span className="eyebrow"><span className="eyebrow-line"/> FRESHLY BREWED. THOUGHTFULLY MADE.</span>
        <h1 id="hero-heading">Your daily<br/><em>little escape.</em></h1>
        <p>Một chút hương thơm, một chút dịu dàng. BrewLite mang đến những ly đồ uống ngon lành để bạn tận hưởng từng khoảnh khắc.</p>
        <div className="hero-cta"><a className="button button-primary" href="#menu">Khám phá thực đơn <Icon name="arrow" size={19}/></a><a className="text-link" href="#story">Câu chuyện của chúng tôi <span>↗</span></a></div>
        <div className="hero-trust"><span className="trust-icon"><Icon name="sparkle" size={19}/></span><div><b>Crafted with love</b><small>Made for your everyday ritual</small></div></div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-photo-bg"/>
        <div className="hero-photo"><Image src="/products/ca-phe-sua.jpg" alt="" fill priority sizes="(max-width: 800px) 90vw, 45vw"/></div>
        <div className="hero-photo-small"><Image src="/products/matcha-latte.jpg" alt="" fill sizes="(max-width: 800px) 45vw, 18vw"/></div>
        <div className="hero-stamp"><span>GOOD COFFEE</span><Icon name="coffee" size={30}/><span>GOOD MOOD</span></div>
        <span className="hero-caption">01 / THE ART OF SLOW LIVING</span>
      </div>
    </section>

    <div className="features-strip"><div><Icon name="coffee" size={19}/> Freshly crafted everyday</div><span>✳</span><div><Icon name="heart" size={19}/> Made with a little love</div><span>✳</span><div><Icon name="leaf" size={19}/> Thoughtful ingredients</div></div>

    <section className="menu-section section-container" id="menu" aria-label="Thực đơn BrewLite">
      <div className="section-head"><div><span className="eyebrow">— A TASTE OF BREWLITE</span><h2>Find your <em>favorite.</em></h2><p>Có những hương vị luôn khiến một ngày của bạn trở nên đẹp hơn.</p></div><div className="menu-count">OUR SIGNATURE COLLECTION <span>✳</span></div></div>
      <div className="menu-controls"><div className="category-row" role="group" aria-label="Danh mục đồ uống">{categories.map((entry) => <button type="button" key={entry.id} className={category === entry.id ? 'category active' : 'category'} onClick={() => setCategory(entry.id)} aria-pressed={category === entry.id}>{entry.name}</button>)}</div><label className="search-field"><Icon name="search" size={18}/><span className="sr-only">Tìm món uống</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm món yêu thích..."/></label></div>
      {failed ? <div className="state-box" role="alert"><span className="state-icon"><Icon name="coffee" size={28}/></span><h3>Chưa thể tải thực đơn</h3><p>Không tải được menu.</p><button className="button button-primary" onClick={retry}>Thử lại <Icon name="arrow" size={17}/></button></div>
        : products === null ? <div className="state-box" role="status">Đang tải thực đơn…</div>
          : !products.length ? <div className="state-box"><h3>Hẹn bạn sớm nhé!</h3><p>Thực đơn chưa có món.</p></div>
            : !filtered.length ? <div className="state-box"><h3>Chưa tìm thấy món phù hợp</h3><p>Thử tìm với từ khóa hoặc danh mục khác nhé.</p><button type="button" className="button button-outline" onClick={() => { setCategory('all'); setKeyword(''); }}>Xem tất cả</button></div>
              : <div className="grid">{filtered.map((product, index) => <article className="product-card" key={product.id}>
                <Link className="image-link" href={'/products/' + product.id} aria-label={`Xem ${product.name}`}>
                  {product.imageUrl ? <Image className="product-image" src={product.imageUrl} alt={product.name} fill sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 25vw"/> : <div className="product-image-placeholder"><Icon name="coffee" size={44}/></div>}
                  {index === 0 && <span className="product-label">BEST SELLER</span>}
                  <span className={product.stock > 0 ? 'card-badge' : 'card-badge sold-out'}>{stockLabel(product.stock)}</span>
                  <span className="image-arrow"><Icon name="arrow" size={20}/></span>
                </Link>
                <div className="card-content"><span className="card-category">{categoryFor(product) === 'coffee' ? 'COFFEE COLLECTION' : categoryFor(product) === 'tea' ? 'FRUIT TEA' : 'MATCHA & MILK'}</span><h3>{product.name}</h3><p>{product.description}</p><div className="card-bottom"><strong>{formatVndPrice(product.price)}</strong><Link href={'/products/' + product.id}>Xem chi tiết</Link></div></div>
              </article>)}</div>}
    </section>

    <section id="story" className="story-section section-container"><div className="story-photo"><Image src="/products/bac-xiu.jpg" alt="Một ly bạc xỉu tại BrewLite" fill sizes="(max-width: 768px) 100vw, 45vw"/><span className="story-photo-caption">SIP SLOWLY, LIVE FULLY</span></div><div className="story-text"><span className="eyebrow">— THE BREWLITE STORY</span><h2>Good coffee.<br/><em>Better moments.</em></h2><p>Chúng mình tin rằng một ly đồ uống ngon không chỉ để giải khát — mà còn là lời nhắc nhỏ rằng bạn xứng đáng được tận hưởng những điều dịu dàng.</p><p>Từ cà phê đậm đà đến những ly trà tươi mát, mỗi món ở BrewLite đều được chăm chút để mang đến một chút niềm vui trong ngày.</p><a className="button button-outline" href="#menu">Chọn ly của bạn <Icon name="arrow" size={18}/></a></div></section>
    <section className="closing-banner"><div><span>YOUR NEXT FAVORITE IS WAITING</span><h2>Make today a <em>good one.</em></h2></div><a className="button button-light" href="#menu">Đặt đồ uống ngay <Icon name="arrow" size={18}/></a></section>
  </>;
}
