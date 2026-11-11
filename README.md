# SỔ TAY CHỦ NHIỆM ĐIỆN TỬ 10A12 (K58-QT)
**Trường THPT số 1 Quang Trung (Phân hiệu) • GVCN: ThS. Trần Dương Quốc Mẫn**
**Phiên bản: 10.0 (Tự động Phân quyền RBAC 3 Cấp, PWA Hỗ trợ Xoay Ngang Toàn Diện)**

---

## 📁 Danh Mục Tệp Trong Gói Dự Án:
1. **`index.html`**: Giao diện trung tâm điều hành nề nếp, sơ đồ lớp, sổ đầu bài, quỹ lớp và đăng nhập phân quyền RBAC.
2. **`app.js`**: Logic điều hành, tự động nhận diện cấp độ tài khoản, đồng bộ Google Apps Script và tối ưu chạm đổi chỗ ngồi.
3. **`tracuu.html`**: Cổng tra cứu trực tuyến dành cho Quý Phụ huynh & Học sinh (tra cứu qua Mã HS hoặc số CCCD 12 số).
4. **`code.js`**: Mã nguồn Backend Google Apps Script (18 API actions) kết nối bảng tính Google Sheets trung tâm.
5. **`manifest.json`**: Cấu hình PWA cài đặt ứng dụng cho GVCN & Ban cán sự (hỗ trợ xoay ngang `orientation: any`).
6. **`manifest-hs.json`**: Cấu hình PWA cài đặt Cổng tra cứu cho Phụ huynh & Học sinh.
7. **`sw.js`**: Service Worker điều phối lưu trữ ngoại tuyến, tích hợp cache SheetJS CDN.
8. **`app_icon_gvcn.png`** & **`app_icon_10a12.png`**: Bộ biểu tượng ứng dụng PWA nhận diện thương hiệu lớp 10A12.

---

## 🔐 Hướng Dẫn Đăng Nhập & Phân Quyền:
- **Tài khoản GVCN (Thầy Trần Dương Quốc Mẫn)**:
  - Tài khoản: `gvcn`
  - Mật khẩu: `123456`
  - *Quyền hạn*: Toàn quyền quản trị, thêm/xóa/sửa học sinh, cấp lại mật khẩu, mở/khóa quyền ghi Ban cán sự, duyệt giấy phép bổ sung.
- **Tài khoản Ban Cán Sự**:
  - *Lớp trưởng*: `HS01` / Mật khẩu: `123456` (Điểm danh 7 ca, chấm chéo, ghi sổ đầu bài).
  - *Thủ quỹ lớp*: `HS22` / Mật khẩu: `123456` (Mở kỳ thu mới, tích thu quỹ, lập phiếu chi).
  - *Lao động*: `HS20` / Mật khẩu: `123456` (Nghiệm thu ca trực nhật 4 tổ, bắt lỗi vệ sinh).
  - *Tổ trưởng*: `HS02` (T1), `HS12` (T2), `HS23` (T3), `HS34` (T4).
- **Tài khoản Học sinh (45 em)**:
  - Tài khoản: `HS01` đến `HS45` / Mật khẩu: `123456`
  - *Chế độ xem*: Tự động chuyển vào "Góc Học Sinh" xem điểm cá nhân, vị trí chỗ ngồi, ca trực tổ và tình trạng đóng quỹ.

---

## 🚀 Triển Khai Hosting Nhanh (GitHub Pages):
1. Tạo kho lưu trữ (repository) mới trên GitHub.
2. Tải toàn bộ các tệp trong thư mục này lên nhánh `main`.
3. Vào **Settings** -> **Pages** -> Chọn nhánh `main` (thư mục `/root`) -> Bấm **Save**.
4. Ứng dụng sẽ hoạt động tại địa chỉ: `https://<ten-tai-khoan>.github.io/<ten-repo>/`.
