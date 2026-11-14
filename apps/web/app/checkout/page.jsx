'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatVndPrice } from '../catalog.mjs';
import CustomerAccessDenied from '../components/customer-access-denied';
import { Icon } from '../components/icons';
import { isStaffSession } from '../components/role-access';
import { apiRequest, useStore } from '../components/store';
import PaymentPanel, { startPayment } from '../components/payment-panel';

export default function CheckoutPage() {
  const { cart, cartCount, cartTotal, hydrated, session, clearCart } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  async function createOrder() {
    if (!session || !cart.length || loading || created) return;
    setError(''); setLoading(true);
    try {
      const items = cart.map(({ productId, sizeOptionId, toppingOptionIds, quantity }) => ({
        productId: Number(productId), sizeOptionId: Number(sizeOptionId),
        toppingOptionIds: (toppingOptionIds || []).map(Number), quantity: Number(quantity),
      }));
      const order = await apiRequest('/orders', { method: 'POST', token: session.accessToken, body: JSON.stringify({ items }) });
      setCreated(order);
      clearCart();
      await startPayment(order.orderId, session.accessToken);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể tạo đơn. Vui lòng thử lại.');
    } finally { setLoading(false); }
  }

  if (!hydrated) return <div className="section-container inner-page"><div className="state-box" role="status">Đang kiểm tra đơn hàng…</div></div>;
  if (isStaffSession(session)) return <CustomerAccessDenied />;
  if (created) return <div className="section-container inner-page"><div className="checkout-success">
    <div className="success-icon"><Icon name="check" size={38} /></div><span className="eyebrow">ORDER RECEIVED</span>
    <h1>Đã tạo đơn <em>thành công!</em></h1>
    <p>Đơn <strong>#{created.orderId}</strong> đã được ghi nhận với trạng thái <strong>chờ thanh toán</strong>.</p>
    <div className="order-confirmation"><span>Tổng tiền từ hệ thống</span><strong>{formatVndPrice(Number(created.totalAmount))}</strong></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <PaymentPanel orderId={created.orderId}/>
    <div className="success-actions"><Link className="button button-primary" href={`/orders/${created.orderId}`}>Xem chi tiết đơn <Icon name="arrow" size={19}/></Link><Link className="button button-outline" href="/#menu">Tiếp tục chọn món</Link></div>
  </div></div>;
  if (!session) return <div className="section-container inner-page"><div className="empty-cart"><span className="empty-illustration"><Icon name="user" size={42}/></span><h1>Đăng nhập để đặt hàng</h1><p>BrewLite cần xác nhận tài khoản trước khi tạo đơn.</p><Link className="button button-primary" href="/login?next=%2Fcheckout">Đăng nhập để tiếp tục <Icon name="arrow" size={19}/></Link><Link className="subtle-link" href="/register?next=%2Fcheckout">Chưa có tài khoản? Đăng ký</Link></div></div>;
  if (!cart.length) return <div className="section-container inner-page"><div className="empty-cart"><span className="empty-illustration"><Icon name="bag" size={44}/></span><h1>Chưa có món để đặt</h1><p>Chọn một món trong thực đơn trước khi đặt đơn nhé.</p><Link className="button button-primary" href="/#menu">Khám phá thực đơn <Icon name="arrow" size={19}/></Link></div></div>;

  return <div className="section-container inner-page"><div className="breadcrumbs"><Link href="/">Trang chủ</Link><span>/</span><Link href="/cart">Giỏ hàng</Link><span>/</span><strong>Đặt hàng</strong></div>
    <div className="inner-heading"><span className="eyebrow">— ALMOST THERE</span><h1>Kiểm tra <em>đơn hàng.</em></h1><p>Thông tin sản phẩm được xác nhận lại trên máy chủ khi bạn tạo đơn.</p></div>
    <div className="cart-layout"><section className="checkout-panel"><h2>01. Thông tin khách hàng</h2><div className="customer-summary"><span className="customer-avatar"><Icon name="user" size={23}/></span><div><strong>{session.account.fullName}</strong><p>{session.account.email}</p></div><Link href="/login">Đổi tài khoản</Link></div>
      <h2>02. Món đã chọn <span className="muted-count">({cartCount} ly)</span></h2><div className="checkout-lines">{cart.map((item) => <div className="checkout-line" key={item.key}><div><strong>{item.name} <span>×{item.quantity}</span></strong><small>Size {item.sizeName}{item.toppings?.length ? ` · ${item.toppings.map(t => t.name).join(', ')}` : ''}</small></div><b>{formatVndPrice(Number(item.unitPrice) * item.quantity)}</b></div>)}</div>
      <div className="notice-card"><Icon name="clock" size={21}/><p>Bạn sẽ được chuyển đến VNPay Sandbox. Mỗi lượt thanh toán có thời hạn 15 phút; kết quả được hệ thống xác minh trước khi xác nhận đơn.</p></div>
    </section><aside className="summary-card"><span className="eyebrow">YOUR CHECKOUT</span><h2>Tổng kết</h2><div className="summary-row"><span>Tạm tính tại giỏ</span><strong>{formatVndPrice(cartTotal)}</strong></div><div className="summary-row"><span>Phí dịch vụ</span><strong>0đ</strong></div><div className="summary-divider"/><div className="summary-row summary-total"><span>Ước tính</span><strong>{formatVndPrice(cartTotal)}</strong></div>
      <p className="summary-footnote"><Icon name="shield" size={16}/> Giá và tồn kho cuối cùng do API quyết định.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <button className="button button-primary full-width" type="button" disabled={loading} onClick={createOrder}>{loading ? 'Đang xử lý…' : 'Đặt hàng và thanh toán VNPay'} <Icon name="arrow" size={18}/></button>
      <Link className="subtle-link centered" href="/cart">← Quay lại giỏ hàng</Link>
    </aside></div>
  </div>;
}
