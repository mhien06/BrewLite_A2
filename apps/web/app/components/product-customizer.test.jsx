import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductCustomizer from './product-customizer';

const mocks = vi.hoisted(() => ({
  addToCart: vi.fn(),
  session: null,
  hydrated: true,
}));

vi.mock('./store', () => ({
  useStore: () => ({
    addToCart: mocks.addToCart,
    session: mocks.session,
    hydrated: mocks.hydrated,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

const product = {
  id: 4,
  name: 'Matcha latte',
  imageUrl: '/products/matcha-latte.jpg',
  price: 29000,
  stock: 3,
};

const sizes = [
  { id: 11, name: 'S', surcharge: 0 },
  { id: 12, name: 'M', surcharge: 5000 },
];

const toppings = [
  { id: 21, name: 'Trân châu', surcharge: 8000 },
];

describe('ProductCustomizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = {
      accessToken: 'customer-token',
      account: { role: 'CUSTOMER' },
    };
    mocks.hydrated = true;
  });
  afterEach(() => cleanup());

  it('calculates selected options and adds the configured item to cart', () => {
    render(
      <ProductCustomizer
        product={product}
        sizes={sizes}
        toppings={toppings}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /M.*5\.000đ/ }));
    fireEvent.click(screen.getByLabelText(/Trân châu/));
    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng' }));

    expect(screen.getByText('84.000đ')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Thêm.*giỏ hàng/ }));

    expect(mocks.addToCart).toHaveBeenCalledWith(expect.objectContaining({
      productId: 4,
      name: 'Matcha latte',
      unitPrice: 42000,
      quantity: 2,
      sizeOptionId: 12,
      sizeName: 'M',
      toppingOptionIds: [21],
    }));
    expect(screen.getByRole('status')).toHaveTextContent('Đã thêm món vào giỏ');
    expect(screen.getByRole('link', { name: /Xem giỏ hàng/ }))
      .toHaveAttribute('href', '/cart');
  });

  it('does not allow adding a sold-out product', () => {
    render(
      <ProductCustomizer
        product={{ ...product, stock: 0 }}
        sizes={sizes}
        toppings={toppings}
      />,
    );

    expect(screen.getByText('Tạm hết hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm.*giỏ hàng/ })).toBeDisabled();
    expect(mocks.addToCart).not.toHaveBeenCalled();
  });

  it.each(['STAFF', 'MANAGER'])(
    'prevents %s from adding an item to cart',
    (role) => {
      mocks.session = {
        accessToken: `${role.toLowerCase()}-token`,
        account: { role },
      };

      render(
        <ProductCustomizer
          product={product}
          sizes={sizes}
          toppings={toppings}
        />,
      );

      const addButton = screen.getByRole('button', {
        name: /Thêm.*giỏ hàng/,
      });

      expect(addButton).toBeDisabled();
      fireEvent.click(addButton);

      expect(mocks.addToCart).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Tài khoản Nhân viên hoặc Quản lý chỉ có thể xem thực đơn.',
      );
      expect(
        screen.queryByRole('link', { name: /Xem giỏ hàng/ }),
      ).not.toBeInTheDocument();
    },
  );
});