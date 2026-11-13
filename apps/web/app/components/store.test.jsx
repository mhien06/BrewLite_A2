import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, StoreProvider, useStore } from './store';

function SessionState() {
  const { session } = useStore();
  return <span>{session ? 'Đã đăng nhập' : 'Chưa đăng nhập'}</span>;
}

describe('Store authentication and API errors', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('clears the persisted session and updates UI after an invalid token response', async () => {
    window.sessionStorage.setItem('brewlite_a2_session_v1', JSON.stringify({
      accessToken: 'expired-token',
      account: { id: 1, fullName: 'Thành' },
    }));

    render(<StoreProvider><SessionState /></StoreProvider>);
    expect(screen.getByText('Đã đăng nhập')).toBeInTheDocument();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: 'INVALID_TOKEN' }),
    }));

    let error;
    await act(async () => {
      try {
        await apiRequest('/orders', { token: 'expired-token' });
      } catch (exception) {
        error = exception;
      }
    });

    expect(error).toHaveProperty(
      'message',
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    );
    expect(screen.getByText('Chưa đăng nhập')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('brewlite_a2_session_v1')).toBeNull();
  });

  it.each([
    [401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập để tiếp tục.'],
    [403, 'ROLE_FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
    [404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.'],
    [409, 'ORDER_NOT_PAYABLE', 'Đơn này không còn ở trạng thái chờ thanh toán.'],
    [409, 'PAYMENT_REVIEW_REQUIRED', 'Giao dịch đang cần kiểm tra. Vui lòng liên hệ cửa hàng.'],
    [503, 'PAYMENT_NOT_CONFIGURED', 'Thanh toán VNPay chưa sẵn sàng. Vui lòng thử lại sau.'],
  ])('maps HTTP %i code %s to a Vietnamese message', async (status, code, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ code }),
    }));

    await expect(apiRequest('/test')).rejects.toThrow(message);
  });
});