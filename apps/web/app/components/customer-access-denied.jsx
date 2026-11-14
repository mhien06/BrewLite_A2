import Link from 'next/link';
import { Icon } from './icons';

export default function CustomerAccessDenied() {
  return <div className="section-container inner-page">
    <div className="state-box" role="alert">
      <h1>Không có quyền truy cập</h1>
      <p>Tài khoản Nhân viên hoặc Quản lý không thể sử dụng chức năng dành riêng cho khách hàng.</p>
      <Link className="button button-primary" href="/staff/orders">
        Đi tới Quản lý đơn <Icon name="arrow" size={18}/>
      </Link>
    </div>
  </div>;
}
