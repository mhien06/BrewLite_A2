import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PaymentPanel from './payment-panel';
import PaymentReturnPage from '../payment/return/page';
import { apiRequest } from './store';

vi.mock('./store', () => ({
  useStore: () => ({ hydrated: true, session: { accessToken: 'test-token' } }),
  apiRequest: vi.fn(),
}));
vi.mock('next/link', () => ({ default: ({ children, ...props }) => <a {...props}>{children}</a> }));

const pending = {
  orderId: 12, orderStatus: 'PENDING_PAYMENT', canRetry: false, canPay: false, needsReview: false,
  payment: { status: 'PENDING', expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?test=1' },
};

describe('Payment UI trusts database status', () => {
  beforeEach(() => { vi.clearAllMocks(); window.sessionStorage.clear(); });
  afterEach(() => { cleanup(); });

  it('continues a live attempt but does not offer a second attempt', async () => {
    apiRequest.mockResolvedValue(pending);
    render(<PaymentPanel orderId={12}/>);
    expect(await screen.findByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveAttribute('href', pending.payment.paymentUrl);
    expect(screen.queryByRole('button', { name: 'Thanh toán lại' })).not.toBeInTheDocument();
  });

  it('hides expired URL while result remains unresolved', async () => {
    apiRequest.mockResolvedValue({ ...pending, payment: { ...pending.payment, expiresAt: new Date(Date.now() - 1000).toISOString() } });
    render(<PaymentPanel orderId={12}/>);
    expect(await screen.findByText('Đang chờ xác minh')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tiếp tục thanh toán' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thanh toán lại' })).not.toBeInTheDocument();
  });

  it('allows retry only after a verified terminal failure', async () => {
    window.sessionStorage.setItem('brewlite_a2_payment_12', 'old-attempt-key');
    apiRequest.mockResolvedValue({ ...pending, canRetry: true, payment: { ...pending.payment, status: 'EXPIRED', paymentUrl: null } });
    render(<PaymentPanel orderId={12}/>);
    expect(await screen.findByRole('button', { name: 'Thanh toán lại' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('brewlite_a2_payment_12')).toBeNull();
  });

  it('Return URL success parameters cannot render a success when DB is pending', async () => {
    apiRequest.mockResolvedValue(pending);
    const page = await PaymentReturnPage({ searchParams: Promise.resolve({ orderId: '12', vnp_ResponseCode: '00', vnp_TransactionStatus: '00' }) });
    render(page);
    expect(await screen.findByText('Đang chờ xác minh')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tiếp tục thanh toán' })).not.toBeInTheDocument();
    expect(screen.queryByText('Thanh toán thành công')).not.toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/orders/12/payment-status', expect.objectContaining({ token: 'test-token' }));
  });

  it('renders verified success and refreshes the order list', async () => {
    apiRequest.mockResolvedValue({ ...pending, orderStatus: 'PAID', payment: { ...pending.payment, status: 'SUCCESS', paymentUrl: null } });
    const onSettled = vi.fn();
    render(<PaymentPanel orderId={12} onSettled={onSettled}/>);
    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(onSettled).toHaveBeenCalledOnce();
  });

  it('recovers from a status request error', async () => {
    apiRequest.mockRejectedValueOnce(new Error('Mất kết nối')).mockResolvedValue(pending);
    render(<PaymentPanel orderId={12}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(await screen.findByText('Đang chờ thanh toán')).toBeInTheDocument();
  });
});
