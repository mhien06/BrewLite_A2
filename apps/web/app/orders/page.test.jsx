import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OrdersPage from './page';
import { apiRequest } from '../components/store';

const mocks = vi.hoisted(() => ({
  store: {},
}));

vi.mock('../components/store', () => ({
  apiRequest: vi.fn(),
  useStore: () => mocks.store,
}));

vi.mock('../components/payment-panel', () => ({
  default: ({ orderId }) => (
    <div data-testid={`payment-panel-${orderId}`}>Thanh toán đơn {orderId}</div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

const order = {
  orderId: 42,
  status: 'PENDING_PAYMENT',
  totalAmount: 42000,
  createdAt: '2026-11-13T12:00:00.000Z',
  items: [{
    productId: 4,
    productName: 'Matcha latte',
    quantity: 1,
    size: { id: 12, name: 'M' },
    toppings: [{ id: 21, name: 'Trân châu' }],
  }],
};

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {
      hydrated: true,
      session: {
        accessToken: 'test-token',
        account: { role: 'CUSTOMER' },
      },
    };
  });

  afterEach(() => cleanup());

  it('loads order history and links every card to its detail page', async () => {
    apiRequest.mockResolvedValue([order]);

    render(<OrdersPage />);

    expect(await screen.findByRole('heading', { name: 'Đơn hàng #42' }))
      .toBeInTheDocument();
    expect(screen.getByText('Matcha latte')).toBeInTheDocument();
    expect(screen.getByText(/Size M · Trân châu/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem chi tiết/ }))
      .toHaveAttribute('href', '/orders/42');
    expect(screen.getByTestId('payment-panel-42'))
      .toHaveTextContent('Thanh toán đơn 42');
    expect(apiRequest).toHaveBeenCalledWith('/orders', {
      token: 'test-token',
    });
  });

  it('requires login before loading order history', () => {
    mocks.store = {
      hydrated: true,
      session: null,
    };

    render(<OrdersPage />);

    expect(screen.getByRole('link', { name: /Đăng nhập/ }))
      .toHaveAttribute('href', '/login?next=%2Forders');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it.each(['STAFF', 'MANAGER'])(
    'denies direct personal order history access for %s',
    (role) => {
      mocks.store = {
        hydrated: true,
        session: {
          accessToken: `${role.toLowerCase()}-token`,
          account: { role },
        },
      };

      render(<OrdersPage />);

      expect(screen.getByRole('alert'))
        .toHaveTextContent('Không có quyền truy cập');
      expect(screen.getByRole('link', { name: /Quản lý đơn/ }))
        .toHaveAttribute('href', '/staff/orders');
      expect(apiRequest).not.toHaveBeenCalled();
    },
  );
});