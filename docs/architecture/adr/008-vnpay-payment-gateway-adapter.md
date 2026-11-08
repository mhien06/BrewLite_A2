# ADR-008: Tích hợp VNPay qua cổng `PaymentGateway` (mẫu port/adapter), tách khỏi `PaymentsModule`

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-09, FR-10; NFR-04, NFR-09; QD-01 đến QD-10; RR-07

## Bối cảnh
ADR-004 đã chốt VNPay Sandbox là hệ thống bên ngoài và ADR-005 đã chốt Return URL/IPN/idempotency là quyết định nghiệp vụ. Vấn đề còn lại thuộc tầng *implementation*: nên để `PaymentsModule` gọi thẳng giao thức VNPay (tham số `vnp_*`, HMAC-SHA512, nhân 100 số tiền) hay tách riêng, để nghiệp vụ không phụ thuộc chi tiết giao thức của một nhà cung cấp cụ thể.

## Quyết định
- Tạo interface `PaymentGateway` trong `PaymentsModule` với ba thao tác: tạo URL thanh toán có chữ ký, xác minh chữ ký IPN, truy vấn giao dịch (QueryDR).
- `VnpayGateway` trong **`VnpayGatewayModule`** (module riêng) là adapter duy nhất hiện thực interface này; chỉ adapter này biết định dạng tham số `vnp_*` và cách ký/xác minh của VNPay.
- `PaymentService` (trong `PaymentsModule`) chỉ gọi qua interface `PaymentGateway`, không biết giao thức cụ thể; toàn bộ quy tắc nghiệp vụ (idempotency, chuyển trạng thái, khi nào gọi QueryDR) đã quyết định ở ADR-005 và vẫn nằm trong `PaymentService`/`ReconciliationJob` (ADR-006), không nằm trong adapter.
- Endpoint IPN công khai (`@Public()`), qua HTTPS; luôn xác minh chữ ký trước khi đọc dữ liệu và phản hồi `RspCode` theo quy ước VNPay.
- `vnp_TmnCode`, hash secret và URL môi trường nằm trong biến môi trường, không đưa vào repository hay log (ADR-010).

## Phương án đã cân nhắc
- **Gọi VNPay trực tiếp trong `PaymentService`, không tách adapter:** ít file hơn nhưng khó kiểm thử (phải mock HTTP/chữ ký ngay trong test nghiệp vụ) và làm nghiệp vụ lẫn với giao thức của một nhà cung cấp cụ thể.
- **Đặt adapter trong chính `PaymentsModule` thay vì module riêng:** vẫn tách được code nhưng ranh giới dependency (module nào được phép biết giao thức VNPay) không rõ bằng khi có `VnpayGatewayModule` riêng.

## Hệ quả
- **Ưu điểm:** dễ viết unit test cho `PaymentService` bằng một `PaymentGateway` giả; đổi/thêm nhà cung cấp thanh toán sau này chỉ cần viết adapter mới (dù MVP chỉ dùng VNPay); logic xác minh giao thức tập trung ở một module.
- **Hạn chế:** thêm một lớp trừu tượng và một module; endpoint IPN cần HTTPS mà VNPay gọi tới được (môi trường local cần tunnel, rủi ro RR-07).
