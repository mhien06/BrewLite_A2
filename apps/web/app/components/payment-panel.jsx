'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest, useStore } from './store';

export async function startPayment(orderId, token) {
  const storageKey = `brewlite_a2_payment_${orderId}`;
  // Giữ cùng khóa nếu request bị mất mạng, tránh tạo attempt mới khi bấm lại.
  let idempotencyKey = window.sessionStorage.getItem(storageKey);
  if (!idempotencyKey) {
    idempotencyKey = crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, idempotencyKey);
  }
  const payment = await apiRequest(`/orders/${orderId}/payments`, {
    method: 'POST', token, body: JSON.stringify({ idempotencyKey }),
  });
  if (payment.paymentUrl) window.location.assign(payment.paymentUrl);
  return payment;
}

const labels = {
  PENDING: 'Đang chờ thanh toán', UNKNOWN: 'Đang chờ xác minh',
  SUCCESS: 'Thanh toán thành công', FAILED: 'Thanh toán không thành công', EXPIRED: 'Lượt thanh toán đã hết hạn',
};

export default function PaymentPanel({ orderId, onSettled, returnedFromGateway = false }) {
  const { session, hydrated } = useStore();
  const token = session?.accessToken;
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!hydrated || !token) return;
    let stopped = false;
    let timer;
    async function load() {
      try {
        const data = await apiRequest(`/orders/${orderId}/payment-status`, { token, cache: 'no-store' });
        if (stopped) return;
        setResult(data); setError(''); setNow(Date.now());
        if (data.canRetry) window.sessionStorage.removeItem(`brewlite_a2_payment_${orderId}`);
        if (data.payment?.status === 'SUCCESS' && onSettled) onSettled();
        if (['PENDING', 'UNKNOWN'].includes(data.payment?.status)) timer = setTimeout(load, 5000);
      } catch (exception) {
        if (!stopped) setError(exception.message);
      }
    }
    void load();
    return () => { stopped = true; clearTimeout(timer); };
  }, [orderId, token, hydrated, refresh, onSettled]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function pay() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await startPayment(orderId, session.accessToken);
      setRefresh(value => value + 1);
    } catch (exception) { setError(exception.message); }
    finally { setBusy(false); }
  }

  if (!hydrated) return <p role="status">Đang tải tài khoản…</p>;
  if (!session) return <p>Đăng nhập để xem kết quả đã xác minh. <Link className="subtle-link" href={`/login?next=${encodeURIComponent(`/payment/return?orderId=${orderId}`)}`}>Đăng nhập</Link></p>;
  const payment = result?.payment;
  const remaining = payment ? Math.max(0, Math.ceil((new Date(payment.expiresAt).getTime() - now) / 1000)) : 0;
  const waiting = payment && ['PENDING', 'UNKNOWN'].includes(payment.status) && (returnedFromGateway || remaining === 0 || payment.awaitingVerification);
  const canContinue = payment?.paymentUrl && remaining > 0 && !result?.needsReview && !returnedFromGateway;

  return <section className="payment-panel" aria-label={`Thanh toán đơn ${orderId}`}>
    <p role="status" aria-live="polite"><strong>{result?.needsReview ? 'Giao dịch cần được kiểm tra' : waiting ? 'Đang chờ xác minh' : payment ? labels[payment.status] : result ? 'Đơn chưa thanh toán' : 'Đang tải trạng thái…'}</strong></p>
    {result?.needsReview && <p>Hệ thống đã ghi nhận giao dịch cần kiểm tra. Vui lòng liên hệ cửa hàng; chưa có xác nhận hoàn tiền.</p>}
    {waiting && <p>BrewLite chưa nhận được kết quả đã xác minh từ VNPay. Nếu bạn đã thanh toán hoặc hủy trên VNPay, vui lòng chờ xác minh và không thanh toán thêm lần nữa.</p>}
    {canContinue && <p>Thời gian còn lại: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="payment-actions">
      {(result?.canPay || result?.canRetry) && <button className="button button-primary" disabled={busy} onClick={pay}>{busy ? 'Đang mở VNPay…' : result.canRetry ? 'Thanh toán lại' : 'Thanh toán VNPay'}</button>}
      {canContinue && <a className="button button-primary" href={payment.paymentUrl}>Tiếp tục thanh toán</a>}
      <button className="button button-outline" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Kiểm tra trạng thái</button>
    </div>
  </section>;
}
