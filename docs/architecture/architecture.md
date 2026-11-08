# Task 3.1 – Phương pháp và quyết định kiến trúc BrewLite

Tài liệu trình bày kiến trúc đề xuất của BrewLite theo **C4** (Context, Container) kết hợp **UML Component** cho NestJS API. Nguồn nghiệp vụ: `docs/requirements/context-and-scope.md`, `srs.md`, `use-case-checkout.md`, `docs/diagrams/domain-class.md`, `sequence-checkout.md`. Mỗi quyết định quan trọng có một ADR ngắn trong `docs/architecture/adr/`.

## 1. Phương pháp trình bày

| Mức | Sơ đồ | Trả lời câu hỏi | Tệp |
| :-- | :--- | :--- | :--- |
| C4 – Level 1 | System Context | BrewLite phục vụ ai và nói chuyện với hệ thống bên ngoài nào? | `c4-context` |
| C4 – Level 2 | Container | BrewLite gồm những đơn vị chạy được nào, dùng công nghệ gì, giao tiếp ra sao? | `c4-container` |
| UML Component | Component của API Application | Bên trong NestJS API chia module nào, phụ thuộc nhau thế nào? | `component-api` |

Quy ước vẽ: đen trắng, không màu; khung nét liền là phần đang xây dựng, khung nét đứt là hệ thống bên ngoài hoặc ranh giới. Nguồn Draw.io (`.drawio`) là nguồn chỉnh sửa chính thức theo yêu cầu bàn giao, nằm ở `docs/diagrams/sources/`; nguồn Graphviz (`.dot`) được giữ kèm theo để tái tạo bản xuất tự động khi cần. Bản xuất SVG và PNG nằm ở `docs/diagrams/exports/` và phải đồng bộ nội dung với `.drawio` — khi chỉnh sửa sơ đồ trong Draw.io, xuất lại SVG/PNG và thay thế file tương ứng.

Kiến trúc chọn là **modular monolith**: một Web App, một API (chia module theo domain), một database; VNPay Sandbox là hệ thống ngoài (ADR-004).

## 2. C4 Level 1 – System Context

![C4 Context](../diagrams/exports/c4-context.svg)

- **Người dùng:** Khách hàng (xem menu, đặt đơn, thanh toán, theo dõi đơn), Nhân viên quầy và Quản lý cửa hàng (xem đơn, cập nhật tiến độ). Khớp ACT-01 đến ACT-03 trong SRS.
- **BrewLite:** hệ thống duy nhất đang xây dựng, phục vụ một cửa hàng, nhận đồ tại quầy.
- **VNPay Sandbox:** Payment Service mô phỏng bên ngoài (ACT-04), không xử lý tiền thật. BrewLite gửi yêu cầu thanh toán có chữ ký và truy vấn kết quả (QueryDR); VNPay gửi IPN và chuyển khách về Return URL. Khách thao tác thanh toán trực tiếp trên trang VNPay sau khi được chuyển hướng.

## 3. C4 Level 2 – Container

![C4 Container](../diagrams/exports/c4-container.svg)

| Container | Công nghệ | Trách nhiệm | ADR |
| :--- | :--- | :--- | :-: |
| Web App | Next.js, React, PWA | Giao diện mobile-first, trang kết quả thanh toán (Return URL), màn hình quầy. Không chứa nghiệp vụ. | 007 |
| API Application | NestJS, TypeScript | Toàn bộ nghiệp vụ: xác thực/phân quyền, tính giá, tồn kho, thanh toán, IPN, đối soát, health check, logging. | 002, 005, 006, 008–010 |
| Database | PostgreSQL | Lưu User, Product, ProductOption, Cart, Order, OrderItem, Payment; transaction và khóa dòng; lược đồ do migration quản lý. | 003 |

Luồng giao tiếp chính:
1. Người dùng ↔ Web App qua HTTPS.
2. Web App → API: REST/JSON kèm JWT.
3. API → Database: SQL qua TCP; không có container nào khác truy cập database.
4. API → VNPay Sandbox: URL thanh toán có chữ ký, QueryDR. VNPay Sandbox → API: IPN.
5. Web App ↔ VNPay Sandbox: chỉ là chuyển hướng trình duyệt (đi) và Return URL (về); Return URL chỉ để hiển thị.

Triển khai chi tiết (Docker Compose, HTTPS, database không public) thuộc Task 3.2.

## 4. UML Component – API Application (NestJS)

![Component API](../diagrams/exports/component-api.svg)

| Component | Trách nhiệm chính | Dùng (interface) | Use case / yêu cầu |
| :--- | :--- | :--- | :--- |
| `AuthModule` | Đăng ký, đăng nhập, cấp JWT | `UsersService` | UC-04, UC-05, UC-06; FR-04, FR-05 |
| `UsersModule` | Tài khoản, vai trò | — | FR-04, FR-06 |
| `CatalogModule` | Menu, chi tiết Product, ProductOption, giá | — | UC-01, UC-02; FR-01, FR-02 |
| `CartModule` | Giỏ hàng, giá tạm tính | `ProductReader` | UC-03; FR-03 |
| `OrdersModule` | Tạo đơn, tính lại giá, snapshot, lịch sử, xử lý trạng thái đơn | `ProductReader`, `InventoryService` | UC-07, UC-09 đến UC-12; FR-07, FR-12 đến FR-15 |
| `InventoryModule` | Kiểm tra, trừ, hoàn tồn theo Product; khóa dòng; hoàn đúng một lần | — | FR-08, FR-11 |
| `PaymentsModule` | Khởi tạo thanh toán, idempotency, IPN, thanh toán lại, trạng thái thanh toán | `OrderPaymentPort`, `InventoryService`, `PaymentGateway` | UC-08; FR-09, FR-10 |
| `SchedulerModule` | `ReconciliationJob`: xử lý hết hạn (15 phút) và đối soát `Payment` ở trạng thái `PENDING`/`UNKNOWN` | `PaymentGateway`, `InventoryService` | FR-11; NFR-09 |
| `VnpayGatewayModule` | Adapter VNPay: ký URL, xác minh chữ ký IPN, QueryDR | VNPay Sandbox (HTTPS) | FR-09; NFR-04 |
| `SecurityKit` | `JwtAuthGuard`, `RolesGuard`, `ValidationPipe`, `ExceptionFilter` (toàn cục) | — | FR-06; NFR-02, NFR-03 |
| `ConfigModule` | Biến môi trường, kiểm tra khi khởi động | — | NFR-04, NFR-07 |
| `LoggerModule` | Log JSON, `requestId`, che secret | — | NFR-02, NFR-04 |
| `HealthModule` | `GET /health` (API + database) | `DatabaseModule` | NFR-07, NFR-09 |
| `DatabaseModule` | TypeORM, transaction, migration, seed | PostgreSQL | NFR-07, NFR-09 |

`SchedulerModule` tách riêng khỏi `PaymentsModule` để thể hiện rõ đây là một tiến trình chạy định kỳ, độc lập với vòng đời của một request HTTP, dù cùng thao tác trên entity `Payment`/`Order` qua `DatabaseModule`.

Quy tắc phụ thuộc (kiểm tra khi review): hướng một chiều và không vòng `Payments → Orders → Inventory/Catalog`, `Cart → Catalog`, `Auth → Users`, `Scheduler → VnpayGateway/Inventory/Database`. Trạng thái thanh toán được đọc qua `GET /orders/{id}/payment-status` của `PaymentsModule` nên `OrdersModule` không phụ thuộc ngược vào `PaymentsModule`.

## 5. Quyết định kiến trúc, ưu điểm, hạn chế và đánh đổi

| ADR | Quyết định | Ưu điểm | Hạn chế / đánh đổi |
| :-: | :--- | :--- | :--- |
| [001](adr/001-monorepo.md) | Monorepo pnpm workspaces | Một PR sửa được API, UI, tài liệu; kiểu dùng chung giảm lệch hợp đồng | Cần path filter trong CI, quy ước thư mục rõ |
| [002](adr/002-modular-monolith.md) | NestJS modular monolith | Transaction ACID cho đơn–tồn kho–thanh toán; triển khai đơn giản | Scale theo cả khối; cần kỷ luật ranh giới module |
| [003](adr/003-postgresql-transaction-migration.md) | PostgreSQL + TypeORM, transaction nguyên tử khi trừ/hoàn tồn, migration | Chống bán vượt tồn, chống ghi trùng; lược đồ tái tạo được | Đơn cùng Product xử lý tuần tự |
| [004](adr/004-vnpay-sandbox-integration.md) | VNPay Sandbox là hệ thống ngoài ranh giới BrewLite | Ranh giới tin cậy rõ ràng; dễ kiểm thử bảo mật | Luồng thanh toán phụ thuộc tính sẵn sàng của VNPay |
| [005](adr/005-return-url-ipn-idempotency.md) | Return URL chỉ hiển thị; IPN là căn cứ; idempotency theo `orderId`+`idempotencyKey` | Chống giả mạo qua trình duyệt; xử lý đúng IPN trễ/lặp/mất | Khách có thể thấy "Đang xác minh" vài phút |
| [006](adr/006-payment-expiry-refund-stock-retry.md) | Job hết hạn/đối soát `@nestjs/schedule`, hoàn tồn đúng một lần | Không thêm hạ tầng; an toàn khi chạy đồng thời | Trễ tối đa một chu kỳ; phụ thuộc tiến trình API |
| [007](adr/007-nextjs-pwa-frontend.md) | Next.js PWA chỉ làm giao diện | Một nơi quyết định nghiệp vụ; PWA cài được | Mỗi thao tác cần gọi API; không offline cho đặt/thanh toán |
| [008](adr/008-vnpay-payment-gateway-adapter.md) | `PaymentGateway` port/adapter, tách khỏi `PaymentsModule` | Dễ kiểm thử; nghiệp vụ tách khỏi giao thức VNPay | Thêm một lớp trừu tượng; IPN cần endpoint HTTPS truy cập được |
| [009](adr/009-jwt-rbac.md) | JWT + RBAC + quyền sở hữu | Stateless; quy tắc quyền tập trung | Không thu hồi được token sớm; rủi ro XSS phía client |
| [010](adr/010-logging-health-config.md) | Log pino, health terminus, cấu hình env | Lộ secret khó xảy ra; health dùng chung cho Docker | Chưa có metric/cảnh báo |

## 6. Truy vết với yêu cầu phi chức năng

| NFR | Được đáp ứng bởi |
| :--- | :--- |
| NFR-01 Hiệu năng | Modular monolith một process, truy vấn trực tiếp PostgreSQL, thời gian VNPay không nằm trong API (ADR-002, 003) |
| NFR-02, NFR-03 Bảo mật, kiểm soát truy cập | JWT, bcrypt, guard toàn cục, kiểm tra quyền sở hữu, `ValidationPipe`, `ExceptionFilter` (ADR-009, 010) |
| NFR-04 Bảo vệ tích hợp VNPay | Ranh giới hệ thống ngoài, adapter xác minh chữ ký, đối chiếu số tiền/mã tham chiếu, secret trong env, log che secret (ADR-004, 005, 008, 010) |
| NFR-05, NFR-06 PWA, phản hồi trạng thái | Next.js mobile-first/PWA, trang Return URL đọc trạng thái từ backend (ADR-005, 007) |
| NFR-07 Tái tạo môi trường | Monorepo, migration/seed, cấu hình env, health check (ADR-001, 003, 010) |
| NFR-08 CI/CD | Monorepo với path filter, health check cho smoke test (ADR-001, 010); chi tiết ở Task 3.2 |
| NFR-09 Phục hồi, nhất quán | Transaction ACID, ràng buộc DB, job đối soát, idempotency (ADR-002, 003, 005, 006) |

## 7. Đối chiếu tiêu chí nghiệm thu Task 3.1

| Yêu cầu của Task 3.1 | Nơi đáp ứng |
| :--- | :--- |
| Kiến trúc đề xuất theo C4 hoặc phân lớp | Mục 1 đến 4, ba sơ đồ trong `docs/diagrams/` |
| Frontend Next.js/PWA | Container Web App, ADR-007 |
| Backend NestJS theo module/domain | Component diagram, ADR-002 |
| PostgreSQL và cơ chế migration | Container Database, ADR-003 |
| Dịch vụ thanh toán mô phỏng | VNPay Sandbox (hệ thống ngoài), `VnpayGatewayModule`, ADR-004, ADR-008 |
| Logging, health check, quản lý cấu hình | `LoggerModule`, `HealthModule`, `ConfigModule`, ADR-010 |
| Lý do chọn kiến trúc, ưu điểm, hạn chế, trade-off | Mục 5 và từng ADR |
| ADR ngắn trong `docs/architecture/adr`, đúng `NNN-ten.md` | `adr/001-monorepo.md` đến `adr/010-logging-health-config.md` và `adr/README.md` |
| Có cả ba sơ đồ dạng Draw.io (nguồn) và SVG (xuất) | `docs/diagrams/sources/*.drawio`, `docs/diagrams/exports/*.svg` |
| Sơ đồ không mâu thuẫn với SRS, use case, mô hình dữ liệu | Mục 8 |

## 8. Tính nhất quán và điểm cần nhóm xác nhận

- Actor, use case, ranh giới (một cửa hàng, nhận tại quầy, VNPay Sandbox là hệ thống ngoài) và luồng Return URL/IPN/QueryDR khớp `srs.md`, `use-case-checkout.md` và `sequence-checkout.md`.
- Các thực thể trong Database container khớp `domain-class.md` (8 class MVP; `Promotion` và `LoyaltyTransaction` là `«future»` nên không đưa vào kiến trúc MVP).
- **Cần nhóm xác nhận:** `sequence-checkout.md` có dùng `Order.paymentStatus`, trong khi `domain-class.md` (Task 2.3, bản mới hơn) quy định trạng thái thanh toán chỉ lưu ở `Payment.status`. Kiến trúc này theo `domain-class.md` (đọc trạng thái từ `Payment` mới nhất của đơn). Nếu nhóm giữ `Order.paymentStatus`, cần cập nhật domain class hoặc sequence cho thống nhất.
- Chưa chốt trong tài liệu nguồn: điều kiện chuyển đơn sang `CANCELLED` (xem `domain-class.md` §4); kiến trúc không giả định luồng này.
- Phiên bản thư viện và thông số cụ thể (thời hạn JWT 60 phút, chu kỳ job 1 phút, bcrypt cost) là giá trị khởi điểm, nhóm có thể chỉnh khi hiện thực mà không đổi kiến trúc.
- `SchedulerModule` (ReconciliationJob) được tách thành component riêng theo đúng yêu cầu Task 3.1; về mặt triển khai mã nguồn, nhóm có thể đặt trong cùng thư mục `payments/` miễn giữ đúng ranh giới phụ thuộc đã mô tả ở Mục 4.
