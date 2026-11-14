'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatVndPrice } from '../catalog.mjs';
import CustomerAccessDenied from '../components/customer-access-denied';
import { Icon } from '../components/icons';
import { isStaffSession } from '../components/role-access';
import { useStore } from '../components/store';

export default function CartPage() {
  const { cart, cartTotal, updateQuantity, removeItem, hydrated, session } = useStore();
  if (hydrated && isStaffSession(session)) return <CustomerAccessDenied />;
  return <div className="section-container inner-page"><div className="breadcrumbs"><Link href="/">Trang chủ</Link><span>/</span><strong>Giỏ hàng</strong></div><div className="inner-heading"><span className="eyebrow">— YOUR LITTLE SELECTION</span><h1>Giỏ hàng <em>của bạn.</em></h1><p>Kiểm tra những món ngon trước khi đặt hàng nhé.</p></div>
    {!hydrated ? <div className="state-box" role="status">Đang tải giỏ hàng...</div> : !cart.length ? <div className="empty-cart"><span className="empty-illustration"><Icon name="bag" size={48}/></span><h2>Giỏ hàng đang trống</h2><p>Chưa có món yêu thích nào ở đây. Hãy chọn một ly thật ngon nhé!</p><Link className="button button-primary" href="/#menu">Khám phá thực đơn <Icon name="arrow" size={18}/></Link></div>
      : <div className="cart-layout"><div className="cart-items"><div className="cart-items-title"><h2>Món đã chọn <span>({cart.length})</span></h2><Link href="/#menu">+ Thêm món</Link></div>{cart.map((item) => <article className="cart-item" key={item.key}><div className="cart-thumb">{item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="120px"/> : <Icon name="coffee" size={36}/>}</div><div className="cart-item-details"><h3>{item.name}</h3><p>Size {item.sizeName}{item.toppings?.length ? ` · ${item.toppings.map((t) => t.name).join(', ')}` : ''}</p><strong>{formatVndPrice(Number(item.unitPrice))}</strong><button type="button" className="remove-item" onClick={() => removeItem(item.key)}><Icon name="trash" size={15}/> Xóa</button></div><div className="cart-item-side"><span className="cart-line-price">{formatVndPrice(Number(item.unitPrice) * Number(item.quantity))}</span><div className="stepper"><button type="button" aria-label={`Giảm ${item.name}`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.key, item.quantity - 1)}><Icon name="minus" size={15}/></button><b>{item.quantity}</b><button type="button" aria-label={`Tăng ${item.name}`} onClick={() => updateQuantity(item.key, item.quantity + 1)}><Icon name="plus" size={15}/></button></div></div></article>)}</div>
        <aside className="summary-card"><span className="eyebrow">YOUR ORDER</span><h2>Tóm tắt đơn hàng</h2><div className="summary-row"><span>Tạm tính</span><strong>{formatVndPrice(cartTotal)}</strong></div><div className="summary-row"><span>Phí dịch vụ</span><strong>0đ</strong></div><div className="summary-divider"/><div className="summary-row summary-total"><span>Tổng cộng</span><strong>{formatVndPrice(cartTotal)}</strong></div><Link href="/checkout" className="button button-primary full-width">Tiếp tục đặt hàng <Icon name="arrow" size={18}/></Link><p className="summary-footnote"><Icon name="shield" size={16}/> Hệ thống xác nhận giá và tồn kho lúc tạo đơn.</p></aside></div>}
  </div>;
}
