/**
 * ==============================================================================
 * BỘ NÃO ĐIỀU HÀNH TRUNG TÂM SỔ TAY CHỦ NHIỆM 10A12 (K58-QT)
 * Tệp: app.js (Chạy ngầm 100%, không hiển thị hộp thoại hỏi URL)
 * ==============================================================================
 */

// 1. DÁN ĐƯỜNG DẪN WEB APP GOOGLE APPS SCRIPT CỦA BẠN VÀO DÒNG DƯỚI ĐÂY:
const SCRIPT_URL = localStorage.getItem("10A12_SCRIPT_URL") || "https://script.google.com/macros/s/AKfycby1bzee0jofemhb1ITYoi_wldFpc/exec";

let activeUserRole = { role: "GVCN", name: "Thầy Quốc Mẫn", pin: "9999", team: "Tất cả" };
let crossMatrix = { "Tổ 1": "Tổ 2", "Tổ 2": "Tổ 3", "Tổ 3": "Tổ 4", "Tổ 4": "Tổ 1" };
let isAttendanceLockedNow = false;

// ==================== BẢNG QUY CHẾ SỐ 01/QCTĐ-10A12 ====================
const THI_DUA_RULES = {
  BONUS: [
    { code: "C01", name: "Kiểm tra miệng/bài cũ đạt điểm Giỏi (8.0 - 10.0)", points: 10 },
    { code: "C02", name: "Xung phong phát biểu xây dựng bài đúng", points: 2 },
    { code: "C04", name: "Hỗ trợ học tập 15p đầu giờ (chữa bài khó, chuyên đề)", points: 5 },
    { code: "C05", name: "Tình nguyện hỗ trợ hoạt động trường (Văn nghệ, MC, sự kiện)", points: 10 },
    { code: "C06", name: "Gương người tốt việc tốt (nhặt của rơi, tuyên dương)", points: 20 }
  ],
  PENALTY: [
    { code: "P01", group: "Học tập", name: "Kiểm tra miệng / bài cũ dưới 5.0", points: -10 },
    { code: "P02", group: "Học tập", name: "Ngủ trong giờ học", points: -5 },
    { code: "P03", group: "Học tập", name: "Bị GVBM ghi tên nhắc nhở vào Sổ đầu bài", points: -5 },
    { code: "P04", group: "Học tập", name: "Sử dụng điện thoại, tai nghe khi chưa được phép", points: -20 },
    { code: "P05", group: "Học tập", name: "Quên không nộp Sổ đầu bài/thi đua về VP Đoàn", points: -20 },
    { code: "P06", group: "Học tập", name: "Sử dụng tài liệu, gian lận kiểm tra/thi cử", points: -50 },
    { code: "P07", group: "Chuyên cần", name: "Đi học trễ sau hiệu lệnh trống/chuông (sau 06:45 / 13:45)", points: -10 },
    { code: "P08", group: "Chuyên cần", name: "Đi muộn, vắng mặt hoặc thiếu nghiêm túc Chào cờ", points: -10 },
    { code: "P09", group: "Chuyên cần", name: "Nộp trễ các khoản phí, hồ sơ, sổ liên lạc, cam kết", points: -10 },
    { code: "P10", group: "Chuyên cần", name: "Vắng học không phép hoặc giấy phép không hợp lệ", points: -20 },
    { code: "P11", group: "Chuyên cần", name: "Trốn tiết, tự ý bỏ ra khỏi trường/lớp trong buổi học", points: -20 },
    { code: "P12", group: "Chuyên cần", name: "Làm giả giấy xin phép hoặc giả mạo chữ ký phụ huynh", points: -30 },
    { code: "P13", group: "Tác phong", name: "Sai đồng phục quy định (Nữ: áo dài T2; ĐV: áo TN T5)", points: -10 },
    { code: "P14", group: "Tác phong", name: "Không mang phù hiệu/bảng tên hoặc huy hiệu Đoàn", points: -10 },
    { code: "P15", group: "Tác phong", name: "Bỏ áo ngoài quần (không sơ vin), không mang thắt lưng", points: -10 },
    { code: "P16", group: "Tác phong", name: "Đi dép lê, dép quai dọc (không có quai hậu)", points: -10 },
    { code: "P17", group: "Tác phong", name: "Đầu tóc sai quy định, sơn móng, trang điểm đậm", points: -10 },
    { code: "P18", group: "Tác phong", name: "Tự ý chạy ra khỏi phòng học trong 15p đầu giờ", points: -10 },
    { code: "P19", group: "Tác phong", name: "Gây ồn ào, mất trật tự sinh hoạt 15 phút đầu giờ", points: -10 },
    { code: "P20", group: "Tác phong", name: "Thái độ trêu chọc, gây khó khăn cho Ban thi đua/Cờ đỏ", points: -20 },
    { code: "P21", group: "Tác phong", name: "Nói tục, chửi thề, xúc phạm danh dự người khác", points: -20 },
    { code: "P22", group: "Vệ sinh", name: "Mang đồ ăn, nước uống vào lớp; ăn quà vặt trong lớp", points: -10 },
    { code: "P23", group: "Vệ sinh", name: "Xả rác bừa bãi, nhét rác vào trong hộc bàn học", points: -20 },
    { code: "P24", group: "Vệ sinh", name: "Tổ trực nhật bỏ trực, đến trễ hoặc làm sơ sài/không đổ rác", points: -20 },
    { code: "P25", group: "Vệ sinh", name: "Không thu dọn ghế cá nhân sau Chào cờ/tập trung", points: -10 },
    { code: "P26", group: "Vệ sinh", name: "Ngồi lên bàn, leo trèo, ngồi lan can, tự ý đổi chỗ", points: -10 },
    { code: "P27", group: "Vệ sinh", name: "Ra về cuối cùng không tắt quạt, không tắt đèn, không chốt cửa", points: -20 },
    { code: "P28", group: "Vệ sinh", name: "Viết, vẽ bậy lên bàn ghế, tường lớp; làm hỏng CSVC", points: -50 },
    { code: "P29", group: "Kỷ luật nặng", name: "Đi xe trong sân trường hoặc để xe sai hàng lối", points: -10 },
    { code: "P30", group: "Kỷ luật nặng", name: "Vi phạm Luật Giao thông / chạy xe trên 50cc trái phép", points: -20 },
    { code: "P31", group: "Kỷ luật nặng", name: "Tự ý di chuyển giữa Trường chính và Phân hiệu", points: -20 },
    { code: "P32", group: "Kỷ luật nặng", name: "Vô lễ, xúc phạm cán bộ, giáo viên, nhân viên trường", points: -50 },
    { code: "P33", group: "Kỷ luật nặng", name: "Đánh nhau, cổ vũ đánh nhau, gây rối an ninh", points: -50 },
    { code: "P34", group: "Kỷ luật nặng", name: "Hút thuốc lá/pod, uống rượu bia, mang chất cháy nổ", points: -50 },
    { code: "P35", group: "Cán bộ lớp", name: "Cán bộ lớp/Cờ đỏ bao che lỗi, ghi chép thiếu trung thực", points: -10 },
    { code: "P36", group: "Cán bộ lớp", name: "Cán bộ lớp vắng họp triệu tập của trường/Đoàn không lý do", points: -10 }
  ]
};

// ==================== KẾT NỐI API KÉP (FETCH & JSONP) ====================
function callGasApiGet(actionParams) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fetch(`${SCRIPT_URL}?${actionParams}`, { method: "GET", redirect: "follow" });
      const json = await res.json();
      return resolve(json);
    } catch (fetchErr) {
      console.warn("Chuyển sang JSONP...", fetchErr);
    }

    const cbName = "gas_cb_" + Math.round(100000 * Math.random());
    window[cbName] = function(data) {
      delete window[cbName];
      document.body.removeChild(script);
      resolve(data);
    };
    const script = document.createElement("script");
    script.src = `${SCRIPT_URL}?${actionParams}&callback=${cbName}`;
    script.onerror = function() {
      delete window[cbName];
      document.body.removeChild(script);
      reject("Lỗi mạng JSONP");
    };
    document.body.appendChild(script);
  });
}

async function callGasApiPost(actionName, postData) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: actionName, data: postData }),
    redirect: "follow"
  });
  return await res.json();
}

function formatDateTimeVN(dateObj) {
  return dateObj.toLocaleString("vi-VN");
}

// ==================== PHÂN QUYỀN MÃ PIN ====================
const ROLE_ACCOUNTS = {
  "9999": { role: "GVCN", title: "Thầy Quốc Mẫn (GVCN)", team: "Tất cả" },
  "1001": { role: "LopTruong", title: "Tấn An (Lớp trưởng)", team: "Tất cả" },
  "1002": { role: "BiThu", title: "Quyết Tâm (Lớp phó Học tập)", team: "Tất cả" },
  "1003": { role: "LP_LaoDong", title: "Thái Hoàng (Lớp phó Lao động)", team: "Tất cả" },
  "1004": { role: "ThuQuy", title: "Nguyễn My Su (Thủ quỹ / Thư ký)", team: "Tất cả" },
  "1011": { role: "ToTruong", title: "Hiền Đức (TT Tổ 1)", team: "Tổ 1" },
  "1012": { role: "ToTruong", title: "Ngọc Thuỳ (TT Tổ 2)", team: "Tổ 2" },
  "1013": { role: "ToTruong", title: "Đức Tài (TT Tổ 3)", team: "Tổ 3" },
  "1014": { role: "ToTruong", title: "Gia Bảo (TT Tổ 4)", team: "Tổ 4" }
};

function executeLoginPin() {
  const pin = document.getElementById("globalPinInput").value.trim();
  if (ROLE_ACCOUNTS[pin]) {
    activeUserRole = { ...ROLE_ACCOUNTS[pin], pin: pin };
    document.getElementById("userDisplayName").innerText = activeUserRole.title;
    document.getElementById("authModal").classList.add("hidden");

    const dutyText = document.getElementById("roleDutyText");
    if (activeUserRole.role === "ToTruong") {
      const target = crossMatrix[activeUserRole.team] || "Tổ khác";
      dutyText.innerText = `${activeUserRole.title} ➔ Chấm chéo: [${target}]`;
      document.getElementById("btnOpenMatrix").classList.add("hidden");
    } else if (activeUserRole.role === "GVCN") {
      dutyText.innerText = "Toàn quyền GVCN";
      document.getElementById("btnOpenMatrix").classList.remove("hidden");
    } else {
      dutyText.innerText = activeUserRole.title;
      document.getElementById("btnOpenMatrix").classList.add("hidden");
    }

    alert(`Đăng nhập thành công: ${activeUserRole.title}`);
    loadAttendanceList();
  } else {
    alert("Sai mã PIN!");
  }
}

function openMatrixModal() {
  if (activeUserRole.role !== "GVCN") {
    alert("Chỉ GVCN mới có quyền thiết lập ma trận chấm chéo!");
    return;
  }
  document.getElementById("matrixT1").value = crossMatrix["Tổ 1"] || "Tổ 2";
  document.getElementById("matrixT2").value = crossMatrix["Tổ 2"] || "Tổ 3";
  document.getElementById("matrixT3").value = crossMatrix["Tổ 3"] || "Tổ 4";
  document.getElementById("matrixT4").value = crossMatrix["Tổ 4"] || "Tổ 1";
  document.getElementById("matrixModal").classList.remove("hidden");
}

function closeMatrixModal() {
  document.getElementById("matrixModal").classList.add("hidden");
}

async function saveCrossMatrix() {
  const t1 = document.getElementById("matrixT1").value;
  const t2 = document.getElementById("matrixT2").value;
  const t3 = document.getElementById("matrixT3").value;
  const t4 = document.getElementById("matrixT4").value;

  const set = new Set([t1, t2, t3, t4]);
  if (set.size < 4) {
    alert("Ma trận không hợp lệ: Mỗi tổ chỉ được chấm đúng 01 tổ khác!");
    return;
  }

  crossMatrix = { "Tổ 1": t1, "Tổ 2": t2, "Tổ 3": t3, "Tổ 4": t4 };
  try {
    const res = await callGasApiPost("saveCrossInspectionMatrix", { pin: activeUserRole.pin, matrix: crossMatrix });
    alert(res.message);
    closeMatrixModal();
  } catch (e) {
    alert("Lỗi lưu ma trận!");
  }
}

async function loadCrossMatrix() {
  try {
    const json = await callGasApiGet("action=getCrossInspectionMatrix");
    if (json && json.status === "success" && json.matrix) {
      crossMatrix = json.matrix;
    }
  } catch (e) {}
}

// ==================== TỰ ĐỘNG ĐỒNG BỘ NGÀY & BUỔI HỌC ====================
function onAttendDateChanged() {
  const dateVal = document.getElementById("attendDateInput").value;
  if (!dateVal) return;

  const chosenDate = new Date(dateVal);
  const day = chosenDate.getDay();
  const select = document.getElementById("attendSessionSelect");

  if (day === 1) select.value = "T2_SANG";
  else if (day === 2) select.value = "T3_SANG";
  else if (day === 3) select.value = "T4_SANG";
  else if (day === 4) select.value = "T5_SANG";
  else if (day === 5) select.value = "T6_SANG";

  loadAttendanceList();
}

// ==================== TIẾN ĐỘ TIẾT HỌC ====================
const SCHEDULE_CONFIG = [
  { key: 'T2_SANG', day: 1, isMorning: true, dayName: 'Thứ 2', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 1' },
  { key: 'T2_CHIEU', day: 1, isMorning: false, dayName: 'Thứ 2', session: 'Chiều', time: '13:45 - 16:40', team: 'Tổ 2' },
  { key: 'T3_SANG', day: 2, isMorning: true, dayName: 'Thứ 3', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 3' },
  { key: 'T3_CHIEU', day: 2, isMorning: false, dayName: 'Thứ 3', session: 'Chiều', time: '13:45 - 16:40', team: 'Tổ 4' },
  { key: 'T4_SANG', day: 3, isMorning: true, dayName: 'Thứ 4', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 1' },
  { key: 'T5_SANG', day: 4, isMorning: true, dayName: 'Thứ 5', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 2' },
  { key: 'T6_SANG', day: 5, isMorning: true, dayName: 'Thứ 6', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 3 & 4' }
];

const DETAILED_PERIODS = [
  { name: "Sinh hoạt 15 phút", start: 6*60 + 45, end: 7*60 + 0 },
  { name: "Tiết 1 (Sáng)", start: 7*60 + 0, end: 7*60 + 45 },
  { name: "Tiết 2 (Sáng)", start: 7*60 + 50, end: 8*60 + 35 },
  { name: "Ra chơi sáng (15p)", start: 8*60 + 35, end: 8*60 + 50 },
  { name: "Tiết 3 (Sáng)", start: 8*60 + 55, end: 9*60 + 40 },
  { name: "Tiết 4 (Sáng)", start: 9*60 + 45, end: 10*60 + 30 },
  { name: "Tiết 5 (Sáng)", start: 10*60 + 35, end: 11*60 + 20 },
  { name: "Vào lớp chiều (15p)", start: 13*60 + 45, end: 14*60 + 0 },
  { name: "Tiết 1 (Chiều)", start: 14*60 + 0, end: 14*60 + 45 },
  { name: "Tiết 2 (Chiều)", start: 14*60 + 50, end: 15*60 + 35 },
  { name: "Ra chơi chiều (15p)", start: 15*60 + 35, end: 15*60 + 50 },
  { name: "Tiết 3 (Chiều)", start: 15*60 + 55, end: 16*60 + 40 }
];

function updateLiveDashboardEngine() {
  const now = new Date();
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const clockEl = document.getElementById("digitalClockText");
  if (clockEl) clockEl.innerText = now.toLocaleTimeString('vi-VN');

  const isMorning = currentMinutes <= 720;
  const match = SCHEDULE_CONFIG.find(s => s.day === day && s.isMorning === isMorning);

  if (match) {
    document.getElementById("liveBannerSub").innerText = `${match.dayName.toUpperCase()} • ${match.session.toUpperCase()}`;
    document.getElementById("liveBannerTitle").innerText = `${match.session} ${match.dayName} • Giờ học: ${match.time}`;
    document.getElementById("liveDutyTeam").innerText = match.team.toUpperCase();
  } else {
    document.getElementById("liveBannerSub").innerText = "NGOÀI GIỜ LÊN LỚP";
    document.getElementById("liveBannerTitle").innerText = "Hiện tại không có ca học chính khóa";
    document.getElementById("liveDutyTeam").innerText = "Nghỉ";
  }

  const curPeriod = DETAILED_PERIODS.find(p => currentMinutes >= p.start && currentMinutes < p.end);
  const progressBar = document.getElementById("periodProgressBar");
  const progressLabel = document.getElementById("currentPeriodLabel");
  const progressRemaining = document.getElementById("periodTimeRemaining");

  if (curPeriod) {
    const total = curPeriod.end - curPeriod.start;
    const elapsed = currentMinutes - curPeriod.start;
    const percent = Math.min(100, Math.round((elapsed / total) * 100));
    const remainMins = curPeriod.end - currentMinutes;

    progressLabel.innerText = `Đang học: ${curPeriod.name}`;
    progressRemaining.innerText = `Còn ${remainMins} phút (${percent}%)`;
    progressBar.style.width = `${percent}%`;
  } else {
    progressLabel.innerText = "Đang ngoài giờ tiết học";
    progressRemaining.innerText = "0%";
    progressBar.style.width = "0%";
  }
}
setInterval(updateLiveDashboardEngine, 1000);

// ==================== SƠ ĐỒ LỚP HỌC 4 DÃY ====================
const initialSeatingLayout = [
  [
    { name: "Quốc Hưng", role: "" }, { name: "Hữu Phong", role: "" },
    { name: "Quyết Tâm", role: "Phó HT" }, { name: "Đức Tài", role: "TT T3" },
    { name: "Đồng Tiến", role: "" }, { name: "Khởi Nghĩa", role: "" },
    { name: "Đức Quang", role: "" }, { name: "Bảo Nam", role: "" }
  ],
  [
    { name: "Văn Vỹ", role: "" }, { name: "Huy Vũ", role: "" },
    { name: "Bảo Khôi", role: "" }, { name: "Hà Quý", role: "" },
    { name: "Khánh Nhi", role: "" }, { name: "Anh Thư", role: "" },
    { name: "Trúc Phượng", role: "" }, { name: "Ngọc Thuỳ", role: "TT T2" }
  ],
  [
    { name: "Nguyễn My Su", role: "Thủ quỹ / Thư ký" }, { name: "Nhã Trân", role: "" },
    { name: "Thảo Ngân", role: "Bí thư" }, { name: "Kim Nhung", role: "" },
    { name: "Văn Khoa", role: "" }, { name: "Thái Hoàng", role: "Phó LĐ" },
    { name: "Minh Đức", role: "" }, { name: "Văn Nhuận", role: "" }
  ],
  [
    { name: "Hiền Trân", role: "Phó VTM" }, { name: "Như Ý", role: "Thi đua" },
    { name: "Thanh Trà", role: "" }, { name: "Hà My", role: "" },
    { name: "Hiền Đức", role: "TT T1" }, { name: "Thành Huy", role: "Cờ đỏ" },
    { name: "Tấn An", role: "Lớp trưởng" }, { name: "Hiếu Trung", role: "" }
  ],
  [
    { name: "Gia Bảo", role: "TT T4" }, { name: "Minh Nhựt", role: "Cờ đỏ" },
    { name: "Thành Danh", role: "" }, { name: "Quốc Phong", role: "" },
    { name: "Bảo Trâm", role: "" }, { name: "Thảo Quyên", role: "" },
    { name: "", role: "" }, { name: "Bảo Sương", role: "" }
  ],
  [
    { name: "Trí Dũng", role: "" }, { name: "", role: "" },
    { name: "Tấn Sang", role: "" }, { name: "Thanh Khiêm", role: "" },
    { name: "Minh Quân", role: "" }, { name: "Hoàng Phúc", role: "" },
    { name: "", role: "" }, { name: "Xuân Đông", role: "" }
  ]
];

let currentSeatingLayout = JSON.parse(localStorage.getItem('classroom_10A12_glass_v5')) || JSON.parse(JSON.stringify(initialSeatingLayout));
let isTeacherPerspective = false;

function saveSeatingState() {
  localStorage.setItem('classroom_10A12_glass_v5', JSON.stringify(currentSeatingLayout));
}

function togglePerspective() {
  isTeacherPerspective = !isTeacherPerspective;
  const podium = document.getElementById("podiumArea");
  const badge = document.getElementById("perspectiveLabelBadge");

  if (isTeacherPerspective) {
    podium.className = "grid grid-cols-12 gap-3 sm:gap-4 order-first mb-2";
    badge.innerText = "Góc nhìn: Giáo viên (Bục giảng ở trên)";
  } else {
    podium.className = "grid grid-cols-12 gap-3 sm:gap-4 order-last mt-2";
    badge.innerText = "Góc nhìn: Học sinh (Bục giảng ở dưới)";
  }
  renderSeatingChart();
}

function renderSeatingChart() {
  const container = document.getElementById("seatingGridRows");
  if (!container) return;
  container.innerHTML = "";

  const rowIndices = isTeacherPerspective ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5];

  rowIndices.forEach((rIndex) => {
    const rowData = currentSeatingLayout[rIndex];
    const rowNumber = 6 - rIndex;

    const rowDiv = document.createElement("div");
    rowDiv.className = "grid grid-cols-12 gap-2 sm:gap-4 items-center";

    const leftDeskGroup = document.createElement("div");
    leftDeskGroup.className = "col-span-5 grid grid-cols-2 gap-2";
    leftDeskGroup.appendChild(createDeskElement(rowData[0], rowData[1], rIndex, 0, 1));
    leftDeskGroup.appendChild(createDeskElement(rowData[2], rowData[3], rIndex, 2, 3));
    rowDiv.appendChild(leftDeskGroup);

    const aisleDiv = document.createElement("div");
    aisleDiv.className = "col-span-2 text-center text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-center";
    aisleDiv.innerHTML = `<span class="px-2 py-0.5 rounded-md glass-card text-sky-300">H${rowNumber}</span>`;
    rowDiv.appendChild(aisleDiv);

    const rightDeskGroup = document.createElement("div");
    rightDeskGroup.className = "col-span-5 grid grid-cols-2 gap-2";
    rightDeskGroup.appendChild(createDeskElement(rowData[4], rowData[5], rIndex, 4, 5));
    rightDeskGroup.appendChild(createDeskElement(rowData[6], rowData[7], rIndex, 6, 7));
    rowDiv.appendChild(rightDeskGroup);

    container.appendChild(rowDiv);
  });
}

function createDeskElement(seat1, seat2, rIndex, c1, c2) {
  const desk = document.createElement("div");
  desk.className = "glass-card rounded-2xl grid grid-cols-2 divide-x divide-sky-400/20 overflow-hidden shadow-sm";
  desk.appendChild(createSeatCell(seat1, rIndex, c1));
  desk.appendChild(createSeatCell(seat2, rIndex, c2));
  return desk;
}

function createSeatCell(student, rIndex, cIndex) {
  const cell = document.createElement("div");
  const isEmpty = !student.name;
  cell.className = `seat-cell p-2 sm:p-2.5 min-h-[58px] flex flex-col justify-center items-center text-center cursor-pointer select-none ${isEmpty ? 'bg-white/[0.01]' : 'bg-white/[0.03]'}`;
  cell.draggable = !isEmpty;

  if (!isEmpty) {
    cell.innerHTML = `
      <div class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-glow-emerald"></span>
        <span class="text-xs font-black text-white leading-tight tracking-tight">${student.name}</span>
      </div>
      ${student.role ? `<span class="text-[9.5px] font-bold text-sky-300 mt-0.5 leading-none">(${student.role})</span>` : ''}
    `;
  } else {
    cell.innerHTML = `<span class="text-[10px] text-slate-600 font-bold">+ Trống</span>`;
  }

  cell.addEventListener("click", () => {
    if (!isEmpty) {
      const matched = allStudents.find(s => s.hoTen.includes(student.name) || student.name.includes(s.hoTen));
      const stId = matched ? matched.id : `HS${rIndex * 8 + cIndex + 1}`;
      const stTeam = matched ? matched.to : "Tổ 1";
      openScoringModalForStudent(stId, student.name, stTeam);
    }
  });

  cell.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ r: rIndex, c: cIndex }));
    cell.classList.add("dragging");
  });

  cell.addEventListener("dragend", () => cell.classList.remove("dragging"));
  cell.addEventListener("dragover", (e) => { e.preventDefault(); cell.classList.add("drag-over"); });
  cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));

  cell.addEventListener("drop", (e) => {
    e.preventDefault();
    cell.classList.remove("drag-over");
    const src = JSON.parse(e.dataTransfer.getData("text/plain"));

    const temp = currentSeatingLayout[rIndex][cIndex];
    currentSeatingLayout[rIndex][cIndex] = currentSeatingLayout[src.r][src.c];
    currentSeatingLayout[src.r][src.c] = temp;

    saveSeatingState();
    renderSeatingChart();
  });

  return cell;
}

async function syncSeatingToSheets() {
  const pin = prompt("Nhập mã PIN xác nhận (GVCN: 9999 hoặc Lớp trưởng: 1001):");
  if (!pin) return;

  const flatLayout = [];
  currentSeatingLayout.forEach((row, r) => {
    row.forEach((seat, c) => {
      flatLayout.push({ r: r, c: c, name: seat.name || "", role: seat.role || "" });
    });
  });

  try {
    const res = await callGasApiPost("saveSeatingLayout", { pin: pin, layoutMatrix: flatLayout });
    alert(res.message);
  } catch (err) {
    alert("Lỗi kết nối máy chủ Google Sheets!");
  }
}

// ==================== ĐIỂM DANH CHUYÊN CẦN ====================
let attendanceList = [];
let currentAttendTeam = 'ALL';

async function loadAttendanceList() {
  const dateVal = document.getElementById("attendDateInput").value || new Date().toISOString().slice(0, 10);
  const dateVN = dateVal.split('-').reverse().join('/');
  const sessionKey = document.getElementById("attendSessionSelect").value;

  try {
    const json = await callGasApiGet(`action=getAttendanceData&date=${encodeURIComponent(dateVN)}&sessionKey=${encodeURIComponent(sessionKey)}`);
    if (json && json.status === "success") {
      attendanceList = json.data;
      isAttendanceLockedNow = json.isLocked;

      const badge = document.getElementById("lockStatusBadge");
      const banner = document.getElementById("lockedWarningBanner");

      if (isAttendanceLockedNow) {
        badge.className = "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/35";
        badge.innerHTML = `<i class="fa-solid fa-lock"></i> Đã khóa sổ (Sau 07:15 / 14:15)`;
        banner.classList.remove("hidden");
      } else {
        badge.className = "px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/35";
        badge.innerHTML = `<i class="fa-solid fa-lock-open"></i> Đang mở sổ`;
        banner.classList.add("hidden");
      }

      renderAttendanceRows();
    }
  } catch (e) {}
}

function renderAttendanceRows() {
  const container = document.getElementById("attendListContainer");
  if (!container) return;
  const filtered = (currentAttendTeam === 'ALL') ? attendanceList : attendanceList.filter(s => s.to === currentAttendTeam);

  if (filtered.length === 0) {
    container.innerHTML = `<p class="p-8 text-center text-xs text-slate-500 italic">Không có dữ liệu trong tổ này.</p>`;
    return;
  }

  const isDisabled = isAttendanceLockedNow && activeUserRole.role !== "GVCN";

  container.innerHTML = filtered.map(st => `
    <div class="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-white/[0.04] transition">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-300 font-black flex items-center justify-center text-xs">
          ${st.hoTen.split(' ').pop().charAt(0)}
        </div>
        <div>
          <span class="font-extrabold text-white text-xs">${st.hoTen}</span>
          <span class="text-[10px] text-sky-300 bg-sky-500/20 border border-sky-400/30 px-1.5 py-0.2 rounded font-bold ml-1.5">${st.to}</span>
          <span class="text-[10px] text-slate-400 block font-mono mt-0.5">${st.reason ? 'Ghi chú: ' + st.reason : ''}</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button onclick="handleAttendanceClick('${st.id}', 'CO_MAT')" ${isDisabled ? 'disabled' : ''} class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${st.status === 'CO_MAT' ? 'bg-emerald-500 text-white shadow-glow-emerald' : 'glass-card text-slate-400 hover:text-white'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}">Có mặt</button>
        <button onclick="handleAttendanceClick('${st.id}', 'DI_TRE')" ${isDisabled ? 'disabled' : ''} class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${st.status === 'DI_TRE' ? 'bg-amber-500 text-white shadow-md' : 'glass-card text-slate-400 hover:text-white'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}">Đi trễ (-10đ)</button>
        <button onclick="handleAttendanceClick('${st.id}', 'VANG_PHEP')" ${isDisabled ? 'disabled' : ''} class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${st.status === 'VANG_PHEP' ? 'bg-blue-600 text-white shadow-md' : 'glass-card text-slate-400 hover:text-white'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}">Có phép</button>
        <button onclick="handleAttendanceClick('${st.id}', 'KHONG_PHEP')" ${isDisabled ? 'disabled' : ''} class="px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${st.status === 'KHONG_PHEP' ? 'bg-rose-500 text-white shadow-md' : 'glass-card text-slate-400 hover:text-white'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}">Không phép (-20đ)</button>
      </div>
    </div>
  `).join('');
}

async function handleAttendanceClick(studentId, newStatus) {
  if (activeUserRole.role !== "GVCN" && activeUserRole.role !== "LopTruong" && activeUserRole.role !== "BiThu") {
    alert("Chỉ Lớp trưởng, Lớp phó Học tập hoặc GVCN mới có quyền điểm danh!");
    return;
  }

  // Ghi chú không bắt buộc (bấm Hủy hoặc để trống đều chấp nhận)
  let reason = "";
  if (newStatus === "VANG_PHEP" || newStatus === "KHONG_PHEP" || newStatus === "DI_TRE") {
    const inputPrompt = prompt(`Nhập ghi chú lý do cho trạng thái [${newStatus}] (Không bắt buộc - có thể để trống):`);
    reason = inputPrompt !== null ? inputPrompt.trim() : "";
  }

  const dateVal = document.getElementById("attendDateInput").value || new Date().toISOString().slice(0, 10);
  const dateVN = dateVal.split('-').reverse().join('/');
  const sessionKey = document.getElementById("attendSessionSelect").value;

  try {
    const res = await callGasApiPost("saveAttendanceWithAntiDuplicate", {
      pin: activeUserRole.pin,
      date: dateVN,
      sessionKey: sessionKey,
      studentId: studentId,
      newStatus: newStatus,
      reason: reason
    });

    alert(res.message);
    if (res.status === "success") {
      loadAttendanceList();
      loadWeeklyOverview();
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ điểm danh!");
  }
}

function overrideAttendanceLock() {
  const pin = prompt("Nhập mã PIN GVCN để mở khóa sổ ngoại lệ:");
  if (pin === "9999") {
    isAttendanceLockedNow = false;
    activeUserRole = { role: "GVCN", name: "Thầy Quốc Mẫn", pin: "9999", team: "Tất cả" };
    alert("GVCN đã mở khóa sổ ca này thành công!");
    renderAttendanceRows();
  } else {
    alert("Sai mã PIN GVCN!");
  }
}

function filterAttendTeam(team) {
  currentAttendTeam = team;
  ['ALL', 'Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].forEach(t => {
    const btn = document.getElementById(`attTeam-${t}`);
    if (btn) btn.className = (t === team) ? "px-3.5 py-1.5 bg-brand-600 text-white font-black text-xs rounded-xl shadow-glow-indigo" : "px-3 py-1.5 glass-card text-slate-300 font-bold text-xs rounded-xl";
  });
  renderAttendanceRows();
}

function copyAbsenceNotice() {
  const absentees = attendanceList.filter(s => s.status !== 'CO_MAT');
  if (absentees.length === 0) {
    alert("Ca học này cả lớp đi học đầy đủ 100%!");
    return;
  }
  const dateVal = document.getElementById("attendDateInput").value;
  const sessionText = document.getElementById("attendSessionSelect").selectedOptions[0].text;
  let msg = `[CHỐT SỔ ĐIỂM DANH 10A12 - ${sessionText.toUpperCase()}]\n`;
  msg += `Ngày: ${dateVal} • Sĩ số: 45/45 (Hiện diện: ${45 - absentees.length} | Vắng/Trễ: ${absentees.length})\n\n`;
  absentees.forEach((s, idx) => {
    msg += `${idx + 1}. ${s.hoTen} (${s.to}) - [${s.status}]${s.reason ? ': ' + s.reason : ''}\n`;
  });
  msg += `\nLớp trưởng xác nhận: Tấn An.`;
  navigator.clipboard.writeText(msg).then(() => alert("Đã sao chép báo cáo điểm danh gửi Zalo!"));
}

// ==================== QUẢN LÝ QUỸ LỚP ====================
let classFundList = [];
let currentFundTeamFilter = 'ALL';
let expenseTransactions = [];

async function loadFundData() {
  try {
    const [sumJson, listJson] = await Promise.all([
      callGasApiGet("action=getFundStatement"),
      callGasApiGet("action=getFundCollectionList&collectionName=Quỹ Kỳ 1")
    ]);

    if (sumJson && sumJson.status === "success") {
      const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + " đ";
      document.getElementById("sumIncome").innerText = fmt(sumJson.summary.totalIncome);
      document.getElementById("sumExpense").innerText = fmt(sumJson.summary.totalExpense);
      document.getElementById("currentBalance").innerText = fmt(sumJson.summary.balance);

      expenseTransactions = sumJson.transactions || [];
      document.getElementById("sumExpenseCount").innerText = `${expenseTransactions.length} phiếu chi hợp lệ`;
      renderExpenseHistory();
    }

    if (listJson && listJson.status === "success") {
      classFundList = listJson.data;
      const paidCount = classFundList.filter(s => s.paid).length;
      document.getElementById("sumIncomeRatio").innerText = `Đã thu: ${paidCount}/45 HS (${Math.round(paidCount/45*100)}%)`;
      renderFundChecklist();
    }
  } catch (e) {}
}

function renderFundChecklist() {
  const container = document.getElementById("fundChecklistContainer");
  if (!container) return;

  const filtered = (currentFundTeamFilter === 'ALL')
    ? classFundList
    : classFundList.filter(s => s.to === currentFundTeamFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<p class="col-span-full p-8 text-center text-xs text-slate-500 italic">Không có dữ liệu trong tổ này.</p>`;
    return;
  }

  container.innerHTML = filtered.map(st => `
    <label class="flex items-center justify-between p-3 rounded-2xl glass-card cursor-pointer select-none transition ${st.paid ? 'border-emerald-400/50 bg-emerald-500/10' : ''}">
      <div class="flex items-center gap-3">
        <input type="checkbox" ${st.paid ? 'checked' : ''} onchange="toggleFundLocal('${st.id}', this.checked)" class="w-4 h-4 text-emerald-500 rounded accent-emerald-500">
        <div>
          <p class="text-xs font-black text-white leading-tight">${st.hoTen}</p>
          <span class="text-[10px] text-slate-400 font-mono">${st.id} • ${st.to}</span>
        </div>
      </div>
      <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full ${st.paid ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-400/30' : 'text-rose-300 bg-rose-500/20 border border-rose-400/30'}">${st.paid ? 'Đã nộp' : 'Chưa nộp'}</span>
    </label>
  `).join('');
}

function toggleFundLocal(id, status) {
  const st = classFundList.find(s => s.id === id);
  if (st) {
    st.paid = status;
    const paidCount = classFundList.filter(s => s.paid).length;
    document.getElementById("sumIncomeRatio").innerText = `Đã thu: ${paidCount}/45 HS (${Math.round(paidCount/45*100)}%)`;
    renderFundChecklist();
  }
}

function filterFundTeam(team) {
  currentFundTeamFilter = team;
  ['ALL', 'Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].forEach(t => {
    const btn = document.getElementById(`fundTeam-${t}`);
    if (btn) btn.className = (t === team)
      ? "px-2.5 py-1 bg-brand-600 text-white font-black text-[11px] rounded-lg shadow-sm"
      : "px-2.5 py-1 glass-card text-slate-300 font-bold text-[11px] rounded-lg";
  });
  renderFundChecklist();
}

async function saveFundCollectionData() {
  const pin = prompt("Nhập mã PIN Thủ quỹ (Nguyễn My Su: 1004) hoặc GVCN (9999):");
  if (!pin) return;

  const paidStudentIds = classFundList.filter(s => s.paid).map(s => s.id);
  try {
    const res = await callGasApiPost("saveFundCollection", {
      pin: pin,
      collectionName: "Quỹ Kỳ 1",
      defaultAmount: 100000,
      paidStudentIds: paidStudentIds
    });
    alert(res.message);
    loadFundData();
  } catch (e) {
    alert("Lỗi kết nối máy chủ Google Sheets!");
  }
}

function renderExpenseHistory() {
  const container = document.getElementById("expenseHistoryContainer");
  if (!container) return;

  if (expenseTransactions.length === 0) {
    container.innerHTML = `<p class="p-8 text-center text-slate-500 italic">Chưa có khoản chi nào được ghi nhận.</p>`;
    return;
  }

  const fmt = n => new Intl.NumberFormat('vi-VN').format(n) + " đ";
  container.innerHTML = expenseTransactions.map(tx => `
    <div class="p-3 glass-card rounded-2xl flex justify-between items-center transition">
      <div class="space-y-0.5">
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-black text-white">${tx.note || tx.category}</span>
          <span class="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-400/30 px-1.5 py-0.2 rounded font-bold">${tx.category}</span>
        </div>
        <p class="text-[10px] text-slate-400 font-mono">${tx.time} • Bởi: ${tx.actor}</p>
      </div>
      <span class="text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl">-${fmt(tx.amount)}</span>
    </div>
  `).join('');
}

function openExpenseModal() {
  document.getElementById("expenseAmountInput").value = "";
  document.getElementById("expenseNoteInput").value = "";
  document.getElementById("expensePinInput").value = (activeUserRole.role === 'ThuQuy' || activeUserRole.role === 'GVCN') ? activeUserRole.pin : "";
  document.getElementById("expenseThresholdNotice").classList.add("hidden");
  document.getElementById("expenseModal").classList.remove("hidden");
}

function closeExpenseModal() {
  document.getElementById("expenseModal").classList.add("hidden");
}

function checkExpenseThresholdNotice() {
  const val = Number(document.getElementById("expenseAmountInput").value) || 0;
  const notice = document.getElementById("expenseThresholdNotice");
  const lblPin = document.getElementById("lblPinApprover");
  if (val >= 200000) {
    notice.classList.remove("hidden");
    lblPin.innerHTML = `<span class="text-rose-600 font-black">Bắt buộc mã PIN GVCN duyệt (9999):</span>`;
  } else {
    notice.classList.add("hidden");
    lblPin.innerText = "Mã PIN xác nhận (Thủ quỹ: 1004 / GVCN: 9999):";
  }
}

async function submitExpenseEntry() {
  const amount = Number(document.getElementById("expenseAmountInput").value) || 0;
  const category = document.getElementById("expenseCategorySelect").value;
  const note = document.getElementById("expenseNoteInput").value.trim();
  const pin = document.getElementById("expensePinInput").value.trim();

  if (amount <= 0) {
    alert("Vui lòng nhập số tiền chi lớn hơn 0 đ!");
    return;
  }
  if (!note) {
    alert("Vui lòng ghi rõ nội dung chi và người nhận tiền!");
    return;
  }
  if (!pin) {
    alert("Vui lòng nhập mã PIN xác nhận giải ngân!");
    return;
  }

  const btn = document.getElementById("btnSubmitExpense");
  btn.disabled = true;
  btn.innerText = "Đang xử lý...";

  try {
    const res = await callGasApiPost("addExpenseTransaction", {
      pin: pin,
      amount: amount,
      category: category,
      note: note
    });

    alert(res.message);
    if (res.status === "success") {
      closeExpenseModal();
      loadFundData();
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ khi xuất quỹ!");
  } finally {
    btn.disabled = false;
    btn.innerText = "Xác Nhận Xuất Quỹ";
  }
}

function copyFundReminderZalo() {
  const unpaid = classFundList.filter(s => !s.paid);
  if (unpaid.length === 0) {
    alert("Tất cả 45 học sinh lớp 10A12 đã hoàn thành đóng quỹ lớp 100%!");
    return;
  }

  let msg = `Kính gửi Quý Phụ huynh và các em học sinh lớp 10A12 (K58-QT),\n`;
  msg += `Hiện tại Ban cán sự lớp đang tiến hành tổng kết đợt thu [Quỹ Lớp Học Kỳ 1 - Định mức 100.000 đ/em] để phục vụ các hoạt động học tập, khen thưởng và phong trào của lớp.\n\n`;
  msg += `Hệ thống ghi nhận còn một số bạn chưa hoàn thành nộp quỹ. Kính nhờ Quý Phụ huynh hỗ trợ kiểm tra và đóng cho các em trước thời hạn quy định:\n`;
  unpaid.forEach((s, idx) => {
    msg += `${idx + 1}. ${s.hoTen} (${s.to})\n`;
  });
  msg += `\n*Hình thức đóng: Nộp tiền mặt trực tiếp cho Thủ quỹ Nguyễn My Su hoặc chuyển khoản qua mã VietQR trên cổng tra cứu tracuu.html.\n`;
  msg += `GVCN: Thầy Trần Dương Quốc Mẫn (SĐT/Zalo: 0383 618 849). Trân trọng cảm ơn Quý Phụ huynh!`;

  navigator.clipboard.writeText(msg).then(() => {
    alert(`Đã sao chép tin nhắn nhắc nộp quỹ cho ${unpaid.length} học sinh!`);
  });
}

// ==================== CHẤM ĐIỂM CHÉO NỀ NẾP ====================
let currentScoringTarget = null;
let currentScoringMode = 'PENALTY';

function openScoringModalForStudent(studentId, studentName, team) {
  if (activeUserRole.role === "ToTruong") {
    const assignedTarget = crossMatrix[activeUserRole.team];
    if (team !== assignedTarget) {
      alert(`Bạn là ${activeUserRole.title}, được phân công chấm chéo [${assignedTarget}]. Không được chấm [${team}]!`);
      return;
    }
  }

  currentScoringTarget = { studentId, studentName, team };
  document.getElementById("scoringModalSub").innerText = `Học sinh: ${studentName} (${team}) • Người chấm: ${activeUserRole.title}`;
  document.getElementById("scoringNoteInput").value = "";
  document.getElementById("scoringPinInput").value = activeUserRole.pin || "";
  setScoringType('PENALTY');
  document.getElementById("scoringModal").classList.remove("hidden");
}

function closeScoringModal() {
  document.getElementById("scoringModal").classList.add("hidden");
}

function setScoringType(type) {
  currentScoringMode = type;
  const select = document.getElementById("scoringCriteriaSelect");
  select.innerHTML = "";

  if (type === 'PENALTY') {
    document.getElementById("btnTabPenalty").className = "py-2.5 rounded-xl bg-rose-600 text-white shadow-md";
    document.getElementById("btnTabBonus").className = "py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200";

    THI_DUA_RULES.PENALTY.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.points;
      opt.text = `[${item.group}] ${item.name} (${item.points}đ)`;
      opt.dataset.code = item.code;
      opt.dataset.name = item.name;
      select.appendChild(opt);
    });
  } else {
    document.getElementById("btnTabBonus").className = "py-2.5 rounded-xl bg-emerald-600 text-white shadow-md";
    document.getElementById("btnTabPenalty").className = "py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200";

    THI_DUA_RULES.BONUS.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.points;
      opt.text = `${item.name} (+${item.points}đ)`;
      opt.dataset.code = item.code;
      opt.dataset.name = item.name;
      select.appendChild(opt);
    });
  }
  onCriteriaSelected();
}

function onCriteriaSelected() {
  const select = document.getElementById("scoringCriteriaSelect");
  const selectedOpt = select.selectedOptions[0];
  if (selectedOpt) {
    document.getElementById("scoringPointsInput").value = selectedOpt.value;
  }
}

async function submitScoringEntry() {
  const pin = document.getElementById("scoringPinInput").value.trim() || activeUserRole.pin;
  if (!pin) {
    alert("Vui lòng nhập mã PIN người chấm!");
    return;
  }

  const select = document.getElementById("scoringCriteriaSelect");
  const selectedOpt = select.selectedOptions[0];
  const points = Number(document.getElementById("scoringPointsInput").value);
  const criteriaName = selectedOpt.dataset.name;
  const criteriaCode = selectedOpt.dataset.code;
  const note = document.getElementById("scoringNoteInput").value.trim();
  const sessionKey = document.getElementById("attendSessionSelect").value;

  const btn = document.getElementById("btnSubmitScoring");
  btn.disabled = true;
  btn.innerText = "Đang ghi nhận...";

  try {
    const res = await callGasApiPost("submitDailyScore", {
      pin: pin,
      studentId: currentScoringTarget.studentId,
      studentName: currentScoringTarget.studentName,
      criteria: criteriaName,
      criteriaCode: criteriaCode,
      points: points,
      note: note,
      sessionKey: sessionKey
    });

    alert(res.message);
    if (res.status === "success") {
      closeScoringModal();
      loadWeeklyOverview();
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ Google Sheets!");
  } finally {
    btn.disabled = false;
    btn.innerText = "Xác Nhận Lưu Điểm";
  }
}

// ==================== TỔNG QUAN VI PHẠM & LAO ĐỘNG PHẠT ====================
let weeklyViolations = [];
let autoScheduleResults = [];
let severePunishmentStudents = [];

const BASE_DUTY_SHIFTS = [
  { shiftId: 0, dayName: "Thứ 2 (Sáng)", time: "06:45 – 11:20", mainTeam: "Tổ 1 (Hiền Đức)", inspector: "Hiền Đức & Thái Hoàng" },
  { shiftId: 1, dayName: "Thứ 2 (Chiều)", time: "13:45 – 16:40", mainTeam: "Tổ 2 (Ngọc Thuỳ)", inspector: "Ngọc Thuỳ & Thái Hoàng" },
  { shiftId: 2, dayName: "Thứ 3 (Sáng)", time: "06:45 – 11:20", mainTeam: "Tổ 3 (Đức Tài)", inspector: "Đức Tài & Thái Hoàng" },
  { shiftId: 3, dayName: "Thứ 3 (Chiều)", time: "13:45 – 16:40", mainTeam: "Tổ 4 (Gia Bảo)", inspector: "Gia Bảo & Thái Hoàng" },
  { shiftId: 4, dayName: "Thứ 4 (Sáng)", time: "06:45 – 11:20", mainTeam: "Tổ 1 (Hiền Đức)", inspector: "Hiền Đức & Thái Hoàng" },
  { shiftId: 5, dayName: "Thứ 5 (Sáng)", time: "06:45 – 11:20", mainTeam: "Tổ 2 (Ngọc Thuỳ)", inspector: "Ngọc Thuỳ & Thái Hoàng" },
  { shiftId: 6, dayName: "Thứ 6 (Sáng)", time: "06:45 – 11:20", mainTeam: "Tổ 3 & 4 (Đức Tài & Gia Bảo)", inspector: "Thái Hoàng (Tổng duyệt)" }
];

async function loadWeeklyOverview() {
  try {
    const json = await callGasApiGet("action=getRecentNotifications");
    if (json && json.status === "success") {
      weeklyViolations = json.data.filter(v => Number(v.points) < 0 && !v.note?.includes("[ĐÃ HỦY]"));
      document.getElementById("totalViolationsCount").innerText = weeklyViolations.length;
      renderViolationTable();
      generatePunishmentSchedule();
    }
  } catch (e) {}
}

function renderViolationTable() {
  const tbody = document.getElementById("violationTableBody");
  if (!tbody) return;
  if (weeklyViolations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-emerald-400 font-bold italic"><i class="fa-solid fa-circle-check mr-1.5"></i>Lớp 10A12 tuần này chấp hành nề nếp rất tốt!</td></tr>`;
    return;
  }
  tbody.innerHTML = weeklyViolations.map(item => `
    <tr class="hover:bg-white/[0.04] transition">
      <td class="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">${item.time}</td>
      <td class="py-3 px-4 font-black text-white">${item.studentName}</td>
      <td class="py-3 px-4"><span class="bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded text-[10px] font-bold">${item.sender?.split('(')[1]?.replace(')', '') || 'Tổ'}</span></td>
      <td class="py-3 px-4 text-slate-300">${item.criteria} ${item.note ? `<span class="text-slate-500 italic">(${item.note})</span>` : ''}</td>
      <td class="py-3 px-4 text-center font-black text-rose-400 text-sm">${item.points}đ</td>
      <td class="py-3 px-4 text-slate-400 text-[11px]">${item.sender}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="revokeScorePrompt('${item.time}', '${item.studentId}', ${item.points})" class="text-sky-400 hover:text-sky-300 font-bold text-[11px] hover:underline">Hoàn điểm</button>
      </td>
    </tr>
  `).join('');
}

async function revokeScorePrompt(logTime, studentId, points) {
  const pin = prompt("Nhập mã PIN GVCN để hoàn điểm:");
  if (!pin) return;
  try {
    const data = await callGasApiPost("revokeScore", { pin, logTime, studentId, pointsRevert: points });
    alert(data.message);
    loadWeeklyOverview();
  } catch (e) { alert("Lỗi kết nối!"); }
}

function generatePunishmentSchedule() {
  const penaltySummary = {};

  weeklyViolations.forEach(item => {
    const sName = item.studentName || item.hoTen;
    const pts = Math.abs(Number(item.points) || 0);
    if (!penaltySummary[sName]) {
      penaltySummary[sName] = {
        studentName: sName,
        studentId: item.studentId,
        team: item.team || item.sender?.split('(')[1]?.replace(')', '') || "Tổ 1",
        totalPenalty: 0,
        criteriaList: []
      };
    }
    penaltySummary[sName].totalPenalty += pts;
    penaltySummary[sName].criteriaList.push(item.criteria);
  });

  const level1Students = [];
  const level2Students = [];
  severePunishmentStudents = [];

  Object.values(penaltySummary).forEach(st => {
    if (st.totalPenalty >= 10) {
      severePunishmentStudents.push(st);
    } else if (st.totalPenalty >= 5) {
      level2Students.push(st);
    } else if (st.totalPenalty >= 2) {
      level1Students.push(st);
    }
  });

  autoScheduleResults = BASE_DUTY_SHIFTS.map(shift => ({
    ...shift,
    level1: [],
    level2: []
  }));

  let shiftIndex = 0;
  level2Students.forEach(st => {
    let assigned1 = shiftIndex % 7;
    autoScheduleResults[assigned1].level2.push(st);
    shiftIndex++;

    let assigned2 = (assigned1 + 2) % 7;
    if (autoScheduleResults[assigned2].level2.length >= 1) {
      assigned2 = (assigned1 + 3) % 7;
    }
    autoScheduleResults[assigned2].level2.push(st);
  });

  let l1Index = 0;
  level1Students.forEach(st => {
    let placed = false;
    for (let i = 0; i < 7; i++) {
      let targetShift = (l1Index + i) % 7;
      if (autoScheduleResults[targetShift].level1.length < 2) {
        autoScheduleResults[targetShift].level1.push(st);
        l1Index = targetShift + 1;
        placed = true;
        break;
      }
    }
    if (!placed) {
      autoScheduleResults[l1Index % 7].level1.push(st);
    }
  });

  renderPunishmentScheduleUI();
}

function renderPunishmentScheduleUI() {
  const tbody = document.getElementById("punishmentScheduleTbody");
  if (!tbody) return;

  const hasViolations = autoScheduleResults.some(s => s.level1.length > 0 || s.level2.length > 0) || severePunishmentStudents.length > 0;

  if (!hasViolations) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-emerald-400 font-bold italic">
          <i class="fa-solid fa-circle-check mr-1.5 text-base"></i>
          Không có học sinh nào bị trừ điểm tuần này! Cả 7 ca học chỉ trực nhật theo tổ định kỳ.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = autoScheduleResults.map(shift => {
    const l1Names = shift.level1.map(s => `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
        <i class="fa-solid fa-user text-[9px]"></i> ${s.studentName} (-${s.totalPenalty}đ)
      </span>
    `).join(' ') || `<span class="text-slate-500 italic text-[11px]">Không có</span>`;

    const l2Names = shift.level2.map(s => `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[11px] font-black">
        <i class="fa-solid fa-triangle-exclamation text-[9px]"></i> ${s.studentName} (-${s.totalPenalty}đ)
      </span>
    `).join(' ') || `<span class="text-slate-500 italic text-[11px]">Không có</span>`;

    return `
      <tr class="hover:bg-white/[0.04] transition">
        <td class="py-3 px-4 font-black text-white whitespace-nowrap">
          ${shift.dayName}
          <span class="block text-[10px] text-slate-400 font-mono font-normal">${shift.time}</span>
        </td>
        <td class="py-3 px-4">
          <span class="text-xs font-bold text-sky-300 bg-sky-500/10 border border-sky-400/25 px-2 py-0.5 rounded-lg">
            ${shift.mainTeam}
          </span>
        </td>
        <td class="py-3 px-4 leading-relaxed">${l1Names}</td>
        <td class="py-3 px-4 leading-relaxed">${l2Names}</td>
        <td class="py-3 px-4 text-slate-400 text-[11px] font-medium">${shift.inspector}</td>
      </tr>
    `;
  }).join('');
}

function copyPunishmentNotice() {
  let msg = `📢 [THÔNG BÁO PHÂN CÔNG TRỰC NHẬT & LAO ĐỘNG PHẠT TUẦN MỚI - 10A12]\n`;
  msg += `Thực hiện nề nếp tuần qua, Ban cán sự lớp thông báo lịch lao động khắc phục khuyết điểm như sau:\n\n`;

  autoScheduleResults.forEach(shift => {
    const l1 = shift.level1.map(s => s.studentName).join(', ');
    const l2 = shift.level2.map(s => s.studentName).join(', ');
    if (l1 || l2) {
      msg += `🗓️ ${shift.dayName.toUpperCase()} (${shift.time}):\n`;
      msg += `  • Tổ trực nhật chính: ${shift.mainTeam}\n`;
      if (l1) msg += `  • Trực nhật hỗ trợ (Mức 1): ${l1}\n`;
      if (l2) msg += `  • Quét dọn & đổ rác (Mức 2): ${l2}\n`;
      msg += `  • Kiểm tra nghiệm thu: ${shift.inspector}\n\n`;
    }
  });

  if (severePunishmentStudents.length > 0) {
    msg += `⚠️ LAO ĐỘNG CÔNG ÍCH CẢ TUẦN (MỨC 3 - BỒN HOA TRƯỜNG):\n`;
    severePunishmentStudents.forEach((s, i) => {
      msg += `  ${i + 1}. ${s.studentName} (-${s.totalPenalty}đ)\n`;
    });
    msg += `  • Giám sát: Bí thư Thảo Ngân & Lớp phó Lao động Thái Hoàng.\n\n`;
  }

  msg += `📌 Yêu cầu: Các bạn có tên có mặt đúng giờ (Sáng trước 06:30, Chiều trước 13:30). Vắng không phép sẽ bị nhân đôi số buổi phạt.\n`;
  msg += `GVCN: Thầy Trần Dương Quốc Mẫn.`;

  navigator.clipboard.writeText(msg).then(() => {
    alert("Đã sao chép lịch phân công lao động gửi Zalo!");
  });
}

// ==================== TỰ ĐỘNG HÓA BIÊN BẢN SINH HOẠT LỚP ====================
let currentMeetingData = {
  week: 1,
  teamScores: { "Tổ 1": 100, "Tổ 2": 100, "Tổ 3": 100, "Tổ 4": 100 }
};

function openWeeklyMeetingModal() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  document.getElementById("meetingDocDate").innerText = `Tây Sơn, ngày ${day < 10 ? '0' + day : day} tháng ${month < 10 ? '0' + month : month} năm ${year}`;
  document.getElementById("meetingSignTimestamp").innerText = `Hệ thống xác thực điện tử: ${formatDateTimeVN(now)}`;

  const absentees = attendanceList.filter(s => s.status !== 'CO_MAT');
  const presentCount = 45 - absentees.length;
  document.getElementById("meetingAttendanceReport").innerHTML = `<b>${presentCount}/45 học sinh</b> (Hiện diện: ${presentCount} | Vắng/Trễ: ${absentees.length})`;

  const teamStats = {
    "Tổ 1": { bonus: 0, penalty: 0, score: 100, leader: "Hiền Đức" },
    "Tổ 2": { bonus: 0, penalty: 0, score: 100, leader: "Ngọc Thuỳ" },
    "Tổ 3": { bonus: 0, penalty: 0, score: 100, leader: "Đức Tài" },
    "Tổ 4": { bonus: 0, penalty: 0, score: 100, leader: "Gia Bảo" }
  };

  weeklyViolations.forEach(v => {
    const t = v.sender?.split('(')[1]?.replace(')', '').trim() || v.team || "Tổ 1";
    if (teamStats[t]) {
      const pts = Number(v.points) || 0;
      if (pts < 0) teamStats[t].penalty += Math.abs(pts);
      else teamStats[t].bonus += pts;
    }
  });

  Object.keys(teamStats).forEach(t => {
    teamStats[t].score = 100 + teamStats[t].bonus - teamStats[t].penalty;
    currentMeetingData.teamScores[t] = teamStats[t].score;
  });

  const sortedTeams = Object.keys(teamStats).sort((a, b) => teamStats[b].score - teamStats[a].score);

  const rankTbody = document.getElementById("meetingTeamRankingTbody");
  rankTbody.innerHTML = sortedTeams.map((tName, idx) => {
    const item = teamStats[tName];
    const rankLabel = idx === 0 ? "Hạng 1 (Xuất sắc)" : (idx === 1 ? "Hạng 2 (Tốt)" : (idx === 2 ? "Hạng 3 (Khá)" : "Hạng 4 (Cần cố gắng)"));
    return `
      <tr class="${idx === 0 ? 'bg-amber-50/60 font-bold' : ''}">
        <td class="border border-slate-300 p-2 text-center font-black">${tName}</td>
        <td class="border border-slate-300 p-2">${item.leader}</td>
        <td class="border border-slate-300 p-2 text-center text-emerald-700 font-bold">+${item.bonus}đ</td>
        <td class="border border-slate-300 p-2 text-center text-rose-700 font-bold">-${item.penalty}đ</td>
        <td class="border border-slate-300 p-2 text-center font-black text-indigo-900">${item.score}đ</td>
        <td class="border border-slate-300 p-2 text-center font-bold">${rankLabel}</td>
      </tr>
    `;
  }).join('');

  const punishBox = document.getElementById("meetingPunishmentListContainer");
  if (autoScheduleResults.length === 0 || !autoScheduleResults.some(s => s.level1.length > 0 || s.level2.length > 0)) {
    punishBox.innerHTML = `<p class="text-emerald-700 font-bold italic"><i class="fa-solid fa-circle-check mr-1.5"></i>Tập thể lớp chấp hành rất tốt! Không có học sinh nào bị áp dụng hình thức lao động phạt tuần tới.</p>`;
  } else {
    punishBox.innerHTML = autoScheduleResults.map(s => {
      const l1 = s.level1.map(st => `${st.studentName} (-${st.totalPenalty}đ)`).join(', ');
      const l2 = s.level2.map(st => `${st.studentName} (-${st.totalPenalty}đ)`).join(', ');
      if (!l1 && !l2) return '';
      return `
        <div class="text-[11.5px] border-b border-slate-200 pb-1">
          • <b>${s.dayName} (${s.time}):</b> Trực nhật chính: ${s.mainTeam}. 
          ${l1 ? `<span class="text-amber-800">Trực nhật hỗ trợ (Mức 1): ${l1}.</span> ` : ''}
          ${l2 ? `<span class="text-rose-800 font-bold">Quét dọn & đổ rác (Mức 2): ${l2}.</span> ` : ''}
          <i>(Kiểm tra: ${s.inspector})</i>
        </div>
      `;
    }).filter(Boolean).join('');
  }

  document.getElementById("meetingModal").classList.remove("hidden");
}

function closeMeetingModal() {
  document.getElementById("meetingModal").classList.add("hidden");
}

function printMeetingReport() {
  window.print();
}

function copyMeetingNoticeZalo() {
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  let msg = `📋 [NGHỊ QUYẾT BIÊN BẢN SINH HOẠT LỚP 10A12 - NGÀY ${dateStr}]\n`;
  msg += `Chủ tọa: Thầy Trần Dương Quốc Mẫn (GVCN) | Thư ký: Nguyễn My Su | Lớp trưởng: Tấn An.\n`;
  msg += `Sĩ số tham gia: 45/45 học sinh.\n\n`;
  msg += `🏆 KẾT QUẢ THI ĐUA 4 TỔ TRONG TUẦN:\n`;
  Object.keys(currentMeetingData.teamScores).forEach(t => {
    msg += `  • ${t}: ${currentMeetingData.teamScores[t]} điểm\n`;
  });
  msg += `\n📌 Đề nghị các bạn được phân công trực nhật và khắc phục nề nếp thực hiện nghiêm túc từ sáng Thứ 2.\n`;
  msg += `(Toàn văn biên bản đã được ký số điện tử và lưu trữ trên hệ thống)`;

  navigator.clipboard.writeText(msg).then(() => {
    alert("Đã sao chép nghị quyết biên bản sinh hoạt lớp gửi Zalo!");
  });
}

async function finalizeWeeklyReportNow() {
  const pin = document.getElementById("finalizePinInput").value.trim();
  if (pin !== "9999") {
    alert("Chỉ Thầy chủ nhiệm (PIN 9999) mới có quyền chốt sổ thi đua tuần!");
    return;
  }

  if (!confirm("Bạn có chắc chắn muốn chốt sổ tuần này và làm mới điểm 45 học sinh về 100 điểm xuất phát?")) {
    return;
  }

  const btn = document.getElementById("btnFinalizeWeek");
  btn.disabled = true;
  btn.innerText = "Đang chốt sổ...";

  try {
    const res = await callGasApiPost("finalizeWeeklyMeeting", {
      pin: pin,
      weekNumber: 1,
      teamScores: currentMeetingData.teamScores,
      secretaryName: "Nguyễn My Su"
    });

    alert(res.message);
    if (res.status === "success") {
      closeMeetingModal();
      location.reload();
    }
  } catch (e) {
    alert("Lỗi kết nối máy chủ Google Sheets!");
  } finally {
    btn.disabled = false;
    btn.innerText = "Xác Nhận Chốt Sổ Tuần";
  }
}

// ==================== HỒ SƠ 45 HỌC SINH ====================
let allStudents = [];

async function loadStudentsFull() {
  try {
    const json = await callGasApiGet("action=getStudentsFull");
    if (json && json.status === "success") {
      allStudents = json.data;
      renderStudentsGrid(allStudents);
    }
  } catch (e) {}
}

function renderStudentsGrid(list) {
  const container = document.getElementById("studentsListContainer");
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = `<p class="col-span-full p-8 text-center text-xs text-slate-500 italic">Không tìm thấy học sinh.</p>`;
    return;
  }

  container.innerHTML = list.map(st => {
    const initial = st.hoTen.split(' ').pop().charAt(0);
    const score = Number(st.diemThiDua) || 100;
    const scoreColor = score >= 90 ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' : (score >= 75 ? 'text-amber-300 border-amber-400/40 bg-amber-500/10' : 'text-rose-300 border-rose-400/40 bg-rose-500/10');

    return `
      <div class="glass-card rounded-2xl p-4 space-y-3.5 cursor-pointer" onclick="openScoringModalForStudent('${st.id}', '${st.hoTen}', '${st.to}')">
        <div class="flex justify-between items-start gap-3">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white font-black flex items-center justify-center text-base shadow-glow-indigo shrink-0">
              ${initial}
            </div>
            <div>
              <h4 class="font-black text-sm text-white tracking-tight">${st.hoTen}</h4>
              <p class="text-[10px] text-slate-400 font-mono mt-0.5">
                ${st.id} • ${st.to} ${st.chucVu ? '• <span class="text-sky-300 font-bold">' + st.chucVu + '</span>' : ''}
              </p>
            </div>
          </div>
          <span class="text-[11px] font-black px-2 py-1 rounded-xl border ${scoreColor}">${score}đ</span>
        </div>

        <div class="pt-2 border-t border-white/5 text-[11px] text-slate-300 space-y-1">
          <p class="text-slate-400 truncate text-[10.5px]">
            <i class="fa-solid fa-house-chimney text-slate-500 mr-1.5"></i>${st.diaChi || 'Tây Sơn, Gia Lai'}
          </p>
          <div class="flex justify-between items-center pt-1 text-[11px]">
            <span class="truncate max-w-[170px] text-slate-300">Ba: <b>${st.hoTenBa || '(Chưa có)'}</b></span>
            ${st.sdtBa ? `
              <a href="tel:${st.sdtBa}" onclick="event.stopPropagation()" class="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 font-bold transition flex items-center gap-1">
                <i class="fa-solid fa-phone text-[9px]"></i> Gọi Ba
              </a>
            ` : '<span class="text-slate-500 italic text-[10px]">Chưa có SĐT</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterStudentsLocal() {
  const q = document.getElementById("searchStudentInput").value.toLowerCase().trim();
  const filtered = allStudents.filter(s =>
    s.hoTen.toLowerCase().includes(q) ||
    s.id.toLowerCase().includes(q) ||
    s.diaChi.toLowerCase().includes(q) ||
    (s.sdtBa && s.sdtBa.includes(q))
  );
  renderStudentsGrid(filtered);
}

async function loadAllAppData() {
  try {
    await Promise.all([
      loadWeeklyOverview(),
      loadAttendanceList(),
      loadFundData(),
      loadStudentsFull()
    ]);
    document.getElementById("statusDot").className = "w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald";
    document.getElementById("statusText").innerText = "Trực tuyến";
  } catch (e) {
    document.getElementById("statusDot").className = "w-2 h-2 rounded-full bg-rose-500";
    document.getElementById("statusText").innerText = "Lỗi kết nối";
  }
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.className = "tab-btn shrink-0 px-4 py-2.5 text-slate-300 font-bold hover:bg-white/5 rounded-xl text-xs flex items-center gap-2 transition";
  });
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.className = "tab-btn shrink-0 px-4 py-2.5 bg-brand-600 text-white font-black rounded-xl shadow-glow-indigo text-xs flex items-center gap-2 transition";
  }

  if (tabId === 'tab-seating') renderSeatingChart();
  if (tabId === 'tab-attendance') loadAttendanceList();
  if (tabId === 'tab-fund') loadFundData();
  if (tabId === 'tab-students') loadStudentsFull();
}
// ==================== TỰ ĐỘNG CẬP NHẬT PWA & SERVICE WORKER NGẦM ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // Kiểm tra khi có bản cập nhật mới trên máy chủ GitHub Pages
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hiển thị thông báo yêu cầu cập nhật nhẹ nhàng
              const isUpdateAccepted = confirm("✨ Sổ tay 10A12 đã có phiên bản cập nhật mới (Logo/Tính năng mới). Bấm OK để cập nhật ngay!");
              if (isUpdateAccepted) {
                // Kích hoạt worker mới và tải lại trang ngay lập tức
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });
    }).catch(err => {
      console.warn("Service Worker đăng ký không thành công:", err);
    });
  });

  // Đảm bảo reload ngay khi service worker mới chiếm quyền điều khiển
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
// Khởi chạy tự động ngay khi mở trang
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  document.getElementById("attendDateInput").value = today.toISOString().slice(0, 10);
  onAttendDateChanged();
  updateLiveDashboardEngine();
  renderSeatingChart();
  loadCrossMatrix();
  loadAllAppData();
});
