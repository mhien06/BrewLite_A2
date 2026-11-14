import Link from 'next/link';
import PaymentPanel from '../../components/payment-panel';

export const metadata = { title: 'Kết quả thanh toán' };

export default async function PaymentReturnPage({ searchParams }) {
  const { orderId } = await searchParams;
  const validId = typeof orderId === 'string' && /^[1-9]\d{0,9}$/.test(orderId) && Number(orderId) <= 2147483647;
  // Chỉ dùng orderId để đọc API có JWT. Bỏ qua toàn bộ vnp_ResponseCode trên URL.
  return <div className="section-container inner-page"><div className="checkout-success">
    <span className="eyebrow">BREWLITE PAYMENT</span>
    <h1>Kết quả <em>thanh toán.</em></h1>
    {validId ? <><p>Đơn hàng #{orderId}</p><PaymentPanel orderId={Number(orderId)} returnedFromGateway/></> : <p>Không tìm thấy mã đơn hợp lệ. Vui lòng kiểm tra trong lịch sử đơn hàng.</p>}
    <div className="success-actions"><Link className="button button-outline" href="/orders">Lịch sử đơn hàng</Link></div>
  </div></div>;
}
