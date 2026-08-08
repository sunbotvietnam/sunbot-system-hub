# Sunbot System Hub — Access Model

Nguồn danh mục và quyền vận hành: spreadsheet `SUNBOT_OPS_DATABASE`.

## 1. Danh mục ứng dụng — `HUB_UNG_DUNG`

Mỗi ứng dụng là một dòng. Các cột chính:

- `app_id`: mã ổn định dùng để phân quyền.
- `ten_ung_dung`: tên hiển thị trên Hub.
- `url`: đường dẫn mở ứng dụng.
- `mo_ta`, `nhom`, `icon`, `tags`: nội dung card trên Hub.
- `trang_thai`: `ACTIVE` hoặc `INACTIVE`.
- `thu_tu`: thứ tự hiển thị.
- `mo_tab_moi`: TRUE/FALSE.

Đặt `trang_thai = INACTIVE` sẽ ẩn ứng dụng khỏi Hub đối với tất cả người dùng, bất kể các dòng quyền khác.

## 2. Ma trận quyền — `HUB_QUYEN`

Mỗi dòng gồm:

`subject_type | subject_id | app_id | allowed | ghi_chu | updated_at`

Ba tầng quyền được áp dụng tuần tự:

1. `DEFAULT`
2. `ROLE`
3. `USER`

Tầng sau ghi đè tầng trước. Vì `USER` chạy cuối nên có thể cấp hoặc thu hồi riêng cho một người mà không sửa quyền chung của vai trò.

Ví dụ thu hồi CRM riêng cho một người:

`USER | TCH-... | crm | FALSE`

Ví dụ cấp thêm báo giá cho một người:

`USER | TCH-... | quotation | TRUE`

`app_id = *` áp dụng cho toàn bộ ứng dụng đang `ACTIVE`.

## 3. Nguyên tắc an toàn

- Frontend Hub không chứa danh sách ứng dụng hay ma trận người → app.
- Hub đăng nhập bằng tài khoản Sunbot hiện có, sau đó gửi session token tới access backend để đọc quyền mới nhất từ Sheet.
- Backend xác minh token trước khi trả danh sách app.
- Nếu backend/quyền gặp lỗi, Hub **fail closed**: trả 0 ứng dụng thay vì tự cấp quyền mặc định.
- Quyền không được cache cố định trên Hub. Mỗi lần mở Hub hoặc bấm **Tải lại quyền**, Hub đọc lại ma trận.

## 4. SUNBOT OPS

`ops` có thể xuất hiện như một card được cấp quyền trong Hub, nhưng URL của card chỉ mở trang đăng nhập SUNBOT OPS thông thường. Hub **không truyền session, token hay đăng nhập tự động vào SUNBOT OPS** ở giai đoạn này.

Vì vậy việc đưa `ops = TRUE/FALSE` trong `HUB_QUYEN` chỉ quyết định người đó có nhìn thấy nút truy cập OPS trên Hub hay không; cơ chế xác thực của OPS vẫn độc lập.
