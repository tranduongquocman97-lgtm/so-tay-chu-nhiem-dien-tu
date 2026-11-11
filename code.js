/**
 * ============================================================================
 * SỔ TAY CHỦ NHIỆM ĐIỆN TỬ 10A12 (K58-QT) - GOOGLE APPS SCRIPT BACKEND
 * Tác giả: GVCN ThS. Trần Dương Quốc Mẫn
 * Phiên bản: 8.0 (Xác thực phiên Token, Phân quyền RBAC, Đồng bộ toàn diện)
 * ============================================================================
 */

const SHEET_NAMES = {
  DANH_SACH: "DanhSach",
  NHAT_KY: "NhatKy",
  DIEM_DANH: "DiemDanh",
  SO_DAU_BAI: "SoDauBai",
  CAC_KY_THU: "CacKyThu",
  THU_QUY_CHI_TIET: "ThuQuyChiTiet",
  SO_QUY: "SoQuy",
  LICH_SU_THU_CHI: "LichSuThuChi",
  SO_DO_LOP: "SoDoLop",
  CAU_HINH: "CauHinh",
  TAM_TU: "TamTu",
  TRUC_NHAT: "TrucNhat",
  VTM_MEDIA: "VTM_Media",
  LICH_SU_TUAN: "LichSuTuan"
};

const SESSION_TTL_SECONDS = 21600; // 6 giờ

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(25000);
  if (!hasLock) {
    return jsonResponse({ status: "error", message: "Hệ thống đang bận xử lý đồng thời. Vui lòng thử lại sau vài giây." });
  }

  try {
    const params = (e && e.parameter) ? e.parameter : {};
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      try { postData = JSON.parse(e.postData.contents); } catch (err) { postData = {}; }
    }

    const action = params.action || postData.action;
    const authToken = params.authToken || postData.authToken || "";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    ensureSystemSchema(ss);

    // 1. Các endpoint công khai (không cần token đăng nhập)
    if (action === "loginUser") {
      return jsonResponse(loginUser(ss, postData));
    }
    if (action === "lookupStudent") {
      return jsonResponse(lookupStudent(ss, params.code || postData.code));
    }
    if (action === "getPublicFundStatement") {
      return jsonResponse(getPublicFundStatement(ss));
    }

    // 2. Xác thực token cho mọi thao tác nội bộ
    const session = verifySessionToken(authToken);
    if (!session) {
      return jsonResponse({ status: "unauthorized", message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." });
    }

    let result = { status: "error", message: "Action không hợp lệ: " + action };
    const role = session.roleLevel;
    const isGVCN = (role === "GVCN");
    const isLeader = (role === "LEADER");
    const isTreasurer = (role === "TREASURER");
    const isLabor = (role === "LABOR");
    const isVtm = (role === "VTM");
    const isCaptain = String(session.role || "").toLowerCase().indexOf("lớp trưởng") !== -1;

    switch (action) {
      // Đồng bộ dữ liệu khởi tạo (lọc theo quyền)
      case "getInitialData":
        result = getInitialData(ss, session);
        break;

      // Chuyên cần & Nề nếp thi đua
      case "saveAttendance":
        if (!isGVCN && !isLeader) return jsonResponse(forbiddenResult());
        if (isLeader && !isStudentLeaderEditAllowed(ss)) return jsonResponse(lockedByGvcnResult());
        result = saveAttendance(ss, postData, session);
        break;

      case "saveAttendanceBatch":
        if (!isGVCN && !isLeader) return jsonResponse(forbiddenResult());
        if (isLeader && !isStudentLeaderEditAllowed(ss)) return jsonResponse(lockedByGvcnResult());
        result = saveAttendanceBatch(ss, postData, session);
        break;

      case "recordViolation":
        if (!isGVCN && !isLeader && !isLabor) return jsonResponse(forbiddenResult());
        if (isLeader && !isStudentLeaderEditAllowed(ss)) return jsonResponse(lockedByGvcnResult());
        result = recordViolation(ss, postData, session);
        break;

      case "deleteViolation":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền xóa bản ghi nề nếp."));
        result = deleteViolation(ss, postData);
        break;

      case "approveLeaveSupplement":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền duyệt phép bổ sung."));
        result = approveLeaveSupplement(ss, postData);
        break;

      // Sơ đồ lớp & Sổ đầu bài
      case "saveSeatingChart":
        if (!isGVCN && !isCaptain) return jsonResponse(forbiddenResult("Chỉ GVCN và Lớp trưởng mới có quyền lưu sơ đồ lớp."));
        result = saveSeatingChart(ss, postData);
        break;

      case "rotateSeatingChart":
        if (!isGVCN && !isCaptain) return jsonResponse(forbiddenResult("Chỉ GVCN và Lớp trưởng mới có quyền xoay dãy."));
        result = rotateSeatingChart(ss);
        break;

      case "saveClassSessionLog":
        if (!isGVCN && !isLeader) return jsonResponse(forbiddenResult());
        if (isLeader && !isStudentLeaderEditAllowed(ss)) return jsonResponse(lockedByGvcnResult());
        result = saveClassSessionLog(ss, postData, session);
        break;

      // Lao động & Trực nhật & VTM
      case "saveLaborInspection":
        if (!isGVCN && !isLabor) return jsonResponse(forbiddenResult());
        result = saveLaborInspection(ss, postData);
        break;

      case "updateLaborPunishmentStatus":
        if (!isGVCN && !isLabor) return jsonResponse(forbiddenResult());
        result = updateLaborPunishmentStatus(ss, postData);
        break;

      case "recordDeskSanitationViolation":
        if (!isGVCN && !isLabor) return jsonResponse(forbiddenResult());
        result = recordDeskSanitationViolation(ss, postData);
        break;

      case "saveDutyState":
        if (!isGVCN && !isLabor) return jsonResponse(forbiddenResult());
        result = saveDutyState(ss, postData);
        break;

      case "saveVtmMediaState":
        if (!isGVCN && !isVtm) return jsonResponse(forbiddenResult());
        result = saveVtmMediaState(ss, postData);
        break;

      // Quản lý Quỹ lớp & Nhật ký kiểm toán
      case "createFundCampaign":
        if (!isGVCN && !isTreasurer) return jsonResponse(forbiddenResult());
        result = createFundCampaign(ss, postData, session);
        break;

      case "deleteFundCampaign":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền xóa đợt thu quỹ."));
        result = deleteFundCampaign(ss, postData, session);
        break;

      case "saveFundPaymentBatch":
        if (!isGVCN && !isTreasurer) return jsonResponse(forbiddenResult());
        result = saveFundPaymentBatch(ss, postData, session);
        break;

      case "saveFundExpense":
      case "saveFundTransaction":
        if (!isGVCN && !isTreasurer) return jsonResponse(forbiddenResult());
        result = saveFundExpense(ss, postData, session);
        break;

      case "approveFundExpense":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền duyệt chi quỹ lớp."));
        result = approveFundExpense(ss, postData, session);
        break;

      case "deleteFundTransaction":
        if (!isGVCN && !isTreasurer) return jsonResponse(forbiddenResult());
        result = deleteFundTransaction(ss, postData, session);
        break;

      case "getFundAuditLogs":
        if (!isGVCN && !isTreasurer) return jsonResponse(forbiddenResult());
        result = getFundAuditLogs(ss);
        break;

      // Hòm thư "Điều em muốn nói"
      case "sendStudentLetter":
        if (!session.studentId && !isGVCN) return jsonResponse(forbiddenResult());
        result = sendStudentLetter(ss, postData, session);
        break;

      case "updateLetterStatus":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền phản hồi hòm thư tâm tư."));
        result = updateLetterStatus(ss, postData);
        break;

      // Quản trị học sinh & Excel
      case "addNewStudent":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền thêm học sinh."));
        result = addNewStudent(ss, postData);
        break;

      case "updateStudentProfile":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền cập nhật hồ sơ học sinh."));
        result = updateStudentProfile(ss, postData);
        break;

      case "deleteStudent":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền xóa học sinh."));
        result = deleteStudent(ss, postData);
        break;

      case "saveAllStudentsBatch":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền nhập danh sách hàng loạt."));
        result = saveAllStudentsBatch(ss, postData);
        break;

      // Cấu hình, Chốt sổ tuần & Tiện ích
      case "saveConfig":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền thay đổi cấu hình."));
        result = saveConfig(ss, postData);
        break;

      case "changeGvcnPassword":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền đổi mật khẩu quản trị."));
        result = changeGvcnPassword(ss, postData);
        break;

      case "resetWeeklyScores":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền reset điểm tuần mới."));
        result = resetWeeklyScores(ss);
        break;

      case "saveWeeklyArchive":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền chốt sổ lưu trữ tuần."));
        result = saveWeeklyArchive(ss, postData, session);
        break;

      case "setupWeeklyMondayRolloverTrigger":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền cài đặt lịch tự động tuần mới."));
        result = setupWeeklyMondayRolloverTrigger(ss);
        break;

      case "triggerWeeklyRolloverNow":
        if (!isGVCN) return jsonResponse(forbiddenResult("Chỉ GVCN mới có quyền kích hoạt chốt & khởi tạo tuần mới."));
        result = checkAndAutoRolloverMonday0AM(ss, new Date(), true);
        break;

      default:
        result = { status: "error", message: "Chưa định nghĩa handler: " + action };
    }

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function forbiddenResult(msg) {
  return { status: "error", message: msg || "Tài khoản của bạn không có quyền thực hiện thao tác này." };
}

function lockedByGvcnResult() {
  return { status: "error", message: "GVCN hiện đang khóa quyền ghi nhận nề nếp của Ban cán sự." };
}

// ============================================================================
// I. KHỞI TẠO & BẢO TRÌ CẤU TRÚC SHEETS TỰ ĐỘNG
// ============================================================================
function ensureSystemSchema(ss) {
  const schemas = [
    {
      name: SHEET_NAMES.DANH_SACH,
      headers: [
        "id", "hoTen", "to", "chucVu", "ngaySinh", "soCCCD", "ngayCapCCCD",
        "noiCapCCCD", "laDoanVien", "ngayVaoDoan", "diaChi", "tenBa",
        "ngheNghiepBa", "sdtBa", "tenMe", "ngheNghiepMe", "sdtMe",
        "taiKhoan", "matKhau", "diemThiDua"
      ]
    },
    {
      name: SHEET_NAMES.NHAT_KY,
      headers: ["Thời Gian", "Mã HS", "Họ Tên", "Nội Dung", "Điểm", "Ghi Chú", "Người Ghi", "IncidentKey", "Tuần", "Ngày"]
    },
    {
      name: SHEET_NAMES.DIEM_DANH,
      headers: ["Thời Gian", "Ca Học", "Mã HS", "Họ Tên", "Trạng Thái", "Lý Do", "Người Ghi", "IncidentKey", "Tuần", "Ngày"]
    },
    {
      name: SHEET_NAMES.CAC_KY_THU,
      headers: ["Mã Đợt", "Tên Đợt Thu", "Định Mức", "Ngày Tạo", "Trạng Thái", "Ghi Chú"]
    },
    {
      name: SHEET_NAMES.THU_QUY_CHI_TIET,
      headers: ["Mã Đợt", "Mã HS", "Họ Tên", "Số Tiền Nộp", "Đã Nộp", "Ngày Nộp", "Ghi Chú"]
    },
    {
      name: SHEET_NAMES.SO_QUY,
      headers: ["Mã GD", "Thời Gian", "Loại", "Khoản Mục", "Số Tiền", "Người Thực Hiện", "Nội Dung", "Trạng Thái", "Chứng Từ"]
    },
    {
      name: SHEET_NAMES.LICH_SU_THU_CHI,
      headers: ["Thời Gian", "Mã GD", "Hành Động", "Loại", "Khoản Mục", "Số Tiền", "Người Thao Tác", "Lý Do / Chi Tiết"]
    },
    {
      name: SHEET_NAMES.SO_DAU_BAI,
      headers: ["Ngày_Buổi", "Tiết", "Môn Học", "Giáo Viên", "Tên Bài Dạy", "Xếp Loại", "HS Tuyên Dương", "HS Vi Phạm", "Nhận Xét", "Người Ghi"]
    },
    {
      name: SHEET_NAMES.SO_DO_LOP,
      headers: ["Dãy", "Bàn", "Vị Trí (Trái/Phải)", "Mã HS", "Họ Tên", "Ghi Chú"]
    },
    {
      name: SHEET_NAMES.TAM_TU,
      headers: ["Mã Thư", "Thời Gian", "Người Gửi", "Mã HS", "Chủ Đề", "Tiêu Đề", "Nội Dung", "Trạng Thái", "Phản Hồi GVCN"]
    },
    {
      name: SHEET_NAMES.TRUC_NHAT,
      headers: ["Key", "Loại", "Dữ Liệu JSON", "Cập Nhật"]
    },
    {
      name: SHEET_NAMES.VTM_MEDIA,
      headers: ["Key", "Loại", "Dữ Liệu JSON", "Cập Nhật"]
    },
    {
      name: SHEET_NAMES.LICH_SU_TUAN,
      headers: ["Tuần", "Thời Gian Chốt", "Người Chốt", "Điểm TB", "Snapshot JSON"]
    },
    {
      name: SHEET_NAMES.CAU_HINH,
      headers: ["Khóa", "Giá Trị", "Mô Tả"],
      initRows: [
        ["allowStudentLeaderEdit", "TRUE", "Công tắc cho phép Ban cán sự ghi nề nếp"],
        ["currentAcademicWeek", "Tuần 1", "Tuần học hiện tại"],
        ["showPointsToParents", "TRUE", "Hiển thị điểm thi đua lên cổng tra cứu"]
      ]
    }
  ];

  schemas.forEach(item => {
    let sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
      sheet.appendRow(item.headers);
      if (item.initRows) item.initRows.forEach(r => sheet.appendRow(r));
    } else {
      ensureSheetHeaders(sheet, item.headers);
    }
  });
}

function ensureSheetHeaders(sheet, requiredHeaders) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    sheet.appendRow(requiredHeaders);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  requiredHeaders.forEach(h => {
    if (existing.indexOf(h) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      existing.push(h);
    }
  });
}

function getHeaderMap(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return {};
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  const aliasGroups = {
    id: ["id", "mahs", "mahocsinh", "studentid"],
    hoTen: ["hoten", "hovaten", "fullname", "name", "tenhocsinh"],
    to: ["to", "tohoc", "nhom", "team"],
    chucVu: ["chucvu", "vaitro", "role"],
    ngaySinh: ["ngaysinh", "dob", "birthday"],
    soCCCD: ["socccd", "cccd", "cmnd"],
    ngayCapCCCD: ["ngaycapcccd", "ngaycap"],
    noiCapCCCD: ["noicapcccd", "noicap"],
    laDoanVien: ["ladoanvien", "doanvien"],
    ngayVaoDoan: ["ngayvaodoan"],
    diaChi: ["diachi", "address", "noio"],
    tenBa: ["tenba", "hotenba", "hotencha"],
    ngheNghiepBa: ["nghenghiepba", "ngheba"],
    sdtBa: ["sdtba", "dienthoaiba"],
    tenMe: ["tenme", "hotenme"],
    ngheNghiepMe: ["nghenghiepme", "ngheme"],
    sdtMe: ["sdtme", "dienthoaime"],
    taiKhoan: ["taikhoan", "tendangnhap", "username", "account"],
    matKhau: ["matkhau", "password", "pass"],
    diemThiDua: ["diemthidua", "diemrenluyen", "diem"],
    "Tuần": ["tuan", "week"],
    "Ngày": ["ngay", "date"]
  };
  const reverseAlias = {};
  for (const canonical in aliasGroups) {
    aliasGroups[canonical].forEach(a => { reverseAlias[a] = canonical; });
  }
  headers.forEach((h, idx) => {
    const raw = String(h).trim();
    if (!raw) return;
    if (map[raw] === undefined) map[raw] = idx;
    const norm = removeVietnameseTones(raw);
    const canonical = reverseAlias[norm];
    if (canonical && map[canonical] === undefined) map[canonical] = idx;
  });
  return map;
}

// ============================================================================
// II. TIỆN ÍCH CHUẨN HÓA & XÁC THỰC PHIÊN
// ============================================================================
function parseScore(val, fallback) {
  const defaultVal = (fallback === undefined) ? 100 : fallback;
  if (val === "" || val === null || val === undefined) return defaultVal;
  const n = Number(val);
  return isNaN(n) ? defaultVal : n;
}

function parseSheetBool(val) {
  if (val === true) return true;
  if (val === false || val === null || val === undefined) return false;
  return String(val).trim().toUpperCase() === "TRUE";
}

function removeVietnameseTones(str) {
  if (!str) return "";
  let s = String(str);
  if (typeof s.normalize === "function") {
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  s = s.toLowerCase();
  s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  s = s.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  s = s.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  s = s.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  s = s.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  s = s.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  s = s.replace(/đ/g, "d");
  s = s.replace(/[^a-z0-9]/g, "");
  return s.trim();
}

function maskCCCD(cccd) {
  const s = String(cccd || "").trim();
  if (!s) return "";
  if (s.length <= 6) return "*".repeat(s.length);
  return s.slice(0, 6) + "*".repeat(s.length - 6);
}

function deriveRoleLevel(chucVu) {
  const cv = String(chucVu || "").toLowerCase();
  if (cv.indexOf("lớp trưởng") !== -1 || cv.indexOf("lớp phó học tập") !== -1 || cv.indexOf("bí thư") !== -1) return "LEADER";
  if (cv.indexOf("thủ quỹ") !== -1) return "TREASURER";
  if (cv.indexOf("lao động") !== -1) return "LABOR";
  if (cv.indexOf("văn thể mỹ") !== -1 || cv.indexOf("vtm") !== -1) return "VTM";
  if (cv.indexOf("tổ trưởng") !== -1 || cv.indexOf("cờ đỏ") !== -1 || cv.indexOf("thi đua") !== -1) return "LEADER";
  return "STUDENT";
}

function getGvcnPassword() {
  const prop = PropertiesService.getScriptProperties().getProperty("GVCN_PASSWORD");
  return prop ? String(prop) : "123456";
}

function createSessionToken(sessionObj) {
  const token = Utilities.getUuid() + "_" + Date.now();
  CacheService.getScriptCache().put("TOKEN_" + token, JSON.stringify(sessionObj), SESSION_TTL_SECONDS);
  return token;
}

function verifySessionToken(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get("TOKEN_" + String(token).trim());
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (err) { return null; }
}

function getConfigMap(ss) {
  const sheetCH = ss.getSheetByName(SHEET_NAMES.CAU_HINH);
  const config = {};
  if (!sheetCH) return config;
  const dataCH = sheetCH.getDataRange().getValues();
  const rawMap = {};
  for (let i = 1; i < dataCH.length; i++) {
    if (dataCH[i][0]) rawMap[String(dataCH[i][0]).trim()] = dataCH[i][1];
  }
  for (const key in rawMap) {
    if (key.indexOf("__chunks") !== -1 || /__chunk_\d+$/.test(key)) continue;
    const val = rawMap[key];
    if (typeof val === "string" && val.indexOf("__CHUNKED__:") === 0) {
      const count = parseInt(val.split(":")[1], 10) || parseInt(rawMap[key + "__chunks"] || "0", 10) || 0;
      let combined = "";
      for (let c = 0; c < count; c++) {
        combined += String(rawMap[key + "__chunk_" + c] || "");
      }
      config[key] = combined;
    } else {
      config[key] = val;
    }
  }
  return config;
}

function isStudentLeaderEditAllowed(ss) {
  const cfg = getConfigMap(ss);
  if (cfg.allowStudentLeaderEdit === undefined) return true;
  return parseSheetBool(cfg.allowStudentLeaderEdit);
}

function loginUser(ss, payload) {
  const rawInput = String(payload.username || "").trim();
  const cleanRawLower = rawInput.toLowerCase();
  const cleanNoDomain = removeVietnameseTones(cleanRawLower.replace(/\.k58qt$/i, ""));
  const cleanNormalizedRaw = removeVietnameseTones(cleanRawLower);
  const password = String(payload.password || "").trim();

  if (!cleanNoDomain || !password) {
    return { status: "error", errorCode: "MISSING_CREDENTIALS", message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu." };
  }

  // 1. GVCN
  if (cleanNoDomain === "gvcn") {
    if (password !== getGvcnPassword()) {
      return { status: "error", errorCode: "WRONG_PASSWORD", message: "Mật khẩu GVCN không chính xác!" };
    }
    const user = {
      username: "gvcn",
      fullName: "ThS. Trần Dương Quốc Mẫn",
      role: "GVCN & Phó Bí thư Đoàn trường",
      roleLevel: "GVCN"
    };
    const token = createSessionToken(user);
    return { status: "success", token, user };
  }

  // 2. Học sinh / Ban cán sự
  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  if (!sheetDS) return { status: "error", errorCode: "EMPTY_ROSTER", message: "Chưa khởi tạo danh sách học sinh." };
  const dataDS = sheetDS.getDataRange().getValues();
  if (dataDS.length <= 1) return { status: "error", errorCode: "EMPTY_ROSTER", message: "Danh sách lớp trên Google Sheets chưa có học sinh." };
  const hMap = getHeaderMap(sheetDS);
  const idIdx = hMap["id"] !== undefined ? hMap["id"] : 0;
  const hoTenIdx = hMap["hoTen"] !== undefined ? hMap["hoTen"] : 1;
  const toIdx = hMap["to"] !== undefined ? hMap["to"] : 2;
  const chucVuIdx = hMap["chucVu"] !== undefined ? hMap["chucVu"] : 3;
  const tkIdx = hMap["taiKhoan"];
  const mkIdx = hMap["matKhau"];

  let validStudentRows = 0;

  for (let i = 1; i < dataDS.length; i++) {
    const row = dataDS[i];
    const id = String(row[idIdx] || "").trim();
    const hoTen = String(row[hoTenIdx] || "").trim();
    if (!id && !hoTen) continue;
    validStudentRows++;

    const taiKhoan = String((tkIdx !== undefined ? row[tkIdx] : "") || "").trim().toLowerCase();
    const taiKhoanNorm = removeVietnameseTones(taiKhoan);
    const taiKhoanBase = removeVietnameseTones(taiKhoan.replace(/\.k58qt$/i, ""));
    const cleanName = removeVietnameseTones(hoTen);

    const matched =
      (taiKhoan && taiKhoan === cleanRawLower) ||
      (taiKhoanNorm && taiKhoanNorm === cleanNormalizedRaw) ||
      (taiKhoanBase && taiKhoanBase === cleanNoDomain) ||
      (cleanName && cleanName === cleanNoDomain) ||
      (id && id.toLowerCase() === cleanRawLower) ||
      (id && id.toLowerCase() === cleanNoDomain);

    if (matched) {
      const expectedPass = String((mkIdx !== undefined ? row[mkIdx] : "") || "123456").trim();
      if (password !== expectedPass) {
        return { status: "error", errorCode: "WRONG_PASSWORD", message: "Mật khẩu không chính xác! (Mật khẩu mặc định: 123456)" };
      }
      const chucVu = String(row[chucVuIdx] || "Thành viên");
      const roleLevel = deriveRoleLevel(chucVu);
      const user = {
        username: taiKhoan || cleanName,
        studentId: id || hoTen,
        fullName: hoTen,
        role: chucVu,
        roleLevel: roleLevel,
        team: String(row[toIdx] || "Tổ 1")
      };
      const token = createSessionToken(user);
      return { status: "success", token, user };
    }
  }

  if (validStudentRows === 0) {
    return { status: "error", errorCode: "EMPTY_ROSTER", message: "Bảng DanhSach trên Google Sheets chưa có dữ liệu học sinh." };
  }
  return { status: "error", errorCode: "NOT_FOUND", message: "Không tìm thấy tài khoản phù hợp." };
}

function changeGvcnPassword(ss, payload) {
  const oldPassword = String(payload.oldPassword || "").trim();
  const newPassword = String(payload.newPassword || "").trim();
  if (oldPassword !== getGvcnPassword()) {
    return { status: "error", message: "Mật khẩu hiện tại không đúng!" };
  }
  if (newPassword.length < 6) {
    return { status: "error", message: "Mật khẩu mới phải có ít nhất 6 ký tự!" };
  }
  PropertiesService.getScriptProperties().setProperty("GVCN_PASSWORD", newPassword);
  return { status: "success", message: "Đã cập nhật mật khẩu GVCN lên máy chủ." };
}

// ============================================================================
// III. TRUY XUẤT DỮ LIỆU BAN ĐẦU & TỔNG HỢP QUỸ
// ============================================================================
function getInitialData(ss, session) {
  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  if (!sheetDS) return { status: "error", message: "Chưa khởi tạo danh sách lớp." };

  let rolloverInfo = { rolledOver: false };
  try {
    rolloverInfo = checkAndAutoRolloverMonday0AM(ss, new Date(), false);
  } catch (err) {}

  const isGVCN = session && session.roleLevel === "GVCN";
  const selfId = session && session.studentId ? String(session.studentId).trim() : "";

  const dataDS = sheetDS.getDataRange().getValues();
  const hMap = getHeaderMap(sheetDS);
  const students = [];

  for (let i = 1; i < dataDS.length; i++) {
    const row = dataDS[i];
    const id = String((hMap["id"] !== undefined ? row[hMap["id"]] : row[0]) || "").trim();
    const hoTen = String((hMap["hoTen"] !== undefined ? row[hMap["hoTen"]] : row[1]) || "").trim();
    if (!id && !hoTen) continue;
    const canSeePii = isGVCN || (selfId && id === selfId);

    students.push({
      id: id || hoTen,
      hoTen: hoTen,
      to: String((hMap["to"] !== undefined ? row[hMap["to"]] : row[2]) || "Tổ 1"),
      chucVu: String((hMap["chucVu"] !== undefined ? row[hMap["chucVu"]] : row[3]) || "Thành viên"),
      ngaySinh: canSeePii && hMap["ngaySinh"] !== undefined && row[hMap["ngaySinh"]] ? formatDateValue(row[hMap["ngaySinh"]]) : "",
      soCCCD: canSeePii && hMap["soCCCD"] !== undefined && row[hMap["soCCCD"]] ? String(row[hMap["soCCCD"]]) : "",
      ngayCapCCCD: canSeePii && hMap["ngayCapCCCD"] !== undefined && row[hMap["ngayCapCCCD"]] ? formatDateValue(row[hMap["ngayCapCCCD"]]) : "",
      noiCapCCCD: canSeePii && hMap["noiCapCCCD"] !== undefined && row[hMap["noiCapCCCD"]] ? String(row[hMap["noiCapCCCD"]]) : "",
      laDoanVien: hMap["laDoanVien"] !== undefined ? (row[hMap["laDoanVien"]] === true || String(row[hMap["laDoanVien"]]).toLowerCase().indexOf("đoàn") !== -1) : false,
      ngayVaoDoan: canSeePii && hMap["ngayVaoDoan"] !== undefined && row[hMap["ngayVaoDoan"]] ? formatDateValue(row[hMap["ngayVaoDoan"]]) : "",
      diaChi: canSeePii && hMap["diaChi"] !== undefined ? String(row[hMap["diaChi"]] || "") : "",
      tenBa: canSeePii ? String((hMap["tenBa"] !== undefined ? row[hMap["tenBa"]] : (hMap["hoTenBa"] !== undefined ? row[hMap["hoTenBa"]] : "")) || "") : "",
      ngheNghiepBa: canSeePii && hMap["ngheNghiepBa"] !== undefined ? String(row[hMap["ngheNghiepBa"]] || "") : "",
      sdtBa: canSeePii && hMap["sdtBa"] !== undefined ? String(row[hMap["sdtBa"]] || "") : "",
      tenMe: canSeePii ? String((hMap["tenMe"] !== undefined ? row[hMap["tenMe"]] : (hMap["hoTenMe"] !== undefined ? row[hMap["hoTenMe"]] : "")) || "") : "",
      ngheNghiepMe: canSeePii && hMap["ngheNghiepMe"] !== undefined ? String(row[hMap["ngheNghiepMe"]] || "") : "",
      sdtMe: canSeePii && hMap["sdtMe"] !== undefined ? String(row[hMap["sdtMe"]] || "") : "",
      taiKhoan: String((hMap["taiKhoan"] !== undefined ? row[hMap["taiKhoan"]] : "") || id || hoTen),
      diemThiDua: parseScore(hMap["diemThiDua"] !== undefined ? row[hMap["diemThiDua"]] : 100, 100)
    });
  }

  // Nhật ký nề nếp
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  const nkMap = getHeaderMap(sheetNK);
  const dataNK = sheetNK.getDataRange().getValues();
  const violations = [];
  for (let i = 1; i < dataNK.length; i++) {
    if (!dataNK[i][0]) continue;
    const weekVal = nkMap["Tuần"] !== undefined ? Number(dataNK[i][nkMap["Tuần"]]) : 0;
    const dateVal = nkMap["Ngày"] !== undefined ? String(dataNK[i][nkMap["Ngày"]] || "") : "";
    violations.push({
      rowId: i + 1,
      time: String(dataNK[i][0]),
      studentId: String(dataNK[i][1]),
      studentName: String(dataNK[i][2]),
      criteria: String(dataNK[i][3]),
      points: parseScore(dataNK[i][4], 0),
      note: String(dataNK[i][5] || ""),
      sender: String(dataNK[i][6] || ""),
      incidentKey: String(dataNK[i][7] || ""),
      week: weekVal || 0,
      date: dateVal
    });
  }

  // Điểm danh
  const sheetDD = ss.getSheetByName(SHEET_NAMES.DIEM_DANH);
  const dataDD = sheetDD ? sheetDD.getDataRange().getValues() : [];
  const ddMap = sheetDD ? getHeaderMap(sheetDD) : {};
  const attendanceRecords = {};
  for (let i = 1; i < dataDD.length; i++) {
    const sKey = String(dataDD[i][1] || "");
    const stId = String(dataDD[i][2] || "");
    const stStatus = String(dataDD[i][4] || "");
    const dateCol = ddMap["Ngày"] !== undefined && dataDD[i][ddMap["Ngày"]] ? String(dataDD[i][ddMap["Ngày"]]) : extractDateFromTimeText(String(dataDD[i][0] || ""));
    if (sKey && stId && dateCol) {
      const sessionDayKey = sKey + "_" + dateCol;
      if (!attendanceRecords[sessionDayKey]) attendanceRecords[sessionDayKey] = {};
      attendanceRecords[sessionDayKey][stId] = stStatus;
    }
  }

  // Sổ đầu bài
  const sheetSDB = ss.getSheetByName(SHEET_NAMES.SO_DAU_BAI);
  const dataSDB = sheetSDB ? sheetSDB.getDataRange().getValues() : [];
  const periodLogs = [];
  for (let i = dataSDB.length - 1; i >= 1; i--) {
    if (!dataSDB[i][0]) continue;
    periodLogs.push({
      time: String(dataSDB[i][0]),
      period: String(dataSDB[i][1]),
      subject: String(dataSDB[i][2]),
      rating: String(dataSDB[i][5] || "A"),
      note: String(dataSDB[i][8] || "")
    });
  }

  // Sơ đồ lớp
  const sheetSDL = ss.getSheetByName(SHEET_NAMES.SO_DO_LOP);
  const dataSDL = sheetSDL ? sheetSDL.getDataRange().getValues() : [];
  const seatingRows = [];
  for (let i = 1; i < dataSDL.length; i++) {
    if (dataSDL[i][0]) {
      seatingRows.push({
        day: Number(dataSDL[i][0]) || 1,
        ban: Number(dataSDL[i][1]) || 1,
        viTri: String(dataSDL[i][2] || "Trái"),
        id: String(dataSDL[i][3] || ""),
        hoTen: String(dataSDL[i][4] || ""),
        ghiChu: String(dataSDL[i][5] || "")
      });
    }
  }

  // Quỹ lớp
  const dataKT = ss.getSheetByName(SHEET_NAMES.CAC_KY_THU).getDataRange().getValues();
  const campaigns = [];
  for (let i = 1; i < dataKT.length; i++) {
    if (dataKT[i][0]) {
      campaigns.push({
        id: String(dataKT[i][0]),
        title: String(dataKT[i][1]),
        target: parseScore(dataKT[i][2], 0),
        status: String(dataKT[i][4])
      });
    }
  }

  const dataTQ = ss.getSheetByName(SHEET_NAMES.THU_QUY_CHI_TIET).getDataRange().getValues();
  const fundPayments = [];
  for (let i = 1; i < dataTQ.length; i++) {
    if (dataTQ[i][0]) {
      fundPayments.push({
        campaignId: String(dataTQ[i][0]),
        studentId: String(dataTQ[i][1]),
        amountPaid: parseScore(dataTQ[i][3], 0),
        isPaid: parseSheetBool(dataTQ[i][4]),
        note: String(dataTQ[i][6] || "")
      });
    }
  }

  const dataSQ = ss.getSheetByName(SHEET_NAMES.SO_QUY).getDataRange().getValues();
  const cashbook = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (let i = 1; i < dataSQ.length; i++) {
    if (dataSQ[i][0]) {
      const type = String(dataSQ[i][2]).toUpperCase();
      const amt = parseScore(dataSQ[i][4], 0);
      const status = String(dataSQ[i][7] || "DA_DUYET");
      const receipt = String(dataSQ[i][8] || "");

      if (status === "DA_DUYET") {
        if (type === "CHI") totalExpense += amt;
        else totalIncome += amt;
      }

      cashbook.push({
        code: String(dataSQ[i][0]),
        time: formatDateValue(dataSQ[i][1]),
        type: type,
        category: String(dataSQ[i][3]),
        amount: amt,
        author: String(dataSQ[i][5]),
        note: String(dataSQ[i][6] || ""),
        status: status,
        receipt: receipt
      });
    }
  }

  fundPayments.forEach(p => {
    if (p.isPaid && p.amountPaid) totalIncome += Number(p.amountPaid);
  });

  const fundSummary = {
    totalIncome: totalIncome,
    totalExpense: totalExpense,
    balance: totalIncome - totalExpense
  };

  // Lịch sử kiểm toán thu chi
  const auditLogs = [];
  if (isGVCN || session.roleLevel === "TREASURER") {
    const sheetLS = ss.getSheetByName(SHEET_NAMES.LICH_SU_THU_CHI);
    if (sheetLS) {
      const dataLS = sheetLS.getDataRange().getValues();
      for (let i = dataLS.length - 1; i >= 1; i--) {
        if (dataLS[i][0]) {
          auditLogs.push({
            time: String(dataLS[i][0]),
            code: String(dataLS[i][1]),
            action: String(dataLS[i][2]),
            type: String(dataLS[i][3]),
            category: String(dataLS[i][4]),
            amount: parseScore(dataLS[i][5], 0),
            author: String(dataLS[i][6]),
            detail: String(dataLS[i][7] || "")
          });
        }
      }
    }
  }

  // Hòm thư tâm tư (GVCN xem toàn bộ, HS chỉ xem thư do mình gửi không ẩn danh)
  const sheetTT = ss.getSheetByName(SHEET_NAMES.TAM_TU);
  const letters = [];
  if (sheetTT) {
    const dataTT = sheetTT.getDataRange().getValues();
    for (let i = dataTT.length - 1; i >= 1; i--) {
      if (!dataTT[i][0]) continue;
      const letterStId = String(dataTT[i][3] || "");
      if (!isGVCN && (!selfId || letterStId !== selfId)) continue;
      letters.push({
        id: String(dataTT[i][0]),
        time: String(dataTT[i][1]),
        senderName: String(dataTT[i][2]),
        studentId: letterStId,
        category: String(dataTT[i][4]),
        title: String(dataTT[i][5]),
        content: String(dataTT[i][6]),
        status: String(dataTT[i][7] || "Chưa đọc"),
        teacherReply: String(dataTT[i][8] || "")
      });
    }
  }

  // Trực nhật, VTM/Media, Lưu trữ tuần
  const dutyState = readJsonKeyValueSheet(ss.getSheetByName(SHEET_NAMES.TRUC_NHAT));
  const vtmMediaState = readJsonKeyValueSheet(ss.getSheetByName(SHEET_NAMES.VTM_MEDIA));
  const weeklyArchives = readWeeklyArchives(ss);
  const config = getConfigMap(ss);

  return {
    status: "success",
    students,
    violations,
    attendanceRecords,
    periodLogs,
    seatingRows,
    campaigns,
    fundPayments,
    cashbook,
    fundSummary,
    auditLogs,
    letters,
    dutyAssignments: dutyState.DUTY_7SESSIONS || null,
    volunteerLaborList: dutyState.VOLUNTEER_LABOR || null,
    vtmEvents: vtmMediaState.VTM_EVENTS || null,
    classMedia: vtmMediaState.CLASS_MEDIA || null,
    weeklyArchives,
    config,
    rolloverInfo
  };
}

function readJsonKeyValueSheet(sheet) {
  const out = {};
  if (!sheet) return out;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const k = String(data[i][0] || "").trim();
    const raw = String(data[i][2] || "");
    if (k && raw) {
      try { out[k] = JSON.parse(raw); } catch (err) {}
    }
  }
  return out;
}

function writeJsonKeyValueRow(sheet, key, typeLabel, obj) {
  const data = sheet.getDataRange().getValues();
  const jsonStr = JSON.stringify(obj);
  const nowStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(typeLabel);
      sheet.getRange(i + 1, 3).setValue(jsonStr);
      sheet.getRange(i + 1, 4).setValue(nowStr);
      return;
    }
  }
  sheet.appendRow([key, typeLabel, jsonStr, nowStr]);
}

function readWeeklyArchives(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_TUAN);
  const archives = {};
  if (!sheet) return archives;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const k = String(data[i][0] || "").trim();
    const raw = String(data[i][4] || "");
    if (k && raw) {
      try { archives[k] = JSON.parse(raw); } catch (err) {}
    }
  }
  return archives;
}

function extractDateFromTimeText(txt) {
  const m = txt.match(/\((\d{1,2}\/\d{1,2}\/\d{4})\)/);
  return m ? m[1] : "";
}

// ============================================================================
// IV. CỔNG TRA CỨU HỌC SINH & PHỤ HUYNH (CÔNG KHAI, AN TOÀN)
// ============================================================================
function lookupStudent(ss, code) {
  if (!code) return { status: "error", message: "Vui lòng cung cấp Họ tên đầy đủ, Mã HS hoặc CCCD." };

  const rawCode = String(code).trim();
  const lowerCode = rawCode.toLowerCase();
  const cleanNormalized = removeVietnameseTones(rawCode);
  if (!cleanNormalized) return { status: "error", message: "Từ khóa tra cứu không hợp lệ." };

  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const dataDS = sheetDS.getDataRange().getValues();
  const hMap = getHeaderMap(sheetDS);

  let targetStudent = null;

  for (let i = 1; i < dataDS.length; i++) {
    const row = dataDS[i];
    const sId = String(row[hMap["id"]] || "").trim().toLowerCase();
    const sCCCD = String((hMap["soCCCD"] !== undefined ? row[hMap["soCCCD"]] : "") || "").replace(/\s/g, "").toLowerCase();
    const sNameRaw = String(row[hMap["hoTen"]] || "").trim();
    const sNameClean = removeVietnameseTones(sNameRaw);

    if (sId === lowerCode || (sCCCD && sCCCD === lowerCode) || sNameRaw.toLowerCase() === lowerCode || sNameClean === cleanNormalized) {
      const rawCCCD = hMap["soCCCD"] !== undefined ? String(row[hMap["soCCCD"]] || "") : "";
      targetStudent = {
        id: String(row[hMap["id"]] || ""),
        hoTen: sNameRaw,
        to: String(row[hMap["to"]] || "Tổ 1"),
        chucVu: String(row[hMap["chucVu"]] || "Thành viên"),
        soCCCDMasked: maskCCCD(rawCCCD),
        ngayCapCCCD: hMap["ngayCapCCCD"] !== undefined && row[hMap["ngayCapCCCD"]] ? formatDateValue(row[hMap["ngayCapCCCD"]]) : "",
        diemThiDua: parseScore(row[hMap["diemThiDua"]], 100)
      };
      break;
    }
  }

  if (!targetStudent) {
    return { status: "error", message: "Không tìm thấy hồ sơ học sinh khớp chính xác với thông tin đã nhập!" };
  }

  // Nhật ký vi phạm/khen thưởng cá nhân
  const dataNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY).getDataRange().getValues();
  const personalViolations = [];
  for (let i = 1; i < dataNK.length; i++) {
    if (String(dataNK[i][1]).trim().toLowerCase() === targetStudent.id.toLowerCase()) {
      personalViolations.push({
        time: String(dataNK[i][0]),
        criteria: String(dataNK[i][3]),
        points: parseScore(dataNK[i][4], 0),
        note: String(dataNK[i][5] || "")
      });
    }
  }

  // Vị trí chỗ ngồi từ SoDoLop
  let seatLocation = "Đang sắp xếp chỗ ngồi";
  const sheetSDL = ss.getSheetByName(SHEET_NAMES.SO_DO_LOP);
  if (sheetSDL) {
    const dataSDL = sheetSDL.getDataRange().getValues();
    for (let i = 1; i < dataSDL.length; i++) {
      const rowId = String(dataSDL[i][3] || "").trim().toLowerCase();
      const rowName = String(dataSDL[i][4] || "").trim().toLowerCase();
      if ((rowId && rowId === targetStudent.id.toLowerCase()) || (rowName && rowName === targetStudent.hoTen.toLowerCase())) {
        seatLocation = `Dãy ${dataSDL[i][0]} • Bàn ${dataSDL[i][1]} • Ghế ${dataSDL[i][2]}`;
        break;
      }
    }
  }

  // Trực nhật 7 ca
  const dutyState = readJsonKeyValueSheet(ss.getSheetByName(SHEET_NAMES.TRUC_NHAT));
  const dutyMap = dutyState.DUTY_7SESSIONS || {};
  let dutyInfo = null;
  for (let sKey in dutyMap) {
    const obj = dutyMap[sKey];
    if (obj && obj.students && obj.students.indexOf(targetStudent.id) !== -1) {
      dutyInfo = { sessionKey: sKey, status: obj.status || "CHUA_DANH_GIA", note: obj.note || "" };
      break;
    }
  }

  // Quỹ lớp cá nhân cho toàn bộ các đợt thu
  const dataKT = ss.getSheetByName(SHEET_NAMES.CAC_KY_THU).getDataRange().getValues();
  const campaigns = [];
  const campMap = {};
  for (let i = 1; i < dataKT.length; i++) {
    if (dataKT[i][0]) {
      const cId = String(dataKT[i][0]);
      const cObj = { id: cId, title: String(dataKT[i][1]), target: parseScore(dataKT[i][2], 0) };
      campaigns.push(cObj);
      campMap[cId] = cObj;
    }
  }

  const dataTQ = ss.getSheetByName(SHEET_NAMES.THU_QUY_CHI_TIET).getDataRange().getValues();
  const paidByCampaign = {};
  for (let i = 1; i < dataTQ.length; i++) {
    if (String(dataTQ[i][1]).trim().toLowerCase() === targetStudent.id.toLowerCase()) {
      const cId = String(dataTQ[i][0]);
      paidByCampaign[cId] = {
        amountPaid: parseScore(dataTQ[i][3], 0),
        isPaid: parseSheetBool(dataTQ[i][4]),
        paidDate: dataTQ[i][5] ? formatDateValue(dataTQ[i][5]) : ""
      };
    }
  }
  const personalFunds = campaigns.map(c => {
    const rec = paidByCampaign[c.id] || {};
    return {
      campaignId: c.id,
      campaignTitle: c.title,
      targetAmount: c.target,
      amountPaid: rec.amountPaid || 0,
      isPaid: Boolean(rec.isPaid),
      paidDate: rec.paidDate || ""
    };
  });

  const cfg = getConfigMap(ss);
  const vtmMediaState = readJsonKeyValueSheet(ss.getSheetByName(SHEET_NAMES.VTM_MEDIA));
  let parsedTkbConfig = null;
  if (cfg.tkbConfigJson) {
    try { parsedTkbConfig = JSON.parse(cfg.tkbConfigJson); } catch (err) { parsedTkbConfig = null; }
  }

  return {
    status: "success",
    student: targetStudent,
    seatLocation: seatLocation,
    dutyInfo: dutyInfo,
    personalViolations: personalViolations,
    personalFunds: personalFunds,
    tkbImage: cfg.tkbCustomImage || "",
    tkbUpdatedAt: cfg.tkbUpdatedAt || "",
    tkbConfig: parsedTkbConfig,
    classMedia: (vtmMediaState.CLASS_MEDIA || []).slice(0, 4)
  };
}

function getPublicFundStatement(ss) {
  const dataTQ = ss.getSheetByName(SHEET_NAMES.THU_QUY_CHI_TIET).getDataRange().getValues();
  let totalIncome = 0;
  for (let i = 1; i < dataTQ.length; i++) {
    if (dataTQ[i][0] && parseSheetBool(dataTQ[i][4])) {
      totalIncome += parseScore(dataTQ[i][3], 0);
    }
  }

  const dataSQ = ss.getSheetByName(SHEET_NAMES.SO_QUY).getDataRange().getValues();
  let totalExpense = 0;
  const transactions = [];
  for (let i = 1; i < dataSQ.length; i++) {
    if (!dataSQ[i][0]) continue;
    const type = String(dataSQ[i][2]).toUpperCase();
    const amt = parseScore(dataSQ[i][4], 0);
    const status = String(dataSQ[i][7] || "DA_DUYET");
    if (status === "DA_DUYET") {
      if (type === "CHI") totalExpense += amt;
      else totalIncome += amt;
      transactions.push({
        code: String(dataSQ[i][0]),
        time: formatDateValue(dataSQ[i][1]),
        type: type,
        category: String(dataSQ[i][3]),
        amount: amt,
        note: String(dataSQ[i][6] || ""),
        status: status
      });
    }
  }

  const cfg = getConfigMap(ss);
  let parsedTkbConfig = null;
  if (cfg.tkbConfigJson) {
    try { parsedTkbConfig = JSON.parse(cfg.tkbConfigJson); } catch (err) { parsedTkbConfig = null; }
  }

  return {
    status: "success",
    fundSummary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
    transactions,
    tkbImage: cfg.tkbCustomImage || "",
    tkbUpdatedAt: cfg.tkbUpdatedAt || "",
    tkbConfig: parsedTkbConfig
  };
}

// ============================================================================
// V. QUẢN LÝ NỀ NẾP & CHUYÊN CẦN
// ============================================================================
function getAttendancePenalty(status) {
  if (status === "DI_TRE") return { delta: -10, criteria: "Đi học trễ" };
  if (status === "VANG_PHEP") return { delta: 0, criteria: "Nghỉ học (Có phép)" };
  if (status === "KHONG_PHEP") return { delta: -20, criteria: "Vắng học (Không phép)" };
  return { delta: 0, criteria: "Có mặt" };
}

function saveAttendance(ss, payload, session) {
  const sheetDD = ss.getSheetByName(SHEET_NAMES.DIEM_DANH);
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const ddMap = getHeaderMap(sheetDD);
  const nkMap = getHeaderMap(sheetNK);

  const sessionKey = String(payload.sessionKey || "");
  const sessionName = String(payload.sessionName || "");
  const date = String(payload.date || formatDateValue(new Date()));
  const week = Number(payload.week) || 0;
  const studentId = String(payload.studentId || "");
  const studentName = String(payload.studentName || "");
  const status = String(payload.status || "CO_MAT");
  const reason = String(payload.reason || "");
  const sender = String(payload.sender || (session ? session.fullName : "Cán sự"));
  const incidentKey = payload.incidentKey || `ATT_${sessionKey}_${date}_${studentId}`;

  const newInfo = getAttendancePenalty(status);
  const dataDD = sheetDD.getDataRange().getValues();
  let existingRow = -1;
  let oldStatus = "";
  for (let i = 1; i < dataDD.length; i++) {
    if (String(dataDD[i][7]) === incidentKey) {
      existingRow = i + 1;
      oldStatus = String(dataDD[i][4] || "");
      break;
    }
  }

  const oldInfo = existingRow > 0 ? getAttendancePenalty(oldStatus) : { delta: 0 };
  const scoreDiff = newInfo.delta - oldInfo.delta;

  if (existingRow > 0) {
    sheetDD.getRange(existingRow, 5).setValue(status);
    sheetDD.getRange(existingRow, 6).setValue(reason);
    sheetDD.getRange(existingRow, 7).setValue(sender);
    if (ddMap["Tuần"] !== undefined) sheetDD.getRange(existingRow, ddMap["Tuần"] + 1).setValue(week || "");
    if (ddMap["Ngày"] !== undefined) sheetDD.getRange(existingRow, ddMap["Ngày"] + 1).setValue(date);
  } else {
    const rowDD = new Array(Math.max(10, sheetDD.getLastColumn())).fill("");
    rowDD[0] = `${sessionName} (${date})`;
    rowDD[1] = sessionKey;
    rowDD[2] = studentId;
    rowDD[3] = studentName;
    rowDD[4] = status;
    rowDD[5] = reason;
    rowDD[6] = sender;
    rowDD[7] = incidentKey;
    if (ddMap["Tuần"] !== undefined) rowDD[ddMap["Tuần"]] = week || "";
    if (ddMap["Ngày"] !== undefined) rowDD[ddMap["Ngày"]] = date;
    sheetDD.appendRow(rowDD);
  }

  // Đồng bộ NhatKy theo incidentKey
  const dataNK = sheetNK.getDataRange().getValues();
  let nkRow = -1;
  for (let i = 1; i < dataNK.length; i++) {
    if (String(dataNK[i][7]) === incidentKey) {
      nkRow = i + 1;
      break;
    }
  }

  if (status === "CO_MAT") {
    if (nkRow > 0) sheetNK.deleteRow(nkRow);
  } else if (nkRow > 0) {
    sheetNK.getRange(nkRow, 4).setValue(`[Chuyên cần] ${newInfo.criteria}`);
    sheetNK.getRange(nkRow, 5).setValue(newInfo.delta);
    sheetNK.getRange(nkRow, 6).setValue(reason || "Điểm danh ca học");
    sheetNK.getRange(nkRow, 7).setValue(sender);
    if (nkMap["Tuần"] !== undefined) sheetNK.getRange(nkRow, nkMap["Tuần"] + 1).setValue(week || "");
    if (nkMap["Ngày"] !== undefined) sheetNK.getRange(nkRow, nkMap["Ngày"] + 1).setValue(date);
  } else {
    const rowNK = new Array(Math.max(10, sheetNK.getLastColumn())).fill("");
    rowNK[0] = `${sessionName} (${date})`;
    rowNK[1] = studentId;
    rowNK[2] = studentName;
    rowNK[3] = `[Chuyên cần] ${newInfo.criteria}`;
    rowNK[4] = newInfo.delta;
    rowNK[5] = reason || "Điểm danh ca học";
    rowNK[6] = sender;
    rowNK[7] = incidentKey;
    if (nkMap["Tuần"] !== undefined) rowNK[nkMap["Tuần"]] = week || "";
    if (nkMap["Ngày"] !== undefined) rowNK[nkMap["Ngày"]] = date;
    sheetNK.appendRow(rowNK);
  }

  if (scoreDiff !== 0) {
    adjustStudentScoreDynamic(sheetDS, studentId, scoreDiff);
  }
  return { status: "success", scoreDiff: scoreDiff };
}

function saveAttendanceBatch(ss, payload, session) {
  const items = payload.items || [];
  let count = 0;
  items.forEach(item => {
    saveAttendance(ss, item, session);
    count++;
  });
  return { status: "success", count: count };
}

function recordViolation(ss, payload, session) {
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const nkMap = getHeaderMap(sheetNK);
  const { displayTime, studentId, studentName, criteria, points, note, sender, incidentKey, week, date } = payload;

  const finalKey = incidentKey || `VIO_${Date.now()}_${studentId}`;
  const finalPoints = Number(points) || 0;
  const finalSender = sender || (session ? session.fullName : "Ban Cán sự");

  const rowNK = new Array(Math.max(10, sheetNK.getLastColumn())).fill("");
  rowNK[0] = displayTime;
  rowNK[1] = studentId;
  rowNK[2] = studentName;
  rowNK[3] = criteria;
  rowNK[4] = finalPoints;
  rowNK[5] = note || "";
  rowNK[6] = finalSender;
  rowNK[7] = finalKey;
  if (nkMap["Tuần"] !== undefined) rowNK[nkMap["Tuần"]] = Number(week) || "";
  if (nkMap["Ngày"] !== undefined) rowNK[nkMap["Ngày"]] = date || extractDateFromTimeText(String(displayTime || ""));

  sheetNK.appendRow(rowNK);
  if (finalPoints !== 0) adjustStudentScoreDynamic(sheetDS, studentId, finalPoints);

  return { status: "success", incidentKey: finalKey };
}

function deleteViolation(ss, payload) {
  const { incidentKey, rowId } = payload;
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const dataNK = sheetNK.getDataRange().getValues();

  let targetRow = -1;
  if (incidentKey) {
    for (let i = 1; i < dataNK.length; i++) {
      if (String(dataNK[i][7]) === String(incidentKey)) {
        targetRow = i + 1;
        break;
      }
    }
  } else if (rowId && Number(rowId) > 1 && Number(rowId) <= dataNK.length) {
    targetRow = Number(rowId);
  }

  if (targetRow === -1) {
    return { status: "error", message: "Không tìm thấy bản ghi cần xóa trên Sheet." };
  }

  const studentId = String(dataNK[targetRow - 1][1] || "");
  const actualPoints = parseScore(dataNK[targetRow - 1][4], 0);
  sheetNK.deleteRow(targetRow);
  if (actualPoints !== 0 && studentId) {
    adjustStudentScoreDynamic(sheetDS, studentId, -actualPoints);
  }
  return { status: "success" };
}

function approveLeaveSupplement(ss, payload) {
  const { rowId, incidentKey, studentId, note } = payload;
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  const dataNK = sheetNK.getDataRange().getValues();
  let rId = -1;
  if (incidentKey) {
    for (let i = 1; i < dataNK.length; i++) {
      if (String(dataNK[i][7]) === String(incidentKey)) {
        rId = i + 1;
        break;
      }
    }
  } else if (rowId && Number(rowId) > 1) {
    rId = Number(rowId);
  }

  if (rId > 1) {
    const oldPts = parseScore(sheetNK.getRange(rId, 5).getValue(), 0);
    const stId = studentId || String(sheetNK.getRange(rId, 2).getValue() || "");
    sheetNK.getRange(rId, 4).setValue("[Chuyên cần] Nghỉ học (Có phép - Bổ sung)");
    sheetNK.getRange(rId, 5).setValue(0);
    sheetNK.getRange(rId, 6).setValue((note || "") + " [GVCN duyệt]");
    if (oldPts < 0 && stId) adjustStudentScoreDynamic(ss.getSheetByName(SHEET_NAMES.DANH_SACH), stId, Math.abs(oldPts));
  }
  return { status: "success" };
}

// ============================================================================
// VI. SƠ ĐỒ LỚP HỌC & SỔ ĐẦU BÀI
// ============================================================================
function saveSeatingChart(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SO_DO_LOP);
  const layout = payload.layout || [];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (layout.length > 0) {
    const rows = layout.map(item => [
      item.day || "",
      item.ban || "",
      item.viTri || "",
      item.id || "",
      item.hoTen || "",
      item.ghiChu || ""
    ]);
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }
  return { status: "success", message: "Đã lưu sơ đồ chỗ ngồi lên Sheets." };
}

function rotateSeatingChart(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.SO_DO_LOP);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: "error", message: "Sơ đồ chưa có dữ liệu." };

  for (let i = 1; i < data.length; i++) {
    let curDay = Number(data[i][0]) || 1;
    let nextDay = (curDay % 4) + 1;
    sheet.getRange(i + 1, 1).setValue(nextDay);
  }
  return { status: "success", message: "Đã xoay dãy ghế theo tuần hoàn." };
}

function saveClassSessionLog(ss, payload, sessionObj) {
  const { date, week, session, period, subject, rating, note, violationStudentId, violationStudentName, violationReason, sender, incidentKey } = payload;
  const finalDate = date || formatDateValue(new Date());
  const finalSender = sender || (sessionObj ? sessionObj.fullName : "Ban Cán sự");

  ss.getSheetByName(SHEET_NAMES.SO_DAU_BAI).appendRow([
    `${session} (${finalDate})`, period, subject, "", "", rating,
    "", violationStudentId || "", note || "", finalSender
  ]);

  if (violationStudentId && violationStudentId !== "NONE") {
    const finalIncidentKey = incidentKey || `VIO_${finalDate}_${session}_${violationStudentId}_${violationReason}`;
    const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
    const dataNK = sheetNK.getDataRange().getValues();
    const nkMap = getHeaderMap(sheetNK);

    let isExisted = false;
    const reasonLower = String(violationReason || "").toLowerCase();
    for (let i = 1; i < dataNK.length; i++) {
      const rowKey = String(dataNK[i][7] || "");
      const rowStId = String(dataNK[i][1] || "");
      const rowTime = String(dataNK[i][0] || "");
      const rowCriteria = String(dataNK[i][3] || "").toLowerCase();
      const rowDate = nkMap["Ngày"] !== undefined ? String(dataNK[i][nkMap["Ngày"]] || "") : extractDateFromTimeText(rowTime);

      if (rowKey === finalIncidentKey) {
        isExisted = true;
        break;
      }
      if (rowStId === String(violationStudentId) && rowDate === finalDate && rowTime.indexOf(session) !== -1 && reasonLower && rowCriteria.indexOf(reasonLower.split(" ")[0]) !== -1 && rowCriteria.indexOf(reasonLower.slice(0, 12)) !== -1) {
        isExisted = true;
        break;
      }
    }

    if (!isExisted) {
      recordViolation(ss, {
        displayTime: `${session} (${finalDate} - ${period})`,
        studentId: violationStudentId,
        studentName: violationStudentName || "Theo SĐB",
        criteria: `[SĐB - ${subject}] ${violationReason}`,
        points: -10,
        note: `Xếp loại: ${rating}. ${note || ""}`,
        sender: finalSender,
        incidentKey: finalIncidentKey,
        week: week,
        date: finalDate
      }, sessionObj);
    }
  }
  return { status: "success" };
}

// ============================================================================
// VII. LAO ĐỘNG, TRỰC NHẬT & VĂN THỂ MỸ
// ============================================================================
function saveLaborInspection(ss, payload) {
  const { sessionKey, team, status, inspector, note } = payload;
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  const dateStr = formatDateValue(new Date());

  sheetNK.appendRow([
    `${sessionKey} (${dateStr})`,
    team || sessionKey,
    `Tập thể trực nhật: ${team || sessionKey}`,
    `[Trực nhật] Nghiệm thu: ${status === "DAT" ? "Đạt tiêu chuẩn" : "Chưa đạt (Yêu cầu trực bù)"}`,
    0,
    note || `Người nghiệm thu: ${inspector || "Lớp phó Lao động"}`,
    inspector || "Lớp phó Lao động",
    `LABOR_${sessionKey}_${dateStr}`
  ]);
  return { status: "success" };
}

function updateLaborPunishmentStatus(ss, payload) {
  const { studentId, status } = payload;
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  sheetNK.appendRow([
    formatDateValue(new Date()),
    studentId,
    "Học sinh trực phạt",
    `[Lao động phạt] Trạng thái: ${status}`,
    0,
    "Lớp phó Lao động nghiệm thu",
    "Lớp phó LĐ",
    `LABOR_PUNISH_${Date.now()}`
  ]);
  return { status: "success" };
}

function recordDeskSanitationViolation(ss, payload) {
  const { deskPosition, errorType, points, sender } = payload;
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  sheetNK.appendRow([
    formatDateValue(new Date()),
    deskPosition,
    `Vị trí ${deskPosition}`,
    `[Vệ sinh bàn học] ${errorType}`,
    Number(points) || -10,
    "Ban Cán sự Lao động ghi nhận",
    sender,
    `DESK_${Date.now()}`
  ]);
  return { status: "success" };
}

function saveDutyState(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAMES.TRUC_NHAT);
  if (payload.dutyAssignments !== undefined) {
    writeJsonKeyValueRow(sheet, "DUTY_7SESSIONS", "TRUC_NHAT_7CA", payload.dutyAssignments);
  }
  if (payload.volunteerLaborList !== undefined) {
    writeJsonKeyValueRow(sheet, "VOLUNTEER_LABOR", "LAO_DONG_DOAN", payload.volunteerLaborList);
  }
  return { status: "success" };
}

function saveVtmMediaState(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAMES.VTM_MEDIA);
  if (payload.vtmEvents !== undefined) {
    writeJsonKeyValueRow(sheet, "VTM_EVENTS", "PHONG_TRAO_VTM", payload.vtmEvents);
  }
  if (payload.classMedia !== undefined) {
    writeJsonKeyValueRow(sheet, "CLASS_MEDIA", "KHO_MEDIA", payload.classMedia);
  }
  return { status: "success" };
}

// ============================================================================
// VIII. QUẢN LÝ QUỸ LỚP & NHẬT KÝ KIỂM TOÁN
// ============================================================================
function createFundCampaign(ss, payload, session) {
  const { title, target, id } = payload;
  const sheet = ss.getSheetByName(SHEET_NAMES.CAC_KY_THU);
  const campaignId = id || `KY_${Date.now()}`;
  const author = payload.author || (session ? session.fullName : "Thủ quỹ");
  sheet.appendRow([campaignId, title, Number(target) || 0, formatDateValue(new Date()), "Đang thu", ""]);

  logFundAction(ss, {
    code: campaignId, action: "TẠO ĐỢT THU", type: "THU", category: title,
    amount: target, author: author, detail: "Phát động đợt thu mới cho lớp"
  });

  return { status: "success", campaignId: campaignId };
}

function deleteFundCampaign(ss, payload, session) {
  const campaignId = String(payload.campaignId || "");
  if (!campaignId) return { status: "error", message: "Thiếu mã đợt thu." };

  const sheetKT = ss.getSheetByName(SHEET_NAMES.CAC_KY_THU);
  const dataKT = sheetKT.getDataRange().getValues();
  let deletedTitle = campaignId;
  let found = false;
  for (let i = 1; i < dataKT.length; i++) {
    if (String(dataKT[i][0]) === campaignId) {
      deletedTitle = String(dataKT[i][1] || campaignId);
      sheetKT.deleteRow(i + 1);
      found = true;
      break;
    }
  }

  const sheetTQ = ss.getSheetByName(SHEET_NAMES.THU_QUY_CHI_TIET);
  const dataTQ = sheetTQ.getDataRange().getValues();
  for (let i = dataTQ.length - 1; i >= 1; i--) {
    if (String(dataTQ[i][0]) === campaignId) {
      sheetTQ.deleteRow(i + 1);
    }
  }

  if (found) {
    logFundAction(ss, {
      code: campaignId, action: "XÓA ĐỢT THU", type: "THU", category: deletedTitle,
      amount: 0, author: payload.author || (session ? session.fullName : "GVCN"),
      detail: `Đã xóa đợt thu quỹ [${deletedTitle}]`
    });
  }
  return { status: "success" };
}

function saveFundPaymentBatch(ss, payload, session) {
  const sheetTQ = ss.getSheetByName(SHEET_NAMES.THU_QUY_CHI_TIET);
  const { campaignId, payments, author } = payload;
  const data = sheetTQ.getDataRange().getValues();
  const actor = author || (session ? session.fullName : "Thủ quỹ");
  const todayStr = formatDateValue(new Date());

  (payments || []).forEach(p => {
    let found = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(campaignId) && String(data[i][1]) === String(p.studentId)) {
        found = i + 1;
        break;
      }
    }
    if (found > 0) {
      sheetTQ.getRange(found, 4).setValue(p.amountPaid);
      sheetTQ.getRange(found, 5).setValue(Boolean(p.isPaid));
      sheetTQ.getRange(found, 6).setValue(todayStr);
      sheetTQ.getRange(found, 7).setValue(p.note || "");
    } else {
      sheetTQ.appendRow([campaignId, p.studentId, p.studentName, p.amountPaid, Boolean(p.isPaid), todayStr, p.note || ""]);
    }
  });

  logFundAction(ss, {
    code: campaignId, action: "CẬP NHẬT THU QUỸ", type: "THU", category: "Thu tiền học sinh",
    amount: 0, author: actor, detail: `Đồng bộ danh sách nộp quỹ (${(payments || []).length} HS)`
  });

  return { status: "success" };
}

function saveFundExpense(ss, payload, session) {
  const txType = String(payload.type || "CHI").toUpperCase() === "THU" ? "THU" : "CHI";
  const code = payload.code || `${txType}_${Date.now()}`;
  const isGVCN = session && session.roleLevel === "GVCN";
  const status = isGVCN ? (payload.status || "DA_DUYET") : "CHO_DUYET";
  const timeStr = formatDateValue(new Date());
  const author = payload.author || (session ? session.fullName : "Thủ quỹ lớp");
  const actionLabel = txType === "THU" ? "LẬP PHIẾU THU ỦNG HỘ" : "LẬP PHIẾU CHI";

  ss.getSheetByName(SHEET_NAMES.SO_QUY).appendRow([
    code,
    timeStr,
    txType,
    payload.category,
    Number(payload.amount) || 0,
    author,
    payload.note || "",
    status,
    payload.receipt || ""
  ]);

  logFundAction(ss, {
    code: code, action: actionLabel, type: txType, category: payload.category,
    amount: payload.amount, author: author, detail: `${txType === "THU" ? "Ghi nhận thu/ủng hộ" : "Lập phiếu chi"} [${status}]: ${payload.note || ""}`
  });

  return { status: "success", code: code, type: txType, statusValue: status };
}

function approveFundExpense(ss, payload, session) {
  const { code, status, author } = payload;
  const sheet = ss.getSheetByName(SHEET_NAMES.SO_QUY);
  const data = sheet.getDataRange().getValues();
  const actor = author || (session ? session.fullName : "GVCN");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(code)) {
      const txType = String(data[i][2] || "CHI").toUpperCase() === "THU" ? "THU" : "CHI";
      sheet.getRange(i + 1, 8).setValue(status);

      logFundAction(ss, {
        code: code,
        action: status === "DA_DUYET" ? (txType === "THU" ? "DUYỆT THU" : "DUYỆT CHI") : "TỪ CHỐI GIAO DỊCH",
        type: txType,
        category: String(data[i][3]),
        amount: Number(data[i][4]),
        author: actor,
        detail: `Cập nhật trạng thái phiếu ${txType} thành ${status}`
      });

      return { status: "success", message: `Đã cập nhật trạng thái phiếu ${txType === "THU" ? "thu" : "chi"}: ${status}` };
    }
  }
  return { status: "error", message: "Không tìm thấy mã phiếu giao dịch." };
}

function deleteFundTransaction(ss, payload, session) {
  const { code, reason, author } = payload;
  const sheet = ss.getSheetByName(SHEET_NAMES.SO_QUY);
  const data = sheet.getDataRange().getValues();
  const actor = author || (session ? session.fullName : "GVCN / Thủ quỹ");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(code)) {
      const deletedRow = data[i];

      logFundAction(ss, {
        code: code,
        action: "XÓA GIAO DỊCH",
        type: String(deletedRow[2]),
        category: String(deletedRow[3]),
        amount: Number(deletedRow[4]),
        author: actor,
        detail: `Đã xóa phiếu vì: ${reason || "Ghi nhầm dữ liệu"}`
      });

      sheet.deleteRow(i + 1);
      return { status: "success", message: "Đã xóa giao dịch và ghi nhận vào lịch sử kiểm toán!" };
    }
  }
  return { status: "error", message: "Không tìm thấy mã giao dịch cần xóa." };
}

function logFundAction(ss, log) {
  const sheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_THU_CHI);
  if (!sheet) return;

  const timeStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  sheet.appendRow([
    timeStr,
    log.code || "",
    log.action || "",
    log.type || "",
    log.category || "",
    Number(log.amount) || 0,
    log.author || "",
    log.detail || ""
  ]);
}

function getFundAuditLogs(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_THU_CHI);
  const logs = [];
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0]) {
        logs.push({
          time: String(data[i][0]),
          code: String(data[i][1]),
          action: String(data[i][2]),
          type: String(data[i][3]),
          category: String(data[i][4]),
          amount: parseScore(data[i][5], 0),
          author: String(data[i][6]),
          detail: String(data[i][7] || "")
        });
      }
    }
  }
  return { status: "success", logs };
}

// ============================================================================
// IX. HÒM THƯ TÂM TƯ: "ĐIỀU EM MUỐN NÓI"
// ============================================================================
function sendStudentLetter(ss, payload, session) {
  const sheet = ss.getSheetByName(SHEET_NAMES.TAM_TU);
  const id = payload.id || `THU_${Date.now()}`;
  const time = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm");
  const isAnon = Boolean(payload.isAnonymous);
  const senderName = isAnon ? "🔒 Ẩn danh bảo mật" : (session && session.fullName ? session.fullName : payload.senderName || "Học sinh 10A12");
  const studentId = isAnon ? "ANONYMOUS" : (session && session.studentId ? session.studentId : payload.studentId || "");

  sheet.appendRow([
    id,
    time,
    senderName,
    studentId,
    payload.category || "Tâm sự chung",
    payload.title || "Tâm tư gửi Thầy",
    payload.content || "",
    "Chưa đọc",
    ""
  ]);

  return { status: "success", letterId: id };
}

function updateLetterStatus(ss, payload) {
  const { letterId, status, teacherReply } = payload;
  const sheet = ss.getSheetByName(SHEET_NAMES.TAM_TU);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(letterId)) {
      if (status) sheet.getRange(i + 1, 8).setValue(status);
      if (teacherReply !== undefined) sheet.getRange(i + 1, 9).setValue(teacherReply);
      return { status: "success", message: "Đã cập nhật thư tâm tư." };
    }
  }
  return { status: "error", message: "Không tìm thấy thư." };
}

// ============================================================================
// X. QUẢN TRỊ HỒ SƠ HỌC SINH & NHẬP EXCEL
// ============================================================================
function generateNextStudentId(sheet) {
  const data = sheet.getDataRange().getValues();
  const hMap = getHeaderMap(sheet);
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const idStr = String(data[i][hMap["id"]] || "");
    const m = idStr.match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = maxNum + 1;
  return "HS" + (next < 10 ? "0" + next : String(next));
}

function addNewStudent(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const hMap = getHeaderMap(sheet);
  const nextId = payload.id || generateNextStudentId(sheet);

  const newRow = new Array(sheet.getLastColumn()).fill("");
  if (hMap["id"] !== undefined) newRow[hMap["id"]] = nextId;
  if (hMap["hoTen"] !== undefined) newRow[hMap["hoTen"]] = payload.hoTen || "";
  if (hMap["to"] !== undefined) newRow[hMap["to"]] = payload.to || "Tổ 1";
  if (hMap["chucVu"] !== undefined) newRow[hMap["chucVu"]] = payload.chucVu || "Thành viên";
  if (hMap["soCCCD"] !== undefined) newRow[hMap["soCCCD"]] = payload.soCCCD || "";
  if (hMap["ngayCapCCCD"] !== undefined) newRow[hMap["ngayCapCCCD"]] = payload.ngayCapCCCD || "";
  if (hMap["tenBa"] !== undefined) newRow[hMap["tenBa"]] = payload.hoTenBa || payload.tenBa || "";
  if (hMap["sdtBa"] !== undefined) newRow[hMap["sdtBa"]] = payload.sdtBa || "";
  if (hMap["tenMe"] !== undefined) newRow[hMap["tenMe"]] = payload.tenMe || "";
  if (hMap["sdtMe"] !== undefined) newRow[hMap["sdtMe"]] = payload.sdtMe || "";
  if (hMap["diaChi"] !== undefined) newRow[hMap["diaChi"]] = payload.diaChi || "Tây Sơn, Gia Lai";
  if (hMap["taiKhoan"] !== undefined) newRow[hMap["taiKhoan"]] = payload.taiKhoan || nextId;
  if (hMap["matKhau"] !== undefined) newRow[hMap["matKhau"]] = payload.matKhau || "123456";
  if (hMap["diemThiDua"] !== undefined) newRow[hMap["diemThiDua"]] = 100;

  sheet.appendRow(newRow);
  return { status: "success", studentId: nextId };
}

function updateStudentProfile(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const data = sheet.getDataRange().getValues();
  const hMap = getHeaderMap(sheet);
  const sId = String(payload.id || "").trim();

  const updatableFields = [
    "hoTen", "to", "chucVu", "ngaySinh", "soCCCD", "ngayCapCCCD", "noiCapCCCD",
    "laDoanVien", "ngayVaoDoan", "diaChi", "tenBa", "ngheNghiepBa", "sdtBa",
    "tenMe", "ngheNghiepMe", "sdtMe", "taiKhoan", "matKhau"
  ];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][hMap["id"]]).trim() === sId) {
      const rowIdx = i + 1;
      updatableFields.forEach(field => {
        if (payload[field] !== undefined && hMap[field] !== undefined) {
          sheet.getRange(rowIdx, hMap[field] + 1).setValue(payload[field]);
        }
      });
      return { status: "success", message: "Đã cập nhật hồ sơ." };
    }
  }
  return { status: "error", message: "Không tìm thấy học sinh." };
}

function deleteStudent(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const data = sheet.getDataRange().getValues();
  const hMap = getHeaderMap(sheet);
  const sId = String(payload.id || "").trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][hMap["id"]]).trim() === sId) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Đã xóa học sinh." };
    }
  }
  return { status: "error", message: "Không tìm thấy học sinh." };
}

function saveAllStudentsBatch(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const students = payload.students || [];
  if (students.length === 0) return { status: "error", message: "Danh sách trống." };

  const hMap = getHeaderMap(sheet);
  const numCols = sheet.getLastColumn();

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).clearContent();
  }

  const rows = students.map(s => {
    const row = new Array(numCols).fill("");
    if (hMap["id"] !== undefined) row[hMap["id"]] = s.id;
    if (hMap["hoTen"] !== undefined) row[hMap["hoTen"]] = s.hoTen;
    if (hMap["to"] !== undefined) row[hMap["to"]] = s.to || "Tổ 1";
    if (hMap["chucVu"] !== undefined) row[hMap["chucVu"]] = s.chucVu || "Thành viên";
    if (hMap["ngaySinh"] !== undefined) row[hMap["ngaySinh"]] = s.ngaySinh || "";
    if (hMap["soCCCD"] !== undefined) row[hMap["soCCCD"]] = s.soCCCD || "";
    if (hMap["ngayCapCCCD"] !== undefined) row[hMap["ngayCapCCCD"]] = s.ngayCapCCCD || "";
    if (hMap["noiCapCCCD"] !== undefined) row[hMap["noiCapCCCD"]] = s.noiCapCCCD || "Cục Cảnh sát QLHC về TTXH";
    if (hMap["laDoanVien"] !== undefined) row[hMap["laDoanVien"]] = s.laDoanVien ? "Đoàn viên" : "Thanh niên";
    if (hMap["ngayVaoDoan"] !== undefined) row[hMap["ngayVaoDoan"]] = s.ngayVaoDoan || "";
    if (hMap["diaChi"] !== undefined) row[hMap["diaChi"]] = s.diaChi || "Tây Sơn, Gia Lai";
    if (hMap["tenBa"] !== undefined) row[hMap["tenBa"]] = s.tenBa || "";
    if (hMap["ngheNghiepBa"] !== undefined) row[hMap["ngheNghiepBa"]] = s.ngheNghiepBa || "";
    if (hMap["sdtBa"] !== undefined) row[hMap["sdtBa"]] = s.sdtBa || "";
    if (hMap["tenMe"] !== undefined) row[hMap["tenMe"]] = s.tenMe || "";
    if (hMap["ngheNghiepMe"] !== undefined) row[hMap["ngheNghiepMe"]] = s.ngheNghiepMe || "";
    if (hMap["sdtMe"] !== undefined) row[hMap["sdtMe"]] = s.sdtMe || "";
    if (hMap["taiKhoan"] !== undefined) row[hMap["taiKhoan"]] = s.taiKhoan || s.id;
    if (hMap["matKhau"] !== undefined) row[hMap["matKhau"]] = s.matKhau || "123456";
    if (hMap["diemThiDua"] !== undefined) row[hMap["diemThiDua"]] = parseScore(s.diemThiDua, 100);
    return row;
  });

  sheet.getRange(2, 1, rows.length, numCols).setValues(rows);
  return { status: "success", count: rows.length };
}

// ============================================================================
// XI. CẤU HÌNH, CHỐT SỔ TUẦN, ĐÓNG GÓI Ô >50K & TỰ ĐỘNG 00:00 THỨ 2
// ============================================================================
const CONFIG_CELL_CHUNK_SIZE = 45000;
const SCHOOL_YEAR_START_MONDAY_GMT7_MS = Date.UTC(2026, 7, 31, 0, 0, 0) - 7 * 3600 * 1000;

function upsertConfigKeyValue(sheetCH, rowByKey, key, val, note) {
  const existingRow = rowByKey[key];
  if (existingRow) {
    sheetCH.getRange(existingRow, 2).setValue(val);
    if (note) sheetCH.getRange(existingRow, 3).setValue(note);
  } else {
    sheetCH.appendRow([key, val, note || "Cập nhật từ hệ thống"]);
    rowByKey[key] = sheetCH.getLastRow();
  }
}

function saveConfig(ss, payload) {
  const sheetCH = ss.getSheetByName(SHEET_NAMES.CAU_HINH);
  const data = sheetCH.getDataRange().getValues();
  const skipKeys = { action: true, authToken: true };
  const rowByKey = {};
  for (let i = 1; i < data.length; i++) {
    const k = String(data[i][0] || "").trim();
    if (k) rowByKey[k] = i + 1;
  }

  for (let key in payload) {
    if (skipKeys[key]) continue;
    let val = payload[key];
    if (typeof val === "boolean") val = val ? "TRUE" : "FALSE";

    if (typeof val === "string" && val.length > CONFIG_CELL_CHUNK_SIZE) {
      const chunkCount = Math.ceil(val.length / CONFIG_CELL_CHUNK_SIZE);
      const oldChunks = parseInt(rowByKey[key + "__chunks"] ? sheetCH.getRange(rowByKey[key + "__chunks"], 2).getValue() : "0", 10) || 0;
      for (let c = 0; c < chunkCount; c++) {
        const chunkSlice = val.slice(c * CONFIG_CELL_CHUNK_SIZE, (c + 1) * CONFIG_CELL_CHUNK_SIZE);
        upsertConfigKeyValue(sheetCH, rowByKey, key + "__chunk_" + c, chunkSlice, "Mảnh dữ liệu lớn (" + (c + 1) + "/" + chunkCount + ")");
      }
      for (let c = chunkCount; c < oldChunks; c++) {
        if (rowByKey[key + "__chunk_" + c]) upsertConfigKeyValue(sheetCH, rowByKey, key + "__chunk_" + c, "", "Đã dọn");
      }
      upsertConfigKeyValue(sheetCH, rowByKey, key + "__chunks", String(chunkCount), "Số mảnh dữ liệu");
      upsertConfigKeyValue(sheetCH, rowByKey, key, "__CHUNKED__:" + chunkCount, "Dữ liệu lớn chia mảnh an toàn <= 50k");
    } else {
      upsertConfigKeyValue(sheetCH, rowByKey, key, val, "Cập nhật từ hệ thống");
      if (rowByKey[key + "__chunks"]) {
        const oldChunks = parseInt(sheetCH.getRange(rowByKey[key + "__chunks"], 2).getValue(), 10) || 0;
        upsertConfigKeyValue(sheetCH, rowByKey, key + "__chunks", "0", "Không chia mảnh");
        for (let c = 0; c < oldChunks; c++) {
          if (rowByKey[key + "__chunk_" + c]) upsertConfigKeyValue(sheetCH, rowByKey, key + "__chunk_" + c, "", "Đã dọn");
        }
      }
    }
  }
  return { status: "success" };
}

function getAutoSchoolWeekServer(nowDate) {
  const nowMs = (nowDate instanceof Date ? nowDate : new Date()).getTime();
  const diffWeeks = Math.floor((nowMs - SCHOOL_YEAR_START_MONDAY_GMT7_MS) / (7 * 86400000)) + 1;
  return Math.min(35, Math.max(1, diffWeeks));
}

function buildServerArchiveSnapshot(ss, weekNum, lockedByLabel) {
  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const dataDS = sheetDS.getDataRange().getValues();
  const hMap = getHeaderMap(sheetDS);
  const students = [];
  let sumScore = 0;
  let redCount = 0;

  for (let i = 1; i < dataDS.length; i++) {
    const row = dataDS[i];
    const id = String((hMap["id"] !== undefined ? row[hMap["id"]] : row[0]) || "").trim();
    const hoTen = String((hMap["hoTen"] !== undefined ? row[hMap["hoTen"]] : row[1]) || "").trim();
    if (!id && !hoTen) continue;
    const score = parseScore(hMap["diemThiDua"] !== undefined ? row[hMap["diemThiDua"]] : 100, 100);
    sumScore += score;
    if (score < 70) redCount++;
    students.push({
      id: id || hoTen,
      hoTen: hoTen,
      to: String((hMap["to"] !== undefined ? row[hMap["to"]] : row[2]) || "Tổ 1"),
      chucVu: String((hMap["chucVu"] !== undefined ? row[hMap["chucVu"]] : row[3]) || "Thành viên"),
      diemThiDua: score
    });
  }
  const avgVal = students.length > 0 ? (sumScore / students.length).toFixed(1) : "100.0";

  const violations = [];
  const sheetNK = ss.getSheetByName(SHEET_NAMES.NHAT_KY);
  if (sheetNK) {
    const nkMap = getHeaderMap(sheetNK);
    const dataNK = sheetNK.getDataRange().getValues();
    for (let i = 1; i < dataNK.length; i++) {
      if (!dataNK[i][0]) continue;
      const wVal = nkMap["Tuần"] !== undefined ? Number(dataNK[i][nkMap["Tuần"]]) : 0;
      if (wVal && wVal !== Number(weekNum)) continue;
      violations.push({
        rowId: i + 1,
        time: String(dataNK[i][0]),
        studentId: String(dataNK[i][1]),
        studentName: String(dataNK[i][2]),
        criteria: String(dataNK[i][3]),
        points: parseScore(dataNK[i][4], 0),
        actor: String(dataNK[i][5]),
        week: wVal || Number(weekNum)
      });
    }
  }

  const periodLogs = [];
  const sheetSDB = ss.getSheetByName(SHEET_NAMES.SO_DAU_BAI);
  if (sheetSDB) {
    const sdbMap = getHeaderMap(sheetSDB);
    const dataSDB = sheetSDB.getDataRange().getValues();
    for (let i = 1; i < dataSDB.length; i++) {
      if (!dataSDB[i][0]) continue;
      const wVal = sdbMap["Tuần"] !== undefined ? Number(dataSDB[i][sdbMap["Tuần"]]) : 0;
      if (wVal && wVal !== Number(weekNum)) continue;
      periodLogs.push({
        rowId: i + 1,
        time: String(dataSDB[i][0]),
        session: String(dataSDB[i][1]),
        subject: String(dataSDB[i][2]),
        rating: String(dataSDB[i][3]),
        note: String(dataSDB[i][4] || ""),
        actor: String(dataSDB[i][5] || ""),
        week: wVal || Number(weekNum)
      });
    }
  }

  return {
    week: Number(weekNum),
    lockedAt: Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
    lockedBy: lockedByLabel || "Tự động 00:00 Thứ 2",
    avgScore: avgVal + "đ",
    redCount: redCount,
    students: students,
    violations: violations,
    periodLogs: periodLogs
  };
}

function resetWeeklyDutyStatuses(ss) {
  const sheetTN = ss.getSheetByName(SHEET_NAMES.TRUC_NHAT);
  if (!sheetTN) return;
  const dutyState = readJsonKeyValueSheet(sheetTN);
  const sessions = dutyState.DUTY_7SESSIONS;
  if (!sessions || typeof sessions !== "object") return;
  for (const key in sessions) {
    if (sessions[key] && typeof sessions[key] === "object") {
      sessions[key].status = "CHUA_DANH_GIA";
      sessions[key].note = "";
    }
  }
  writeJsonKeyValueRow(sheetTN, "DUTY_7SESSIONS", "DUTY", sessions);
}

function checkAndAutoRolloverMonday0AM(ss, nowDate, forceScheduledTrigger) {
  const now = nowDate instanceof Date ? nowDate : new Date();
  const currentWeek = getAutoSchoolWeekServer(now);
  const cfg = getConfigMap(ss);
  const lastTracked = parseInt(cfg.lastAutoRolloverWeek || "0", 10) || 0;

  if (!lastTracked && !forceScheduledTrigger) {
    saveConfig(ss, { lastAutoRolloverWeek: String(currentWeek) });
    return { rolledOver: false, initializedBaseline: true, currentWeek: currentWeek };
  }

  if (lastTracked >= currentWeek) {
    return { rolledOver: false, alreadyRolledOver: true, currentWeek: currentWeek, lastTracked: lastTracked };
  }

  const weekToArchive = (lastTracked > 0 && lastTracked < currentWeek)
    ? (currentWeek - 1)
    : (currentWeek > 1 ? currentWeek - 1 : 0);

  let archivedKey = "";
  if (weekToArchive >= 1) {
    archivedKey = "TUAN_" + weekToArchive;
    const existingArchives = readWeeklyArchives(ss);
    if (!existingArchives[archivedKey]) {
      const archiveObj = buildServerArchiveSnapshot(
        ss,
        weekToArchive,
        forceScheduledTrigger ? "Tự động 00:00 Thứ 2 (Apps Script Trigger)" : "Tự động sang tuần mới (00:00 Thứ 2)"
      );
      saveWeeklyArchive(ss, { archiveKey: archivedKey, archive: archiveObj }, null);
    }
  }

  resetWeeklyScores(ss);
  resetWeeklyDutyStatuses(ss);
  const rolloverAt = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm:ss");
  saveConfig(ss, {
    lastAutoRolloverWeek: String(currentWeek),
    lastAutoRolloverAt: rolloverAt,
    lastRolloverArchivedWeek: String(weekToArchive || 0)
  });

  return {
    status: "success",
    rolledOver: true,
    archivedWeek: weekToArchive,
    archivedKey: archivedKey,
    currentWeek: currentWeek,
    rolledOverAt: rolloverAt
  };
}

/**
 * Hàm chạy tự động vào lúc 0h00 sáng Thứ 2 hàng tuần (GMT+7) bởi Google Apps Script Trigger.
 * Cài đặt một lần bằng cách chạy hàm setupWeeklyMondayRolloverTrigger() trong trình soạn thảo Apps Script.
 */
function autoRolloverNewWeekMonday0AM() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureSystemSchema(ss);
  return checkAndAutoRolloverMonday0AM(ss, new Date(), true);
}

/**
 * Chạy HÀM NÀY MỘT LẦN trong Google Apps Script Editor (chọn setupWeeklyMondayRolloverTrigger -> Chạy / Run)
 * để cấp quyền và đặt lịch tự động chốt sổ + làm sạch tuần mới vào 00:00 Thứ Hai hàng tuần.
 */
function setupWeeklyMondayRolloverTrigger(ssOverride) {
  const ss = ssOverride || SpreadsheetApp.openById(SHEET_ID);
  ensureSystemSchema(ss);
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "autoRolloverNewWeekMonday0AM") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("autoRolloverNewWeekMonday0AM")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(0)
    .nearMinute(0)
    .create();

  const curWeek = getAutoSchoolWeekServer(new Date());
  const cfg = getConfigMap(ss);
  const payload = {
    mondayRolloverTriggerActive: "TRUE",
    mondayRolloverTriggerSchedule: "00:00 Thứ 2 hàng tuần (GMT+7)"
  };
  if (!cfg.lastAutoRolloverWeek) {
    payload.lastAutoRolloverWeek = String(curWeek);
  }
  saveConfig(ss, payload);
  return {
    status: "success",
    message: "Đã đặt lịch tự động chốt sổ & khởi động tuần mới vào 00:00 sáng Thứ 2 hàng tuần!"
  };
}

function saveWeeklyArchive(ss, payload, session) {
  const sheet = ss.getSheetByName(SHEET_NAMES.LICH_SU_TUAN);
  const archiveKey = String(payload.archiveKey || "");
  const archive = payload.archive;
  if (!archiveKey || !archive) return { status: "error", message: "Thiếu dữ liệu chốt sổ tuần." };

  const data = sheet.getDataRange().getValues();
  const lockedAt = archive.lockedAt || Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  const lockedBy = archive.lockedBy || (session ? session.fullName : "GVCN");
  const avgScore = archive.avgScore || "100.0đ";
  const jsonStr = JSON.stringify(archive);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === archiveKey) {
      sheet.getRange(i + 1, 2).setValue(lockedAt);
      sheet.getRange(i + 1, 3).setValue(lockedBy);
      sheet.getRange(i + 1, 4).setValue(avgScore);
      sheet.getRange(i + 1, 5).setValue(jsonStr);
      return { status: "success" };
    }
  }
  sheet.appendRow([archiveKey, lockedAt, lockedBy, avgScore, jsonStr]);
  return { status: "success" };
}

function resetWeeklyScores(ss) {
  const sheetDS = ss.getSheetByName(SHEET_NAMES.DANH_SACH);
  const hMap = getHeaderMap(sheetDS);
  const diemCol = (hMap["diemThiDua"] !== undefined ? hMap["diemThiDua"] : 18) + 1;
  const numRows = sheetDS.getLastRow() - 1;
  if (numRows > 0 && diemCol) {
    const defaultScores = new Array(numRows).fill([100]);
    sheetDS.getRange(2, diemCol, numRows, 1).setValues(defaultScores);
  }
  return { status: "success", message: "Đã làm mới điểm rèn luyện 100đ cho toàn lớp." };
}

function adjustStudentScoreDynamic(sheetDS, studentId, delta) {
  const hMap = getHeaderMap(sheetDS);
  const idIdx = hMap["id"] !== undefined ? hMap["id"] : 0;
  const diemIdx = hMap["diemThiDua"] !== undefined ? hMap["diemThiDua"] : 18;
  const data = sheetDS.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim().toLowerCase() === String(studentId).trim().toLowerCase()) {
      const curScore = parseScore(data[i][diemIdx], 100);
      sheetDS.getRange(i + 1, diemIdx + 1).setValue(Math.max(0, curScore + delta));
      break;
    }
  }
}

function formatDateValue(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, "GMT+7", "dd/MM/yyyy");
  return String(val);
}
