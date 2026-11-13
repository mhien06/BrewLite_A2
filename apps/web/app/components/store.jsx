'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

const StoreContext = createContext(null);
const CART_KEY = 'brewlite_a2_cart_v1';
const SESSION_KEY = 'brewlite_a2_session_v1';
const SESSION_EXPIRED_EVENT = 'brewlite:session-expired';

function getStored(key) {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.sessionStorage.getItem(key) || 'null'); } catch { return null; }
}

// Browser-only storage reads are hidden until hydration, avoiding SSR mismatch.
const subscribeHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = getStored(CART_KEY);
    return Array.isArray(saved) ? saved : [];
  });
  const [session, setSession] = useState(() => {
    const saved = getStored(SESSION_KEY);
    return saved?.accessToken && saved?.account ? saved : null;
  });
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated);

  useEffect(() => { if (hydrated) window.sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(SESSION_KEY);
  }, [session, hydrated]);

  useEffect(() => {
    if (!hydrated) return undefined;
    const expireSession = (event) => {
      const expiredToken = event.detail?.token;
      setSession((current) => {
        if (expiredToken && current?.accessToken !== expiredToken) return current;
        return null;
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, [hydrated]);

  const addToCart = useCallback((item) => {
    const optionKey = `${item.productId}:${item.sizeOptionId}:${[...(item.toppingOptionIds || [])].sort((a, b) => a - b).join('-')}`;
    setCart((current) => {
      const match = current.find((entry) => entry.key === optionKey);
      if (match) return current.map((entry) => entry.key === optionKey ? { ...entry, quantity: Math.min(99, entry.quantity + item.quantity) } : entry);
      return [...current, { ...item, key: optionKey }];
    });
  }, []);

  const updateQuantity = useCallback((key, quantity) => setCart((current) => current.map((item) => item.key === key ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) } : item)), []);
  const removeItem = useCallback((key) => setCart((current) => current.filter((item) => item.key !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const logout = useCallback(() => setSession(null), []);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
  const value = useMemo(() => ({ cart, session, hydrated, cartCount, cartTotal, addToCart, updateQuantity, removeItem, clearCart, setSession, logout }),
    [cart, session, hydrated, cartCount, cartTotal, addToCart, updateQuantity, removeItem, clearCart, logout]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export async function apiRequest(path, { token, ...options } = {}) {
  let response;
  try {
    response = await fetch(API_URL + path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch { throw new Error('Không thể kết nối máy chủ. Kiểm tra API ở cổng 3003.'); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body?.code || body?.error?.code;
    if (response.status === 401 && token && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
        detail: { token },
      }));
    }
    const messages = {
      AUTH_REQUIRED: 'Bạn cần đăng nhập để tiếp tục.',
      EMAIL_EXISTS: 'Email đã được sử dụng. Vui lòng đăng nhập.',
      INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
      PASSWORD_MISMATCH: 'Hai mật khẩu chưa trùng khớp.',
      INSUFFICIENT_STOCK: 'Một món trong giỏ không còn đủ số lượng.',
      INVALID_PRODUCT_OPTION: 'Tùy chọn sản phẩm không hợp lệ. Hãy chọn lại.',
      INVALID_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      ROLE_FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
      ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.',
      PAYMENT_NOT_CONFIGURED: 'Thanh toán VNPay chưa sẵn sàng. Vui lòng thử lại sau.',
      ORDER_NOT_PAYABLE: 'Đơn này không còn ở trạng thái chờ thanh toán.',
      PAYMENT_REVIEW_REQUIRED: 'Giao dịch đang cần kiểm tra. Vui lòng liên hệ cửa hàng.',
      ORDER_NOT_PAID: 'Đơn chưa thanh toán nên chưa thể bắt đầu xử lý.',
      PAYMENT_NOT_VERIFIED: 'Thanh toán chưa được hệ thống xác minh.',
      ORDER_TERMINAL: 'Đơn đã hoàn tất',
      INVALID_ORDER_TRANSITION: 'Chỉ được chuyển đơn sang bước xử lý kế tiếp.',
      ORDER_STATUS_CONFLICT: 'Đơn vừa được người khác cập nhật. Hãy tải lại danh sách.',
      ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
      ROLE_FORBIDDEN: 'Tài khoản không có quyền thực hiện thao tác này.',
      AUTH_REQUIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
    const statusMessages = {
      401: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
      403: 'Bạn không có quyền thực hiện thao tác này.',
      404: 'Không tìm thấy dữ liệu yêu cầu.',
      409: 'Thao tác không thể thực hiện ở trạng thái hiện tại.',
      503: 'Dịch vụ hiện chưa sẵn sàng. Vui lòng thử lại sau.',
    };
    throw new Error(messages[code] || statusMessages[response.status] ||
      (typeof body.message === 'string' ? body.message : 'Có lỗi xảy ra. Vui lòng thử lại.'));
  }
  return body;
}
