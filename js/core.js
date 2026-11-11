/**
 * ============================================================================
 * SỔ TAY CHỦ NHIỆM ĐIỆN TỬ 10A12 (K58-QT) - HẠT NHÂN HỆ THỐNG (JS/CORE.JS)
 * Tác giả: GVCN ThS. Trần Dương Quốc Mẫn
 * Phiên bản: 14.2 (Tự động hóa 35 Tuần, 7 Ca học thực tế, RBAC & Live Sync)
 * ============================================================================
 */

const GAS_API_URL = localStorage.getItem("10A12_SCRIPT_URL") || "https://script.google.com/macros/s/AKfycby1bzee0jofemhb1lTYoi_wIdFpd_jneRKW8TtzUDyrtKGdkfk6K0OGErPfyKsjlB9hfQ/exec";

// ==================== 1. CHUẨN HÓA TIẾNG VIỆT ĐĂNG NHẬP ====================
function removeVietnameseTones(str) {
  if (!str) return "";
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/[^a-z0-9]/g, "");
  return str.trim();
}

// ==================== 2. DANH SÁCH 45 HỌC SINH MẪU ====================
const DEFAULT_STUDENTS_10A12 = [
  // TỔ 1
  { id: "HS01", hoTen: "Nguyễn Tấn An", to: "Tổ 1", chucVu: "Lớp trưởng", diemThiDua: 100, soCCCD: "052206001234", ngayCapCCCD: "15/05/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Nguyễn Văn Hùng", ngheNghiepBa: "Cán bộ công chức", sdtBa: "0905123456", tenMe: "Trần Thị Mai", ngheNghiepMe: "Giáo viên", sdtMe: "0905123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS02", hoTen: "Võ Hiền Đức", to: "Tổ 1", chucVu: "Tổ trưởng T1", diemThiDua: 100, soCCCD: "052206001235", ngayCapCCCD: "10/08/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Võ Văn Nam", ngheNghiepBa: "Kinh doanh tự do", sdtBa: "0914123456", tenMe: "Lê Thị Lan", ngheNghiepMe: "Kế toán", sdtMe: "0914123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS03", hoTen: "Lê Thành Huy", to: "Tổ 1", chucVu: "Cờ đỏ", diemThiDua: 100, soCCCD: "052206001236", ngayCapCCCD: "12/06/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Lê Văn Tuấn", ngheNghiepBa: "Kỹ sư xây dựng", sdtBa: "0983123456", tenMe: "Phạm Thị Hoa", ngheNghiepMe: "Nội trợ", sdtMe: "0983123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS04", hoTen: "Trần Hiếu Trung", to: "Tổ 1", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001237", ngayCapCCCD: "20/09/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Trần Văn Bình", ngheNghiepBa: "Làm nông", sdtBa: "0977123456", tenMe: "Nguyễn Thị Thảo", ngheNghiepMe: "Làm nông", sdtMe: "0977123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS05", hoTen: "Đặng Thị Hiền Trân", to: "Tổ 1", chucVu: "Lớp phó VTM", diemThiDua: 100, soCCCD: "052206001238", ngayCapCCCD: "14/04/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Đặng Văn Phúc", ngheNghiepBa: "Bác sĩ", sdtBa: "0935123456", tenMe: "Bùi Thị Ngọc", ngheNghiepMe: "Dược sĩ", sdtMe: "0935123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS06", hoTen: "Bùi Huỳnh Như Ý", to: "Tổ 1", chucVu: "Ban Thi đua", diemThiDua: 100, soCCCD: "052206001239", ngayCapCCCD: "18/07/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Bùi Văn Thành", ngheNghiepBa: "Kinh doanh", sdtBa: "0908123456", tenMe: "Trương Thị Thu", ngheNghiepMe: "Kinh doanh", sdtMe: "0908123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS07", hoTen: "Nguyễn Thị Thanh Trà", to: "Tổ 1", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001240", ngayCapCCCD: "22/11/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Nguyễn Văn Đức", ngheNghiepBa: "Tài xế", sdtBa: "0918123456", tenMe: "Lê Thị Yến", ngheNghiepMe: "May mặc", sdtMe: "0918123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS08", hoTen: "Phan Thị Hà My", to: "Tổ 1", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001241", ngayCapCCCD: "05/03/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Phan Văn Long", ngheNghiepBa: "Làm nông", sdtBa: "0949123456", tenMe: "Đỗ Thị Phượng", ngheNghiepMe: "Nội trợ", sdtMe: "0949123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS09", hoTen: "Huỳnh Minh Đức", to: "Tổ 1", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001242", ngayCapCCCD: "11/09/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Huỳnh Văn Hải", ngheNghiepBa: "Thợ cơ khí", sdtBa: "0962123456", tenMe: "Ngô Thị Cúc", ngheNghiepMe: "Kinh doanh nhỏ", sdtMe: "0962123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS10", hoTen: "Nguyễn Văn Nhuận", to: "Tổ 1", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001243", ngayCapCCCD: "19/10/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Nguyễn Văn Quang", ngheNghiepBa: "Làm vườn", sdtBa: "0972123456", tenMe: "Lý Thị Đào", ngheNghiepMe: "Nội trợ", sdtMe: "0972123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS11", hoTen: "Đinh Văn Khoa", to: "Tổ 1", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001244", ngayCapCCCD: "25/08/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Đinh Văn Sang", ngheNghiepBa: "Làm nông", sdtBa: "0989123456", tenMe: "Trần Thị Bé", ngheNghiepMe: "Làm nông", sdtMe: "0989123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },

  // TỔ 2
  { id: "HS12", hoTen: "Phan Ngọc Thuỳ", to: "Tổ 2", chucVu: "Tổ trưởng T2", diemThiDua: 100, soCCCD: "052206001245", ngayCapCCCD: "14/06/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Phan Văn Khoát", ngheNghiepBa: "Giáo viên", sdtBa: "0903123456", tenMe: "Võ Thị Lệ", ngheNghiepMe: "Y sĩ", sdtMe: "0903123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS13", hoTen: "Bùi Trần Khánh Nhi", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001246", ngayCapCCCD: "17/05/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Bùi Văn Thuận", ngheNghiepBa: "Kỹ sư điện", sdtBa: "0913123456", tenMe: "Trần Thị Xuân", ngheNghiepMe: "Kinh doanh", sdtMe: "0913123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS14", hoTen: "Trần Anh Thư", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001247", ngayCapCCCD: "09/02/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Trần Văn Hòa", ngheNghiepBa: "Làm nông", sdtBa: "0923123456", tenMe: "Nguyễn Thị Lài", ngheNghiepMe: "Nội trợ", sdtMe: "0923123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS15", hoTen: "Lê Thị Trúc Phượng", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001248", ngayCapCCCD: "18/03/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Lê Văn Tiến", ngheNghiepBa: "Thợ may", sdtBa: "0933123456", tenMe: "Đặng Thị Sen", ngheNghiepMe: "Buôn bán", sdtMe: "0933123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS16", hoTen: "Nguyễn Bảo Khôi", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001249", ngayCapCCCD: "29/07/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Nguyễn Văn Dũng", ngheNghiepBa: "Xây dựng", sdtBa: "0943123456", tenMe: "Hà Thị Hồng", ngheNghiepMe: "Nội trợ", sdtMe: "0943123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS17", hoTen: "Trương Hà Quý", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001250", ngayCapCCCD: "12/12/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Trương Văn Bảy", ngheNghiepBa: "Làm nông", sdtBa: "0953123456", tenMe: "Vũ Thị Vân", ngheNghiepMe: "Làm nông", sdtMe: "0953123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS18", hoTen: "Ngô Văn Vỹ", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001251", ngayCapCCCD: "24/04/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Ngô Văn Kiệt", ngheNghiepBa: "Cơ khí", sdtBa: "0963123456", tenMe: "Dương Thị Huệ", ngheNghiepMe: "Buôn bán", sdtMe: "0963123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS19", hoTen: "Đỗ Huy Vũ", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001252", ngayCapCCCD: "08/06/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Đỗ Văn Toàn", ngheNghiepBa: "Kinh doanh", sdtBa: "0973123456", tenMe: "Lâm Thị Hạnh", ngheNghiepMe: "Kế toán", sdtMe: "0973123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS20", hoTen: "Nguyễn Thái Hoàng", to: "Tổ 2", chucVu: "Lớp phó Lao động", diemThiDua: 100, soCCCD: "052206001253", ngayCapCCCD: "16/01/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Nguyễn Văn Cường", ngheNghiepBa: "Công chức", sdtBa: "0984123456", tenMe: "Lê Thị Thảo", ngheNghiepMe: "Giáo viên", sdtMe: "0984123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS21", hoTen: "Võ Thị Kim Nhung", to: "Tổ 2", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001254", ngayCapCCCD: "21/05/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Võ Văn Thắng", ngheNghiepBa: "Làm nông", sdtBa: "0994123456", tenMe: "Trần Thị Diệu", ngheNghiepMe: "Nội trợ", sdtMe: "0994123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS22", hoTen: "Nguyễn My Su", to: "Tổ 2", chucVu: "Thủ quỹ lớp", diemThiDua: 100, soCCCD: "052206001255", ngayCapCCCD: "30/03/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Nguyễn Văn Lộc", ngheNghiepBa: "Kinh doanh vật tư", sdtBa: "0915123456", tenMe: "Phan Thị Loan", ngheNghiepMe: "Kế toán", sdtMe: "0915123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },

  // TỔ 3
  { id: "HS23", hoTen: "Trương Đức Tài", to: "Tổ 3", chucVu: "Tổ trưởng T3", diemThiDua: 100, soCCCD: "052206001256", ngayCapCCCD: "11/04/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Trương Văn Khang", ngheNghiepBa: "Cán bộ huyện", sdtBa: "0906123456", tenMe: "Lý Thị Trinh", ngheNghiepMe: "Nhân viên bưu điện", sdtMe: "0906123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS24", hoTen: "Đỗ Quyết Tâm", to: "Tổ 3", chucVu: "Lớp phó Học tập", diemThiDua: 100, soCCCD: "052206001257", ngayCapCCCD: "04/09/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Đỗ Văn Nghĩa", ngheNghiepBa: "Bác sĩ thú y", sdtBa: "0916123456", tenMe: "Vũ Thị Quỳnh", ngheNghiepMe: "Giáo viên mầm non", sdtMe: "0916123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS25", hoTen: "Lê Quốc Hưng", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001258", ngayCapCCCD: "14/10/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Lê Văn Sơn", ngheNghiepBa: "Thợ hàn", sdtBa: "0926123456", tenMe: "Tạ Thị Tuyết", ngheNghiepMe: "Làm nông", sdtMe: "0926123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS26", hoTen: "Nguyễn Hữu Phong", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001259", ngayCapCCCD: "20/06/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Nguyễn Văn Hùng", ngheNghiepBa: "Lái xe tải", sdtBa: "0936123456", tenMe: "Trần Thị Thu", ngheNghiepMe: "Nội trợ", sdtMe: "0936123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS27", hoTen: "Vũ Đồng Tiến", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001260", ngayCapCCCD: "28/01/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Vũ Văn Lương", ngheNghiepBa: "Làm nông", sdtBa: "0946123456", tenMe: "Mai Thị Hằng", ngheNghiepMe: "Làm nông", sdtMe: "0946123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS28", hoTen: "Phạm Khởi Nghĩa", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001261", ngayCapCCCD: "07/07/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Phan Văn Tân", ngheNghiepBa: "Xây dựng", sdtBa: "0956123456", tenMe: "Hồ Thị Nga", ngheNghiepMe: "Nội trợ", sdtMe: "0956123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS29", hoTen: "Hoàng Đức Quang", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001262", ngayCapCCCD: "16/03/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Hoàng Văn Tuấn", ngheNghiepBa: "Thợ mộc", sdtBa: "0966123456", tenMe: "Đoàn Thị Gấm", ngheNghiepMe: "Buôn bán nhỏ", sdtMe: "0966123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS30", hoTen: "Lý Bảo Nam", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001263", ngayCapCCCD: "13/05/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Lý Văn Minh", ngheNghiepBa: "Làm nông", sdtBa: "0976123456", tenMe: "Cao Thị Mận", ngheNghiepMe: "Làm nông", sdtMe: "0976123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS31", hoTen: "Trần Thảo Ngân", to: "Tổ 3", chucVu: "Bí thư Chi đoàn", diemThiDua: 100, soCCCD: "052206001264", ngayCapCCCD: "10/02/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Trần Văn Bình", ngheNghiepBa: "Kỹ sư nông nghiệp", sdtBa: "0986123456", tenMe: "Lê Thị Bích", ngheNghiepMe: "Cán bộ y tế", sdtMe: "0986123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS32", hoTen: "Đặng Nhã Trân", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001265", ngayCapCCCD: "24/11/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Đặng Văn Lâm", ngheNghiepBa: "Kinh doanh gia đình", sdtBa: "0996123456", tenMe: "Nguyễn Thị Diễm", ngheNghiepMe: "Kinh doanh", sdtMe: "0996123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS33", hoTen: "Võ Minh Trí", to: "Tổ 3", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001266", ngayCapCCCD: "03/08/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Võ Văn Kiên", ngheNghiepBa: "Làm nông", sdtBa: "0917123456", tenMe: "Hoàng Thị Huệ", ngheNghiepMe: "Nội trợ", sdtMe: "0917123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },

  // TỔ 4
  { id: "HS34", hoTen: "Trần Nguyễn Gia Bảo", to: "Tổ 4", chucVu: "Tổ trưởng T4", diemThiDua: 100, soCCCD: "052206001267", ngayCapCCCD: "25/03/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Trần Văn Trí", ngheNghiepBa: "Công an viên", sdtBa: "0907123456", tenMe: "Nguyễn Thị Phương", ngheNghiepMe: "Giáo viên", sdtMe: "0907123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS35", hoTen: "Huỳnh Minh Nhựt", to: "Tổ 4", chucVu: "Cờ đỏ", diemThiDua: 100, soCCCD: "052206001268", ngayCapCCCD: "19/04/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: true, ngayVaoDoan: "26/03/2026", tenBa: "Huỳnh Văn Thanh", ngheNghiepBa: "Thợ may", sdtBa: "0917223456", tenMe: "Võ Thị Hằng", ngheNghiepMe: "Làm nông", sdtMe: "0917223457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS36", hoTen: "Dương Thành Danh", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001269", ngayCapCCCD: "11/06/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Dương Văn Quyền", ngheNghiepBa: "Kỹ thuật viễn thông", sdtBa: "0927123456", tenMe: "Phan Thị Oanh", ngheNghiepMe: "Nội trợ", sdtMe: "0927123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS37", hoTen: "Nguyễn Quốc Phong", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001270", ngayCapCCCD: "18/09/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Nguyễn Văn Hùng", ngheNghiepBa: "Làm vườn", sdtBa: "0937123456", tenMe: "Đinh Thị Thắm", ngheNghiepMe: "Nội trợ", sdtMe: "0937123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS38", hoTen: "Bùi Thị Bảo Trâm", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001271", ngayCapCCCD: "09/01/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Bùi Văn Hậu", ngheNghiepBa: "Lái xe", sdtBa: "0947123456", tenMe: "Lê Thị Hồng", ngheNghiepMe: "Làm nông", sdtMe: "0947123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS39", hoTen: "Lê Thảo Quyên", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001272", ngayCapCCCD: "15/07/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Lê Văn Tự", ngheNghiepBa: "Làm nông", sdtBa: "0957123456", tenMe: "Trần Thị Kim", ngheNghiepMe: "Làm nông", sdtMe: "0957123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS40", hoTen: "Đặng Bảo Sương", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001273", ngayCapCCCD: "21/08/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Đặng Văn Quý", ngheNghiepBa: "Cơ khí", sdtBa: "0967123456", tenMe: "Hồ Thị Nhung", ngheNghiepMe: "Nội trợ", sdtMe: "0967123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS41", hoTen: "Ngô Trí Dũng", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001274", ngayCapCCCD: "14/02/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Ngô Văn Thuận", ngheNghiepBa: "Thợ nề", sdtBa: "0977223456", tenMe: "Nguyễn Thị Lụa", ngheNghiepMe: "Làm nông", sdtMe: "0977223457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS42", hoTen: "Phan Tấn Sang", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001275", ngayCapCCCD: "02/10/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Phan Văn Trung", ngheNghiepBa: "Làm nông", sdtBa: "0987123456", tenMe: "Lâm Thị Cẩm", ngheNghiepMe: "Làm nông", sdtMe: "0987123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS43", hoTen: "Vũ Thanh Khiêm", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001276", ngayCapCCCD: "27/05/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Vũ Văn Lộc", ngheNghiepBa: "Tài xế", sdtBa: "0997123456", tenMe: "Bùi Thị Mai", ngheNghiepMe: "Nội trợ", sdtMe: "0997123457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS44", hoTen: "Trần Minh Quân", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001277", ngayCapCCCD: "19/12/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Trần Văn Huy", ngheNghiepBa: "Làm nông", sdtBa: "0908223456", tenMe: "Võ Thị Bích", ngheNghiepMe: "Làm nông", sdtMe: "0908223457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" },
  { id: "HS45", hoTen: "Nguyễn Xuân Đông", to: "Tổ 4", chucVu: "Thành viên", diemThiDua: 100, soCCCD: "052206001278", ngayCapCCCD: "08/11/2023", noiCapCCCD: "Cục Cảnh sát QLHC về TTXH", laDoanVien: false, ngayVaoDoan: "", tenBa: "Nguyễn Văn Chiến", ngheNghiepBa: "Kinh doanh tự do", sdtBa: "0918223456", tenMe: "Dương Thị Thuỷ", ngheNghiepMe: "Kế toán", sdtMe: "0918223457", diaChi: "Tây Sơn, Gia Lai", matKhau: "123456" }
];

// ==================== 3. SƠ ĐỒ LỚP HỌC (4 DÃY - 6 HÀNG) ====================
const DEFAULT_SEATING_LAYOUT = [
  // Hàng 6 (Cuối lớp)
  [
    { name: "Ngô Trí Dũng", role: "" }, { name: "", role: "" },
    { name: "Phan Tấn Sang", role: "" }, { name: "Vũ Thanh Khiêm", role: "" },
    { name: "Trần Minh Quân", role: "" }, { name: "", role: "" },
    { name: "", role: "" }, { name: "Nguyễn Xuân Đông", role: "" }
  ],
  // Hàng 5
  [
    { name: "Trần Nguyễn Gia Bảo", role: "TT T4" }, { name: "Huỳnh Minh Nhựt", role: "Cờ đỏ" },
    { name: "Dương Thành Danh", role: "" }, { name: "Nguyễn Quốc Phong", role: "" },
    { name: "Bùi Thị Bảo Trâm", role: "" }, { name: "Lê Thảo Quyên", role: "" },
    { name: "Võ Minh Trí", role: "" }, { name: "Đặng Bảo Sương", role: "" }
  ],
  // Hàng 4
  [
    { name: "Đặng Thị Hiền Trân", role: "Phó VTM" }, { name: "Bùi Huỳnh Như Ý", role: "Thi đua" },
    { name: "Nguyễn Thị Thanh Trà", role: "" }, { name: "Phan Thị Hà My", role: "" },
    { name: "Võ Hiền Đức", role: "TT T1" }, { name: "Lê Thành Huy", role: "Cờ đỏ" },
    { name: "Nguyễn Tấn An", role: "Lớp trưởng" }, { name: "Trần Hiếu Trung", role: "" }
  ],
  // Hàng 3
  [
    { name: "Nguyễn My Su", role: "Thủ quỹ" }, { name: "Đặng Nhã Trân", role: "" },
    { name: "Trần Thảo Ngân", role: "Bí thư" }, { name: "Võ Thị Kim Nhung", role: "" },
    { name: "Đinh Văn Khoa", role: "" }, { name: "Nguyễn Thái Hoàng", role: "Phó LĐ" },
    { name: "Huỳnh Minh Đức", role: "" }, { name: "Nguyễn Văn Nhuận", role: "" }
  ],
  // Hàng 2
  [
    { name: "Ngô Văn Vỹ", role: "" }, { name: "Đỗ Huy Vũ", role: "" },
    { name: "Nguyễn Bảo Khôi", role: "" }, { name: "Trương Hà Quý", role: "" },
    { name: "Bùi Trần Khánh Nhi", role: "" }, { name: "Trần Anh Thư", role: "" },
    { name: "Lê Thị Trúc Phượng", role: "" }, { name: "Phan Ngọc Thuỳ", role: "TT T2" }
  ],
  // Hàng 1 (Sát bục giảng và bàn GV)
  [
    { name: "Lê Quốc Hưng", role: "" }, { name: "Nguyễn Hữu Phong", role: "" },
    { name: "Đỗ Quyết Tâm", role: "Phó HT" }, { name: "Trương Đức Tài", role: "TT T3" },
    { name: "Vũ Đồng Tiến", role: "" }, { name: "Phạm Khởi Nghĩa", role: "" },
    { name: "Hoàng Đức Quang", role: "" }, { name: "Lý Bảo Nam", role: "" }
  ]
];

// ==================== 4. THỜI KHÓA BIỂU SỐ 3 (TỪ 02/11/2026) ====================
const TKB_CONFIG_SO3 = {
  version: "Số 3 (Từ 02/11/2026)",
  imageFile: "tkb_10a12.png",
  morning: [
    { period: 1, time: "07:00 - 07:45", t2: "TN&HN 1 (Mẫn)", t3: "LÍ (Âu)", t4: "CN (Đĩnh)", t5: "-", t6: "-", t7: "-" },
    { period: 2, time: "07:50 - 08:35", t2: "TN&HN 2 (Mẫn)", t3: "CĐ Toán (Mẫn)", t4: "ĐỊA (P.Quốc)", t5: "-", t6: "-", t7: "-" },
    { period: 3, time: "08:55 - 09:40", t2: "GDTC (Thành)", t3: "TOÁN (Mẫn)", t4: "QP&AN (Vân)", t5: "-", t6: "-", t7: "-" },
    { period: 4, time: "09:45 - 10:30", t2: "T.ANH (Trúc)", t3: "GDTC (Thành)", t4: "CĐ Văn (Nhân)", t5: "-", t6: "-", t7: "-" },
    { period: 5, time: "10:35 - 11:20", t2: "-", t3: "-", t4: "CĐ Hóa (Trang)", t5: "-", t6: "-", t7: "-" }
  ],
  afternoon: [
    { period: 1, time: "14:00 - 14:45", t2: "CĐ Văn (Nhân)", t3: "VĂN (Hân)", t4: "-", t5: "-", t6: "-", t7: "-" },
    { period: 2, time: "14:50 - 15:35", t2: "TN&HN 3 (Đài)", t3: "CN (Đĩnh)", t4: "-", t5: "-", t6: "-", t7: "-" },
    { period: 3, time: "15:55 - 16:40", t2: "HÓA (Trang)", t3: "T.ANH (Trúc)", t4: "-", t5: "-", t6: "-", t7: "-" }
  ]
};

// ==================== 5. QUY CHẾ 01 CHUẨN ====================
const DEFAULT_CRITERIA_LIST = [
  { code: "C01", name: "Đạt điểm 9, 10 kiểm tra miệng / 15p", points: 10, type: "CONG" },
  { code: "C02", name: "Phát biểu xây dựng bài sôi nổi", points: 5, type: "CONG" },
  { code: "C03", name: "Đôi bạn cùng tiến giúp đỡ bạn học", points: 10, type: "CONG" },
  { code: "C04", name: "Nhặt của rơi trả lại / Việc tốt", points: 15, type: "CONG" },
  { code: "C05", name: "Tích cực hoạt động Đoàn / Văn thể mỹ", points: 10, type: "CONG" },
  { code: "C06", name: "Hoàn thành xuất sắc ca trực nhật", points: 5, type: "CONG" },
  
  { code: "P01", name: "Đi học trễ (sau 06:45 sáng hoặc 13:45 chiều)", points: -10, type: "TRU" },
  { code: "P02", name: "Nghỉ học không phép", points: -20, type: "TRU" },
  { code: "P03", name: "Không học bài cũ / Không làm bài tập", points: -10, type: "TRU" },
  { code: "P04", name: "Bị ghi tên vào Sổ đầu bài (tiết loại B/C/D)", points: -10, type: "TRU" },
  { code: "P05", name: "Sai quy cách trang phục, thiếu phù hiệu", points: -10, type: "TRU" },
  { code: "P06", name: "Sử dụng điện thoại trong giờ học", points: -20, type: "TRU" },
  { code: "P07", name: "Mất trật tự, làm việc riêng, ngủ gật", points: -5, type: "TRU" },
  { code: "P08", name: "Trực nhật muộn, chưa sạch, quên đổ rác", points: -20, type: "TRU" }
];

// ==================== 6. BỘ MÁY TỰ ĐỘNG HÓA TUẦN & BUỔI HỌC ====================
const SCHOOL_YEAR_START_MONDAY = new Date(2026, 7, 31); // Thứ Hai Tuần 1: 31/08/2026

function getAutoSchoolWeek() {
  const now = new Date();
  const diffTime = now.getTime() - SCHOOL_YEAR_START_MONDAY.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(35, Math.max(1, diffWeeks));
}

function buildAutoWeekDropdown() {
  const selectEl = document.getElementById("currentWeekSelect");
  if (!selectEl) return;

  const currentRealWeek = getAutoSchoolWeek();
  appState.selectedWeek = currentRealWeek;

  let optionsHtml = "";
  for (let w = 1; w <= 35; w++) {
    const mon = new Date(SCHOOL_YEAR_START_MONDAY.getTime() + (w - 1) * 7 * 86400000);
    const sun = new Date(mon.getTime() + 6 * 86400000);

    const monStr = `${String(mon.getDate()).padStart(2, '0')}/${String(mon.getMonth() + 1).padStart(2, '0')}`;
    const sunStr = `${String(sun.getDate()).padStart(2, '0')}/${String(sun.getMonth() + 1).padStart(2, '0')}/${sun.getFullYear()}`;

    const isCurrent = (w === currentRealWeek);
    const label = `Tuần ${w} (${monStr} - ${sunStr})${isCurrent ? " • Hiện tại" : ""}`;

    optionsHtml += `<option value="${w}" ${isCurrent ? "selected" : ""}>${label}</option>`;
  }

  selectEl.innerHTML = optionsHtml;

  if (typeof switchWeekScope === "function") {
    switchWeekScope(currentRealWeek);
  }
}

function getAutoSessionKey() {
  const now = new Date();
  const day = now.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7
  const hour = now.getHours();

  if (day === 0 || day === 6 || (day === 5 && hour >= 12)) return "T2_SANG";
  if (day === 1) return hour < 12 ? "T2_SANG" : "T2_CHIEU";
  if (day === 2) return hour < 12 ? "T3_SANG" : "T3_CHIEU";
  if (day === 3) return hour < 12 ? "T4_SANG" : "T5_SANG";
  if (day === 4) return hour < 12 ? "T5_SANG" : "T6_SANG";
  if (day === 5) return "T6_SANG";

  return "T2_SANG";
}

function getSessionLabel(key) {
  const map = {
    "T2_SANG": "Sáng Thứ 2", "T2_CHIEU": "Chiều Thứ 2",
    "T3_SANG": "Sáng Thứ 3", "T3_CHIEU": "Chiều Thứ 3",
    "T4_SANG": "Sáng Thứ 4", "T5_SANG": "Sáng Thứ 5", "T6_SANG": "Sáng Thứ 6"
  };
  return map[key] || "Sáng Thứ 2";
}

function syncAttendanceSessionOnLoad() {
  const autoKey = getAutoSessionKey();
  appState.currentSessionKey = autoKey;
  appState.currentSessionLabel = getSessionLabel(autoKey);

  const sessionSelect = document.getElementById("attendanceSessionSelect");
  if (sessionSelect) {
    sessionSelect.value = autoKey;
  }
}

let appState = {
  currentUser: JSON.parse(localStorage.getItem("10A12_SESSION_USER")) || null,
  roleLevel: "GUEST",
  allowStudentLeaderEdit: localStorage.getItem("10A12_ALLOW_EDIT") !== "false",
  
  selectedWeek: getAutoSchoolWeek(),
  currentSessionKey: getAutoSessionKey(),
  currentSessionLabel: getSessionLabel(getAutoSessionKey()),
  currentCampaignId: "KY1_100K",
  currentStudentTeamFilter: "ALL",
  
  students: JSON.parse(localStorage.getItem("10A12_STUDENTS_V9")) || DEFAULT_STUDENTS_10A12,
  violations: JSON.parse(localStorage.getItem("10A12_VIOLATIONS_V9")) || [],
  campaigns: JSON.parse(localStorage.getItem("10A12_CAMPAIGNS_V9")) || [
    { id: "KY1_100K", title: "Quỹ Lớp Học Kỳ 1", target: 100000, status: "Đang thu" },
    { id: "KY2_STEM", title: "Quỹ Hoạt Động Trải Nghiệm & STEM", target: 50000, status: "Đang thu" }
  ],
  fundPayments: JSON.parse(localStorage.getItem("10A12_PAYMENTS_V9")) || [],
  cashbook: JSON.parse(localStorage.getItem("10A12_CASHBOOK_V9")) || [
    { code: "CHI_01", time: "15/10/2026", type: "CHI", category: "Vệ sinh & Cơ sở vật chất", amount: 150000, author: "Thủ quỹ lớp", note: "Mua chổi quét lớp và nước lau sàn", status: "DA_DUYET" }
  ],
  auditLogs: JSON.parse(localStorage.getItem("10A12_AUDIT_LOGS")) || [],
  periodLogs: JSON.parse(localStorage.getItem("10A12_PERIODS_V9")) || [],
  letters: JSON.parse(localStorage.getItem("10A12_LETTERS_V9")) || [],
  criteriaList: JSON.parse(localStorage.getItem("10A12_CRITERIA_V9")) || DEFAULT_CRITERIA_LIST,
  attendanceRecords: JSON.parse(localStorage.getItem("10A12_ATT_RECORDS")) || {},
  dutyAssignments: JSON.parse(localStorage.getItem("10A12_DUTY_7SESSIONS")) || {},
  volunteerLaborList: JSON.parse(localStorage.getItem("10A12_VOLUNTEER_LABOR")) || [],
  vtmEvents: JSON.parse(localStorage.getItem("10A12_VTM_EVENTS")) || [],
  classMedia: JSON.parse(localStorage.getItem("10A12_CLASS_MEDIA")) || [],
  customTicker: localStorage.getItem("10A12_CUSTOM_TICKER") || "",
  tkbCustomImage: localStorage.getItem("10A12_TKB_IMAGE") || "tkb_10a12.png",
  weeklyArchives: JSON.parse(localStorage.getItem("10A12_WEEKLY_ARCHIVES")) || {},
  seatingHistory: JSON.parse(localStorage.getItem("10A12_SEATING_HISTORY")) || [],
  
  fundSummary: { totalIncome: 0, totalExpense: 150000, balance: -150000 },
  selectedStudentForDetail: null
};

let currentSeatingLayout = JSON.parse(localStorage.getItem("classroom_10A12_glass_v9")) || DEFAULT_SEATING_LAYOUT;
let selectedSeatFirst = null;

function saveStateToLocal() {
  localStorage.setItem("10A12_STUDENTS_V9", JSON.stringify(appState.students));
  localStorage.setItem("10A12_VIOLATIONS_V9", JSON.stringify(appState.violations));
  localStorage.setItem("10A12_CAMPAIGNS_V9", JSON.stringify(appState.campaigns));
  localStorage.setItem("10A12_PAYMENTS_V9", JSON.stringify(appState.fundPayments));
  localStorage.setItem("10A12_CASHBOOK_V9", JSON.stringify(appState.cashbook));
  localStorage.setItem("10A12_AUDIT_LOGS", JSON.stringify(appState.auditLogs));
  localStorage.setItem("10A12_PERIODS_V9", JSON.stringify(appState.periodLogs));
  localStorage.setItem("10A12_LETTERS_V9", JSON.stringify(appState.letters));
  localStorage.setItem("10A12_ATT_RECORDS", JSON.stringify(appState.attendanceRecords));
  localStorage.setItem("10A12_DUTY_7SESSIONS", JSON.stringify(appState.dutyAssignments));
  localStorage.setItem("10A12_VOLUNTEER_LABOR", JSON.stringify(appState.volunteerLaborList));
  localStorage.setItem("10A12_VTM_EVENTS", JSON.stringify(appState.vtmEvents));
  localStorage.setItem("10A12_CLASS_MEDIA", JSON.stringify(appState.classMedia));
  localStorage.setItem("classroom_10A12_glass_v9", JSON.stringify(currentSeatingLayout));
  localStorage.setItem("10A12_ALLOW_EDIT", String(appState.allowStudentLeaderEdit));
  localStorage.setItem("10A12_CRITERIA_V9", JSON.stringify(appState.criteriaList));
  localStorage.setItem("10A12_CUSTOM_TICKER", appState.customTicker);
  localStorage.setItem("10A12_TKB_IMAGE", appState.tkbCustomImage);
  localStorage.setItem("10A12_WEEKLY_ARCHIVES", JSON.stringify(appState.weeklyArchives));
  localStorage.setItem("10A12_SEATING_HISTORY", JSON.stringify(appState.seatingHistory));
}

// ==================== 7. XÁC THỰC PHÂN QUYỀN RBAC ====================
function initAuthSession() {
  const authScreen = document.getElementById("authScreen");
  if (!appState.currentUser) {
    if (authScreen) authScreen.classList.remove("hidden");
  } else {
    if (authScreen) authScreen.classList.add("hidden");
    applyRolePermissions();
  }
}

function handleUserLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const rawInput = document.getElementById("authUsernameInput").value.trim();
  const cleanInput = removeVietnameseTones(rawInput);
  const password = document.getElementById("authPasswordInput").value.trim();
  const errorBox = document.getElementById("loginErrorMsg");

  if (errorBox) errorBox.classList.add("hidden");

  // 1. Đăng nhập GVCN
  const savedGvcnPass = localStorage.getItem("10A12_GVCN_PASSWORD") || "123456";
  if (cleanInput === "gvcn" && password === savedGvcnPass) {
    appState.currentUser = {
      username: "gvcn",
      fullName: "ThS. Trần Dương Quốc Mẫn",
      role: "GVCN & Phó Bí thư Đoàn trường",
      roleLevel: "GVCN"
    };
    finishLogin();
    return;
  }

  // 2. Đăng nhập Học sinh & Cán sự
  const matched = appState.students.find(s => {
    const sCleanName = removeVietnameseTones(s.hoTen);
    const sCode = s.id ? s.id.toLowerCase() : "";
    return sCleanName === cleanInput || sCode === cleanInput;
  });

  if (matched) {
    const passExpected = matched.matKhau || "123456";
    if (password === passExpected) {
      let roleLevel = "STUDENT";
      const chucVu = (matched.chucVu || "").toLowerCase();

      if (chucVu.includes("lớp trưởng") || chucVu.includes("lớp phó học tập") || chucVu.includes("bí thư")) {
        roleLevel = "LEADER";
      } else if (chucVu.includes("thủ quỹ")) {
        roleLevel = "TREASURER";
      } else if (chucVu.includes("lao động")) {
        roleLevel = "LABOR";
      } else if (chucVu.includes("văn thể mỹ") || chucVu.includes("vtm")) {
        roleLevel = "VTM";
      } else if (chucVu.includes("tổ trưởng") || chucVu.includes("cờ đỏ") || chucVu.includes("thi đua")) {
        roleLevel = "LEADER";
      }

      appState.currentUser = {
        username: cleanInput,
        studentId: matched.id,
        fullName: matched.hoTen,
        role: matched.chucVu || "Học sinh",
        roleLevel: roleLevel,
        team: matched.to
      };
      finishLogin();
      return;
    }
  }

  if (errorBox) {
    errorBox.innerText = "Tài khoản hoặc mật khẩu không đúng! Hãy nhập họ tên viết liền không dấu (VD: nguyentanan).";
    errorBox.classList.remove("hidden");
  }
}

function finishLogin() {
  localStorage.setItem("10A12_SESSION_USER", JSON.stringify(appState.currentUser));
  const authScreen = document.getElementById("authScreen");
  if (authScreen) authScreen.classList.add("hidden");
  applyRolePermissions();
  renderAllSections();
}

function handleUserLogout() {
  if (confirm("Thầy/bạn có chắc chắn muốn đăng xuất?")) {
    appState.currentUser = null;
    localStorage.removeItem("10A12_SESSION_USER");
    location.reload();
  }
}

function applyRolePermissions() {
  if (!appState.currentUser) return;
  const role = appState.currentUser.roleLevel;
  appState.roleLevel = role;

  const nameEl = document.getElementById("currentUserNameText");
  const roleEl = document.getElementById("currentUserRoleBadge");
  if (nameEl) nameEl.innerText = appState.currentUser.fullName;
  if (roleEl) roleEl.innerText = appState.currentUser.role;

  const isGVCN = (role === "GVCN");
  const isStudent = (role === "STUDENT");

  toggleEl("btnMasterSwitch", isGVCN);
  toggleEl("btn-tab-tam-tu", isGVCN);
  toggleEl("btn-side-tab-tam-tu", isGVCN);
  toggleEl("btn-tab-cai-dat", isGVCN);
  toggleEl("btn-side-tab-cai-dat", isGVCN);
  toggleEl("btn-tab-ca-nhan", isStudent);
  toggleEl("btn-side-tab-ca-nhan", isStudent);

  if (isStudent) switchTab("tab-ca-nhan");
}

function toggleEl(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  if (show) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

function toggleMasterEditSwitch() {
  if (appState.roleLevel !== "GVCN") return;
  appState.allowStudentLeaderEdit = !appState.allowStudentLeaderEdit;
  saveStateToLocal();
  const btn = document.getElementById("btnMasterSwitch");
  if (btn) {
    btn.innerHTML = appState.allowStudentLeaderEdit 
      ? `<i class="fa-solid fa-toggle-on text-emerald-600"></i><span class="hidden md:inline ml-1">Cán sự: Mở ghi</span>`
      : `<i class="fa-solid fa-toggle-off text-slate-400"></i><span class="hidden md:inline ml-1">Cán sự: Khóa ghi</span>`;
  }
  alert(appState.allowStudentLeaderEdit ? "Đã MỞ quyền ghi nhận nề nếp cho Ban cán sự lớp!" : "Đã KHÓA quyền ghi nề nếp của Ban cán sự lớp!");
  if (typeof renderAttendanceSession === "function") renderAttendanceSession();
}

// ==================== 8. TOP TICKER LỜI CHÚC & THÔNG ĐIỆP ====================
function updateCelebrationTicker() {
  const tickerEl = document.getElementById("topBannerTicker");
  const dateEl = document.getElementById("topBannerDate");
  const now = new Date();
  
  if (dateEl) dateEl.innerText = now.toLocaleDateString("vi-VN");
  if (!tickerEl) return;

  if (appState.customTicker && appState.customTicker.trim() !== "") {
    tickerEl.innerHTML = `<i class="fa-solid fa-bullhorn mr-1.5 text-amber-300"></i><b>Lời nhắn của Thầy:</b> ${appState.customTicker}`;
    return;
  }

  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (m === 11 && d === 20) {
    tickerEl.innerHTML = `🎓💐 Tri ân Ngày Nhà giáo Việt Nam 20/11! Kính chúc Thầy chủ nhiệm luôn mạnh khỏe, hạnh phúc và tràn đầy nhiệt huyết!`;
  } else if (m === 3 && d === 8) {
    tickerEl.innerHTML = `💐 Chào mừng Ngày Quốc tế Phụ nữ 8/3! Chúc các bạn nữ 10A12 luôn vui tươi, xinh đẹp và tỏa sáng!`;
  } else if (m === 3 && d === 26) {
    tickerEl.innerHTML = `🇻🇳 Nhiệt liệt chào mừng Ngày thành lập Đoàn 26/3! Tuổi trẻ K58 THPT số 1 Quang Trung tiên phong, sáng tạo!`;
  } else if (m === 10 && d === 20) {
    tickerEl.innerHTML = `🌷 Chúc mừng Ngày Phụ nữ Việt Nam 20/10! Gửi ngàn lời chúc yêu thương đến nữ sinh tập thể 10A12!`;
  } else {
    tickerEl.innerHTML = `⭐ Chúc tập thể 10A12 mỗi ngày đến trường là một ngày vui — Học tập chăm chỉ, chấp hành nghiêm nề nếp!`;
  }
}

function saveCustomBannerTicker() {
  const input = document.getElementById("customBannerTickerInput");
  if (!input) return;
  appState.customTicker = input.value.trim();
  saveStateToLocal();
  updateCelebrationTicker();
  alert("Đã cập nhật thông điệp lên thanh tiêu đề!");
}

// ==================== 9. BANNER TIẾN ĐỘ TIẾT HỌC THỜI GIAN THỰC ====================
function updateLiveDashboardEngine() {
  const now = new Date();
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const clockEl = document.getElementById("digitalClockText");
  if (clockEl) clockEl.innerText = now.toLocaleTimeString('vi-VN');

  const dutySchedule = { 1: "Tổ 1 (Sáng) • Tổ 2 (Chiều)", 2: "Tổ 3 (Sáng) • Tổ 4 (Chiều)", 3: "Tổ 1 (Sáng)", 4: "Tổ 2 (Sáng)", 5: "Tổ 3 & Tổ 4 (Sáng)" };
  const dutyTeam = document.getElementById("liveDutyTeam");
  if (dutyTeam) dutyTeam.innerText = dutySchedule[day] || "Nghỉ";

  let periodName = "Ngoài giờ lên lớp";
  let subjectDetail = "Không có môn học";
  let percent = 0;
  let remain = 0;

  const dayKey = `t${day + 1}`;
  const isMorning = currentMinutes <= 720;

  if (day >= 1 && day <= 3) {
    const periods = isMorning ? TKB_CONFIG_SO3.morning : TKB_CONFIG_SO3.afternoon;
    const timeRanges = isMorning ? [
      { p: 1, start: 7 * 60, end: 7 * 60 + 45 },
      { p: 2, start: 7 * 60 + 50, end: 8 * 60 + 35 },
      { p: 3, start: 8 * 60 + 55, end: 9 * 60 + 40 },
      { p: 4, start: 9 * 60 + 45, end: 10 * 60 + 30 },
      { p: 5, start: 10 * 60 + 35, end: 11 * 60 + 20 }
    ] : [
      { p: 1, start: 14 * 60, end: 14 * 60 + 45 },
      { p: 2, start: 14 * 60 + 50, end: 15 * 60 + 35 },
      { p: 3, start: 15 * 60 + 55, end: 16 * 60 + 40 }
    ];

    const cur = timeRanges.find(r => currentMinutes >= r.start && currentMinutes < r.end);
    if (cur) {
      const pData = periods.find(p => p.period === cur.p);
      const subject = pData ? pData[dayKey] : "-";
      periodName = `${isMorning ? 'Sáng' : 'Chiều'} • Tiết ${cur.p}`;
      subjectDetail = subject !== "-" ? subject : "Tự học / Tiết chờ";
      
      const total = cur.end - cur.start;
      const elapsed = currentMinutes - cur.start;
      percent = Math.min(100, Math.round((elapsed / total) * 100));
      remain = cur.end - currentMinutes;
    }
  }

  const bannerTitle = document.getElementById("liveBannerTitle");
  if (bannerTitle) bannerTitle.innerText = `${periodName}: ${subjectDetail}`;

  const progressLabel = document.getElementById("currentPeriodLabel");
  const progressRemaining = document.getElementById("periodTimeRemaining");
  const progressBar = document.getElementById("periodProgressBar");

  if (progressLabel) progressLabel.innerText = subjectDetail !== "Không có môn học" ? `Môn: ${subjectDetail}` : "Ngoài giờ tiết học";
  if (progressRemaining) progressRemaining.innerText = remain > 0 ? `Còn ${remain}p (${percent}%)` : `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
}

// ==================== 10. TAB 1: TỔNG QUAN (LƯỚI 7 Ô BUỔI HỌC CÓ CHI TIẾT LỖI) ====================
function renderOverviewDashboard() {
  const avg = appState.students.length > 0
    ? (appState.students.reduce((acc, s) => acc + (Number(s.diemThiDua) || 0), 0) / appState.students.length).toFixed(1)
    : "100.0";
  const avgEl = document.getElementById("dashAvgScore");
  if (avgEl) avgEl.innerText = `${avg}đ`;

  const totalEl = document.getElementById("dashTotalStudents");
  if (totalEl) totalEl.innerText = `${appState.students.length} / ${appState.students.length}`;

  const fundEl = document.getElementById("dashFundBalance");
  if (fundEl) fundEl.innerText = `${(appState.fundSummary.balance || 0).toLocaleString()} đ`;

  renderTT22Summary();
  renderTopCommendations();
  renderSessionsGrid();
}

function renderTT22Summary() {
  const total = appState.students.length || 45;
  let tot = 0, kha = 0, dat = 0, chuadat = 0;

  appState.students.forEach(s => {
    const pts = Number(s.diemThiDua) || 100;
    if (pts >= 90) tot++;
    else if (pts >= 70) kha++;
    else if (pts >= 50) dat++;
    else chuadat++;
  });

  const totEl = document.getElementById("tt22TotCount");
  const khaEl = document.getElementById("tt22KhaCount");
  const datEl = document.getElementById("tt22DatCount");
  const chuadatEl = document.getElementById("tt22ChuaDatCount");

  if (totEl) totEl.innerText = `${tot} HS (${Math.round(tot/total*100)}%)`;
  if (khaEl) khaEl.innerText = `${kha} HS (${Math.round(kha/total*100)}%)`;
  if (datEl) datEl.innerText = `${dat} HS (${Math.round(dat/total*100)}%)`;
  if (chuadatEl) chuadatEl.innerText = `${chuadat} HS (${Math.round(chuadat/total*100)}%)`;
}

function renderTopCommendations() {
  const container = document.getElementById("topCommendationsList");
  if (!container) return;

  const plusMap = {};
  appState.violations.forEach(v => {
    if (v.points > 0) {
      plusMap[v.studentId] = (plusMap[v.studentId] || 0) + v.points;
    }
  });

  const topStudents = Object.keys(plusMap)
    .map(stId => {
      const st = appState.students.find(s => s.id === stId);
      return { id: stId, name: st ? st.hoTen : stId, team: st ? st.to : "", pts: plusMap[stId] };
    })
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  if (topStudents.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic py-2"><i class="fa-solid fa-star text-amber-500 mr-1.5"></i>Chưa có điểm cộng ghi nhận tuần này. Tích cực phát biểu và làm việc tốt nhé!</p>`;
    return;
  }

  container.innerHTML = topStudents.map((st, idx) => `
    <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">${idx + 1}</span>
        <div>
          <p class="text-xs font-black text-slate-800">${st.name} <span class="text-[10px] text-slate-500">(${st.team})</span></p>
          <span class="text-[10px] text-emerald-700 font-medium">Biểu dương việc tốt / phát biểu</span>
        </div>
      </div>
      <span class="text-xs font-black text-emerald-700">+${st.pts}đ</span>
    </div>
  `).join("");
}

function renderSessionsGrid() {
  const container = document.getElementById("sessionsGridContainer");
  if (!container) return;

  const sessions = [
    { key: "T2_SANG", name: "Sáng Thứ 2", icon: "fa-sun text-amber-500", timeRange: "06:45 - 11:20" },
    { key: "T2_CHIEU", name: "Chiều Thứ 2", icon: "fa-cloud-sun text-indigo-500", timeRange: "13:45 - 16:40" },
    { key: "T3_SANG", name: "Sáng Thứ 3", icon: "fa-sun text-amber-500", timeRange: "06:45 - 11:20" },
    { key: "T3_CHIEU", name: "Chiều Thứ 3", icon: "fa-cloud-sun text-indigo-500", timeRange: "13:45 - 16:40" },
    { key: "T4_SANG", name: "Sáng Thứ 4", icon: "fa-sun text-amber-500", timeRange: "06:45 - 11:20" },
    { key: "T5_SANG", name: "Sáng Thứ 5", icon: "fa-sun text-amber-500", timeRange: "06:45 - 11:20" },
    { key: "T6_SANG", name: "Sáng Thứ 6", icon: "fa-sun text-amber-500", timeRange: "06:45 - 11:20" }
  ];

  const isGVCN = (appState.roleLevel === "GVCN");

  container.innerHTML = sessions.map(sess => {
    const sessViolations = appState.violations.filter(v => v.time && v.time.includes(sess.name));
    
    const absentExcused = sessViolations.filter(v => v.criteria && v.criteria.includes("Có phép")).length;
    const absentUnexcused = sessViolations.filter(v => v.criteria && (v.criteria.includes("Không phép") || v.criteria.includes("K.Phép"))).length;
    const totalAbsent = absentExcused + absentUnexcused;
    const lateCount = sessViolations.filter(v => v.criteria && v.criteria.includes("trễ")).length;

    const totalEvents = sessViolations.filter(v => !v.criteria.includes("Có mặt")).length;
    const isGood = (totalEvents === 0);

    return `
      <div class="p-3.5 sm:p-4 rounded-2xl bg-white border ${isGood ? 'border-slate-200' : 'border-amber-300 bg-amber-50/15'} shadow-xs flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div class="flex items-center gap-2">
              <i class="fa-solid ${sess.icon} text-base"></i>
              <div>
                <h4 class="font-black text-xs sm:text-sm text-slate-800 uppercase tracking-tight">${sess.name}</h4>
                <span class="text-[9.5px] text-slate-400 font-mono block">${sess.timeRange}</span>
              </div>
            </div>
            <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full ${isGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              ${isGood ? 'Tốt (100%)' : `${totalEvents} phát sinh`}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1.5 mt-2.5 text-[11px]">
            <div class="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span class="text-[10px] text-slate-500 font-bold uppercase">Vắng:</span>
              <b class="${totalAbsent > 0 ? 'text-rose-600' : 'text-slate-700'}">${totalAbsent} em ${absentUnexcused > 0 ? `<span class="text-[9px] text-rose-500">(${absentUnexcused} KP)</span>` : ''}</b>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span class="text-[10px] text-slate-500 font-bold uppercase">Đi trễ:</span>
              <b class="${lateCount > 0 ? 'text-amber-600' : 'text-slate-700'}">${lateCount} em</b>
            </div>
          </div>
        </div>

        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          ${isGood ? `
            <div class="py-4 text-center text-emerald-600 space-y-1">
              <i class="fa-solid fa-circle-check text-lg"></i>
              <p class="text-[11px] font-bold">Buổi học chấp hành nề nếp xuất sắc.</p>
            </div>
          ` : sessViolations.filter(v => !v.criteria.includes("Có mặt")).map((v, vIdx) => {
            const isPlus = v.points > 0;
            const pointsClass = isPlus ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200';
            
            return `
              <div class="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1 text-xs hover:border-slate-300 transition">
                <div class="flex items-center justify-between gap-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-1.5 h-1.5 rounded-full ${isPlus ? 'bg-emerald-500' : 'bg-rose-500'} shrink-0"></span>
                    <b class="text-slate-900 font-black truncate">${v.studentName}</b>
                    <span class="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold shrink-0">${getStudentTeam(v.studentId)}</span>
                  </div>
                  <span class="font-mono font-black text-[11px] px-1.5 py-0.5 rounded border ${pointsClass} shrink-0">
                    ${isPlus ? '+' : ''}${v.points}đ
                  </span>
                </div>
                
                <p class="text-[11px] text-slate-700 leading-snug whitespace-normal break-words pl-3">
                  ${v.criteria}
                </p>

                <div class="flex items-center justify-between text-[9.5px] text-slate-400 pl-3 pt-0.5 border-t border-slate-50">
                  <span>${v.note ? `${v.note} • ` : ''}${v.sender || 'Cán sự'}</span>
                  ${isGVCN ? `
                    <button onclick="removeViolationItem('${v.incidentKey || vIdx}', '${v.studentId}', ${v.points})" class="text-slate-400 hover:text-rose-600 font-bold p-0.5" title="Xóa bản ghi này">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center gap-1.5">
          <button onclick="quickGoToAttendanceSession('${sess.key}')" class="flex-1 py-1.5 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-[11px] font-bold transition flex items-center justify-center gap-1">
            <i class="fa-solid fa-clipboard-user"></i> Điểm danh ca
          </button>
          <button onclick="openQuickScoreModalForSession('${sess.name}')" class="flex-1 py-1.5 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1">
            <i class="fa-solid fa-plus text-amber-600"></i> + Chấm lỗi/khen
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function quickGoToAttendanceSession(sessionKey) {
  const sel = document.getElementById("attendanceSessionSelect");
  if (sel) {
    sel.value = sessionKey;
    if (typeof changeAttendanceSession === "function") changeAttendanceSession(sessionKey);
  }
  switchTab("tab-thi-dua");
}

function openQuickScoreModalForSession(sessionName) {
  if (typeof openQuickScoreModal === "function") openQuickScoreModal("", "");
}

function removeViolationItem(incidentKeyOrIdx, studentId, points) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ Thầy chủ nhiệm mới có quyền xóa bản ghi nề nếp!");
    return;
  }
  if (!confirm("Thầy có chắc chắn muốn xóa bản ghi nề nếp này và hoàn lại điểm cho học sinh?")) return;

  const st = appState.students.find(s => s.id === studentId);
  if (st) {
    st.diemThiDua = Math.min(100, Math.max(0, (Number(st.diemThiDua) || 100) - points));
  }

  if (incidentKeyOrIdx && String(incidentKeyOrIdx).includes("_")) {
    appState.violations = appState.violations.filter(v => v.incidentKey !== incidentKeyOrIdx);
  } else {
    const idx = parseInt(incidentKeyOrIdx);
    if (!isNaN(idx)) appState.violations.splice(idx, 1);
  }

  saveStateToLocal();
  renderSessionsGrid();
  renderOverviewDashboard();
  if (typeof renderTeamDisciplineSummaryCards === "function") renderTeamDisciplineSummaryCards();
  if (typeof renderAttendanceSession === "function") renderAttendanceSession();
  alert("Đã xóa bản ghi và hoàn lại điểm cho học sinh thành công!");
}

// ==================== 23. TIỆN ÍCH DÙNG CHUNG ====================
function getStudentTeam(stId) {
  const st = appState.students.find(s => s.id === stId);
  return st ? st.to : "Tổ 1";
}

function getTT22Label(pts) {
  if (pts >= 90) return "Tốt";
  if (pts >= 70) return "Khá";
  if (pts >= 50) return "Đạt";
  return "Chưa đạt";
}

function copyParentLookupPortalLink() {
  const currentUrl = window.location.href;
  const lookupUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/")) + "/tracuu.html";
  const msg = `Kính gửi Quý Phụ huynh học sinh lớp 10A12 (K58-QT),
Để theo dõi nề nếp, chuyên cần, TKB Số 3 và tình trạng quỹ lớp của học sinh, kính mời Quý Phụ huynh truy cập Cổng tra cứu điện tử:
${lookupUrl}
👉 Cách tra cứu: Nhập Họ tên học sinh hoặc Số CCCD 12 số của con.
GVCN: ThS. Trần Dương Quốc Mẫn. Trân trọng!`;

  navigator.clipboard.writeText(msg).then(() => {
    alert("Đã sao chép link Cổng Tra Cứu kèm tin nhắn mẫu gửi nhóm Zalo!");
  }).catch(() => {
    prompt("Sao chép link gửi Zalo Phụ huynh:", lookupUrl);
  });
}

async function callApi(action, data = {}, method = "POST") {
  try {
    if (method === "GET") {
      const query = new URLSearchParams({ action, ...data }).toString();
      const res = await fetch(`${GAS_API_URL}?${query}`);
      return await res.json();
    } else {
      const res = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...data })
      });
      return await res.json();
    }
  } catch (err) {
    console.warn(`[Offline Mode] API ${action}:`, err);
    return { status: "offline", message: "Đang lưu trữ ngoại tuyến." };
  }
}

async function syncWithCloud() {
  const res = await callApi("getInitialData", {}, "GET");
  if (res && res.status === "success" && res.students && res.students.length > 0) {
    appState.students = res.students;
    if (res.violations) appState.violations = res.violations;
    if (res.campaigns) appState.campaigns = res.campaigns;
    if (res.fundPayments) appState.fundPayments = res.fundPayments;
    if (res.cashbook) appState.cashbook = res.cashbook;
    if (res.letters) appState.letters = res.letters;

    saveStateToLocal();
    renderAllSections();
  }
}

async function refreshData() {
  renderAllSections();
  await syncWithCloud();
  alert("Dữ liệu đã được nạp và làm mới thành công!");
}

// ==================== 24. ĐIỀU HƯỚNG TỔNG THỂ & KHỞI CHẠY ====================
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
  const targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.classList.remove("hidden");

  // Mobile nav buttons
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("nav-item-active");
    btn.classList.add("text-slate-400");
  });
  const mBtn = document.getElementById(`btn-${tabId}`);
  if (mBtn) {
    mBtn.classList.add("nav-item-active");
    mBtn.classList.remove("text-slate-400");
  }

  // Desktop side buttons (chữ sáng rõ nét trên Dark Navy)
  document.querySelectorAll(".side-nav-btn").forEach(btn => {
    btn.classList.remove("nav-item-active");
    btn.classList.remove("text-white");
    btn.classList.add("text-slate-200");
  });
  const sBtn = document.getElementById(`btn-side-${tabId}`);
  if (sBtn) {
    sBtn.classList.add("nav-item-active");
    sBtn.classList.remove("text-slate-200");
    sBtn.classList.add("text-white");
  }

  if (tabId === "tab-thi-dua") {
    if (typeof renderTeamDisciplineSummaryCards === "function") renderTeamDisciplineSummaryCards();
    if (typeof renderAttendanceSession === "function") renderAttendanceSession();
  }
  if (tabId === "tab-so-do-lop" && typeof renderSeatingChart === "function") renderSeatingChart();
  if (tabId === "tab-tkb" && typeof renderTkbSection === "function") renderTkbSection();
  if (tabId === "tab-lao-dong" && typeof render7DutySection === "function") render7DutySection();
  if (tabId === "tab-van-the-my" && typeof renderVtmSection === "function") renderVtmSection();
  if (tabId === "tab-so-dau-bai" && typeof renderPeriodCards === "function") renderPeriodCards();
  if (tabId === "tab-bien-ban" && typeof renderOfficialShlReportTab === "function") renderOfficialShlReportTab();
  if (tabId === "tab-cai-dat" && typeof renderSettingsTab === "function") renderSettingsTab();
  if (tabId === "tab-danh-sach" && typeof renderStudentCards === "function") renderStudentCards(appState.students);
  if (tabId === "tab-quy-lop" && typeof renderFundChecklist === "function") renderFundChecklist();
  if (tabId === "tab-tam-tu" && typeof renderTeacherLettersList === "function") renderTeacherLettersList();
}

function renderAllSections() {
  renderOverviewDashboard();
  if (typeof renderTeamDisciplineSummaryCards === "function") renderTeamDisciplineSummaryCards();
  if (typeof renderAttendanceSession === "function") renderAttendanceSession();
  if (typeof renderSeatingChart === "function") renderSeatingChart();
  if (typeof renderTkbSection === "function") renderTkbSection();
  if (typeof render7DutySection === "function") render7DutySection();
  if (typeof renderVtmSection === "function") renderVtmSection();
  if (typeof renderPeriodCards === "function") renderPeriodCards();
  if (typeof renderFundCampaigns === "function") renderFundCampaigns();
  if (typeof renderFundChecklist === "function") renderFundChecklist();
  if (typeof renderStudentCards === "function") renderStudentCards(appState.students);
  if (typeof renderSettingsTab === "function") renderSettingsTab();
  updateCelebrationTicker();
  if (appState.roleLevel === "STUDENT" && typeof renderStudentPortal === "function") renderStudentPortal();
}

// Khởi chạy hệ thống khi nạp trang
document.addEventListener("DOMContentLoaded", () => {
  initAuthSession();
  buildAutoWeekDropdown();
  syncAttendanceSessionOnLoad();
  renderAllSections();
  updateCelebrationTicker();
  updateLiveDashboardEngine();
  setInterval(updateCelebrationTicker, 60000);
  setInterval(updateLiveDashboardEngine, 1000);
  syncWithCloud();
});