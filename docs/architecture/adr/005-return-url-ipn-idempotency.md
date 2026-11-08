# ADR-005: Return URL chỉ dùng để hiển thị; IPN đã xác minh là căn cứ duy nhất; idempotency theo `orderId` + `idempotencyKey`

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-09 đến FR-11; NFR-04, NFR-09; QD-02, QD-03; RR-04

## Bối cảnh
Khách được chuyển hướng về Web App qua Return URL sau khi thao tác trên VNPay Sandbox, nhưng tham số trên Return URL đi qua trình duyệt của khách nên có thể bị sửa hoặc giả mạo. VNPay cũng có thể gửi IPN chậm, gửi lặp lại, hoặc không gửi được tới API.

## Quyết định
- **Return URL chỉ để điều hướng/hiển thị**: khi khách quay về, trang Return URL của Web App gọi `GET /orders/{id}/payment-status` để lấy trạng thái đã được backend xác minh; không đọc tham số trên chính URL làm bằng chứng thanh toán (xem thêm ADR-007).
- **IPN hợp lệ (đã xác minh chữ ký) là căn cứ chính** để cập nhật trạng thái `Payment`; khi IPN chậm hoặc chưa tới, hệ thống chủ động dùng QueryDR để đối soát (ADR-004, ADR-008).
- **Idempotency**: mỗi yêu cầu thanh toán có `transactionRef` và `idempotencyKey` riêng, gắn với cặp (`orderId`, `idempotencyKey`). IPN đến trùng, hoặc đến sau khi `Payment` đã ở trạng thái cuối (`SUCCESS`/`FAILED`/`EXPIRED`), sẽ không được cập nhật lần hai. Ràng buộc `UNIQUE` ở tầng database cho `idempotencyKey` và `transactionRef` (ADR-003) ngăn ghi trùng ngay cả khi logic ứng dụng có sai sót.

## Phương án đã cân nhắc
- **Tin tưởng tham số trên Return URL để quyết định trạng thái đơn:** nhanh, ít việc, nhưng giả mạo được qua trình duyệt, vi phạm trực tiếp QD-03.
- **Chỉ dựa vào IPN, không dùng QueryDR đối soát:** nếu IPN không bao giờ tới, đơn hàng kẹt vĩnh viễn ở trạng thái "đang xác minh".
- **Idempotency theo khoảng thời gian (time window) thay vì khóa duy nhất:** vẫn có thể xử lý trùng khi xảy ra race condition giữa IPN và QueryDR.

## Hệ quả
- **Ưu điểm:** Chống giả mạo kết quả thanh toán qua thao tác ở trình duyệt; xử lý đúng khi IPN đến trễ, lặp hoặc mất; kịch bản kiểm thử rõ ràng (gửi IPN trùng, gửi IPN sau khi đã hết hạn, gửi IPN với chữ ký sai).
- **Hạn chế / đánh đổi:** Khách có thể thấy trạng thái "Đang xác minh" trong vài giây đến vài phút nếu IPN chậm; cần thiết kế UI/UX rõ cho trạng thái chờ này (NFR-06).
