import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from './page';
import { apiRequest } from '../components/store';

const mocks = vi.hoisted(() => ({
  store: {},
  clearCart: vi.fn(),
  startPayment: vi.fn(),
}));

vi.mock('../components/store', () => ({
  apiRequest: vi.fn(),
  useStore: () => mocks.store,
}));

vi.mock('../components/payment-panel', () => ({
  default: ({ orderId }) => (
    <div data-testid="payment-panel">Thanh toán đơn {orderId}</div>
  ),
  startPayment: mocks.startPayment,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

const cartItem = {
  key: '4:12:21',
  productId: 4,
  name: 'Matcha latte',
  unitPrice: 42000,
  quantity: 1,
  sizeOptionId: 12,
  sizeName: 'M',
  toppingOptionIds: [21],
  toppings: [{ id: 21, name: 'Trân châu' }],
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {
      hydrated: true,
      session: {
        accessToken: 'test-token',
        account: {
          fullName: 'Nguyễn Chí Thành',
          email: 'thanh@example.com',
        },
      },
      cart: [cartItem],
      cartCount: 1,
      cartTotal: 42000,
      clearCart: mocks.clearCart,
    };
  });

  afterEach(() => cleanup());

  it('creates an order, clears cart and links to its detail page', async () => {
    apiRequest.mockResolvedValue({
      orderId: 42,
      totalAmount: 42000,
      status: 'PENDING_PAYMENT',
    });
    mocks.startPayment.mockResolvedValue({ paymentId: 7 });

    render(<CheckoutPage />);

    fireEvent.click(
      screen.getByRole('button', { name: /Đặt hàng và thanh toán VNPay/ }),
    );

    await waitFor(() => expect(apiRequest).toHaveBeenCalledOnce());

    const [path, options] = apiRequest.mock.calls[0];
    expect(path).toBe('/orders');
    expect(options).toEqual(expect.objectContaining({
      method: 'POST',
      token: 'test-token',
    }));
    expect(JSON.parse(options.body)).toEqual({
      items: [{
        productId: 4,
        sizeOptionId: 12,
        toppingOptionIds: [21],
        quantity: 1,
      }],
    });

    expect(mocks.clearCart).toHaveBeenCalledOnce();
    expect(mocks.startPayment).toHaveBeenCalledWith(42, 'test-token');
    expect(await screen.findByText(/Đã tạo đơn/)).toBeInTheDocument();
    expect(screen.getByTestId('payment-panel')).toHaveTextContent('Thanh toán đơn 42');
    expect(screen.getByRole('link', { name: /Xem chi tiết đơn/ }))
      .toHaveAttribute('href', '/orders/42');
  });

  it('preserves checkout as the destination when login is required', () => {
    mocks.store = {
      ...mocks.store,
      session: null,
    };

    render(<CheckoutPage />);

    expect(screen.getByRole('heading', { name: 'Đăng nhập để đặt hàng' }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Đăng nhập để tiếp tục/ }))
      .toHaveAttribute('href', '/login?next=%2Fcheckout');
    expect(apiRequest).not.toHaveBeenCalled();
  });
});