'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatVndPrice, stockLabel } from './catalog.mjs';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function Menu() {
  const [products, setProducts] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();
    fetch(api + '/products', { signal: request.signal })
      .then(response => {
        if (!response.ok) throw new Error('Không tải được menu.');
        return response.json();
      })
      .then(setProducts)
      .catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });

    return () => request.abort();
  }, [attempt]);

  function retry() {
    setFailed(false);
    setProducts(null);
    setAttempt(value => value + 1);
  }

  return (
    <>
      <section className="menu-hero">
        <span className="eyebrow">BREWLITE MENU</span>
        <h1>Điều gì đó ngon lành<br />đang chờ bạn.</h1>
        <p>Chọn món yêu thích và để BrewLite chuẩn bị một trải nghiệm trọn vị.</p>
      </section>

      <div className="category-row" aria-label="Danh mục">
        <span className="active">Tất cả</span>
        <span>Cà phê</span>
        <span>Trà</span>
        <span>Sữa</span>
      </div>

      <section className="menu-section">
        <span className="eyebrow">OUR SELECTION</span>
        <h2>Menu của BrewLite</h2>

        {failed ? (
          <div className="state-box" role="alert">
            <p>Không tải được menu.</p>
            <button onClick={retry}>Thử lại</button>
          </div>
        ) : products === null ? (
          <div className="state-box" role="status">Đang tải thực đơn…</div>
        ) : !products.length ? (
          <div className="state-box">Thực đơn chưa có món.</div>
        ) : (
          <div className="grid">
            {products.map(product => (
              <article className="product-card" key={product.id}>
                <Link className="image-link" href={'/products/' + product.id}>
                  {product.imageUrl && (
                    <Image
                      className="product-image"
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 25vw"
                    />
                  )}
                  <span className="card-badge">{stockLabel(product.stock)}</span>
                </Link>

                <div className="card-content">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="card-bottom">
                    <strong>{formatVndPrice(product.price)}</strong>
                    <Link href={'/products/' + product.id}>Xem chi tiết</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
