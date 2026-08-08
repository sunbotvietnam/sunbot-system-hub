# Sunbot System Hub — Access Model

Nguồn quyền vận hành: `SUNBOT_TRAINING_DATA_CENTER_v1`.

## 1. Quyền theo nhóm
Sheet `PERMISSION_GROUPS`, cột `HubAllowedApps`.

Giá trị là danh sách `app_id` phân tách bằng dấu phẩy. Ví dụ:

`teacher,training,impact,evaluation,crm,growth,quotation`

## 2. Ngoại lệ theo người
Sheet `USERS_MASTER`, cột `HubAllowedAppsOverride`.

- Để trống: kế thừa `HubAllowedApps` từ nhóm quyền (`PermissionGroupID`).
- Có giá trị: dùng danh sách này thay cho quyền nhóm.
- Muốn bỏ một app cho riêng một người: xóa `app_id` khỏi ô override.
- Muốn cấp thêm: thêm `app_id` vào ô override.

## 3. App IDs hiện dùng trong Hub
- `teacher` — Sunbot Teacher Hub
- `training` — Sunbot Teacher Academy
- `impact` — Impact Memory System
- `evaluation` — Đánh giá trẻ
- `finance` — Sunbot Finance OS
- `crm` — Sunbot CRM Pro
- `growth` — Sunbot Growth Portal
- `partner` — Sunbot Partner Portal
- `quotation` — Hệ thống Báo giá Sunbot 2026
- `playgrow` — Không gian Sáng tạo
- `mission` — Mission Sunbot

`SUNBOT OPS` chưa tích hợp vào Hub ở giai đoạn này; tiếp tục dùng luồng truy cập riêng.

## 4. Nguyên tắc
Hub không chứa ma trận người → app trong source code. Frontend chỉ chứa registry hiển thị của app (tên, URL, mô tả). Quyết định người nào được thấy/mở app nào nằm ở Google Sheet backend.
