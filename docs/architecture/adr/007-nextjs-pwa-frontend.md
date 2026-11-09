# ADR-007: Frontend Next.js mobile-first/PWA, chỉ làm giao diện, logic nghiệp vụ ở API

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-01 đến FR-03, FR-12, FR-13; NFR-05, NFR-06; QD-02, QD-03

## Bối cảnh
Ràng buộc công nghệ yêu cầu Next.js mobile-first/PWA. Khách chủ yếu dùng điện thoại, cần cài được như ứng dụng và có Return URL để nhận khách quay về từ VNPay Sandbox. Backend phải tự tính giá và xác minh thanh toán (không tin client).

## Quyết định
- Next.js (App Router) + React, giao diện thiết kế từ viewport 360 px, có Web App Manifest và service worker cơ bản (cache tài nguyên tĩnh, **không** cache API đơn hàng/thanh toán).
- Web App **không chứa nghiệp vụ**: giá tạm tính chỉ để hiển thị; tạo đơn, tính lại giá, tồn kho và trạng thái thanh toán do API quyết định.
- Giao tiếp với API bằng REST/JSON qua HTTPS, kèm JWT trong header `Authorization: Bearer`.
- Trang Return URL chỉ là một route hiển thị của Web App (hiển thị **Thành công / Thất bại / Đang xác minh**); cách trang này xác định trạng thái (gọi `GET /orders/{id}/payment-status`, không tin tham số trên URL) được quyết định chi tiết ở ADR-005.

## Phương án đã cân nhắc
- **SPA thuần (Vite + React):** đơn giản hơn nhưng không đáp ứng ràng buộc Next.js đã chốt.
- **Đặt logic nghiệp vụ trong route handler của Next.js (BFF dày):** nhân đôi nơi chứa nghiệp vụ với NestJS, dễ lệch quy tắc giá/tồn kho.

## Hệ quả
- **Ưu điểm:** một nơi duy nhất quyết định nghiệp vụ; PWA cài được; luồng Return URL an toàn.
- **Hạn chế:** mỗi thao tác cần một lần gọi API (cần loading/error rõ, NFR-06); không dùng được offline cho thao tác đặt đơn/thanh toán.
- **Đánh đổi:** nghiệp vụ tập trung ở API (an toàn, nhất quán) nên giao diện phụ thuộc mạng cho mọi thao tác quan trọng.
