# ADR-011: Triển khai môi trường Production bằng Docker Compose trên VPS Ubuntu kèm Caddy Reverse Proxy, GHCR và GitHub Actions

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-09
- **Tác giả:** Đội ngũ phát triển BrewLite
- **Liên quan:** Task 3.2, Task 5.3, Task 5.4; NFR-04, NFR-07, NFR-08, NFR-09; ADR-001, ADR-002, ADR-003, ADR-010

## 1. Bối cảnh
BrewLite theo kiến trúc Modular Monolith gồm Web App (Next.js SSR/PWA), API Application (NestJS) và Cơ sở dữ liệu (PostgreSQL 16) chạy trong cùng monorepo.
Để đưa hệ thống lên môi trường production thực tế truy cập được:
1. Cần một địa chỉ HTTPS công khai và cố định để VNPay Sandbox có thể gọi Webhook (IPN) xác nhận kết quả thanh toán.
2. Cần quản lý cấu hình môi trường, chứng chỉ SSL/TLS tự động và bảo mật các cổng dịch vụ nội bộ (không public PostgreSQL ra Internet).
3. Cần quy trình tự động hóa đóng gói image (CI/CD) đồng nhất với môi trường kiểm thử local.

## 2. Quyết định kiến trúc
Hệ thống lựa chọn triển khai production trên **01 máy chủ ảo VPS (Ubuntu 24.04 LTS)** chạy **Docker Compose**:
- **Reverse Proxy / Ingress:** Sử dụng **Caddy v2** làm điểm tiếp nhận duy nhất cho toàn bộ lưu lượng cổng 80/443. Caddy tự động quản lý chứng chỉ TLS (Let's Encrypt / ZeroSSL), chuyển tiếp `/` tới `web:3000` và `/api` tới `api:3001` (loại bỏ bài toán CORS vì cùng một origin).
- **Mạng nội bộ:** Tạo Docker network bridge `brewlite-net`. Chỉ có container `proxy` (Caddy) publish cổng 80, 443 ra ngoài Internet. Các container `web`, `api`, `db` chỉ giao tiếp nội bộ qua DNS của Docker Compose. Cổng 5432 của PostgreSQL hoàn toàn cô lập khỏi Internet.
- **Lưu trữ bền vững (Persistent Storage):** Dùng Docker Named Volumes `pgdata` (dữ liệu PostgreSQL) và `backups` (bản snapshot định kỳ `pg_dump`).
- **Container Registry & CI/CD:** Sử dụng **GitHub Packages (GHCR - ghcr.io)** lưu trữ image được gắn tag theo Git Commit SHA. GitHub Actions đảm nhận kiểm thử (CI) và kết nối SSH bảo mật qua Deploy Key để cập nhật container trên VPS (CD).
- **Quản lý bí mật (Secrets):** File cấu hình `.env.production` (quyền 600) lưu trực tiếp trên VPS. Runner CI/CD chỉ giữ SSH Deploy Key và GHCR token, không lưu trữ biến môi trường bí mật của ứng dụng.

## 3. Các phương án đã cân nhắc
- **PaaS (Vercel + Render/Railway + Supabase):**
  - *Ưu điểm:* Thiết lập nhanh lúc đầu.
  - *Nhược điểm:* Phân mảnh trên 3 nhà cung cấp khác nhau; cơ chế mạng khác biệt hoàn toàn với `docker-compose.yml` ở local; chi phí phát sinh hoặc bị giới hạn băng thông/sleep instance ở gói miễn phí; khó kiểm soát địa chỉ IP và định tuyến IPN VNPay.
- **Kubernetes (K8s / EKS / GKE):**
  - *Nhược điểm:* Quá phức tạp và tốn kém so với quy mô MVP 1 cửa hàng.
- **VPS Ubuntu + Docker Compose (Được chọn):**
  - *Ưu điểm:* Cấu hình production tương đồng tối đa với local dev (`docker-compose.yml`); toàn quyền kiểm soát firewall, network và log; chi phí cố định thấp; dễ dàng viết script rollback khi deploy thất bại.

## 4. Hệ quả
- **Ưu điểm:**
  - Đáp ứng trọn vẹn tiêu chí Task 3.2 và Task 5.
  - Endpoint IPN HTTPS chạy ổn định cho tích hợp thanh toán.
  - Khả năng rollback nhanh chóng bằng cách đổi tag `IMAGE_TAG` về commit SHA trước.
- **Hạn chế và giải pháp:**
  - Cần nhóm tự quản lý bảo mật VPS (chỉ mở cổng 22, 80, 443; tắt password authentication cho SSH).
  - Sao lưu dữ liệu cần container phụ trợ chạy script `pg_dump` định kỳ.

