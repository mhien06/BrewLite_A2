# Đặc tả Use Case đặt và thanh toán đơn hàng – BrewLite

## 1. Actor và các Use Case

**Ranh giới hệ thống:** HỆ THỐNG BREWLITE. Hệ thống phục vụ một cửa hàng; khách đặt đồ uống trực tuyến, thanh toán thử nghiệm qua VNPay Sandbox và nhận tại quầy. VNPay Sandbox là dịch vụ bên ngoài, không xử lý tiền thật.

| Mã | Actor | Vai trò |
|---|---|---|
| ACT-01 | Khách hàng | Đặt đơn từ giỏ hàng, khởi tạo thanh toán, xem kết quả và trạng thái đơn của mình. |
| ACT-04 | VNPay Sandbox | Cung cấp trang thanh toán thử nghiệm, chuyển khách về BrewLite và gửi thông báo kết quả thanh toán cho backend. |

Nhân viên quầy và quản lý cửa hàng chỉ xử lý đơn sau khi hệ thống đã xác nhận thanh toán; không trực tiếp tham gia hai Use Case này.

| Mã | Use Case | Quan hệ trên sơ đồ |
|---|---|---|
| UC-07 | Đặt đơn | ACT-01 khởi tạo. |
| UC-07.1 | Kiểm tra yêu cầu đặt đơn | UC-07 `<<include>>` UC-07.1. |
| UC-07.2 | Tính lại giá và kiểm tra tồn | UC-07 `<<include>>` UC-07.2. |
| UC-07.3 | Tạo đơn và trừ tồn | UC-07 `<<include>>` UC-07.3. |
| UC-08 | Thanh toán đơn | ACT-01 khởi tạo; ACT-04 tham gia. |
| UC-08.1 | Kiểm tra yêu cầu thanh toán | UC-08 `<<include>>` UC-08.1. |
| UC-08.2 | Khởi tạo thanh toán VNPay | UC-08 `<<include>>` UC-08.2. |
| UC-08.3 | Xác minh và ghi nhận kết quả thanh toán | UC-08 `<<include>>` UC-08.3; có thể hoàn tất bất đồng bộ sau khi khách rời trang. |
| UC-08.4 | Hủy đơn và hoàn tồn | `<<extend>>` UC-08 khi đã đủ điều kiện hủy; được UC-08.5 gọi khi đơn hết hạn và được xác định có thể hủy. |
| UC-08.5 | Xử lý đơn hết hạn | Xử lý nội bộ khi đạt mốc 15 phút; chỉ `<<include>>` UC-08.4 ở nhánh đủ điều kiện hủy. |

UC-08.5 có thể được kích hoạt tự động, không đòi hỏi khách hàng thao tác. Các bước Return URL, IPN, xác thực chữ ký và đối soát thuộc hành vi bên trong UC-08, không phải Use Case độc lập trên sơ đồ.

**Tài liệu sơ đồ:** `docs/diagrams/sources/use-case-checkout.drawio` và `docs/diagrams/exports/use-case-checkout.svg`.

## 2. UC-07 – Đặt đơn

### 2.1. Thông tin chung

| Thuộc tính | Nội dung |
|---|---|
| Actor chính | ACT-01 – Khách hàng |
| Trigger | Khách hàng chọn **Đặt đơn** từ giỏ hàng. |
| Tiền điều kiện | Giỏ hàng có ít nhất một dòng sản phẩm; dịch vụ hệ thống sẵn sàng. Quyền đăng nhập được kiểm tra khi tiếp nhận yêu cầu. |
| Hậu điều kiện thành công | Đơn **Chờ thanh toán** được tạo, lưu snapshot sản phẩm/tùy chọn/giá; tồn kho theo Product được trừ đúng một lần; hạn khởi tạo thanh toán là 15 phút kể từ khi tạo đơn. |
| Hậu điều kiện thất bại | Không tạo đơn không hoàn chỉnh và không trừ tồn một phần. |
| Yêu cầu liên quan | FR-06, FR-07, FR-08; NFR-03, NFR-09. |

### 2.2. Luồng chính

1. Khách hàng chọn đặt đơn từ giỏ hàng.
2. BrewLite kiểm tra phiên đăng nhập và vai trò Khách hàng (UC-07.1).
3. BrewLite kiểm tra giỏ hàng không rỗng, Product, size, topping và số lượng hợp lệ (UC-07.1).
4. Backend lấy giá hiện hành, tính lại đơn giá/tùy chọn/tổng tiền, không tin tổng tiền do client gửi (UC-07.2).
5. Backend cộng số lượng theo từng Product, kiểm tra đủ tồn cho toàn bộ đơn (UC-07.2).
6. Trong một giao dịch dữ liệu nguyên tử, BrewLite lưu đơn và các dòng snapshot, đồng thời trừ tồn theo Product (UC-07.3).
7. BrewLite đặt đơn ở **Chờ thanh toán**, ghi thời điểm tạo và hạn khởi tạo thanh toán sau 15 phút.
8. BrewLite trả mã đơn, chi tiết, tổng tiền chính thức, trạng thái và hạn thanh toán.
9. Khách hàng có thể chọn UC-08 để thanh toán đơn.

### 2.3. Luồng thay thế và ngoại lệ

| Mã | Điều kiện | Xử lý |
|---|---|---|
| UC-07-A01 | Chưa đăng nhập, phiên không hợp lệ hoặc sai vai trò | Từ chối; yêu cầu đăng nhập phù hợp; không tạo đơn, không trừ tồn. |
| UC-07-A02 | Giỏ trống, Product/size/topping/số lượng không hợp lệ | Thông báo dữ liệu cần điều chỉnh; không tạo đơn. |
| UC-07-A03 | Không đủ tồn của ít nhất một Product | Từ chối toàn bộ đơn; không trừ tồn của bất kỳ Product nào. |
| UC-07-A04 | Tranh chấp tồn kho hoặc lỗi lưu dữ liệu | Rollback toàn bộ giao dịch dữ liệu; không để lại đơn hoặc tồn kho cập nhật một phần. |

### 2.4. Dữ liệu vào và ra

| Loại | Nội dung |
|---|---|
| Đầu vào | Phiên/JWT; các dòng giỏ gồm Product, size, topping và số lượng. |
| Đầu ra thành công | Mã đơn, snapshot các dòng, tổng tiền, trạng thái **Chờ thanh toán**, thời điểm tạo và hạn thanh toán. |
| Đầu ra lỗi | Thông báo hợp lệ, không tiết lộ dữ liệu đơn của người khác. |

## 3. UC-08 – Thanh toán đơn qua VNPay Sandbox

### 3.1. Thông tin chung

| Thuộc tính | Nội dung |
|---|---|
| Actor chính | ACT-01 – Khách hàng |
| Actor hỗ trợ | ACT-04 – VNPay Sandbox |
| Trigger | Khách hàng chọn **Thanh toán đơn** của mình. |
| Tiền điều kiện | Đơn tồn tại, đang **Chờ thanh toán** và còn trong hạn khởi tạo thanh toán 15 phút; khách đã đăng nhập và là chủ đơn. |
| Hậu điều kiện thành công | Kết quả VNPay được backend xác minh hợp lệ; thanh toán **Thành công**, đơn **Đã thanh toán**; không hoàn tồn. |
| Hậu điều kiện chưa xác định | Thanh toán **Chờ xử lý/Chờ xác minh**; không tự xác nhận thành công, không hủy và hoàn tồn khi còn khả năng giao dịch đang xử lý. |
| Hậu điều kiện thất bại | Khi thất bại đã được xác minh và đủ điều kiện hủy, đơn **Đã hủy**, tồn kho hoàn đúng một lần. |
| Yêu cầu liên quan | FR-06, FR-09, FR-10, FR-11; NFR-04, NFR-06, NFR-09. |

### 3.2. Luồng chính – thanh toán thành công

1. Khách hàng chọn thanh toán cho đơn đã tạo.
2. Client gửi mã đơn và khóa chống gửi lặp (`idempotency key`) đến BrewLite.
3. BrewLite kiểm tra đăng nhập, quyền sở hữu, trạng thái đơn, thời hạn 15 phút và khóa chống gửi lặp (UC-08.1).
4. BrewLite ghi nhận một lần thanh toán **Chờ xử lý**, tạo mã tham chiếu giao dịch duy nhất, số tiền từ đơn và URL thanh toán VNPay Sandbox theo cấu hình tích hợp (UC-08.2).
5. BrewLite trả URL và chuyển khách sang trang thanh toán VNPay Sandbox.
6. Khách thực hiện giao dịch thử nghiệm trên VNPay Sandbox.
7. VNPay có thể chuyển trình duyệt về Return URL của BrewLite; giao diện chỉ hiển thị kết quả đã được backend xác minh hoặc **Đang xác minh**, không tin riêng tham số URL.
8. VNPay gửi thông báo kết quả IPN đến backend BrewLite. Backend xác thực chữ ký, đối chiếu mã tham chiếu, mã đơn, số tiền và trạng thái giao dịch (UC-08.3).
9. Khi kết quả thành công hợp lệ, BrewLite ghi nhận thanh toán **Thành công** và chuyển đơn sang **Đã thanh toán** một lần, nhất quán với dữ liệu tồn kho.
10. BrewLite phản hồi IPN theo quy ước tích hợp VNPay và cho phép khách xem trạng thái đã xác nhận trên trang đơn.

Việc khách quay về Return URL và việc backend nhận IPN là hai sự kiện độc lập; chúng không nhất thiết đến theo thứ tự trên. Nếu IPN đến trước, hệ thống lưu kết quả để trang đơn hiển thị; nếu Return URL đến trước, trang đơn có thể hiển thị **Đang xác minh**.

### 3.3. Dữ liệu vào và ra

| Loại | Nội dung |
|---|---|
| Đầu vào từ khách | Phiên/JWT, mã đơn, `idempotency key`. |
| Dữ liệu khởi tạo | Mã tham chiếu duy nhất, tổng tiền chính thức, thông tin đơn và URL VNPay Sandbox. |
| Dữ liệu xác minh | Thông báo VNPay, chữ ký, mã tham chiếu, số tiền, mã kết quả và dữ liệu đối chiếu nội bộ. |
| Đầu ra | URL chuyển hướng; trạng thái thanh toán và đơn được backend xác nhận hoặc trạng thái chờ xác minh. |

## 4. Luồng thay thế và ngoại lệ

| Mã | Trường hợp | Hành vi BrewLite |
|---|---|---|
| UC-08-A01 | Chưa đăng nhập/JWT hết hạn | Từ chối khởi tạo thanh toán, không tạo giao dịch. |
| UC-08-A02 | Không phải chủ đơn | Từ chối truy cập, không lộ dữ liệu đơn. |
| UC-08-A03 | Đơn đã thanh toán hoặc đã hủy | Không khởi tạo thanh toán mới; trả trạng thái phù hợp. |
| UC-08-A04 | Đơn hết hạn trước khi khởi tạo thanh toán | Không tạo URL VNPay; chuyển sang UC-08.5 để kiểm tra điều kiện hủy. |
| UC-08-A05 | Mã đơn hoặc khóa chống gửi lặp không hợp lệ | Từ chối và thông báo lỗi đầu vào. |
| UC-08-A06 | Cùng khóa, cùng nội dung gửi lại | Trả lần xử lý/URL hoặc kết quả đã lưu nếu còn phù hợp; không tạo giao dịch mới. |
| UC-08-A07 | Cùng khóa nhưng khác đơn hoặc nội dung | Từ chối do xung đột, không thay đổi đơn. |
| UC-08-A08 | Nhiều yêu cầu đồng thời hoặc IPN gửi lặp | Chỉ một lần xử lý được ghi nhận; các lần lặp không cập nhật trạng thái/tồn kho lần hai. |
| UC-08-A09 | VNPay xác nhận giao dịch thất bại | Ghi nhận **Thất bại**; nếu không có giao dịch thành công hoặc chưa xác định cần đối soát, hủy đơn và hoàn tồn đúng một lần (UC-08.4). |
| UC-08-A10 | Hết hạn và kết quả VNPay đến đồng thời | Kiểm soát cập nhật nguyên tử; không cho phép vừa **Đã thanh toán** vừa **Đã hủy/đã hoàn tồn**. Trường hợp xung đột được giữ để đối soát. |
| UC-08-A11 | Đóng trình duyệt, Return URL không đến, IPN chậm, lỗi mạng | Giữ **Chờ xử lý/Chờ xác minh**, không suy diễn thất bại; thực hiện tra cứu/đối soát trước quyết định cuối cùng. |
| UC-08-A12 | IPN sai chữ ký, sai số tiền hoặc sai tham chiếu | Không xác nhận thanh toán; ghi nhận lỗi an toàn và phản hồi theo quy ước VNPay. |
| UC-08-A13 | Return URL thể hiện thành công nhưng backend chưa xác minh | Hiển thị **Đang xác minh**, không tự chuyển đơn sang **Đã thanh toán**. |

### 4.1. UC-08.5 – Xử lý đơn hết hạn

- **Trigger:** BrewLite phát hiện đã qua 15 phút kể từ lúc tạo đơn.
- **Điều kiện:** Đơn còn **Chờ thanh toán**.
- **Luồng xử lý:** (1) Kiểm tra lại trạng thái đơn và các lần thanh toán. (2) Nếu chưa có giao dịch đang xử lý/chưa xác định và không có kết quả thành công, thực hiện UC-08.4: hủy đơn và hoàn tồn một lần. (3) Nếu giao dịch đã khởi tạo nhưng chưa rõ kết quả, giữ chờ xác minh và đối soát với VNPay trước khi quyết định. (4) Nếu đã thanh toán, không hủy và không hoàn tồn.
- **Bảo đảm:** Việc chạy lại tác vụ hết hạn không hoàn tồn nhiều lần; nếu thao tác dữ liệu thất bại thì rollback phần chưa commit.

## 5. Trạng thái và quy tắc nghiệp vụ

### 5.1. Trạng thái đơn hàng

| Trạng thái ban đầu | Sự kiện | Trạng thái tiếp theo | Tồn kho |
|---|---|---|---|
| Chưa có đơn | UC-07 thành công | **Chờ thanh toán** | Trừ theo Product một lần. |
| Chờ thanh toán | VNPay thành công đã xác minh | **Đã thanh toán** | Giữ nguyên số lượng đã trừ. |
| Chờ thanh toán | VNPay thất bại đã xác minh và đủ điều kiện hủy | **Đã hủy** | Hoàn đúng một lần. |
| Chờ thanh toán | Quá 15 phút, không có giao dịch cần xác minh | **Đã hủy** | Hoàn đúng một lần. |
| Chờ thanh toán | Giao dịch đã khởi tạo, chưa rõ kết quả | **Chờ thanh toán** (thanh toán đang xác minh) | Chưa hoàn tồn. |
| Đã thanh toán | Nhân viên xử lý đơn | **Đang chuẩn bị → Sẵn sàng nhận → Hoàn tất** | Không thay đổi bởi checkout. |

### 5.2. Trạng thái thanh toán

| Trạng thái | Ý nghĩa |
|---|---|
| **Chờ xử lý/Chờ xác minh** | Đã khởi tạo giao dịch nhưng chưa có kết quả cuối cùng đáng tin cậy. |
| **Thành công** | Kết quả VNPay đã được backend xác minh và đối chiếu hợp lệ. |
| **Thất bại** | Kết quả thất bại đã được xác minh hợp lệ. |

Đơn hết hạn trước khi khởi tạo thanh toán có thể không có bản ghi thanh toán. Trạng thái thanh toán được lưu riêng với trạng thái đơn.

### 5.3. Quy tắc áp dụng

1. Khách phải đăng nhập và chỉ được đặt/thanh toán đơn của mình.
2. Backend tính lại giá, kiểm tra tồn theo Product; tạo đơn và trừ tồn phải nguyên tử.
3. Hạn 15 phút là hạn **khởi tạo thanh toán**; không đồng nghĩa kết quả VNPay đang chờ sẽ bị coi là thất bại.
4. Không dùng Return URL làm bằng chứng duy nhất để xác nhận thanh toán; kết quả phải được backend xác minh qua thông báo hợp lệ và cơ chế đối soát khi cần.
5. Yêu cầu khởi tạo lặp và IPN lặp không tạo giao dịch hoặc cập nhật tồn kho trùng.
6. Chỉ hủy và hoàn tồn khi đủ căn cứ; hoàn tồn tối đa một lần. Không để đơn đồng thời ở trạng thái đã thanh toán và đã hủy.
7. MVP không xử lý hoàn tiền, khách tự hủy đơn đã thanh toán, giao hàng, nhiều cửa hàng hoặc giao dịch tiền thật.

## 6. Ma trận truy vết

| Use Case/luồng | Yêu cầu liên quan | Nội dung kiểm chứng |
|---|---|---|
| UC-07, UC-07.1 | FR-06, FR-07; NFR-03 | Xác thực, giỏ hàng và tùy chọn hợp lệ. |
| UC-07.2 | FR-07, FR-08 | Tính lại giá, cộng số lượng và kiểm tra tồn. |
| UC-07.3 | FR-07, FR-08; NFR-09 | Tạo đơn, snapshot, trừ tồn nguyên tử. |
| UC-08, UC-08.1 | FR-06, FR-09, FR-10 | Quyền sở hữu, trạng thái đơn, hạn 15 phút, chống gửi lặp. |
| UC-08.2 | FR-09, FR-10; NFR-04 | Tạo URL VNPay Sandbox, mã tham chiếu, số tiền và cấu hình an toàn. |
| UC-08.3 | FR-09, FR-10; NFR-04, NFR-09 | IPN hợp lệ, chữ ký, đối chiếu, Return URL và cập nhật đúng một lần. |
| UC-08.4 | FR-11; NFR-09 | Hủy hợp lệ và hoàn tồn đúng một lần. |
| UC-08.5 | FR-11; NFR-09 | Hết hạn 15 phút, phân biệt chưa khởi tạo và đang xác minh. |
| UC-08-A01 đến A08 | FR-06, FR-09, FR-10 | Sai quyền, sai trạng thái, khóa trùng, yêu cầu đồng thời. |
| UC-08-A09 đến A13 | FR-09, FR-10, FR-11; NFR-04, NFR-06, NFR-09 | Thất bại, phản hồi chậm, IPN không hợp lệ, kết quả chưa xác định. |

**Phạm vi đối chiếu:** Một cửa hàng; đặt online, nhận tại quầy; thanh toán thử nghiệm VNPay Sandbox; các actor và tên Use Case nhất quán với SRS và sơ đồ checkout.
