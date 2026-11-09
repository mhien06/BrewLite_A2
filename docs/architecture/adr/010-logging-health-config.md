# ADR-010: Log có cấu trúc, health check và quản lý cấu hình bằng biến môi trường

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** NFR-02, NFR-04, NFR-07, NFR-08, NFR-09; QD-07, QD-08; RR-08

## Bối cảnh
Cần giám sát cơ bản, tự khởi động lại khi lỗi, và tuyệt đối không để secret (JWT secret, hash secret VNPay, mật khẩu) lọt vào repository hoặc log.

## Quyết định
- **Cấu hình:** `@nestjs/config` đọc biến môi trường, kiểm tra bằng schema (Joi hoặc zod) khi khởi động; thiếu biến bắt buộc thì API không chạy. Repository chỉ có `.env.example` không chứa secret.
- **Logging:** `nestjs-pino` ghi JSON ra stdout, mỗi request có `requestId`; cấu hình `redact` che `Authorization`, mật khẩu và tham số bí mật của VNPay (chữ ký, hash secret). Sự kiện nghiệp vụ quan trọng được ghi: IPN bị từ chối, IPN lặp, giao dịch chuyển `UNKNOWN`, hoàn tồn.
- **Health check:** `@nestjs/terminus` cung cấp `GET /health` kiểm tra API và kết nối database (`SELECT 1`); Docker Compose dùng làm `healthcheck` và `restart: unless-stopped`.
- **Xử lý lỗi:** `ExceptionFilter` toàn cục không trả stack trace hoặc secret ra ngoài ở production.

## Phương án đã cân nhắc
- **Winston:** linh hoạt nhưng log dạng chuỗi, che trường nhạy cảm kém thuận tiện hơn pino.
- **Prometheus/Grafana:** hữu ích về sau, vượt phạm vi "giám sát cơ bản" của MVP.

## Hệ quả
- **Ưu điểm:** lỗi cấu hình phát hiện ngay lúc khởi động; log truy vết được theo `requestId` mà không lộ secret; health check dùng chung cho Docker và smoke test sau triển khai.
- **Hạn chế:** chưa có metric hay cảnh báo tự động; cần review để bảo đảm không ai thêm log chứa dữ liệu nhạy cảm ngoài danh sách `redact`.
- **Đánh đổi:** giám sát cơ bản (log JSON + health check) thay vì hệ thống metric/cảnh báo đầy đủ, phù hợp quy mô MVP.
