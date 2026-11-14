import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrderDetailPage from './page';
import { apiRequest } from '../../components/store';

const mocks = vi.hoisted(() => ({
  params: { id: '12' },
  store: {
    hydrated: true,
    session: {
      accessToken: 'test-token',
      account: { role: 'CUSTOMER' },
    },
  },
}));

vi.mock('next/navigation', () => ({
  useParams: () => mocks.params,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock('../../components/store', () => ({
  apiRequest: vi.fn(),
  useStore: () => mocks.store,
}));

vi.mock('../../components/payment-panel', () => ({
  default: ({ orderId }) => (
    <div data-testid="payment-panel">Thanh toán đơn {orderId}</div>
  ),
}));

const order = {
  orderId: 12,
  status: 'PENDING_PAYMENT',
  subtotal: 42000,
  discountAmount: 0,
  totalAmount: 42000,
  createdAt: '2026-11-13T12:00:00.000Z',
  items: [{
    productId: 4,
    productName: 'Matcha latte',
    quantity: 2,
    size: { id: 1, name: 'M' },
    toppings: [{ id: 2, name: 'Trân châu' }],
    unitPrice: 21000,
    lineTotal: 42000,
  }],
};

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = { id: '12' };
    mocks.store = {
      hydrated: true,
      session: {
        accessToken: 'test-token',
        account: { role: 'CUSTOMER' },
      },
    };
  });

  afterEach(() => cleanup());

  it('loads and renders the order owned by the authenticated customer', async () => {
    apiRequest.mockResolvedValue(order);

    render(<OrderDetailPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải chi tiết đơn hàng');
    expect(await screen.findByRole('heading', { name: 'Đơn hàng #12' })).toBeInTheDocument();
    expect(screen.getByText('Matcha latte')).toBeInTheDocument();
    expect(screen.getByText(/Size M · Trân châu/)).toBeInTheDocument();
    expect(screen.getAllByText('42.000đ')).toHaveLength(3);
    expect(screen.getByTestId('payment-panel')).toHaveTextContent('Thanh toán đơn 12');
    expect(apiRequest).toHaveBeenCalledWith('/orders/12', {
      token: 'test-token',
      cache: 'no-store',
    });
  });

  it('requires login and preserves the order detail destination', () => {
    mocks.store = { hydrated: true, session: null };

    render(<OrderDetailPage />);

    expect(screen.getByRole('heading', { name: 'Đăng nhập để xem đơn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Đăng nhập/ }))
      .toHaveAttribute('href', '/login?next=%2Forders%2F12');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('rejects an invalid route id without calling the API', () => {
    mocks.params = { id: 'abc' };

    render(<OrderDetailPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Mã đơn không hợp lệ');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('retries after an order request error', async () => {
    apiRequest
      .mockRejectedValueOnce(new Error('Không tìm thấy đơn hàng.'))
      .mockResolvedValueOnce(order);

    render(<OrderDetailPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy đơn hàng.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Đơn hàng #12' })).toBeInTheDocument();
    });
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it.each(['STAFF', 'MANAGER'])(
    'denies direct personal order detail access for %s',
    (role) => {
      mocks.store = {
        hydrated: true,
        session: {
          accessToken: `${role.toLowerCase()}-token`,
          account: { role },
        },
      };

      render(<OrderDetailPage />);

      expect(screen.getByRole('alert'))
        .toHaveTextContent('Không có quyền truy cập');
      expect(screen.getByRole('link', { name: /Quản lý đơn/ }))
        .toHaveAttribute('href', '/staff/orders');
      expect(apiRequest).not.toHaveBeenCalled();
    },
  );
});