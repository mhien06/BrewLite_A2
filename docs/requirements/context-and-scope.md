# Bối cảnh, stakeholder và phạm vi BrewLite

**Phiên bản:** 1.1 – Phạm vi thanh toán VNPay Sandbox

## 1. Bối cảnh và vấn đề nghiệp vụ

BrewLite là ứng dụng đặt đồ uống trực tuyến dành cho **một cửa hàng**. Khách hàng xem menu, lựa chọn size và topping, quản lý giỏ hàng, đặt đơn, thanh toán và theo dõi trạng thái đơn trước khi đến quầy nhận đồ uống. Nhân viên quầy tiếp nhận, chuẩn bị và bàn giao đơn; quản lý cửa hàng theo dõi hoạt động và xử lý đơn trong phạm vi quyền hạn.

Nếu xử lý thủ công, thông tin sản phẩm, tùy chọn, giá, số lượng tồn và trạng thái đơn dễ thiếu nhất quán. BrewLite tập trung dữ liệu và chuẩn hóa luồng **Xem menu → Chọn tùy chọn → Giỏ hàng → Đặt đơn → Thanh toán → Theo dõi đơn → Nhận tại quầy**. Hệ thống cần tính lại tổng tiền tại backend, kiểm tra tồn kho trước khi tạo đơn và tránh xử lý lặp yêu cầu.

**Phạm vi thanh toán:** BrewLite sử dụng **VNPay Sandbox làm Payment Service mô phỏng bên ngoài**. Phạm vi tích hợp bao gồm tạo yêu cầu thanh toán thử nghiệm, chuyển khách hàng đến VNPay Sandbox, tiếp nhận và xác minh kết quả giao dịch, đồng thời xử lý các trường hợp phản hồi chậm, thanh toán thất bại hoặc chưa xác định được kết quả. Môi trường này không phát sinh giao dịch tiền thật và không phải hệ thống thanh toán production.

## 2. Mục tiêu của BrewLite

| Mã | Mục tiêu |
| :--- | :--- |
| MT-01 | Cung cấp menu và chi tiết sản phẩm dễ sử dụng trên giao diện mobile-first/PWA. |
| MT-02 | Cho phép chọn size, topping, số lượng và quản lý giỏ hàng chính xác. |
| MT-03 | Tạo đơn theo giá được backend xác minh, kiểm tra và cập nhật tồn kho nhất quán. |
| MT-04 | Hỗ trợ đăng ký, đăng nhập, xác thực JWT và phân quyền người dùng. |
| MT-05 | Cho phép khách hàng thanh toán đơn hàng qua **VNPay Sandbox** và nhận biết trạng thái giao dịch, bao gồm thành công, thất bại hoặc chưa xác định. |
| MT-06 | Cho phép khách xem lịch sử, trạng thái đơn; nhân viên và quản lý xử lý đơn theo quyền. |
| MT-07 | Có thể kiểm thử, triển khai, giám sát cơ bản và tái tạo môi trường dữ liệu. |

## 3. Các bên liên quan (stakeholder)

| Stakeholder | Vai trò | Mục tiêu và kỳ vọng |
| :--- | :--- | :--- |
| **Khách hàng** | Xem menu, chọn đồ uống, đặt đơn, thanh toán qua **VNPay Sandbox** và nhận tại quầy. | Giá và tổng tiền rõ ràng; thao tác thuận tiện; biết đơn đã được xác nhận thanh toán hay chưa; theo dõi được đơn của mình. |
| **Nhân viên quầy** | Xem đơn đã được xác nhận hợp lệ, chuẩn bị đồ uống, cập nhật tiến độ và bàn giao. | Đơn hiển thị đầy đủ sản phẩm, tùy chọn, số lượng và trạng thái đáng tin cậy; không phải tự xác nhận thanh toán. |
| **Quản lý cửa hàng** | Theo dõi hoạt động, giám sát và xử lý đơn theo quyền. | Dữ liệu đơn và tồn kho nhất quán; phân quyền rõ; có thể nhận biết đơn thanh toán chưa xác định. |
| **Khách hàng/Giảng viên** | Đánh giá yêu cầu, mô hình, kiến trúc, kiểm thử và sản phẩm bàn giao. | Phạm vi rõ ràng; yêu cầu có thể kiểm chứng; tài liệu và sản phẩm thống nhất; có minh chứng hệ thống hoạt động. |
| **Nhóm phát triển** | Phân tích, thiết kế, hiện thực, kiểm thử và triển khai. | Yêu cầu ổn định; thay đổi được truy vết; có cấu hình VNPay Sandbox phù hợp. |
| **Đơn vị thanh toán (VNPay)** | Cung cấp **VNPay Sandbox**, đóng vai trò Payment Service mô phỏng bên ngoài và phản hồi kết quả giao dịch thử nghiệm. | Yêu cầu tích hợp đúng đặc tả, dữ liệu hợp lệ, thông tin xác thực được bảo vệ và kết quả được xử lý đúng. |

## 4. Phạm vi thực hiện (in-scope MVP)

| Nhóm chức năng | Nội dung trong phạm vi |
| :--- | :--- |
| Menu và sản phẩm | Xem danh sách, chi tiết, giá cơ bản, hình ảnh, tình trạng còn hàng; chọn size, topping và số lượng hợp lệ. |
| Giỏ hàng | Thêm, sửa, xóa dòng sản phẩm; tính tổng tiền tạm tính. |
| Tài khoản và phân quyền | Đăng ký, đăng nhập, xác thực JWT; vai trò Khách hàng, Nhân viên quầy, Quản lý cửa hàng. |
| Đặt đơn và tồn kho | Backend xác thực dữ liệu, tính lại giá; kiểm tra tồn theo Product; tạo đơn và cập nhật tồn kho nhất quán. |
| Thanh toán qua VNPay Sandbox | Tạo yêu cầu thanh toán cho đơn qua **VNPay Sandbox**; chuyển khách hàng đến giao diện thanh toán của VNPay Sandbox; tiếp nhận và xác minh kết quả qua cơ chế tích hợp VNPay; hiển thị kết quả cho khách hàng. |
| Quản lý kết quả thanh toán | Phân biệt thanh toán thành công, thất bại, đang chờ/chưa xác định và hết hạn; tránh xử lý trùng, không xác nhận đơn chỉ dựa vào trang khách hàng được chuyển về. |
| Theo dõi và xử lý đơn | Khách xem đơn của mình; nhân viên và quản lý xem, cập nhật tiến độ đơn đã đủ điều kiện xử lý. |
| Kỹ thuật và bàn giao | Next.js mobile-first/PWA, NestJS, PostgreSQL; migration/seed, Docker, kiểm thử, CI/CD và triển khai hệ thống. |

**Ranh giới nghiệp vụ:** MVP chỉ phục vụ **một cửa hàng**, khách **đặt trực tuyến và đến quầy nhận**, không giao hàng. VNPay Sandbox là Payment Service mô phỏng nằm ngoài ranh giới BrewLite; BrewLite chịu trách nhiệm quản lý đơn, trạng thái thanh toán và tồn kho nội bộ.

## 5. Quy tắc nghiệp vụ và giới hạn mức phạm vi

- Khách hàng phải đăng nhập trước khi tạo đơn hoặc thanh toán; khách chỉ được xem đơn thuộc tài khoản của mình.
- Tồn kho được quản lý theo **Product**; size và topping được kiểm tra tính hợp lệ nhưng chưa quản lý tồn kho riêng. Backend tính lại giá và kiểm tra tồn kho trước khi tạo đơn.
- Đơn mới được tạo ở trạng thái **Chờ thanh toán**.
- Mỗi yêu cầu thanh toán qua **VNPay Sandbox** có thời hạn **15 phút** kể từ thời điểm được tạo.
- Khi yêu cầu thanh toán hết hạn, backend kiểm tra kết quả giao dịch trước khi thay đổi trạng thái đơn hoặc tồn kho.
- Nếu giao dịch trước đã được xác minh là thất bại hoặc hết hạn, hệ thống hoàn tồn kho đúng một lần. Nếu đơn vẫn ở trạng thái **Chờ thanh toán** và chưa có giao dịch thành công, khách hàng được phép thanh toán lại.
- Trước khi thanh toán lại, hệ thống kiểm tra tồn kho và tính lại tổng tiền. Nếu dữ liệu vẫn hợp lệ, hệ thống giữ tồn kho và tạo một yêu cầu thanh toán mới với mã giao dịch và thời hạn mới.
- Nếu kết quả giao dịch trước đang chờ hoặc chưa xác định, hệ thống chưa cho phép tạo yêu cầu thanh toán mới cho đến khi hoàn tất xác minh.
- Chỉ kết quả thanh toán đã được backend xác minh hợp lệ mới có thể chuyển đơn sang trạng thái **Đã thanh toán**. Nhân viên và quản lý không được tự đánh dấu giao dịch thành công.
- Một đơn đã được xác nhận thanh toán thành công không được thanh toán lại.
- Khi kết quả giao dịch đang chờ hoặc chưa xác định, hệ thống không được mặc định hoàn tồn kho cho đến khi có kết quả xác minh.
- Nếu VNPay gửi kết quả thành công hợp lệ sau khi yêu cầu thanh toán đã hết hạn nhưng đơn vẫn ở trạng thái **Chờ thanh toán**, hệ thống kiểm tra trạng thái tồn kho trong cùng một transaction. Nếu tồn kho vẫn được giữ hoặc có thể được cập nhật an toàn, hệ thống chuyển đơn sang **Đã thanh toán**.
- Nếu kết quả thành công hợp lệ đến khi đơn hoặc tồn kho không còn đủ điều kiện cập nhật an toàn, hệ thống ghi nhận sự kiện, giữ nguyên dữ liệu hiện có và chuyển giao dịch sang trạng thái cần đối soát thủ công.
- Hệ thống phải tránh xử lý trùng yêu cầu thanh toán, thông báo kết quả và thao tác hoàn tồn kho.
- Luồng xử lý đơn sau thanh toán: **Đã thanh toán → Đang chuẩn bị → Sẵn sàng nhận → Hoàn tất**.
- MVP không hỗ trợ khách hàng tự hủy đơn đã thanh toán hoặc hoàn tiền.

Các điều kiện chi tiết về URL thanh toán, Return URL, IPN, kiểm tra chữ ký, đối soát, idempotency và chuyển trạng thái sẽ được trình bày trong SRS, đặc tả use-case và tài liệu thiết kế hệ thống.

## 6. Phạm vi mở rộng và ngoài phạm vi

| Phân loại | Nội dung | Giới hạn |
| :--- | :--- | :--- |
| **Mở rộng sau MVP** | Khuyến mãi, tích điểm, thống kê nâng cao | Chưa cam kết hiện thực trong MVP. |
| **Mở rộng sau MVP** | Tồn kho theo size, topping, nguyên liệu | MVP chỉ theo Product. |
| **Ngoài phạm vi** | Thanh toán production/thu tiền thật | Hệ thống chỉ tích hợp **VNPay Sandbox**. |
| **Ngoài phạm vi** | Lưu thông tin thẻ hoặc thông tin ngân hàng nhạy cảm | BrewLite không yêu cầu hoặc lưu số thẻ, CVV, thông tin đăng nhập ngân hàng. |
| **Ngoài phạm vi** | Giao hàng, nhiều chi nhánh | Không tính phí vận chuyển, chọn chi nhánh hoặc điều phối tồn giữa cửa hàng. |
| **Ngoài phạm vi** | Hoàn tiền, tự hủy sau thanh toán | Không thực hiện trong MVP. |
| **Ngoài phạm vi** | Tích hợp nhiều cổng thanh toán | Chỉ sử dụng VNPay Sandbox cho luồng thanh toán. |

## 7. Giả định ban đầu

| Mã | Giả định |
| :--- | :--- |
| A-01 | Nhóm có dữ liệu sản phẩm, giá, size, topping và tồn kho để seed và kiểm thử. |
| A-02 | Khách hàng có trình duyệt và kết nối Internet để sử dụng BrewLite và VNPay Sandbox. |
| A-03 | Cửa hàng có nhân viên tiếp nhận, chuẩn bị và bàn giao đồ uống tại quầy. |
| A-04 | Nhóm được cấp tài khoản và thông số tích hợp **VNPay Sandbox** phù hợp để thực hiện các tình huống giao dịch được nhà cung cấp hỗ trợ. |
| A-05 | Tồn kho theo Product đủ đại diện số lượng có thể bán trong MVP. |
| A-06 | Có môi trường chạy Next.js, NestJS và PostgreSQL, cùng địa chỉ/cấu hình phù hợp để VNPay gửi thông báo kết quả nếu dùng IPN. |
| A-07 | Phạm vi thanh toán của hệ thống chỉ sử dụng VNPay Sandbox. |

## 8. Ràng buộc

| Nhóm | Ràng buộc |
| :--- | :--- |
| Công nghệ | Hệ thống sử dụng **Next.js** theo hướng mobile-first/PWA, **NestJS** và **PostgreSQL**. |
| Nghiệp vụ | Một cửa hàng, nhận tại quầy; đơn và tồn kho phải nhất quán; có cơ chế tránh xử lý trùng thanh toán. |
| Tích hợp thanh toán | Chỉ sử dụng **VNPay Sandbox** và tuân thủ đặc tả tích hợp của VNPay. |
| Bảo mật | Xác minh thông báo thanh toán tại backend; bảo vệ khóa bí mật, JWT và thông tin cấu hình; không đưa secret vào repository hoặc log. |
| Triển khai | Có migration/seed, Docker Compose local, health check, HTTPS production và database không public trực tiếp. |
| Kiểm thử | Có unit, integration và E2E cho luồng chính; bao phủ các trường hợp thanh toán thành công, thất bại, lặp và kết quả chưa xác định. |
| Quy trình | Thay đổi tài liệu, sơ đồ và mã nguồn được quản lý qua commit/PR và có truy vết từ yêu cầu → thiết kế → code → test. |

## 9. Rủi ro ban đầu và hướng xử lý

| Mã | Rủi ro/ảnh hưởng | Hướng xử lý dự kiến |
| :--- | :--- | :--- |
| RR-01 | Tích hợp VNPay Sandbox làm tăng độ phức tạp và có thể ảnh hưởng tiến độ. | Đánh giá tác động, cập nhật các tài liệu liên quan và quản lý nội dung qua PR. |
| RR-02 | Frontend/backend hiểu khác dữ liệu đơn và thanh toán. | Thống nhất hợp đồng API, kiểm thử tích hợp sớm. |
| RR-03 | Nhiều đơn đặt đồng thời dẫn đến bán vượt tồn. | Dùng transaction và kiểm thử cạnh tranh dữ liệu. |
| RR-04 | Người dùng gửi lặp yêu cầu hoặc VNPay gửi lại thông báo. | Thiết kế idempotency và kiểm tra trạng thái trước khi cập nhật. |
| RR-05 | IPN đến chậm, không đến hoặc kết quả chưa rõ, trong khi đơn hết hạn. | Quy định trạng thái chờ, đối soát và chính sách hết hạn trước khi hoàn tồn. |
| RR-06 | Thông báo giả mạo hoặc sai số tiền làm xác nhận thanh toán nhầm. | Backend xác thực chữ ký, mã đơn, số tiền và trạng thái theo tài liệu VNPay. |
| RR-07 | VNPay Sandbox không gọi được endpoint IPN của môi trường local hoặc cấu hình sai. | Dùng endpoint có thể truy cập phù hợp; kiểm tra cấu hình và bảo đảm log không chứa secret. |
| RR-08 | Môi trường local khác production, dẫn đến lỗi triển khai. | Quản lý biến môi trường, Docker và smoke test. |
| RR-09 | Tài liệu, sơ đồ, code và test không thống nhất. | Đồng bộ SRS, use-case, Activity, Sequence, Class, Architecture và traceability matrix. |

## 10. Quyết định tích hợp thanh toán

| Mã | Quyết định |
| :--- | :--- |
| QD-01 | BrewLite chỉ tích hợp thanh toán qua **VNPay Sandbox**. |
| QD-02 | Khách hàng được chuyển từ BrewLite đến trang thanh toán do VNPay Sandbox cung cấp. Sau khi hoàn tất thao tác, khách hàng được chuyển về BrewLite để xem trạng thái giao dịch. |
| QD-03 | Return URL chỉ phục vụ điều hướng và hiển thị kết quả cho khách hàng. Backend chỉ xác nhận thanh toán sau khi kiểm tra chữ ký, mã đơn, số tiền và trạng thái giao dịch hợp lệ. |
| QD-04 | Mỗi yêu cầu thanh toán có thời hạn 15 phút. Thời hạn được gửi sang VNPay Sandbox khi tạo URL thanh toán. |
| QD-05 | Mỗi lượt thanh toán sử dụng một mã giao dịch riêng. Khi thanh toán lại, hệ thống không sử dụng lại mã giao dịch của lượt trước. |
| QD-06 | Hệ thống không cho phép thanh toán lại khi giao dịch trước còn đang chờ hoặc chưa xác định. |
| QD-07 | IPN được tiếp nhận qua endpoint HTTPS có thể truy cập từ VNPay. Địa chỉ endpoint và thông tin tích hợp được cấu hình bằng biến môi trường. |
| QD-08 | Thông tin như `vnp_TmnCode`, khóa bí mật và URL tích hợp được quản lý bằng biến môi trường, không lưu trực tiếp trong mã nguồn hoặc repository. |
| QD-09 | Các thông báo gửi lặp được xử lý theo cơ chế idempotency; một giao dịch thành công chỉ được ghi nhận một lần. |
| QD-10 | Giao dịch thành công đến muộn được cập nhật tự động nếu đơn vẫn đủ điều kiện; các trường hợp không thể cập nhật an toàn được ghi nhận để đối soát thủ công. |

**Trạng thái tài liệu:** Đã chốt phạm vi và các quy tắc nghiệp vụ chính của BrewLite. Các yêu cầu chi tiết phải được triển khai nhất quán trong SRS, use-case, thiết kế, mã nguồn và kiểm thử.
