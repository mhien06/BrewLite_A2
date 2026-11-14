import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthForm from './auth-form';
import { apiRequest } from './store';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock('./store', () => ({
  apiRequest: vi.fn(),
  useStore: () => ({ setSession: mocks.setSession }),
}));

function fillRegistration({ fullName }) {
  fireEvent.change(screen.getByLabelText('Họ và tên'), {
    target: { value: fullName },
  });
  fireEvent.change(screen.getByLabelText('Địa chỉ email'), {
    target: { value: 'thanh@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
    target: { value: 'password123' },
  });
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText('Địa chỉ email'), {
    target: { value: 'thanh@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), {
    target: { value: 'password123' },
  });
}

describe('AuthForm registration validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/register');
  });

  afterEach(() => cleanup());

  it('rejects a full name containing only whitespace without calling the API', () => {
    render(<AuthForm mode="register" />);
    fillRegistration({ fullName: '     ' });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập họ và tên.');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('trims a valid full name before registration', async () => {
    const session = {
      accessToken: 'test-token',
      account: { id: 1, fullName: 'Nguyễn Chí Thành' },
    };
    apiRequest.mockResolvedValue(session);

    render(<AuthForm mode="register" />);
    fillRegistration({ fullName: '  Nguyễn Chí Thành  ' });

    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/ }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledOnce());
    const [, options] = apiRequest.mock.calls[0];
    expect(JSON.parse(options.body).fullName).toBe('Nguyễn Chí Thành');
    expect(mocks.setSession).toHaveBeenCalledWith(session);
    expect(mocks.replace).toHaveBeenCalledWith('/');
  });

  it.each([
    ["CUSTOMER", "/login?next=%2Fcheckout", "/checkout"],
    ["CUSTOMER", "/login?next=%2Fstaff%2Forders", "/"],
    ["STAFF", "/login?next=%2Fcheckout", "/staff/orders"],
    ["MANAGER", "/login?next=%2Forders", "/staff/orders"],
  ])("redirects %s from %s to %s", async (role, location, expected) => {
    window.history.replaceState({}, "", location);
    const session = {
      accessToken: "test-token",
      account: { id: 1, fullName: "Nguyễn Chí Thành", role },
    };
    apiRequest.mockResolvedValue(session);

    render(<AuthForm mode="login" />);
    fillLogin();
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith(expected);
    });
    expect(mocks.setSession).toHaveBeenCalledWith(session);
  });
});