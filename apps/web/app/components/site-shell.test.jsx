import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SiteFooter, SiteHeader } from './site-shell';

const mocks = vi.hoisted(() => ({
  store: {},
  logout: vi.fn(),
}));

vi.mock('./store', () => ({
  useStore: () => mocks.store,
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock('./icons', () => ({
  Icon: ({ name }) => <span aria-hidden="true">{name}</span>,
}));

function makeSession(role) {
  return {
    accessToken: `${role.toLowerCase()}-token`,
    account: {
      fullName: 'Nguyễn Chí Thành',
      role,
    },
  };
}

function renderShell() {
  render(<><SiteHeader/><SiteFooter/></>);
}

describe('Site shell role navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.store = {
      hydrated: true,
      session: makeSession('CUSTOMER'),
      cartCount: 2,
      logout: mocks.logout,
    };
  });

  afterEach(() => cleanup());

  it('shows customer navigation and cart actions for CUSTOMER', () => {
    renderShell();

    expect(screen.getAllByRole('link', { name: 'Thực đơn' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Đơn hàng' }))
      .toHaveAttribute('href', '/orders');
    expect(screen.getByRole('link', { name: 'Giỏ hàng (2 sản phẩm)' }))
      .toHaveAttribute('href', '/cart');
    expect(screen.queryByRole('link', { name: 'Quản lý đơn' }))
      .not.toBeInTheDocument();
  });

  it.each(['STAFF', 'MANAGER'])(
    'shows only staff navigation and logout actions for %s',
    (role) => {
      mocks.store.session = makeSession(role);
      renderShell();

      expect(screen.getAllByRole('link', { name: 'Quản lý đơn' }))
        .toHaveLength(2);
      expect(screen.queryByRole('link', { name: 'Thực đơn' }))
        .not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Đơn hàng' }))
        .not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Giỏ hàng/ }))
        .not.toBeInTheDocument();

      const logoutButtons = screen.getAllByRole('button', { name: /Đăng xuất/ });
      expect(logoutButtons).toHaveLength(2);
      fireEvent.click(logoutButtons[1]);
      expect(mocks.logout).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ['CUSTOMER', false],
    ['STAFF', true],
    ['MANAGER', true],
  ])('opens the correct mobile menu for %s', (role, staff) => {
    mocks.store.session = makeSession(role);
    render(<SiteHeader/>);

    const toggle = screen.getByRole('button', { name: 'Mở menu' });
    const navigation = screen.getByRole('navigation', {
      name: 'Điều hướng chính',
    });

    expect(navigation).not.toHaveClass('open');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(navigation).toHaveClass('open');

    if (staff) {
      expect(screen.getByRole('link', { name: 'Quản lý đơn' }))
        .toHaveAttribute('href', '/staff/orders');
      expect(screen.queryByRole('link', { name: 'Đơn hàng' }))
        .not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('link', { name: 'Đơn hàng' }))
        .toHaveAttribute('href', '/orders');
      expect(screen.queryByRole('link', { name: 'Quản lý đơn' }))
        .not.toBeInTheDocument();
    }
  });
});
