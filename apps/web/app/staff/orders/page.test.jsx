import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StaffOrdersPage from './page';
import { apiRequest } from '../../components/store';

const storeState = vi.hoisted(() => ({ hydrated: true, session: null }));

vi.mock('../../components/store', () => ({
  useStore: () => storeState,
  apiRequest: vi.fn(),
}));
vi.mock('next/link', () => ({ default: ({ children, ...props }) => <a {...props}>{children}</a> }));

const paidOrder = {
  orderId: 41, status: 'PAID', customerName: 'Nguyễn An', createdAt: '2026-11-13T08:00:00Z',
  totalAmount: 42000, paymentStatus: 'SUCCESS', paymentVerified: true,
  items: [{ productName: 'Bạc xỉu', quantity: 1, size: { name: 'M' }, toppings: [], lineTotal: 42000 }],
};

describe('staff order page', () => {
  beforeEach(() => { vi.clearAllMocks(); storeState.session = null; vi.stubGlobal('confirm', vi.fn(() => true)); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('asks unauthenticated users to log in and does not call the staff API', () => {
    render(<StaffOrdersPage/>);
    expect(screen.getByRole('link', { name: /Đăng nhập/ })).toHaveAttribute('href', '/login?next=%2Fstaff%2Forders');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('denies customer role in the UI before requesting protected orders', () => {
    storeState.session = { accessToken: 'customer-token', account: { role: 'CUSTOMER' } };
    render(<StaffOrdersPage/>);
    expect(screen.getByText(/chỉ dành cho Nhân viên quầy và Quản lý cửa hàng/i)).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('shows payment status separately and confirms the next processing step', async () => {
    storeState.session = { accessToken: 'staff-token', account: { role: 'STAFF' } };
    apiRequest.mockResolvedValueOnce([paidOrder]).mockResolvedValueOnce({ orderId: 41, status: 'PREPARING' }).mockResolvedValueOnce([{ ...paidOrder, status: 'PREPARING' }]);
    render(<StaffOrdersPage/>);
    expect(await screen.findByText('Đã xác minh thành công')).toBeInTheDocument();
    expect(screen.getByText('Đã thanh toán · chờ pha chế')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu pha chế/ }));
    expect(window.confirm).toHaveBeenCalledWith('Xác nhận “Bắt đầu pha chế” cho đơn #41?');
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/staff/orders/41/status', expect.objectContaining({ method: 'PATCH', token: 'staff-token', body: JSON.stringify({ status: 'PREPARING' }) })));
    expect(await screen.findByText('Đã cập nhật đơn #41: Đang pha chế.')).toBeInTheDocument();
  });

  it('does not send a status update when confirmation is declined', async () => {
    storeState.session = { accessToken: 'manager-token', account: { role: 'MANAGER' } };
    vi.stubGlobal('confirm', vi.fn(() => false));
    apiRequest.mockResolvedValue([paidOrder]);
    render(<StaffOrdersPage/>);
    fireEvent.click(await screen.findByRole('button', { name: /Bắt đầu pha chế/ }));
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps unpaid orders visible but disables preparation', async () => {
    storeState.session = { accessToken: 'staff-token', account: { role: 'STAFF' } };
    apiRequest.mockResolvedValue([{ ...paidOrder, status: 'PENDING_PAYMENT', paymentStatus: 'PENDING', paymentVerified: false }]);
    render(<StaffOrdersPage/>);
    expect(await screen.findByText('Chưa xác minh')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bắt đầu pha chế/ })).not.toBeInTheDocument();
  });
});
