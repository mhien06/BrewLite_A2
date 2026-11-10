import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatVndPrice, splitOptions } from '../../catalog.mjs';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const response = await fetch(api + '/products/' + id, { cache: 'no-store' });

  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Không tải được món.');

  const product = await response.json();
  const { sizes, toppings } = splitOptions(product.options);

  return (
    <>
      <Link className="back-link" href="/">← Menu</Link>

      <article className="detail-card">
        <div className="detail-image-wrap">
          <Image
            className="detail-image"
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
          />
        </div>

        <div className="detail-content">
          <span className="eyebrow">BREWLITE COFFEE</span>
          <h1>{product.name}</h1>
          <p className="detail-description">{product.description}</p>
          <p className="detail-price">{formatVndPrice(product.price)}</p>

          <section className="option-group">
            <h2>Chọn kích thước</h2>
            <div className="option-list">
              {sizes.map(option => (
                <span key={option.id}>
                  {option.name} · +{formatVndPrice(option.surcharge)}
                </span>
              ))}
            </div>
          </section>

          <section className="option-group">
            <h2>Topping</h2>
            <div className="option-list">
              {toppings.map(option => (
                <span key={option.id}>
                  {option.name} · +{formatVndPrice(option.surcharge)}
                </span>
              ))}
            </div>
          </section>

          <div className="availability">
            <span>Trạng thái</span>
            <strong>
              {product.stock ? `Còn hàng · ${product.stock} sản phẩm` : 'Tạm hết hàng'}
            </strong>
          </div>
        </div>
      </article>
    </>
  );
}
