# ADR-002: Backend NestJS theo kiến trúc modular monolith, chia module theo domain

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-07, FR-08, FR-10, FR-11; NFR-09

## Bối cảnh
Luồng cốt lõi (tạo đơn, trừ tồn, ghi nhận thanh toán, hoàn tồn) phải **nguyên tử**: đơn, snapshot, tồn kho và trạng thái thanh toán hoặc cùng thành công hoặc cùng rollback. BrewLite chỉ phục vụ một cửa hàng, quy mô MVP khoảng 20 người dùng đồng thời (NFR-01), nhóm phát triển nhỏ.

## Quyết định
Một ứng dụng NestJS (một process, một database) chia thành module theo domain: `Auth`, `Users`, `Catalog`, `Cart`, `Orders`, `Inventory`, `Payments`, `VnpayGateway`, cùng các module hạ tầng (`Config`, `Logger`, `Health`, `Database`).

Quy tắc:
1. Mỗi module có controller – service – repository của riêng nó; module khác chỉ gọi qua service/interface được export, không truy cập repository của nhau.
2. Hướng phụ thuộc một chiều, không vòng: `Payments → Orders → Inventory/Catalog`; `Cart → Catalog`; `Auth → Users`.
3. Transaction nghiệp vụ nằm trong service điều phối (`OrderService`, `PaymentService`) và dùng chung một `EntityManager`.

## Phương án đã cân nhắc
- **Microservices (Order, Payment, Inventory riêng):** cần giao dịch phân tán/saga cho thao tác trừ và hoàn tồn, quá phức tạp so với phạm vi MVP.
- **Phân lớp theo kỹ thuật (controllers/, services/, repositories/):** dễ bắt đầu nhưng các domain lẫn vào nhau, khó thấy ranh giới và khó tách sau này.

## Hệ quả
- **Ưu điểm:** transaction ACID trong một database; triển khai đơn giản (một image API); ranh giới module rõ nên sau MVP có thể tách riêng nếu cần.
- **Hạn chế:** scale theo cả khối chứ không theo module; kỷ luật phụ thuộc giữa module phải được kiểm tra khi review (có thể thêm lint rule chặn import vòng).
