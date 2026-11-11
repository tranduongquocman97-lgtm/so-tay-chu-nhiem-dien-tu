/**
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ THỜI KHÓA BIỂU, TRỰC NHẬT 7 CA & VĂN THỂ MỸ
 */

function renderTkbSubjectCell(val) {
  const text = String(val || "-").trim() || "-";
  if (text === "-" || text === "—") {
    return `<td class="py-2.5 px-3 text-center text-slate-400">-</td>`;
  }
  const norm = typeof removeVietnameseTones === "function" ? removeVietnameseTones(text) : text.toLowerCase();
  const isGvcn = norm.includes("man");
  return `<td class="py-2.5 px-3 text-center ${isGvcn ? "text-amber-700 font-black bg-amber-50/50" : "text-slate-800 font-bold"}">${escapeHtml(text)}</td>`;
}

function renderTkbRowsHtml(rows, periodColorClass) {
  return rows.map(r => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
      <td class="py-2.5 px-3 text-center font-mono font-black ${periodColorClass}">${escapeHtml(r.period)}</td>
      <td class="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">${escapeHtml(r.time)}</td>
      ${["t2", "t3", "t4", "t5", "t6", "t7"].map(k => renderTkbSubjectCell(r[k])).join("")}
    </tr>
  `).join("");
}

function renderTkbSection() {
  const activeTkb = (typeof getActiveTkbConfig === "function") ? getActiveTkbConfig() : TKB_CONFIG_SO3;
  const mBody = document.getElementById("tkbMorningTableBody");
  const aBody = document.getElementById("tkbAfternoonTableBody");

  if (mBody) mBody.innerHTML = renderTkbRowsHtml(activeTkb.morning || [], "text-sky-700");
  if (aBody) aBody.innerHTML = renderTkbRowsHtml(activeTkb.afternoon || [], "text-indigo-700");

  const imgSrc = safeMediaSrc(appState.tkbCustomImage) || "tkb_10a12.png";
  const imgEl = document.getElementById("tkbImageDisplay");
  const noteEl = document.getElementById("tkbImgFallbackNote");
  if (imgEl) {
    imgEl.classList.remove("hidden");
    imgEl.src = imgSrc;
  }
  if (noteEl) noteEl.classList.add("hidden");

  const zoomImg = document.getElementById("zoomTkbImage");
  if (zoomImg) zoomImg.src = imgSrc;

  const updatedBadge = document.getElementById("tkbUpdatedBadge");
  if (updatedBadge) {
    const verTxt = activeTkb.versionLabel ? `TKB ${activeTkb.versionLabel}` : "Ảnh TKB";
    updatedBadge.innerText = appState.tkbUpdatedAt
      ? `${verTxt} • Cập nhật lúc: ${appState.tkbUpdatedAt}`
      : `${verTxt} • Đang hiển thị ảnh TKB hiện hành`;
  }

  if (typeof renderTkbVersionLabels === "function") {
    renderTkbVersionLabels();
  }
}

function detectTkbVersionFromFilename(fileName) {
  if (!fileName) return null;
  const base = String(fileName).replace(/\.[^.]+$/, "");
  const clean = (typeof removeVietnameseTones === "function" ? removeVietnameseTones(base) : base.toLowerCase())
    .replace(/10a12|k58qt|k58/g, "");
  const match = clean.match(/(?:tkb)?so(\d{1,2})/) || clean.match(/tkb(\d{1,2})/);
  if (match && match[1]) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 30) return `Số ${n}`;
  }
  return null;
}

async function handleUploadNewTkbImage(event) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền cập nhật ảnh Thời khóa biểu!");
    if (event && event.target) event.target.value = "";
    return;
  }
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const badge = document.getElementById("tkbUpdatedBadge");
  if (badge) badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang nén & đồng bộ ảnh TKB...`;

  try {
    const compressed = await compressImageDataUrl(file, 1280, 0.78);
    appState.tkbCustomImage = compressed;
    appState.tkbUpdatedAt = new Date().toLocaleString("vi-VN");

    const activeTkb = (typeof getActiveTkbConfig === "function") ? getActiveTkbConfig() : null;
    const detectedVersion = detectTkbVersionFromFilename(file.name);
    if (activeTkb && detectedVersion) {
      activeTkb.versionLabel = detectedVersion;
    }

    saveStateToLocal();
    renderTkbSection();

    const cloudRes = await callApi("saveConfig", {
      tkbCustomImage: appState.tkbCustomImage,
      tkbUpdatedAt: appState.tkbUpdatedAt,
      tkbConfigJson: JSON.stringify(activeTkb || TKB_CONFIG_SO3)
    }, "POST");

    if (cloudRes && cloudRes.status === "success") {
      if (badge) badge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> Đã đồng bộ lúc ${appState.tkbUpdatedAt}`;
      alert("Đã cập nhật ảnh Thời khóa biểu mới lên giao diện và đồng bộ Google Sheets thành công!");
    } else if (cloudRes && cloudRes.status === "offline") {
      if (badge) badge.innerHTML = `<i class="fa-solid fa-wifi text-amber-600 mr-1"></i> Lưu cục bộ (${appState.tkbUpdatedAt})`;
      alert("Đã cập nhật ảnh Thời khóa biểu mới trên thiết bị này (chế độ ngoại tuyến / chưa đăng nhập token máy chủ).");
    } else {
      const errMsg = (cloudRes && cloudRes.message) ? cloudRes.message : "Lỗi không xác định khi lưu lên Google Sheets.";
      if (badge) badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-600 mr-1"></i> Lưu cục bộ (Đồng bộ lỗi)`;
      alert(`Ảnh TKB đã hiển thị trên máy, nhưng đồng bộ Google Sheets gặp lỗi: ${errMsg}`);
    }

    const editModal = document.getElementById("editTkbModal");
    if (editModal && typeof openEditTkbModal === "function") {
      openEditTkbModal(true);
    }
  } catch (err) {
    renderTkbSection();
    alert("Không thể đọc ảnh TKB: " + err.message);
  } finally {
    if (event && event.target) event.target.value = "";
  }
}

function buildEditTkbGridRowsHtml(rows, sessionKey, sessionLabel) {
  return (rows || []).map((r, idx) => `
    <tr class="border-b border-slate-200 text-xs">
      <td class="px-2 py-1.5 font-bold text-slate-700 whitespace-nowrap bg-slate-50">${escapeHtml(sessionLabel)} • T${escapeHtml(r.period)}</td>
      ${["t2", "t3", "t4", "t5", "t6", "t7"].map(dayCol => `
        <td class="p-1">
          <input type="text" data-tkb-session="${sessionKey}" data-tkb-idx="${idx}" data-tkb-day="${dayCol}"
            value="${escapeAttr((r[dayCol] && r[dayCol] !== "-") ? r[dayCol] : "")}"
            placeholder="-"
            class="w-full min-w-[88px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 text-[11px] font-medium focus:border-sky-500 focus:outline-none">
        </td>
      `).join("")}
    </tr>
  `).join("");
}

function openEditTkbModal(fromUpload) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền cập nhật Số hiệu & Bảng TKB!");
    return;
  }
  const modal = document.getElementById("editTkbModal");
  if (!modal) return;
  const activeTkb = getActiveTkbConfig();
  const verEl = document.getElementById("editTkbVersionInput");
  const dateEl = document.getElementById("editTkbDateInput");
  const bannerHint = document.getElementById("editTkbUploadNotice");
  const tbody = document.getElementById("editTkbScheduleBody");

  if (verEl) verEl.value = activeTkb.versionLabel || "Số 4";
  if (dateEl) dateEl.value = activeTkb.effectiveDate || "";
  if (bannerHint) {
    if (fromUpload) bannerHint.classList.remove("hidden");
    else bannerHint.classList.add("hidden");
  }
  if (tbody) {
    tbody.innerHTML = buildEditTkbGridRowsHtml(activeTkb.morning, "morning", "Sáng") +
      buildEditTkbGridRowsHtml(activeTkb.afternoon, "afternoon", "Chiều");
  }
  modal.classList.remove("hidden");
}

function closeEditTkbModal() {
  const modal = document.getElementById("editTkbModal");
  if (modal) modal.classList.add("hidden");
}

async function saveTkbConfigFromModal() {
  if (appState.roleLevel !== "GVCN") return;
  const verInput = document.getElementById("editTkbVersionInput");
  const dateInput = document.getElementById("editTkbDateInput");
  let nextVer = verInput ? String(verInput.value || "").trim() : "";
  if (!nextVer) {
    alert("Vui lòng nhập Số hiệu TKB (ví dụ: Số 4)!");
    return;
  }
  if (/^\d+$/.test(nextVer)) nextVer = `Số ${nextVer}`;
  const nextDate = dateInput ? String(dateInput.value || "").trim() : "";

  const activeTkb = normalizeTkbConfig(getActiveTkbConfig());
  activeTkb.versionLabel = nextVer;
  activeTkb.effectiveDate = nextDate;

  const tbody = document.getElementById("editTkbScheduleBody");
  if (tbody) {
    const inputs = tbody.querySelectorAll("input[data-tkb-session]");
    inputs.forEach(inp => {
      const sess = inp.dataset.tkbSession;
      const idx = parseInt(inp.dataset.tkbIdx, 10);
      const dayCol = inp.dataset.tkbDay;
      if (activeTkb[sess] && activeTkb[sess][idx] && dayCol) {
        activeTkb[sess][idx][dayCol] = String(inp.value || "").trim() || "-";
      }
    });
  }

  appState.tkbConfig = activeTkb;
  appState.tkbUpdatedAt = new Date().toLocaleString("vi-VN");
  saveStateToLocal();
  renderTkbSection();
  if (typeof renderOverviewDashboard === "function") renderOverviewDashboard();
  if (typeof updateLiveDashboardEngine === "function") updateLiveDashboardEngine();
  closeEditTkbModal();

  const cloudRes = await callApi("saveConfig", {
    tkbConfigJson: JSON.stringify(activeTkb),
    tkbUpdatedAt: appState.tkbUpdatedAt
  }, "POST");

  if (cloudRes && cloudRes.status === "success") {
    alert(`Đã lưu Thời khóa biểu ${activeTkb.versionLabel} và đồng bộ toàn hệ thống (tiêu đề trên, Sổ đầu bài & Cổng tra cứu)!`);
  } else {
    alert(`Đã cập nhật Thời khóa biểu ${activeTkb.versionLabel} trên giao diện (chờ đồng bộ Google Sheets).`);
  }
}

function openZoomTkbModal() {
  const modal = document.getElementById("zoomTkbModal");
  if (modal) {
    modal.classList.remove("hidden");
    const zoomImg = document.getElementById("zoomTkbImage");
    if (zoomImg) zoomImg.src = safeMediaSrc(appState.tkbCustomImage) || "tkb_10a12.png";
  }
}

function closeZoomTkbModal() {
  const modal = document.getElementById("zoomTkbModal");
  if (modal) modal.classList.add("hidden");
}

function downloadCurrentTkbImage() {
  const a = document.createElement("a");
  a.href = safeMediaSrc(appState.tkbCustomImage) || "tkb_10a12.png";
  a.download = `TKB_10A12_${new Date().toISOString().slice(0, 10)}.png`;
  a.click();
}

function render7DutySection() {
  const container = document.getElementById("weekly7DutyGrid");
  if (!container) return;

  const sessions = [
    { key: "T2_SANG", name: "Sáng Thứ 2", time: "06:30 - 06:45 & Cuối buổi" },
    { key: "T2_CHIEU", name: "Chiều Thứ 2", time: "13:30 - 13:45 & Cuối buổi" },
    { key: "T3_SANG", name: "Sáng Thứ 3", time: "06:30 - 06:45 & Cuối buổi" },
    { key: "T3_CHIEU", name: "Chiều Thứ 3", time: "13:30 - 13:45 & Cuối buổi" },
    { key: "T4_SANG", name: "Sáng Thứ 4", time: "06:30 - 06:45 & Cuối buổi" },
    { key: "T5_SANG", name: "Sáng Thứ 5", time: "06:30 - 06:45 & Cuối buổi" },
    { key: "T6_SANG", name: "Sáng Thứ 6", time: "06:30 - 06:45 & Tổng vệ sinh" }
  ];

  const isLaborLeader = (appState.roleLevel === "GVCN") || (appState.roleLevel === "LABOR");

  container.innerHTML = sessions.map(sess => {
    const data = appState.dutyAssignments[sess.key] || { students: [], status: "CHUA_DANH_GIA", note: "" };
    const isDat = data.status === "DAT";
    const isChuaDat = data.status === "CHUA_DAT";

    return `
      <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h4 class="font-black text-xs text-slate-800 uppercase">${sess.name}</h4>
            <span class="text-[9.5px] text-slate-400 block">${sess.time}</span>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isDat ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (isChuaDat ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600')}">
            ${isDat ? 'Đạt' : (isChuaDat ? 'Trực bù' : 'Chưa trực')}
          </span>
        </div>

        <div class="space-y-1.5 min-h-[50px]">
          <span class="text-[10px] text-slate-400 font-bold uppercase block">Học sinh trực nhật:</span>
          ${data.students.length === 0 ? `
            <p class="text-[11px] text-slate-400 italic">Chưa phân công học sinh.</p>
          ` : `
            <div class="flex flex-wrap gap-1">
              ${data.students.map(stId => {
                const s = appState.students.find(x => x.id === stId);
                return `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">${escapeHtml(s ? s.hoTen : stId)}</span>`;
              }).join("")}
            </div>
          `}
        </div>

        ${isLaborLeader ? `
          <div class="pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <button onclick="openAssignDutyModal('${sess.key}')" class="flex-1 py-1 px-2 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[10px] font-bold border border-sky-200">
              <i class="fa-solid fa-user-plus mr-1"></i> Phân công
            </button>
            <button onclick="submitDutyEvaluation('${sess.key}', 'DAT')" class="py-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200" title="Đánh giá Đạt">
              <i class="fa-solid fa-check"></i>
            </button>
            <button onclick="submitDutyEvaluation('${sess.key}', 'CHUA_DAT')" class="py-1 px-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold border border-rose-200" title="Đánh giá Chưa đạt (Trực bù)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join("");

  renderLaborVolunteerList();
}

let currentAssigningSessionKey = "T2_SANG";

function canManageDuty() {
  return (appState.roleLevel === "GVCN") || (appState.roleLevel === "LABOR");
}

function openAssignDutyModal(sessionKey) {
  if (!canManageDuty()) {
    alert("Chỉ GVCN hoặc Lớp phó Lao động mới có quyền phân công trực nhật!");
    return;
  }
  currentAssigningSessionKey = sessionKey;
  const modal = document.getElementById("assignDutyModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const titleEl = document.getElementById("assignDutySessionTitle");
  if (titleEl) titleEl.innerText = getSessionLabel(sessionKey);

  const current = appState.dutyAssignments[sessionKey] || { students: [] };
  const container = document.getElementById("assignStudentCheckboxList");
  if (container) {
    container.innerHTML = appState.students.map(s => {
      const isChecked = current.students.includes(s.id);
      return `
        <label class="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer text-xs hover:bg-slate-100">
          <div class="flex items-center gap-2">
            <input type="checkbox" value="${escapeAttr(s.id)}" ${isChecked ? 'checked' : ''} class="w-4 h-4 accent-sky-600 duty-assign-cb">
            <span class="font-bold text-slate-800">${escapeHtml(s.hoTen)}</span>
          </div>
          <span class="text-[10px] text-slate-500">${escapeHtml(s.to)}</span>
        </label>
      `;
    }).join("");
  }
}

function closeAssignDutyModal() {
  const modal = document.getElementById("assignDutyModal");
  if (modal) modal.classList.add("hidden");
}

async function saveDutyAssignmentForSession() {
  if (!canManageDuty()) {
    alert("Không có quyền phân công trực nhật!");
    return;
  }
  const selected = [];
  document.querySelectorAll(".duty-assign-cb:checked").forEach(cb => selected.push(cb.value));

  if (!appState.dutyAssignments[currentAssigningSessionKey]) {
    appState.dutyAssignments[currentAssigningSessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "" };
  }
  appState.dutyAssignments[currentAssigningSessionKey].students = selected;

  saveStateToLocal();
  render7DutySection();
  closeAssignDutyModal();
  await callApi("saveDutyState", { dutyAssignments: appState.dutyAssignments, volunteerLaborList: appState.volunteerLaborList }, "POST");
  alert(`Đã phân công ${selected.length} học sinh cho ${getSessionLabel(currentAssigningSessionKey)}!`);
}

async function submitDutyEvaluation(sessionKey, status) {
  if (!canManageDuty()) {
    alert("Chỉ GVCN hoặc Lớp phó Lao động mới có quyền nghiệm thu ca trực!");
    return;
  }
  if (!appState.dutyAssignments[sessionKey]) {
    appState.dutyAssignments[sessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "" };
  }

  let note = "";
  if (status === "CHUA_DAT") {
    note = prompt("Nhập nội dung nhắc nhở / ca trực bù:", "Trực nhật bù 15 phút đầu giờ hôm sau");
    if (note === null) return;
  }

  appState.dutyAssignments[sessionKey].status = status;
  appState.dutyAssignments[sessionKey].note = note;

  saveStateToLocal();
  render7DutySection();
  await callApi("saveDutyState", { dutyAssignments: appState.dutyAssignments, volunteerLaborList: appState.volunteerLaborList }, "POST");
  await callApi("saveLaborInspection", {
    date: formatDateVN(),
    session: getSessionLabel(sessionKey),
    status: status === "DAT" ? "Đạt" : "Chưa đạt (Trực bù)",
    note,
    recorder: appState.currentUser ? appState.currentUser.fullName : "Ban Lao động"
  }, "POST");
  alert(`Đã cập nhật trạng thái ca trực: ${status === 'DAT' ? 'ĐẠT' : 'CHƯA ĐẠT (Trực bù)'}!`);
}

function openDutyRegisterModal() {
  if (!appState.currentUser) {
    alert("Vui lòng đăng nhập!");
    return;
  }
  const modal = document.getElementById("dutyRegisterModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const sel = document.getElementById("volunteerStudentSelect");
  if (sel) {
    sel.innerHTML = appState.students.map(s => `<option value="${escapeAttr(s.id)}|${escapeAttr(s.hoTen)}">${escapeHtml(s.id)} - ${escapeHtml(s.hoTen)} (${escapeHtml(s.to)})</option>`).join("");
    if (appState.currentUser && appState.currentUser.studentId) {
      const me = appState.students.find(s => s.id === appState.currentUser.studentId);
      if (me) sel.value = `${me.id}|${me.hoTen}`;
    }
  }
}

function closeDutyRegisterModal() {
  const modal = document.getElementById("dutyRegisterModal");
  if (modal) modal.classList.add("hidden");
}

async function submitVolunteerRegistration() {
  const act = document.getElementById("volunteerActivityInput").value.trim();
  const stVal = document.getElementById("volunteerStudentSelect").value.split("|");

  if (!act) {
    alert("Vui lòng nhập tên hoạt động Đoàn trường!");
    return;
  }

  appState.volunteerLaborList.unshift({
    id: `VOL_${Date.now()}`,
    time: formatDateVN(),
    studentId: stVal[0],
    studentName: stVal[1],
    activity: act,
    status: "CHO_DUYET"
  });

  saveStateToLocal();
  renderLaborVolunteerList();
  closeDutyRegisterModal();
  const inputEl = document.getElementById("volunteerActivityInput");
  if (inputEl) inputEl.value = "";
  await callApi("saveDutyState", { dutyAssignments: appState.dutyAssignments, volunteerLaborList: appState.volunteerLaborList }, "POST");
  alert("Đã đăng ký tham gia phong trào Lao động Đoàn trường!");
}

function renderLaborVolunteerList() {
  const container = document.getElementById("laborVolunteerList");
  if (!container) return;

  if (appState.volunteerLaborList.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic py-2">Chưa có học sinh đăng ký hoạt động phong trào Đoàn.</p>`;
    return;
  }

  const isGVCN = (appState.roleLevel === "GVCN");

  container.innerHTML = appState.volunteerLaborList.map(v => `
    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
      <div>
        <b class="text-slate-800">${escapeHtml(v.studentName)}</b>
        <span class="text-slate-600 ml-1.5">• Hoạt động: <b>${escapeHtml(v.activity)}</b> (${escapeHtml(v.time)})</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${v.status === 'DA_DUYET' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
          ${v.status === 'DA_DUYET' ? '+10đ Rèn luyện' : 'Chờ GVCN duyệt'}
        </span>
        ${isGVCN && v.status === 'CHO_DUYET' ? `
          <button onclick="approveVolunteerLabor('${escapeAttr(v.id)}')" class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">Duyệt (+10đ)</button>
        ` : ''}
      </div>
    </div>
  `).join("");
}

async function approveVolunteerLabor(id) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền duyệt cộng điểm phong trào Đoàn!");
    return;
  }
  const item = appState.volunteerLaborList.find(x => x.id === id);
  if (!item || item.status === "DA_DUYET") return;

  item.status = "DA_DUYET";
  const st = appState.students.find(s => s.id === item.studentId);
  const dateStr = formatDateVN();
  const incidentKey = `VOL_${item.id}`;
  const criteriaText = `[Lao động Đoàn] ${item.activity}`;

  if (st) {
    st.diemThiDua = Math.max(0, parseScore(st.diemThiDua, 100) + 10);
    appState.violations.unshift({
      time: `Phong trào (${dateStr})`,
      date: dateStr,
      week: appState.selectedWeek,
      studentId: st.id,
      studentName: st.hoTen,
      criteria: criteriaText,
      points: 10,
      note: "Hoàn thành xuất sắc hoạt động phong trào Đoàn",
      sender: "GVCN duyệt",
      incidentKey
    });
  }

  saveStateToLocal();
  renderLaborVolunteerList();
  renderOverviewDashboard();

  await callApi("saveDutyState", { dutyAssignments: appState.dutyAssignments, volunteerLaborList: appState.volunteerLaborList }, "POST");
  if (st) {
    await callApi("recordViolation", {
      incidentKey,
      week: appState.selectedWeek,
      date: dateStr,
      displayTime: `Phong trào (${dateStr})`,
      studentId: st.id,
      studentName: st.hoTen,
      criteria: criteriaText,
      points: 10,
      note: "Hoàn thành xuất sắc hoạt động phong trào Đoàn",
      sender: "GVCN duyệt"
    }, "POST");
  }
  alert(`Đã duyệt khen thưởng +10đ rèn luyện cho học sinh [${item.studentName}]!`);
}

function canManageVtm() {
  return (appState.roleLevel === "GVCN") || (appState.roleLevel === "VTM");
}

function renderVtmSection() {
  const eventsGrid = document.getElementById("vtmEventsGrid");
  const mediaGrid = document.getElementById("classMediaGalleryGrid");
  const isVtmLeader = canManageVtm();

  if (eventsGrid) {
    if (appState.vtmEvents.length === 0) {
      eventsGrid.innerHTML = `<p class="col-span-full text-xs text-slate-400 italic py-4">Chưa có sự kiện phong trào VTM nào.</p>`;
    } else {
      eventsGrid.innerHTML = appState.vtmEvents.map(ev => `
        <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 class="font-black text-xs text-purple-800 uppercase truncate">${escapeHtml(ev.title)}</h4>
            ${isVtmLeader ? `<button onclick="deleteVtmEvent('${escapeAttr(ev.id)}')" class="text-slate-400 hover:text-rose-600 text-xs"><i class="fa-solid fa-trash-can"></i></button>` : ''}
          </div>
          <p class="text-[11px] text-slate-600">Lịch: <b class="text-slate-800">${escapeHtml(ev.schedule)}</b></p>
          <p class="text-[11px] text-slate-500 italic">${escapeHtml(ev.note || "Không có ghi chú")}</p>
        </div>
      `).join("");
    }
  }

  if (mediaGrid) {
    if (appState.classMedia.length === 0) {
      mediaGrid.innerHTML = `<p class="col-span-full text-xs text-slate-400 italic py-4 text-center">Chưa có hình ảnh/clip kỷ niệm. Hãy đăng tải khoảnh khắc đẹp của lớp!</p>`;
    } else {
      mediaGrid.innerHTML = appState.classMedia.map(m => {
        const imgUrl = safeMediaSrc(m.imgData);
        return `
          <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs group">
            <div class="h-32 bg-slate-100 overflow-hidden relative">
              ${imgUrl ? `<img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(m.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` : `<div class="w-full h-full flex items-center justify-center text-slate-400 text-xs">Ảnh không hợp lệ</div>`}
              ${isVtmLeader ? `
                <button onclick="deleteClassMedia('${escapeAttr(m.id)}')" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/70 text-white text-[10px] flex items-center justify-center hover:bg-rose-600">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
            </div>
            <div class="p-2.5 space-y-1">
              <h5 class="text-xs font-black text-slate-800 truncate">${escapeHtml(m.title)}</h5>
              <span class="text-[9.5px] text-slate-400 block">${escapeHtml(m.date)}</span>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

function openAddVtmEventModal() {
  if (!canManageVtm()) {
    alert("Chỉ GVCN hoặc Lớp phó Văn Thể Mỹ mới có quyền thêm sự kiện!");
    return;
  }
  document.getElementById("addVtmModal").classList.remove("hidden");
}
function closeAddVtmModal() {
  document.getElementById("addVtmModal").classList.add("hidden");
}

async function submitNewVtmEvent() {
  if (!canManageVtm()) {
    alert("Không có quyền thêm sự kiện Văn Thể Mỹ!");
    return;
  }
  const titleEl = document.getElementById("vtmEventTitleInput");
  const scheduleEl = document.getElementById("vtmEventScheduleInput");
  const noteEl = document.getElementById("vtmEventNoteInput");
  const title = titleEl.value.trim();
  const schedule = scheduleEl.value.trim();
  const note = noteEl.value.trim();

  if (!title) {
    alert("Vui lòng nhập tên phong trào/cuộc thi!");
    return;
  }

  appState.vtmEvents.unshift({
    id: `VTM_${Date.now()}`,
    title,
    schedule: schedule || "Chưa xếp lịch",
    note
  });

  saveStateToLocal();
  renderVtmSection();
  closeAddVtmModal();
  titleEl.value = "";
  scheduleEl.value = "";
  noteEl.value = "";
  await callApi("saveVtmMediaState", { vtmEvents: appState.vtmEvents, classMedia: appState.classMedia }, "POST");
  alert("Đã lưu sự kiện phong trào Văn Thể Mỹ!");
}

async function deleteVtmEvent(id) {
  if (!canManageVtm()) {
    alert("Không có quyền xóa sự kiện Văn Thể Mỹ!");
    return;
  }
  if (confirm("Thầy/bạn có chắc chắn muốn xóa sự kiện này?")) {
    appState.vtmEvents = appState.vtmEvents.filter(x => x.id !== id);
    saveStateToLocal();
    renderVtmSection();
    await callApi("saveVtmMediaState", { vtmEvents: appState.vtmEvents, classMedia: appState.classMedia }, "POST");
  }
}

function openUploadMediaModal() {
  if (!canManageVtm()) {
    alert("Chỉ GVCN hoặc Lớp phó Văn Thể Mỹ mới có quyền đăng ảnh kỷ niệm!");
    return;
  }
  document.getElementById("uploadMediaModal").classList.remove("hidden");
}
function closeUploadMediaModal() {
  document.getElementById("uploadMediaModal").classList.add("hidden");
}

async function submitUploadMediaItem() {
  if (!canManageVtm()) {
    alert("Không có quyền tải ảnh lên Kho Media!");
    return;
  }
  const titleInput = document.getElementById("mediaTitleInput");
  const title = titleInput.value.trim();
  const fileInput = document.getElementById("mediaFileInput");

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Vui lòng chọn tệp ảnh!");
    return;
  }

  try {
    const compressedData = await compressImageDataUrl(fileInput.files[0], 960, 0.72);
    appState.classMedia.unshift({
      id: `MED_${Date.now()}`,
      title: title || "Khoảnh khắc 10A12",
      imgData: compressedData,
      date: formatDateVN()
    });
    saveStateToLocal();
    renderVtmSection();
    closeUploadMediaModal();
    titleInput.value = "";
    fileInput.value = "";
    await callApi("saveVtmMediaState", { vtmEvents: appState.vtmEvents, classMedia: appState.classMedia }, "POST");
    alert("Đã thêm và đồng bộ ảnh vào Kho Media Kỷ niệm của lớp!");
  } catch (err) {
    alert("Không thể xử lý ảnh: " + err.message);
  }
}

async function deleteClassMedia(id) {
  if (!canManageVtm()) {
    alert("Không có quyền xóa ảnh Kho Media!");
    return;
  }
  if (confirm("Xóa bức ảnh này khỏi Kho Media lớp?")) {
    appState.classMedia = appState.classMedia.filter(x => x.id !== id);
    saveStateToLocal();
    renderVtmSection();
    await callApi("saveVtmMediaState", { vtmEvents: appState.vtmEvents, classMedia: appState.classMedia }, "POST");
  }
}