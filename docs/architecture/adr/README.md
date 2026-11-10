# Architecture Decision Records (ADR) – BrewLite

Mỗi quyết định kiến trúc quan trọng được ghi thành một tệp ngắn trong thư mục này theo cấu trúc: Bối cảnh, Quyết định, Phương án đã cân nhắc, Hệ quả (ưu điểm, hạn chế, đánh đổi). Tên tệp: `NNN-ten-quyet-dinh.md`.

ADR-001 đến ADR-006 là các quyết định được nêu trực tiếp trong Task 3.1; ADR-007 đến ADR-010 là các quyết định kiến trúc bổ sung (frontend, bảo mật, vận hành) cần thiết để kiến trúc đầy đủ và nhất quán với các ràng buộc công nghệ của dự án.

| ADR | Quyết định | Trạng thái |
| :-: | :--- | :--- |
| [001](001-monorepo.md) | Monorepo (pnpm workspaces) cho web, API và mã dùng chung | Đã chấp nhận |
| [002](002-modular-monolith.md) | NestJS modular monolith, chia module theo domain | Đã chấp nhận |
| [003](003-postgresql-transaction-migration.md) | PostgreSQL + TypeORM, transaction nguyên tử khi trừ/hoàn tồn, migration | Đã chấp nhận |
| [004](004-vnpay-sandbox-integration.md) | VNPay Sandbox là hệ thống ngoài ranh giới BrewLite *(mở rộng)* | Đã chấp nhận |
| [005](005-return-url-ipn-idempotency.md) | Return URL chỉ hiển thị; IPN là căn cứ xác nhận; idempotency theo `orderId` + `idempotencyKey` | Đã chấp nhận |
| [006](006-payment-expiry-refund-stock-retry.md) | Hạn 15 phút mỗi yêu cầu thanh toán, hoàn tồn đúng một lần, cho thanh toán lại | Đã chấp nhận |
| [007](007-nextjs-pwa-frontend.md) | Next.js PWA chỉ làm giao diện, nghiệp vụ ở API | Đã chấp nhận |
| [008](008-vnpay-payment-gateway-adapter.md) | Tích hợp VNPay qua `PaymentGateway` (port/adapter), tách khỏi `PaymentsModule` *(mở rộng)* | Đã chấp nhận |
| [009](009-jwt-rbac.md) | JWT + RBAC + kiểm tra quyền sở hữu | Đã chấp nhận |
| [010](010-logging-health-config.md) | Log JSON (pino), health check (terminus), cấu hình bằng biến môi trường | Đã chấp nhận |
| [011](011-production-deployment-vps-docker.md) | Triển khai production bằng Docker Compose trên VPS Ubuntu + Caddy + GHCR | Đã chấp nhận |

Khi cần đổi một quyết định, không sửa lịch sử: tạo ADR mới và đổi trạng thái ADR cũ thành "Bị thay thế bởi ADR-NNN".
