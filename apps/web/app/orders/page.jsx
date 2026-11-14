'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatVndPrice } from '../catalog.mjs';
import CustomerAccessDenied from '../components/customer-access-denied';
import { Icon } from '../components/icons';
import { isStaffSession } from '../components/role-access';
import { apiRequest, useStore } from '../components/store';
import PaymentPanel from '../components/payment-panel';

const labels = {
  PENDING_PAYMENT: ['Chờ thanh toán', 'pending'], PAID: ['Đã thanh toán', 'success'],
  CONFIRMED: ['Đã xác nhận', 'success'], PREPARING: ['Đang pha chế', 'progress'],
  READY_FOR_PICKUP: ['Sẵn sàng nhận', 'success'], COMPLETED: ['Hoàn tất', 'success'],
  CANCELLED: ['Đã hủy', 'cancelled'], EXPIRED: ['Hết hạn', 'cancelled'],
};

function humanDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Chưa rõ thời gian' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function OrdersPage() {
  const { session, hydrated } = useStore();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const refreshOrders = useCallback(() => setRefresh(value => value + 1), []);
  useEffect(() => {
    if (!hydrated || !session || isStaffSession(session)) return;
    let ignore = false;
    apiRequest('/orders', { token: session.accessToken })
      .then(data => { if (!ignore) { setOrders(Array.isArray(data) ? data : []); setError(''); } })
      .catch(exception => { if (!ignore) { setOrders(null); setError(exception.message); } });
    return () => { ignore = true; };
  }, [hydrated, session, refresh]);
  if (!hydrated) return <div className="section-container inner-page"><div className="state-box" role="status">Đang tải tài khoản…</div></div>;
  if (isStaffSession(session)) return <CustomerAccessDenied />;
  if (!session) return <div className="section-container inner-page"><div className="empty-cart"><span className="empty-illustration"><Icon name="user" size={42}/></span><h1>Đơn hàng của bạn</h1><p>Đăng nhập để xem lịch sử đơn hàng và tình trạng từng đơn nhé.</p><Link className="button button-primary" href="/login?next=%2Forders">Đăng nhập <Icon name="arrow" size={18}/></Link></div></div>;
  return <div className="section-container inner-page"><div className="breadcrumbs"><Link href="/">Trang chủ</Link><span>/</span><strong>Đơn hàng</strong></div><div className="inner-heading"><span className="eyebrow">— YOUR COFFEE JOURNEY</span><h1>Đơn hàng <em>của tôi.</em></h1><p>Mọi ly cà phê đã chọn, lưu lại tại đây.</p></div>
    {error ? <div className="state-box" role="alert"><h2>Không thể tải đơn hàng</h2><p>{error}</p><button type="button" className="button button-primary" onClick={() => { setError(''); setRefresh(n => n + 1); }}>Thử lại <Icon name="arrow" size={18}/></button></div>
      : orders === null ? <div className="state-box" role="status">Đang tải đơn hàng…</div>
        : !orders.length ? <div className="empty-cart"><span className="empty-illustration"><Icon name="coffee" size={44}/></span><h2>Chưa có đơn hàng nào</h2><p>Ly đồ uống đầu tiên đang chờ bạn lựa chọn.</p><Link className="button button-primary" href="/#menu">Xem thực đơn <Icon name="arrow" size={19}/></Link></div>
          : <div className="orders-list">{orders.map(order => { const [label, statusClass] = labels[order.status] || [order.status || 'Chưa rõ', 'pending'];
            return <article className="order-card" key={order.orderId}><div className="order-card-header"><div><span className="eyebrow">BREWLITE ORDER</span><h2>Đơn hàng #{order.orderId}</h2><p><Icon name="clock" size={15}/> {humanDate(order.createdAt)}</p></div><span className={`order-status ${statusClass}`}><span className="status-signal"/>{label}</span></div><div className="order-products">{(order.items || []).map((item, index) => <div key={`${order.orderId}-${index}`} className="order-product-line"><div><strong>{item.productName}</strong><small>Size {item.size?.name || '—'}{item.toppings?.length ? ` · ${item.toppings.map(t => t.name).join(', ')}` : ''}</small></div><span>×{item.quantity}</span></div>)}</div><div className="order-card-footer"><div><span>Tổng cộng</span><strong>{formatVndPrice(Number(order.totalAmount))}</strong></div><Link className="button button-outline" href={`/orders/${order.orderId}`}>
    Xem chi tiết <Icon name="arrow" size={17}/>
  </Link><PaymentPanel orderId={order.orderId} onSettled={order.status === 'PENDING_PAYMENT' ? refreshOrders : undefined}/></div></article>;
          })}</div>}
  </div>;
}
