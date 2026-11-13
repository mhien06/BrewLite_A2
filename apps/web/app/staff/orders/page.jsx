'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatVndPrice } from '../../catalog.mjs';
import { Icon } from '../../components/icons';
import { apiRequest, useStore } from '../../components/store';

const orderLabels = {
  PENDING_PAYMENT: ['Chờ thanh toán', 'pending'],
  PAID: ['Đã thanh toán · chờ pha chế', 'success'],
  PREPARING: ['Đang pha chế', 'progress'],
  READY_FOR_PICKUP: ['Sẵn sàng nhận', 'success'],
  COMPLETED: ['Đã hoàn tất', 'success'],
  CANCELLED: ['Đã hủy', 'cancelled'],
};

const paymentLabels = {
  NONE: 'Chưa có giao dịch', PENDING: 'Đang chờ thanh toán', UNKNOWN: 'Đang xác minh',
  SUCCESS: 'Đã xác minh thành công', FAILED: 'Thanh toán thất bại', EXPIRED: 'Thanh toán hết hạn',
};

const nextStep = {
  PAID: ['PREPARING', 'Bắt đầu pha chế'],
  PREPARING: ['READY_FOR_PICKUP', 'Đánh dấu sẵn sàng'],
  READY_FOR_PICKUP: ['COMPLETED', 'Hoàn tất đơn'],
};

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa rõ thời gian' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function StaffOrdersPage() {
  const { session, hydrated } = useStore();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyOrder, setBusyOrder] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh(value => value + 1), []);

  useEffect(() => {
    if (!hydrated || !session || !['STAFF', 'MANAGER'].includes(session.account?.role)) return;
    let ignore = false;
    apiRequest('/staff/orders', { token: session.accessToken })
      .then(data => { if (!ignore) { setOrders(Array.isArray(data) ? data : []); setError(''); } })
      .catch(exception => { if (!ignore) { setOrders(null); setError(exception.message); } });
    return () => { ignore = true; };
  }, [hydrated, session, refresh]);

  async function advance(order) {
    const [status, label] = nextStep[order.status] || [];
    if (!status || busyOrder !== null) return;
    if (!window.confirm(`Xác nhận “${label}” cho đơn #${order.orderId}?`)) return;
    setBusyOrder(order.orderId); setError(''); setNotice('');
    try {
      await apiRequest(`/staff/orders/${order.orderId}/status`, {
        method: 'PATCH', token: session.accessToken, body: JSON.stringify({ status }),
      });
      setNotice(`Đã cập nhật đơn #${order.orderId}: ${orderLabels[status][0]}.`);
      reload();
    } catch (exception) { setError(exception.message); }
    finally { setBusyOrder(null); }
  }

  if (!hydrated) return <div className="section-container inner-page"><div className="state-box" role="status">Đang tải tài khoản…</div></div>;
  if (!session) return <div className="section-container inner-page"><div className="empty-cart"><span className="empty-illustration"><Icon name="user" size={42}/></span><h1>Khu vực nhân viên</h1><p>Đăng nhập bằng tài khoản STAFF hoặc MANAGER để xem đơn của cửa hàng.</p><Link className="button button-primary" href="/login?next=%2Fstaff%2Forders">Đăng nhập <Icon name="arrow" size={18}/></Link></div></div>;
  if (!['STAFF', 'MANAGER'].includes(session.account?.role)) return <div className="section-container inner-page"><div className="state-box" role="alert"><h2>Không có quyền truy cập</h2><p>Khu vực xử lý đơn chỉ dành cho Nhân viên quầy và Quản lý cửa hàng.</p><Link className="button button-outline" href="/">Về trang chủ</Link></div></div>;

  return <div className="section-container inner-page">
    <div className="breadcrumbs"><Link href="/">Trang chủ</Link><span>/</span><strong>Đơn hàng cửa hàng</strong></div>
    <div className="staff-heading"><div className="inner-heading"><span className="eyebrow">— BREWLITE OPERATIONS</span><h1>Đơn hàng <em>cửa hàng.</em></h1><p>Chỉ bắt đầu pha chế khi hệ thống đã xác minh thanh toán thành công.</p></div><button className="button button-outline" type="button" onClick={reload}><Icon name="clock" size={17}/> Làm mới</button></div>
    {error && <div className="state-box staff-message" role="alert"><h2>Có lỗi xảy ra</h2><p>{error}</p><button type="button" className="button button-primary" onClick={() => { setError(''); reload(); }}>Thử lại</button></div>}
    {notice && <div className="staff-notice" role="status">{notice}</div>}
    {orders === null ? !error && <div className="state-box" role="status">Đang tải đơn hàng…</div>
      : orders.length === 0 ? <div className="empty-cart"><span className="empty-illustration"><Icon name="coffee" size={44}/></span><h2>Chưa có đơn hàng</h2><p>Đơn hàng của cửa hàng sẽ xuất hiện tại đây.</p></div>
        : <div className="staff-order-list">{orders.map(order => {
          const [statusText, statusClass] = orderLabels[order.status] || [order.status, 'pending'];
          const [nextStatus, nextText] = nextStep[order.status] || [];
          const verified = order.paymentVerified === true;
          return <article className="staff-order-card" key={order.orderId}>
            <header className="staff-order-header"><div><span className="eyebrow">ĐƠN HÀNG #{order.orderId}</span><h2>{order.customerName || 'Khách hàng'}</h2><p><Icon name="clock" size={15}/> {dateLabel(order.createdAt)}</p></div><span className={`order-status ${statusClass}`}><span className="status-signal"/>{statusText}</span></header>
            <div className="staff-status-row"><span><b>Thanh toán:</b> {paymentLabels[order.paymentStatus] || 'Chưa có giao dịch'}</span><span className={`staff-payment ${verified ? 'verified' : 'unverified'}`}>{verified ? 'Đã xác minh' : 'Chưa xác minh'}</span></div>
            <div className="staff-products">{(order.items || []).map((item, index) => <div className="staff-product-line" key={`${order.orderId}-${index}`}><div><strong>{item.productName}</strong><small>Size {item.size?.name || '—'}{item.toppings?.length ? ` · ${item.toppings.map(topping => topping.name).join(', ')}` : ''}</small></div><span>×{item.quantity}</span><b>{formatVndPrice(Number(item.lineTotal))}</b></div>)}</div>
            <footer className="staff-order-footer"><div><span>Tổng tiền</span><strong>{formatVndPrice(Number(order.totalAmount))}</strong></div>{nextStatus && <button className="button button-primary" type="button" disabled={!verified || busyOrder !== null} onClick={() => advance(order)}>{busyOrder === order.orderId ? 'Đang cập nhật…' : nextText} <Icon name="arrow" size={17}/></button>}</footer>
          </article>;
        })}</div>}
  </div>;
}
