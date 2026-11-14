/**
 * ============================================================================
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ NỀ NẾP, THI ĐUA, SỔ ĐẦU BÀI & BIÊN BẢN SHL
 * Tác giả: GVCN ThS. Trần Dương Quốc Mẫn
 * Phiên bản: 14.2 (Thẻ Tổ 3 Cấp, Thẻ Màu Xanh/Vàng/Đỏ, Gỡ Điểm & Word Nghị Định 30)
 * ============================================================================
 */

function getAttendanceDeltaInfo(status) {
  if (status === "DI_TRE") return { delta: -10, label: "Đi học trễ" };
  if (status === "VANG_PHEP") return { delta: 0, label: "Nghỉ học (Có phép)" };
  if (status === "KHONG_PHEP") return { delta: -20, label: "Vắng học (Không phép)" };
  return { delta: 0, label: "Có mặt" };
}

function canModifyDiscipline(targetTeam = null) {
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { isEditable: true };
  if (!scoped.isEditable) {
    return { ok: false, reason: `Tuần ${scoped.selectedWeek} đang ở chế độ xem lịch sử / đã chốt sổ, không thể chỉnh sửa!` };
  }
  if (!appState.currentUser) {
    return { ok: false, reason: "Vui lòng đăng nhập để thao tác!" };
  }
  if (appState.roleLevel === "GVCN") return { ok: true };
  if (appState.roleLevel !== "LEADER") {
    return { ok: false, reason: "Bạn không có quyền ghi nhận điểm thi đua / chuyên cần!" };
  }
  if (!appState.allowStudentLeaderEdit) {
    return { ok: false, reason: "Thầy chủ nhiệm đang tạm KHÓA quyền ghi nề nếp của Ban cán sự!" };
  }
  if (targetTeam) {
    const userRole = String(appState.currentUser.role || "").toLowerCase();
    const isClassLeader = userRole.includes("lớp trưởng") || userRole.includes("lớp phó") || userRole.includes("bí thư");
    if (!isClassLeader) {
      const targetMap = { "Tổ 1": "Tổ 2", "Tổ 2": "Tổ 3", "Tổ 3": "Tổ 4", "Tổ 4": "Tổ 1" };
      const allowedTeam = targetMap[appState.currentUser.team];
      if (allowedTeam && targetTeam !== allowedTeam) {
        return { ok: false, reason: `Theo Quy chế 01 chấm chéo, ${appState.currentUser.team} chỉ được chấm học sinh của ${allowedTeam}!` };
      }
    }
  }
  return { ok: true };
}

// ==================== TẦNG 1: 4 THẺ TỔ THI ĐUA ĐỘC LẬP & CHẤM CHÉO ====================
function renderTeamDisciplineSummaryCards() {
  const container = document.getElementById("teamDisciplineSummaryGrid");
  if (!container) return;

  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { students: appState.students };
  const teams = ["Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4"];
  const targetMap = { "Tổ 1": "Tổ 2", "Tổ 2": "Tổ 3", "Tổ 3": "Tổ 4", "Tổ 4": "Tổ 1" };

  const teamStats = teams.map(tName => {
    const sts = scoped.students.filter(s => s.to === tName);
    const total = sts.length || 1;
    const avg = (sts.reduce((sum, s) => sum + parseScore(s.diemThiDua, 100), 0) / total).toFixed(1);

    let redCards = 0, yellowCards = 0, greenCards = 0;
    sts.forEach(s => {
      const p = parseScore(s.diemThiDua, 100);
      if (p < 70) redCards++;
      else if (p < 90) yellowCards++;
      else greenCards++;
    });

    return { name: tName, avg: Number(avg), stsCount: sts.length, redCards, yellowCards, greenCards };
  });

  const sortedTeams = [...teamStats].sort((a, b) => b.avg - a.avg);

  const teamPalettes = {
    "Tổ 1": { bg: "bg-gradient-to-br from-sky-50 to-blue-100/70", border: "border-sky-200 hover:border-sky-400", ring: "border-sky-600 ring-2 ring-sky-300", badge: "bg-sky-600 text-white", title: "text-sky-900" },
    "Tổ 2": { bg: "bg-gradient-to-br from-violet-50 to-indigo-100/70", border: "border-violet-200 hover:border-violet-400", ring: "border-violet-600 ring-2 ring-violet-300", badge: "bg-violet-600 text-white", title: "text-violet-900" },
    "Tổ 3": { bg: "bg-gradient-to-br from-emerald-50 to-teal-100/70", border: "border-emerald-200 hover:border-emerald-400", ring: "border-emerald-600 ring-2 ring-emerald-300", badge: "bg-emerald-600 text-white", title: "text-emerald-900" },
    "Tổ 4": { bg: "bg-gradient-to-br from-amber-50 to-orange-100/70", border: "border-amber-200 hover:border-amber-400", ring: "border-amber-600 ring-2 ring-amber-300", badge: "bg-amber-500 text-white", title: "text-amber-900" }
  };

  container.innerHTML = teamStats.map(t => {
    const rank = sortedTeams.findIndex(x => x.name === t.name) + 1;
    const isSelected = (appState.currentStudentTeamFilter === t.name);
    const targetTeam = targetMap[t.name];
    const pal = teamPalettes[t.name] || teamPalettes["Tổ 1"];

    return `
      <div onclick="filterStudentTeamTab('${t.name}')" class="p-3.5 rounded-2xl ${pal.bg} border-2 ${isSelected ? pal.ring : pal.border} shadow-sm cursor-pointer transition flex flex-col justify-between space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-6 h-6 rounded-lg ${rank === 1 ? 'bg-amber-500 text-white' : pal.badge} font-black text-xs flex items-center justify-center shadow-xs">
              ${rank}
            </span>
            <b class="text-xs font-black ${pal.title}">${t.name}</b>
          </div>
          <span class="text-xs font-black font-mono ${t.avg >= 90 ? 'text-emerald-700' : 'text-amber-700'}">
            ${t.avg}đ
          </span>
        </div>

        <div class="flex items-center gap-1 text-[10px]">
          <span class="px-1.5 py-0.5 rounded bg-white/90 text-emerald-800 border border-emerald-200 font-bold" title="Học sinh Tốt">🟢 ${t.greenCards}</span>
          <span class="px-1.5 py-0.5 rounded bg-white/90 text-amber-800 border border-amber-200 font-bold" title="Thẻ Vàng (Khá)">🟡 ${t.yellowCards}</span>
          ${t.redCards > 0 ? `<span class="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-black animate-pulse" title="Thẻ Đỏ (Cảnh báo)">🔴 ${t.redCards}</span>` : ''}
        </div>

        <div class="pt-1.5 border-t border-black/5 flex items-center justify-between text-[9.5px] text-slate-600">
          <span>Sĩ số: ${t.stsCount} em</span>
          <span class="text-sky-800 font-bold">Chấm chéo: ${targetTeam}</span>
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

async function markAllPresentForCurrentSession() {
  const targetTeamFilter = appState.currentStudentTeamFilter !== "ALL" ? appState.currentStudentTeamFilter : null;
  const perm = canModifyDiscipline(targetTeamFilter);
  if (!perm.ok) {
    alert(perm.reason);
    return;
  }

  const curSession = appState.currentSessionKey;
  const dateStr = formatDateVN();
  const sessionDayKey = `${curSession}_${dateStr}`;

  if (!appState.attendanceRecords[sessionDayKey]) {
    appState.attendanceRecords[sessionDayKey] = {};
  }

  const targetStudents = (appState.currentStudentTeamFilter === "ALL")
    ? appState.students
    : appState.students.filter(s => s.to === appState.currentStudentTeamFilter);

  const itemsToSync = [];
  const senderName = appState.currentUser ? appState.currentUser.fullName : "Cán sự điểm danh";

  targetStudents.forEach(st => {
    const cur = appState.attendanceRecords[sessionDayKey][st.id];
    if (!cur || cur === "CHUA_DANH_DAU") {
      appState.attendanceRecords[sessionDayKey][st.id] = "CO_MAT";
      itemsToSync.push({
        sessionKey: curSession,
        sessionName: appState.currentSessionLabel,
        date: dateStr,
        week: appState.selectedWeek,
        studentId: st.id,
        studentName: st.hoTen,
        status: "CO_MAT",
        sender: senderName
      });
    }
  });

  saveStateToLocal();
  renderAttendanceSession();
  if (typeof renderSessionsGrid === "function") renderSessionsGrid();
  renderOverviewDashboard();

  if (itemsToSync.length > 0) {
    await callApi("saveAttendanceBatch", { items: itemsToSync }, "POST");
  }
}

function renderAttendanceSession() {
  const container = document.getElementById("attendanceStudentList");
  if (!container) return;

  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { isEditable: true, students: appState.students, violations: appState.violations };
  const curSession = appState.currentSessionKey;
  const dateStr = formatDateVN();
  const sessionDayKey = `${curSession}_${dateStr}`;
  const todaySessionAtt = appState.attendanceRecords[sessionDayKey] || {};

  let list = (appState.currentStudentTeamFilter === "ALL")
    ? scoped.students
    : scoped.students.filter(s => s.to === appState.currentStudentTeamFilter);

  if (currentAttSearchQuery) {
    const cleanQ = removeVietnameseTones(currentAttSearchQuery);
    list = list.filter(s => {
      const cleanName = removeVietnameseTones(s.hoTen);
      const code = (s.id || "").toLowerCase();
      return cleanName.includes(cleanQ) || code.includes(cleanQ);
    });
  }

  const canEditBase = scoped.isEditable && ((appState.roleLevel === "GVCN") || (appState.roleLevel === "LEADER" && appState.allowStudentLeaderEdit));

  if (list.length === 0) {
    container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 italic text-xs">Không tìm thấy học sinh phù hợp.</div>`;
    renderSessionSpecificViolationsList();
    return;
  }

  container.innerHTML = list.map(st => {
    const currentStatus = scoped.isEditable ? (todaySessionAtt[st.id] || "CHUA_DANH_DAU") : "CHUA_DANH_DAU";
    const isCoMat = currentStatus === "CO_MAT";
    const isDiTre = currentStatus === "DI_TRE";
    const isVangPhep = currentStatus === "VANG_PHEP";
    const isVangKoPhep = currentStatus === "KHONG_PHEP";

    const score = parseScore(st.diemThiDua, 100);

    let cardTheme = "border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50/40";
    let badgeType = `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black">🟢 Thẻ Xanh</span>`;

    if (score < 70) {
      cardTheme = "border-rose-400 bg-gradient-to-br from-rose-50/70 to-white";
      badgeType = `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black animate-pulse">🔴 Thẻ Đỏ</span>`;
    } else if (score < 90) {
      cardTheme = "border-amber-300 bg-gradient-to-br from-amber-50/70 to-white";
      badgeType = `<span class="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">🟡 Thẻ Vàng</span>`;
    }

    const teamPillClass = st.to === "Tổ 1"
      ? "bg-sky-100 text-sky-800 border border-sky-200"
      : (st.to === "Tổ 2"
        ? "bg-violet-100 text-violet-800 border border-violet-200"
        : (st.to === "Tổ 3" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"));

    const studentEvents = scoped.violations.filter(v => v.studentId === st.id);
    const recentTags = studentEvents.slice(0, 2).map(ev => {
      const isPlus = parseScore(ev.points, 0) > 0;
      return `<span class="text-[9.5px] px-1.5 py-0.2 rounded font-bold truncate max-w-[140px] inline-block ${isPlus ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">${escapeHtml(ev.criteria)}</span>`;
    }).join(" ");

    const safeId = escapeAttr(st.id);
    const safeName = escapeAttr(st.hoTen);

    return `
      <div class="p-3.5 rounded-2xl border-2 ${cardTheme} shadow-xs flex flex-col justify-between gap-2.5 transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
              ${escapeHtml(String(st.id || "").replace("HS", ""))}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-black text-slate-900 text-xs sm:text-sm truncate">${escapeHtml(st.hoTen)}</span>
                <span class="text-[9.5px] px-1.5 py-0.2 rounded font-bold ${teamPillClass}">${escapeHtml(st.to)}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                ${badgeType}
                <span class="text-[10px] text-slate-500 font-mono">Điểm: <b class="${score < 70 ? 'text-rose-600' : (score < 90 ? 'text-amber-600' : 'text-emerald-700')}">${score}đ</b></span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            ${score < 90 && appState.roleLevel === "GVCN" && scoped.isEditable ? `
              <button onclick="openRemedialTaskModal('${safeId}', '${safeName}')" class="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold" title="Giao nhiệm vụ gỡ điểm sư phạm">
                <i class="fa-solid fa-hand-holding-heart mr-1"></i> Gỡ thẻ
              </button>
            ` : ''}
            ${canEditBase ? `
              <button onclick="openQuickScoreModal('${safeId}', '')" class="p-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 transition" title="Chấm Quy chế 01">
                <i class="fa-solid fa-pen-to-square text-xs"></i>
              </button>
            ` : ''}
          </div>
        </div>

        ${studentEvents.length > 0 ? `
          <div class="flex items-center gap-1 overflow-hidden py-0.5">
            ${recentTags}
          </div>
        ` : ''}

        <div class="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100 ${canEditBase ? '' : 'opacity-40 pointer-events-none'}">
          <button onclick="setAttendanceStatus('${safeId}', '${safeName}', 'CO_MAT')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isCoMat ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-check"></i> Có mặt
          </button>
          <button onclick="setAttendanceStatus('${safeId}', '${safeName}', 'DI_TRE')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isDiTre ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-clock"></i> Trễ (-10)
          </button>
          <button onclick="setAttendanceStatus('${safeId}', '${safeName}', 'VANG_PHEP')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isVangPhep ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-envelope-open"></i> Phép (0)
          </button>
          <button onclick="setAttendanceStatus('${safeId}', '${safeName}', 'KHONG_PHEP')" class="py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isVangKoPhep ? 'bg-rose-600 text-white shadow-xs animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i class="fa-solid fa-triangle-exclamation"></i> K.Phép (-20)
          </button>
        </div>
      </div>
    `;
  }).join("");

  renderSessionSpecificViolationsList();
}

async function setAttendanceStatus(studentId, studentName, status) {
  const st = appState.students.find(s => s.id === studentId);
  const perm = canModifyDiscipline(st ? st.to : null);
  if (!perm.ok) {
    alert(perm.reason);
    return;
  }

  const curSession = appState.currentSessionKey;
  const dateStr = formatDateVN();
  const sessionDayKey = `${curSession}_${dateStr}`;

  if (!appState.attendanceRecords[sessionDayKey]) {
    appState.attendanceRecords[sessionDayKey] = {};
  }

  const prevStatus = appState.attendanceRecords[sessionDayKey][studentId] || "CHUA_DANH_DAU";
  if (prevStatus === status) return;
  appState.attendanceRecords[sessionDayKey][studentId] = status;

  const prevInfo = getAttendanceDeltaInfo(prevStatus);
  const nextInfo = getAttendanceDeltaInfo(status);
  const diff = nextInfo.delta - prevInfo.delta;
  const attIncidentKey = `ATT_${sessionDayKey}_${studentId}`;
  const senderName = appState.currentUser ? appState.currentUser.fullName : "Cán sự điểm danh";

  if (st && diff !== 0) {
    st.diemThiDua = Math.max(0, parseScore(st.diemThiDua, 100) + diff);
  }

  appState.violations = appState.violations.filter(v => v.incidentKey !== attIncidentKey);
  if (status !== "CO_MAT" && status !== "CHUA_DANH_DAU") {
    appState.violations.unshift({
      time: `${appState.currentSessionLabel} (${dateStr})`,
      date: dateStr,
      week: appState.selectedWeek,
      studentId,
      studentName: st ? st.hoTen : studentName,
      criteria: `[Chuyên cần] ${nextInfo.label}`,
      points: nextInfo.delta,
      note: "Điểm danh ca học",
      sender: senderName,
      incidentKey: attIncidentKey
    });
  }

  saveStateToLocal();
  renderTeamDisciplineSummaryCards();
  renderAttendanceSession();
  if (typeof renderSessionsGrid === "function") renderSessionsGrid();
  renderOverviewDashboard();

  await callApi("saveAttendance", {
    sessionKey: curSession,
    sessionName: appState.currentSessionLabel,
    date: dateStr,
    week: appState.selectedWeek,
    studentId,
    studentName: st ? st.hoTen : studentName,
    status,
    sender: senderName
  });
}

// ==================== CHẤM ĐIỂM QUY CHẾ 01 & PHÂN QUYỀN CHẤM CHÉO ====================
function openQuickScoreModal(studentId, defaultType) {
  const st = appState.students.find(s => s.id === studentId);
  const perm = canModifyDiscipline(st ? st.to : null);
  if (!perm.ok) {
    alert(perm.reason);
    return;
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
    <option value="${escapeAttr(s.id)}|${escapeAttr(s.hoTen)}">${escapeHtml(s.id)} - ${escapeHtml(s.hoTen)} (${escapeHtml(s.to)})</option>
  `).join("");
}

function populateCriteriaSelect(filterType) {
  const sel = document.getElementById("violationCriteriaSelect");
  if (!sel) return;

  const filtered = filterType ? appState.criteriaList.filter(c => c.type === filterType) : appState.criteriaList;
  sel.innerHTML = filtered.map(c => `
    <option value="${escapeAttr(c.code)}|${c.points}">${c.type === 'CONG' ? '🟢' : '🔴'} ${escapeHtml(c.code)}: ${escapeHtml(c.name)} (${c.points > 0 ? '+' : ''}${c.points}đ)</option>
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

  const st = appState.students.find(s => s.id === studentId);
  const perm = canModifyDiscipline(st ? st.to : null);
  if (!perm.ok) {
    alert(perm.reason);
    return;
  }

  const criteriaVal = document.getElementById("violationCriteriaSelect").value.split("|");
  const points = parseScore(criteriaVal[1], 0);
  const note = document.getElementById("violationNoteInput").value.trim();

  if (st) {
    st.diemThiDua = Math.max(0, parseScore(st.diemThiDua, 100) + points);
  }

  const dateStr = formatDateVN();
  const criteriaText = document.getElementById("violationCriteriaSelect").selectedOptions[0].text;
  const incidentKey = `VIO_${Date.now()}_${studentId}`;
  const senderName = appState.currentUser ? appState.currentUser.fullName : "Ban Cán sự";
  const displayTime = `${appState.currentSessionLabel} (${dateStr})`;

  appState.violations.unshift({
    time: displayTime,
    date: dateStr,
    week: appState.selectedWeek,
    studentId,
    studentName: st ? st.hoTen : studentName,
    criteria: criteriaText,
    points,
    note,
    sender: senderName,
    incidentKey
  });

  saveStateToLocal();
  renderTeamDisciplineSummaryCards();
  renderOverviewDashboard();
  renderAttendanceSession();
  closeRecordViolationModal();
  const noteInputEl = document.getElementById("violationNoteInput");
  if (noteInputEl) noteInputEl.value = "";
  alert("Đã ghi nhận nề nếp thành công!");

  await callApi("recordViolation", {
    incidentKey,
    week: appState.selectedWeek,
    date: dateStr,
    displayTime,
    studentId,
    studentName: st ? st.hoTen : studentName,
    criteria: criteriaText,
    points,
    note,
    sender: senderName
  });
}

// ==================== TẦNG 3: NHẬT KÝ SỰ VỤ & CƠ CHẾ GỠ ĐIỂM SƯ PHẠM ====================
function renderSessionSpecificViolationsList() {
  const container = document.getElementById("sessionSpecificViolationsList");
  const headerTitle = document.getElementById("sessionLogHeaderTitle");
  if (!container) return;

  if (headerTitle) headerTitle.innerText = appState.currentSessionLabel;

  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { isEditable: true, violations: appState.violations };
  const sessViolations = scoped.violations.filter(v => v.time && v.time.includes(appState.currentSessionLabel));
  const activeEvents = sessViolations.filter(v => !v.criteria || !v.criteria.includes("Có mặt"));
  const isGVCN = (appState.roleLevel === "GVCN");

  if (activeEvents.length === 0) {
    container.innerHTML = `<p class="py-3 text-center text-slate-400 italic text-xs">Chưa có phát sinh điểm thưởng/phạt nào trong ca học này.</p>`;
    return;
  }

  container.innerHTML = activeEvents.map((v) => {
    const pts = parseScore(v.points, 0);
    const isPlus = pts > 0;
    const badgeClass = isPlus ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200";
    const globalIdx = appState.violations.indexOf(v);
    const removeKey = v.incidentKey || String(globalIdx);

    return `
      <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-100/70 transition">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <b class="text-slate-900">${escapeHtml(v.studentName)}</b>
            <span class="text-[10px] text-slate-500 font-bold">(${escapeHtml(getStudentTeam(v.studentId))})</span>
            <span class="text-[9.5px] text-slate-400 font-mono">${escapeHtml(v.time)}</span>
          </div>
          <p class="text-[11px] text-slate-700">${escapeHtml(v.criteria)} ${v.note ? `• <i>${escapeHtml(v.note)}</i>` : ''}</p>
        </div>

        <div class="flex items-center gap-2">
          <span class="font-mono font-black text-xs px-2 py-0.5 rounded-lg border ${badgeClass}">
            ${isPlus ? '+' : ''}${pts}đ
          </span>
          ${isGVCN && scoped.isEditable ? `
            <button onclick="removeViolationItem('${escapeAttr(removeKey)}', '${escapeAttr(v.studentId)}', ${pts})" class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Xóa bản ghi này">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");
}

async function openRemedialTaskModal(studentId, studentName) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền nghiệm thu nhiệm vụ gỡ thẻ cho học sinh!");
    return;
  }
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { isEditable: true };
  if (!scoped.isEditable) {
    alert("Tuần này đã chốt sổ, không thể điều chỉnh điểm lịch sử!");
    return;
  }

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
    const dateStr = formatDateVN();
    const displayTime = `${appState.currentSessionLabel} (${dateStr})`;
    const incidentKey = `REMEDIAL_${Date.now()}_${st.id}`;
    const criteriaText = `[Khắc phục nề nếp] ${task}`;

    st.diemThiDua = Math.max(0, parseScore(st.diemThiDua, 100) + 10);
    appState.violations.unshift({
      time: displayTime,
      date: dateStr,
      week: appState.selectedWeek,
      studentId: st.id,
      studentName: st.hoTen,
      criteria: criteriaText,
      points: 10,
      note: "GVCN nghiệm thu phục hồi điểm thi đua",
      sender: "GVCN phê duyệt",
      incidentKey
    });

    saveStateToLocal();
    renderTeamDisciplineSummaryCards();
    renderAttendanceSession();
    if (typeof renderSessionsGrid === "function") renderSessionsGrid();
    renderOverviewDashboard();

    await callApi("recordViolation", {
      incidentKey,
      week: appState.selectedWeek,
      date: dateStr,
      displayTime,
      studentId: st.id,
      studentName: st.hoTen,
      criteria: criteriaText,
      points: 10,
      note: "GVCN nghiệm thu phục hồi điểm thi đua",
      sender: "GVCN phê duyệt"
    });
    alert(`🎉 Đã phục hồi +10đ rèn luyện và gỡ thẻ cảnh báo cho học sinh [${st.hoTen}]!`);
  }
}

// ==================== SỔ ĐẦU BÀI ĐIỆN TỬ ====================
function renderPeriodCards() {
  const grid = document.getElementById("periodCardGrid");
  if (!grid) return;

  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { periodLogs: appState.periodLogs };
  const logs = scoped.periodLogs || [];
  if (logs.length === 0) {
    grid.innerHTML = `<p class="col-span-full py-6 text-center text-slate-400 italic text-xs">Chưa có tiết ghi Sổ đầu bài trong tuần này.</p>`;
    return;
  }

  grid.innerHTML = logs.map(p => `
    <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-sky-700 uppercase">${escapeHtml(p.period)}</span>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${p.rating === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">Loại ${escapeHtml(p.rating)}</span>
      </div>
      <p class="text-xs font-black text-slate-800 truncate">${escapeHtml(p.subject)}</p>
      <p class="text-[10px] text-slate-500 italic line-clamp-2">${escapeHtml(p.note || "Tiết dạy nghiêm túc.")}</p>
      <span class="text-[9px] text-slate-400 block font-mono">${escapeHtml(p.session ? p.session + " • " : "")}${escapeHtml(p.time)}</span>
    </div>
  `).join("");
}

function getDefaultLogSessionByTime(dateObj) {
  const now = dateObj || new Date();
  if (appState.currentSessionKey === "T2_CHIEU") return "BUOI_2";
  if (appState.currentSessionKey === "T3_CHIEU") return "BUOI_3";
  if (now.getHours() >= 12) {
    const d = now.getDay();
    if (d === 1) return "BUOI_2";
    if (d === 2) return "BUOI_3";
    return "BUOI_CHIEU";
  }
  return "BUOI_1";
}

function getLogContextFromModal() {
  const sessionSel = document.getElementById("logSessionSelect");
  const dateInput = document.getElementById("logDateInput");

  let dateObj = new Date();
  if (dateInput && dateInput.value) {
    const parts = dateInput.value.split("-").map(Number);
    if (parts.length === 3 && parts[0] > 2000) {
      dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }

  let sessionCode = sessionSel ? sessionSel.value : getDefaultLogSessionByTime(new Date());
  if (sessionSel && sessionCode === "BUOI_1" && !(sessionSel.dataset && sessionSel.dataset.userChanged)) {
    const now = new Date();
    if (now.getHours() >= 12) {
      sessionCode = getDefaultLogSessionByTime(dateInput && dateInput.value ? new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), now.getHours(), now.getMinutes()) : now);
    }
  }

  let isMorning = true;
  const dayIdx = dateObj.getDay();
  const validDayNum = (dayIdx >= 1 && dayIdx <= 6) ? (dayIdx + 1) : 2;
  let dayKey = `t${validDayNum}`;
  let sessionLabel = `Sáng Thứ ${validDayNum}`;

  if (sessionCode === "BUOI_2") {
    isMorning = false;
    dayKey = "t2";
    sessionLabel = "Buổi Chiều Thứ 2";
  } else if (sessionCode === "BUOI_3") {
    isMorning = false;
    dayKey = "t3";
    sessionLabel = "Buổi Chiều Thứ 3";
  } else if (sessionCode === "BUOI_CHIEU" || String(sessionCode).includes("CHIEU")) {
    isMorning = false;
    sessionLabel = `Buổi Chiều Thứ ${validDayNum}`;
  } else {
    isMorning = true;
    sessionLabel = `Sáng Thứ ${validDayNum}`;
  }

  return { sessionCode, sessionLabel, isMorning, dayKey, dateObj, dateIso: getLocalDateKey(dateObj), dateVN: formatDateVN(dateObj) };
}

function openClassSessionLogModal() {
  const perm = canModifyDiscipline();
  if (!perm.ok) {
    alert(perm.reason);
    return;
  }

  const selStudent = document.getElementById("logViolationStudentSelect");
  if (selStudent) {
    selStudent.innerHTML = `<option value="NONE">-- Không có vi phạm --</option>` + appState.students.map(s => `
      <option value="${escapeAttr(s.id)}">${escapeHtml(s.id)} - ${escapeHtml(s.hoTen)} (${escapeHtml(s.to)})</option>
    `).join("");
  }

  const now = new Date();
  const dateInput = document.getElementById("logDateInput");
  if (dateInput && !dateInput.value) dateInput.value = getLocalDateKey(now);

  const sessionSel = document.getElementById("logSessionSelect");
  if (sessionSel) {
    if (sessionSel.dataset) delete sessionSel.dataset.userChanged;
    sessionSel.value = getDefaultLogSessionByTime(now);
  }

  updateSuggestedSubjectByTkb();
  const modal = document.getElementById("sessionLogModal");
  if (modal) modal.classList.remove("hidden");
}

function closeClassSessionLogModal() {
  const modal = document.getElementById("sessionLogModal");
  if (modal) modal.classList.add("hidden");
}

function onLogSessionSelectChange(selEl) {
  if (selEl && selEl.dataset) selEl.dataset.userChanged = "1";
  updateSuggestedSubjectByTkb();
}

function resolveTkbSubjectName(pNum, ctx) {
  const activeTkb = (typeof getActiveTkbConfig === "function") ? getActiveTkbConfig() : (appState.tkbConfig || { morning: [], afternoon: [] });
  const periods = ctx.isMorning ? (activeTkb.morning || []) : (activeTkb.afternoon || []);
  const matchP = periods.find(p => p.period === pNum);
  const subjectName = (matchP && matchP[ctx.dayKey] && matchP[ctx.dayKey] !== "-" && matchP[ctx.dayKey] !== "—")
    ? matchP[ctx.dayKey]
    : "Tiết chính khóa";
  return { activeTkb, subjectName };
}

function updateSuggestedSubjectByTkb() {
  const periodVal = document.getElementById("logPeriodSelect") ? document.getElementById("logPeriodSelect").value : "Tiết 1";
  const pNum = parseInt(periodVal.replace(/\D/g, ""), 10) || 1;
  const ctx = getLogContextFromModal();
  const { activeTkb, subjectName } = resolveTkbSubjectName(pNum, ctx);

  const textEl = document.getElementById("suggestedSubjectText");
  if (textEl) textEl.innerText = `${subjectName} (${ctx.sessionLabel} • TKB ${activeTkb.versionLabel || "hiện hành"})`;
}

async function submitClassSessionLogSimple() {
  const perm = canModifyDiscipline();
  if (!perm.ok) {
    alert(perm.reason);
    return;
  }

  const period = document.getElementById("logPeriodSelect").value;
  const rating = document.getElementById("logRatingSelect").value;
  const note = document.getElementById("logNoteInput").value.trim();
  const vioStudentId = document.getElementById("logViolationStudentSelect").value;
  const vioReason = document.getElementById("logViolationReasonSelect").value;

  const ctx = getLogContextFromModal();
  const pNum = parseInt(period.replace(/\D/g, ""), 10) || 1;
  const { subjectName } = resolveTkbSubjectName(pNum, ctx);

  const logWeek = getWeekNumberFromDate(ctx.dateObj);
  const senderName = appState.currentUser ? appState.currentUser.fullName : "Ban Cán sự";
  let st = null;
  let incidentKey = "";

  if (vioStudentId && vioStudentId !== "NONE") {
    st = appState.students.find(s => s.id === vioStudentId);
    if (!st) {
      alert("Không tìm thấy hồ sơ học sinh vi phạm đã chọn!");
      return;
    }

    incidentKey = `VIO_${ctx.dateIso}_${ctx.sessionCode}_${vioStudentId}_${removeVietnameseTones(vioReason)}`;
    const reasonNorm = removeVietnameseTones(vioReason);
    const isExisted = appState.violations.some(v => {
      if (v.incidentKey === incidentKey) return true;
      if (v.studentId !== st.id) return false;
      const sameDay = (v.date === ctx.dateVN) || (v.time && v.time.includes(ctx.dateVN));
      const sameReason = v.criteria && removeVietnameseTones(v.criteria).includes(reasonNorm);
      return sameDay && sameReason;
    });

    if (isExisted) {
      alert(`Học sinh [${st.hoTen}] đã được ghi nhận lỗi [${vioReason}] trong ngày ${ctx.dateVN}. Sổ đầu bài ghi nhận đối chiếu, KHÔNG trừ điểm lần thứ 2!`);
    } else {
      st.diemThiDua = Math.max(0, parseScore(st.diemThiDua, 100) - 10);
      appState.violations.unshift({
        time: `${ctx.sessionLabel} (${period} - ${ctx.dateVN})`,
        date: ctx.dateVN,
        week: logWeek,
        studentId: st.id,
        studentName: st.hoTen,
        criteria: `[SĐB - ${subjectName}] ${vioReason}`,
        points: -10,
        note: `Ghi nhận từ Sổ đầu bài (Xếp loại: ${rating})`,
        sender: senderName,
        incidentKey
      });
      alert(`Đã ghi nhận Sổ đầu bài và trừ 10 điểm bổ trợ cho học sinh [${st.hoTen}].`);
    }
  }

  const logItem = { period, session: ctx.sessionLabel, subject: subjectName, rating, note, time: ctx.dateVN, week: logWeek };
  appState.periodLogs.unshift(logItem);

  saveStateToLocal();
  renderOverviewDashboard();
  renderPeriodCards();
  closeClassSessionLogModal();
  const logNoteEl = document.getElementById("logNoteInput");
  if (logNoteEl) logNoteEl.value = "";

  await callApi("saveClassSessionLog", {
    date: ctx.dateVN,
    week: logWeek,
    session: ctx.sessionLabel,
    period,
    subject: subjectName,
    rating,
    note,
    violationStudentId: vioStudentId !== "NONE" ? vioStudentId : "",
    violationStudentName: st ? st.hoTen : "",
    violationReason: vioReason,
    sender: senderName,
    incidentKey
  });
}

// ==================== BIÊN BẢN SINH HOẠT LỚP (NGHỊ ĐỊNH 30) ====================
function renderOfficialShlReportTab() {
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { selectedWeek: appState.selectedWeek, students: appState.students, violations: appState.violations };
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const locDateEl = document.getElementById("shlLocationDate");
  if (locDateEl) locDateEl.innerText = `Tây Sơn, ngày ${day} tháng ${month} năm ${year}`;

  const fullTextEl = document.getElementById("shlDateFullText");
  if (fullTextEl) fullTextEl.innerText = `ngày ${day} tháng ${month} năm ${year} (Tuần ${scoped.selectedWeek || appState.selectedWeek})`;

  const sessionTitleEl = document.getElementById("shlSessionTitle");
  if (sessionTitleEl) {
    sessionTitleEl.innerText = `(Tuần ${scoped.selectedWeek || appState.selectedWeek} • Tiết 1, Sáng Thứ Hai • Địa điểm: Phòng học 10A12)`;
  }

  const lateViolations = scoped.violations.filter(v => v.criteria && v.criteria.includes("trễ"));
  const excusedViolations = scoped.violations.filter(v => v.criteria && v.criteria.includes("Có phép"));
  const unexcusedViolations = scoped.violations.filter(v => v.criteria && v.criteria.includes("Không phép"));

  const lateEl = document.getElementById("shlLateCount");
  const excEl = document.getElementById("shlLeaveExcused");
  const unexcEl = document.getElementById("shlLeaveUnexcused");
  const absentEl = document.getElementById("shlAbsentCount");
  const presentEl = document.getElementById("shlPresentCount");

  const total = scoped.students.length || 45;
  const absentTotal = excusedViolations.length + unexcusedViolations.length;

  if (lateEl) lateEl.innerText = `${lateViolations.length}`;
  if (excEl) excEl.innerText = `${excusedViolations.length}`;
  if (unexcEl) unexcEl.innerText = `${unexcusedViolations.length}`;
  if (absentEl) absentEl.innerText = `${absentTotal}`;
  if (presentEl) presentEl.innerText = `${Math.max(0, total - absentTotal)}/${total}`;

  const avg = scoped.students.length > 0
    ? (scoped.students.reduce((acc, s) => acc + parseScore(s.diemThiDua, 100), 0) / scoped.students.length).toFixed(1)
    : "100.0";
  const avgEl = document.getElementById("shlAvgPoints");
  if (avgEl) avgEl.innerText = `${avg}`;

  let tot = 0, kha = 0, dat = 0, chuadat = 0;
  scoped.students.forEach(s => {
    const pts = parseScore(s.diemThiDua, 100);
    if (pts >= 90) tot++;
    else if (pts >= 70) kha++;
    else if (pts >= 50) dat++;
    else chuadat++;
  });
  const tt22Summary = document.getElementById("shlTT22SummaryText");
  if (tt22Summary) {
    tt22Summary.innerText = `${tot} HS xếp loại Tốt (${Math.round(tot / total * 100)}%), ${kha} HS xếp loại Khá (${Math.round(kha / total * 100)}%), ${dat + chuadat} HS Đạt/Chưa đạt`;
  }

  const commendContainer = document.getElementById("shlCommendationList");
  if (commendContainer) {
    const plusStudents = [];
    scoped.violations.forEach(v => {
      const pts = parseScore(v.points, 0);
      if (pts > 0) {
        plusStudents.push(`${escapeHtml(v.studentName)} (${escapeHtml(getStudentTeam(v.studentId))}): ${escapeHtml(v.criteria)} (+${pts} điểm)`);
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
    const penalized = scoped.students.filter(s => parseScore(s.diemThiDua, 100) < 100);
    if (penalized.length === 0) {
      penalizedContainer.innerHTML = `<p class="mso-item" style="margin: 0 0 3.5pt 36pt; color: #475569;">100% học sinh chấp hành tốt nội quy trường lớp, không có trường hợp vi phạm.</p>`;
    } else {
      penalizedContainer.innerHTML = penalized.map((s) => {
        const sc = parseScore(s.diemThiDua, 100);
        return `<p class="mso-item" style="margin: 0 0 3.5pt 36pt;">- ${escapeHtml(s.hoTen)} (${escapeHtml(s.to)}): Điểm rèn luyện hiện tại ${sc} điểm (Xếp loại: ${getTT22Label(sc)})</p>`;
      }).join("");
    }
  }
}

function copyWeeklyShlZaloMsg() {
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { selectedWeek: appState.selectedWeek, students: appState.students };
  const dateStr = formatDateVN();
  const avg = document.getElementById("shlAvgPoints") ? `${document.getElementById("shlAvgPoints").innerText}đ` : "100.0đ";

  let msg = `📋 [BIÊN BẢN SINH HOẠT LỚP 10A12 - TUẦN ${scoped.selectedWeek || appState.selectedWeek} (${dateStr})]\n` +
            `Trường THPT số 1 Quang Trung (Phân hiệu)\n` +
            `GVCN: ThS. Trần Dương Quốc Mẫn • Sĩ số: ${scoped.students.length}/${scoped.students.length}\n\n` +
            `1. TỔNG HỢP NỀ NẾP & RÈN LUYỆN:\n` +
            `• Điểm thi đua trung bình toàn lớp: ${avg}\n` +
            `• Đánh giá theo Thông tư 22: ${document.getElementById("shlTT22SummaryText") ? document.getElementById("shlTT22SummaryText").innerText : "Đa số đạt loại Tốt"}\n\n` +
            `2. HỌC SINH CẦN KHẮC PHỤC TUẦN TỚI:\n`;

  const penalized = scoped.students.filter(s => parseScore(s.diemThiDua, 100) < 100);
  if (penalized.length === 0) {
    msg += `(Không có - 100% học sinh chấp hành xuất sắc)\n`;
  } else {
    penalized.forEach((s, idx) => {
      msg += `${idx + 1}. ${s.hoTen} (${s.to}): ${parseScore(s.diemThiDua, 100)}đ\n`;
    });
  }

  const tkbLabel = (typeof getActiveTkbConfig === "function" ? getActiveTkbConfig().versionLabel : "hiện hành") || "hiện hành";
  msg += `\n3. NHẮC NHỞ TỪ THẦY CHỦ NHIỆM:\n` +
         `- Tiếp tục học theo Thời khóa biểu ${tkbLabel}.\n` +
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
<p class="mso-item">- <i>Học tập & Sổ đầu bài (Lớp phó Học tập):</i> Ghi chép sổ đầu bài đầy đủ, theo dõi nghiêm túc các tiết học theo Thời khóa biểu ${escapeHtml((typeof getActiveTkbConfig === "function" ? getActiveTkbConfig().versionLabel : "") || "hiện hành")}.</p>
<p class="mso-item">- <i>Văn thể mỹ & Đoàn thể (Lớp phó VTM & Bí thư):</i> Đôn đốc học sinh tham gia phong trào, cập nhật kho tư liệu hoạt động lớp.</p>

<!-- PHẦN III -->
<p class="mso-p" style="font-weight: bold; text-transform: uppercase; margin-top: 10pt;">III. Ý KIẾN KẾT LUẬN VÀ PHƯƠNG HƯỚNG CỦA GIÁO VIÊN CHỦ NHIỆM</p>
<p class="mso-p" style="text-indent: 24pt;">1. Tiếp tục duy trì nghiêm túc giờ giấc, tác phong, đồng phục, bảng tên, quy chế xếp hàng đầu tuần; tuyệt đối không sử dụng điện thoại di động trong giờ học khi chưa được sự cho phép của giáo viên bộ môn.</p>
<p class="mso-p" style="text-indent: 24pt;">2. Chuẩn bị bài chu đáo theo đúng Thời khóa biểu ${escapeHtml((typeof getActiveTkbConfig === "function" ? getActiveTkbConfig().versionLabel : "") || "hiện hành")}, tăng cường trao đổi thảo luận nhóm và tích cực phát biểu xây dựng bài học.</p>
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
function getWeeklyArchiveRecord(weekNum) {
  if (!appState.weeklyArchives) return null;
  return appState.weeklyArchives[`TUAN_${weekNum}`] || appState.weeklyArchives[`Tuan_${weekNum}`] || null;
}

function switchWeekScope(weekNum) {
  const currentRealWeek = (typeof getAutoSchoolWeek === "function") ? getAutoSchoolWeek() : 11;
  appState.selectedWeek = parseInt(weekNum, 10) || currentRealWeek;

  const badge = document.getElementById("weekStatusBadge");
  const lockBtn = document.getElementById("btnLockWeekAction");

  if (!appState.weeklyArchives) appState.weeklyArchives = {};
  const archive = getWeeklyArchiveRecord(appState.selectedWeek);

  if (archive) {
    if (badge) {
      badge.className = "text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300";
      badge.innerHTML = `<i class="fa-solid fa-lock text-[8px] mr-1"></i> Đã chốt sổ lưu trữ`;
    }
    if (lockBtn) lockBtn.classList.add("hidden");
  } else if (appState.selectedWeek !== currentRealWeek) {
    if (badge) {
      badge.className = "text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300";
      badge.innerHTML = `<i class="fa-solid fa-clock-rotate-left text-[8px] mr-1"></i> Chỉ xem Tuần ${appState.selectedWeek}`;
    }
    if (lockBtn) lockBtn.classList.add("hidden");
  } else {
    if (badge) {
      badge.className = "text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300";
      badge.innerHTML = `<i class="fa-solid fa-circle-dot text-[8px] mr-1 animate-pulse"></i> Đang diễn ra`;
    }
    if (lockBtn && appState.roleLevel === "GVCN") lockBtn.classList.remove("hidden");
  }

  renderOverviewDashboard();
  renderTeamDisciplineSummaryCards();
  renderAttendanceSession();
  renderPeriodCards();
  renderOfficialShlReportTab();
}

async function lockAndArchiveCurrentWeek() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền chốt sổ tuần học!");
    return;
  }
  const curWeek = appState.selectedWeek || getAutoSchoolWeek();
  if (!confirm(`Thầy có chắc chắn muốn chốt sổ và lưu trữ kết quả rèn luyện Tuần ${curWeek}? Sau khi chốt, dữ liệu tuần này sẽ được đóng băng.`)) return;

  if (!appState.weeklyArchives) appState.weeklyArchives = {};
  const archiveKey = `TUAN_${curWeek}`;
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { violations: appState.violations, periodLogs: appState.periodLogs };

  const archiveObj = {
    week: curWeek,
    lockedAt: new Date().toLocaleString("vi-VN"),
    lockedBy: appState.currentUser ? appState.currentUser.fullName : "GVCN",
    avgScore: document.getElementById("dashAvgScore") ? document.getElementById("dashAvgScore").innerText : "100.0đ",
    students: JSON.parse(JSON.stringify(appState.students)),
    violations: JSON.parse(JSON.stringify(scoped.violations)),
    periodLogs: JSON.parse(JSON.stringify(scoped.periodLogs || []))
  };

  appState.weeklyArchives[archiveKey] = archiveObj;
  saveStateToLocal();
  if (typeof buildAutoWeekDropdown === "function") buildAutoWeekDropdown();
  await callApi("saveWeeklyArchive", { archiveKey, archive: archiveObj }, "POST");
  alert(`🎉 Đã chốt sổ và lưu trữ thành công hồ sơ Tuần ${curWeek}!`);
}

async function resetWeeklyScoresPrompt() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền khởi tạo lại điểm rèn luyện tuần mới!");
    return;
  }
  if (!confirm("⚠️ CẢNH BÁO: Thao tác này sẽ đưa điểm thi đua của toàn bộ 45 học sinh về 100 điểm và làm sạch đánh giá trực nhật 7 ca để bắt đầu tuần học mới.\n(Khuyên dùng nút 'Chốt Sổ Tuần' trước nếu chưa lưu trữ tuần cũ).\nThầy có chắc chắn muốn tiếp tục?")) return;

  appState.students.forEach(s => {
    s.diemThiDua = 100;
  });
  if (appState.dutyAssignments && typeof appState.dutyAssignments === "object") {
    Object.keys(appState.dutyAssignments).forEach(sessKey => {
      if (appState.dutyAssignments[sessKey]) {
        appState.dutyAssignments[sessKey].status = "CHUA_DANH_GIA";
        appState.dutyAssignments[sessKey].note = "";
      }
    });
  }
  const curWeek = (typeof getAutoSchoolWeek === "function") ? getAutoSchoolWeek() : appState.selectedWeek;
  appState.lastAutoRolloverWeek = curWeek;
  appState.lastAutoRolloverAt = new Date().toLocaleString("vi-VN");
  localStorage.setItem("10A12_LAST_ACTIVE_WEEK", String(curWeek));

  saveStateToLocal();
  renderAllSections();
  await callApi("resetWeeklyScores", {}, "POST");
  await callApi("saveConfig", {
    lastAutoRolloverWeek: String(curWeek),
    lastAutoRolloverAt: appState.lastAutoRolloverAt
  }, "POST");
  alert("Đã khởi tạo tuần mới: Điểm thi đua toàn lớp đã về 100đ, làm sạch ca trực và đồng bộ Google Sheets!");
}

async function activateMondayRolloverTriggerOnCloud() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền bật lịch tự động trên Google Apps Script!");
    return;
  }
  const res = await callApi("setupWeeklyMondayRolloverTrigger", {}, "POST");
  if (res && res.status === "success") {
    appState.mondayRolloverTriggerActive = true;
    saveStateToLocal();
    if (typeof updateWeeklyRolloverUI === "function") updateWeeklyRolloverUI();
    alert("🎉 " + (res.message || "Đã đặt lịch tự động 00:00 sáng Thứ 2 hàng tuần trên Google Apps Script!"));
  } else {
    alert("Không thể kích hoạt trực tiếp qua web (thường do cần cấp quyền lần đầu hoặc chưa cập nhật code.js).\n\nHướng dẫn thầy: Mở Google Apps Script -> chọn hàm 'setupWeeklyMondayRolloverTrigger' -> nhấn Run (Chạy) một lần để kích hoạt lịch 00:00 Thứ 2!\n(Ngoài ra app vẫn tự động chốt & làm mới ngay khi sang tuần mới từ 00:00 Thứ 2).");
  }
}