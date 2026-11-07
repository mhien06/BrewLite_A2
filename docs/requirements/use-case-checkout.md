# Đặc tả Use Case đặt và thanh toán đơn hàng – BrewLite

## 1. Actor và các Use Case

**Ranh giới hệ thống:** HỆ THỐNG BREWLITE. Hệ thống phục vụ một cửa hàng; khách đặt đồ uống trực tuyến, thanh toán thử nghiệm qua VNPay Sandbox và nhận tại quầy. VNPay Sandbox đóng vai trò **Payment Service mô phỏng bên ngoài**, không xử lý tiền thật và không thuộc phạm vi triển khai của BrewLite.

| Mã | Actor | Vai trò |
|---|---|---|
| ACT-01 | Khách hàng | Đặt đơn từ giỏ hàng, khởi tạo thanh toán, xem kết quả và trạng thái đơn của mình. |
| ACT-04 | VNPay Sandbox | Payment Service mô phỏng cung cấp trang thanh toán thử nghiệm, chuyển khách về BrewLite và gửi thông báo kết quả thanh toán cho backend. |

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
| UC-08.4 | Xử lý thất bại hoặc hết hạn và hoàn tồn | `<<extend>>` UC-08 khi giao dịch thất bại hoặc yêu cầu thanh toán hết hạn đã được xác minh. |
| UC-08.5 | Thanh toán lại | `<<extend>>` UC-08 khi lần thanh toán trước đã thất bại/hết hạn, đơn vẫn **Chờ thanh toán** và không còn giao dịch cần xác minh. |

UC-08.4 được hệ thống kích hoạt sau khi có kết quả đủ tin cậy. UC-08.5 do khách hàng khởi tạo; trước khi tạo yêu cầu VNPay mới, BrewLite tính lại tổng tiền, kiểm tra và giữ/trừ lại tồn kho. Các bước Return URL, IPN, xác thực chữ ký và đối soát thuộc hành vi bên trong UC-08, không phải Use Case độc lập trên sơ đồ.

**Tài liệu sơ đồ:** `docs/diagrams/sources/use-case-checkout.drawio` và `docs/diagrams/exports/use-case-checkout.svg`.

## 2. UC-07 – Đặt đơn

### 2.1. Thông tin chung

| Thuộc tính | Nội dung |
|---|---|
| Actor chính | ACT-01 – Khách hàng |
| Trigger | Khách hàng chọn **Đặt đơn** từ giỏ hàng. |
| Tiền điều kiện | Giỏ hàng có ít nhất một dòng sản phẩm; dịch vụ hệ thống sẵn sàng. Quyền đăng nhập được kiểm tra khi tiếp nhận yêu cầu. |
| Hậu điều kiện thành công | Đơn **Chờ thanh toán** được tạo, lưu snapshot sản phẩm/tùy chọn/giá; tồn kho theo Product được trừ đúng một lần. Thời hạn thanh toán chỉ bắt đầu khi một yêu cầu thanh toán VNPay được tạo. |
| Hậu điều kiện thất bại | Không tạo đơn không hoàn chỉnh và không trừ tồn một phần. |
| Yêu cầu liên quan | FR-06, FR-07, FR-08; NFR-03, NFR-09. |

### 2.2. Luồng chính

1. Khách hàng chọn đặt đơn từ giỏ hàng.
2. BrewLite kiểm tra phiên đăng nhập và vai trò Khách hàng (UC-07.1).
3. BrewLite kiểm tra giỏ hàng không rỗng, Product, size, topping và số lượng hợp lệ (UC-07.1).
4. Backend lấy giá hiện hành, tính lại đơn giá/tùy chọn/tổng tiền, không tin tổng tiền do client gửi (UC-07.2).
5. Backend cộng số lượng theo từng Product, kiểm tra đủ tồn cho toàn bộ đơn (UC-07.2).
6. Trong một giao dịch dữ liệu nguyên tử, BrewLite lưu đơn và các dòng snapshot, đồng thời trừ tồn theo Product (UC-07.3).
7. BrewLite đặt đơn ở **Chờ thanh toán** và ghi thời điểm tạo đơn.
8. BrewLite trả mã đơn, chi tiết, tổng tiền chính thức và trạng thái đơn.
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
| Đầu ra thành công | Mã đơn, snapshot các dòng, tổng tiền, trạng thái **Chờ thanh toán** và thời điểm tạo đơn. |
| Đầu ra lỗi | Thông báo hợp lệ, không tiết lộ dữ liệu đơn của người khác. |

## 3. UC-08 – Thanh toán đơn qua VNPay Sandbox

### 3.1. Thông tin chung

| Thuộc tính | Nội dung |
|---|---|
| Actor chính | ACT-01 – Khách hàng |
| Actor hỗ trợ | ACT-04 – VNPay Sandbox |
| Trigger | Khách hàng chọn **Thanh toán đơn** của mình. |
| Tiền điều kiện | Đơn tồn tại và đang **Chờ thanh toán**; khách đã đăng nhập và là chủ đơn; không có giao dịch **Chờ xử lý/Chờ xác minh**. Nếu thanh toán lại, lần trước phải được xác minh là **Thất bại/Hết hạn**. |
| Hậu điều kiện thành công | Kết quả VNPay được backend xác minh hợp lệ; thanh toán **Thành công**, đơn **Đã thanh toán**; không hoàn tồn. |
| Hậu điều kiện chưa xác định | Thanh toán **Chờ xử lý/Chờ xác minh**; không tự xác nhận thành công, không hoàn tồn và không cho thanh toán lại khi còn khả năng giao dịch đang xử lý. |
| Hậu điều kiện thất bại/hết hạn | Khi thất bại hoặc hết hạn đã được xác minh, tồn kho được hoàn đúng một lần; đơn vẫn **Chờ thanh toán** để khách có thể thử lại. |
| Yêu cầu liên quan | FR-06, FR-09, FR-10, FR-11; NFR-04, NFR-06, NFR-09. |

### 3.2. Luồng chính – thanh toán thành công

1. Khách hàng chọn thanh toán cho đơn đã tạo.
2. Client gửi mã đơn và khóa chống gửi lặp (`idempotency key`) đến BrewLite.
3. BrewLite kiểm tra đăng nhập, quyền sở hữu, trạng thái đơn, khóa chống gửi lặp và bảo đảm không có giao dịch đang chờ/chưa xác định (UC-08.1).
4. Nếu đây là lần thanh toán lại, BrewLite tính lại tổng tiền, kiểm tra tồn và giữ/trừ lại tồn kho trong một giao dịch dữ liệu nguyên tử (UC-08.5). Ở lần đầu, tồn kho đã được trừ khi tạo đơn.
5. BrewLite ghi nhận một yêu cầu thanh toán **Chờ xử lý**, tạo mã tham chiếu duy nhất, số tiền chính thức, thời hạn 15 phút kể từ lúc tạo yêu cầu và URL VNPay Sandbox (UC-08.2).
6. BrewLite trả URL và chuyển khách sang trang thanh toán VNPay Sandbox.
7. Khách thực hiện giao dịch thử nghiệm trên VNPay Sandbox.
8. VNPay có thể chuyển trình duyệt về Return URL của BrewLite; giao diện chỉ hiển thị kết quả đã được backend xác minh hoặc **Đang xác minh**, không tin riêng tham số URL.
9. VNPay gửi thông báo kết quả IPN đến backend BrewLite. Backend xác thực chữ ký, đối chiếu mã tham chiếu, mã đơn, số tiền và trạng thái giao dịch (UC-08.3).
10. Khi kết quả thành công hợp lệ, BrewLite ghi nhận thanh toán **Thành công** và chuyển đơn sang **Đã thanh toán** một lần, nhất quán với dữ liệu tồn kho.
11. BrewLite phản hồi IPN theo quy ước tích hợp VNPay và cho phép khách xem trạng thái đã xác nhận trên trang đơn.

Việc khách quay về Return URL và việc backend nhận IPN là hai sự kiện độc lập; chúng không nhất thiết đến theo thứ tự trên. Nếu IPN đến trước, hệ thống lưu kết quả để trang đơn hiển thị; nếu Return URL đến trước, trang đơn có thể hiển thị **Đang xác minh**.

### 3.3. Dữ liệu vào và ra

| Loại | Nội dung |
|---|---|
| Đầu vào từ khách | Phiên/JWT, mã đơn, `idempotency key`. |
| Dữ liệu khởi tạo | Mã tham chiếu duy nhất, tổng tiền chính thức, thời điểm tạo, thời hạn 15 phút, thông tin đơn và URL VNPay Sandbox. |
| Dữ liệu xác minh | Thông báo VNPay, chữ ký, mã tham chiếu, số tiền, mã kết quả và dữ liệu đối chiếu nội bộ. |
| Đầu ra | URL chuyển hướng; trạng thái thanh toán và đơn được backend xác nhận hoặc trạng thái chờ xác minh. |

## 4. Luồng thay thế và ngoại lệ

| Mã | Trường hợp | Hành vi BrewLite |
|---|---|---|
| UC-08-A01 | Chưa đăng nhập/JWT hết hạn | Từ chối khởi tạo thanh toán, không tạo giao dịch. |
| UC-08-A02 | Không phải chủ đơn | Từ chối truy cập, không lộ dữ liệu đơn. |
| UC-08-A03 | Đơn đã thanh toán | Không khởi tạo thanh toán mới; trả trạng thái phù hợp. |
| UC-08-A04 | Lần thanh toán trước đã thất bại/hết hạn | Hoàn tồn đúng một lần theo UC-08.4; đơn vẫn **Chờ thanh toán** và có thể thực hiện UC-08.5. |
| UC-08-A05 | Mã đơn hoặc khóa chống gửi lặp không hợp lệ | Từ chối và thông báo lỗi đầu vào. |
| UC-08-A06 | Cùng khóa, cùng nội dung gửi lại | Trả lần xử lý/URL hoặc kết quả đã lưu nếu còn phù hợp; không tạo giao dịch mới. |
| UC-08-A07 | Cùng khóa nhưng khác đơn hoặc nội dung | Từ chối do xung đột, không thay đổi đơn. |
| UC-08-A08 | Nhiều yêu cầu đồng thời hoặc IPN gửi lặp | Chỉ một lần xử lý được ghi nhận; các lần lặp không cập nhật trạng thái/tồn kho lần hai. |
| UC-08-A09 | VNPay xác nhận giao dịch thất bại | Ghi nhận **Thất bại**, hoàn tồn đúng một lần; giữ đơn **Chờ thanh toán** để khách có thể thử lại (UC-08.4). |
| UC-08-A10 | Yêu cầu hết hạn và kết quả VNPay đến đồng thời | Kiểm soát cập nhật nguyên tử: thành công hợp lệ thì chuyển đơn sang **Đã thanh toán** và không hoàn tồn; thất bại/hết hạn đã xác minh thì hoàn tồn đúng một lần và giữ đơn **Chờ thanh toán**. Trường hợp chưa đủ căn cứ được giữ để đối soát. |
| UC-08-A11 | Đóng trình duyệt, Return URL không đến, IPN chậm, lỗi mạng | Giữ **Chờ xử lý/Chờ xác minh**, không suy diễn thất bại; thực hiện tra cứu/đối soát trước quyết định cuối cùng. |
| UC-08-A12 | IPN sai chữ ký, sai số tiền hoặc sai tham chiếu | Không xác nhận thanh toán; ghi nhận lỗi an toàn và phản hồi theo quy ước VNPay. |
| UC-08-A13 | Return URL thể hiện thành công nhưng backend chưa xác minh | Hiển thị **Đang xác minh**, không tự chuyển đơn sang **Đã thanh toán**. |
| UC-08-A14 | Thanh toán lại nhưng không đủ tồn | Không giữ/trừ tồn và không tạo yêu cầu VNPay mới; đơn vẫn **Chờ thanh toán** để khách điều chỉnh hoặc thử lại sau. |

### 4.1. UC-08.4 – Xử lý thất bại hoặc hết hạn và hoàn tồn

- **Trigger:** Giao dịch được xác minh là thất bại, hoặc đã qua 15 phút kể từ lúc tạo yêu cầu thanh toán và backend xác định yêu cầu hết hạn.
- **Điều kiện:** Đơn còn **Chờ thanh toán**; chưa có kết quả thành công hợp lệ; không còn giao dịch đang chờ/chưa xác định cần đối soát.
- **Luồng xử lý:** (1) Khóa và đọc lại đơn, giao dịch, tồn kho. (2) Kiểm tra kết quả VNPay trước khi thay đổi dữ liệu. (3) Ghi nhận lần thanh toán **Thất bại/Hết hạn**. (4) Hoàn đúng lượng tồn đã giữ cho lần thanh toán đó, tối đa một lần. (5) Giữ đơn ở **Chờ thanh toán** và không tự tạo yêu cầu mới.
- **Bảo đảm:** Xử lý lặp không hoàn tồn lần hai; các cập nhật giao dịch và tồn kho commit/rollback cùng nhau.

### 4.2. UC-08.5 – Thanh toán lại

- **Trigger:** Khách hàng chọn thanh toán lại sau khi lần trước đã được xác minh là **Thất bại/Hết hạn**.
- **Điều kiện:** Đơn còn **Chờ thanh toán**; khách là chủ đơn; không có giao dịch **Chờ xử lý/Chờ xác minh**; tồn của lần trước đã được hoàn đúng một lần.
- **Luồng xử lý:** (1) Tính lại tổng tiền theo dữ liệu hiện hành. (2) Kiểm tra tồn kho. (3) Nếu đủ tồn, giữ/trừ lại tồn trong giao dịch dữ liệu nguyên tử. (4) Tạo yêu cầu VNPay mới với `idempotency key`, mã tham chiếu và thời hạn 15 phút mới. (5) Trả URL để khách tiếp tục thanh toán. Nếu không đủ tồn, không tạo yêu cầu mới.
- **Bảo đảm:** Mỗi lần thử có mã tham chiếu và thời hạn riêng; lỗi tạo yêu cầu mới rollback phần giữ/trừ tồn chưa commit.

## 5. Trạng thái và quy tắc nghiệp vụ

### 5.1. Trạng thái đơn hàng

| Trạng thái ban đầu | Sự kiện | Trạng thái tiếp theo | Tồn kho |
|---|---|---|---|
| Chưa có đơn | UC-07 thành công | **Chờ thanh toán** | Trừ theo Product một lần. |
| Chờ thanh toán | VNPay thành công đã xác minh | **Đã thanh toán** | Giữ nguyên số lượng đã trừ. |
| Chờ thanh toán | VNPay thất bại đã xác minh | **Chờ thanh toán** | Hoàn đúng một lần. |
| Chờ thanh toán | Yêu cầu thanh toán hết 15 phút và đã được xác minh hết hạn | **Chờ thanh toán** | Hoàn đúng một lần. |
| Chờ thanh toán | Giao dịch đã khởi tạo, chưa rõ kết quả | **Chờ thanh toán** (thanh toán đang xác minh) | Chưa hoàn tồn. |
| Chờ thanh toán | Thanh toán lại, dữ liệu hợp lệ và đủ tồn | **Chờ thanh toán** | Giữ/trừ lại tồn; tạo yêu cầu VNPay mới. |
| Chờ thanh toán | Thanh toán lại nhưng không đủ tồn | **Chờ thanh toán** | Không thay đổi tồn; không tạo yêu cầu mới. |
| Đã thanh toán | Nhân viên xử lý đơn | **Đang chuẩn bị → Sẵn sàng nhận → Hoàn tất** | Không thay đổi bởi checkout. |

### 5.2. Trạng thái thanh toán

| Trạng thái | Ý nghĩa |
|---|---|
| **Chờ xử lý/Chờ xác minh** | Đã khởi tạo giao dịch nhưng chưa có kết quả cuối cùng đáng tin cậy. |
| **Thành công** | Kết quả VNPay đã được backend xác minh và đối chiếu hợp lệ. |
| **Thất bại** | Kết quả thất bại đã được xác minh hợp lệ. |
| **Hết hạn** | Yêu cầu đã qua 15 phút kể từ lúc tạo và backend đã kiểm tra, xác định không có kết quả thành công hợp lệ. |

Mỗi yêu cầu thanh toán có mã tham chiếu và thời hạn riêng. Trạng thái thanh toán được lưu riêng với trạng thái đơn.

### 5.3. Quy tắc áp dụng

1. Khách phải đăng nhập và chỉ được đặt/thanh toán đơn của mình.
2. Backend tính lại giá, kiểm tra tồn theo Product; tạo đơn và trừ tồn phải nguyên tử.
3. Mỗi yêu cầu thanh toán có thời hạn 15 phút kể từ lúc được tạo; thời hạn không tính từ lúc tạo đơn.
4. Khi thất bại/hết hạn đã được xác minh, hoàn tồn tối đa một lần nhưng giữ đơn **Chờ thanh toán** để có thể thử lại.
5. Khi giao dịch còn **Chờ xử lý/Chờ xác minh**, không hoàn tồn và không tạo yêu cầu thanh toán mới cho đến khi hoàn tất xác minh.
6. Khi thanh toán lại, backend tính lại tổng tiền, kiểm tra và giữ/trừ lại tồn; yêu cầu mới có `idempotency key`, mã tham chiếu và thời hạn mới.
7. Không dùng Return URL làm bằng chứng duy nhất để xác nhận thanh toán; kết quả phải được backend xác minh qua thông báo hợp lệ và cơ chế đối soát khi cần.
8. Yêu cầu khởi tạo lặp và IPN lặp không tạo giao dịch hoặc cập nhật tồn kho trùng.
9. MVP không xử lý hoàn tiền, khách tự hủy đơn đã thanh toán, giao hàng, nhiều cửa hàng hoặc giao dịch tiền thật.

## 6. Ma trận truy vết

| Use Case/luồng | Yêu cầu liên quan | Nội dung kiểm chứng |
|---|---|---|
| UC-07, UC-07.1 | FR-06, FR-07; NFR-03 | Xác thực, giỏ hàng và tùy chọn hợp lệ. |
| UC-07.2 | FR-07, FR-08 | Tính lại giá, cộng số lượng và kiểm tra tồn. |
| UC-07.3 | FR-07, FR-08; NFR-09 | Tạo đơn, snapshot, trừ tồn nguyên tử. |
| UC-08, UC-08.1 | FR-06, FR-09, FR-10, FR-11 | Quyền sở hữu, trạng thái đơn, điều kiện thanh toán/thanh toán lại và chống gửi lặp. |
| UC-08.2 | FR-09, FR-10, FR-11; NFR-04 | Tạo URL VNPay Sandbox, mã tham chiếu, số tiền và thời hạn 15 phút cho từng yêu cầu. |
| UC-08.3 | FR-09, FR-10, FR-11; NFR-04, NFR-09 | IPN hợp lệ, chữ ký, đối chiếu, Return URL và cập nhật đúng một lần. |
| UC-08.4 | FR-11; NFR-09 | Xử lý thất bại/hết hạn, hoàn tồn đúng một lần và giữ đơn **Chờ thanh toán**. |
| UC-08.5 | FR-11; NFR-09 | Tính lại tổng tiền, kiểm tra/giữ tồn và tạo yêu cầu thanh toán lại với mã tham chiếu, thời hạn mới. |
| UC-08-A01 đến A08 | FR-06, FR-09, FR-10, FR-11 | Sai quyền, sai trạng thái, khóa trùng, yêu cầu đồng thời và điều kiện thanh toán lại. |
| UC-08-A09 đến A14 | FR-09, FR-10, FR-11; NFR-04, NFR-06, NFR-09 | Thất bại, hết hạn, thanh toán lại, phản hồi chậm, IPN không hợp lệ và kết quả chưa xác định. |

**Phạm vi đối chiếu:** Một cửa hàng; đặt online, nhận tại quầy; thanh toán thử nghiệm VNPay Sandbox; các actor và tên Use Case nhất quán với SRS và sơ đồ checkout.
