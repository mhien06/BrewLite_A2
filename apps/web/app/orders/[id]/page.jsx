'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatVndPrice } from '../../catalog.mjs';
import { Icon } from '../../components/icons';
import PaymentPanel from '../../components/payment-panel';
import { apiRequest, useStore } from '../../components/store';

const labels = {
  PENDING_PAYMENT: ['Chờ thanh toán', 'pending'],
  PAID: ['Đã thanh toán', 'success'],
  CONFIRMED: ['Đã xác nhận', 'success'],
  PREPARING: ['Đang pha chế', 'progress'],
  READY_FOR_PICKUP: ['Sẵn sàng nhận', 'success'],
  COMPLETED: ['Hoàn tất', 'success'],
  CANCELLED: ['Đã hủy', 'cancelled'],
  EXPIRED: ['Hết hạn', 'cancelled'],
};

function humanDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? 'Chưa rõ thời gian'
    : new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}

export default function OrderDetailPage() {
  const params = useParams();
  const rawId = typeof params?.id === 'string' ? params.id : '';
  const parsedId = Number(rawId);
  const orderId = /^\d+$/.test(rawId) && Number.isSafeInteger(parsedId) && parsedId > 0
    ? parsedId
    : null;

  const { session, hydrated } = useStore();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loadedOrderId, setLoadedOrderId] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const refreshOrder = useCallback(() => {
    setOrder(null);
    setError('');
    setLoadedOrderId(null);
    setRefresh(value => value + 1);
  }, []);

  useEffect(() => {
    if (!hydrated || !session || !orderId) return;

    let ignore = false;

    apiRequest(`/orders/${orderId}`, {
      token: session.accessToken,
      cache: 'no-store',
    })
      .then(data => {
        if (!ignore) {
          setOrder(data);
          setError('');
          setLoadedOrderId(orderId);
        }
      })
      .catch(exception => {
        if (!ignore) {
          setOrder(null);
          setError(
            exception instanceof Error
              ? exception.message
              : 'Không thể tải chi tiết đơn hàng.',
          );
          setLoadedOrderId(orderId);
        }
      });

    return () => {
      ignore = true;
    };
  }, [hydrated, session, orderId, refresh]);

  if (!hydrated) {
    return <div className="section-container inner-page">
      <div className="state-box" role="status">Đang tải tài khoản…</div>
    </div>;
  }

  if (!orderId) {
    return <div className="section-container inner-page">
      <div className="state-box" role="alert">
        <h1>Mã đơn không hợp lệ</h1>
        <Link className="button button-primary" href="/orders">Về lịch sử đơn</Link>
      </div>
    </div>;
  }

  if (!session) {
    const next = encodeURIComponent(`/orders/${orderId}`);
    return <div className="section-container inner-page">
      <div className="empty-cart">
        <span className="empty-illustration"><Icon name="user" size={42} /></span>
        <h1>Đăng nhập để xem đơn</h1>
        <p>Chỉ chủ đơn mới có thể xem thông tin và trạng thái thanh toán.</p>
        <Link className="button button-primary" href={`/login?next=${next}`}>
          Đăng nhập <Icon name="arrow" size={18} />
        </Link>
      </div>
    </div>;
  }

  if (loadedOrderId !== orderId) {
    return <div className="section-container inner-page">
      <div className="state-box" role="status">Đang tải chi tiết đơn hàng…</div>
    </div>;
  }

  if (error) {
    return <div className="section-container inner-page order-detail-shell">
      <div className="state-box" role="alert">
        <h1>Không thể tải đơn hàng</h1>
        <p>{error}</p>
        <div className="success-actions">
          <button className="button button-primary" type="button" onClick={refreshOrder}>
            Thử lại
          </button>
          <Link className="button button-outline" href="/orders">Về lịch sử đơn</Link>
        </div>
      </div>
    </div>;
  }

  if (!order) {
    return <div className="section-container inner-page">
      <div className="state-box" role="status">Đang tải chi tiết đơn hàng…</div>
    </div>;
  }

  const [label, statusClass] = labels[order.status] || [
    order.status || 'Chưa rõ',
    'pending',
  ];

  return <div className="section-container inner-page order-detail-shell">
    <div className="breadcrumbs">
      <Link href="/">Trang chủ</Link>
      <span>/</span>
      <Link href="/orders">Đơn hàng</Link>
      <span>/</span>
      <strong>#{order.orderId}</strong>
    </div>

    <div className="inner-heading">
      <span className="eyebrow">— ORDER DETAILS</span>
      <h1>Chi tiết <em>đơn #{order.orderId}.</em></h1>
      <p>Thông tin món, tổng tiền và trạng thái thanh toán đã được xác minh từ hệ thống.</p>
    </div>

    <article className="order-card order-detail-card">
      <div className="order-card-header">
        <div>
          <span className="eyebrow">BREWLITE ORDER</span>
          <h2>Đơn hàng #{order.orderId}</h2>
          <p><Icon name="clock" size={15} /> {humanDate(order.createdAt)}</p>
        </div>
        <span className={`order-status ${statusClass}`}>
          <span className="status-signal" />
          {label}
        </span>
      </div>

      <section className="order-products" aria-labelledby="order-items-heading">
        <h2 id="order-items-heading" className="order-section-title">Món đã đặt</h2>
        {(order.items || []).map((item, index) => (
          <div key={`${order.orderId}-${item.productId}-${index}`} className="order-product-line">
            <div>
              <strong>{item.productName}</strong>
              <small>
                Size {item.size?.name || '—'}
                {item.toppings?.length
                  ? ` · ${item.toppings.map(topping => topping.name).join(', ')}`
                  : ''}
              </small>
              <small>
                {formatVndPrice(Number(item.unitPrice))} × {item.quantity}
              </small>
            </div>
            <span className="order-line-price">
              {formatVndPrice(Number(item.lineTotal))}
            </span>
          </div>
        ))}
      </section>

      <div className="order-money-summary" aria-label="Tổng tiền đơn hàng">
        <div><span>Tạm tính</span><strong>{formatVndPrice(Number(order.subtotal))}</strong></div>
        <div><span>Giảm giá</span><strong>{formatVndPrice(Number(order.discountAmount))}</strong></div>
        <div className="order-money-total">
          <span>Tổng cộng</span>
          <strong>{formatVndPrice(Number(order.totalAmount))}</strong>
        </div>
      </div>

      <PaymentPanel
        orderId={order.orderId}
        onSettled={order.status === 'PENDING_PAYMENT' ? refreshOrder : undefined}
      />

      <div className="order-detail-navigation">
        <Link className="button button-outline" href="/orders">← Về lịch sử đơn</Link>
      </div>
    </article>
  </div>;
}
