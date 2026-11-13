'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest, useStore } from './store';
import { Icon } from './icons';

export default function AuthForm({ mode }) {
  const register = mode === 'register';
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { setSession } = useStore();
  const router = useRouter();
  const update = (name) => (e) => setForm((old) => ({ ...old, [name]: e.target.value }));

  async function submit(event) {
    event.preventDefault(); setError('');
    if (register && !form.fullName.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }
    if (register && form.password !== form.confirmPassword) { setError('Hai mật khẩu chưa trùng khớp.'); return; }
    setBusy(true);
    try {
      const body = register ? { ...form, fullName: form.fullName.trim() } : { email: form.email, password: form.password };
      const session = await apiRequest(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
      setSession(session);
      const destination = typeof window === 'undefined' ? '/' : new URLSearchParams(window.location.search).get('next');
      router.replace(destination && destination.startsWith('/') && !destination.startsWith('//') ? destination : '/');
      router.refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <section className="auth-page"><div className="auth-decor"><span className="eyebrow">— THE BREWLITE CLUB</span><h1>A better day<br/>starts <em>here.</em></h1><p>Chỉ một vài bước để đặt những ly đồ uống yêu thích, theo dõi đơn và tận hưởng nhiều hơn.</p><div className="auth-photo"><span>EVERY GOOD DAY DESERVES A GOOD CUP.</span></div></div>
    <div className="auth-card"><span className="eyebrow">{register ? 'JOIN THE CLUB' : 'WELCOME BACK'}</span><h2>{register ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</h2><p className="auth-subtitle">{register ? 'Bắt đầu hành trình vị giác của bạn cùng BrewLite.' : 'Đăng nhập để lưu lại những khoảnh khắc thật ngon.'}</p>
      <form onSubmit={submit} className="auth-form">{register && <label>Họ và tên<input value={form.fullName} onChange={update('fullName')} placeholder="Nguyễn Văn A" autoComplete="name" required maxLength={120}/></label>}
        <label>Địa chỉ email<input type="email" value={form.email} onChange={update('email')} placeholder="ban@example.com" autoComplete="email" required/></label>
        <label>Mật khẩu<input type="password" value={form.password} onChange={update('password')} placeholder="Tối thiểu 8 ký tự" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required/></label>
        {register && <label>Xác nhận mật khẩu<input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Nhập lại mật khẩu" autoComplete="new-password" minLength={8} required/></label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary auth-submit" disabled={busy} type="submit">{busy ? 'Đang xử lý...' : register ? 'Đăng ký tài khoản' : 'Đăng nhập'} <Icon name="arrow" size={19}/></button>
      </form><p className="auth-switch">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <Link href={register ? '/login' : '/register'}>{register ? 'Đăng nhập' : 'Đăng ký ngay'}</Link></p><p className="auth-security"><Icon name="shield" size={15}/> Tài khoản dành cho trải nghiệm BrewLite.</p>
    </div>
  </section>;
}
