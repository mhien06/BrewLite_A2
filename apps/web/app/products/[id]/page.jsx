import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const response = await fetch(api + '/products/' + id, { cache: 'no-store' });

  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Không tải được món.');

  const product = await response.json();
  const sizes = product.options.filter(option => option.kind === 'SIZE');
  const toppings = product.options.filter(option => option.kind === 'TOPPING');

  return (
    <>
      <Link className="back-link" href="/">← Menu</Link>

      <article className="detail-card">
        <div>
          <img className="detail-image" src={product.imageUrl} alt={product.name} />
        </div>

        <div className="detail-content">
          <span className="eyebrow">BREWLITE COFFEE</span>
          <h1>{product.name}</h1>
          <p className="detail-description">{product.description}</p>
          <p className="detail-price">{product.price.toLocaleString('vi-VN')}đ</p>

          <section className="option-group">
            <h2>Chọn kích thước</h2>
            <div className="option-list">
              {sizes.map(option => (
                <span key={option.id}>
                  {option.name} · +{option.surcharge.toLocaleString('vi-VN')}đ
                </span>
              ))}
            </div>
          </section>

          <section className="option-group">
            <h2>Topping</h2>
            <div className="option-list">
              {toppings.map(option => (
                <span key={option.id}>
                  {option.name} · +{option.surcharge.toLocaleString('vi-VN')}đ
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