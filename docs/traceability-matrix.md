# Ma trận truy vết yêu cầu BrewLite

Nguồn yêu cầu [SRS](requirements/srs.md), đối chiếu mục 4.1 và 4.2 của SRS. Các cột Code/API và Test được điền khi có đường dẫn triển khai và kết quả kiểm thử thực tế.

## Yêu cầu chức năng

| Mã yêu cầu | Use-case/User Story | Thiết kế / Sơ đồ | Code/API | Test |
|---|---|---|---|---|
| FR-01 · Xem danh sách sản phẩm | UC-01 | [use-case-overview](diagrams/exports/use-case-overview.svg), [domain-class](diagrams/exports/domain-class.svg) | [Products API](../apps/api/src/main.ts), [Menu UI](../apps/web/app/page.jsx) | [Menu component test](../apps/web/app/page.test.jsx), [API test](../tests/catalog-api.test.mjs) |
| FR-02 · Xem chi tiết và tùy chọn sản phẩm | UC-02 | [use-case-overview](diagrams/exports/use-case-overview.svg), [domain-class](diagrams/exports/domain-class.svg) | [Product detail API](../apps/api/src/main.ts), [Product detail UI](../apps/web/app/products/%5Bid%5D/page.jsx) | [API test](../tests/catalog-api.test.mjs) |
| FR-03 · Quản lý giỏ hàng | UC-03 | [activity-order](diagrams/exports/activity-order.svg), [domain-class](diagrams/exports/domain-class.svg) | | |
| FR-04 · Đăng ký tài khoản khách hàng | UC-04 | [ADR-009](architecture/adr/009-jwt-rbac.md), [domain-class](diagrams/exports/domain-class.svg) | | |
| FR-05 · Đăng nhập, xác thực và đăng xuất | UC-05, UC-06 | [ADR-009](architecture/adr/009-jwt-rbac.md), [use-case-overview](diagrams/exports/use-case-overview.svg) | | |
| FR-06 · Phân quyền và giới hạn dữ liệu | UC-05, UC-07 đến UC-12 | [ADR-009](architecture/adr/009-jwt-rbac.md), [component-api](diagrams/exports/component-api.svg) | | |
| FR-07 · Tạo đơn hàng | UC-07 | [sequence-create-order](diagrams/exports/sequence-create-order.svg), [domain-class](diagrams/exports/domain-class.svg) | | |
| FR-08 · Kiểm tra và cập nhật tồn kho | UC-07 | [ADR-003](architecture/adr/003-postgresql-transaction-migration.md), [sequence-create-order](diagrams/exports/sequence-create-order.svg) | | |
| FR-09 · Thanh toán đơn qua VNPay Sandbox | UC-08 | [ADR-004](architecture/adr/004-vnpay-sandbox-integration.md), [sequence-payment-vnpay](diagrams/exports/sequence-payment-vnpay.svg) | | |
| FR-10 · Chống xử lý trùng thanh toán | UC-08 | [ADR-005](architecture/adr/005-return-url-ipn-idempotency.md), [sequence-payment-vnpay](diagrams/exports/sequence-payment-vnpay.svg) | | |
| FR-11 · Hết hạn, thất bại, thanh toán lại và hoàn tồn | UC-08 | [ADR-006](architecture/adr/006-payment-expiry-refund-stock-retry.md), [activity-expiry](diagrams/exports/activity-expiry.svg) | | |
| FR-12 · Xem xác nhận và chi tiết đơn | UC-09 | [sequence-checkout](diagrams/exports/sequence-checkout.svg), [domain-class](diagrams/exports/domain-class.svg) | | |
| FR-13 · Xem lịch sử đơn hàng | UC-10 | [use-case-overview](diagrams/exports/use-case-overview.svg), [domain-class](diagrams/exports/domain-class.svg) | | |
| FR-14 · Xem đơn của cửa hàng | UC-11 | [ADR-009](architecture/adr/009-jwt-rbac.md), [use-case-overview](diagrams/exports/use-case-overview.svg) | | |
| FR-15 · Cập nhật trạng thái xử lý đơn | UC-12 | [use-case-overview](diagrams/exports/use-case-overview.svg), [domain-class](diagrams/exports/domain-class.svg) | | |

## Yêu cầu phi chức năng

| Mã yêu cầu | Use-case/User Story | Thiết kế / Sơ đồ | Code/API | Test |
|---|---|---|---|---|
| NFR-01 · Thời gian phản hồi | UC-01, UC-02, UC-07, UC-08, UC-11, UC-12 | [ADR-002](architecture/adr/002-modular-monolith.md), [ADR-003](architecture/adr/003-postgresql-transaction-migration.md) | | |
| NFR-02 · Bảo vệ tài khoản và JWT | UC-04 đến UC-12 | [ADR-009](architecture/adr/009-jwt-rbac.md), [ADR-010](architecture/adr/010-logging-health-config.md) | | |
| NFR-03 · Kiểm soát truy cập và dữ liệu đầu vào | UC-04 đến UC-12 | [ADR-009](architecture/adr/009-jwt-rbac.md), [component-api](diagrams/exports/component-api.svg) | | |
| NFR-04 · Bảo vệ tích hợp VNPay Sandbox | UC-08 và môi trường tích hợp | [ADR-004](architecture/adr/004-vnpay-sandbox-integration.md), [ADR-005](architecture/adr/005-return-url-ipn-idempotency.md), [ADR-008](architecture/adr/008-vnpay-payment-gateway-adapter.md) | | |
| NFR-05 · Mobile-first và PWA | Giao diện UC-01 đến UC-12 | [ADR-007](architecture/adr/007-nextjs-pwa-frontend.md), [c4-container](diagrams/exports/c4-container.svg) | | |
| NFR-06 · Phản hồi trạng thái giao diện | Giao diện UC-01 đến UC-12 | [ADR-007](architecture/adr/007-nextjs-pwa-frontend.md), [sequence-checkout](diagrams/exports/sequence-checkout.svg), [activity-expiry](diagrams/exports/activity-expiry.svg) | | |
| NFR-07 · Tái tạo môi trường | Toàn hệ thống | [ADR-001](architecture/adr/001-monorepo.md), [ADR-003](architecture/adr/003-postgresql-transaction-migration.md), [ADR-011](architecture/adr/011-production-deployment-vps-docker.md) | | |
| NFR-08 · CI/CD và triển khai | Quy trình triển khai | [ADR-011](architecture/adr/011-production-deployment-vps-docker.md), [Triển khai](deployment.md), [deployment-production](diagrams/exports/deployment-production.svg) | [CI workflow](../.github/workflows/ci.yml), [root scripts](../package.json), [API scripts](../apps/api/package.json), [web scripts](../apps/web/package.json) | [API unit tests](../apps/api/src/catalog-domain.test.mjs), [web unit tests](../apps/web/app/catalog.test.mjs), [successful CI run](https://github.com/mhien06/BrewLite_A2/actions/runs/42832518150) |
| NFR-09 · Phục hồi và nhất quán dữ liệu | UC-07, UC-08, UC-11, UC-12 | [ADR-003](architecture/adr/003-postgresql-transaction-migration.md), [ADR-006](architecture/adr/006-payment-expiry-refund-stock-retry.md), [ADR-010](architecture/adr/010-logging-health-config.md) | | |

