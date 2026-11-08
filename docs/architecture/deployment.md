# Task 3.2 – Deployment diagram BrewLite (production)

Tài liệu mô tả UML deployment diagram cho môi trường production của BrewLite, dựa trên kiến trúc Task 3.1 (`architecture.md`, `c4-container`, `component-nestjs-api`) và các ADR 001 đến 010.

![Deployment diagram](../diagrams/exports/deployment-production.svg)

- Nguồn: `docs/diagrams/sources/deployment-production.drawio`; bản xuất: `docs/diagrams/exports/deployment-production.svg`.
- Quy ước: đen trắng; hộp 3D là node/container/job, ghi chú gấp góc là artifact, hình trụ là volume; khung nét đứt lớn là ranh giới môi trường (local, CI, production); nét đứt đậm là hệ thống bên ngoài. Mũi tên ghi giao thức và cổng.

## 1. Nền tảng triển khai được chọn

**Một VPS Ubuntu 24.04 LTS chạy Docker Compose**, Caddy làm reverse proxy HTTPS, Cloudflare làm DNS/CDN, GHCR làm container registry, GitHub Actions làm CI/CD (ADR-009, ADR-010). Lý do chính: giống Docker Compose local, chi phí thấp, mạng nội bộ và persistent storage dễ kiểm soát và dễ kiểm chứng. VNPay Sandbox cần endpoint IPN HTTPS công khai nên cần một tên miền trỏ về hệ thống.

## 2. Các phần tử trên sơ đồ

### 2.1. Production

| Phần tử | Loại UML | Mô tả | Cổng / giao thức |
| :--- | :--- | :--- | :--- |
| Thiết bị người dùng, Trình duyệt/PWA | device, execution environment | Chạy Web App; Service Worker và Web App Manifest cho PWA | HTTPS 443 tới Cloudflare |
| Cloudflare | node | DNS, CDN cho `/_next/static`, ảnh, manifest; TLS, chế độ Full (strict) | HTTPS 443 vào và ra |
| VPS Ubuntu 24.04 | device | Máy chủ duy nhất; tường lửa mở 80, 443; 22 chỉ cho khóa deploy | — |
| Docker Engine + Compose | execution environment | Chạy các container, mạng nội bộ `brewlite-net` | — |
| `proxy` (Caddy 2) | container | Container duy nhất publish cổng; TLS Let's Encrypt; `/` → web, `/api` → api | 80, 443 |
| `web` (Next.js standalone) | container | Giao diện PWA, SSR; healthcheck `GET /` | 3000 nội bộ |
| `api` (NestJS) | container | Toàn bộ nghiệp vụ; healthcheck `GET /health` | 3001 nội bộ |
| `db` (PostgreSQL 16) | container | Cơ sở dữ liệu; healthcheck `pg_isready`; không publish cổng | 5432 nội bộ |
| `backup` | container | `pg_dump` hằng đêm vào volume `backups` | — |
| `pgdata`, `backups` | volume | Persistent storage cho dữ liệu và bản sao lưu | — |
| `.env.production` | artifact | Secret và biến môi trường, quyền 600, nằm trên VPS, không trong repo | `env_file` |
| Log JSON | artifact | `api`/`web` ghi stdout; Docker `json-file` có xoay vòng (`max-size`, `max-file`) | — |
| GHCR | node | Registry chứa `brewlite-web:<SHA>`, `brewlite-api:<SHA>` | HTTPS 443 |
| VNPay Sandbox | external system | Trang thanh toán thử nghiệm; gửi IPN, Return URL; nhận yêu cầu ký và QueryDR | HTTPS 443 |

### 2.2. CI và Local

| Môi trường | Phần tử | Vai trò |
| :--- | :--- | :--- |
| CI (GitHub) | Repository (monorepo) | Nguồn mã; mọi thay đổi qua PR |
| CI | Job `ci` | install, lint, unit test, build, integration test với PostgreSQL service |
| CI | Job `build-and-push` | Dựng image, gắn tag commit SHA, đẩy lên GHCR (chỉ khi merge vào `main`) |
| CI | Job `deploy` | SSH vào VPS, `compose pull` và `up -d`, chạy migration, smoke test `GET /api/health` |
| CI | GitHub Actions secrets | Khóa SSH deploy, token GHCR; runner không có secret ứng dụng production |
| Local | Docker Compose (web, api, db) | Môi trường lập trình; `db` dùng volume `pgdata-dev`; cấu hình từ `.env` (sinh từ `.env.example`) |
| Local | Tunnel HTTPS (cloudflared) | Chỉ dùng khi cần VNPay Sandbox gọi IPN về máy local (RR-07) |

## 3. Luồng kết nối và cổng

| Từ → Đến | Giao thức, cổng | Ghi chú |
| :--- | :--- | :--- |
| Trình duyệt → Cloudflare → `proxy` | HTTPS 443 | Điểm vào duy nhất từ Internet |
| `proxy` → `web` | HTTP 3000 | Mạng Docker nội bộ |
| `proxy` → `api` | HTTP 3001, tiền tố `/api` | Cùng tên miền với web, không cần CORS |
| `web` → `api` | HTTP 3001 | Gọi nội bộ khi SSR |
| `api` → `db` | TCP 5432 | Chỉ trong `brewlite-net`; không có đường từ Internet |
| Trình duyệt → VNPay Sandbox | HTTPS 443 | Chuyển hướng thanh toán (Return URL quay về qua cùng đường vào) |
| VNPay Sandbox → `proxy` → `api` | HTTPS 443 | IPN tới `/api/...`, công khai, xác minh chữ ký |
| `api` → VNPay Sandbox | HTTPS 443 | URL thanh toán có chữ ký, QueryDR |
| `ci_dep` → VPS | SSH 22 | Khóa riêng chỉ cho deploy |
| VPS ← GHCR | HTTPS 443 | Kéo image theo tag SHA |

## 4. Secret, biến môi trường, health check và log

- **Biến môi trường (chỉ tên, không có giá trị):** `NODE_ENV`, `PORT`, `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_URL`, `VNP_RETURN_URL`, `APP_BASE_URL`, `LOG_LEVEL`, `IMAGE_TAG`. Biến `NEXT_PUBLIC_*` của Next.js được nhúng lúc build nên chỉ chứa giá trị không bí mật (ví dụ đường dẫn `/api`).
- **Nơi giữ secret:** `.env.production` trên VPS (quyền 600); khóa SSH và token GHCR trong GitHub Actions secrets. Repository chỉ có `.env.example` và `deploy/.env.production.example` không chứa secret (ADR-008).
- **Health check:** `GET /health` của API (kiểm tra API và database), `pg_isready` cho `db`, `GET /` cho `web`; Compose dùng `healthcheck`, `depends_on: condition: service_healthy` và `restart: unless-stopped`.
- **Log:** JSON ra stdout, có `requestId`, che secret/JWT/mật khẩu; xem bằng `docker compose logs`; Docker xoay vòng log để không đầy đĩa.

## 5. Ranh giới local, CI và production

| Nội dung | Local | CI | Production |
| :--- | :--- | :--- | :--- |
| Nơi chạy | Máy lập trình viên, Docker Compose | GitHub Actions runner tạm thời | VPS, Docker Compose |
| Database | Container `db`, volume `pgdata-dev`, seed mẫu | Postgres service container, bỏ sau mỗi lần chạy | Container `db`, volume `pgdata`, có backup |
| Secret | `.env` cá nhân, khóa VNPay Sandbox của nhóm | Chỉ khóa SSH và token GHCR (không secret ứng dụng) | `.env.production` trên VPS |
| HTTPS | Không bắt buộc (tunnel khi thử IPN) | Không áp dụng | Bắt buộc (Caddy + Cloudflare) |
| Cổng mở ra ngoài | 3000, 3001, 5432 trên localhost | Không | Chỉ 80, 443 (và 22 cho deploy) |
| Image | Build tại máy | Build và đẩy lên GHCR | Chỉ kéo image tag SHA từ GHCR |

## 6. Quy trình triển khai và rollback

1. Lập trình viên mở PR; CI chạy `ci` (install, lint, unit test, build, integration test). Thất bại thì không merge.
2. Merge vào `main`: `build-and-push` tạo image tag SHA đẩy lên GHCR.
3. `deploy`: SSH vào VPS, đặt `IMAGE_TAG`, `compose pull`, chạy migration, `compose up -d`, rồi smoke test `https://<tên-miền>/api/health`.
4. Rollback: đặt `IMAGE_TAG` về SHA trước đó và chạy lại `compose up -d` (migration viết tương thích lùi một phiên bản).

## 7. Truy vết deployment → kiến trúc → mã nguồn

Repository hiện (nhánh `develop`) mới có tài liệu, **chưa có mã nguồn**; cột "Đường dẫn dự kiến" theo cấu trúc monorepo của ADR-001 và sẽ khớp khi nhóm hiện thực.

| Phần tử deployment | Thành phần kiến trúc (Task 3.1) | ADR | Đường dẫn dự kiến |
| :--- | :--- | :-: | :--- |
| Trình duyệt/PWA, `web` | Container Web App | 003 | `apps/web/`, `apps/web/Dockerfile`, `apps/web/public/manifest.webmanifest` |
| `api` | Container API Application (mọi module của component diagram) | 002, 005–008 | `apps/api/`, `apps/api/Dockerfile` |
| healthcheck `api` | `HealthModule` | 008 | `apps/api/src/health/` |
| `db`, volume `pgdata` | Container Database; `DatabaseModule` | 004 | `apps/api/src/database/migrations/`, `apps/api/src/database/seeds/` |
| Biến môi trường, `.env.production` | `ConfigModule` | 008 | `apps/api/src/config/`, `.env.example`, `deploy/.env.production.example` |
| Log JSON | `LoggerModule` | 008 | `apps/api/src/logger/` |
| Kết nối VNPay, IPN | `PaymentsModule`, `VnpayGatewayModule` | 006 | `apps/api/src/payments/`, `apps/api/src/vnpay-gateway/` |
| Job đối soát | `ReconciliationJob` (trong `api`) | 007 | `apps/api/src/payments/reconciliation.job.ts` |
| `proxy` (Caddy) | Điểm vào HTTPS của hệ thống BrewLite | 009 | `deploy/Caddyfile` |
| Compose production, `backup` | Hạ tầng triển khai | 009 | `deploy/docker-compose.prod.yml`, `deploy/backup.sh` |
| Compose local, `.env` | Môi trường local | 001, 009 | `docker-compose.yml`, `.env.example` |
| CI, build-and-push, deploy, GHCR | Quy trình CI/CD | 010 | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| Gói dùng chung | `packages/shared` | 001 | `packages/shared/` |

## 8. Điểm cần nhóm xác nhận

- **Nền tảng thực tế:** VPS Ubuntu 24.04 LTS + Docker Compose đã được chấp nhận theo ADR-009; GitHub Actions + GHCR đã được chấp nhận theo ADR-010. Sơ đồ production sử dụng các quyết định kiến trúc này.
- **Tên miền và VPS:** cần một tên miền (cho Cloudflare, Let's Encrypt, IPN) và một VPS; các placeholder `<tên-miền>` phải thay bằng giá trị thật. Địa chỉ IPN cũng phải đăng ký với VNPay Sandbox.
- **Cổng, phiên bản image** (Caddy 2, PostgreSQL 16, Node LTS) là giá trị khởi điểm.
- **Đường dẫn mã nguồn** ở mục 7 là dự kiến cho đến khi có code.
- Chưa có cơ chế giám sát ngoài log và health check, và chưa có phương án sao lưu ra ngoài VPS (cần nếu muốn chịu được mất cả máy).

## 9. Đối chiếu tiêu chí Task 3.2

| Yêu cầu tối thiểu | Nơi thể hiện |
| :--- | :--- |
| Thiết bị người dùng chạy trình duyệt/PWA | device + execution environment "Trình duyệt / PWA" |
| Dịch vụ/CDN phục vụ Next.js | Cloudflare (CDN) và container `web` |
| Container chạy NestJS API | container `api` |
| PostgreSQL có persistent storage | container `db` + volume `pgdata` (và `backups`) |
| Container registry và nền tảng triển khai | GHCR; VPS + Docker Compose; GitHub Actions |
| HTTPS, kết nối nội bộ, cổng | Nhãn trên mũi tên; mục 3 |
| Secret/env, health check, log | artifact `.env.production`, healthcheck từng container, log JSON; mục 4 |
| Ranh giới local, CI, production | Ba khung nét đứt; mục 5 |
| Truy vết container/dịch vụ → kiến trúc và mã nguồn | Mục 7 |
