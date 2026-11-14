/**
 * ============================================================================
 * SỔ TAY CHỦ NHIỆM ĐIỆN TỬ 10A12 (K58-QT) - HẠT NHÂN HỆ THỐNG (JS/CORE.JS)
 * Tác giả: GVCN ThS. Trần Dương Quốc Mẫn
 * Phiên bản: 14.2 (Tự động hóa 35 Tuần, 7 Ca học thực tế, RBAC & Live Sync)
 * ============================================================================
 */

const GAS_API_URL = localStorage.getItem("10A12_SCRIPT_URL") || "https://script.google.com/macros/s/AKfycby1bzee0jofemhb1lTYoi_wIdFpd_jneRKW8TtzUDyrtKGdkfk6K0OGErPfyKsjlB9hfQ/exec";

// ==================== 1. CHUẨN HÓA TIẾNG VIỆT & TIỆN ÍCH AN TOÀN ====================
function removeVietnameseTones(str) {
  if (!str) return "";
  str = String(str);
  if (typeof str.normalize === "function") {
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
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

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function safeMediaSrc(src) {
  const s = String(src || "").trim();
  if (!s) return "";
  if (/^(data:(image|video)\/[a-z0-9.+-]+;base64,|https?:\/\/|tkb_10a12\.png|\.?\/)/i.test(s)) return s;
  return "";
}

function parseScore(val, fallback = 100) {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function getLocalDateKey(dateObj = new Date()) {
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateVN(dateObj = new Date()) {
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getWeekNumberFromDate(dateObj = new Date()) {
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return getAutoSchoolWeek();
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  SCHOOL_YEAR_START_MONDAY = getSchoolYearStartMonday();
  const diffTime = localMidnight.getTime() - SCHOOL_YEAR_START_MONDAY.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(35, Math.max(1, diffWeeks));
}

function compressImageDataUrl(file, maxWidth = 1280, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được tệp ảnh."));
    reader.onload = (ev) => {
      const rawDataUrl = ev.target.result;
      if (typeof document === "undefined" || !String(rawDataUrl).startsWith("data:image/")) {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        let targetW = img.width || maxWidth;
        let targetH = img.height || maxWidth;
        if (targetW > maxWidth) {
          targetH = Math.round((targetH * maxWidth) / targetW);
          targetW = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        try {
          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch (err) {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
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

// ==================== 4. CẤU HÌNH THỜI KHÓA BIỂU ĐỘNG (NGUỒN DUY NHẤT: appState.tkbConfig) ====================
const LEGACY_TKB_STORAGE_KEYS = [
  "TKB_CONFIG_SO3",
  "TKB_CONFIG_SO4",
  "10A12_TKB_SO3",
  "10A12_TKB_AFTERNOON_OLD"
];

function purgeLegacyTkbCacheKeys() {
  try {
    if (typeof localStorage === "undefined" || !localStorage) return;
    LEGACY_TKB_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
  } catch (e) {}
}

function createInitialTkbConfig() {
  return {
    version: "Số 4 (Từ 09/11/2026)",
    versionLabel: "Số 4",
    effectiveDate: "09/11/2026",
    imageBase64: "",
    morning: [
      { period: 1, time: "07:00 - 07:45", t2: "TN&HN 1 (Mẫn)", t3: "QP&AN (Vân)", t4: "LÍ (Âu)", t5: "TN&HN 3 (Đài)", t6: "GDTC (Thành)", t7: "-" },
      { period: 2, time: "07:50 - 08:35", t2: "TN&HN 2 (Mẫn)", t3: "LÍ (Âu)", t4: "CĐ Văn (Nhân)", t5: "GDTC (Thành)", t6: "CĐ Hóa (Trang)", t7: "-" },
      { period: 3, time: "08:55 - 09:40", t2: "T.ANH (Trúc)", t3: "VĂN (Hân)", t4: "TOÁN (Mẫn)", t5: "HÓA (Trang)", t6: "T.ANH (Trúc)", t7: "-" },
      { period: 4, time: "09:45 - 10:30", t2: "VĂN (Hân)", t3: "VĂN (Hân)", t4: "TOÁN (Mẫn)", t5: "SỬ (X.Thủy)", t6: "T.ANH (Trúc)", t7: "-" },
      { period: 5, time: "10:35 - 11:20", t2: "-", t3: "-", t4: "ĐỊA (P.Quốc)", t5: "TOÁN (Mẫn)", t6: "-", t7: "-" }
    ],
    afternoon: [
      { period: 1, time: "14:00 - 14:45", t2: "-", t3: "-", t4: "-", t5: "-", t6: "-", t7: "-" },
      { period: 2, time: "14:50 - 15:35", t2: "-", t3: "-", t4: "-", t5: "-", t6: "-", t7: "-" },
      { period: 3, time: "15:55 - 16:40", t2: "-", t3: "-", t4: "-", t5: "-", t6: "-", t7: "-" }
    ]
  };
}

function getDefaultTkbConfig() {
  return createInitialTkbConfig();
}

function normalizeTkbConfig(raw) {
  const fb = getDefaultTkbConfig();
  if (!raw || typeof raw !== "object") return fb;

  const normSessionRows = (srcList, metaRows, defaultTimeLabel) => {
    const baseList = Array.isArray(srcList) && srcList.length > 0 ? srcList : metaRows;
    return baseList.map((srcRow, idx) => {
      const meta = metaRows[idx] || { period: idx + 1, time: `${defaultTimeLabel} ${idx + 1}` };
      const r = (srcRow && typeof srcRow === "object") ? srcRow : {};
      const cell = (k) => {
        const v = String((r[k] !== undefined && r[k] !== null) ? r[k] : "-").trim();
        return (!v || v === "—") ? "-" : v;
      };
      return {
        period: Number(r.period) || meta.period || (idx + 1),
        time: String(r.time || meta.time || `Tiết ${idx + 1}`),
        t2: cell("t2"),
        t3: cell("t3"),
        t4: cell("t4"),
        t5: cell("t5"),
        t6: cell("t6"),
        t7: cell("t7")
      };
    });
  };

  let rawVer = String(raw.versionLabel || raw.version || fb.versionLabel).trim() || fb.versionLabel;
  if (/^\d+$/.test(rawVer)) rawVer = `Số ${rawVer}`;
  const splitVer = rawVer.replace(/\s*\([^)]*\)\s*$/, "").split(/\s*-\s*Từ/i)[0].trim() || fb.versionLabel;
  const hasExplicitDate = raw.effectiveDate !== undefined && raw.effectiveDate !== null;
  const eDate = (hasExplicitDate ? String(raw.effectiveDate) : fb.effectiveDate).trim();
  const fullVersion = eDate
    ? `${splitVer} (Từ ${eDate})`
    : ((raw.version && String(raw.version).includes(splitVer)) ? String(raw.version).trim() : splitVer);

  return {
    version: fullVersion,
    versionLabel: splitVer,
    effectiveDate: eDate,
    imageBase64: typeof raw.imageBase64 === "string" ? raw.imageBase64 : "",
    morning: normSessionRows(raw.morning, fb.morning, "Tiết Sáng"),
    afternoon: normSessionRows(raw.afternoon, fb.afternoon, "Tiết Chiều")
  };
}

function getCloudSafeTkbConfig(cfg) {
  const src = normalizeTkbConfig(cfg || getActiveTkbConfig());
  return {
    version: src.version,
    versionLabel: src.versionLabel,
    effectiveDate: src.effectiveDate,
    morning: src.morning,
    afternoon: src.afternoon
  };
}

function getActiveTkbConfig() {
  if (!appState.tkbConfig || typeof appState.tkbConfig !== "object") {
    appState.tkbConfig = getDefaultTkbConfig();
  }
  return appState.tkbConfig;
}

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

// ==================== 6. BỘ MÁY TỰ ĐỘNG HÓA TUẦN & BUỔI HỌC (ĐỘNG THEO CÀI ĐẶT) ====================
function normalizeDateToMonday(dateInput) {
  let d;
  if (dateInput instanceof Date) {
    d = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  } else if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const parts = dateInput.trim().split("-").map(Number);
    d = new Date(parts[0], parts[1] - 1, parts[2]);
  } else if (typeof dateInput === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput.trim())) {
    const parts = dateInput.trim().split("/").map(Number);
    d = new Date(parts[2], parts[1] - 1, parts[0]);
  } else {
    d = new Date(2026, 8, 7); // Mặc định Thứ Hai 07/09/2026
  }
  if (isNaN(d.getTime())) d = new Date(2026, 8, 7);
  const day = d.getDay(); // 0: CN, 1: T2...
  const diffToMon = (day === 0) ? -6 : (1 - day);
  d.setDate(d.getDate() + diffToMon);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getSchoolYearStartMonday() {
  const saved = localStorage.getItem("10A12_SCHOOL_START_DATE") || "2026-09-07";
  return normalizeDateToMonday(saved);
}

function getSchoolYearStartDateIso() {
  const mon = getSchoolYearStartMonday();
  const yyyy = mon.getFullYear();
  const mm = String(mon.getMonth() + 1).padStart(2, "0");
  const dd = String(mon.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

let SCHOOL_YEAR_START_MONDAY = getSchoolYearStartMonday();

function getAutoSchoolWeek() {
  SCHOOL_YEAR_START_MONDAY = getSchoolYearStartMonday();
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = todayMidnight.getTime() - SCHOOL_YEAR_START_MONDAY.getTime();
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(35, Math.max(1, diffWeeks));
}

function buildAutoWeekDropdown() {
  SCHOOL_YEAR_START_MONDAY = getSchoolYearStartMonday();
  const selectEl = document.getElementById("currentWeekSelect");
  if (!selectEl) return;

  const currentRealWeek = getAutoSchoolWeek();
  if (!appState.selectedWeek) appState.selectedWeek = currentRealWeek;

  let optionsHtml = "";
  for (let w = 1; w <= 35; w++) {
    const mon = new Date(SCHOOL_YEAR_START_MONDAY.getFullYear(), SCHOOL_YEAR_START_MONDAY.getMonth(), SCHOOL_YEAR_START_MONDAY.getDate() + (w - 1) * 7);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);

    const monStr = `${String(mon.getDate()).padStart(2, '0')}/${String(mon.getMonth() + 1).padStart(2, '0')}`;
    const sunStr = `${String(sun.getDate()).padStart(2, '0')}/${String(sun.getMonth() + 1).padStart(2, '0')}/${sun.getFullYear()}`;

    const isCurrent = (w === currentRealWeek);
    const isArchived = Boolean(appState.weeklyArchives && (appState.weeklyArchives[`TUAN_${w}`] || appState.weeklyArchives[`Tuan_${w}`]));
    const suffix = isCurrent ? " • Hiện tại" : (isArchived ? " • Đã chốt" : "");
    const label = `Tuần ${w} (${monStr} - ${sunStr})${suffix}`;

    optionsHtml += `<option value="${w}" ${w === Number(appState.selectedWeek) ? "selected" : ""}>${label}</option>`;
  }

  selectEl.innerHTML = optionsHtml;

  if (typeof switchWeekScope === "function") {
    switchWeekScope(appState.selectedWeek);
  }
}

function getScopedWeekData() {
  const selectedWeek = Number(appState.selectedWeek) || getAutoSchoolWeek();
  const realWeek = getAutoSchoolWeek();
  const archive = appState.weeklyArchives ? (appState.weeklyArchives[`TUAN_${selectedWeek}`] || appState.weeklyArchives[`Tuan_${selectedWeek}`]) : null;
  if (archive && Array.isArray(archive.students)) {
    return {
      isArchivedView: true,
      isEditable: false,
      selectedWeek,
      realWeek,
      archive,
      students: archive.students,
      violations: Array.isArray(archive.violations) ? archive.violations : [],
      periodLogs: Array.isArray(archive.periodLogs) ? archive.periodLogs : []
    };
  }
  const weekViolations = appState.violations.filter(v => !v.week || Number(v.week) === selectedWeek);
  const weekPeriodLogs = appState.periodLogs.filter(p => !p.week || Number(p.week) === selectedWeek);
  return {
    isArchivedView: false,
    isEditable: selectedWeek === realWeek,
    selectedWeek,
    realWeek,
    archive: null,
    students: appState.students,
    violations: weekViolations,
    periodLogs: weekPeriodLogs
  };
}

function getNextMondayRolloverInfo(nowDate = new Date()) {
  const now = nowDate instanceof Date ? nowDate : new Date(nowDate);
  const currentWeek = getAutoSchoolWeek();
  SCHOOL_YEAR_START_MONDAY = getSchoolYearStartMonday();
  const curWeekMondayMs = SCHOOL_YEAR_START_MONDAY.getTime() + (currentWeek - 1) * 7 * 86400000;
  let nextMondayMs = curWeekMondayMs + 7 * 86400000;
  while (nextMondayMs <= now.getTime()) {
    nextMondayMs += 7 * 86400000;
  }
  const diffMs = Math.max(0, nextMondayMs - now.getTime());
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (24 * 60));
  const hours = Math.floor((totalMins % (24 * 60)) / 60);
  const mins = totalMins % 60;
  const nextMondayDate = new Date(nextMondayMs);
  const dateLabel = `${String(nextMondayDate.getDate()).padStart(2, '0')}/${String(nextMondayDate.getMonth() + 1).padStart(2, '0')}/${nextMondayDate.getFullYear()} 00:00`;
  return {
    currentWeek,
    nextWeek: Math.min(35, currentWeek + 1),
    nextMondayDate,
    dateLabel,
    days,
    hours,
    minutes: mins,
    formatted: `${days} ngày ${hours}g ${mins}p`
  };
}

function checkAndPerformClientMondayRollover(options = {}) {
  const curWeek = getAutoSchoolWeek();
  const lastStored = parseInt(localStorage.getItem("10A12_LAST_ACTIVE_WEEK") || "0", 10) || 0;

  if (!lastStored) {
    localStorage.setItem("10A12_LAST_ACTIVE_WEEK", String(curWeek));
    appState.lastAutoRolloverWeek = curWeek;
    return { rolledOver: false, initialized: true, currentWeek: curWeek };
  }

  if (lastStored >= curWeek) {
    return { rolledOver: false, currentWeek: curWeek };
  }

  const weekToArchive = curWeek - 1;
  if (!appState.weeklyArchives) appState.weeklyArchives = {};
  const archiveKey = `TUAN_${weekToArchive}`;

  if (weekToArchive >= 1 && !appState.weeklyArchives[archiveKey]) {
    const sum = appState.students.reduce((acc, s) => acc + parseScore(s.diemThiDua, 100), 0);
    const avgStr = (appState.students.length ? (sum / appState.students.length).toFixed(1) : "100.0") + "đ";
    const weekViolations = (appState.violations || []).filter(v => !v.week || Number(v.week) === weekToArchive);
    const weekPeriodLogs = (appState.periodLogs || []).filter(p => !p.week || Number(p.week) === weekToArchive);
    const archiveObj = {
      week: weekToArchive,
      lockedAt: new Date().toLocaleString("vi-VN"),
      lockedBy: "Tự động 00:00 Thứ 2",
      avgScore: avgStr,
      students: JSON.parse(JSON.stringify(appState.students)),
      violations: JSON.parse(JSON.stringify(weekViolations)),
      periodLogs: JSON.parse(JSON.stringify(weekPeriodLogs))
    };
    appState.weeklyArchives[archiveKey] = archiveObj;

    if (!options.skipCloudSync && appState.authToken && appState.roleLevel === "GVCN") {
      callApi("saveWeeklyArchive", { archiveKey, archive: archiveObj }, "POST");
    }
  }

  appState.students.forEach(s => {
    s.diemThiDua = 100;
  });

  if (appState.dutyAssignments && typeof appState.dutyAssignments === "object") {
    Object.keys(appState.dutyAssignments).forEach(sessKey => {
      if (appState.dutyAssignments[sessKey]) {
        appState.dutyAssignments[sessKey].status = "CHUA_DANH_GIA";
        appState.dutyAssignments[sessKey].note = "";
        appState.dutyAssignments[sessKey].studentEvaluations = {};
      }
    });
  }

  appState.selectedWeek = curWeek;
  appState.lastAutoRolloverWeek = curWeek;
  appState.lastAutoRolloverAt = new Date().toLocaleString("vi-VN");
  localStorage.setItem("10A12_LAST_ACTIVE_WEEK", String(curWeek));
  localStorage.setItem("10A12_LAST_ROLLOVER_AT", appState.lastAutoRolloverAt);
  saveStateToLocal();

  if (!options.skipCloudSync && appState.authToken && appState.roleLevel === "GVCN") {
    callApi("resetWeeklyScores", {}, "POST");
    callApi("saveConfig", {
      lastAutoRolloverWeek: String(curWeek),
      lastAutoRolloverAt: appState.lastAutoRolloverAt
    }, "POST");
  }

  if (typeof buildAutoWeekDropdown === "function" && typeof document !== "undefined" && document.getElementById("currentWeekSelect")) {
    buildAutoWeekDropdown();
    if (typeof renderAllSections === "function") renderAllSections();
  }

  return {
    rolledOver: true,
    archivedWeek: weekToArchive,
    archivedKey: archiveKey,
    currentWeek: curWeek,
    rolledOverAt: appState.lastAutoRolloverAt
  };
}

function updateWeeklyRolloverUI() {
  const info = getNextMondayRolloverInfo();
  const countdownEl = document.getElementById("weeklyRolloverCountdownText");
  if (countdownEl) {
    countdownEl.innerText = `Sau ${info.formatted} (00:00 Thứ 2 • ${info.dateLabel.split(" ")[0]})`;
  }
  const lastAtEl = document.getElementById("autoRolloverLastTime");
  if (lastAtEl) {
    lastAtEl.innerText = appState.lastAutoRolloverAt || "Sẵn sàng chốt sổ vào 00:00 Thứ 2 tới";
  }
  const triggerBadgeEl = document.getElementById("autoRolloverTriggerBadge");
  if (triggerBadgeEl) {
    triggerBadgeEl.innerHTML = appState.mondayRolloverTriggerActive
      ? `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> Trigger Apps Script 00:00 T2: Đã bật`
      : `<i class="fa-solid fa-clock text-amber-600 mr-1"></i> Tự động khi mở sổ T2 (hoặc bật Trigger GS)`;
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

function getSessionKeyByName(name) {
  const map = {
    "Sáng Thứ 2": "T2_SANG", "Chiều Thứ 2": "T2_CHIEU",
    "Sáng Thứ 3": "T3_SANG", "Chiều Thứ 3": "T3_CHIEU",
    "Sáng Thứ 4": "T4_SANG", "Sáng Thứ 5": "T5_SANG", "Sáng Thứ 6": "T6_SANG"
  };
  return map[name] || "T2_SANG";
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
  currentUser: safeJsonParse(localStorage.getItem("10A12_SESSION_USER"), null),
  authToken: localStorage.getItem("10A12_AUTH_TOKEN") || "",
  roleLevel: "GUEST",
  allowStudentLeaderEdit: localStorage.getItem("10A12_ALLOW_EDIT") !== "false",

  selectedWeek: getAutoSchoolWeek(),
  currentSessionKey: getAutoSessionKey(),
  currentSessionLabel: getSessionLabel(getAutoSessionKey()),
  currentCampaignId: "KY1_100K",
  currentStudentTeamFilter: "ALL",

  students: safeJsonParse(localStorage.getItem("10A12_STUDENTS_V9"), null) || DEFAULT_STUDENTS_10A12,
  violations: safeJsonParse(localStorage.getItem("10A12_VIOLATIONS_V9"), []),
  campaigns: safeJsonParse(localStorage.getItem("10A12_CAMPAIGNS_V9"), null) || [
    { id: "KY1_100K", title: "Quỹ Lớp Học Kỳ 1", target: 100000, status: "Đang thu" },
    { id: "KY2_STEM", title: "Quỹ Hoạt Động Trải Nghiệm & STEM", target: 50000, status: "Đang thu" }
  ],
  fundPayments: safeJsonParse(localStorage.getItem("10A12_PAYMENTS_V9"), []),
  cashbook: safeJsonParse(localStorage.getItem("10A12_CASHBOOK_V9"), null) || [
    { code: "CHI_01", time: "15/10/2026", type: "CHI", category: "Vệ sinh & Cơ sở vật chất", amount: 150000, author: "Thủ quỹ lớp", note: "Mua chổi quét lớp và nước lau sàn", status: "DA_DUYET" }
  ],
  auditLogs: safeJsonParse(localStorage.getItem("10A12_AUDIT_LOGS"), []),
  deletedStudents: safeJsonParse(localStorage.getItem("10A12_DELETED_STUDENTS"), []),
  leaveRequests: safeJsonParse(localStorage.getItem("10A12_LEAVE_REQUESTS"), []),
  specialViolationReports: safeJsonParse(localStorage.getItem("10A12_SPECIAL_VIOLATION_REPORTS"), []),
  profileCorrections: safeJsonParse(localStorage.getItem("10A12_PROFILE_CORRECTIONS"), []),
  periodLogs: safeJsonParse(localStorage.getItem("10A12_PERIODS_V9"), []),
  letters: safeJsonParse(localStorage.getItem("10A12_LETTERS_V9"), []),
  criteriaList: safeJsonParse(localStorage.getItem("10A12_CRITERIA_V9"), null) || DEFAULT_CRITERIA_LIST,
  attendanceRecords: safeJsonParse(localStorage.getItem("10A12_ATT_RECORDS"), {}),
  dutyAssignments: safeJsonParse(localStorage.getItem("10A12_DUTY_7SESSIONS"), {}),
  volunteerLaborList: safeJsonParse(localStorage.getItem("10A12_VOLUNTEER_LABOR"), []),
  vtmEvents: safeJsonParse(localStorage.getItem("10A12_VTM_EVENTS"), []),
  classMedia: safeJsonParse(localStorage.getItem("10A12_CLASS_MEDIA"), []),
  customTicker: localStorage.getItem("10A12_CUSTOM_TICKER") || "",
  tkbCustomImage: localStorage.getItem("10A12_TKB_IMAGE") || "tkb_10a12.png",
  tkbUpdatedAt: localStorage.getItem("10A12_TKB_UPDATED_AT") || "",
  tkbConfig: (() => {
    purgeLegacyTkbCacheKeys();
    const cfg = normalizeTkbConfig(safeJsonParse(localStorage.getItem("10A12_TKB_CONFIG"), null));
    const storedImg = localStorage.getItem("10A12_TKB_IMAGE") || "";
    if (!cfg.imageBase64 && storedImg && storedImg.startsWith("data:image")) {
      cfg.imageBase64 = storedImg;
    }
    return cfg;
  })(),
  lastAutoRolloverWeek: parseInt(localStorage.getItem("10A12_LAST_ACTIVE_WEEK") || "0", 10) || getAutoSchoolWeek(),
  lastAutoRolloverAt: localStorage.getItem("10A12_LAST_ROLLOVER_AT") || "",
  mondayRolloverTriggerActive: localStorage.getItem("10A12_TRIGGER_ACTIVE") === "true",
  weeklyArchives: safeJsonParse(localStorage.getItem("10A12_WEEKLY_ARCHIVES"), {}),
  seatingHistory: safeJsonParse(localStorage.getItem("10A12_SEATING_HISTORY"), []),

  fundSummary: { totalIncome: 0, totalExpense: 150000, balance: -150000 },
  selectedStudentForDetail: null
};

let currentSeatingLayout = safeJsonParse(localStorage.getItem("classroom_10A12_glass_v9"), null) || DEFAULT_SEATING_LAYOUT;
let selectedSeatFirst = null;

function saveStateToLocal() {
  try {
    localStorage.setItem("10A12_STUDENTS_V9", JSON.stringify(appState.students));
    localStorage.setItem("10A12_VIOLATIONS_V9", JSON.stringify(appState.violations));
    localStorage.setItem("10A12_CAMPAIGNS_V9", JSON.stringify(appState.campaigns));
    localStorage.setItem("10A12_PAYMENTS_V9", JSON.stringify(appState.fundPayments));
    localStorage.setItem("10A12_CASHBOOK_V9", JSON.stringify(appState.cashbook));
    localStorage.setItem("10A12_AUDIT_LOGS", JSON.stringify(appState.auditLogs));
    localStorage.setItem("10A12_DELETED_STUDENTS", JSON.stringify(appState.deletedStudents || []));
    localStorage.setItem("10A12_LEAVE_REQUESTS", JSON.stringify(appState.leaveRequests || []));
    localStorage.setItem("10A12_SPECIAL_VIOLATION_REPORTS", JSON.stringify(appState.specialViolationReports || []));
    localStorage.setItem("10A12_PROFILE_CORRECTIONS", JSON.stringify(appState.profileCorrections || []));
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
    purgeLegacyTkbCacheKeys();
    localStorage.setItem("10A12_CUSTOM_TICKER", appState.customTicker || "");
    localStorage.setItem("10A12_TKB_IMAGE", appState.tkbCustomImage || "tkb_10a12.png");
    localStorage.setItem("10A12_TKB_UPDATED_AT", appState.tkbUpdatedAt || "");
    try {
      localStorage.setItem("10A12_TKB_CONFIG", JSON.stringify(getActiveTkbConfig()));
    } catch (tkbQuotaErr) {
      localStorage.setItem("10A12_TKB_CONFIG", JSON.stringify(getCloudSafeTkbConfig(getActiveTkbConfig())));
    }
    localStorage.setItem("10A12_LAST_ROLLOVER_AT", appState.lastAutoRolloverAt || "");
    localStorage.setItem("10A12_TRIGGER_ACTIVE", String(Boolean(appState.mondayRolloverTriggerActive)));
    localStorage.setItem("10A12_WEEKLY_ARCHIVES", JSON.stringify(appState.weeklyArchives));
    localStorage.setItem("10A12_SEATING_HISTORY", JSON.stringify(appState.seatingHistory));
    return true;
  } catch (err) {
    console.warn("[Storage Quota Warning]", err);
    return false;
  }
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

function matchStudentAccount(list, rawLower, cleanRawInput, baseInput, baseRaw) {
  if (!Array.isArray(list)) return null;
  return list.find(s => {
    const rawAccount = String(s.taiKhoan || s.tenDangNhap || "").toLowerCase().trim();
    const normAccount = removeVietnameseTones(rawAccount.replace(/\.k58qt$/i, ""));
    const normFullAccount = removeVietnameseTones(rawAccount);
    const sCleanName = removeVietnameseTones(s.hoTen);
    const sCode = removeVietnameseTones(s.id);
    return (rawAccount && rawAccount === rawLower) ||
           (rawAccount && rawAccount === `${baseRaw}.k58qt`) ||
           (normFullAccount && normFullAccount === cleanRawInput) ||
           (normAccount && normAccount === baseInput) ||
           (sCleanName && sCleanName === baseInput) ||
           (sCode && sCode === baseInput);
  }) || null;
}

async function handleUserLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const rawInput = document.getElementById("authUsernameInput").value.trim();
  const cleanInput = removeVietnameseTones(rawInput);
  const rawLower = rawInput.toLowerCase().replace(/\s+/g, "");
  const password = document.getElementById("authPasswordInput").value.trim();
  const errorBox = document.getElementById("loginErrorMsg");
  const submitBtn = document.getElementById("btnSubmitLogin");
  const prevBtnHtml = submitBtn ? submitBtn.innerHTML : "";

  if (errorBox) errorBox.classList.add("hidden");
  if (!rawInput || !password) {
    if (errorBox) {
      errorBox.innerText = "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!";
      errorBox.classList.remove("hidden");
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang xác thực...`;
  }

  try {
    // 1. Thử xác thực trực tiếp qua máy chủ Apps Script để nhận Auth Token
    const cloudRes = await callApi("loginUser", { username: rawInput, password }, "POST");
    if (cloudRes && cloudRes.status === "success" && cloudRes.user) {
      appState.authToken = cloudRes.token || "";
      localStorage.setItem("10A12_AUTH_TOKEN", appState.authToken);
      appState.currentUser = cloudRes.user;
      await finishLogin(true);
      return;
    }

    // Chỉ chặn ngay nếu máy chủ xác nhận rõ là SAI MẬT KHẨU (hoặc GVCN nhập sai mật khẩu)
    const isGvcnInput = (cleanInput === "gvcn" || cleanInput === "gvcnk58qt" || rawLower === "gvcn" || rawLower === "gvcn.k58qt");
    if (cloudRes && cloudRes.status === "error") {
      if (cloudRes.errorCode === "WRONG_PASSWORD" || (isGvcnInput && String(cloudRes.message || "").toLowerCase().includes("mật khẩu"))) {
        if (errorBox) {
          errorBox.innerText = cloudRes.message || "Mật khẩu không chính xác!";
          errorBox.classList.remove("hidden");
        }
        return;
      }
    }

    // 2. Fallback thông minh (khi mất mạng, DanhSach trên Sheets chưa nạp dữ liệu, hoặc URL GAS cũ)
    const savedGvcnPass = localStorage.getItem("10A12_GVCN_PASSWORD") || "123456";
    if (isGvcnInput && password === savedGvcnPass) {
      appState.authToken = "";
      localStorage.removeItem("10A12_AUTH_TOKEN");
      appState.currentUser = {
        username: "gvcn",
        fullName: "ThS. Trần Dương Quốc Mẫn",
        role: "GVCN & Phó Bí thư Đoàn trường",
        roleLevel: "GVCN"
      };
      finishLogin(false);
      return;
    }

    const baseInput = cleanInput.replace(/k58qt$/, "");
    const baseRaw = rawLower.replace(/\.k58qt$/i, "");

    let matched = matchStudentAccount(appState.students, rawLower, cleanInput, baseInput, baseRaw);
    if (!matched && typeof DEFAULT_STUDENTS_10A12 !== "undefined") {
      matched = matchStudentAccount(DEFAULT_STUDENTS_10A12, rawLower, cleanInput, baseInput, baseRaw);
    }

    if (matched) {
      const passExpected = String(matched.matKhau || "123456").trim();
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

        appState.authToken = "";
        localStorage.removeItem("10A12_AUTH_TOKEN");
        appState.currentUser = {
          username: matched.taiKhoan || matched.tenDangNhap || removeVietnameseTones(matched.hoTen) || rawLower,
          studentId: matched.id,
          fullName: matched.hoTen,
          role: matched.chucVu || "Học sinh",
          roleLevel: roleLevel,
          team: matched.to
        };
        finishLogin(false);
        return;
      } else {
        if (errorBox) {
          errorBox.innerText = "Mật khẩu không chính xác! (Mật khẩu mặc định: 123456)";
          errorBox.classList.remove("hidden");
        }
        return;
      }
    }

    if (errorBox) {
      errorBox.innerText = `Không tìm thấy tài khoản "${rawInput}". Gợi ý học sinh: nguyentanan hoặc HS01 (MK: 123456).`;
      errorBox.classList.remove("hidden");
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = prevBtnHtml || `<span>Đăng nhập Hệ thống</span><i class="fa-solid fa-arrow-right"></i>`;
    }
  }
}

async function finishLogin(shouldSyncCloud = false) {
  localStorage.setItem("10A12_SESSION_USER", JSON.stringify(appState.currentUser));
  const authScreen = document.getElementById("authScreen");
  if (authScreen) authScreen.classList.add("hidden");
  applyRolePermissions();
  renderAllSections();
  if (shouldSyncCloud && appState.authToken) {
    await syncWithCloud();
  }
}

function handleUserLogout() {
  if (confirm("Thầy/bạn có chắc chắn muốn đăng xuất?")) {
    appState.currentUser = null;
    appState.authToken = "";
    localStorage.removeItem("10A12_SESSION_USER");
    localStorage.removeItem("10A12_AUTH_TOKEN");
    location.reload();
  }
}

function updateMasterSwitchButtonUI() {
  const btn = document.getElementById("btnMasterSwitch");
  if (!btn) return;
  btn.innerHTML = appState.allowStudentLeaderEdit
    ? `<i class="fa-solid fa-toggle-on text-emerald-600"></i><span class="hidden md:inline ml-1">Cán sự: Mở ghi</span>`
    : `<i class="fa-solid fa-toggle-off text-slate-400"></i><span class="hidden md:inline ml-1">Cán sự: Khóa ghi</span>`;
}

function applyRolePermissions() {
  if (!appState.currentUser) return;
  const role = appState.currentUser.roleLevel || "GUEST";
  appState.roleLevel = role;

  const nameEl = document.getElementById("currentUserNameText");
  const roleEl = document.getElementById("currentUserRoleBadge");
  if (nameEl) nameEl.innerText = appState.currentUser.fullName;
  if (roleEl) roleEl.innerText = appState.currentUser.role;

  const isGVCN = (role === "GVCN");
  const isStudent = (role === "STUDENT");
  const hasStudentPortal = Boolean(appState.currentUser.studentId);
  const roleStr = String(appState.currentUser.role || "").toLowerCase();
  const canEditSeating = isGVCN || roleStr.includes("lớp trưởng");
  const canEditFund = isGVCN || role === "TREASURER";
  const canEditVtm = isGVCN || role === "VTM";

  toggleEl("btnMasterSwitch", isGVCN);
  updateMasterSwitchButtonUI();
  toggleEl("btn-tab-tam-tu", isGVCN);
  toggleEl("btn-side-tab-tam-tu", isGVCN);
  toggleEl("btn-tab-cai-dat", isGVCN);
  toggleEl("btn-side-tab-cai-dat", isGVCN);
  toggleEl("btn-tab-ca-nhan", hasStudentPortal);
  toggleEl("btn-side-tab-ca-nhan", hasStudentPortal);

  toggleEl("btnLockWeekAction", isGVCN);
  toggleEl("btnRotateSeating", canEditSeating);
  toggleEl("btnSaveSeating", canEditSeating);
  toggleEl("btnSaveSeatingHistory", canEditSeating);
  toggleEl("btnUploadTkb", isGVCN);
  toggleEl("btnEditTkb", isGVCN);
  toggleEl("btnAddVtmEvent", canEditVtm);
  toggleEl("btnUploadMedia", canEditVtm);
  toggleEl("btnOpenNewCampaign", canEditFund);
  toggleEl("btnManageCampaigns", canEditFund);
  toggleEl("btnOpenAddIncome", canEditFund);
  toggleEl("btnOpenAddExpense", canEditFund);
  toggleEl("btnSaveFundState", canEditFund);
  toggleEl("btnImportExcel", isGVCN);
  toggleEl("btnAddNewStudent", isGVCN);
  toggleEl("btnAssignRole", isGVCN);
  toggleEl("btnResetWeeklyScores", isGVCN);
  toggleEl("btnSaveStudentChanges", isGVCN);
  toggleEl("btnDeleteStudent", isGVCN);

  if (isStudent) switchTab("tab-ca-nhan");
}

function toggleEl(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  if (show) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

async function toggleMasterEditSwitch() {
  if (appState.roleLevel !== "GVCN") return;
  appState.allowStudentLeaderEdit = !appState.allowStudentLeaderEdit;
  saveStateToLocal();
  updateMasterSwitchButtonUI();
  await callApi("saveConfig", { allowStudentLeaderEdit: appState.allowStudentLeaderEdit }, "POST");
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
    tickerEl.innerHTML = `<i class="fa-solid fa-bullhorn mr-1.5 text-amber-300"></i><b>Lời nhắn của Thầy:</b> ${escapeHtml(appState.customTicker)}`;
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

async function saveCustomBannerTicker() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền cập nhật thông điệp tiêu đề lớp!");
    return;
  }
  const input = document.getElementById("customBannerTickerInput");
  if (!input) return;
  appState.customTicker = input.value.trim();
  saveStateToLocal();
  updateCelebrationTicker();
  await callApi("saveConfig", { customTicker: appState.customTicker }, "POST");
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
  const isMorning = currentMinutes < 720;

  if (day >= 1 && day <= 6) {
    const activeTkb = getActiveTkbConfig();
    const periods = isMorning ? activeTkb.morning : activeTkb.afternoon;
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
      subjectDetail = (subject && subject !== "-" && subject !== "—") ? subject : "Tự học / Tiết chờ";
      
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
  if (progressBar && progressBar.style) progressBar.style.width = `${percent}%`;
}

function formatTkbHeaderTitleText(cfg) {
  const activeCfg = cfg || getActiveTkbConfig();
  const fullVersion = activeCfg.version || (activeCfg.effectiveDate ? `${activeCfg.versionLabel} (Từ ${activeCfg.effectiveDate})` : activeCfg.versionLabel);
  return `Thời Khóa Biểu Lớp 10A12 • ${fullVersion}`;
}

function renderTkbVersionLabels() {
  const cfg = getActiveTkbConfig();
  const vLabel = cfg.versionLabel || "Số 4";
  const eDate = cfg.effectiveDate || "";

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
  };

  setTxt("btn-tab-tkb", `TKB ${vLabel}`);
  setTxt("navTkbSideLabel", `Thời khóa biểu (${vLabel})`);
  setTxt("liveBannerSub", `THỜI KHÓA BIỂU ${vLabel.toUpperCase()}${eDate ? ` • TỪ ${eDate}` : ""}`);
  setTxt("dashTkbTitle", `TKB ${vLabel}${eDate ? ` (${eDate})` : ""}`);
  setTxt("sdbTkbHeading", `Sổ Đầu Bài Điện Tử (Theo TKB ${vLabel})`);
  setTxt("zoomTkbTitle", `Thời Khóa Biểu ${vLabel} - Lớp 10A12`);
  setTxt("shlTkbRef1", `Thời khóa biểu ${vLabel}`);
  setTxt("shlTkbRef2", `Thời khóa biểu ${vLabel}`);

  const headerTitleEl = document.getElementById("tkbHeaderTitle");
  if (headerTitleEl) {
    const fullText = formatTkbHeaderTitleText(cfg);
    headerTitleEl.innerText = fullText;
    headerTitleEl.innerHTML = `<i class="fa-solid fa-calendar-days text-indigo-700"></i> ${escapeHtml(fullText)}`;
  }

  const hintEl = document.getElementById("tkbTableSyncHint");
  if (hintEl) hintEl.classList.add("hidden");
}

// ==================== 10. TAB 1: TỔNG QUAN (LƯỚI 7 Ô BUỔI HỌC CÓ CHI TIẾT LỖI) ====================
function renderOverviewDashboard() {
  const scoped = getScopedWeekData();
  const avg = scoped.students.length > 0
    ? (scoped.students.reduce((acc, s) => acc + parseScore(s.diemThiDua, 100), 0) / scoped.students.length).toFixed(1)
    : "100.0";
  const avgEl = document.getElementById("dashAvgScore");
  if (avgEl) avgEl.innerText = `${avg}đ`;

  const totalEl = document.getElementById("dashTotalStudents");
  if (totalEl) totalEl.innerText = `${appState.students.length} / ${appState.students.length}`;

  const fundEl = document.getElementById("dashFundBalance");
  if (fundEl) fundEl.innerText = `${(appState.fundSummary.balance || 0).toLocaleString()} đ`;

  renderTkbVersionLabels();
  renderTT22Summary();
  renderTopCommendations();
  renderSessionsGrid();
}

function renderTT22Summary() {
  const scoped = getScopedWeekData();
  const total = scoped.students.length || 45;
  let tot = 0, kha = 0, dat = 0, chuadat = 0;

  scoped.students.forEach(s => {
    const pts = parseScore(s.diemThiDua, 100);
    if (pts >= 90) tot++;
    else if (pts >= 70) kha++;
    else if (pts >= 50) dat++;
    else chuadat++;
  });

  const totEl = document.getElementById("tt22TotCount");
  const khaEl = document.getElementById("tt22KhaCount");
  const datEl = document.getElementById("tt22DatCount");
  const chuadatEl = document.getElementById("tt22ChuaDatCount");

  if (totEl) totEl.innerText = `${tot} HS (${Math.round(tot / total * 100)}%)`;
  if (khaEl) khaEl.innerText = `${kha} HS (${Math.round(kha / total * 100)}%)`;
  if (datEl) datEl.innerText = `${dat} HS (${Math.round(dat / total * 100)}%)`;
  if (chuadatEl) chuadatEl.innerText = `${chuadat} HS (${Math.round(chuadat / total * 100)}%)`;
}

function renderTopCommendations() {
  const container = document.getElementById("topCommendationsList");
  if (!container) return;

  const scoped = getScopedWeekData();
  const plusMap = {};
  scoped.violations.forEach(v => {
    const pts = parseScore(v.points, 0);
    if (pts > 0) {
      plusMap[v.studentId] = (plusMap[v.studentId] || 0) + pts;
    }
  });

  const topStudents = Object.keys(plusMap)
    .map(stId => {
      const st = scoped.students.find(s => s.id === stId) || appState.students.find(s => s.id === stId);
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
          <p class="text-xs font-black text-slate-800">${escapeHtml(st.name)} <span class="text-[10px] text-slate-500">(${escapeHtml(st.team)})</span></p>
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

  const scoped = getScopedWeekData();
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
    const sessViolations = scoped.violations.filter(v => v.time && v.time.includes(sess.name));

    const absentExcused = sessViolations.filter(v => v.criteria && v.criteria.includes("Có phép")).length;
    const absentUnexcused = sessViolations.filter(v => v.criteria && (v.criteria.includes("Không phép") || v.criteria.includes("K.Phép"))).length;
    const totalAbsent = absentExcused + absentUnexcused;
    const lateCount = sessViolations.filter(v => v.criteria && v.criteria.includes("trễ")).length;

    const nonPresentEvents = sessViolations.filter(v => !v.criteria || !v.criteria.includes("Có mặt"));
    const totalEvents = nonPresentEvents.length;
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
          ` : nonPresentEvents.map((v) => {
            const pts = parseScore(v.points, 0);
            const isPlus = pts > 0;
            const pointsClass = isPlus ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200';
            const globalIdx = appState.violations.indexOf(v);
            const removeKey = v.incidentKey || String(globalIdx);

            return `
              <div class="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1 text-xs hover:border-slate-300 transition">
                <div class="flex items-center justify-between gap-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-1.5 h-1.5 rounded-full ${isPlus ? 'bg-emerald-500' : 'bg-rose-500'} shrink-0"></span>
                    <b class="text-slate-900 font-black truncate">${escapeHtml(v.studentName)}</b>
                    <span class="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold shrink-0">${escapeHtml(getStudentTeam(v.studentId))}</span>
                  </div>
                  <span class="font-mono font-black text-[11px] px-1.5 py-0.5 rounded border ${pointsClass} shrink-0">
                    ${isPlus ? '+' : ''}${pts}đ
                  </span>
                </div>

                <p class="text-[11px] text-slate-700 leading-snug whitespace-normal break-words pl-3">
                  ${escapeHtml(v.criteria)}
                </p>

                <div class="flex items-center justify-between text-[9.5px] text-slate-400 pl-3 pt-0.5 border-t border-slate-50">
                  <span>${v.note ? `${escapeHtml(v.note)} • ` : ''}${escapeHtml(v.sender || 'Cán sự')}</span>
                  ${isGVCN && scoped.isEditable ? `
                    <button onclick="removeViolationItem('${escapeAttr(removeKey)}', '${escapeAttr(v.studentId)}', ${pts})" class="text-slate-400 hover:text-rose-600 font-bold p-0.5" title="Xóa bản ghi này">
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
  const key = getSessionKeyByName(sessionName);
  appState.currentSessionKey = key;
  appState.currentSessionLabel = sessionName || getSessionLabel(key);
  const sel = document.getElementById("attendanceSessionSelect");
  if (sel) sel.value = key;
  if (typeof openQuickScoreModal === "function") openQuickScoreModal("", "");
}

async function removeViolationItem(incidentKeyOrIdx, studentId, points) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ Thầy chủ nhiệm mới có quyền xóa bản ghi nề nếp!");
    return;
  }
  const scoped = getScopedWeekData();
  if (!scoped.isEditable) {
    alert("Tuần học này đã lưu trữ, không thể chỉnh sửa bản ghi lịch sử!");
    return;
  }
  if (!confirm("Thầy có chắc chắn muốn xóa bản ghi nề nếp này và hoàn lại điểm cho học sinh?")) return;

  const numPts = parseScore(points, 0);
  const st = appState.students.find(s => s.id === studentId);
  if (st) {
    st.diemThiDua = Math.max(0, parseScore(st.diemThiDua, 100) - numPts);
  }

  let matchedRecord = null;
  if (incidentKeyOrIdx && !/^\d+$/.test(String(incidentKeyOrIdx))) {
    matchedRecord = appState.violations.find(v => v.incidentKey === incidentKeyOrIdx);
    appState.violations = appState.violations.filter(v => v.incidentKey !== incidentKeyOrIdx);
  } else {
    const idx = parseInt(incidentKeyOrIdx, 10);
    if (!isNaN(idx) && idx >= 0 && idx < appState.violations.length) {
      matchedRecord = appState.violations[idx];
      appState.violations.splice(idx, 1);
    }
  }

  saveStateToLocal();
  renderSessionsGrid();
  renderOverviewDashboard();
  if (typeof renderTeamDisciplineSummaryCards === "function") renderTeamDisciplineSummaryCards();
  if (typeof renderAttendanceSession === "function") renderAttendanceSession();

  const remoteKey = (matchedRecord && matchedRecord.incidentKey) || (incidentKeyOrIdx && !/^\d+$/.test(String(incidentKeyOrIdx)) ? incidentKeyOrIdx : "");
  if (remoteKey) {
    await callApi("deleteViolation", { incidentKey: remoteKey }, "POST");
  }
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

function getParentLookupPortalUrl() {
  const currentUrl = window.location.href.split("?")[0].split("#")[0];
  const baseDir = currentUrl.substring(0, currentUrl.lastIndexOf("/"));
  let lookupUrl = `${baseDir}/tracuu.html`;
  if (appState && appState.currentUser && appState.currentUser.studentId) {
    lookupUrl += `?hs=${encodeURIComponent(appState.currentUser.studentId)}`;
  }
  return lookupUrl;
}

function openParentLookupPortal(e) {
  if (e && e.preventDefault) e.preventDefault();
  const targetUrl = getParentLookupPortalUrl();
  const isMobileOrTouch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "") || window.innerWidth < 768;

  if (isMobileOrTouch) {
    window.location.href = targetUrl;
  } else {
    const win = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.href = targetUrl;
    }
  }
}

// Giữ tên hàm cũ để tương thích 100% với onclick="copyParentLookupPortalLink()" trong index.html
function copyParentLookupPortalLink(e) {
  openParentLookupPortal(e);
}

function upgradePortalButtonUI() {
  document.querySelectorAll("button, a").forEach(el => {
    const onClickAttr = el.getAttribute("onclick") || "";
    const txt = (el.innerText || "").trim();
    if (onClickAttr.includes("copyParentLookupPortalLink") || onClickAttr.includes("openParentLookupPortal") || txt.includes("Cổng Tra Cứu")) {
      const icon = el.querySelector("i.fa-share-nodes, i.fa-share-alt, i.fa-copy");
      if (icon) {
        icon.className = "fa-solid fa-arrow-up-right-from-square";
      }
      el.setAttribute("title", "Mở trực tiếp Cổng Tra Cứu Phụ Huynh & Học Sinh");
    }
  });
}

// ==================== BỘ MÁY KIỂM SOÁT CHI TIẾT ĐIỂM & NỀ NẾP TUẦN ====================
let disciplineScoreFilterMode = "ALL"; // ALL | PLUS | MINUS | CHANGED
let disciplineLogScopeMode = "WEEK";    // WEEK | SESSION

function getStudentWeeklyScoreBreakdown(studentId) {
  const scoped = getScopedWeekData();
  const st = scoped.students.find(s => s.id === studentId) || appState.students.find(s => s.id === studentId);
  if (!st) return null;

  const currentScore = parseScore(st.diemThiDua, 100);
  const weekLogs = (scoped.violations || []).filter(v => v.studentId === studentId && (!v.criteria || !v.criteria.includes("Có mặt")));
  const loggedDelta = weekLogs.reduce((sum, v) => sum + parseScore(v.points, 0), 0);
  const actualDelta = currentScore - 100;
  const unloggedDelta = actualDelta - loggedDelta;

  return {
    student: st,
    week: scoped.selectedWeek,
    isEditable: scoped.isEditable,
    currentScore,
    loggedDelta,
    actualDelta,
    unloggedDelta,
    logs: weekLogs
  };
}

function ensureDisciplineAuditModalExists() {
  if (document.getElementById("studentDisciplineAuditModal")) return;
  const modalHtml = `
    <div id="studentDisciplineAuditModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeStudentDisciplineDetailModal()">
      <div class="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div id="auditModalScoreBadge" class="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs">100</div>
            <div>
              <h3 id="auditModalStudentName" class="font-black text-slate-900 text-sm sm:text-base">Họ tên học sinh</h3>
              <p id="auditModalStudentMeta" class="text-[11px] text-slate-500 font-medium">Mã HS • Tổ • Tuần học</p>
            </div>
          </div>
          <button onclick="closeStudentDisciplineDetailModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div id="auditModalBody" class="overflow-y-auto py-3.5 space-y-3 pr-1 text-xs flex-1"></div>

        <div id="auditModalFooter" class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function openStudentDisciplineDetailModal(studentId) {
  ensureDisciplineAuditModalExists();
  const data = getStudentWeeklyScoreBreakdown(studentId);
  if (!data) return;

  const { student, week, isEditable, currentScore, loggedDelta, actualDelta, unloggedDelta, logs } = data;
  const badgeEl = document.getElementById("auditModalScoreBadge");
  const nameEl = document.getElementById("auditModalStudentName");
  const metaEl = document.getElementById("auditModalStudentMeta");
  const bodyEl = document.getElementById("auditModalBody");
  const footerEl = document.getElementById("auditModalFooter");

  if (badgeEl) {
    badgeEl.innerText = `${currentScore}đ`;
    badgeEl.className = currentScore > 100
      ? "w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0"
      : (currentScore < 70
        ? "w-12 h-12 rounded-2xl bg-rose-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0"
        : (currentScore < 90
          ? "w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0"
          : "w-12 h-12 rounded-2xl bg-sky-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0"));
  }
  if (nameEl) nameEl.innerText = student.hoTen;
  if (metaEl) metaEl.innerText = `${student.id} • ${student.to} • ${student.chucVu || "Thành viên"} • Tuần ${week}`;

  const isGVCN = (appState.roleLevel === "GVCN");

  let html = `
    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
        <span class="text-[10px] font-bold text-slate-400 uppercase block">Điểm gốc đầu tuần</span>
        <b class="text-sm font-black text-slate-700 font-mono">100đ</b>
      </div>
      <div class="p-2.5 rounded-2xl ${actualDelta >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"} border">
        <span class="text-[10px] font-bold ${actualDelta >= 0 ? "text-emerald-700" : "text-rose-700"} uppercase block">Biến động tuần</span>
        <b class="text-sm font-black ${actualDelta >= 0 ? "text-emerald-700" : "text-rose-600"} font-mono">${actualDelta >= 0 ? "+" : ""}${actualDelta}đ</b>
      </div>
      <div class="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
        <span class="text-[10px] font-bold text-sky-700 uppercase block">Điểm hiện tại</span>
        <b class="text-sm font-black text-sky-900 font-mono">${currentScore}đ</b>
      </div>
    </div>
  `;

  if (unloggedDelta !== 0) {
    html += `
      <div class="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5">
        <div class="flex items-start gap-2">
          <i class="fa-solid fa-circle-info text-amber-600 mt-0.5"></i>
          <div>
            <p class="font-black text-xs">Phát hiện chênh lệch ${unloggedDelta > 0 ? `+${unloggedDelta}đ` : `${unloggedDelta}đ`} từ dữ liệu đồng bộ!</p>
            <p class="text-[11px] text-amber-800 leading-relaxed mt-0.5">
              Điểm tổng của em đang là <b>${currentScore}đ</b>, nhưng nhật ký sự vụ tuần mới ghi nhận <b>${loggedDelta >= 0 ? `+${loggedDelta}đ` : `${loggedDelta}đ`}</b>. Khoản chênh lệch <b>${unloggedDelta > 0 ? `+${unloggedDelta}đ` : `${unloggedDelta}đ`}</b> này được nhập trực tiếp từ cột điểm trên Google Sheets hoặc chưa có dòng diễn giải.
            </p>
          </div>
        </div>
        ${isGVCN && isEditable ? `
          <div class="flex items-center gap-2 pt-1 pl-5">
            <button onclick="reconcileStudentScoreWithLogs('${escapeAttr(student.id)}')" class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition">
              <i class="fa-solid fa-rotate mr-1"></i> Khớp lại thành ${100 + loggedDelta}đ theo Nhật ký
            </button>
          </div>
        ` : ""}
      </div>
    `;
  }

  html += `<div class="space-y-2"><h4 class="font-black text-slate-800 uppercase text-[11px]">Toàn bộ lịch sử cộng / trừ điểm trong Tuần ${week} (${logs.length} lượt):</h4>`;

  if (logs.length === 0) {
    html += `
      <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500 italic">
        Chưa có bản ghi khen thưởng hay vi phạm nào trong nhật ký Tuần ${week}.
      </div>
    `;
  } else {
    html += logs.map(v => {
      const pts = parseScore(v.points, 0);
      const isPlus = pts > 0;
      const globalIdx = appState.violations.indexOf(v);
      const removeKey = v.incidentKey || String(globalIdx);
      return `
        <div class="p-3 rounded-2xl border ${isPlus ? "bg-emerald-50/40 border-emerald-200" : "bg-rose-50/40 border-rose-200"} flex items-center justify-between gap-2">
          <div class="space-y-0.5 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full ${isPlus ? "bg-emerald-500" : "bg-rose-500"} shrink-0"></span>
              <b class="text-slate-900 font-bold">${escapeHtml(v.criteria)}</b>
            </div>
            <p class="text-[10.5px] text-slate-500 pl-3.5">
              ${escapeHtml(v.time || "")} • Người ghi: <b>${escapeHtml(v.sender || "Cán sự")}</b>${v.note ? ` • <i>${escapeHtml(v.note)}</i>` : ""}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="font-mono font-black text-xs px-2.5 py-1 rounded-xl border ${isPlus ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"}">
              ${isPlus ? "+" : ""}${pts}đ
            </span>
            ${isGVCN && isEditable ? `
              <button onclick="removeViolationItem('${escapeAttr(removeKey)}', '${escapeAttr(student.id)}', ${pts}); setTimeout(() => openStudentDisciplineDetailModal('${escapeAttr(student.id)}'), 120);" class="w-7 h-7 rounded-lg bg-white hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-200 flex items-center justify-center transition" title="Xóa bản ghi này">
                <i class="fa-solid fa-trash-can text-[11px]"></i>
              </button>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");
  }
  html += `</div>`;

  if (bodyEl) bodyEl.innerHTML = html;

  if (footerEl) {
    footerEl.innerHTML = `
      <button onclick="closeStudentDisciplineDetailModal(); openQuickScoreModal('${escapeAttr(student.id)}', '${escapeAttr(student.hoTen)}')" class="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-black text-xs transition flex items-center gap-1.5">
        <i class="fa-solid fa-plus"></i> Chấm thêm cộng/trừ điểm
      </button>
      <button onclick="closeStudentDisciplineDetailModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
        Đóng
      </button>
    `;
  }

  document.getElementById("studentDisciplineAuditModal").classList.remove("hidden");
}

function closeStudentDisciplineDetailModal() {
  const modal = document.getElementById("studentDisciplineAuditModal");
  if (modal) modal.classList.add("hidden");
}

async function reconcileStudentScoreWithLogs(studentId) {
  if (appState.roleLevel !== "GVCN") return;
  const data = getStudentWeeklyScoreBreakdown(studentId);
  if (!data) return;

  const targetScore = Math.max(0, 100 + data.loggedDelta);
  data.student.diemThiDua = targetScore;
  saveStateToLocal();
  renderAllSections();
  openStudentDisciplineDetailModal(studentId);
  await callApi("saveAllStudentsBatch", { students: appState.students }, "POST");
  alert(`Đã đồng bộ lại điểm của em ${data.student.hoTen} thành ${targetScore}đ theo đúng Nhật ký sự vụ tuần!`);
}

function setDisciplineScoreFilter(mode) {
  disciplineScoreFilterMode = mode;
  applyDisciplineEnhancements();
  renderDeletedStudentsArchiveSection();
  bindDeleteStudentReasonInterceptor();
  renderSchoolYearStartSettingCard();
  renderParentLeaveRequestsInbox();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
}

function setDisciplineLogScope(scope) {
  disciplineLogScopeMode = scope;
  applyDisciplineEnhancements();
  renderDeletedStudentsArchiveSection();
  bindDeleteStudentReasonInterceptor();
  renderSchoolYearStartSettingCard();
  renderParentLeaveRequestsInbox();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
}

function applyDisciplineEnhancements() {
  const tabThiDua = document.getElementById("tab-thi-dua");
  if (!tabThiDua) return;

  // 1. Chèn thanh lọc nhanh Điểm cộng (+) / Điểm trừ (-) nếu chưa có
  let filterBar = document.getElementById("disciplineQuickFilterBar");
  if (!filterBar) {
    const gridContainer = tabThiDua.querySelector("#attendanceStudentGrid, #disciplineStudentCardsGrid, .grid");
    if (gridContainer && gridContainer.parentElement) {
      filterBar = document.createElement("div");
      filterBar.id = "disciplineQuickFilterBar";
      filterBar.className = "p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs mb-3";
      gridContainer.parentElement.insertBefore(filterBar, gridContainer);
    }
  }

  const scoped = getScopedWeekData();
  const plusStudents = scoped.students.filter(s => parseScore(s.diemThiDua, 100) > 100);
  const minusStudents = scoped.students.filter(s => parseScore(s.diemThiDua, 100) < 100);

  if (filterBar) {
    const btnCls = (m) => disciplineScoreFilterMode === m
      ? "px-3 py-1.5 rounded-xl bg-slate-900 text-white font-black shadow-2xs"
      : "px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200";
    filterBar.innerHTML = `
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-[11px] font-black text-slate-500 uppercase mr-1"><i class="fa-solid fa-filter text-sky-600 mr-1"></i>Lọc điểm tuần:</span>
        <button type="button" onclick="setDisciplineScoreFilter('ALL')" class="${btnCls('ALL')}">Tất cả (${scoped.students.length})</button>
        <button type="button" onclick="setDisciplineScoreFilter('PLUS')" class="${btnCls('PLUS')}">🟢 Được cộng điểm (${plusStudents.length})</button>
        <button type="button" onclick="setDisciplineScoreFilter('MINUS')" class="${btnCls('MINUS')}">🔴 Bị trừ điểm (${minusStudents.length})</button>
      </div>
      <span class="text-[10.5px] text-slate-500 italic"><i class="fa-solid fa-hand-pointer text-sky-600 mr-1"></i>Bấm vào số điểm (VD: 110đ) trên thẻ HS để xem chi tiết cộng/trừ</span>
    `;
  }

  // 2. Gắn sự kiện click xem chi tiết vào từng thẻ học sinh & lọc hiển thị
  const candidateCards = tabThiDua.querySelectorAll("[data-student-id], .student-att-card, .rounded-2xl");
  candidateCards.forEach(card => {
    let stId = card.getAttribute("data-student-id");
    if (!stId) {
      const idMatch = (card.innerText || "").match(/\bHS\d{2}\b/);
      if (idMatch && card.querySelector("button")) {
        stId = idMatch[0];
      }
    }
    if (!stId) return;

    const st = scoped.students.find(s => s.id === stId);
    if (!st) return;
    const score = parseScore(st.diemThiDua, 100);

    // Áp dụng lọc
    if (disciplineScoreFilterMode === "PLUS" && score <= 100) {
      card.classList.add("hidden");
    } else if (disciplineScoreFilterMode === "MINUS" && score >= 100) {
      card.classList.add("hidden");
    } else {
      card.classList.remove("hidden");
    }

    // Gắn click mở chi tiết lịch sử điểm
    if (!card.dataset.auditBound) {
      card.dataset.auditBound = "1";
      card.style.cursor = "pointer";
      card.title = "Bấm để xem chi tiết lịch sử cộng/trừ điểm tuần của học sinh";
      card.addEventListener("click", (ev) => {
        if (ev.target.closest("button, select, input, a")) return;
        openStudentDisciplineDetailModal(stId);
      });
    }
  });
}


// ==================== BỘ MÁY XÓA HỌC SINH CÓ GHI CHÚ LÝ DO & LƯU TRỮ BIẾN ĐỘNG ====================
let pendingDeleteStudentTargetId = "";

function ensureDeleteStudentReasonModal() {
  if (document.getElementById("deleteStudentReasonModal")) return;
  const modalHtml = `
    <div id="deleteStudentReasonModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeDeleteStudentReasonModal()">
      <div class="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <i class="fa-solid fa-user-minus"></i>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm sm:text-base">Xóa Học Sinh & Ghi Chú Biến Động</h3>
              <p class="text-[11px] text-slate-500">Lưu vết lý do để báo cáo sĩ số & khôi phục khi cần</p>
            </div>
          </div>
          <button onclick="closeDeleteStudentReasonModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onsubmit="confirmDeleteStudentWithReason(event)" class="space-y-3 text-xs">
          <div class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950">
            Học sinh cần xóa: <b id="delReasonStudentLabel" class="text-sm font-black">...</b>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Phân loại lý do xóa khỏi danh sách lớp:</label>
            <div class="grid grid-cols-1 gap-1.5" id="delReasonCategoryGroup">
              <label class="p-2.5 rounded-xl border border-slate-200 hover:bg-rose-50/40 flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="delReasonCategory" value="NGHI_HOC" checked class="w-4 h-4 accent-rose-600">
                <div>
                  <b class="text-slate-900 block">🔴 Nghỉ học / Thôi học / Bảo lưu</b>
                  <span class="text-[10.5px] text-slate-500">Học sinh nghỉ học giữa chừng (giữ lại hồ sơ để thống kê sĩ số)</span>
                </div>
              </label>
              <label class="p-2.5 rounded-xl border border-slate-200 hover:bg-amber-50/40 flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="delReasonCategory" value="CHUYEN_TRUONG" class="w-4 h-4 accent-amber-600">
                <div>
                  <b class="text-slate-900 block">🟡 Chuyển trường / Chuyển lớp</b>
                  <span class="text-[10.5px] text-slate-500">Học sinh chuyển sang lớp khác hoặc trường khác</span>
                </div>
              </label>
              <label class="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer">
                <input type="radio" name="delReasonCategory" value="NHAP_NHAM" class="w-4 h-4 accent-slate-600">
                <div>
                  <b class="text-slate-900 block">⚪ Nhập nhầm / Trùng danh sách</b>
                  <span class="text-[10.5px] text-slate-500">Thao tác nhầm hoặc dư dòng khi nhập Excel</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Ghi chú chi tiết (nơi chuyển đến, ngày nghỉ, lý do cụ thể):</label>
            <textarea id="delReasonNoteInput" rows="2" required placeholder="Ví dụ: Nghỉ học theo đơn gia đình từ 12/11/2026; hoặc Chuyển sang lớp 10A5..."
              class="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-rose-500"></textarea>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button type="button" onclick="closeDeleteStudentReasonModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold">
              Hủy bỏ
            </button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md flex items-center gap-1.5 transition">
              <i class="fa-solid fa-trash-can"></i> Xác Nhận Xóa & Lưu Ghi Chú
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function resolveTargetStudentIdForDelete(explicitId) {
  if (explicitId) return explicitId;
  if (appState.selectedStudentForDetail && appState.selectedStudentForDetail.id) {
    return appState.selectedStudentForDetail.id;
  }
  const hiddenIdEl = document.getElementById("editStudentIdInput") || document.getElementById("detailStudentIdInput");
  if (hiddenIdEl && hiddenIdEl.value) return hiddenIdEl.value.trim();
  const modalTitle = document.getElementById("studentDetailModalTitle") || document.getElementById("detailStudentName");
  if (modalTitle) {
    const m = (modalTitle.innerText || "").match(/\bHS\d+\b/);
    if (m) return m[0];
  }
  return "";
}

function openDeleteStudentReasonModal(studentId) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ Giáo viên chủ nhiệm mới có quyền xóa học sinh khỏi danh sách lớp!");
    return;
  }
  const targetId = resolveTargetStudentIdForDelete(studentId);
  const st = appState.students.find(s => s.id === targetId);
  if (!st) {
    alert("Không xác định được học sinh cần xóa. Vui lòng chọn lại học sinh!");
    return;
  }

  pendingDeleteStudentTargetId = st.id;
  ensureDeleteStudentReasonModal();
  const labelEl = document.getElementById("delReasonStudentLabel");
  if (labelEl) labelEl.innerText = `${st.hoTen} (${st.id} - ${st.to})`;
  const noteEl = document.getElementById("delReasonNoteInput");
  if (noteEl) noteEl.value = "";

  document.getElementById("deleteStudentReasonModal").classList.remove("hidden");
}

function closeDeleteStudentReasonModal() {
  const modal = document.getElementById("deleteStudentReasonModal");
  if (modal) modal.classList.add("hidden");
  pendingDeleteStudentTargetId = "";
}

async function confirmDeleteStudentWithReason(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (appState.roleLevel !== "GVCN") return;

  const stId = pendingDeleteStudentTargetId;
  const stIndex = appState.students.findIndex(s => s.id === stId);
  if (stIndex === -1) {
    closeDeleteStudentReasonModal();
    return;
  }

  const st = appState.students[stIndex];
  const catRadio = document.querySelector('input[name="delReasonCategory"]:checked');
  const category = catRadio ? catRadio.value : "NGHI_HOC";
  const noteInput = document.getElementById("delReasonNoteInput");
  const note = noteInput ? noteInput.value.trim() : "";

  const categoryLabels = {
    "NGHI_HOC": "Nghỉ học / Thôi học",
    "CHUYEN_TRUONG": "Chuyển trường / Chuyển lớp",
    "NHAP_NHAM": "Nhập nhầm / Trùng hồ sơ"
  };

  const nowStr = new Date().toLocaleString("vi-VN");
  const archiveEntry = {
    archiveId: `DEL_${Date.now()}`,
    deletedAt: nowStr,
    deletedBy: appState.currentUser ? appState.currentUser.fullName : "GVCN",
    reasonCategory: category,
    reasonLabel: categoryLabels[category] || "Biến động sĩ số",
    reasonNote: note,
    remainingCount: Math.max(0, appState.students.length - 1),
    studentData: JSON.parse(JSON.stringify(st))
  };

  if (!Array.isArray(appState.deletedStudents)) appState.deletedStudents = [];
  appState.deletedStudents.unshift(archiveEntry);

  // Xóa khỏi danh sách đang học
  appState.students.splice(stIndex, 1);

  // Tự động dọn ghế ngồi của học sinh này trên Sơ đồ lớp (nếu có)
  const cleanDeletedName = removeVietnameseTones(st.hoTen);
  if (Array.isArray(currentSeatingLayout)) {
    currentSeatingLayout.forEach(row => {
      if (Array.isArray(row)) {
        row.forEach(seat => {
          if (seat && removeVietnameseTones(seat.name) === cleanDeletedName) {
            seat.name = "";
            seat.role = "";
          }
        });
      }
    });
  }

  // Ghi nhận vào Nhật ký kiểm toán (Audit Log)
  if (!Array.isArray(appState.auditLogs)) appState.auditLogs = [];
  appState.auditLogs.unshift({
    time: nowStr,
    author: archiveEntry.deletedBy,
    action: "XÓA HỌC SINH",
    detail: `Xóa em ${st.hoTen} (${st.id} - ${st.to}) • Lý do: [${archiveEntry.reasonLabel}] ${note}`
  });

  saveStateToLocal();
  closeDeleteStudentReasonModal();

  // Đóng modal chi tiết học sinh nếu đang mở
  const detailModal = document.getElementById("studentDetailModal");
  if (detailModal) detailModal.classList.add("hidden");

  renderAllSections();

  // Đồng bộ lên Google Sheets
  await callApi("saveAllStudentsBatch", { students: appState.students }, "POST");
  await callApi("saveConfig", {
    deletedStudentsJson: JSON.stringify(appState.deletedStudents)
  }, "POST");

  alert(`Đã xóa em ${st.hoTen} (${st.id}) khỏi danh sách lớp và lưu ghi chú: [${archiveEntry.reasonLabel}] - ${note}. Sĩ số hiện tại: ${appState.students.length} HS.`);
}

async function restoreDeletedStudent(archiveId) {
  if (appState.roleLevel !== "GVCN") return;
  const idx = (appState.deletedStudents || []).findIndex(x => x.archiveId === archiveId);
  if (idx === -1) return;

  const item = appState.deletedStudents[idx];
  const st = item.studentData;
  if (!st) return;

  if (!confirm(`Khôi phục em ${st.hoTen} (${st.id} - ${st.to}) trở lại danh sách lớp đang học?`)) return;

  if (appState.students.some(s => s.id === st.id)) {
    st.id = `HS${String(appState.students.length + 1).padStart(2, "0")}`;
  }

  appState.students.push(st);
  appState.deletedStudents.splice(idx, 1);

  if (!Array.isArray(appState.auditLogs)) appState.auditLogs = [];
  appState.auditLogs.unshift({
    time: new Date().toLocaleString("vi-VN"),
    author: appState.currentUser ? appState.currentUser.fullName : "GVCN",
    action: "KHÔI PHỤC HS",
    detail: `Khôi phục em ${st.hoTen} (${st.id}) trở lại danh sách lớp (trước đó: ${item.reasonLabel})`
  });

  saveStateToLocal();
  renderAllSections();

  await callApi("saveAllStudentsBatch", { students: appState.students }, "POST");
  await callApi("saveConfig", {
    deletedStudentsJson: JSON.stringify(appState.deletedStudents)
  }, "POST");

  alert(`Đã khôi phục em ${st.hoTen} trở lại danh sách lớp 10A12!`);
}

function renderDeletedStudentsArchiveSection() {
  const tabDs = document.getElementById("tab-danh-sach");
  if (!tabDs) return;

  let archiveBox = document.getElementById("deletedStudentsArchiveContainer");
  if (!archiveBox) {
    archiveBox = document.createElement("div");
    archiveBox.id = "deletedStudentsArchiveContainer";
    archiveBox.className = "mt-5 p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3";
    tabDs.appendChild(archiveBox);
  }

  const list = appState.deletedStudents || [];
  if (list.length === 0) {
    archiveBox.innerHTML = `
      <div class="flex items-center justify-between text-xs text-slate-500">
        <span class="font-black text-slate-700 uppercase flex items-center gap-1.5">
          <i class="fa-solid fa-clock-rotate-left text-slate-400"></i> Sổ Theo Dõi Biến Động Sĩ Số (Đã xóa / Chuyển đi)
        </span>
        <span class="italic">Chưa có biến động giảm sĩ số nào</span>
      </div>
    `;
    return;
  }

  const isGVCN = (appState.roleLevel === "GVCN");
  const badgeMap = {
    "NGHI_HOC": "bg-rose-50 text-rose-700 border-rose-200",
    "CHUYEN_TRUONG": "bg-amber-50 text-amber-800 border-amber-200",
    "NHAP_NHAM": "bg-slate-100 text-slate-700 border-slate-300"
  };

  archiveBox.innerHTML = `
    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
      <div>
        <h3 class="text-xs sm:text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
          <i class="fa-solid fa-clock-rotate-left text-rose-600"></i>
          Sổ Theo Dõi Biến Động Sĩ Số (${list.length} trường hợp đã xóa)
        </h3>
        <p class="text-[11px] text-slate-500">Lưu giữ đầy đủ lý do nghỉ học, chuyển trường hoặc nhập nhầm để báo cáo cuối kỳ</p>
      </div>
    </div>
    <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
      ${list.map(item => {
        const st = item.studentData || {};
        const badgeCls = badgeMap[item.reasonCategory] || badgeMap.NHAP_NHAM;
        return `
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <b class="text-slate-900">${escapeHtml(st.hoTen || "Học sinh")}</b>
                <span class="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-bold">${escapeHtml(st.id || "")} • ${escapeHtml(st.to || "")}</span>
                <span class="px-2 py-0.5 rounded-lg border font-black text-[10.5px] ${badgeCls}">${escapeHtml(item.reasonLabel)}</span>
              </div>
              <p class="text-[11px] text-slate-700"><b>Ghi chú:</b> ${escapeHtml(item.reasonNote || "Không có ghi chú")}</p>
              <p class="text-[10px] text-slate-400">Thời điểm: ${escapeHtml(item.deletedAt)} • Người thực hiện: ${escapeHtml(item.deletedBy)} • Sĩ số sau biến động: <b>${item.remainingCount} HS</b></p>
            </div>
            ${isGVCN ? `
              <button type="button" onclick="restoreDeletedStudent('${escapeAttr(item.archiveId)}')" class="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 font-bold text-[11px] transition shrink-0 self-start sm:self-center">
                <i class="fa-solid fa-rotate-left mr-1"></i> Khôi phục về lớp
              </button>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function bindDeleteStudentReasonInterceptor() {
  // Tự động gắn sự kiện vào nút Xóa học sinh (#btnDeleteStudent) hoặc các nút xóa trên thẻ học sinh
  const btnDel = document.getElementById("btnDeleteStudent");
  if (btnDel && !btnDel.dataset.reasonBound) {
    btnDel.dataset.reasonBound = "1";
    btnDel.removeAttribute("onclick");
    btnDel.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      openDeleteStudentReasonModal();
    }, true);
  }
}


// ==================== BỘ MÁY THIẾT ĐẶT NGÀY BẮT ĐẦU TUẦN 1 NĂM HỌC ====================
function renderSchoolYearStartSettingCard() {
  const tabSettings = document.getElementById("tab-cai-dat");
  if (!tabSettings) return;

  let card = document.getElementById("schoolYearStartSettingCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "schoolYearStartSettingCard";
    card.className = "p-4 sm:p-5 rounded-3xl bg-white border-2 border-sky-200 shadow-xs space-y-3 mb-4";
    tabSettings.insertBefore(card, tabSettings.firstChild);
  }

  const isoVal = getSchoolYearStartDateIso();
  const monDate = getSchoolYearStartMonday();
  const monVN = formatDateVN(monDate);
  const curWeek = getAutoSchoolWeek();

  card.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
      <div>
        <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-calendar-week text-sky-700"></i>
          Thiết Đặt Ngày Bắt Đầu Tuần 1 Của Năm Học
        </h3>
        <p class="text-[11px] text-slate-500">Tự động chuẩn hóa về ngày Thứ Hai của tuần khai giảng để tính chuẩn xác 35 tuần học</p>
      </div>
      <span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black self-start sm:self-auto">
        Hôm nay đang là: Tuần ${curWeek}
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs">
      <div>
        <label class="block font-bold text-slate-700 mb-1">Chọn ngày bắt đầu học Tuần 1:</label>
        <input type="date" id="schoolYearStartDateInput" value="${escapeAttr(isoVal)}"
          class="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-600 font-bold text-slate-900 focus:outline-none">
      </div>
      <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <span class="text-[10px] font-bold uppercase text-slate-400 block">Mốc Thứ Hai Tuần 1 đã chuẩn hóa:</span>
        <b class="text-sky-900 font-mono text-sm">${escapeHtml(monVN)}</b>
      </div>
      <div>
        <button type="button" onclick="saveSchoolYearStartDateSetting()" class="w-full py-2.5 px-4 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-black shadow-sm transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-floppy-disk"></i> Lưu & Tính Lại 35 Tuần
        </button>
      </div>
    </div>
  `;
}

async function saveSchoolYearStartDateSetting() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền thiết đặt mốc tuần học!");
    return;
  }
  const inp = document.getElementById("schoolYearStartDateInput");
  if (!inp || !inp.value) {
    alert("Vui lòng chọn ngày bắt đầu năm học!");
    return;
  }

  const mon = normalizeDateToMonday(inp.value);
  const normIso = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;

  localStorage.setItem("10A12_SCHOOL_START_DATE", normIso);
  SCHOOL_YEAR_START_MONDAY = mon;

  const newCurWeek = getAutoSchoolWeek();
  appState.selectedWeek = newCurWeek;
  appState.lastAutoRolloverWeek = newCurWeek;
  localStorage.setItem("10A12_LAST_ACTIVE_WEEK", String(newCurWeek));

  buildAutoWeekDropdown();
  renderAllSections();

  await callApi("saveConfig", { schoolYearStartDate: normIso }, "POST");
  alert(`Đã cập nhật mốc Thứ Hai Tuần 1 là ngày ${formatDateVN(mon)}. Hệ thống đã tự động tính lại tuần hiện tại là Tuần ${newCurWeek}!`);
}

// ==================== BỘ MÁY TIẾP NHẬN & DUYỆT GIẤY XIN PHÉP PHỤ HUYNH ====================
function buildFormalLeaveLetterHtml(req) {
  const st = appState.students.find(s => s.id === req.studentId) || {};
  const parentName = req.parentName || st.tenMe || st.tenBa || `Phụ huynh em ${req.studentName}`;
  const phone = req.parentPhone || st.sdtMe || st.sdtBa || "Chưa cung cấp";
  const leaveDateFormatted = (() => {
    if (!req.leaveDate) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.leaveDate)) {
      const p = req.leaveDate.split("-");
      return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return req.leaveDate;
  })();

  const createdDateParts = (() => {
    const now = new Date();
    return {
      d: String(now.getDate()).padStart(2, "0"),
      m: String(now.getMonth() + 1).padStart(2, "0"),
      y: now.getFullYear()
    };
  })();

  if (req.formalLetterHtml) {
    return req.formalLetterHtml;
  }

  return `
    <div style="font-family: 'Times New Roman', serif; line-height: 1.65; color: #0f172a;" class="p-4 sm:p-6 bg-white border border-slate-300 rounded-2xl space-y-3 text-sm">
      <div class="text-center space-y-0.5">
        <p class="font-bold uppercase tracking-wide text-xs sm:text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p class="font-bold underline underline-offset-4 text-xs sm:text-sm">Độc lập - Tự do - Hạnh phúc</p>
      </div>

      <div class="text-center pt-2">
        <h4 class="font-bold text-base sm:text-lg uppercase">ĐƠN XIN PHÉP NGHỈ HỌC</h4>
      </div>

      <div class="pl-2 sm:pl-6 space-y-1">
        <p><b>Kính gửi:</b> - Ban Giám hiệu Trường THPT số 1 Quang Trung;</p>
        <p class="pl-14">- Thầy Giáo viên chủ nhiệm lớp <b>10A12</b>;</p>
        <p class="pl-14">- Quý Thầy/Cô giáo viên bộ môn lớp <b>10A12</b>.</p>
      </div>

      <div class="space-y-1.5 pt-1">
        <p>Tôi tên là: <b>${escapeHtml(parentName)}</b> &nbsp;•&nbsp; Số điện thoại liên hệ: <b>${escapeHtml(phone)}</b></p>
        <p>Là phụ huynh của em: <b>${escapeHtml(req.studentName)}</b> — Học sinh lớp <b>10A12</b> (${escapeHtml(req.team || st.to || "")}).</p>
        <p>Nay tôi viết đơn này kính xin quý Thầy/Cô cho phép con tôi được nghỉ học:</p>
        <p class="pl-4">- Thời gian nghỉ: <b>${escapeHtml(req.session || "Buổi Sáng")}</b>, ngày <b>${escapeHtml(leaveDateFormatted)}</b>.</p>
        <p class="pl-4">- Lý do xin nghỉ: <b>${escapeHtml(req.reason || "Lý do gia đình / sức khỏe")}</b>.</p>
        <p>Gia đình xin cam đoan quản lý con em trong thời gian nghỉ học và nhắc nhở cháu chép bài, hoàn thành đầy đủ bài tập của các môn học trong ngày nghỉ.</p>
        <p>Kính mong Ban Giám hiệu, Thầy Giáo viên chủ nhiệm và quý Thầy/Cô giáo viên bộ môn xem xét, chấp thuận. Tôi xin chân thành cảm ơn!</p>
      </div>

      <div class="pt-3 flex justify-end">
        <div class="text-center pr-2 sm:pr-6">
          <p class="italic text-xs">Tây Sơn, ngày ${createdDateParts.d} tháng ${createdDateParts.m} năm ${createdDateParts.y}</p>
          <p class="font-bold text-xs uppercase mt-0.5">Người làm đơn (Phụ huynh HS)</p>
          <p class="italic text-[11px] text-emerald-700 mt-1">(Đã gửi & xác nhận qua Cổng tra cứu điện tử)</p>
          <p class="font-bold mt-1">${escapeHtml(parentName)}</p>
        </div>
      </div>
    </div>
  `;
}

function ensureLeaveLetterViewerModal() {
  if (document.getElementById("gvcnLeaveLetterModal")) return;
  const html = `
    <div id="gvcnLeaveLetterModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeGvcnLeaveLetterModal()">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <i class="fa-solid fa-file-signature text-sky-700"></i>
            Toàn Văn Giấy Xin Phép Nghỉ Học
          </h3>
          <button onclick="closeGvcnLeaveLetterModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div id="gvcnLeaveLetterContent" class="overflow-y-auto py-3 flex-1"></div>

        <div id="gvcnLeaveLetterActions" class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

function openGvcnLeaveLetterModal(leaveId) {
  ensureLeaveLetterViewerModal();
  const list = getMergedLeaveRequests();
  const req = list.find(x => x.id === leaveId);
  if (!req) return;

  const contentEl = document.getElementById("gvcnLeaveLetterContent");
  const actionsEl = document.getElementById("gvcnLeaveLetterActions");

  if (contentEl) {
    contentEl.innerHTML = buildFormalLeaveLetterHtml(req);
  }
  if (actionsEl) {
    const isApproved = req.status === "DA_DUYET";
    actionsEl.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        ${!isApproved ? `
          <button type="button" onclick="approveParentLeaveRequest('${escapeAttr(req.id)}')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5">
            <i class="fa-solid fa-circle-check"></i> Duyệt Nghỉ Có Phép (0đ)
          </button>
        ` : `
          <span class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs">
            <i class="fa-solid fa-check-double mr-1"></i> Đã duyệt nghỉ có phép
          </span>
        `}
        <button type="button" onclick="printCurrentLeaveLetter()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5">
          <i class="fa-solid fa-print"></i> In giấy phép
        </button>
      </div>
      <button type="button" onclick="closeGvcnLeaveLetterModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
        Đóng
      </button>
    `;
  }

  document.getElementById("gvcnLeaveLetterModal").classList.remove("hidden");
}

function closeGvcnLeaveLetterModal() {
  const m = document.getElementById("gvcnLeaveLetterModal");
  if (m) m.classList.add("hidden");
}

function printCurrentLeaveLetter() {
  const content = document.getElementById("gvcnLeaveLetterContent");
  if (!content) return;
  const win = window.open("", "_blank");
  if (!win) {
    window.print();
    return;
  }
  win.document.write(`<html><head><title>Đơn xin phép nghỉ học - 10A12</title></head><body style="padding:24px;">${content.innerHTML}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function getMergedLeaveRequests() {
  const fromState = Array.isArray(appState.leaveRequests) ? appState.leaveRequests : [];
  const fromLocal = safeJsonParse(localStorage.getItem("10A12_LEAVE_REQUESTS"), []);
  const fromLetters = (appState.letters || []).filter(l => {
    const t = String(l.type || l.category || l.title || "").toLowerCase();
    return t.includes("nghỉ phép") || t.includes("xin phép");
  }).map(l => ({
    id: l.id || `LET_${l.time}`,
    time: l.time || "",
    studentId: l.studentId || "",
    studentName: l.studentName || l.sender || "Học sinh",
    parentName: l.parentName || l.sender || "",
    parentPhone: l.parentPhone || "",
    leaveDate: l.leaveDate || "",
    session: l.session || "Buổi học",
    reason: l.reason || l.content || "",
    status: l.status || "CHO_DUYET"
  }));

  const all = [...fromState];
  [...fromLocal, ...fromLetters].forEach(item => {
    if (item && item.id && !all.some(x => x.id === item.id)) {
      all.push(item);
    }
  });
  return all;
}

async function approveParentLeaveRequest(leaveId) {
  if (appState.roleLevel !== "GVCN") return;
  const list = getMergedLeaveRequests();
  const req = list.find(x => x.id === leaveId);
  if (!req) return;

  req.status = "DA_DUYET";
  req.approvedAt = new Date().toLocaleString("vi-VN");
  appState.leaveRequests = list;
  localStorage.setItem("10A12_LEAVE_REQUESTS", JSON.stringify(list));

  // Tự động ghi nhận điểm danh "Vắng có phép (0đ)" vào nhật ký tuần để không bị trừ điểm
  const st = appState.students.find(s => s.id === req.studentId);
  const dateVN = (() => {
    if (req.leaveDate && /^\d{4}-\d{2}-\d{2}$/.test(req.leaveDate)) {
      const p = req.leaveDate.split("-");
      return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return formatDateVN();
  })();

  const incidentKey = `LEAVE_APPROVED_${req.id}`;
  if (st && !appState.violations.some(v => v.incidentKey === incidentKey)) {
    const targetWeek = req.leaveDate ? getWeekNumberFromDate(req.leaveDate) : appState.selectedWeek;
    const displayTime = `${req.session || "Buổi Sáng"} (${dateVN})`;
    appState.violations.unshift({
      time: displayTime,
      date: dateVN,
      week: targetWeek,
      studentId: st.id,
      studentName: st.hoTen,
      criteria: "Vắng học Có phép (0đ)",
      points: 0,
      note: `Giấy phép PH ${req.parentName || ""}: ${req.reason}`,
      sender: "GVCN duyệt đơn",
      incidentKey
    });

    await callApi("recordViolation", {
      incidentKey,
      week: targetWeek,
      date: dateVN,
      displayTime,
      studentId: st.id,
      studentName: st.hoTen,
      criteria: "Vắng học Có phép (0đ)",
      points: 0,
      note: `Giấy phép PH ${req.parentName || ""}: ${req.reason}`,
      sender: "GVCN duyệt đơn"
    }, "POST");
  }

  saveStateToLocal();
  closeGvcnLeaveLetterModal();
  renderAllSections();
  alert(`Đã duyệt Giấy xin phép của em ${req.studentName} (${req.session} - ${dateVN}) thành Vắng có phép (0đ)!`);
}

function renderParentLeaveRequestsInbox() {
  const tabTamTu = document.getElementById("tab-tam-tu");
  if (!tabTamTu) return;

  let box = document.getElementById("parentLeaveRequestsInboxBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "parentLeaveRequestsInboxBox";
    box.className = "p-4 sm:p-5 rounded-3xl bg-white border-2 border-sky-200 shadow-xs space-y-3 mb-5";
    tabTamTu.insertBefore(box, tabTamTu.firstChild);
  }

  const list = getMergedLeaveRequests();
  const pendingCount = list.filter(x => x.status !== "DA_DUYET").length;

  box.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
      <div>
        <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-file-medical text-sky-700"></i>
          Hộp Thư Giấy Xin Phép Nghỉ Học Từ Phụ Huynh
          ${pendingCount > 0 ? `<span class="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">${pendingCount} đơn mới</span>` : ""}
        </h3>
        <p class="text-[11px] text-slate-500">Hệ thống tự động biên soạn thành Đơn xin phép hoàn chỉnh từ thông tin phụ huynh gửi lên</p>
      </div>
    </div>

    ${list.length === 0 ? `
      <p class="text-xs text-slate-400 italic py-3 text-center">Chưa có giấy xin phép nghỉ học nào từ phụ huynh.</p>
    ` : `
      <div class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        ${list.map(req => {
          const isApproved = req.status === "DA_DUYET";
          return `
            <div class="p-3.5 rounded-2xl ${isApproved ? "bg-slate-50 border-slate-200" : "bg-sky-50/50 border-sky-200"} border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2 py-0.5 rounded-md font-black text-[10px] ${isApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-500 text-white"}">
                    ${isApproved ? "✓ Đã duyệt có phép" : "⏳ Chờ duyệt"}
                  </span>
                  <b class="text-slate-900 text-sm">${escapeHtml(req.studentName)}</b>
                  <span class="text-slate-500 font-bold">(${escapeHtml(req.studentId || "")} • ${escapeHtml(req.team || "")})</span>
                </div>
                <p class="text-slate-700">
                  <b>Xin nghỉ:</b> ${escapeHtml(req.session)} • Ngày <b>${escapeHtml(req.leaveDate)}</b> &nbsp;|&nbsp; <b>PH:</b> ${escapeHtml(req.parentName || "Phụ huynh")} (${escapeHtml(req.parentPhone || "")})
                </p>
                <p class="text-slate-600 italic"><b>Lý do:</b> "${escapeHtml(req.reason)}"</p>
              </div>

              <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                <button type="button" onclick="openGvcnLeaveLetterModal('${escapeAttr(req.id)}')" class="px-3 py-2 rounded-xl bg-white hover:bg-sky-700 text-sky-800 hover:text-white border border-sky-300 font-bold text-[11px] transition flex items-center gap-1">
                  <i class="fa-solid fa-file-lines"></i> Xem Giấy Phép
                </button>
                ${!isApproved ? `
                  <button type="button" onclick="approveParentLeaveRequest('${escapeAttr(req.id)}')" class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition flex items-center gap-1">
                    <i class="fa-solid fa-check"></i> Duyệt
                  </button>
                ` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `}
  `;
}


// ==================== BỘ MÁY LẬP & LƯU TRỮ BIÊN BẢN VI PHẠM ĐẶC BIỆT (TÀI LIỆU, ĐÁNH NHAU...) ====================
const SPECIAL_VIOLATION_TYPES = [
  {
    code: "TAI_LIEU",
    label: "Mang / sử dụng tài liệu, gian lận trong kiểm tra, thi cử",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    defaultPenaltyPoints: -20,
    defaultAction: "Lập biên bản tại chỗ, đình chỉ bài kiểm tra, thu giữ tang vật và thông báo cho Phụ huynh học sinh phối hợp giáo dục."
  },
  {
    code: "DANH_NHAU",
    label: "Đánh nhau, xô xát, gây mất đoàn kết / bạo lực học đường",
    badge: "bg-rose-100 text-rose-900 border-rose-300",
    defaultPenaltyPoints: -30,
    defaultAction: "Yêu cầu viết bản tường trình, lập biên bản vi phạm, mời Phụ huynh học sinh đến trường làm việc và báo cáo Ban Giám hiệu / Đoàn trường xem xét kỷ luật."
  },
  {
    code: "DIEN_THOAI",
    label: "Sử dụng điện thoại / thiết bị thu phát trái phép trong giờ học",
    badge: "bg-sky-100 text-sky-900 border-sky-300",
    defaultPenaltyPoints: -20,
    defaultAction: "Tạm giữ thiết bị bàn giao GVCN / Văn phòng Đoàn, mời Phụ huynh trực tiếp nhận lại và ký cam kết không tái phạm."
  },
  {
    code: "VO_LE_PHEP",
    label: "Vô lễ với Giáo viên / Cán bộ nhà trường / Chống đối người trực",
    badge: "bg-purple-100 text-purple-900 border-purple-300",
    defaultPenaltyPoints: -25,
    defaultAction: "Yêu cầu học sinh xin lỗi công khai, viết bản kiểm điểm có chữ ký xác nhận của Phụ huynh và hạ bậc hạnh kiểm tuần."
  },
  {
    code: "KHAC",
    label: "Vi phạm nội quy đặc biệt khác (phá hoại tài sản, hút thuốc, bỏ tiết...)",
    badge: "bg-slate-100 text-slate-800 border-slate-300",
    defaultPenaltyPoints: -20,
    defaultAction: "Lập biên bản ghi nhận hiện trạng, yêu cầu khắc phục hậu quả và thông báo về gia đình."
  }
];

function getSpecialViolationTypeMeta(code) {
  return SPECIAL_VIOLATION_TYPES.find(x => x.code === code) || SPECIAL_VIOLATION_TYPES[0];
}

function buildOfficialSpecialViolationReportHtml(rep) {
  const typeMeta = getSpecialViolationTypeMeta(rep.typeCode);
  const dtStr = rep.incidentDateTime || new Date().toLocaleString("vi-VN");
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();

  const studentsList = Array.isArray(rep.students) && rep.students.length > 0
    ? rep.students
    : [{ id: rep.studentId || "", hoTen: rep.studentName || "Học sinh", to: rep.team || "" }];

  return `
    <div style="font-family: 'Times New Roman', serif; line-height: 1.65; color: #0f172a;" class="p-5 sm:p-7 bg-white border border-slate-300 rounded-2xl space-y-3 text-sm">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center border-b border-slate-200 pb-3">
        <div>
          <p class="font-bold uppercase text-xs">SỞ GD&ĐT TỈNH GIA LAI</p>
          <p class="font-bold uppercase text-xs">TRƯỜNG THPT SỐ 1 QUANG TRUNG</p>
          <p class="font-bold text-xs mt-0.5">TẬP THỂ LỚP 10A12</p>
        </div>
        <div>
          <p class="font-bold uppercase text-xs">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p class="font-bold underline underline-offset-4 text-xs">Độc lập - Tự do - Hạnh phúc</p>
          <p class="italic text-xs mt-1">Tây Sơn, ngày ${d} tháng ${m} năm ${y}</p>
        </div>
      </div>

      <div class="text-center pt-1">
        <h3 class="font-bold text-base sm:text-lg uppercase">BIÊN BẢN VI PHẠM NỘI QUY NHÀ TRƯỜNG</h3>
        <p class="italic text-xs text-slate-600">(Số: ${escapeHtml(rep.reportCode || "BB-10A12")} • Tuần ${escapeHtml(rep.week || getAutoSchoolWeek())})</p>
      </div>

      <div class="space-y-1.5 pt-1">
        <p>Hôm nay, vào lúc <b>${escapeHtml(dtStr)}</b>, tại <b>${escapeHtml(rep.location || "Phòng học lớp 10A12 - Trường THPT số 1 Quang Trung")}</b>.</p>
        <p><b>1. Thành phần lập biên bản gồm có:</b></p>
        <p class="pl-4">- Đại diện Giáo viên / Ban cán sự lớp: <b>${escapeHtml(rep.recorderName || "GVCN lớp 10A12")}</b> (${escapeHtml(rep.recorderRole || "Giáo viên chủ nhiệm")});</p>
        <p class="pl-4">- Người chứng kiến: <b>${escapeHtml(rep.witnessName || "Ban cán sự lớp 10A12")}</b>.</p>

        <p><b>2. Học sinh vi phạm:</b></p>
        ${studentsList.map((st, idx) => `
          <p class="pl-4">${studentsList.length > 1 ? `${idx + 1}. ` : "- "}Em: <b>${escapeHtml(st.hoTen)}</b> — Lớp: <b>10A12</b> (${escapeHtml(st.to || "")}).</p>
        `).join("")}

        <p><b>3. Nội dung & Diễn biến vụ việc vi phạm:</b></p>
        <p class="pl-4">- Nhóm lỗi đặc biệt: <b>${escapeHtml(typeMeta.label)}</b>.</p>
        <p class="pl-4">- Diễn biến cụ thể: ${escapeHtml(rep.description || "")}</p>
        ${rep.evidence ? `<p class="pl-4">- Tang vật / Phương tiện tạm giữ (nếu có): <b>${escapeHtml(rep.evidence)}</b>.</p>` : ""}

        <p><b>4. Ý kiến trình bày & Cam kết của học sinh vi phạm:</b></p>
        <p class="pl-4 italic">"${escapeHtml(rep.studentStatement || "Em xin nhận khuyết điểm về hành vi vi phạm nội quy của mình và cam kết không tái phạm.")}"</p>

        <p><b>5. Biện pháp xử lý & Hướng giáo dục phối hợp:</b></p>
        <p class="pl-4">- ${escapeHtml(rep.resolution || typeMeta.defaultAction)}</p>
        ${Number(rep.deductedPoints) !== 0 ? `<p class="pl-4">- Điểm thi đua Quy chế 01: Điều chỉnh <b>${Number(rep.deductedPoints)} điểm</b> trong Tuần ${escapeHtml(rep.week || getAutoSchoolWeek())}.</p>` : ""}

        <p class="pt-1">Biên bản kết thúc cùng ngày, đã được đọc lại cho tất cả mọi người có tên trên cùng nghe, công nhận đúng sự thật và nhất trí ký tên dưới đây.</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-center text-xs">
        <div>
          <p class="font-bold uppercase">Học sinh vi phạm</p>
          <p class="italic text-[10.5px] text-slate-500">(Ký, ghi rõ họ tên)</p>
          <p class="font-bold mt-10">${escapeHtml(studentsList.map(s => s.hoTen).join(", "))}</p>
        </div>
        <div>
          <p class="font-bold uppercase">Người làm chứng</p>
          <p class="italic text-[10.5px] text-slate-500">(Ký, ghi rõ họ tên)</p>
          <p class="font-bold mt-10">${escapeHtml(rep.witnessName || "Ban cán sự lớp")}</p>
        </div>
        <div>
          <p class="font-bold uppercase">Người lập biên bản</p>
          <p class="italic text-[10.5px] text-slate-500">(Ký, ghi rõ họ tên)</p>
          <p class="font-bold mt-10">${escapeHtml(rep.recorderName || "GVCN 10A12")}</p>
        </div>
        <div>
          <p class="font-bold uppercase">Xác nhận của PHHS</p>
          <p class="italic text-[10.5px] text-slate-500">(Ký, ghi rõ họ tên)</p>
          <p class="font-bold mt-10">............................</p>
        </div>
      </div>
    </div>
  `;
}

function ensureSpecialViolationReportModal() {
  if (document.getElementById("specialViolationReportModal")) return;
  const html = `
    <div id="specialViolationReportModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeSpecialViolationReportModal()">
      <div class="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[93vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <i class="fa-solid fa-file-shield"></i>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm sm:text-base">Lập Biên Bản Vi Phạm Nội Quy Đặc Biệt</h3>
              <p class="text-[11px] text-slate-500">Dùng cho các vụ việc nghiêm trọng: sử dụng tài liệu thi, đánh nhau, vô lễ, điện thoại...</p>
            </div>
          </div>
          <button onclick="closeSpecialViolationReportModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onsubmit="submitSpecialViolationReport(event)" class="overflow-y-auto py-3.5 space-y-3 text-xs flex-1 pr-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">1. Phân loại vụ việc đặc biệt: <span class="text-rose-500">*</span></label>
              <select id="spReportTypeSelect" onchange="onSpecialViolationTypeChange(this.value)" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-rose-500">
                ${SPECIAL_VIOLATION_TYPES.map(t => `<option value="${escapeAttr(t.code)}">${escapeHtml(t.label)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">2. Thời gian & Địa điểm xảy ra:</label>
              <input type="text" id="spReportLocationInput" value="Phòng học lớp 10A12 - Trường THPT số 1 Quang Trung"
                class="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-rose-500">
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">3. Chọn học sinh vi phạm (có thể chọn nhiều em nếu liên quan đánh nhau/nhóm): <span class="text-rose-500">*</span></label>
            <div id="spReportStudentsCheckboxList" class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-2xl bg-slate-50 border border-slate-200"></div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">4. Tang vật tạm giữ (nếu có):</label>
              <input type="text" id="spReportEvidenceInput" placeholder="VD: 01 tài liệu giấy môn Toán; hoặc 01 điện thoại di động..."
                class="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-rose-500">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">5. Người chứng kiến / Cán sự lập cùng:</label>
              <input type="text" id="spReportWitnessInput" value="Lớp trưởng & Ban Thi đua lớp 10A12"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-rose-500">
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">6. Diễn biến sự việc vi phạm cụ thể: <span class="text-rose-500">*</span></label>
            <textarea id="spReportDescInput" rows="2" required placeholder="Ghi rõ tiết học, môn học, hành vi vi phạm cụ thể của học sinh..."
              class="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-rose-500"></textarea>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">7. Lời trình bày / Nhận thức khuyết điểm của học sinh:</label>
            <input type="text" id="spReportStatementInput" value="Em xin nhận khuyết điểm về hành vi vi phạm nội quy của mình và cam kết không tái phạm."
              class="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-rose-500">
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">8. Biện pháp xử lý & Hướng giáo dục phối hợp gia đình:</label>
            <textarea id="spReportResolutionInput" rows="2" required class="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-rose-500">${escapeHtml(SPECIAL_VIOLATION_TYPES[0].defaultAction)}</textarea>
          </div>

          <div class="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 flex-wrap">
            <label class="flex items-center gap-2 font-bold text-amber-950 cursor-pointer">
              <input type="checkbox" id="spReportSyncPenaltyCb" checked class="w-4 h-4 accent-rose-600">
              <span>Tự động trừ điểm thi đua tuần theo Quy chế 01</span>
            </label>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-bold text-amber-900">Mức trừ:</span>
              <input type="number" id="spReportPenaltyPointsInput" value="-20" max="0" min="-100" class="w-20 px-2 py-1 rounded-lg border border-amber-300 bg-white font-mono font-black text-rose-700 text-center">
              <span class="text-[11px] font-bold text-amber-900">điểm</span>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onclick="closeSpecialViolationReportModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold">
              Hủy bỏ
            </button>
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md flex items-center gap-1.5 transition">
              <i class="fa-solid fa-file-circle-check"></i> Lưu & Xuất Biên Bản Vi Phạm
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

function onSpecialViolationTypeChange(code) {
  const meta = getSpecialViolationTypeMeta(code);
  const resEl = document.getElementById("spReportResolutionInput");
  const ptsEl = document.getElementById("spReportPenaltyPointsInput");
  if (resEl) resEl.value = meta.defaultAction;
  if (ptsEl) ptsEl.value = meta.defaultPenaltyPoints;
}

function openSpecialViolationReportModal(preselectedStudentId = "") {
  if (!appState.currentUser || appState.roleLevel === "STUDENT" || appState.roleLevel === "GUEST") {
    alert("Chỉ GVCN và Ban cán sự lớp mới có quyền lập biên bản vi phạm!");
    return;
  }
  ensureSpecialViolationReportModal();

  const listBox = document.getElementById("spReportStudentsCheckboxList");
  if (listBox) {
    listBox.innerHTML = appState.students.map(s => `
      <label class="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50/40 flex items-center gap-1.5 cursor-pointer text-[11px]">
        <input type="checkbox" value="${escapeAttr(s.id)}" ${s.id === preselectedStudentId ? "checked" : ""} class="accent-rose-600 sp-report-st-cb">
        <span class="font-bold text-slate-800 truncate">${escapeHtml(s.hoTen)}</span>
        <span class="text-[9.5px] text-slate-400 shrink-0">(${escapeHtml(s.to)})</span>
      </label>
    `).join("");
  }

  document.getElementById("specialViolationReportModal").classList.remove("hidden");
}

function closeSpecialViolationReportModal() {
  const m = document.getElementById("specialViolationReportModal");
  if (m) m.classList.add("hidden");
}

async function submitSpecialViolationReport(e) {
  if (e && e.preventDefault) e.preventDefault();

  const selectedIds = Array.from(document.querySelectorAll(".sp-report-st-cb:checked")).map(cb => cb.value);
  if (selectedIds.length === 0) {
    alert("Vui lòng chọn ít nhất 01 học sinh vi phạm!");
    return;
  }

  const typeCode = document.getElementById("spReportTypeSelect").value;
  const typeMeta = getSpecialViolationTypeMeta(typeCode);
  const location = document.getElementById("spReportLocationInput").value.trim();
  const evidence = document.getElementById("spReportEvidenceInput").value.trim();
  const witnessName = document.getElementById("spReportWitnessInput").value.trim();
  const description = document.getElementById("spReportDescInput").value.trim();
  const studentStatement = document.getElementById("spReportStatementInput").value.trim();
  const resolution = document.getElementById("spReportResolutionInput").value.trim();
  const syncPenalty = document.getElementById("spReportSyncPenaltyCb").checked;
  const penaltyPts = syncPenalty ? (parseInt(document.getElementById("spReportPenaltyPointsInput").value, 10) || -20) : 0;

  const selectedStudents = selectedIds.map(id => {
    const s = appState.students.find(x => x.id === id);
    return s ? { id: s.id, hoTen: s.hoTen, to: s.to } : { id, hoTen: id, to: "" };
  });

  const now = new Date();
  const dateVN = formatDateVN(now);
  const timeVN = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const reportId = `BB_${Date.now()}`;
  const reportCode = `BB-${String((appState.specialViolationReports || []).length + 1).padStart(2, "0")}/10A12`;

  const reportObj = {
    id: reportId,
    reportCode,
    week: appState.selectedWeek,
    createdAt: `${timeVN} ngày ${dateVN}`,
    incidentDateTime: `${timeVN} ngày ${dateVN}`,
    typeCode,
    typeLabel: typeMeta.label,
    location,
    students: selectedStudents,
    studentId: selectedStudents.map(s => s.id).join(", "),
    studentName: selectedStudents.map(s => s.hoTen).join(", "),
    team: selectedStudents.map(s => s.to).join(", "),
    evidence,
    witnessName,
    description,
    studentStatement,
    resolution,
    deductedPoints: penaltyPts,
    recorderName: appState.currentUser ? appState.currentUser.fullName : "GVCN lớp 10A12",
    recorderRole: appState.currentUser ? appState.currentUser.role : "Giáo viên chủ nhiệm",
    parentSigned: false
  };

  if (!Array.isArray(appState.specialViolationReports)) appState.specialViolationReports = [];
  appState.specialViolationReports.unshift(reportObj);

  // Đồng bộ trừ điểm thi đua tuần nếu được chọn
  if (syncPenalty && penaltyPts !== 0) {
    for (const stInfo of selectedStudents) {
      const st = appState.students.find(s => s.id === stInfo.id);
      if (st) {
        st.diemThiDua = Math.max(0, parseScore(st.diemThiDua, 100) + penaltyPts);
      }
      const incidentKey = `${reportId}_${stInfo.id}`;
      const criteriaText = `[Biên bản ${reportCode}] ${typeMeta.label}`;
      appState.violations.unshift({
        time: `Biên bản (${dateVN})`,
        date: dateVN,
        week: appState.selectedWeek,
        studentId: stInfo.id,
        studentName: stInfo.hoTen,
        criteria: criteriaText,
        points: penaltyPts,
        note: description,
        sender: reportObj.recorderName,
        incidentKey
      });

      await callApi("recordViolation", {
        incidentKey,
        week: appState.selectedWeek,
        date: dateVN,
        displayTime: `Biên bản (${dateVN})`,
        studentId: stInfo.id,
        studentName: stInfo.hoTen,
        criteria: criteriaText,
        points: penaltyPts,
        note: description,
        sender: reportObj.recorderName
      }, "POST");
    }
  }

  saveStateToLocal();
  closeSpecialViolationReportModal();
  renderAllSections();

  await callApi("saveConfig", {
    specialViolationReportsJson: JSON.stringify(appState.specialViolationReports)
  }, "POST");

  openSpecialViolationViewerModal(reportId);
}

function ensureSpecialViolationViewerModal() {
  if (document.getElementById("specialViolationViewerModal")) return;
  const html = `
    <div id="specialViolationViewerModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeSpecialViolationViewerModal()">
      <div class="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[93vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <i class="fa-solid fa-file-contract text-rose-600"></i>
            Toàn Văn Biên Bản Vi Phạm Nội Quy
          </h3>
          <button onclick="closeSpecialViolationViewerModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div id="spViolationViewerBody" class="overflow-y-auto py-3 flex-1"></div>

        <div id="spViolationViewerFooter" class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

let activeViewingSpecialReportId = "";

function openSpecialViolationViewerModal(reportId) {
  ensureSpecialViolationViewerModal();
  const rep = (appState.specialViolationReports || []).find(x => x.id === reportId);
  if (!rep) return;
  activeViewingSpecialReportId = reportId;

  const bodyEl = document.getElementById("spViolationViewerBody");
  const footerEl = document.getElementById("spViolationViewerFooter");

  if (bodyEl) bodyEl.innerHTML = buildOfficialSpecialViolationReportHtml(rep);
  if (footerEl) {
    footerEl.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        <button type="button" onclick="printSpecialViolationReport()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition">
          <i class="fa-solid fa-print"></i> In Biên Bản
        </button>
        <button type="button" onclick="exportSpecialViolationReportWord('${escapeAttr(rep.id)}')" class="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center gap-1.5 transition">
          <i class="fa-solid fa-file-word"></i> Tải File Word (.doc)
        </button>
      </div>
      <button type="button" onclick="closeSpecialViolationViewerModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
        Đóng
      </button>
    `;
  }

  document.getElementById("specialViolationViewerModal").classList.remove("hidden");
}

function closeSpecialViolationViewerModal() {
  const m = document.getElementById("specialViolationViewerModal");
  if (m) m.classList.add("hidden");
}

function printSpecialViolationReport() {
  const content = document.getElementById("spViolationViewerBody");
  if (!content) return;
  const win = window.open("", "_blank");
  if (!win) {
    window.print();
    return;
  }
  win.document.write(`<html><head><title>Biên bản vi phạm nội quy - Lớp 10A12</title></head><body style="padding:28px;">${content.innerHTML}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function exportSpecialViolationReportWord(reportId) {
  const rep = (appState.specialViolationReports || []).find(x => x.id === reportId);
  if (!rep) return;
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${escapeHtml(rep.reportCode)}</title></head>
    <body style="font-family:'Times New Roman',serif; font-size:13pt;">
      ${buildOfficialSpecialViolationReportHtml(rep)}
    </body>
    </html>
  `;
  const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bien_Ban_Vi_Pham_${rep.reportCode.replace(/[^a-zA-Z0-9_-]/g, "_")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

async function toggleSpecialReportParentSigned(reportId) {
  if (appState.roleLevel !== "GVCN") return;
  const rep = (appState.specialViolationReports || []).find(x => x.id === reportId);
  if (!rep) return;
  rep.parentSigned = !rep.parentSigned;
  saveStateToLocal();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
  await callApi("saveConfig", {
    specialViolationReportsJson: JSON.stringify(appState.specialViolationReports)
  }, "POST");
}

async function deleteSpecialViolationReport(reportId) {
  if (appState.roleLevel !== "GVCN") return;
  if (!confirm("Thầy có chắc chắn muốn xóa biên bản vi phạm này?")) return;
  appState.specialViolationReports = (appState.specialViolationReports || []).filter(x => x.id !== reportId);
  saveStateToLocal();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
  await callApi("saveConfig", {
    specialViolationReportsJson: JSON.stringify(appState.specialViolationReports)
  }, "POST");
}

function renderSpecialViolationReportsSection() {
  const targetTab = document.getElementById("tab-bien-ban") || document.getElementById("tab-thi-dua");
  if (!targetTab) return;

  let container = document.getElementById("specialViolationReportsContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "specialViolationReportsContainer";
    container.className = "mt-5 p-4 sm:p-5 rounded-3xl bg-white border-2 border-rose-200 shadow-xs space-y-3";
    targetTab.appendChild(container);
  }

  // Thêm nút lập biên bản nhanh trên thanh công cụ Tab Thi đua nếu chưa có
  const filterBar = document.getElementById("disciplineQuickFilterBar");
  if (filterBar && !document.getElementById("btnQuickOpenSpecialReport")) {
    const btn = document.createElement("button");
    btn.id = "btnQuickOpenSpecialReport";
    btn.type = "button";
    btn.onclick = () => openSpecialViolationReportModal();
    btn.className = "px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] shadow-2xs transition flex items-center gap-1.5";
    btn.innerHTML = `<i class="fa-solid fa-file-shield"></i> Lập Biên Bản Vi Phạm Đặc Biệt`;
    filterBar.appendChild(btn);
  }

  const list = appState.specialViolationReports || [];
  const isGVCN = (appState.roleLevel === "GVCN");
  const canCreate = isGVCN || appState.roleLevel === "LEADER";

  container.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
      <div>
        <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-file-shield text-rose-600"></i>
          Biên Bản Vi Phạm Nội Quy Đặc Biệt (Tài liệu thi, Đánh nhau, Vô lễ...)
          <span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10.5px] font-black">${list.length} biên bản</span>
        </h3>
        <p class="text-[11px] text-slate-500">Lưu trữ hồ sơ xử lý vi phạm nghiêm trọng, xuất file Word/in cho Phụ huynh & Hội đồng kỷ luật ký xác nhận</p>
      </div>
      ${canCreate ? `
        <button type="button" onclick="openSpecialViolationReportModal()" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto">
          <i class="fa-solid fa-plus"></i> Lập Biên Bản Mới
        </button>
      ` : ""}
    </div>

    ${list.length === 0 ? `
      <p class="text-xs text-slate-400 italic py-3 text-center">Chưa có biên bản vi phạm nội quy đặc biệt nào được lập.</p>
    ` : `
      <div class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        ${list.map(rep => {
          const meta = getSpecialViolationTypeMeta(rep.typeCode);
          return `
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono font-black text-[10.5px] px-2 py-0.5 rounded bg-slate-900 text-white">${escapeHtml(rep.reportCode)}</span>
                  <span class="px-2 py-0.5 rounded-lg border font-black text-[10.5px] ${meta.badge}">${escapeHtml(rep.typeLabel)}</span>
                  <span class="px-2 py-0.5 rounded-md font-bold text-[10px] ${rep.parentSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${rep.parentSigned ? '✓ PHHS đã ký xác nhận' : 'Chờ PHHS ký xác nhận'}
                  </span>
                </div>
                <p class="text-slate-900 font-bold">Học sinh: <span class="text-rose-700">${escapeHtml(rep.studentName)}</span> <span class="text-slate-500 font-normal">(${escapeHtml(rep.team)} • ${escapeHtml(rep.createdAt)})</span></p>
                <p class="text-slate-600"><b>Diễn biến:</b> ${escapeHtml(rep.description)}</p>
              </div>

              <div class="flex items-center gap-1.5 shrink-0 self-start sm:self-center flex-wrap">
                <button type="button" onclick="openSpecialViolationViewerModal('${escapeAttr(rep.id)}')" class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-900 text-slate-800 hover:text-white border border-slate-300 font-bold text-[11px] transition">
                  <i class="fa-solid fa-eye mr-1"></i> Xem / In
                </button>
                <button type="button" onclick="exportSpecialViolationReportWord('${escapeAttr(rep.id)}')" class="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-700 text-sky-800 hover:text-white border border-sky-200 font-bold text-[11px] transition" title="Tải file Word">
                  <i class="fa-solid fa-file-word"></i>
                </button>
                ${isGVCN ? `
                  <button type="button" onclick="toggleSpecialReportParentSigned('${escapeAttr(rep.id)}')" class="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold text-[11px] transition" title="Đánh dấu Phụ huynh đã ký">
                    <i class="fa-solid fa-signature"></i>
                  </button>
                  <button type="button" onclick="deleteSpecialViolationReport('${escapeAttr(rep.id)}')" class="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-200 font-bold text-[11px] transition" title="Xóa biên bản">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                ` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `}
  `;
}


// ==================== BỘ MÁY TỔNG HỢP NĂM HỌC & XÉT RÈN LUYỆN THEO CHỈ TIÊU QUOTA (%) ====================
function computeFullYearStudentMetrics() {
  const allViolations = [...(appState.violations || [])];
  const archives = appState.weeklyArchives || {};
  const archivedWeeks = Object.keys(archives);

  archivedWeeks.forEach(wKey => {
    const arch = archives[wKey];
    if (arch && Array.isArray(arch.violations)) {
      arch.violations.forEach(v => {
        if (!allViolations.some(x => x.incidentKey && x.incidentKey === v.incidentKey)) {
          allViolations.push({ ...v, week: arch.week });
        }
      });
    }
  });

  const specialReports = appState.specialViolationReports || [];

  return (appState.students || []).map(st => {
    const myVios = allViolations.filter(v => v.studentId === st.id);
    const excusedCount = myVios.filter(v => v.criteria && v.criteria.includes("Có phép")).length;
    const unexcusedCount = myVios.filter(v => v.criteria && (v.criteria.includes("Không phép") || v.criteria.includes("K.Phép"))).length;
    const totalAbsent = excusedCount + unexcusedCount;
    const lateCount = myVios.filter(v => v.criteria && v.criteria.toLowerCase().includes("trễ")).length;

    const plusEvents = myVios.filter(v => parseScore(v.points, 0) > 0);
    const minusEvents = myVios.filter(v => parseScore(v.points, 0) < 0);
    const totalPlusPts = plusEvents.reduce((s, v) => s + parseScore(v.points, 0), 0);
    const totalMinusPts = minusEvents.reduce((s, v) => s + parseScore(v.points, 0), 0);

    // Tính điểm thi đua trung bình tích lũy qua các tuần lưu trữ + tuần hiện tại
    const weekScores = [];
    archivedWeeks.forEach(wKey => {
      const arch = archives[wKey];
      if (arch && Array.isArray(arch.students)) {
        const found = arch.students.find(x => x.id === st.id);
        if (found) weekScores.push(parseScore(found.diemThiDua, 100));
      }
    });
    const currentWeekScore = parseScore(st.diemThiDua, 100);
    weekScores.push(currentWeekScore);

    const avgDisciplineScore = Number((weekScores.reduce((a, b) => a + b, 0) / weekScores.length).toFixed(2));

    // Kiểm tra có biên bản vi phạm đặc biệt (tài liệu, đánh nhau, vô lễ...) hay không
    const mySpecialReports = specialReports.filter(rep => {
      if (Array.isArray(rep.students)) return rep.students.some(x => x.id === st.id);
      return String(rep.studentId || "").includes(st.id);
    });

    // Chấm điểm tổng hợp xét rèn luyện (Composite Index) để xếp hạng công bằng từ cao xuống thấp
    // Điểm gốc = avgDisciplineScore, trừ thêm 1.5đ/buổi không phép, 0.3đ/buổi có phép, 0.5đ/lần đi trễ, 15đ/biên bản đặc biệt
    const compositeRankScore = Number((
      avgDisciplineScore
      - (unexcusedCount * 1.5)
      - (excusedCount * 0.3)
      - (lateCount * 0.5)
      - (mySpecialReports.length * 15)
    ).toFixed(2));

    return {
      student: st,
      id: st.id,
      hoTen: st.hoTen,
      to: st.to,
      chucVu: st.chucVu || "Thành viên",
      excusedCount,
      unexcusedCount,
      totalAbsent,
      lateCount,
      totalPlusPts,
      totalMinusPts,
      currentWeekScore,
      avgDisciplineScore,
      specialReportCount: mySpecialReports.length,
      compositeRankScore
    };
  });
}

function classifyStudentsByQuotaPercentages(metricsList, pctTotInput, pctKhaInput, pctDatInput) {
  const n = metricsList.length;
  if (n === 0) return [];

  // Chuẩn hóa tỷ lệ % nhập vào
  let pTot = Math.max(0, Math.min(100, Number(pctTotInput) || 0));
  let pKha = Math.max(0, Math.min(100 - pTot, Number(pctKhaInput) || 0));
  let pDat = Math.max(0, Math.min(100 - pTot - pKha, Number(pctDatInput) || 0));

  // Sắp xếp từ cao xuống thấp theo điểm tổng hợp rèn luyện
  const sorted = [...metricsList].sort((a, b) => {
    if (b.compositeRankScore !== a.compositeRankScore) return b.compositeRankScore - a.compositeRankScore;
    if (a.totalAbsent !== b.totalAbsent) return a.totalAbsent - b.totalAbsent;
    return b.totalPlusPts - a.totalPlusPts;
  });

  // Tính chỉ tiêu số lượng học sinh tối đa cho từng bậc dựa trên % GVCN nhập
  const maxTotSlots = Math.round((n * pTot) / 100);
  const maxKhaSlots = Math.round((n * pKha) / 100);
  const maxDatSlots = Math.round((n * pDat) / 100);

  let usedTot = 0;
  let usedKha = 0;
  let usedDat = 0;

  return sorted.map((item, idx) => {
    let rating = "CHUA_DAT";
    let ratingLabel = "Chưa đạt";
    let note = "";

    // Ràng buộc cứng theo Thông tư 22/2021/TT-BGDĐT:
    // 1. Nghỉ quá 45 buổi/năm -> Bắt buộc Chưa đạt
    if (item.totalAbsent > 45) {
      rating = "CHUA_DAT";
      ratingLabel = "Chưa đạt";
      note = `Nghỉ ${item.totalAbsent}/45 buổi (vượt quy định TT22)`;
    }
    // 2. Có biên bản vi phạm đặc biệt nghiêm trọng (đánh nhau, gian lận...) hoặc điểm TB < 50 -> Không xếp Tốt, hạ bậc theo mức độ
    else if (item.avgDisciplineScore < 50) {
      rating = "CHUA_DAT";
      ratingLabel = "Chưa đạt";
      note = `Điểm thi đua TB thấp (${item.avgDisciplineScore}đ)`;
    }
    else if (item.specialReportCount > 0) {
      if (usedDat < maxDatSlots || (pTot + pKha + pDat >= 99.9)) {
        usedDat++;
        rating = "DAT";
        ratingLabel = "Đạt";
        note = `Hạ bậc do có ${item.specialReportCount} biên bản vi phạm đặc biệt`;
      } else {
        rating = "CHUA_DAT";
        ratingLabel = "Chưa đạt";
        note = `Có ${item.specialReportCount} biên bản vi phạm đặc biệt`;
      }
    }
    // 3. Phân bổ theo chỉ tiêu % (Quota) từ trên xuống dưới
    else if (usedTot < maxTotSlots && item.unexcusedCount <= 2) {
      usedTot++;
      rating = "TOT";
      ratingLabel = "Tốt";
      note = item.chucVu !== "Thành viên"
        ? `Chấp hành tốt nội quy, tích cực công tác (${item.chucVu})`
        : "Chấp hành nghiêm nội quy, rèn luyện tốt";
    } else if (usedKha < maxKhaSlots) {
      usedKha++;
      rating = "KHA";
      ratingLabel = "Khá";
      note = item.unexcusedCount > 2
        ? `Khống chế mức Khá do nghỉ không phép ${item.unexcusedCount} buổi`
        : (item.totalAbsent > 0 || item.lateCount > 0
          ? `Có ý thức rèn luyện, cần khắc phục chuyên cần (${item.totalAbsent} vắng, ${item.lateCount} trễ)`
          : "Có ý thức rèn luyện, xếp theo chỉ tiêu thi đua lớp");
    } else if (usedDat < maxDatSlots || (pTot + pKha + pDat >= 99.9)) {
      usedDat++;
      rating = "DAT";
      ratingLabel = "Đạt";
      note = "Cần cố gắng hơn trong chấp hành nội quy và chuyên cần";
    } else {
      rating = "CHUA_DAT";
      ratingLabel = "Chưa đạt";
      note = "Chưa đạt chỉ tiêu rèn luyện cuối năm";
    }

    // Sinh nhận xét học bạ TT22 tự động
    const commentParts = [];
    if (rating === "TOT") {
      commentParts.push("Phẩm chất đạo đức tốt, lễ phép, hòa đồng với bạn bè.");
    } else if (rating === "KHA") {
      commentParts.push("Đạo đức khá, có ý thức chấp hành nội quy trường lớp.");
    } else if (rating === "DAT") {
      commentParts.push("Đạo đức đạt yêu cầu, đôi lúc còn thiếu tập trung cần rèn luyện thêm.");
    } else {
      commentParts.push("Cần nghiêm túc rèn luyện lại ý thức tổ chức kỷ luật và chuyên cần.");
    }

    if (item.totalAbsent === 0 && item.lateCount === 0) {
      commentParts.push("Đi học chuyên cần, đúng giờ.");
    } else {
      commentParts.push(`Nghỉ ${item.totalAbsent} buổi (${item.excusedCount}P, ${item.unexcusedCount}KP), đi trễ ${item.lateCount} lần.`);
    }
    if (item.totalPlusPts > 0) {
      commentParts.push(`Tích cực phát biểu và tham gia phong trào (+${item.totalPlusPts}đ).`);
    }

    return {
      ...item,
      rank: idx + 1,
      rating,
      ratingLabel,
      note,
      autoComment: commentParts.join(" ")
    };
  });
}

let lastComputedYearEndResults = [];

function recalculateAndRenderYearEndConduct() {
  const totEl = document.getElementById("quotaPctTotInput");
  const khaEl = document.getElementById("quotaPctKhaInput");
  const datEl = document.getElementById("quotaPctDatInput");
  const chuaDatDisplay = document.getElementById("quotaPctChuaDatDisplay");
  const filterSel = document.getElementById("yearEndRatingFilter");

  const pTot = totEl ? Number(totEl.value) || 0 : 75;
  const pKha = khaEl ? Number(khaEl.value) || 0 : 20;
  const pDat = datEl ? Number(datEl.value) || 0 : 5;
  const pChuaDat = Math.max(0, Number((100 - pTot - pKha - pDat).toFixed(1)));

  if (chuaDatDisplay) {
    chuaDatDisplay.innerText = `${pChuaDat}%`;
  }

  // Lưu cấu hình tỷ lệ % của GVCN
  localStorage.setItem("10A12_CONDUCT_QUOTA_PCT", JSON.stringify({ pTot, pKha, pDat }));

  const metrics = computeFullYearStudentMetrics();
  const classified = classifyStudentsByQuotaPercentages(metrics, pTot, pKha, pDat);
  lastComputedYearEndResults = classified;

  const countTot = classified.filter(x => x.rating === "TOT").length;
  const countKha = classified.filter(x => x.rating === "KHA").length;
  const countDat = classified.filter(x => x.rating === "DAT").length;
  const countChuaDat = classified.filter(x => x.rating === "CHUA_DAT").length;
  const total = classified.length || 1;

  const setStat = (id, cnt) => {
    const el = document.getElementById(id);
    if (el) el.innerText = `${cnt} HS (${Math.round((cnt / total) * 100)}%)`;
  };
  setStat("yeStatTot", countTot);
  setStat("yeStatKha", countKha);
  setStat("yeStatDat", countDat);
  setStat("yeStatChuaDat", countChuaDat);

  const filterVal = filterSel ? filterSel.value : "ALL";
  const displayed = filterVal === "ALL" ? classified : classified.filter(x => x.rating === filterVal);

  const tbody = document.getElementById("yearEndConductTableBody");
  if (!tbody) return;

  const badgeMap = {
    "TOT": "bg-emerald-100 text-emerald-800 border-emerald-300",
    "KHA": "bg-sky-100 text-sky-800 border-sky-300",
    "DAT": "bg-amber-100 text-amber-800 border-amber-300",
    "CHUA_DAT": "bg-rose-100 text-rose-800 border-rose-300"
  };

  tbody.innerHTML = displayed.map((r, idx) => `
    <tr class="${idx % 2 === 0 ? "bg-white" : "bg-slate-50/80"} border-b border-slate-200 hover:bg-sky-50/40 transition text-xs">
      <td class="py-2.5 px-2.5 text-center font-mono font-bold text-slate-500">${r.rank}</td>
      <td class="py-2.5 px-3">
        <b class="text-slate-900 block">${escapeHtml(r.hoTen)}</b>
        <span class="text-[10px] text-slate-500">${escapeHtml(r.id)} • ${escapeHtml(r.to)} • ${escapeHtml(r.chucVu)}</span>
      </td>
      <td class="py-2.5 px-2 text-center font-mono">
        <b class="${r.totalAbsent > 0 ? 'text-rose-600' : 'text-slate-700'}">${r.totalAbsent}</b>
        <span class="block text-[9.5px] text-slate-400">(${r.excusedCount}P / ${r.unexcusedCount}KP)</span>
      </td>
      <td class="py-2.5 px-2 text-center font-mono font-bold ${r.lateCount > 0 ? 'text-amber-600' : 'text-slate-400'}">${r.lateCount}</td>
      <td class="py-2.5 px-2 text-center font-mono font-black text-sky-900">${r.avgDisciplineScore}đ</td>
      <td class="py-2.5 px-2 text-center font-mono font-bold text-indigo-800">${r.compositeRankScore}</td>
      <td class="py-2.5 px-2.5 text-center">
        <select onchange="overrideStudentConductRating('${escapeAttr(r.id)}', this.value)" class="px-2 py-1 rounded-lg border font-black text-[11px] ${badgeMap[r.rating]} focus:outline-none cursor-pointer">
          <option value="TOT" ${r.rating === "TOT" ? "selected" : ""}>🟢 Tốt</option>
          <option value="KHA" ${r.rating === "KHA" ? "selected" : ""}>🔵 Khá</option>
          <option value="DAT" ${r.rating === "DAT" ? "selected" : ""}>🟡 Đạt</option>
          <option value="CHUA_DAT" ${r.rating === "CHUA_DAT" ? "selected" : ""}>🔴 Chưa đạt</option>
        </select>
      </td>
      <td class="py-2.5 px-3 text-[11px] text-slate-700 leading-snug max-w-xs">
        ${escapeHtml(r.autoComment)}
      </td>
    </tr>
  `).join("");
}

function overrideStudentConductRating(studentId, newRating) {
  const item = lastComputedYearEndResults.find(x => x.id === studentId);
  if (!item) return;
  const labelMap = { "TOT": "Tốt", "KHA": "Khá", "DAT": "Đạt", "CHUA_DAT": "Chưa đạt" };
  item.rating = newRating;
  item.ratingLabel = labelMap[newRating] || "Tốt";

  const total = lastComputedYearEndResults.length || 1;
  const setStat = (id, cnt) => {
    const el = document.getElementById(id);
    if (el) el.innerText = `${cnt} HS (${Math.round((cnt / total) * 100)}%)`;
  };
  setStat("yeStatTot", lastComputedYearEndResults.filter(x => x.rating === "TOT").length);
  setStat("yeStatKha", lastComputedYearEndResults.filter(x => x.rating === "KHA").length);
  setStat("yeStatDat", lastComputedYearEndResults.filter(x => x.rating === "DAT").length);
  setStat("yeStatChuaDat", lastComputedYearEndResults.filter(x => x.rating === "CHUA_DAT").length);
}

function exportYearEndConductExcel() {
  if (!lastComputedYearEndResults || lastComputedYearEndResults.length === 0) {
    recalculateAndRenderYearEndConduct();
  }
  const rows = [
    ["Hạng", "Mã HS", "Họ và tên", "Tổ", "Chức vụ", "Tổng nghỉ", "Có phép", "Không phép", "Đi trễ", "ĐTB Thi đua", "Điểm xét RL", "Xếp loại Rèn luyện TT22", "Nhận xét Học bạ gợi ý"]
  ];
  lastComputedYearEndResults.forEach(r => {
    rows.push([
      r.rank, r.id, r.hoTen, r.to, r.chucVu,
      r.totalAbsent, r.excusedCount, r.unexcusedCount, r.lateCount,
      r.avgDisciplineScore, r.compositeRankScore, r.ratingLabel, r.autoComment
    ]);
  });

  if (typeof XLSX !== "undefined") {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Xet_Ren_Luyen_TT22");
    XLSX.writeFile(wb, `Tong_Hop_Xet_Ren_Luyen_10A12_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } else {
    const csvContent = "\ufeff" + rows.map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tong_Hop_Xet_Ren_Luyen_10A12_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function renderYearEndConductGradingPanel() {
  const hostTab = document.getElementById("tab-bien-ban") || document.getElementById("tab-danh-sach");
  if (!hostTab) return;

  let panel = document.getElementById("yearEndConductGradingPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "yearEndConductGradingPanel";
    panel.className = "mt-5 p-4 sm:p-6 rounded-3xl bg-white border-2 border-indigo-200 shadow-xs space-y-4";
    hostTab.appendChild(panel);

    const savedQuota = safeJsonParse(localStorage.getItem("10A12_CONDUCT_QUOTA_PCT"), { pTot: 75, pKha: 20, pDat: 5 });

    panel.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-graduation-cap text-indigo-700 text-lg"></i>
            Tổng Hợp Năm Học & Xét Rèn Luyện Cuối Năm Theo Chỉ Tiêu Thi Đua Lớp (%)
          </h3>
          <p class="text-[11px] text-slate-500">Tự động tổng hợp chuyên cần cả năm, điểm thi đua trung bình, biên bản vi phạm và tự động phân loại Tốt / Khá / Đạt theo tỷ lệ % thi đua của lớp</p>
        </div>
        <button type="button" onclick="exportYearEndConductExcel()" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5 self-start md:self-auto shrink-0">
          <i class="fa-solid fa-file-excel"></i> Xuất Excel Học Bạ (VnEdu)
        </button>
      </div>

      <!-- BẢNG NHẬP CHỈ TIÊU PHẦN TRĂM THI ĐUA CỦA LỚP -->
      <div class="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span class="text-xs font-black text-indigo-950 uppercase"><i class="fa-solid fa-sliders mr-1.5 text-indigo-600"></i>Nhập tỷ lệ % chỉ tiêu rèn luyện được phân bổ theo xếp hạng thi đua lớp:</span>
          <div class="flex items-center gap-1.5 text-[11px]">
            <button type="button" onclick="document.getElementById('quotaPctTotInput').value=85; document.getElementById('quotaPctKhaInput').value=15; document.getElementById('quotaPctDatInput').value=0; recalculateAndRenderYearEndConduct();" class="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">Lớp Hạng Nhất (85/15/0)</button>
            <button type="button" onclick="document.getElementById('quotaPctTotInput').value=75; document.getElementById('quotaPctKhaInput').value=20; document.getElementById('quotaPctDatInput').value=5; recalculateAndRenderYearEndConduct();" class="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">Lớp Tiên Tiến (75/20/5)</button>
            <button type="button" onclick="document.getElementById('quotaPctTotInput').value=65; document.getElementById('quotaPctKhaInput').value=25; document.getElementById('quotaPctDatInput').value=10; recalculateAndRenderYearEndConduct();" class="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold">Mức Trung Bình (65/25/10)</button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end text-xs">
          <div>
            <label class="block font-bold text-emerald-900 mb-1">🟢 Tỷ lệ Tốt (%):</label>
            <input type="number" id="quotaPctTotInput" value="${savedQuota.pTot}" min="0" max="100" oninput="recalculateAndRenderYearEndConduct()"
              class="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-mono font-black text-emerald-800 text-center focus:outline-none">
          </div>
          <div>
            <label class="block font-bold text-sky-900 mb-1">🔵 Tỷ lệ Khá (%):</label>
            <input type="number" id="quotaPctKhaInput" value="${savedQuota.pKha}" min="0" max="100" oninput="recalculateAndRenderYearEndConduct()"
              class="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white font-mono font-black text-sky-800 text-center focus:outline-none">
          </div>
          <div>
            <label class="block font-bold text-amber-900 mb-1">🟡 Tỷ lệ Đạt (%):</label>
            <input type="number" id="quotaPctDatInput" value="${savedQuota.pDat}" min="0" max="100" oninput="recalculateAndRenderYearEndConduct()"
              class="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono font-black text-amber-800 text-center focus:outline-none">
          </div>
          <div class="p-2 rounded-xl bg-white border border-rose-200 text-center">
            <span class="text-[10px] font-bold text-rose-700 uppercase block">🔴 Chưa đạt (%)</span>
            <b id="quotaPctChuaDatDisplay" class="text-sm font-mono font-black text-rose-700">0%</b>
          </div>
          <div>
            <button type="button" onclick="recalculateAndRenderYearEndConduct()" class="w-full py-2.5 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-black shadow-xs transition">
              <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Tự Động Lọc & Xếp
            </button>
          </div>
        </div>
      </div>

      <!-- THỐNG KÊ KẾT QUẢ SAU KHI LỌC -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
        <div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
          <span class="text-[10px] font-bold text-emerald-700 uppercase block">Xếp loại Tốt</span>
          <b id="yeStatTot" class="text-sm sm:text-base font-black text-emerald-900">0 HS</b>
        </div>
        <div class="p-3 rounded-2xl bg-sky-50 border border-sky-200">
          <span class="text-[10px] font-bold text-sky-700 uppercase block">Xếp loại Khá</span>
          <b id="yeStatKha" class="text-sm sm:text-base font-black text-sky-900">0 HS</b>
        </div>
        <div class="p-3 rounded-2xl bg-amber-50 border border-amber-200">
          <span class="text-[10px] font-bold text-amber-700 uppercase block">Xếp loại Đạt</span>
          <b id="yeStatDat" class="text-sm sm:text-base font-black text-amber-900">0 HS</b>
        </div>
        <div class="p-3 rounded-2xl bg-rose-50 border border-rose-200">
          <span class="text-[10px] font-bold text-rose-700 uppercase block">Chưa đạt</span>
          <b id="yeStatChuaDat" class="text-sm sm:text-base font-black text-rose-900">0 HS</b>
        </div>
      </div>

      <!-- BỘ LỌC HIỂN THỊ & BẢNG CHI TIẾT -->
      <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
        <span class="font-bold text-slate-600"><i class="fa-solid fa-circle-info text-sky-600 mr-1"></i>Hệ thống tự động ưu tiên học sinh điểm rèn luyện cao, không vắng không phép; cho phép GVCN tinh chỉnh tay từng em nếu cần.</span>
        <select id="yearEndRatingFilter" onchange="recalculateAndRenderYearEndConduct()" class="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-300 font-bold text-slate-800 focus:outline-none">
          <option value="ALL">Hiển thị tất cả học sinh</option>
          <option value="TOT">Chỉ xem nhóm Tốt</option>
          <option value="KHA">Chỉ xem nhóm Khá</option>
          <option value="DAT">Chỉ xem nhóm Đạt</option>
          <option value="CHUA_DAT">Chỉ xem nhóm Chưa đạt</option>
        </select>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-slate-200 max-h-[500px]">
        <table class="w-full border-collapse min-w-[780px]">
          <thead class="sticky top-0 z-10">
            <tr class="bg-slate-900 text-white text-[10.5px] uppercase">
              <th class="py-2.5 px-2.5 text-center w-12">Hạng</th>
              <th class="py-2.5 px-3 text-left">Học sinh</th>
              <th class="py-2.5 px-2 text-center">Nghỉ (P/KP)</th>
              <th class="py-2.5 px-2 text-center">Trễ</th>
              <th class="py-2.5 px-2 text-center">ĐTB Thi đua</th>
              <th class="py-2.5 px-2 text-center">Điểm xét RL</th>
              <th class="py-2.5 px-2.5 text-center">Xếp loại TT22</th>
              <th class="py-2.5 px-3 text-left">Nhận xét Học bạ tự động</th>
            </tr>
          </thead>
          <tbody id="yearEndConductTableBody"></tbody>
        </table>
      </div>
    `;
  }

  recalculateAndRenderYearEndConduct();
}

// ==================== BỘ MÁY BẢN TIN ZALO CUỐI TUẦN 1-CLICK & HỘP THƯ ĐÍNH CHÍNH HỒ SƠ ====================
function copyWeeklyZaloSummaryBulletin() {
  const scoped = getScopedWeekData();
  const weekNum = scoped.selectedWeek;
  const totalStudents = scoped.students.length || 45;

  const avgScore = totalStudents > 0
    ? (scoped.students.reduce((s, st) => s + parseScore(st.diemThiDua, 100), 0) / totalStudents).toFixed(1)
    : "100.0";

  const excusedCount = scoped.violations.filter(v => v.criteria && v.criteria.includes("Có phép")).length;
  const unexcusedCount = scoped.violations.filter(v => v.criteria && (v.criteria.includes("Không phép") || v.criteria.includes("K.Phép"))).length;
  const lateCount = scoped.violations.filter(v => v.criteria && v.criteria.toLowerCase().includes("trễ")).length;

  // Top 3 học sinh có điểm cao nhất tuần
  const topList = [...scoped.students]
    .filter(s => parseScore(s.diemThiDua, 100) > 100)
    .sort((a, b) => parseScore(b.diemThiDua, 100) - parseScore(a.diemThiDua, 100))
    .slice(0, 5)
    .map(s => `${s.hoTen} (${parseScore(s.diemThiDua, 100)}đ)`);

  const currentUrl = window.location.href.split("?")[0].split("#")[0];
  const lookupUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/")) + "/tracuu.html";
  const tkbVer = getActiveTkbConfig().version || "hiện hành";

  const bulletin = `📢 BẢN TIN TỔNG KẾT TUẦN ${weekNum} — LỚP 10A12 (K58-QT)
Kính gửi Quý Phụ huynh và các em học sinh, GVCN xin thông tin tình hình học tập & rèn luyện của lớp trong Tuần ${weekNum}:

1️⃣ Điểm thi đua trung bình lớp: ${avgScore}đ
2️⃣ Tình hình chuyên cần cả tuần:
   • Nghỉ có phép: ${excusedCount} lượt | Nghỉ không phép: ${unexcusedCount} lượt | Đi trễ: ${lateCount} lượt.
3️⃣ Tuyên dương học sinh tích cực tuần:
   • ${topList.length > 0 ? topList.join(", ") : "Tập thể lớp duy trì tốt nề nếp học tập."}
4️⃣ Nhắc nhở tuần tới:
   • Thực hiện đúng Thời khóa biểu ${tkbVer}.
   • Các tổ trực nhật có mặt trước 06:30 sáng và 13:30 chiều để vệ sinh phòng học.

👉 Quý Phụ huynh tra cứu chi tiết chuyên cần, điểm rèn luyện, quỹ lớp và gửi đơn xin nghỉ phép trực tuyến cho con tại:
${lookupUrl}

Trân trọng!
GVCN: ThS. Trần Dương Quốc Mẫn.`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(bulletin).then(() => {
      alert(`Đã sao chép Bản tin tổng kết Tuần ${weekNum} vào bộ nhớ tạm! Thầy chỉ cần mở nhóm Zalo Phụ huynh và bấm Dán (Paste) để gửi.`);
    }).catch(() => {
      prompt("Sao chép bản tin gửi nhóm Zalo Phụ huynh:", bulletin);
    });
  } else {
    prompt("Sao chép bản tin gửi nhóm Zalo Phụ huynh:", bulletin);
  }
}

function renderProfileCorrectionsInbox() {
  const tabTamTu = document.getElementById("tab-tam-tu");
  if (!tabTamTu) return;

  let box = document.getElementById("profileCorrectionsInboxBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "profileCorrectionsInboxBox";
    box.className = "p-4 sm:p-5 rounded-3xl bg-white border border-amber-200 shadow-xs space-y-3 mb-5";
    const leaveBox = document.getElementById("parentLeaveRequestsInboxBox");
    if (leaveBox && leaveBox.nextSibling) {
      tabTamTu.insertBefore(box, leaveBox.nextSibling);
    } else {
      tabTamTu.insertBefore(box, tabTamTu.firstChild);
    }
  }

  const fromState = Array.isArray(appState.profileCorrections) ? appState.profileCorrections : [];
  const fromLocal = safeJsonParse(localStorage.getItem("10A12_PROFILE_CORRECTIONS"), []);
  const list = [...fromState];
  fromLocal.forEach(item => {
    if (item && item.id && !list.some(x => x.id === item.id)) list.push(item);
  });
  appState.profileCorrections = list;

  box.innerHTML = `
    <div class="flex items-center justify-between pb-2 border-b border-slate-100">
      <h3 class="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
        <i class="fa-solid fa-user-pen text-amber-600"></i>
        Yêu Cầu Đính Chính Thông Tin Hồ Sơ Từ Phụ Huynh (${list.length})
      </h3>
    </div>
    ${list.length === 0 ? `
      <p class="text-xs text-slate-400 italic py-2">Chưa có yêu cầu chỉnh sửa thông tin CCCD / SĐT / Địa chỉ nào từ phụ huynh.</p>
    ` : `
      <div class="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
        ${list.map(c => `
          <div class="p-3 rounded-2xl bg-amber-50/40 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <b class="text-slate-900">${escapeHtml(c.studentName)}</b> <span class="text-slate-500">(${escapeHtml(c.studentId || "")} • ${escapeHtml(c.time || "")})</span>
              <p class="text-slate-800 mt-0.5">Nội dung đề nghị sửa: <b>${escapeHtml(c.detail)}</b></p>
            </div>
            <button type="button" onclick="markProfileCorrectionHandled('${escapeAttr(c.id)}')" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 self-start sm:self-center">
              ✓ Đã cập nhật xong
            </button>
          </div>
        `).join("")}
      </div>
    `}
  `;
}

async function markProfileCorrectionHandled(corrId) {
  if (appState.roleLevel !== "GVCN") return;
  appState.profileCorrections = (appState.profileCorrections || []).filter(x => x.id !== corrId);
  localStorage.setItem("10A12_PROFILE_CORRECTIONS", JSON.stringify(appState.profileCorrections));
  saveStateToLocal();
  renderProfileCorrectionsInbox();
}

function renderCloudScriptUrlSettingCard() {
  const tabSettings = document.getElementById("tab-cai-dat");
  if (!tabSettings) return;

  let card = document.getElementById("cloudScriptConnectionCard");
  if (!card) {
    card = document.createElement("div");
    card.id = "cloudScriptConnectionCard";
    card.className = "p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 mb-4";
    const weekCard = document.getElementById("schoolYearStartSettingCard");
    if (weekCard && weekCard.nextSibling) {
      tabSettings.insertBefore(card, weekCard.nextSibling);
    } else {
      tabSettings.insertBefore(card, tabSettings.firstChild);
    }
  }

  const curUrl = localStorage.getItem("10A12_SCRIPT_URL") || GAS_API_URL;
  card.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
      <div>
        <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-cloud text-sky-600"></i>
          Liên Kết Google Sheets & Xuất Bản Tin Tuần Zalo
        </h3>
        <p class="text-[11px] text-slate-500">Cấu hình Web App URL Google Apps Script và tạo bản tin tổng kết tuần gửi nhóm Zalo Phụ huynh</p>
      </div>
      <button type="button" onclick="copyWeeklyZaloSummaryBulletin()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto">
        <i class="fa-solid fa-share-from-square"></i> Copy Bản Tin Tuần Zalo
      </button>
    </div>

    <div class="flex flex-col sm:flex-row gap-2 text-xs">
      <input type="url" id="settingsCloudScriptUrlInput" value="${escapeAttr(curUrl)}" placeholder="https://script.google.com/macros/s/.../exec"
        class="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-800 focus:outline-none focus:border-sky-600">
      <button type="button" onclick="saveNewCloudScriptUrl()" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black shrink-0">
        Lưu Link Sheet
      </button>
    </div>
  `;
}

function saveNewCloudScriptUrl() {
  if (appState.roleLevel !== "GVCN") return;
  const inp = document.getElementById("settingsCloudScriptUrlInput");
  if (!inp || !inp.value.trim()) return;
  localStorage.setItem("10A12_SCRIPT_URL", inp.value.trim());
  alert("Đã lưu đường dẫn Google Apps Script mới! Trang sẽ tải lại để kết nối.");
  location.reload();
}

const PUBLIC_API_ACTIONS = new Set(["loginUser", "lookupStudent", "getPublicFundStatement"]);

async function callApi(action, data = {}, method = "POST") {
  try {
    const payload = PUBLIC_API_ACTIONS.has(action)
      ? { action, ...data }
      : { action, authToken: appState.authToken || "", ...data };

    let resJson;
    if (method === "GET") {
      const query = new URLSearchParams(payload).toString();
      const res = await fetch(`${GAS_API_URL}?${query}`, { redirect: "follow" });
      resJson = await res.json();
    } else {
      const res = await fetch(GAS_API_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      resJson = await res.json();
    }

    if (resJson && resJson.status === "unauthorized" && action !== "loginUser") {
      appState.authToken = "";
      localStorage.removeItem("10A12_AUTH_TOKEN");
      appState.currentUser = null;
      localStorage.removeItem("10A12_SESSION_USER");
      const authScreen = document.getElementById("authScreen");
      if (authScreen) authScreen.classList.remove("hidden");
      const errBox = document.getElementById("loginErrorMsg");
      if (errBox) {
        errBox.innerText = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!";
        errBox.classList.remove("hidden");
      }
    }
    return resJson;
  } catch (err) {
    console.warn(`[Offline Mode] API ${action}:`, err);
    return { status: "offline", message: "Đang lưu trữ ngoại tuyến." };
  }
}

async function syncWithCloud() {
  if (!appState.currentUser || !appState.authToken) return null;
  const res = await callApi("getInitialData", {}, "GET");
  if (res && res.status === "success") {
    if (Array.isArray(res.students) && res.students.length > 0) {
      appState.students = res.students;
    } else if (appState.roleLevel === "GVCN" && appState.students.length > 0 && !appState._autoSeededRosterOnce) {
      appState._autoSeededRosterOnce = true;
      callApi("saveAllStudentsBatch", { students: appState.students }, "POST");
    }
    if (Array.isArray(res.violations)) appState.violations = res.violations;
    if (Array.isArray(res.campaigns) && res.campaigns.length > 0) appState.campaigns = res.campaigns;
    if (Array.isArray(res.fundPayments)) appState.fundPayments = res.fundPayments;
    if (Array.isArray(res.cashbook)) appState.cashbook = res.cashbook;
    if (Array.isArray(res.auditLogs)) appState.auditLogs = res.auditLogs;
    if (Array.isArray(res.deletedStudents)) appState.deletedStudents = res.deletedStudents;
    if (res.config && res.config.deletedStudentsJson) {
      const parsedDel = safeJsonParse(res.config.deletedStudentsJson, null);
      if (Array.isArray(parsedDel)) appState.deletedStudents = parsedDel;
    }
    if (Array.isArray(res.letters)) appState.letters = res.letters;
    if (Array.isArray(res.leaveRequests)) {
      const localLeaves = safeJsonParse(localStorage.getItem("10A12_LEAVE_REQUESTS"), []);
      const merged = [...res.leaveRequests];
      localLeaves.forEach(ll => {
        if (!merged.some(m => m.id === ll.id)) merged.push(ll);
      });
      appState.leaveRequests = merged;
    }
    if (Array.isArray(res.periodLogs)) appState.periodLogs = res.periodLogs;
    if (res.attendanceRecords && typeof res.attendanceRecords === "object") appState.attendanceRecords = res.attendanceRecords;
    if (res.dutyAssignments && typeof res.dutyAssignments === "object") appState.dutyAssignments = res.dutyAssignments;
    if (Array.isArray(res.volunteerLaborList)) appState.volunteerLaborList = res.volunteerLaborList;
    if (Array.isArray(res.vtmEvents)) appState.vtmEvents = res.vtmEvents;
    if (Array.isArray(res.classMedia)) appState.classMedia = res.classMedia;
    if (res.weeklyArchives && typeof res.weeklyArchives === "object") appState.weeklyArchives = res.weeklyArchives;

    if (res.rolloverInfo && res.rolloverInfo.rolledOver) {
      const cw = Number(res.rolloverInfo.currentWeek) || getAutoSchoolWeek();
      localStorage.setItem("10A12_LAST_ACTIVE_WEEK", String(cw));
      appState.lastAutoRolloverWeek = cw;
      appState.selectedWeek = cw;
      if (res.rolloverInfo.rolledOverAt) appState.lastAutoRolloverAt = String(res.rolloverInfo.rolledOverAt);
    }

    if (res.config && typeof res.config === "object") {
      if (res.config.allowStudentLeaderEdit !== undefined) {
        appState.allowStudentLeaderEdit = (res.config.allowStudentLeaderEdit === true || String(res.config.allowStudentLeaderEdit).toLowerCase() === "true");
      }
      if (res.config.customTicker !== undefined) appState.customTicker = String(res.config.customTicker || "");
      if (res.config.specialViolationReportsJson) {
        const parsedReports = safeJsonParse(res.config.specialViolationReportsJson, null);
        if (Array.isArray(parsedReports)) appState.specialViolationReports = parsedReports;
      }
      if (Array.isArray(res.profileCorrections)) {
        const localCorr = safeJsonParse(localStorage.getItem("10A12_PROFILE_CORRECTIONS"), []);
        const mergedCorr = [...res.profileCorrections];
        localCorr.forEach(lc => { if (!mergedCorr.some(mc => mc.id === lc.id)) mergedCorr.push(lc); });
        appState.profileCorrections = mergedCorr;
      }
      if (res.config.schoolYearStartDate) {
        const normIso = (() => {
          const m = normalizeDateToMonday(res.config.schoolYearStartDate);
          return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
        })();
        localStorage.setItem("10A12_SCHOOL_START_DATE", normIso);
        SCHOOL_YEAR_START_MONDAY = getSchoolYearStartMonday();
      }
      if (res.config.tkbCustomImage) appState.tkbCustomImage = String(res.config.tkbCustomImage);
      if (res.config.tkbUpdatedAt) appState.tkbUpdatedAt = String(res.config.tkbUpdatedAt);
      if (res.config.tkbConfigJson) {
        const parsedTkb = safeJsonParse(res.config.tkbConfigJson, null);
        if (parsedTkb) {
          appState.tkbConfig = normalizeTkbConfig(parsedTkb);
          if (appState.tkbCustomImage && String(appState.tkbCustomImage).startsWith("data:image")) {
            appState.tkbConfig.imageBase64 = String(appState.tkbCustomImage);
          }
        }
      } else if (res.config.tkbVersionLabel || res.config.tkbEffectiveDate) {
        const curTkb = getActiveTkbConfig();
        if (res.config.tkbVersionLabel) curTkb.versionLabel = String(res.config.tkbVersionLabel);
        if (res.config.tkbEffectiveDate) curTkb.effectiveDate = String(res.config.tkbEffectiveDate);
        curTkb.version = curTkb.effectiveDate ? `${curTkb.versionLabel} (Từ ${curTkb.effectiveDate})` : curTkb.versionLabel;
      }
      if (res.config.tkbCustomImage && String(res.config.tkbCustomImage).startsWith("data:image")) {
        getActiveTkbConfig().imageBase64 = String(res.config.tkbCustomImage);
      }
      if (res.config.lastAutoRolloverAt) appState.lastAutoRolloverAt = String(res.config.lastAutoRolloverAt);
      if (res.config.lastAutoRolloverWeek) {
        const lw = parseInt(res.config.lastAutoRolloverWeek, 10);
        if (lw > 0) {
          appState.lastAutoRolloverWeek = lw;
          localStorage.setItem("10A12_LAST_ACTIVE_WEEK", String(lw));
        }
      }
      if (res.config.mondayRolloverTriggerActive !== undefined) {
        appState.mondayRolloverTriggerActive = (res.config.mondayRolloverTriggerActive === true || String(res.config.mondayRolloverTriggerActive).toUpperCase() === "TRUE");
      }
      if (Array.isArray(res.config.criteriaList) && res.config.criteriaList.length > 0) {
        appState.criteriaList = res.config.criteriaList;
      }
    }

    if (Array.isArray(res.seatingRows) && res.seatingRows.length > 0 && typeof applyCloudSeatingRows === "function") {
      applyCloudSeatingRows(res.seatingRows);
    }

    if (typeof recalculateFundSummary === "function") recalculateFundSummary();
    buildAutoWeekDropdown();
    applyRolePermissions();
    saveStateToLocal();
    renderAllSections();
  }
  return res;
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
  if (tabId === "tab-bien-ban") {
    if (typeof renderOfficialShlReportTab === "function") renderOfficialShlReportTab();
    renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
  }
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
  updateWeeklyRolloverUI();
  upgradePortalButtonUI();
  applyDisciplineEnhancements();
  renderDeletedStudentsArchiveSection();
  bindDeleteStudentReasonInterceptor();
  renderSchoolYearStartSettingCard();
  renderParentLeaveRequestsInbox();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
  if (appState.currentUser && appState.currentUser.studentId && typeof renderStudentPortal === "function") renderStudentPortal();
}

// Khởi chạy hệ thống khi nạp trang
document.addEventListener("DOMContentLoaded", () => {
  initAuthSession();
  checkAndPerformClientMondayRollover({ skipCloudSync: true });
  buildAutoWeekDropdown();
  syncAttendanceSessionOnLoad();
  renderAllSections();
  updateCelebrationTicker();
  updateLiveDashboardEngine();
  updateWeeklyRolloverUI();
  upgradePortalButtonUI();
  applyDisciplineEnhancements();
  renderDeletedStudentsArchiveSection();
  bindDeleteStudentReasonInterceptor();
  renderSchoolYearStartSettingCard();
  renderParentLeaveRequestsInbox();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
  setInterval(() => {
    checkAndPerformClientMondayRollover();
    updateCelebrationTicker();
    updateWeeklyRolloverUI();
  upgradePortalButtonUI();
  applyDisciplineEnhancements();
  renderDeletedStudentsArchiveSection();
  bindDeleteStudentReasonInterceptor();
  renderSchoolYearStartSettingCard();
  renderParentLeaveRequestsInbox();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
  }, 60000);
  setInterval(updateLiveDashboardEngine, 1000);
  if (appState.currentUser && appState.authToken) {
    syncWithCloud();
  }
});
// Ghi đè an toàn hàm xóa học sinh nếu được gọi từ module danh sách học sinh
window.addEventListener("load", () => {
  bindDeleteStudentReasonInterceptor();
  renderSchoolYearStartSettingCard();
  renderParentLeaveRequestsInbox();
  renderSpecialViolationReportsSection();
  renderYearEndConductGradingPanel();
  renderProfileCorrectionsInbox();
  renderCloudScriptUrlSettingCard();
  renderDeletedStudentsArchiveSection();
  if (typeof window.deleteStudent === "function" && !window.deleteStudent._wrappedWithReason) {
    const wrapped = function(studentId) {
      openDeleteStudentReasonModal(studentId);
    };
    wrapped._wrappedWithReason = true;
    window.deleteStudent = wrapped;
  }
  if (typeof window.deleteCurrentStudent === "function" && !window.deleteCurrentStudent._wrappedWithReason) {
    const wrappedCur = function(studentId) {
      openDeleteStudentReasonModal(studentId);
    };
    wrappedCur._wrappedWithReason = true;
    window.deleteCurrentStudent = wrappedCur;
  }
});
