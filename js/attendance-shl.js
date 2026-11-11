/**
 * ============================================================================
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ NỀ NẾP, THI ĐUA, SỔ ĐẦU BÀI & BIÊN BẢN SHL
 * Tác giả: GVCN ThS. Trần Dương Quốc Mẫn
 * Phiên bản: 14.2 (Thẻ Tổ 3 Cấp, Thẻ Màu Xanh/Vàng/Đỏ, Gỡ Điểm & Word Nghị Định 30)
 * ============================================================================
 */

// ==================== TẦNG 1: 4 THẺ TỔ THI ĐUA ĐỘC LẬP & CHẤM CHÉO ====================
function renderTeamDisciplineSummaryCards() {
  const container = document.getElementById("teamDisciplineSummaryGrid");
  if (!container) return;

  const teams = ["Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4"];
  const targetMap = { "Tổ 1": "Tổ 2", "Tổ 2": "Tổ 3", "Tổ 3": "Tổ 4", "Tổ 4": "Tổ 1" };

  const teamStats = teams.map(tName => {
    const sts = appState.students.filter(s => s.to === tName);
    const total = sts.length || 1;
    const avg = (sts.reduce((sum, s) => sum + (Number(s.diemThiDua) || 100), 0) / total).toFixed(1);
    
    let redCards = 0, yellowCards = 0, greenCards = 0;
    sts.forEach(s => {
      const p = Number(s.diemThiDua) || 100;
      if (p < 70) redCards++;
      else if (p < 90) yellowCards++;
      else greenCards++;
    });

    return { name: tName, avg: Number(avg), stsCount: total, redCards, yellowCards, greenCards };
  });

  const sortedTeams = [...teamStats].sort((a, b) => b.avg - a.avg);

  container.innerHTML = teamStats.map(t => {
    const rank = sortedTeams.findIndex(x => x.name === t.name) + 1;
    const isSelected = (appState.currentStudentTeamFilter === t.name);
    const targetTeam = targetMap[t.name];

    return `
      <div onclick="filterStudentTeamTab('${t.name}')" class="p-3.5 rounded-2xl bg-white border-2 ${isSelected ? 'border-sky-600 ring-2 ring-sky-300' : 'border-slate-200 hover:border-slate-300'} shadow-xs cursor-pointer transition flex flex-col justify-between space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-6 h-6 rounded-lg ${rank === 1 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'} font-black text-xs flex items-center justify-center shadow-2xs">
              ${rank}
            </span>
            <b class="text-xs font-black text-slate-800">${t.name}</b>
          </div>
          <span class="text-xs font-black font-mono ${t.avg >= 90 ? 'text-emerald-700' : 'text-amber-600'}">
            ${t.avg}đ
          </span>
        </div>

        <div class="flex items-center gap-1 text-[10px]">
          <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold" title="Học sinh Tốt">🟢 ${t.greenCards}</span>
          <span class="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold" title="Thẻ Vàng (Khá)">🟡 ${t.yellowCards}</span>
          ${t.redCards > 0 ? `<span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-black animate-pulse" title="Thẻ Đỏ (Cảnh báo)">🔴 ${t.redCards}</span>` : ''}
        </div>

        <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400">
          <span>Sĩ số: ${t.stsCount} em</span>
          <span class="text-sky-700 font-bold">Chấm chéo: ${targetTeam}</span>
        </div>
      </div>
    `;
  }).join("");
}

// ==================== TẦNG 2: THẺ HỌC SINH MÀU & ĐIỂM DANH ====================
let currentAttSearchQuery = "";

function handleSearchStudentAttendance(query) {
  currentAttSearchQuery = (query || "").trim().toLowerCase();
  renderAttendanceSession();
}

function filterStudentTeamTab(teamName) {
  appState.currentStudentTeamFilter = teamName;

  document.querySelectorAll(".team-filter-btn").forEach(btn => {
    btn.className = "team-filter-btn px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 transition";
  });

  const activeId = teamName === "ALL" ? "btnTeamFilter-ALL" : 
                   (teamName === "Tổ 1" ? "btnTeamFilter-T1" : 
                   (teamName === "Tổ 2" ? "btnTeamFilter-T2" : 
                   (teamName === "Tổ 3" ? "btnTeamFilter-T3" : "btnTeamFilter-T4")));
  
  const activeBtn = document.getElementById(activeId);
  if (activeBtn) {
    activeBtn.className = "team-filter-btn px-3 py-1.5 rounded-xl bg-sky-700 text-white font-black text-xs shadow-sm border border-sky-700";
  }

  renderTeamDisciplineSummaryCards();
  renderAttendanceSession();
}

function changeAttendanceSession(newSessionKey) {
  appState.currentSessionKey = newSessionKey;
  appState.currentSessionLabel = getSessionLabel(newSessionKey);
  renderAttendanceSession();
  if (typeof renderSessionsGrid === "function") renderSessionsGrid();
}

function markAllPresentForCurrentSession() {
  const canEdit = (appState.roleLevel === "GVCN") || (appState.roleLevel === "LEADER" && appState.allowStudentLeaderEdit);
  if (!canEdit) {
    alert("Quyền ghi nhận nề nếp đang bị khóa hoặc bạn không có quyền thao tác!");
    return;
  }

  const curSession = appState.currentSessionKey;
  const dateStr = new Date().toLocaleDateString("vi-VN");
  const sessionDayKey = `${curSession}_${dateStr}`;

  if (!appState.attendanceRecords[sessionDayKey]) {
    appState.attendanceRecords[sessionDayKey] = {};
  }

  const targetStudents = (appState.currentStudentTeamFilter === "ALL")
    ? appState.students
    : appState.students.filter(s => s.to === appState.currentStudentTeamFilter);

  targetStudents.forEach(st => {
    const cur = appState.attendanceRecords[sessionDayKey][st.id];
    if (!cur || cur === "CHUA_DANH_DAU") {
      appState.attendanceRecords[sessionDayKey][st.id] = "CO_MAT";
    }
  });

  saveStateToLocal();
  renderAttendanceSession();
  if (typeof renderSessionsGrid === "function") renderSessionsGrid();
  renderOverviewDashboard();
}

function renderAttendanceSession() {
  const container = document.getElementById("attendanceStudentList");
  if (!container) return;

  const curSession = appState.currentSessionKey;
  const dateStr = new Date().toLocaleDateString("vi-VN");
  const sessionDayKey = `${curSession}_${dateStr}`;
  const todaySessionAtt = appState.attendanceRecords[sessionDayKey] || {};

  let list = (appState.currentStudentTeamFilter === "ALL")
    ? appState.students
    : appState.students.filter(s => s.to === appState.currentStudentTeamFilter);

  if (currentAttSearchQuery) {
    const cleanQ = removeVietnameseTones(currentAttSearchQuery);
    list = list.filter(s => {
      const cleanName = removeVietnameseTones(s.hoTen);
      const code = (s.id || "").toLowerCase();
      return cleanName.includes(cleanQ) || code.includes(cleanQ);
    });
  }

  const canEdit = (appState.roleLevel === "GVCN") || (appState.roleLevel === "LEADER" && appState.allowStudentLeaderEdit);

  if (list.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 italic text-xs">Không tìm thấy học sinh phù hợp.</div>`;
    renderSessionSpecificViolationsList();
    return;
  }

  container.innerHTML = list.map(st => {
    const currentStatus = todaySessionAtt[st.id] || "CHUA_DANH_DAU";
    const isCoMat = currentStatus === "CO_MAT";
    const isDiTre = currentStatus === "DI_TRE";
    const isVangPhep = currentStatus === "VANG_PHEP";
    const isVangKoPhep = currentStatus === "KHONG_PHEP";

    const score = Number(st.diemThiDua) || 100;
    
    let cardTheme = "border-slate-200 bg-white";
    let badgeType = `<span class="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">🟢 Thẻ Xanh</span>`;
    
    if (score < 70) {
      cardTheme = "border-rose-400 bg-rose-50/20";
      badgeType = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black animate-pulse">🔴 Thẻ Đỏ</span>`;
    } else if (score < 90) {
      cardTheme = "border-amber-300 bg-amber-50/20";
      badgeType = `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">🟡 Thẻ Vàng</span>`;
    }

    const studentEvents = appState.violations.filter(v => v.studentId === st.id);
    const recentTags = studentEvents.slice(0, 2).map(ev => {
      const isPlus = ev.points > 0;
      return `<span class="text-[9.5px] px-1.5 py-0.2 rounded font-bold truncate max-w-[140px] inline-block ${isPlus ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">${ev.criteria}</span>`;
    }).join(" ");

    return `
      <div class="p-3.5 rounded-2xl border-2 ${cardTheme} shadow-xs flex flex-col justify-between gap-2.5 transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-slate-300">
              ${st.id.replace("HS", "")}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-black text-slate-900 text-xs sm:text-sm truncate">${st.hoTen}</span>
                <span class="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">${st.to}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                ${badgeType}
                <span class="text-[10px] text-slate-500 font-mono">Điểm: <b class="${score < 70 ? 'text-rose-600' : (score < 90 ? 'text-amber-600' : 'text-emerald-700')}">${score}đ</b></span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            ${score < 90 && appState.roleLevel === "GVCN" ? `
              <button onclick="openRemedialTaskModal('${st.id}', '${st.hoTen}')" class="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold" title="Giao nhiệm vụ gỡ điểm sư phạm">
                <i class="fa-solid fa-hand-holding-heart mr-1"></i> Gỡ thẻ
              </button>
            ` : ''}
            <button onclick="openQuickScoreModal('${st.id}', '')" class="p-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 transition" title="Chấm Quy chế 01">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
          </div>
        </div>

        ${studentEvents.length > 0 ? `
          <div class="flex items-center gap-1 overflow-hidden py-0.5">
            ${recentTags}
          </div>
        ` : ''}

        <div class="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 ${canEdit ? '' : 'opacity-40 pointer-events-none'}">
          <button onclick="setAttendanceStatus('${st.id}', '${st.hoTen}', 'CO_MAT')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isCoMat ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-check"></i> Có mặt
          </button>
          <button onclick="setAttendanceStatus('${st.id}', '${st.hoTen}', 'DI_TRE')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isDiTre ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-clock"></i> Trễ (-10)
          </button>
          <button onclick="setAttendanceStatus('${st.id}', '${st.hoTen}', 'VANG_PHEP')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isVangPhep ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-envelope-open"></i> Phép (0)
          </button>
          <button onclick="setAttendanceStatus('${st.id}', '${st.hoTen}', 'KHONG_PHEP')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isVangKoPhep ? 'bg-rose-600 text-white shadow-xs animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-triangle-exclamation"></i> K.Phép (-20)
          </button>
        </div>
      </div>
    `;
  }).join("");

  renderSessionSpecificViolationsList();
}

async function setAttendanceStatus(studentId, studentName, status) {
  const curSession = appState.currentSessionKey;
  const dateStr = new Date().toLocaleDateString("vi-VN");
  const sessionDayKey = `${curSession}_${dateStr}`;

  if (!appState.attendanceRecords[sessionDayKey]) {
    appState.attendanceRecords[sessionDayKey] = {};
  }

  const prevStatus = appState.attendanceRecords[sessionDayKey][studentId];
  appState.attendanceRecords[sessionDayKey][studentId] = status;

  let delta = 0;
  let label = "Có mặt";
  if (status === "DI_TRE") { delta = -10; label = "Đi học trễ"; }
  else if (status === "VANG_PHEP") { delta = 0; label = "Nghỉ học (Có phép)"; }
  else if (status === "KHONG_PHEP") { delta = -20; label = "Vắng học (Không phép)"; }

  const st = appState.students.find(s => s.id === studentId);
  if (st && delta !== 0 && prevStatus !== status) {
    st.diemThiDua = Math.max(0, (Number(st.diemThiDua) || 100) + delta);
    
    appState.violations.unshift({
      time: `${appState.currentSessionLabel} (${dateStr})`,
      studentId,
      studentName,
      criteria: `[Chuyên cần] ${label}`,
      points: delta,
      note: "Điểm danh ca học",
      sender: appState.currentUser ? appState.currentUser.fullName : "Cán sự điểm danh",
      incidentKey: `ATT_${sessionDayKey}_${studentId}`
    });
  }

  saveStateToLocal();
  renderTeamDisciplineSummaryCards();
  renderAttendanceSession();
  if (typeof renderSessionsGrid === "function") renderSessionsGrid();
  renderOverviewDashboard();

  callApi("saveAttendance", {
    sessionKey: curSession,
    sessionName: appState.currentSessionLabel,
    date: dateStr,
    studentId,
    studentName,
    status,
    sender: appState.currentUser ? appState.currentUser.fullName : "Cán sự điểm danh"
  });
}

// ==================== CHẤM ĐIỂM QUY CHẾ 01 & PHÂN QUYỀN CHẤM CHÉO ====================
function openQuickScoreModal(studentId, defaultType) {
  const st = appState.students.find(s => s.id === studentId);
  if (st && appState.roleLevel === "LEADER") {
    const userTeam = appState.currentUser.team;
    const targetMap = { "Tổ 1": "Tổ 2", "Tổ 2": "Tổ 3", "Tổ 3": "Tổ 4", "Tổ 4": "Tổ 1" };
    const allowedTeam = targetMap[userTeam];
    const userRole = (appState.currentUser.role || "").toLowerCase();
    const isClassLeader = userRole.includes("lớp trưởng") || userRole.includes("lớp phó") || userRole.includes("bí thư");

    if (!isClassLeader && allowedTeam && st.to !== allowedTeam) {
      alert(`Theo Quy chế 01 chấm chéo, ${userTeam} chỉ được chấm điểm học sinh của ${allowedTeam}! Bạn không được phép chấm ${st.to}.`);
      return;
    }
  }

  populateCriteriaSelect(defaultType);
  populateStudentSelectByRules();
  const selStudent = document.getElementById("violationStudentSelect");
  if (selStudent && st) {
    selStudent.value = `${st.id}|${st.hoTen}`;
  }

  openRecordViolationModal();
}

function populateStudentSelectByRules() {
  const sel = document.getElementById("violationStudentSelect");
  if (!sel) return;

  let list = appState.students;
  if (appState.roleLevel === "LEADER") {
    const userTeam = appState.currentUser.team;
    const targetMap = { "Tổ 1": "Tổ 2", "Tổ 2": "Tổ 3", "Tổ 3": "Tổ 4", "Tổ 4": "Tổ 1" };
    const allowedTeam = targetMap[userTeam];
    const userRole = (appState.currentUser.role || "").toLowerCase();
    const isClassLeader = userRole.includes("lớp trưởng") || userRole.includes("lớp phó") || userRole.includes("bí thư");

    if (!isClassLeader && allowedTeam) {
      list = appState.students.filter(s => s.to === allowedTeam);
    }
  }

  sel.innerHTML = list.map(s => `
    <option value="${s.id}|${s.hoTen}">${s.id} - ${s.hoTen} (${s.to})</option>
  `).join("");
}

function populateCriteriaSelect(filterType) {
  const sel = document.getElementById("violationCriteriaSelect");
  if (!sel) return;

  const filtered = filterType ? appState.criteriaList.filter(c => c.type === filterType) : appState.criteriaList;
  sel.innerHTML = filtered.map(c => `
    <option value="${c.code}|${c.points}">${c.type === 'CONG' ? '🟢' : '🔴'} ${c.code}: ${c.name} (${c.points > 0 ? '+' : ''}${c.points}đ)</option>
  `).join("");
}

function openRecordViolationModal() {
  const modal = document.getElementById("recordViolationModal");
  if (modal) modal.classList.remove("hidden");
}

function closeRecordViolationModal() {
  const modal = document.getElementById("recordViolationModal");
  if (modal) modal.classList.add("hidden");
}

async function submitRecordViolation() {
  const studentVal = document.getElementById("violationStudentSelect").value.split("|");
  const studentId = studentVal[0];
  const studentName = studentVal[1];

  const criteriaVal = document.getElementById("violationCriteriaSelect").value.split("|");
  const points = Number(criteriaVal[1]) || 0;
  const note = document.getElementById("violationNoteInput").value.trim();

  const st = appState.students.find(s => s.id === studentId);
  if (st) {
    st.diemThiDua = Math.max(0, (Number(st.diemThiDua) || 100) + points);
  }

  const dateStr = new Date().toLocaleDateString("vi-VN");
  const criteriaText = document.getElementById("violationCriteriaSelect").selectedOptions[0].text;

  appState.violations.unshift({
    time: `${appState.currentSessionLabel} (${dateStr})`,
    studentId,
    studentName,
    criteria: criteriaText,
    points,
    note,
    sender: appState.currentUser ? appState.currentUser.fullName : "Ban Cán sự",
    incidentKey: `VIO_${Date.now()}`
  });

  saveStateToLocal();
  renderTeamDisciplineSummaryCards();
  renderOverviewDashboard();
  renderAttendanceSession();
  closeRecordViolationModal();
  alert("Đã ghi nhận nề nếp thành công!");

  callApi("recordViolation", {
    displayTime: `${appState.currentSessionLabel} (${dateStr})`,
    studentId,
    studentName,
    criteria: criteriaText,
    points,
    note,
    sender: appState.currentUser ? appState.currentUser.fullName : "Ban Cán sự"
  });
}

// ==================== TẦNG 3: NHẬT KÝ SỰ VỤ & CƠ CHẾ GỠ ĐIỂM SƯ PHẠM ====================
function renderSessionSpecificViolationsList() {
  const container = document.getElementById("sessionSpecificViolationsList");
  const headerTitle = document.getElementById("sessionLogHeaderTitle");
  if (!container) return;

  if (headerTitle) headerTitle.innerText = appState.currentSessionLabel;

  const sessViolations = appState.violations.filter(v => v.time && v.time.includes(appState.currentSessionLabel));
  const activeEvents = sessViolations.filter(v => !v.criteria.includes("Có mặt"));
  const isGVCN = (appState.roleLevel === "GVCN");

  if (activeEvents.length === 0) {
    container.innerHTML = `<p class="py-3 text-center text-slate-400 italic text-xs">Chưa có phát sinh điểm thưởng/phạt nào trong ca học này.</p>`;
    return;
  }

  container.innerHTML = activeEvents.map((v, vIdx) => {
    const isPlus = v.points > 0;
    const badgeClass = isPlus ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200";

    return `
      <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-100/70 transition">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <b class="text-slate-900">${v.studentName}</b>
            <span class="text-[10px] text-slate-500 font-bold">(${getStudentTeam(v.studentId)})</span>
            <span class="text-[9.5px] text-slate-400 font-mono">${v.time}</span>
          </div>
          <p class="text-[11px] text-slate-700">${v.criteria} ${v.note ? `• <i>${v.note}</i>` : ''}</p>
        </div>

        <div class="flex items-center gap-2">
          <span class="font-mono font-black text-xs px-2 py-0.5 rounded-lg border ${badgeClass}">
            ${isPlus ? '+' : ''}${v.points}đ
          </span>
          ${isGVCN ? `
            <button onclick="removeViolationItem('${v.incidentKey || vIdx}', '${v.studentId}', ${v.points})" class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Xóa bản ghi này">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");
}

function openRemedialTaskModal(studentId, studentName) {
  const task = prompt(
    `[CƠ CHẾ SƯ PHẠM TÍCH CỰC - GỠ THẺ CHO HỌC SINH]\n` +
    `Học sinh: ${studentName}\n\n` +
    `Nhập nhiệm vụ rèn luyện đã hoàn thành để phục hồi điểm (+10đ):\n` +
    `1. Trực nhật bù phòng học sạch sẽ\n` +
    `2. Chăm sóc bồn hoa Đoàn trường\n` +
    `3. Xung phong phát biểu / làm bài tập tốt\n`,
    "Hoàn thành xuất sắc ca trực nhật bù"
  );

  if (!task) return;

  const st = appState.students.find(s => s.id === studentId);
  if (st) {
    st.diemThiDua = Math.min(100, (Number(st.diemThiDua) || 100) + 10);
    appState.violations.unshift({
      time: `${appState.currentSessionLabel} (${new Date().toLocaleDateString("vi-VN")})`,
      studentId: st.id,
      studentName: st.hoTen,
      criteria: `[Khắc phục nề nếp] ${task}`,
      points: 10,
      note: "GVCN nghiệm thu phục hồi điểm thi đua",
      sender: "GVCN phê duyệt",
      incidentKey: `REMEDIAL_${Date.now()}`
    });

    saveStateToLocal();
    renderTeamDisciplineSummaryCards();
    renderAttendanceSession();
    if (typeof renderSessionsGrid === "function") renderSessionsGrid();
    renderOverviewDashboard();
    alert(`🎉 Đã phục hồi +10đ rèn luyện và gỡ thẻ cảnh báo cho học sinh [${studentName}]!`);
  }
}

// ==================== SỔ ĐẦU BÀI ĐIỆN TỬ ====================
function renderPeriodCards() {
  const grid = document.getElementById("periodCardGrid");
  if (!grid) return;

  grid.innerHTML = appState.periodLogs.map(p => `
    <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-sky-700 uppercase">${p.period}</span>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${p.rating === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">Loại ${p.rating}</span>
      </div>
      <p class="text-xs font-black text-slate-800 truncate">${p.subject}</p>
      <p class="text-[10px] text-slate-500 italic line-clamp-2">${p.note || "Tiết dạy nghiêm túc."}</p>
      <span class="text-[9px] text-slate-400 block font-mono">${p.time}</span>
    </div>
  `).join("");
}

function openClassSessionLogModal() {
  const selStudent = document.getElementById("logViolationStudentSelect");
  if (selStudent) {
    selStudent.innerHTML = `<option value="NONE">-- Không có vi phạm --</option>` + appState.students.map(s => `
      <option value="${s.id}">${s.id} - ${s.hoTen} (${s.to})</option>
    `).join("");
  }
  updateSuggestedSubjectByTkb();
  const modal = document.getElementById("sessionLogModal");
  if (modal) modal.classList.remove("hidden");
}

function closeClassSessionLogModal() {
  const modal = document.getElementById("sessionLogModal");
  if (modal) modal.classList.add("hidden");
}

function updateSuggestedSubjectByTkb() {
  const periodVal = document.getElementById("logPeriodSelect") ? document.getElementById("logPeriodSelect").value : "Tiết 1";
  const pNum = parseInt(periodVal.replace(/\D/g, '')) || 1;
  const now = new Date();
  const day = now.getDay();
  const dayKey = `t${day + 1}`;
  const isMorning = now.getHours() < 12;

  const periods = isMorning ? TKB_CONFIG_SO3.morning : TKB_CONFIG_SO3.afternoon;
  const matchP = periods.find(p => p.period === pNum);
  const subj = matchP ? matchP[dayKey] : "Tiết chính khóa";

  const textEl = document.getElementById("suggestedSubjectText");
  if (textEl) textEl.innerText = `${subj} (${isMorning ? 'Buổi Sáng' : 'Buổi Chiều'})`;
}

async function submitClassSessionLogSimple() {
  const period = document.getElementById("logPeriodSelect").value;
  const rating = document.getElementById("logRatingSelect").value;
  const note = document.getElementById("logNoteInput").value.trim();
  const vioStudentId = document.getElementById("logViolationStudentSelect").value;
  const vioReason = document.getElementById("logViolationReasonSelect").value;

  const now = new Date();
  const day = now.getDay();
  const dayKey = `t${day + 1}`;
  const isMorning = now.getHours() < 12;

  const periods = isMorning ? TKB_CONFIG_SO3.morning : TKB_CONFIG_SO3.afternoon;
  const pNum = parseInt(period.replace(/\D/g, '')) || 1;
  const matchP = periods.find(p => p.period === pNum);
  const subjectName = matchP ? matchP[dayKey] : "Tiết chính khóa";

  const dateStr = now.toLocaleDateString("vi-VN");
  const sessionLabel = appState.currentSessionLabel;

  if (vioStudentId && vioStudentId !== "NONE") {
    const st = appState.students.find(s => s.id === vioStudentId);
    const incidentKey = `VIO_${sessionLabel}_${vioStudentId}_${vioReason}`;
    const isExisted = appState.violations.some(v => v.incidentKey === incidentKey);

    if (isExisted) {
      alert(`Học sinh [${st.hoTen}] đã được Tổ trưởng ghi nhận lỗi [${vioReason}] trong buổi hôm nay. Sổ đầu bài ghi nhận đối chiếu chứ KHÔNG trừ điểm lần thứ 2!`);
    } else {
      st.diemThiDua = Math.max(0, (Number(st.diemThiDua) || 100) - 10);
      appState.violations.unshift({
        time: `${sessionLabel} (${period})`,
        studentId: st.id,
        studentName: st.hoTen,
        criteria: `[SĐB - ${subjectName}] ${vioReason}`,
        points: -10,
        note: `Ghi nhận từ Sổ đầu bài (Xếp loại: ${rating})`,
        sender: appState.currentUser ? appState.currentUser.fullName : "Lớp phó Học tập",
        incidentKey: incidentKey
      });
      alert(`Đã ghi nhận Sổ đầu bài và trừ 10 điểm bổ trợ cho học sinh [${st.hoTen}].`);
    }
  }

  const logItem = { period, subject: subjectName, rating, note, time: dateStr };
  appState.periodLogs.unshift(logItem);

  saveStateToLocal();
  renderOverviewDashboard();
  renderPeriodCards();
  closeClassSessionLogModal();

  callApi("saveClassSessionLog", {
    date: dateStr,
    session: sessionLabel,
    period,
    subject: subjectName,
    rating,
    note,
    violationStudentId: vioStudentId !== "NONE" ? vioStudentId : "",
    violationReason: vioReason,
    sender: appState.currentUser ? appState.currentUser.fullName : "Ban Cán sự"
  });
}

// ==================== BIÊN BẢN SINH HOẠT LỚP (NGHỊ ĐỊNH 30) ====================
function renderOfficialShlReportTab() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const locDateEl = document.getElementById("shlLocationDate");
  if (locDateEl) locDateEl.innerText = `Tây Sơn, ngày ${day} tháng ${month} năm ${year}`;

  const fullTextEl = document.getElementById("shlDateFullText");
  if (fullTextEl) fullTextEl.innerText = `ngày ${day} tháng ${month} năm ${year}`;

  const lateViolations = appState.violations.filter(v => v.criteria && v.criteria.includes("trễ"));
  const excusedViolations = appState.violations.filter(v => v.criteria && v.criteria.includes("Có phép"));
  const unexcusedViolations = appState.violations.filter(v => v.criteria && v.criteria.includes("Không phép"));

  const lateEl = document.getElementById("shlLateCount");
  const excEl = document.getElementById("shlLeaveExcused");
  const unexcEl = document.getElementById("shlLeaveUnexcused");
  const absentEl = document.getElementById("shlAbsentCount");
  const presentEl = document.getElementById("shlPresentCount");

  const total = appState.students.length || 45;
  const absentTotal = excusedViolations.length + unexcusedViolations.length;

  if (lateEl) lateEl.innerText = `${lateViolations.length}`;
  if (excEl) excEl.innerText = `${excusedViolations.length}`;
  if (unexcEl) unexcEl.innerText = `${unexcusedViolations.length}`;
  if (absentEl) absentEl.innerText = `${absentTotal}`;
  if (presentEl) presentEl.innerText = `${total - absentTotal}/${total}`;

  const avg = appState.students.length > 0
    ? (appState.students.reduce((acc, s) => acc + (Number(s.diemThiDua) || 0), 0) / appState.students.length).toFixed(1)
    : "100.0";
  const avgEl = document.getElementById("shlAvgPoints");
  if (avgEl) avgEl.innerText = `${avg}`;

  let tot = 0, kha = 0, dat = 0, chuadat = 0;
  appState.students.forEach(s => {
    const pts = Number(s.diemThiDua) || 100;
    if (pts >= 90) tot++;
    else if (pts >= 70) kha++;
    else if (pts >= 50) dat++;
    else chuadat++;
  });
  const tt22Summary = document.getElementById("shlTT22SummaryText");
  if (tt22Summary) {
    tt22Summary.innerText = `${tot} HS xếp loại Tốt (${Math.round(tot/total*100)}%), ${kha} HS xếp loại Khá (${Math.round(kha/total*100)}%), ${dat + chuadat} HS Đạt/Chưa đạt`;
  }

  const commendContainer = document.getElementById("shlCommendationList");
  if (commendContainer) {
    const plusStudents = [];
    appState.violations.forEach(v => {
      if (v.points > 0) {
        plusStudents.push(`${v.studentName} (${getStudentTeam(v.studentId)}): ${v.criteria} (+${v.points} điểm)`);
      }
    });

    if (plusStudents.length === 0) {
      commendContainer.innerHTML = `<p class="mso-item" style="margin: 0 0 3.5pt 36pt; font-style: italic; color: #475569;">Toàn thể lớp duy trì nề nếp ổn định, không có phát sinh điểm trừ.</p>`;
    } else {
      commendContainer.innerHTML = plusStudents.map(line => `<p class="mso-item" style="margin: 0 0 3.5pt 36pt;">- ${line}</p>`).join("");
    }
  }

  const penalizedContainer = document.getElementById("shlPenalizedList");
  if (penalizedContainer) {
    const penalized = appState.students.filter(s => Number(s.diemThiDua) < 100);
    if (penalized.length === 0) {
      penalizedContainer.innerHTML = `<p class="mso-item" style="margin: 0 0 3.5pt 36pt; color: #475569;">100% học sinh chấp hành tốt nội quy trường lớp, không có trường hợp vi phạm.</p>`;
    } else {
      penalizedContainer.innerHTML = penalized.map((s, idx) => `
        <p class="mso-item" style="margin: 0 0 3.5pt 36pt;">- ${s.hoTen} (${s.to}): Điểm rèn luyện hiện tại ${s.diemThiDua} điểm (Xếp loại: ${getTT22Label(s.diemThiDua)})</p>
      `).join("");
    }
  }
}

function copyWeeklyShlZaloMsg() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("vi-VN");
  const avg = document.getElementById("dashAvgScore") ? document.getElementById("dashAvgScore").innerText : "100.0đ";

  let msg = `📋 [BIÊN BẢN SINH HOẠT LỚP 10A12 - TIẾT 1 THỨ HAI ${dateStr}]\n` +
            `Trường THPT số 1 Quang Trung (Phân hiệu)\n` +
            `GVCN: ThS. Trần Dương Quốc Mẫn • Sĩ số: ${appState.students.length}/${appState.students.length}\n\n` +
            `1. TỔNG HỢP NỀ NẾP & RÈN LUYỆN:\n` +
            `• Điểm thi đua trung bình toàn lớp: ${avg}\n` +
            `• Đánh giá theo Thông tư 22: ${document.getElementById("shlTT22SummaryText") ? document.getElementById("shlTT22SummaryText").innerText : "Đa số đạt loại Tốt"}\n\n` +
            `2. HỌC SINH CẦN KHẮC PHỤC TUẦN TỚI:\n`;

  const penalized = appState.students.filter(s => Number(s.diemThiDua) < 100);
  if (penalized.length === 0) {
    msg += `(Không có - 100% học sinh chấp hành xuất sắc)\n`;
  } else {
    penalized.forEach((s, idx) => {
      msg += `${idx + 1}. ${s.hoTen} (${s.to}): ${s.diemThiDua}đ\n`;
    });
  }

  msg += `\n3. NHẮC NHỞ TỪ THẦY CHỦ NHIỆM:\n` +
         `- Tiếp tục học theo Thời khóa biểu Số 3.\n` +
         `- Trang phục, phù hiệu đúng quy định, giữ gìn vệ sinh lớp học.\n` +
         `Chúc các em và Quý Phụ huynh tuần mới nhiều năng lượng!`;

  navigator.clipboard.writeText(msg).then(() => {
    alert("Đã sao chép nội dung Biên bản SHL để gửi vào nhóm Zalo lớp!");
  }).catch(() => {
    prompt("Sao chép nội dung gửi Zalo:", msg);
  });
}

function exportShlToDocxFile() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const dateStr = `${day}_${month}_${year}`;

  const dateFull = document.getElementById("shlDateFullText") ? document.getElementById("shlDateFullText").innerText : `ngày ${day} tháng ${month} năm ${year}`;
  const presentCount = document.getElementById("shlPresentCount") ? document.getElementById("shlPresentCount").innerText : "45/45";
  const lateCount = document.getElementById("shlLateCount") ? document.getElementById("shlLateCount").innerText : "0";
  const absentCount = document.getElementById("shlAbsentCount") ? document.getElementById("shlAbsentCount").innerText : "0";
  const leaveExcused = document.getElementById("shlLeaveExcused") ? document.getElementById("shlLeaveExcused").innerText : "0";
  const leaveUnexcused = document.getElementById("shlLeaveUnexcused") ? document.getElementById("shlLeaveUnexcused").innerText : "0";
  const avgPoints = document.getElementById("shlAvgPoints") ? document.getElementById("shlAvgPoints").innerText : "100.0";
  const tt22Summary = document.getElementById("shlTT22SummaryText") ? document.getElementById("shlTT22SummaryText").innerText : "100% học sinh xếp loại Tốt";

  const commendHtml = document.getElementById("shlCommendationList") ? document.getElementById("shlCommendationList").innerHTML : "<p class='mso-item' style='margin: 0 0 3.5pt 36pt; font-style:italic;color:#475569;'>Toàn thể lớp duy trì nề nếp ổn định, không có phát sinh điểm trừ.</p>";
  const penalizedHtml = document.getElementById("shlPenalizedList") ? document.getElementById("shlPenalizedList").innerHTML : "<p class='mso-item' style='margin: 0 0 3.5pt 36pt; color:#475569;'>100% học sinh chấp hành tốt nội quy trường lớp, không có trường hợp vi phạm.</p>";

  const fullDocumentHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>Biên Bản Sinh Hoạt Lớp 10A12</title>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
@page Section1 {
  size: 595.3pt 841.9pt; /* Chuẩn A4 */
  margin: 56.7pt 45.4pt 56.7pt 70.85pt; /* Trên 20mm, Phải 16mm, Dưới 20mm, Trái 25mm */
  mso-header-margin: 35.4pt;
  mso-footer-margin: 35.4pt;
  mso-paper-source: 0;
}
div.Section1 { page: Section1; }
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 13pt;
  line-height: 1.35;
  color: #000000;
}
table.mso-table {
  width: 100%;
  border-collapse: collapse;
  mso-table-lspace: 0pt;
  mso-table-rspace: 0pt;
  margin-left: 0pt;
  margin-right: 0pt;
}
table.mso-table td {
  padding: 0;
  vertical-align: top;
  border: none;
}
p.mso-title {
  margin: 0 0 2pt 0;
  text-align: center;
  line-height: 1.25;
}
p.mso-p {
  margin: 0 0 4.5pt 0;
  text-align: justify;
  font-size: 13pt;
  line-height: 1.35;
}
p.mso-item {
  margin: 0 0 3.5pt 36pt;
  text-align: justify;
  font-size: 13pt;
  line-height: 1.35;
}
.line-cq {
  border-bottom: 1pt solid #000000;
  width: 85pt;
  margin: 2pt auto 0 auto;
}
.line-tn {
  border-bottom: 1.5pt solid #000000;
  width: 135pt;
  margin: 2pt auto 4pt auto;
}
</style>
</head>
<body>
<div class="Section1">

<!-- QUỐC HIỆU & TIÊU NGỮ -->
<table class="mso-table" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14pt;">
  <tr>
    <td style="width: 44%; text-align: center;">
      <p class="mso-title" style="font-size: 11pt; text-transform: uppercase;">SỞ GD&ĐT GIA LAI</p>
      <p class="mso-title" style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">TRƯỜNG THPT SỐ 1 QUANG TRUNG</p>
      <p class="mso-title" style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">LỚP 10A12 (K58)</p>
      <div class="line-cq"></div>
    </td>
    <td style="width: 56%; text-align: center;">
      <p class="mso-title" style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
      <p class="mso-title" style="font-size: 12pt; font-weight: bold;">Độc lập - Tự do - Hạnh phúc</p>
      <div class="line-tn"></div>
      <p class="mso-title" style="font-size: 12pt; font-style: italic; margin-top: 4pt;">Tây Sơn, ngày ${day} tháng ${month} năm ${year}</p>
    </td>
  </tr>
</table>

<!-- TIÊU ĐỀ BIÊN BẢN -->
<div style="text-align: center; margin-top: 8pt; margin-bottom: 16pt;">
  <p class="mso-title" style="font-size: 15pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">BIÊN BẢN SINH HOẠT LỚP</p>
  <p class="mso-title" style="font-size: 12pt; font-style: italic;">(Tiết 1, Sáng Thứ Hai • Địa điểm: Phòng học lớp 10A12)</p>
</div>

<!-- PHẦN I -->
<p class="mso-p" style="font-weight: bold; text-transform: uppercase; margin-top: 8pt;">I. THỜI GIAN, ĐỊA ĐIỂM, THÀNH PHẦN THAM DỰ</p>
<p class="mso-p" style="text-indent: 24pt;"><b>1. Thời gian:</b> Vào hồi 07 giờ 00 phút, sáng Thứ Hai, ${dateFull} (Tiết 1 sinh hoạt lớp).</p>
<p class="mso-p" style="text-indent: 24pt;"><b>2. Địa điểm:</b> Phòng học lớp 10A12, Trường THPT số 1 Quang Trung (Phân hiệu).</p>
<p class="mso-p" style="text-indent: 24pt;"><b>3. Thành phần tham dự:</b></p>
<p class="mso-item">- Chủ trì: <b>ThS. Trần Dương Quốc Mẫn</b> - Giáo viên chủ nhiệm.</p>
<p class="mso-item">- Thư ký: <b>Nguyễn Tấn An</b> - Lớp trưởng.</p>
<p class="mso-item">- Tập thể học sinh: Có mặt <b>${presentCount}</b> học sinh; Đi học trễ: <b>${lateCount}</b> lượt; Vắng: <b>${absentCount}</b> (trong đó: Có phép: ${leaveExcused}, Không phép: ${leaveUnexcused}).</p>

<!-- PHẦN II -->
<p class="mso-p" style="font-weight: bold; text-transform: uppercase; margin-top: 10pt;">II. NỘI DUNG SINH HOẠT VÀ ĐÁNH GIÁ THI ĐUA</p>
<p class="mso-p" style="text-indent: 24pt;"><b>1. Đánh giá tình hình nề nếp và rèn luyện tuần qua:</b></p>
<p class="mso-item">- Điểm rèn luyện trung bình toàn lớp đạt: <b>${avgPoints}</b>/100 điểm.</p>
<p class="mso-item">- Xếp loại rèn luyện theo Thông tư 22/2021/TT-BGDĐT: ${tt22Summary}.</p>

<p class="mso-p" style="text-indent: 24pt;"><b>2. Tuyên dương, khen thưởng các học sinh tích cực / việc tốt:</b></p>
<div style="margin-bottom: 4pt;">${commendHtml}</div>

<p class="mso-p" style="text-indent: 24pt;"><b>3. Danh sách học sinh cần nhắc nhở và khắc phục nề nếp tuần tới:</b></p>
<div style="margin-bottom: 4pt;">${penalizedHtml}</div>

<p class="mso-p" style="text-indent: 24pt;"><b>4. Báo cáo của Ban cán sự chuyên trách:</b></p>
<p class="mso-item">- <i>Trực nhật & Vệ sinh (Lớp phó Lao động):</i> Đã hoàn thành 7 ca trực nhật phòng học trong tuần; kiểm tra lớp học sạch sẽ trước và sau buổi học.</p>
<p class="mso-item">- <i>Học tập & Sổ đầu bài (Lớp phó Học tập):</i> Ghi chép sổ đầu bài đầy đủ, theo dõi nghiêm túc các tiết học theo Thời khóa biểu Số 3.</p>
<p class="mso-item">- <i>Văn thể mỹ & Đoàn thể (Lớp phó VTM & Bí thư):</i> Đôn đốc học sinh tham gia phong trào, cập nhật kho tư liệu hoạt động lớp.</p>

<!-- PHẦN III -->
<p class="mso-p" style="font-weight: bold; text-transform: uppercase; margin-top: 10pt;">III. Ý KIẾN KẾT LUẬN VÀ PHƯƠNG HƯỚNG CỦA GIÁO VIÊN CHỦ NHIỆM</p>
<p class="mso-p" style="text-indent: 24pt;">1. Tiếp tục duy trì nghiêm túc giờ giấc, tác phong, đồng phục, bảng tên, quy chế xếp hàng đầu tuần; tuyệt đối không sử dụng điện thoại di động trong giờ học khi chưa được sự cho phép của giáo viên bộ môn.</p>
<p class="mso-p" style="text-indent: 24pt;">2. Chuẩn bị bài chu đáo theo đúng Thời khóa biểu Số 3, tăng cường trao đổi thảo luận nhóm và tích cực phát biểu xây dựng bài học.</p>
<p class="mso-p" style="text-indent: 24pt;">3. Các tổ trưởng và cán sự tiếp tục duy trì chấm chéo nề nếp công tâm, minh bạch theo đúng Quy chế 01 của lớp.</p>

<!-- PHẦN IV -->
<p class="mso-p" style="font-weight: bold; text-transform: uppercase; margin-top: 10pt;">IV. KẾT THÚC BUỔI SINH HOẠT</p>
<p class="mso-p" style="text-indent: 24pt;">Biên bản kết thúc vào lúc 07 giờ 45 phút cùng ngày, đã được thư ký đọc lại công khai trước toàn thể học sinh lớp 10A12 và được 100% thành viên nhất trí thông qua, không có ý kiến khiếu nại.</p>

<!-- CHỮ KÝ HAI BÊN -->
<table class="mso-table" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24pt; page-break-inside: avoid;">
  <tr>
    <td style="width: 50%; text-align: center;">
      <p class="mso-title" style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">THƯ KÝ / LỚP TRƯỞNG</p>
      <p class="mso-title" style="font-size: 10.5pt; font-style: italic;">(Ký và ghi rõ họ tên)</p>
      <div style="height: 60pt;"></div>
      <p class="mso-title" style="font-size: 12.5pt; font-weight: bold;">Nguyễn Tấn An</p>
    </td>
    <td style="width: 50%; text-align: center;">
      <p class="mso-title" style="font-size: 11.5pt; font-weight: bold; text-transform: uppercase;">GIÁO VIÊN CHỦ NHIỆM</p>
      <p class="mso-title" style="font-size: 10.5pt; font-style: italic;">(Ký và ghi rõ họ tên)</p>
      <div style="height: 60pt;"></div>
      <p class="mso-title" style="font-size: 12.5pt; font-weight: bold;">ThS. Trần Dương Quốc Mẫn</p>
    </td>
  </tr>
</table>

</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff', fullDocumentHTML], {
    type: 'application/msword;charset=utf-8'
  });

  const fileName = `Bien_Ban_SHL_10A12_${dateStr}.doc`;
  const downloadLink = document.createElement("a");
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  downloadLink.download = fileName;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ==================== QUẢN LÝ LƯU TRỮ & KHÓA SỔ THEO TUẦN ====================
function switchWeekScope(weekNum) {
  const currentRealWeek = (typeof getAutoSchoolWeek === "function") ? getAutoSchoolWeek() : 11;
  appState.selectedWeek = parseInt(weekNum) || currentRealWeek;

  const badge = document.getElementById("weekStatusBadge");
  const lockBtn = document.getElementById("btnLockWeekAction");

  if (!appState.weeklyArchives) appState.weeklyArchives = {};
  const archive = appState.weeklyArchives[`Tuan_${appState.selectedWeek}`];

  if (archive) {
    if (badge) {
      badge.className = "text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300";
      badge.innerHTML = `<i class="fa-solid fa-lock text-[8px] mr-1"></i> Đã chốt sổ lưu trữ`;
    }
    if (lockBtn) lockBtn.classList.add("hidden");
  } else {
    if (badge) {
      badge.className = "text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300";
      badge.innerHTML = `<i class="fa-solid fa-circle-dot text-[8px] mr-1 animate-pulse"></i> Đang diễn ra`;
    }
    if (lockBtn && appState.roleLevel === "GVCN") lockBtn.classList.remove("hidden");
  }

  renderAttendanceSession();
  if (typeof renderSessionsGrid === "function") renderSessionsGrid();
  renderOfficialShlReportTab();
}

function lockAndArchiveCurrentWeek() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền chốt sổ tuần học!");
    return;
  }
  const curWeek = appState.selectedWeek || 11;
  if (!confirm(`Thầy có chắc chắn muốn chốt sổ và lưu trữ kết quả rèn luyện Tuần ${curWeek}? Sau khi chốt, dữ liệu tuần này sẽ được đóng băng.`)) return;

  if (!appState.weeklyArchives) appState.weeklyArchives = {};
  const archiveKey = `Tuan_${curWeek}`;

  appState.weeklyArchives[archiveKey] = {
    week: curWeek,
    lockedAt: new Date().toLocaleString("vi-VN"),
    lockedBy: appState.currentUser ? appState.currentUser.fullName : "GVCN",
    avgScore: document.getElementById("dashAvgScore") ? document.getElementById("dashAvgScore").innerText : "100.0đ",
    students: JSON.parse(JSON.stringify(appState.students)),
    violations: JSON.parse(JSON.stringify(appState.violations)),
    shlDocHtml: document.getElementById("shlOfficialDocument") ? document.getElementById("shlOfficialDocument").innerHTML : ""
  };

  saveStateToLocal();
  switchWeekScope(curWeek);
  alert(`🎉 Đã chốt sổ và lưu trữ thành công hồ sơ Tuần ${curWeek}!`);
}