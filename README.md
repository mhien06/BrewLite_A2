# BrewLite — Assignment 2

BrewLite là ứng dụng đặt đồ uống với Next.js, NestJS và PostgreSQL. Phạm vi A2 đi từ xem menu, chọn món và đặt đơn đến thanh toán qua VNPay Sandbox và theo dõi đơn.

## Tài liệu

- [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md)
- [Đặc tả yêu cầu (SRS)](docs/requirements/srs.md)
- [Use case đặt và thanh toán đơn](docs/requirements/use-case-checkout.md)
- [Sơ đồ nghiệp vụ](docs/diagrams/exports/)
- [Kiến trúc và ADR](docs/architecture/architecture.md)
- [Thiết kế triển khai](docs/architecture/deployment.md)

Ma trận truy vết `docs/traceability-matrix.md` được bổ sung ở Task 4.2 (#19).

## Hai sprint

- **Sprint 1 — Task 4:** Thiết lập repository, quản lý tài liệu, triển khai menu và API sản phẩm, thiết lập CI.
- **Sprint 2 — Task 5:** Hoàn thiện luồng đặt và thanh toán, kiểm thử tích hợp, đóng gói và bàn giao.

## Chạy trên máy

Yêu cầu Node.js 24, pnpm 11 và Docker Desktop. Sau khi các phần menu, API và Docker Compose đã được tích hợp, chạy trong thư mục gốc bằng PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up --build -d
docker compose ps
```

Mở web tại `http://localhost:3000` và kiểm tra API tại `http://localhost:3001/health`. Nếu cổng đang bận, chỉnh `WEB_PORT` và `API_PORT` trong `.env`, rồi chạy lại Compose. API áp dụng migration khi khởi động với cơ sở dữ liệu đã sẵn sàng.

## Phát triển và review

Mở PR về `develop` và ghi số issue trong mô tả. Thành review phần Hiển thực hiện. Hiển review phần các thành viên khác thực hiện. Ghi cách chạy, kết quả kiểm thử và phần còn vướng trước khi bàn giao.

Bổ sung kết quả CI, hướng dẫn deploy/rollback và URL production khi hoàn tất các phần tương ứng. Lưu thông tin bí mật trong biến môi trường của từng máy hoặc môi trường triển khai.

