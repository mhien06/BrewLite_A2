import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { formatVndPrice, splitOptions } from '../../catalog.mjs';
import ProductCustomizer from '../../components/product-customizer';
import { Icon } from '../../components/icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Chi tiết sản phẩm #${id}` };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const api = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003';
  const response = await fetch(api + '/products/' + id, { cache: 'no-store' });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error('Không tải được món.');
  const product = await response.json();
  const { sizes, toppings } = splitOptions(product.options ?? []);
  return <div className="section-container detail-page"><div className="breadcrumbs"><Link href="/">Trang chủ</Link><span>/</span><Link href="/#menu">Thực đơn</Link><span>/</span><strong>{product.name}</strong></div>
    <article className="detail-card"><div className="detail-gallery"><div className="detail-image-wrap">{product.imageUrl ? <Image className="detail-image" src={product.imageUrl} alt={product.name} fill priority sizes="(max-width: 760px) 100vw, 50vw"/> : <div className="product-image-placeholder"><Icon name="coffee" size={80}/></div>}<span className="detail-image-tag">BREWLITE SIGNATURE</span></div><div className="detail-gallery-caption"><Icon name="sparkle" size={19}/> BREWED WITH LOVE, SERVED WITH CARE <span>✳</span></div></div>
      <div className="detail-content"><span className="eyebrow">— MADE JUST FOR YOU</span><h1>{product.name}</h1><p className="detail-description">{product.description}</p><div className="detail-price-label">Giá từ <strong>{formatVndPrice(Number(product.price))}</strong></div><div className="detail-rule"/><ProductCustomizer product={product} sizes={sizes} toppings={toppings}/></div></article>
    <div className="detail-back"><Link href="/#menu"><Icon name="back" size={18}/> Quay lại thực đơn</Link></div>
  </div>;
}
