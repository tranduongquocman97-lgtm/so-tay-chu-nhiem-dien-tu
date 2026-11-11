# SỔ TAY CHỦ NHIỆM ĐIỆN TỬ 10A12 (K58-QT)
**Trường THPT số 1 Quang Trung (Phân hiệu) • GVCN: ThS. Trần Dương Quốc Mẫn**
**Kiến trúc Modular PWA + Google Apps Script Backend (Phiên bản Backend 8.1 / PWA Cache `10a12-pwa-v16`)**

---

## 📁 Danh Mục Tệp Trong Dự Án:
1. **`index.html`**: Giao diện điều hành chính (Tổng quan, Sơ đồ lớp, Điểm danh 7 ca & Thi đua, Sổ đầu bài/SHL, Thời khóa biểu, Trực nhật 7 ca, Văn Thể Mỹ, Quỹ lớp, Hồ sơ 45 HS, Hòm thư tâm sự, Góc HS, Cài đặt).
2. **`js/` (5 module phân tách)**:
   - **`js/core.js`**: Khởi tạo `appState`, danh sách mặc định 45 học sinh (`HS01`–`HS45`), đăng nhập token/offline cho cả GVCN & học sinh, phân quyền RBAC 3 cấp, tự động chốt & làm sạch tuần mới lúc `00:00` Thứ Hai, hàm helper bảo mật (`escapeHtml`, `parseScore`, `compressImageDataUrl`), gọi API `callApi` và đồng bộ `syncWithCloud`.
   - **`js/seating.js`**: Sơ đồ chỗ ngồi 8 cột x 6 hàng hiển thị **Tổ độc lập theo từng học sinh (Dãy ≠ Tổ)**, kéo/chạm đổi chỗ và xoay cột (chỉ `GVCN` và `Lớp trưởng`), xuất sơ đồ lớp ra Word **`.docx`** chuẩn khổ A4 ngang, lưu lịch sử và đồng bộ Google Sheets.
   - **`js/attendance-shl.js`**: Điểm danh 7 ca theo ngày/tuần, trừ/cộng điểm chuẩn hóa, chấm chéo, ghi Sổ đầu bài & SHL theo ca/ngày, lưu trữ và chốt sổ theo tuần, kích hoạt trigger `00:00` Thứ Hai.
   - **`js/duty-vtm.js`**: Bảng TKB Số 3 + fallback HTML và upload ảnh TKB cập nhật ngay tức thì kèm trạng thái đồng bộ, quản lý 7 ca trực nhật, đăng ký/duyệt lao động tự nguyện, sự kiện & khoảnh khắc Văn Thể Mỹ.
   - **`js/fund-students.js`**: Thu/chi quỹ lớp theo nhiều kỳ thu, duyệt phiếu chi (`GVCN`), nhật ký kiểm toán, quản lý hồ sơ 45 HS, nhập/xuất CSV/Excel chống formula injection, hòm thư tâm sự, Góc HS và sao lưu/phục hồi JSON.
3. **`tracuu.html`**: Cổng tra cứu trực tuyến & ngoại tuyến cho Phụ huynh/Học sinh (tra cứu chính xác theo Mã HS hoặc số CCCD 12 số với hiển thị che một phần CCCD, tự động đồng bộ ảnh TKB mới nhất, công khai thu/chi từng đợt quỹ qua `lookupStudent` & `getPublicFundStatement`).
4. **`code.js`**: Mã nguồn Google Apps Script Backend v8.1 (hỗ trợ `loginUser` đa dạng cột Tiếng Việt/không dấu/Mã HS, chia mảnh `CauHinh` tự động cho ảnh TKB >50.000 ký tự, `autoRolloverNewWeekMonday0AM` chốt tuần cũ + reset 100đ lúc `00:00` Thứ 2, cùng toàn bộ API quản trị có kiểm tra phiên & phân quyền RBAC).
5. **`manifest.json`** & **`manifest-hs.json`**: Cấu hình PWA riêng cho ứng dụng điều hành (`GVCN`/Ban cán sự) và Cổng tra cứu (`PHHS`).
6. **`sw.js`**: Service Worker (`10a12-pwa-v16`) cache toàn bộ module JS, ảnh icon/TKB, HTML (có `{ ignoreSearch: true }`) và CDN cần thiết.
7. **`tkb_10a12.png`** & **`app_icon_*.png`**: Ảnh Thời khóa biểu Số 3 và bộ icon PWA chuẩn `192x192`, `512x512` (`app_icon_gvcn_192.png`, `app_icon_gvcn_512.png`, `app_icon_10a12_192.png`, `app_icon_10a12_512.png`).

---

## 🔐 Hướng Dẫn Đăng Nhập & Phân Quyền:
- **Tài khoản GVCN (ThS. Trần Dương Quốc Mẫn)**:
  - Tên đăng nhập: `gvcn` hoặc `gvcn.k58qt` (mật khẩu mặc định `123456`, có thể đổi trực tiếp qua API `changeGvcnPassword`).
  - *Quyền hạn*: Toàn quyền quản trị, thêm/sửa/xóa học sinh, đổi mật khẩu, mở/khóa quyền ghi Ban cán sự, duyệt phiếu chi, đặt lại điểm tuần, xuất/phục hồi sao lưu.
- **Tài khoản Ban Cán Sự**:
  - *Lớp trưởng*: `HS01` (Nguyễn Tấn An)
  - *Tổ trưởng*: `HS02` (Tổ 1), `HS12` (Tổ 2), `HS23` (Tổ 3), `HS34` (Tổ 4)
  - *Lớp phó Lao động*: `HS20` (Nguyễn Thái Hoàng)
  - *Thủ quỹ lớp*: `HS22` (Nguyễn My Su)
  - *Lớp phó VTM*: `HS05` (Đặng Thị Hiền Trân)
- **Tài khoản Học sinh (`HS01`–`HS45`)**:
  - Hỗ trợ đăng nhập bằng `tenDangNhap` (dạng `ten.viet.khong.dau.k58qt`), Mã HS (`HS01`–`HS45`), hoặc họ tên không dấu (mật khẩu mặc định `123456`).

---

## 🚀 Triển Khai Đồng Bộ Backend & Hosting:
1. **Google Apps Script (`code.js`)**:
   - Mở project Apps Script gắn với Google Sheets của lớp -> dán toàn bộ nội dung **`code.js`** mới nhất -> **Deploy** -> **Manage deployments** -> tạo **New version** để kích hoạt phiên bản v8.1.
   - Để kích hoạt **tự động chốt sổ & làm sạch tuần mới lúc 00:00 sáng Thứ 2 hàng tuần** ngay cả khi chưa mở web: trong trình soạn thảo Apps Script, chọn hàm **`setupWeeklyMondayRolloverTrigger`** trên thanh công cụ rồi nhấn **Run (Chạy)** một lần để cấp quyền đặt lịch (hoặc nhấn nút **"Bật Trigger 00:00 Thứ 2"** trong tab **Cài đặt** sau khi deploy bản mới).
2. **Hosting tĩnh (GitHub Pages)**:
   - Đẩy toàn bộ tệp (trừ file nháp không dùng) lên nhánh `main` và bật **Settings -> Pages**.
