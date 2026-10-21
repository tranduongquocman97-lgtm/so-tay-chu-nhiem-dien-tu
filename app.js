/**
 * ============================================================================
 * BỘ NÃO ĐIỀU HÀNH TRUNG TÂM SỔ TAY CHỦ NHIỆM 10A12 (K58-QT)
 * Tệp: app.js
 * Phiên bản: 6.0 (Tương thích 100% 6 Phân hệ & 9 Modal của index.html)
 * ============================================================================
 */

const GAS_API_URL = localStorage.getItem("10A12_SCRIPT_URL") || "https://script.google.com/macros/s/AKfycby1bzee0jofemhb1ITYoi_wldFpc/exec";

// Trạng thái ứng dụng
let appState = {
  isMaster: localStorage.getItem("10A12_IS_MASTER") === "true",
  allowStudentLeaderEdit: true,
  currentRole: localStorage.getItem("10A12_IS_MASTER") === "true" ? "GVCN" : "Cán sự lớp",
  currentSessionKey: "T4_SANG",
  currentSessionLabel: "Sáng Thứ 4",
  currentCampaignId: "KY1_100K",
  currentFundTeamFilter: "ALL",
  students: [],
  violations: [],
  campaigns: [],
  fundPayments: [],
  cashbook: [],
  fundSummary: { totalIncome: 0, totalExpense: 0, balance: 0 },
  selectedLeaveSupplementRow: null
};

// ==================== 1. KẾT NỐI API BACKEND ====================
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
    console.error(`[API Error] ${action}:`, err);
    return { status: "error", message: "Lỗi kết nối máy chủ dữ liệu!" };
  }
}

// ==================== 2. KHỞI TẠO HỆ THỐNG ====================
document.addEventListener("DOMContentLoaded", () => {
  updateRoleDisplay();
  refreshData();
});

async function refreshData() {
  const tbody = document.getElementById("violationTableBody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-500 italic"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang đồng bộ dữ liệu...</td></tr>`;

  const res = await callApi("getInitialData", {}, "GET");
  if (res && res.status === "success") {
    appState.students = res.students || [];
    appState.violations = res.violations || [];
    appState.campaigns = res.campaigns || [];
    appState.fundPayments = res.fundPayments || [];
    appState.cashbook = res.cashbook || [];
    appState.fundSummary = res.fundSummary || { totalIncome: 0, totalExpense: 0, balance: 0 };

    renderOverviewDashboard();
    renderAttendanceSession();
    renderTeamLeaderboard();
    renderPeriodCards();
    renderFundCampaigns();
    renderFundChecklist();
    renderStudentCards(appState.students);
    populateStudentSelects();
  } else {
    alert("Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra kết nối mạng!");
  }
}

// ==================== 3. ĐIỀU HƯỚNG TABS & HEADER ====================
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
  const targetPane = document.getElementById(tabId);
  if (targetPane) targetPane.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("nav-active");
    btn.classList.add("text-slate-400");
  });

  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add("nav-active");
    activeBtn.classList.remove("text-slate-400");
  }
}

function updateRoleDisplay() {
  const roleText = document.getElementById("currentRoleText");
  const authBtn = document.getElementById("authBtnText");
  if (appState.isMaster) {
    if (roleText) roleText.innerText = "Thầy Quốc Mẫn (GVCN)";
    if (authBtn) {
      authBtn.innerText = "Thoát";
      authBtn.className = "ml-1 text-[11px] text-rose-400 hover:underline font-bold";
    }
  } else {
    if (roleText) roleText.innerText = "Cán sự lớp";
    if (authBtn) {
      authBtn.innerText = "GVCN";
      authBtn.className = "ml-1 text-[11px] text-sky-400 hover:underline font-bold";
    }
  }
}

function toggleMasterPinModal() {
  if (appState.isMaster) {
    if (confirm("Thầy có muốn đăng xuất khỏi phiên làm việc của GVCN?")) {
      appState.isMaster = false;
      localStorage.removeItem("10A12_IS_MASTER");
      updateRoleDisplay();
      alert("Đã chuyển về phiên Cán sự lớp.");
    }
    return;
  }
  const modal = document.getElementById("masterPinModal");
  if (modal) {
    modal.classList.toggle("hidden");
    const input = document.getElementById("masterPinInput");
    if (input) input.value = "";
  }
}

function confirmMasterPin() {
  const pin = document.getElementById("masterPinInput").value.trim();
  if (pin === "9999") {
    appState.isMaster = true;
    localStorage.setItem("10A12_IS_MASTER", "true");
    updateRoleDisplay();
    toggleMasterPinModal();
    alert("Xác thực GVCN thành công! Thiết bị đã được ghi nhớ toàn quyền.");
  } else {
    alert("Mã PIN GVCN không đúng!");
  }
}

function toggleMasterEditSwitch() {
  if (!appState.isMaster) {
    alert("Chỉ GVCN mới có quyền bật/tắt công tắc ghi nề nếp của Ban cán sự!");
    return;
  }
  appState.allowStudentLeaderEdit = !appState.allowStudentLeaderEdit;
  const btn = document.getElementById("btnMasterSwitch");
  if (btn) {
    btn.innerHTML = appState.allowStudentLeaderEdit
      ? `<i class="fa-solid fa-toggle-on text-emerald-400 text-sm"></i><span class="hidden lg:inline">Cán sự: Mở ghi</span>`
      : `<i class="fa-solid fa-toggle-off text-rose-400 text-sm"></i><span class="hidden lg:inline">Cán sự: Khóa ghi</span>`;
  }
  callApi("saveConfig", { allowStudentLeaderEdit: appState.allowStudentLeaderEdit ? "TRUE" : "FALSE" });
}

function copyParentLookupPortalLink() {
  const currentUrl = window.location.href;
  const lookupUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/")) + "/tracuu.html";
  const msg = `Kính gửi Quý Phụ huynh học sinh lớp 10A12 (K58-QT),\n` +
              `Để theo dõi nề nếp, chuyên cần và tình trạng quỹ lớp của học sinh, kính mời Quý Phụ huynh truy cập Cổng tra cứu điện tử:\n` +
              `${lookupUrl}\n` +
              `👉 Cách tra cứu: Nhập Mã học sinh (VD: HS01) hoặc Số CCCD 12 số của học sinh.\n` +
              `GVCN: Thầy Trần Dương Quốc Mẫn. Trân trọng!`;

  navigator.clipboard.writeText(msg).then(() => {
    alert("Đã sao chép link Cổng Tra Cứu kèm tin nhắn mẫu gửi nhóm Zalo!");
  }).catch(() => {
    prompt("Sao chép link gửi Zalo Phụ huynh:", lookupUrl);
  });
}

// ==================== 4. PHÂN HỆ 1: TỔNG QUAN & NỀ NẾP ====================
function renderOverviewDashboard() {
  const avg = appState.students.length > 0
    ? (appState.students.reduce((acc, s) => acc + (Number(s.diemThiDua) || 0), 0) / appState.students.length).toFixed(1)
    : "100.0";
  const avgEl = document.getElementById("dashAvgScore");
  if (avgEl) avgEl.innerText = `${avg}đ`;

  const fundEl = document.getElementById("dashFundBalance");
  if (fundEl) fundEl.innerText = `${(appState.fundSummary.balance || 0).toLocaleString()} đ`;

  const tbody = document.getElementById("violationTableBody");
  if (!tbody) return;

  if (appState.violations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-emerald-400 font-bold italic"><i class="fa-solid fa-circle-check mr-1.5"></i>Lớp chấp hành nề nếp rất tốt, không có lỗi vi phạm trong tuần!</td></tr>`;
    return;
  }

  tbody.innerHTML = appState.violations.map(v => {
    const isAbsence = v.criteria && v.criteria.includes("[Chuyên cần]");
    const isPenalty = v.points < 0;
    return `
      <tr class="hover:bg-white/5 transition">
        <td class="py-2 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">${v.time}</td>
        <td class="py-2 px-3 font-black text-white">${v.studentName}</td>
        <td class="py-2 px-3"><span class="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-400/20 text-[10px] font-bold">${getStudentTeam(v.studentId)}</span></td>
        <td class="py-2 px-3 text-slate-300">${v.criteria} ${v.note ? `<span class="text-slate-500 italic">(${v.note})</span>` : ""}</td>
        <td class="py-2 px-3 text-center font-black ${isPenalty ? "text-rose-400" : (v.points > 0 ? "text-emerald-400" : "text-sky-300")}">${v.points > 0 ? "+" : ""}${v.points}đ</td>
        <td class="py-2 px-3 text-slate-400 text-[11px]">${v.sender || "Hệ thống"}</td>
        <td class="py-2 px-3 text-right">
          ${isAbsence && v.points < 0 ? `
            <button onclick="openLeaveSupplementModal('${v.rowId}', '${v.studentId}', '${v.studentName}')" class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold text-[10px] mr-1">
              Duyệt phép
            </button>
          ` : ""}
          <button onclick="deleteViolationRecord('${v.rowId}', '${v.studentId}', ${v.points})" class="text-rose-400 hover:underline text-[11px] font-bold">Xóa</button>
        </td>
      </tr>
    `;
  }).join("");
}

function getStudentTeam(stId) {
  const st = appState.students.find(s => s.id === stId);
  return st ? st.to : "Tổ 1";
}

function exportWeeklyShlReport() {
  const dateStr = new Date().toLocaleDateString("vi-VN");
  let msg = `📋 [BIÊN BẢN SINH HOẠT LỚP 10A12 - NGÀY ${dateStr}]\n` +
            `GVCN: Thầy Trần Dương Quốc Mẫn • Sĩ số: 45/45\n\n` +
            `1. ĐIỂM THI ĐUA 4 TỔ:\n`;

  const teams = ["Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4"];
  teams.forEach(t => {
    const list = appState.students.filter(s => s.to === t);
    const avg = list.length > 0 ? (list.reduce((acc, s) => acc + (Number(s.diemThiDua) || 0), 0) / list.length).toFixed(1) : 100;
    msg += ` • ${t}: ${avg} điểm\n`;
  });

  msg += `\n2. CÁC HỌC SINH CẦN KHẮC PHỤC NỀ NẾP TUẦN TỚI:\n`;
  const penalized = appState.students.filter(s => Number(s.diemThiDua) < 100);
  if (penalized.length === 0) {
    msg += ` (Không có - Cả lớp thực hiện xuất sắc)\n`;
  } else {
    penalized.forEach((s, idx) => {
      msg += ` ${idx + 1}. ${s.hoTen} (${s.to}): ${s.diemThiDua}đ\n`;
    });
  }

  msg += `\nĐề nghị các bạn hoàn thành lịch trực nhật bù theo quy chế.`;
  navigator.clipboard.writeText(msg).then(() => {
    alert("Đã sao chép nội dung Biên bản SHL để gửi Zalo lớp!");
  });
}

// ==================== 5. PHÂN HỆ 2: ĐIỂM DANH & CHẤM CHÉO ====================
function selectAttendanceSession(sessionKey, sessionName) {
  appState.currentSessionKey = sessionKey;
  appState.currentSessionLabel = sessionName;

  const lbl = document.getElementById("currentSessionLabel");
  if (lbl) lbl.innerText = sessionName;

  document.querySelectorAll(".att-btn").forEach(btn => {
    if (btn.innerText.includes(sessionName)) {
      btn.className = "att-btn px-2.5 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold text-left shadow-lg shadow-sky-500/25";
    } else {
      btn.className = "att-btn px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-left border border-white/10 text-slate-300";
    }
  });

  const laborSess = document.getElementById("laborCurrentSession");
  if (laborSess) laborSess.innerText = sessionName;

  renderAttendanceSession();
}

function renderAttendanceSession() {
  const container = document.getElementById("attendanceStudentList");
  if (!container) return;

  container.innerHTML = appState.students.map(st => `
    <div class="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center">${st.id.replace("HS", "")}</span>
        <div>
          <span class="font-bold text-white text-xs">${st.hoTen}</span>
          <span class="text-[10px] text-slate-400 ml-1">(${st.to})</span>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="markAttendance('${st.id}', '${st.hoTen}', 'CO_MAT')" class="px-2 py-1 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">Có mặt</button>
        <button onclick="markAttendance('${st.id}', '${st.hoTen}', 'DI_TRE')" class="px-2 py-1 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">Trễ</button>
        <button onclick="markAttendance('${st.id}', '${st.hoTen}', 'VANG_PHEP')" class="px-2 py-1 rounded text-[11px] font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30">Phép</button>
        <button onclick="markAttendance('${st.id}', '${st.hoTen}', 'KHONG_PHEP')" class="px-2 py-1 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30">K.Phép</button>
      </div>
    </div>
  `).join("");
}

async function markAttendance(studentId, studentName, status) {
  if (!appState.isMaster && !appState.allowStudentLeaderEdit) {
    alert("GVCN đang tạm khóa quyền cập nhật nề nếp của Ban cán sự!");
    return;
  }

  const dateStr = new Date().toLocaleDateString("vi-VN");
  const res = await callApi("saveAttendance", {
    sessionKey: appState.currentSessionKey,
    sessionName: appState.currentSessionLabel,
    date: dateStr,
    studentId,
    studentName,
    status,
    sender: appState.currentRole
  });

  if (res && res.status === "success") {
    refreshData();
  } else {
    alert(res.message || "Lỗi khi ghi nhận điểm danh!");
  }
}

function renderTeamLeaderboard() {
  const container = document.getElementById("teamLeaderboard");
  if (!container) return;

  const teams = [
    { name: "Tổ 1", leader: "Hiền Đức" },
    { name: "Tổ 2", leader: "Ngọc Thuỳ" },
    { name: "Tổ 3", leader: "Đức Tài" },
    { name: "Tổ 4", leader: "Gia Bảo" }
  ];

  const calculated = teams.map(t => {
    const list = appState.students.filter(s => s.to === t.name);
    const avg = list.length > 0 ? (list.reduce((acc, s) => acc + (Number(s.diemThiDua) || 0), 0) / list.length).toFixed(1) : 100;
    return { ...t, score: avg };
  }).sort((a, b) => b.score - a.score);

  container.innerHTML = calculated.map((t, idx) => `
    <div class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? "bg-amber-500 text-black font-extrabold" : "bg-white/10 text-slate-300"}">${idx + 1}</span>
        <div>
          <p class="text-xs font-bold text-white">${t.name} <span class="text-[10px] text-slate-400 font-normal">(${t.leader})</span></p>
          <span class="text-[10px] text-slate-400">${idx === 0 ? "Dẫn đầu thi đua" : "Xếp hạng " + (idx + 1)}</span>
        </div>
      </div>
      <span class="text-sm font-black ${t.score >= 90 ? "text-emerald-400" : (t.score >= 80 ? "text-amber-400" : "text-rose-400")}">${t.score}đ</span>
    </div>
  `).join("");
}

// ==================== 6. PHÂN HỆ 3: LAO ĐỘNG (THÁI HOÀNG) ====================
async function gradeLaborSession(status) {
  const team = document.getElementById("laborCurrentTeam").innerText;
  const res = await callApi("saveLaborInspection", {
    sessionKey: appState.currentSessionLabel,
    team: team,
    status: status,
    inspector: "Thái Hoàng (Phó LĐ)"
  });

  if (res && res.status === "success") {
    alert(status === "DAT" ? "Đã nghiệm thu: Trực nhật Đạt!" : "Đã nghiệm thu: Chưa đạt (-20đ Tổ)!");
    refreshData();
  }
}

function openDeskSanitationModal() {
  document.getElementById("deskSanitationModal").classList.remove("hidden");
}

function closeDeskSanitationModal() {
  document.getElementById("deskSanitationModal").classList.add("hidden");
}

async function submitDeskSanitation() {
  const desk = document.getElementById("deskSanitationSelect").value;
  const type = document.getElementById("deskSanitationType").value;
  const pts = type.includes("-20đ") ? -20 : -10;

  const res = await callApi("recordDeskSanitationViolation", {
    deskPosition: desk,
    errorType: type,
    points: pts,
    sender: "Thái Hoàng (Phó LĐ)"
  });

  if (res && res.status === "success") {
    alert("Đã ghi nhận lỗi vệ sinh bàn học!");
    closeDeskSanitationModal();
    refreshData();
  }
}

// ==================== 7. PHÂN HỆ 4: SỔ ĐẦU BÀI ĐIỆN TỬ ====================
function renderPeriodCards() {
  const grid = document.getElementById("periodCardGrid");
  if (!grid) return;

  const periods = ["Tiết 1", "Tiết 2", "Tiết 3", "Tiết 4", "Tiết 5"];
  grid.innerHTML = periods.map(p => `
    <div class="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-sky-300 uppercase">${p}</span>
        <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">Loại A</span>
      </div>
      <p class="text-xs font-bold text-white truncate">Chưa cập nhật môn</p>
      <p class="text-[11px] text-slate-400 truncate">GV: Đang nạp SĐB...</p>
    </div>
  `).join("");
}

function openClassSessionLogModal() {
  document.getElementById("sessionLogModal").classList.remove("hidden");
}

function closeClassSessionLogModal() {
  document.getElementById("sessionLogModal").classList.add("hidden");
}

async function submitClassSessionLog() {
  const period = document.getElementById("logPeriodSelect").value;
  const subject = document.getElementById("logSubjectInput").value.trim();
  const teacher = document.getElementById("logTeacherInput").value.trim();
  const rating = document.getElementById("logRatingSelect").value;
  const topic = document.getElementById("logTopicInput").value.trim();
  const note = document.getElementById("logNoteInput").value.trim();

  if (!subject) {
    alert("Vui lòng nhập tên môn học!");
    return;
  }

  const dateStr = new Date().toLocaleDateString("vi-VN");
  const res = await callApi("saveClassSessionLog", {
    date: dateStr,
    session: appState.currentSessionLabel,
    period,
    subject,
    teacher,
    rating,
    topic,
    note,
    sender: appState.currentRole
  });

  if (res && res.status === "success") {
    alert("Đã lưu sổ đầu bài tiết học!");
    closeClassSessionLogModal();
    refreshData();
  }
}

// ==================== 8. PHÂN HỆ 5: QUỸ LỚP (MY SU) ====================
function renderFundCampaigns() {
  const select = document.getElementById("campaignSelect");
  if (!select) return;

  if (appState.campaigns.length > 0) {
    select.innerHTML = appState.campaigns.map(c => `
      <option value="${c.id}">${c.title} (${(c.target || 0).toLocaleString()}đ)</option>
    `).join("");
    appState.currentCampaignId = select.value;
  }
}

function switchFundCampaign(campaignId) {
  appState.currentCampaignId = campaignId;
  renderFundChecklist();
}

function renderFundChecklist() {
  const incomeEl = document.getElementById("fundIncomeDisplay");
  const expenseEl = document.getElementById("fundExpenseDisplay");
  const balanceEl = document.getElementById("fundBalanceDisplay");
  const countEl = document.getElementById("fundPaidRatio");

  if (incomeEl) incomeEl.innerText = `${(appState.fundSummary.totalIncome || 0).toLocaleString()} đ`;
  if (expenseEl) expenseEl.innerText = `${(appState.fundSummary.totalExpense || 0).toLocaleString()} đ`;
  if (balanceEl) balanceEl.innerText = `${(appState.fundSummary.balance || 0).toLocaleString()} đ`;

  const paymentsForCampaign = appState.fundPayments.filter(p => p.campaignId === appState.currentCampaignId);
  const paidCount = paymentsForCampaign.filter(p => p.isPaid).length;
  if (countEl) countEl.innerText = `Đã thu: ${paidCount}/45 HS`;

  const grid = document.getElementById("fundStudentGrid");
  if (!grid) return;

  const filtered = (appState.currentFundTeamFilter === "ALL")
    ? appState.students
    : appState.students.filter(s => s.to === appState.currentFundTeamFilter);

  grid.innerHTML = filtered.map(st => {
    const pay = paymentsForCampaign.find(p => p.studentId === st.id);
    const isPaid = pay ? pay.isPaid : false;

    return `
      <div class="p-2.5 rounded-xl bg-white/5 border ${isPaid ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/5"} flex items-center justify-between">
        <div class="flex items-center gap-2">
          <input type="checkbox" ${isPaid ? "checked" : ""} onchange="toggleFundLocal('${st.id}', this.checked)" class="w-4 h-4 accent-emerald-500 rounded cursor-pointer">
          <div>
            <p class="text-xs font-bold text-white leading-tight">${st.hoTen}</p>
            <span class="text-[10px] text-slate-400 font-mono">${st.id} • ${st.to}</span>
          </div>
        </div>
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${isPaid ? "text-emerald-300 bg-emerald-500/20" : "text-rose-400 bg-rose-500/20"}">
          ${isPaid ? "Đã nộp" : "Chưa nộp"}
        </span>
      </div>
    `;
  }).join("");
}

function toggleFundLocal(studentId, isChecked) {
  let pay = appState.fundPayments.find(p => p.campaignId === appState.currentCampaignId && p.studentId === studentId);
  if (pay) {
    pay.isPaid = isChecked;
    pay.amountPaid = isChecked ? 100000 : 0;
  } else {
    appState.fundPayments.push({
      campaignId: appState.currentCampaignId,
      studentId: studentId,
      isPaid: isChecked,
      amountPaid: isChecked ? 100000 : 0
    });
  }
  renderFundChecklist();
}

function filterFundTeam(team) {
  appState.currentFundTeamFilter = team;
  const buttons = document.querySelectorAll("#fundTeamFilters button");
  buttons.forEach(b => {
    if (b.innerText === (team === "ALL" ? "Tất cả" : team.replace("Tổ ", "T"))) {
      b.className = "px-2.5 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white";
    } else {
      b.className = "px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-300";
    }
  });
  renderFundChecklist();
}

async function saveCurrentFundState() {
  const currentPayments = appState.students.map(st => {
    const pay = appState.fundPayments.find(p => p.campaignId === appState.currentCampaignId && p.studentId === st.id);
    return {
      studentId: st.id,
      studentName: st.hoTen,
      isPaid: pay ? pay.isPaid : false,
      amountPaid: pay && pay.isPaid ? 100000 : 0
    };
  });

  const res = await callApi("saveFundPaymentBatch", {
    campaignId: appState.currentCampaignId,
    payments: currentPayments
  });

  if (res && res.status === "success") {
    alert("Đã đồng bộ dữ liệu thu quỹ lên Google Sheets!");
    refreshData();
  } else {
    alert("Lỗi khi lưu quỹ!");
  }
}

function openNewCampaignModal() {
  document.getElementById("newCampaignModal").classList.remove("hidden");
}

function closeNewCampaignModal() {
  document.getElementById("newCampaignModal").classList.add("hidden");
}

async function submitNewCampaign() {
  const title = document.getElementById("campaignTitleInput").value.trim();
  const target = Number(document.getElementById("campaignTargetInput").value) || 0;

  if (!title) {
    alert("Vui lòng nhập tên đợt thu!");
    return;
  }

  const res = await callApi("createFundCampaign", { title, target });
  if (res && res.status === "success") {
    alert("Đã khởi tạo đợt thu quỹ mới!");
    closeNewCampaignModal();
    refreshData();
  }
}

function openAddExpenseModal() {
  document.getElementById("addExpenseModal").classList.remove("hidden");
}

function closeAddExpenseModal() {
  document.getElementById("addExpenseModal").classList.add("hidden");
}

async function submitAddExpense() {
  const category = document.getElementById("expenseCategorySelect").value;
  const amount = Number(document.getElementById("expenseAmountInput").value) || 0;
  const note = document.getElementById("expenseNoteInput").value.trim();

  if (amount <= 0) {
    alert("Số tiền chi phải lớn hơn 0 đ!");
    return;
  }
  if (!note) {
    alert("Vui lòng nhập nội dung chi tiết!");
    return;
  }

  const res = await callApi("saveFundExpense", {
    category,
    amount,
    note,
    author: "Nguyễn My Su (Thủ quỹ)"
  });

  if (res && res.status === "success") {
    alert("Đã xuất quỹ thành công!");
    closeAddExpenseModal();
    refreshData();
  }
}

// ==================== 9. PHÂN HỆ 6: HỒ SƠ 45 HỌC SINH ====================
function renderStudentCards(list) {
  const grid = document.getElementById("studentCardsGrid");
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<p class="col-span-full py-8 text-center text-xs text-slate-500 italic">Không tìm thấy học sinh phù hợp.</p>`;
    return;
  }

  grid.innerHTML = list.map(st => `
    <div class="p-3.5 rounded-2xl glass-card border border-white/10 space-y-2.5">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black text-xs flex items-center justify-center">
            ${st.hoTen.split(" ").pop().charAt(0)}
          </div>
          <div>
            <h3 class="text-xs font-black text-white">${st.hoTen}</h3>
            <p class="text-[10px] text-slate-400 font-mono">${st.id} • ${st.to}</p>
          </div>
        </div>
        <span class="text-xs font-black px-2 py-0.5 rounded-lg ${st.diemThiDua >= 90 ? "text-emerald-300 bg-emerald-500/20" : "text-amber-300 bg-amber-500/20"}">
          ${st.diemThiDua}đ
        </span>
      </div>

      <div class="pt-2 border-t border-white/5 text-[11px] text-slate-300 space-y-1">
        <p class="text-slate-400 truncate"><i class="fa-solid fa-id-card text-sky-400 mr-1.5"></i>CCCD: <span class="font-mono text-white">${st.soCCCD || "Chưa có"}</span></p>
        <div class="flex items-center justify-between">
          <span class="truncate">Ba: <b>${st.tenBa || "Chưa có"}</b></span>
          ${st.sdtBa ? `<a href="tel:${st.sdtBa}" class="text-[10px] text-sky-300 hover:underline font-bold"><i class="fa-solid fa-phone mr-1"></i>Gọi</a>` : ""}
        </div>
      </div>

      <div class="pt-1 flex items-center gap-1.5">
        <button onclick="openStudentDetailModal('${st.id}')" class="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold transition">
          <i class="fa-solid fa-eye mr-1"></i>Xem lý lịch
        </button>
      </div>
    </div>
  `).join("");
}

function handleSearchStudent(query) {
  const q = query.toLowerCase().trim();
  const filtered = appState.students.filter(s =>
    s.hoTen.toLowerCase().includes(q) ||
    s.id.toLowerCase().includes(q) ||
    (s.soCCCD && s.soCCCD.includes(q)) ||
    s.to.toLowerCase().includes(q)
  );
  renderStudentCards(filtered);
}

function exportStudentProfilesExcel() {
  let csv = "Mã HS,Họ và Tên,Tổ,Chức Vụ,Số CCCD,Đoàn Viên,Họ Tên Ba,SĐT Ba,Họ Tên Mẹ,SĐT Mẹ,Điểm Thi Đua\n";
  appState.students.forEach(s => {
    csv += `"${s.id}","${s.hoTen}","${s.to}","${s.chucVu}","${s.soCCCD}","${s.laDoanVien ? 'Đoàn viên' : 'Thanh niên'}","${s.tenBa}","${s.sdtBa}","${s.tenMe}","${s.sdtMe}",${s.diemThiDua}\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Danh_Sach_10A12_K58_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function openAddNewStudentModal() {
  document.getElementById("addStudentModal").classList.remove("hidden");
}

function closeAddNewStudentModal() {
  document.getElementById("addStudentModal").classList.add("hidden");
}

async function submitAddNewStudent() {
  const hoTen = document.getElementById("newStudentName").value.trim();
  const to = document.getElementById("newStudentTeam").value;
  const chucVu = document.getElementById("newStudentRole").value.trim();
  const soCCCD = document.getElementById("newStudentCCCD").value.trim();
  const hoTenBa = document.getElementById("newStudentFather").value.trim();
  const sdtBa = document.getElementById("newStudentFatherPhone").value.trim();

  if (!hoTen) {
    alert("Vui lòng nhập họ tên học sinh!");
    return;
  }

  const res = await callApi("addNewStudent", { hoTen, to, chucVu, soCCCD, hoTenBa, sdtBa });
  if (res && res.status === "success") {
    alert(res.message);
    closeAddNewStudentModal();
    refreshData();
  }
}

// ==================== 10. CHI TIẾT HỒ SƠ & CÁC MODAL CÒN LẠI ====================
let editingStudentId = null;

function openStudentDetailModal(studentId) {
  const st = appState.students.find(s => s.id === studentId);
  if (!st) return;

  editingStudentId = studentId;
  const form = document.getElementById("modalStudentForm");
  const title = document.getElementById("modalStudentTitle");
  if (title) title.innerText = `Hồ Sơ: ${st.hoTen} (${st.id})`;

  if (form) {
    form.innerHTML = `
      <div class="space-y-2">
        <div>
          <label class="text-slate-400 block mb-0.5">Số CCCD 12 số:</label>
          <input type="text" id="editStudentCCCD" value="${st.soCCCD || ""}" maxlength="12" class="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 block mb-0.5">Tổ sinh hoạt:</label>
            <select id="editStudentTeam" class="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white">
              <option value="Tổ 1" ${st.to === "Tổ 1" ? "selected" : ""}>Tổ 1</option>
              <option value="Tổ 2" ${st.to === "Tổ 2" ? "selected" : ""}>Tổ 2</option>
              <option value="Tổ 3" ${st.to === "Tổ 3" ? "selected" : ""}>Tổ 3</option>
              <option value="Tổ 4" ${st.to === "Tổ 4" ? "selected" : ""}>Tổ 4</option>
            </select>
          </div>
          <div>
            <label class="text-slate-400 block mb-0.5">Đoàn thể:</label>
            <select id="editStudentDoan" class="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white">
              <option value="true" ${st.laDoanVien ? "selected" : ""}>Đoàn viên</option>
              <option value="false" ${!st.laDoanVien ? "selected" : ""}>Thanh niên</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 block mb-0.5">Họ tên Ba:</label>
            <input type="text" id="editStudentFather" value="${st.tenBa || ""}" class="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white">
          </div>
          <div>
            <label class="text-slate-400 block mb-0.5">SĐT Ba:</label>
            <input type="tel" id="editStudentFatherPhone" value="${st.sdtBa || ""}" class="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-slate-400 block mb-0.5">Họ tên Mẹ:</label>
            <input type="text" id="editStudentMother" value="${st.tenMe || ""}" class="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white">
          </div>
          <div>
            <label class="text-slate-400 block mb-0.5">SĐT Mẹ:</label>
            <input type="tel" id="editStudentMotherPhone" value="${st.sdtMe || ""}" class="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white">
          </div>
        </div>
      </div>
    `;
  }
  document.getElementById("studentDetailModal").classList.remove("hidden");
}

function closeStudentModal() {
  document.getElementById("studentDetailModal").classList.add("hidden");
  editingStudentId = null;
}

async function saveStudentProfileChanges() {
  if (!editingStudentId) return;

  const payload = {
    id: editingStudentId,
    soCCCD: document.getElementById("editStudentCCCD").value.trim(),
    to: document.getElementById("editStudentTeam").value,
    laDoanVien: document.getElementById("editStudentDoan").value === "true",
    hoTenBa: document.getElementById("editStudentFather").value.trim(),
    sdtBa: document.getElementById("editStudentFatherPhone").value.trim(),
    hoTenMe: document.getElementById("editStudentMother").value.trim(),
    sdtMe: document.getElementById("editStudentMotherPhone").value.trim()
  };

  const res = await callApi("updateStudentProfile", payload);
  if (res && res.status === "success") {
    alert("Đã cập nhật hồ sơ học sinh thành công!");
    closeStudentModal();
    refreshData();
  }
}

// Modal duyệt phép bổ sung
function openLeaveSupplementModal(rowId, studentId, studentName) {
  appState.selectedLeaveSupplementRow = { rowId, studentId };
  const info = document.getElementById("supplementStudentInfo");
  if (info) info.innerText = `Học sinh: ${studentName} (${studentId})`;
  document.getElementById("leaveSupplementModal").classList.remove("hidden");
}

function closeLeaveSupplementModal() {
  document.getElementById("leaveSupplementModal").classList.add("hidden");
  appState.selectedLeaveSupplementRow = null;
}

async function submitLeaveSupplement() {
  if (!appState.selectedLeaveSupplementRow) return;
  const reason = document.getElementById("supplementReasonInput").value.trim();

  const res = await callApi("approveLeaveSupplement", {
    rowId: appState.selectedLeaveSupplementRow.rowId,
    studentId: appState.selectedLeaveSupplementRow.studentId,
    note: reason
  });

  if (res && res.status === "success") {
    alert("Đã duyệt bổ sung giấy phép và hoàn điểm rèn luyện!");
    closeLeaveSupplementModal();
    refreshData();
  }
}

// Modal chấm chéo / vi phạm
function openRecordViolationModal() {
  document.getElementById("recordViolationModal").classList.remove("hidden");
}

function closeRecordViolationModal() {
  document.getElementById("recordViolationModal").classList.add("hidden");
}

function populateStudentSelects() {
  const sel = document.getElementById("violationStudentSelect");
  if (!sel) return;

  sel.innerHTML = appState.students.map(s => `
    <option value="${s.id}|${s.hoTen}">${s.id} - ${s.hoTen} (${s.to})</option>
  `).join("");
}

async function submitRecordViolation() {
  const studentVal = document.getElementById("violationStudentSelect").value.split("|");
  const studentId = studentVal[0];
  const studentName = studentVal[1];

  const criteriaVal = document.getElementById("violationCriteriaSelect").value.split("|");
  const criteria = criteriaVal[0];
  const points = Number(criteriaVal[1]) || 0;
  const note = document.getElementById("violationNoteInput").value.trim();

  const dateStr = new Date().toLocaleDateString("vi-VN");
  const res = await callApi("recordViolation", {
    displayTime: `${appState.currentSessionLabel} (${dateStr})`,
    studentId,
    studentName,
    criteria: `${criteria}: ${document.getElementById("violationCriteriaSelect").selectedOptions[0].text}`,
    points,
    note,
    sender: appState.currentRole
  });

  if (res && res.status === "success") {
    alert("Đã lưu vi phạm thành công!");
    closeRecordViolationModal();
    refreshData();
  }
}

async function deleteViolationRecord(rowId, studentId, points) {
  if (!confirm("Thầy/bạn có chắc chắn muốn xóa bản ghi nề nếp này và hoàn lại điểm?")) return;

  const res = await callApi("deleteViolation", { rowId, studentId, points });
  if (res && res.status === "success") {
    alert("Đã xóa bản ghi!");
    refreshData();
  }
}