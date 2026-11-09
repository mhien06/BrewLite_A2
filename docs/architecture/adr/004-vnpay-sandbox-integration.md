# ADR-004: VNPay Sandbox là hệ thống thanh toán bên ngoài, tích hợp qua gọi API hướng ra ngoài ranh giới BrewLite

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-09; NFR-04; QD-01 đến QD-03; RR-04, RR-06
- **Phạm vi:** Mở rộng – Đề bài yêu cầu tối thiểu một dịch vụ thanh toán mô phỏng (có thể là mock nội bộ); nhóm chọn tích hợp VNPay Sandbox thực tế.

## Bối cảnh
BrewLite dùng VNPay Sandbox để mô phỏng thanh toán, không xử lý tiền thật. Cần chốt rõ ranh giới hệ thống: VNPay Sandbox không phải một phần của BrewLite, BrewLite không lưu hay xử lý dữ liệu thẻ/tài khoản thanh toán, mọi thao tác tiền (mô phỏng) diễn ra trên hạ tầng VNPay.

## Quyết định
VNPay Sandbox được mô hình hóa là **External System** (nhãn `[External System]`) trong C4 Context và C4 Container và nằm ngoài khung ranh giới (boundary) của BrewLite trong C4 Container. BrewLite tích hợp bằng ba kênh gọi hướng ra ngoài:

1. Tạo URL thanh toán có chữ ký để chuyển hướng khách sang trang VNPay.
2. Nhận IPN do VNPay chủ động gọi vào API.
3. Chủ động gọi QueryDR để tra cứu kết quả khi cần đối soát.

Toàn bộ tham số cấu hình (`vnp_TmnCode`, hash secret, base URL sandbox) đặt trong biến môi trường của **API Application**, không hard-code và không đưa xuống Web App.

## Phương án đã cân nhắc
- **Coi VNPay là một container nội bộ (mô phỏng luôn bên trong hệ thống):** sai với thực tế vận hành, không phản ánh đúng ranh giới tin cậy (trust boundary) cần có khi kiểm thử bảo mật.
- **Để Web App gọi trực tiếp VNPay:** sẽ lộ hash secret ra phía client, vi phạm NFR-04.

## Hệ quả
- **Ưu điểm:** Ranh giới tin cậy rõ ràng trên sơ đồ C4 Context/Container; thay nhà cung cấp thanh toán sau này không đổi hình dạng kiến trúc tổng thể; dễ giải thích khi kiểm thử bảo mật/pentest.
- **Hạn chế / đánh đổi:** Toàn bộ luồng thanh toán phụ thuộc tính sẵn sàng và độ trễ của VNPay Sandbox; cần cơ chế đối soát khi VNPay phản hồi chậm hoặc không phản hồi (xem ADR-006, ADR-008).
