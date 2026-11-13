import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CartPage from './page';

const mocks = vi.hoisted(() => ({
  store: {},
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock('../components/store', () => ({
  useStore: () => mocks.store,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock('next/image', () => ({
  default: ({ alt }) => <span role="img" aria-label={alt} />,
}));

const cartItem = {
  key: '4:12:21',
  productId: 4,
  name: 'Matcha latte',
  imageUrl: '/products/matcha-latte.jpg',
  unitPrice: 32000,
  quantity: 2,
  sizeName: 'M',
  toppings: [{ id: 21, name: 'Trân châu' }],
};

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {
      hydrated: true,
      cart: [cartItem],
      cartTotal: 64000,
      updateQuantity: mocks.updateQuantity,
      removeItem: mocks.removeItem,
    };
  });

  afterEach(() => cleanup());

  it('renders cart totals and supports quantity and removal actions', () => {
    render(<CartPage />);

    expect(screen.getByRole('heading', { name: 'Matcha latte' })).toBeInTheDocument();
    expect(screen.getByText(/Size M · Trân châu/)).toBeInTheDocument();
    expect(screen.getAllByText('64.000đ')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Tiếp tục đặt hàng/ }))
      .toHaveAttribute('href', '/checkout');

    fireEvent.click(screen.getByRole('button', { name: 'Tăng Matcha latte' }));
    expect(mocks.updateQuantity).toHaveBeenCalledWith('4:12:21', 3);

    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(mocks.removeItem).toHaveBeenCalledWith('4:12:21');
  });

  it('renders the empty-cart state', () => {
    mocks.store = {
      ...mocks.store,
      cart: [],
      cartTotal: 0,
    };

    render(<CartPage />);

    expect(screen.getByRole('heading', { name: /Giỏ.*hàng đang trống/ }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Khám phá thực đơn/ }))
      .toHaveAttribute('href', '/#menu');
  });
});