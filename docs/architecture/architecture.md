# Task 3.1 – Phương pháp và quyết định kiến trúc BrewLite

Tài liệu trình bày kiến trúc đề xuất của BrewLite theo **C4** (Context, Container) kết hợp **UML Component** cho NestJS API. Nguồn nghiệp vụ: `docs/requirements/context-and-scope.md`, `srs.md`, `use-case-checkout.md`, `docs/diagrams/domain-class.md`, `sequence-checkout.md`. Mỗi quyết định quan trọng có một ADR ngắn trong `docs/architecture/adr/`.

## 1. Phương pháp trình bày

| Mức | Sơ đồ | Trả lời câu hỏi | Tệp |
| :-- | :--- | :--- | :--- |
| C4 – Level 1 | System Context | BrewLite phục vụ ai và nói chuyện với hệ thống bên ngoài nào? | `c4-context` |
| C4 – Level 2 | Container | BrewLite gồm những đơn vị chạy được nào, dùng công nghệ gì, giao tiếp ra sao? | `c4-container` |
| UML Component | Component của API Application | Bên trong NestJS API chia module nào, phụ thuộc nhau thế nào? | `component-api` |

Quy ước ký hiệu (không trộn ký hiệu giữa các loại sơ đồ; không dùng Use Case, Activity, Sequence hay Deployment):

| Sơ đồ | Ký hiệu | Cách nhận biết phần tử |
| :--- | :--- | :--- |
| C4 Context | C4 | Nhãn chữ trong khối: `[Person]`, `[Software System]`, `[External System]`. Mũi tên nét liền, nhãn ghi mục đích và `[giao thức]`. |
| C4 Container | C4 | Nhãn `[Container: công nghệ]`, `[Person]`, `[External System]`; khung nét đứt lớn duy nhất là ranh giới `BrewLite [Software System]`. Hình trụ chỉ dùng cho database. |
| Component (API) | UML | `«component»` (hình chữ nhật có hai tab bên trái), `«package»` (khung có tab), `«subsystem»`; quan hệ là **dependency** (nét đứt, đầu mũi tên mở), nhãn là interface được dùng. Phần tử ngoài API: `«client»`, `«external system»`, `«database»`. |

Tất cả sơ đồ làm kiểu basic đen trắng: nền trắng, nét đen, chữ đen, không icon, không tô màu; loại phần tử phân biệt bằng nhãn chữ. VNPay Sandbox luôn nằm ngoài ranh giới BrewLite.

Nguồn Draw.io (`.drawio`) nằm ở `docs/diagrams/sources/`; bản xuất SVG và PNG nằm ở `docs/diagrams/exports/` và mô tả cùng một nội dung (cùng tọa độ, cùng nhãn). Khi chỉnh sửa sơ đồ trong Draw.io, phải xuất lại SVG/PNG và thay thế file tương ứng.

Kiến trúc chọn là **modular monolith**: một Web App, một API (chia module theo domain), một database; VNPay Sandbox là hệ thống ngoài (ADR-004).

## 2. C4 Level 1 – System Context

![C4 Context](../diagrams/exports/c4-context.svg)

- **Người dùng:** Khách hàng (xem menu, đặt đơn, thanh toán, theo dõi đơn), Nhân viên quầy và Quản lý cửa hàng (xem đơn, cập nhật tiến độ). Khớp ACT-01 đến ACT-03 trong SRS.
- **BrewLite:** hệ thống duy nhất đang xây dựng, phục vụ một cửa hàng, nhận đồ tại quầy.
- **VNPay Sandbox:** Payment Service mô phỏng bên ngoài (ACT-04), không xử lý tiền thật. BrewLite gửi yêu cầu thanh toán có chữ ký và truy vấn kết quả (QueryDR); **VNPay gửi IPN trực tiếp vào NestJS API** (không qua Web App). Khách thao tác thanh toán trực tiếp trên trang VNPay sau khi được chuyển hướng; **Return URL chỉ chuyển trình duyệt về Web App để hiển thị** — không phải căn cứ xác nhận thanh toán.

## 3. C4 Level 2 – Container

![C4 Container](../diagrams/exports/c4-container.svg)

| Container | Công nghệ | Trách nhiệm | ADR |
| :--- | :--- | :--- | :-: |
| Web App | Next.js, React, PWA | Giao diện mobile-first, trang kết quả thanh toán (Return URL), màn hình quầy. Không chứa nghiệp vụ. | 007 |
| API Application | NestJS, TypeScript | Toàn bộ nghiệp vụ: xác thực/phân quyền, tính giá, tồn kho, thanh toán, IPN, đối soát, health check, logging. | 002, 005, 006, 008–010 |
| Database | PostgreSQL | Lưu các thực thể nghiệp vụ theo Domain Class: User/Cart, Product–Recipe–Ingredient, Order/Payment, xuất–hoàn nguyên liệu, hủy đơn và sổ điểm; transaction và khóa dòng; lược đồ do migration quản lý. | 003 |

Luồng giao tiếp chính:
1. Người dùng ↔ Web App qua HTTPS.
2. Web App → API: REST/JSON kèm JWT.
3. API → Database: SQL qua TCP; không có container nào khác truy cập database.
4. API → VNPay Sandbox: URL thanh toán có chữ ký, QueryDR. **VNPay Sandbox → API: IPN** (gọi thẳng vào NestJS API endpoint, không qua Web App).
5. Web App ↔ VNPay Sandbox: chỉ là chuyển hướng trình duyệt (đi) và Return URL (về). **Return URL chỉ để hiển thị** — sau khi trình duyệt về, Web App gọi `GET /orders/{id}/payment-status` vào API để lấy trạng thái đã xác minh.

Triển khai chi tiết (Docker Compose, HTTPS, database không public) thuộc Task 3.2.

## 4. UML Component – API Application (NestJS)

![Component API](../diagrams/exports/component-api.svg)

| Component | Trách nhiệm chính | Dùng (interface) | Use case / yêu cầu |
| :--- | :--- | :--- | :--- |
| `AuthModule` | Đăng ký, đăng nhập, cấp JWT | `UsersService` | UC-04, UC-05, UC-06; FR-04, FR-05 |
| `UsersModule` | Tài khoản, vai trò | — | FR-04, FR-06 |
| `CatalogModule` | Menu, Product, ProductOption và giá; Product không lưu tồn kho | `InventoryReader` (đủ nguyên liệu theo Recipe) | UC-01, UC-02; FR-01, FR-02 |
| `CartModule` | Giỏ hàng, giá tạm tính | `ProductReader` | UC-03; FR-03 |
| `OrdersModule` | Tạo đơn `PENDING` không trừ nguyên liệu; snapshot `OrderItem`; state machine; hủy trước pha và ghi `OrderCancellation` | `ProductReader`, `InventoryService` (hoàn kho khi hủy), `LoyaltyService` | FR-05–FR-07, FR-15–FR-17 |
| `InventoryModule` | Quản lý `Ingredient.quantityOnHand` (đơn vị `MeasurementUnit`), `Recipe`/`RecipeIngredient`; trừ/hoàn theo `OrderIngredientUsage`, khóa dòng và chống lặp | — | FR-10, FR-17, FR-21 |
| `PaymentsModule` | Tạo Payment attempt, idempotency, IPN/QueryDR, thanh toán lại; điều phối transaction xử lý kết quả | `OrderPaymentPort`, `InventoryService` (trừ kho), `LoyaltyService`, `PaymentGateway` | FR-08–FR-14, FR-19, FR-20 |
| `LoyaltyModule` | Sổ cái `LoyaltyTransaction`: dùng/tích/trả/đảo/bù điểm; kiểm tra `VNPayRefundRecord` để chống quyền lợi trùng | — | FR-10, FR-18–FR-20, FR-22 |
| `SchedulerModule` | Đối soát Payment `PENDING`/`UNKNOWN`; tự hủy Order `PENDING`/`PAYMENT_FAILED` quá 15 phút tính từ `Order.createdAt` sau khi xác nhận không có thanh toán thành công | `PaymentGateway` (QueryDR), `PaymentService` (xử lý kết quả, tự hủy) | FR-11, FR-13; NFR-09 |
| `VnpayGatewayModule` | Adapter VNPay: ký URL, xác minh chữ ký IPN, QueryDR | VNPay Sandbox (HTTPS) | FR-09; NFR-04 |
| `SecurityKit` | `JwtAuthGuard`, `RolesGuard`, `ValidationPipe`, `ExceptionFilter` (toàn cục) | — | FR-06; NFR-02, NFR-03 |
| `ConfigModule` | Biến môi trường, kiểm tra khi khởi động | — | NFR-04, NFR-07 |
| `LoggerModule` | Log JSON, `requestId`, che secret | — | NFR-02, NFR-04 |
| `HealthModule` | `GET /health` (API + database) | `DatabaseModule` | NFR-07, NFR-09 |
| `DatabaseModule` | TypeORM, transaction, migration, seed | PostgreSQL | NFR-07, NFR-09 |

`SchedulerModule` tách riêng khỏi `PaymentsModule` để thể hiện rõ tiến trình định kỳ độc lập với request HTTP, nhưng gọi cùng hàm xử lý kết quả thanh toán của `PaymentService` với IPN; việc tự hủy đi qua `OrderPaymentPort` để `OrdersModule` ghi `OrderCancellation` và trả điểm đã dùng.

Quy tắc phụ thuộc: hướng một chiều và không vòng `Scheduler → Payments → Orders → Catalog/Inventory/Loyalty`, `Payments → Inventory/Loyalty/VnpayGateway`, `Catalog → Inventory`, `Cart → Catalog`, `Auth → Users`; transaction do `OrdersModule` hoặc `PaymentsModule` điều phối qua interface của Inventory/Loyalty. Trạng thái thanh toán được đọc qua API của `PaymentsModule`, nên `OrdersModule` không truy cập repository Payment.

## 5. Quyết định kiến trúc, ưu điểm, hạn chế và đánh đổi

| ADR | Quyết định | Ưu điểm | Hạn chế / đánh đổi |
| :-: | :--- | :--- | :--- |
| [001](adr/001-monorepo.md) | Monorepo pnpm workspaces | Một PR sửa được API, UI, tài liệu; kiểu dùng chung giảm lệch hợp đồng | Cần path filter trong CI, quy ước thư mục rõ |
| [002](adr/002-modular-monolith.md) | NestJS modular monolith theo domain | Transaction ACID xuyên Order–Inventory–Loyalty; triển khai đơn giản | Scale theo cả khối; cần kỷ luật ranh giới module |
| [003](adr/003-postgresql-transaction-migration.md) | PostgreSQL + TypeORM, migration và transaction nguyên tử | Chống trừ/hoàn nguyên liệu, ghi điểm và Payment trùng | Các giao dịch cùng Ingredient xử lý tuần tự |
| [004](adr/004-vnpay-sandbox-integration.md) | VNPay Sandbox là hệ thống ngoài ranh giới BrewLite *(mở rộng – nhóm chọn tích hợp thực thay vì mock nội bộ)* | Ranh giới tin cậy rõ ràng; dễ kiểm thử bảo mật | Luồng thanh toán phụ thuộc tính sẵn sàng của VNPay |
| [005](adr/005-return-url-ipn-idempotency.md) | Return URL chỉ hiển thị; IPN/QueryDR xác minh; idempotency nhiều lớp | Chống giả mạo và hiệu ứng kho/điểm lặp | Khách có thể thấy "Đang xác minh" |
| [006](adr/006-payment-expiry-refund-stock-retry.md) | Order chờ 15 phút; đối soát trước tự hủy; retry không gia hạn | Không thêm hạ tầng; xử lý an toàn kết quả đến muộn | Trễ tối đa một chu kỳ; phụ thuộc tiến trình API |
| [007](adr/007-nextjs-pwa-frontend.md) | Next.js PWA chỉ làm giao diện | Một nơi quyết định nghiệp vụ; PWA cài được | Mỗi thao tác cần gọi API; không offline cho đặt/thanh toán |
| [008](adr/008-vnpay-payment-gateway-adapter.md) | `PaymentGateway` port/adapter, tách khỏi `PaymentsModule` *(mở rộng – nhóm chọn tích hợp thực VNPay Sandbox)* | Dễ kiểm thử; nghiệp vụ tách khỏi giao thức VNPay | Thêm một lớp trừu tượng; IPN cần endpoint HTTPS truy cập được |
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
| NFR-08 CI/CD | Monorepo với path filter, health check cho smoke test (ADR-001, 010); nền tảng triển khai và pipeline chi tiết thuộc Task 3.2 |
| NFR-09 Phục hồi, nhất quán | Transaction ACID, ràng buộc DB, job đối soát, idempotency (ADR-002, 003, 005, 006) |

## 7. Đối chiếu tiêu chí nghiệm thu Task 3.1

| Yêu cầu của Task 3.1 | Nơi đáp ứng |
| :--- | :--- |
| Kiến trúc đề xuất theo C4 hoặc phân lớp | Mục 1 đến 4, ba sơ đồ trong `docs/diagrams/` |
| Frontend Next.js/PWA | Container Web App, ADR-007 |
| Backend NestJS theo module/domain | Component diagram, ADR-002 |
| PostgreSQL và cơ chế migration | Container Database, ADR-003 |
| Dịch vụ thanh toán mô phỏng | Đề yêu cầu tối thiểu là một dịch vụ thanh toán giả lập; nhóm chọn tích hợp **VNPay Sandbox** (hệ thống ngoài thực tế) làm phương án mở rộng — xem `VnpayGatewayModule`, ADR-004, ADR-008. Thiết kế port/adapter (ADR-008) đảm bảo có thể thay bằng mock nội bộ mà không đổi nghiệp vụ. |
| Logging, health check, quản lý cấu hình | `LoggerModule`, `HealthModule`, `ConfigModule`, ADR-010 |
| Lý do chọn kiến trúc, ưu điểm, hạn chế, trade-off | Mục 5 và từng ADR |
| ADR ngắn trong `docs/architecture/adr`, đúng `NNN-ten.md` | `adr/001-monorepo.md` đến `adr/011-production-deployment-vps-docker.md` và `adr/README.md` |
| Có cả ba sơ đồ dạng Draw.io (nguồn) và SVG (xuất) | `docs/diagrams/sources/*.drawio` và `docs/diagrams/exports/*.svg` (kèm `.png`), đồng bộ nội dung — xem Mục 1 và §8.3 |
| Dùng đúng ký hiệu C4 và UML, không trộn ký hiệu loại sơ đồ khác | Bảng ký hiệu ở Mục 1; Context/Container dùng C4, Component dùng UML |
| Sơ đồ đen trắng cơ bản; VNPay Sandbox nằm ngoài BrewLite | Mục 1; ranh giới `BrewLite [Software System]` (Container), `[External System]` (Context, Container), `«external system»` (Component) |
| Sơ đồ không mâu thuẫn với SRS, use case, mô hình dữ liệu | Mục 8 |

## 8. Tính nhất quán với Task 1 và Task 2

### 8.1. Actor và Use Case

Actor và use case trong tài liệu này khớp hoàn toàn với `srs.md` §3:

| Actor | Mã SRS | Vai trò trong kiến trúc |
| :--- | :--- | :--- |
| Khách hàng | ACT-01 | Dùng Web App → API cho UC-01 đến UC-10 |
| Nhân viên quầy | ACT-02 | Dùng Web App → API cho UC-05, UC-06, UC-11, UC-12 |
| Quản lý cửa hàng | ACT-03 | Dùng Web App → API cho UC-05, UC-06, UC-11, UC-12 |
| VNPay Sandbox | ACT-04 | Hệ thống ngoài ranh giới BrewLite — gửi IPN vào API, nhận URL có chữ ký từ API |

### 8.2. Mô hình dữ liệu (đối chiếu `domain-class.md` Task 2.3)

Kiến trúc căn theo Domain Class đã duyệt:

- `Order.status`: `PENDING`, `PAYMENT_FAILED`, `PAYMENT_EXCEPTION`, `PAID`, `PREPARING`, `READY_FOR_PICKUP`, `COMPLETED`, `CANCELLED`.
- `Payment.status`: `PENDING`, `SUCCEEDED`, `FAILED`, `UNKNOWN`, `EXPIRED`. Hai vòng đời độc lập; các trường kết quả Payment có thể rỗng trước khi được xác minh.
- Order chờ tối đa 15 phút: `Order.expiresAt = Order.createdAt + 15 phút`. `Payment.expiresAt ≤ Order.expiresAt`; tạo Payment mới không kéo dài hạn Order. `PAID`/`PAYMENT_EXCEPTION` không tự hủy theo hạn.
- Tồn kho chỉ nằm tại `Ingredient.quantityOnHand`; `Product` không lưu tồn kho. `Recipe`/`RecipeIngredient` định lượng nguyên liệu theo `MeasurementUnit`. Tạo Order không trừ kho; chỉ Payment `SUCCEEDED` đã xác minh và đủ nguyên liệu mới trừ kho và ghi `OrderIngredientUsage`.
- Hủy trước `PREPARING` ghi `OrderCancellation`; Order `PAID` hoàn đúng lượng thực trừ. Điểm dùng/tích/trả/đảo/bù được lưu bằng `LoyaltyTransaction`; `VNPayRefundRecord` ngăn refund cũ và điểm bù trùng nhau.
- VNPay thành công nhưng thiếu nguyên liệu: `Payment.status = SUCCEEDED`, `Order.status = PAYMENT_EXCEPTION`; không trừ kho, không `EARN`; bù `LoyaltyTransaction(VNPAY_COMPENSATION)` sau khi kiểm tra `VNPayRefundRecord`. Payment `SUCCEEDED` đến muộn sau `CANCELLED` không mở lại Order, không trừ kho, không `EARN`, chỉ bù điểm đúng một lần.
- `Promotion` vẫn là `«future»`; `Ingredient`, `Recipe`, `RecipeIngredient`, `OrderIngredientUsage`, `OrderCancellation`, `LoyaltyTransaction` và `VNPayRefundRecord` thuộc mô hình MVP.

### 8.3. Luồng thanh toán và sơ đồ C4

Các luồng sau phải thể hiện nhất quán trên cả C4 Context, C4 Container và Component diagram:

1. **Return URL:** VNPay Sandbox chuyển hướng trình duyệt về `Web App` — đây **chỉ là bước hiển thị**. `Web App` lập tức gọi `GET /orders/{id}/payment-status` vào `API Application` để lấy trạng thái đã được backend xác minh. Return URL **không** quyết định trạng thái thanh toán.
2. **IPN/QueryDR:** API xác minh chữ ký, `transactionRef`, số tiền và mã kết quả, rồi gọi chung một hàm transaction. Nhánh hợp lệ đủ nguyên liệu ghi Payment `SUCCEEDED`, trừ `Ingredient.quantityOnHand`, ghi `OrderIngredientUsage`/`EARN` và Order `PAID`; thiếu nguyên liệu ghi Payment `SUCCEEDED` và Order `PAYMENT_EXCEPTION`, không trừ kho; Order đã `CANCELLED` giữ nguyên và chỉ được bù `VNPAY_COMPENSATION` đúng một lần.
3. **VNPay Sandbox** tiếp tục nằm **ngoài ranh giới BrewLite** trên mọi sơ đồ C4.

> **Ghi chú đồng bộ sơ đồ:** Tệp `.drawio` trong `docs/diagrams/sources/` là nguồn để chỉnh sửa. Sau mỗi lần cập nhật, xuất lại SVG/PNG từ Draw.io và thay thế file tương ứng trong `docs/diagrams/exports/`. Ba cặp `.drawio`/`.svg` (`c4-context`, `c4-container`, `component-api`) phải luôn mô tả cùng một kiến trúc, nhất quán với tài liệu này.

### 8.4. Đối chiếu với `sequence-checkout.md` (Task 2)
Sequence Task 2.2 phải giữ tách biệt `OrderStatus` và `PaymentStatus`, dùng `SUCCEEDED`, thể hiện `PAYMENT_EXCEPTION`, kết quả đến muộn, hủy trước pha và hiệu ứng kho/điểm đúng một lần. Không dùng `Order.paymentStatus`.

### 8.5. Thông số kỹ thuật (không ảnh hưởng kiến trúc)

- Thời hạn JWT, chu kỳ job đối soát, bcrypt cost factor là giá trị khởi điểm — có thể chỉnh khi hiện thực mà không thay đổi kiến trúc.
- `SchedulerModule` (`ReconciliationJob`) tách thành component riêng để thể hiện rõ đây là tiến trình định kỳ độc lập với vòng đời HTTP request. Về mặt mã nguồn, nhóm có thể đặt trong thư mục `payments/` miễn giữ đúng ranh giới phụ thuộc ở Mục 4.
