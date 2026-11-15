# ADR-005: Return URL chỉ hiển thị; IPN/QueryDR được xác minh; idempotency nhiều lớp

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-15
- **Liên quan:** FR-08 đến FR-13, FR-19, FR-20; NFR-04, NFR-09

## Bối cảnh

Return URL đi qua trình duyệt nên có thể bị sửa. IPN có thể chậm, mất hoặc gửi lặp; IPN và QueryDR cũng có thể xử lý đồng thời. Một Order có thể có nhiều Payment attempt nhưng chỉ một kết quả thành công hợp lệ.

## Quyết định

- Return URL chỉ điều hướng/hiển thị; Web App đọc trạng thái đã lưu từ API, không dùng tham số Return URL để ghi `PAID`.
- Backend chỉ chấp nhận kết quả sau khi xác minh chữ ký, `transactionRef`, số tiền và response/status code. IPN và QueryDR gọi chung một hàm xử lý kết quả.
- Cùng `Idempotency-Key` và cùng payload trả lại Payment trước; cùng key nhưng khác payload trả conflict. `idempotencyKey` và `transactionRef` được bảo vệ bằng unique constraint.
- IPN/QueryDR lặp hoặc đồng thời không được trừ nguyên liệu, ghi `OrderIngredientUsage`, ghi điểm hoặc bù điểm lần hai.
- `PENDING`/`UNKNOWN` không được suy diễn thành thất bại và chặn tạo Payment mới cho đến khi đối soát.
- Payment `SUCCEEDED` hợp lệ nhưng thiếu nguyên liệu: Payment giữ `SUCCEEDED`, Order chuyển `PAYMENT_EXCEPTION`, không trừ kho, không `EARN`.
- Payment `SUCCEEDED` đến khi Order đã `CANCELLED`: Payment ghi `SUCCEEDED` nhưng không mở lại đơn, không trừ kho, không `EARN`; bù `LoyaltyTransaction(VNPAY_COMPENSATION)` đúng một lần sau khi kiểm tra `VNPayRefundRecord`.

## Phương án đã cân nhắc

- Tin Return URL: bị loại vì có thể giả mạo.
- Chỉ dựa vào IPN: bị loại vì mất IPN làm đơn kẹt.
- Idempotency theo time window: không chống được race condition.

## Hệ quả

- **Ưu điểm:** an toàn với callback trùng/mất/đến muộn; hiệu ứng kho và điểm đúng một lần.
- **Hạn chế:** khách có thể thấy trạng thái đang xác minh; cần QueryDR và UI phân biệt `PENDING`/`UNKNOWN`.
