/**
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ THỜI KHÓA BIỂU, TRỰC NHẬT 7 CA & VĂN THỂ MỸ
 */

function renderTkbSubjectCell(val) {
  const text = String(val || "-").trim() || "-";
  if (text === "-" || text === "—") {
    return `<td class="py-2.5 px-3 text-center text-slate-400 font-medium">-</td>`;
  }
  const norm = typeof removeVietnameseTones === "function" ? removeVietnameseTones(text) : text.toLowerCase();
  const isGvcn = norm.includes("man");
  return `<td class="py-2.5 px-3 text-center ${isGvcn ? "text-amber-700 font-black bg-amber-50/70" : "text-sky-900 font-bold"}">${escapeHtml(text)}</td>`;
}

function renderTkbRowsHtml(rows, periodColorClass) {
  return (rows || []).map((r, idx) => `
    <tr class="border-b border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/90"} hover:bg-sky-50/50 transition text-xs">
      <td class="py-2.5 px-3 text-center font-mono font-black ${periodColorClass}">${escapeHtml(r.period)}</td>
      <td class="py-2.5 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">${escapeHtml(r.time)}</td>
      ${["t2", "t3", "t4", "t5", "t6", "t7"].map(k => renderTkbSubjectCell(r[k])).join("")}
    </tr>
  `).join("");
}

function renderTkbSection() {
  const activeTkb = (typeof getActiveTkbConfig === "function") ? getActiveTkbConfig() : (appState.tkbConfig || { morning: [], afternoon: [] });
  const headerTitleEl = document.getElementById("tkbHeaderTitle");
  if (headerTitleEl) {
    const versionText = activeTkb.version || (activeTkb.effectiveDate ? `${activeTkb.versionLabel} (Từ ${activeTkb.effectiveDate})` : activeTkb.versionLabel);
    const fullText = (typeof formatTkbHeaderTitleText === "function")
      ? formatTkbHeaderTitleText(activeTkb)
      : `Thời Khóa Biểu Lớp 10A12 • ${versionText}`;
    headerTitleEl.innerText = fullText;
    headerTitleEl.innerHTML = `<i class="fa-solid fa-calendar-days text-indigo-700"></i> ${escapeHtml(fullText)}`;
  }

  const mBody = document.getElementById("tkbMorningTableBody");
  const aBody = document.getElementById("tkbAfternoonTableBody");

  if (mBody) mBody.innerHTML = renderTkbRowsHtml(activeTkb.morning || [], "text-sky-700");
  if (aBody) aBody.innerHTML = renderTkbRowsHtml(activeTkb.afternoon || [], "text-indigo-700");

  const preferredImg = (activeTkb && activeTkb.imageBase64 && String(activeTkb.imageBase64).startsWith("data:image"))
    ? activeTkb.imageBase64
    : appState.tkbCustomImage;
  const imgSrc = safeMediaSrc(preferredImg) || "tkb_10a12.png";
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
  if (badge) badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang đọc & đồng bộ ảnh TKB...`;

  try {
    const compressed = await compressImageDataUrl(file, 1280, 0.78);
    appState.tkbCustomImage = compressed;
    appState.tkbUpdatedAt = new Date().toLocaleString("vi-VN");
    try { localStorage.setItem("10A12_TKB_IMAGE", compressed); } catch (e) {}

    const activeTkb = (typeof getActiveTkbConfig === "function") ? getActiveTkbConfig() : (appState.tkbConfig || {});
    activeTkb.imageBase64 = compressed;
    const detectedVersion = detectTkbVersionFromFilename(file.name);
    if (detectedVersion) {
      activeTkb.versionLabel = detectedVersion;
      activeTkb.version = activeTkb.effectiveDate ? `${detectedVersion} (Từ ${activeTkb.effectiveDate})` : detectedVersion;
    }

    if (typeof purgeLegacyTkbCacheKeys === "function") purgeLegacyTkbCacheKeys();
    saveStateToLocal();
    renderTkbSection();

    const cloudTkb = (typeof getCloudSafeTkbConfig === "function") ? getCloudSafeTkbConfig(activeTkb) : activeTkb;
    const cloudRes = await callApi("saveConfig", {
      tkbCustomImage: appState.tkbCustomImage,
      tkbUpdatedAt: appState.tkbUpdatedAt,
      tkbConfigJson: JSON.stringify(cloudTkb)
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

let pendingModalTkbImageBase64 = "";

async function handleModalTkbImagePick(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;
  const statusEl = document.getElementById("editTkbModalImageStatus");
  try {
    if (statusEl) statusEl.innerText = "Đang nén ảnh TKB...";
    const compressed = await compressImageDataUrl(file, 1280, 0.78);
    pendingModalTkbImageBase64 = compressed;
    const detected = detectTkbVersionFromFilename(file.name);
    const verEl = document.getElementById("editTkbVersionInput");
    if (detected && verEl && !verEl.dataset.edited) {
      verEl.value = detected;
    }
    if (statusEl) statusEl.innerText = `Đã chọn ảnh mới (${file.name}) • Sẽ lưu khi bấm Lưu & Đồng Bộ.`;
  } catch (err) {
    if (statusEl) statusEl.innerText = "Lỗi đọc ảnh: " + err.message;
  }
}

function clearEditTkbSession(sessionKey) {
  const tbody = document.getElementById("editTkbScheduleBody");
  if (!tbody || typeof tbody.querySelectorAll !== "function") return;
  const inputs = tbody.querySelectorAll("input[data-session], input[data-tkb-session]");
  inputs.forEach(inp => {
    const ds = inp.dataset || {};
    if ((ds.session || ds.tkbSession) === sessionKey) {
      inp.value = "-";
    }
  });
}

function buildEditTkbGridRowsHtml(rows, sessionKey, sessionLabel) {
  const isAfternoon = sessionKey === "afternoon";
  const labelCellCls = isAfternoon
    ? "bg-indigo-50 text-indigo-900 border-r border-indigo-200"
    : "bg-sky-50 text-sky-900 border-r border-sky-200";
  const focusCls = isAfternoon ? "focus:border-indigo-500" : "focus:border-sky-500";

  return (rows || []).map((r, idx) => {
    const periodNum = Number(r.period) || (idx + 1);
    return `
      <tr class="border-b border-slate-200 text-xs ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}" data-tkb-row-session="${sessionKey}">
        <td class="px-2 py-1.5 font-bold whitespace-nowrap ${labelCellCls}">${escapeHtml(sessionLabel)} • T${escapeHtml(periodNum)}</td>
        ${["t2", "t3", "t4", "t5", "t6", "t7"].map(dayCol => {
          const inputId = `${sessionKey}_p${periodNum}_${dayCol}`;
          const rawVal = String((r[dayCol] !== undefined && r[dayCol] !== null) ? r[dayCol] : "-").trim();
          const cellVal = (!rawVal || rawVal === "—") ? "-" : rawVal;
          return `
            <td class="p-1">
              <input type="text" id="${escapeAttr(inputId)}"
                data-session="${escapeAttr(sessionKey)}"
                data-tkb-session="${escapeAttr(sessionKey)}"
                data-tkb-period="${escapeAttr(periodNum)}"
                data-tkb-idx="${idx}"
                data-tkb-day="${escapeAttr(dayCol)}"
                value="${escapeAttr(cellVal)}"
                placeholder="-"
                onfocus="if(this.value==='-')this.value='';"
                onblur="if(!this.value.trim())this.value='-';"
                class="w-full min-w-[88px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 text-[11px] font-medium ${focusCls} focus:outline-none">
            </td>
          `;
        }).join("")}
      </tr>
    `;
  }).join("");
}

function populateTkbModal(fromUpload) {
  pendingModalTkbImageBase64 = "";
  const rawTkb = (typeof getActiveTkbConfig === "function") ? getActiveTkbConfig() : (appState.tkbConfig || {});
  const activeTkb = (typeof normalizeTkbConfig === "function") ? normalizeTkbConfig(rawTkb) : rawTkb;
  if (typeof appState === "object" && appState) appState.tkbConfig = activeTkb;

  const verEl = document.getElementById("editTkbVersionInput");
  const dateEl = document.getElementById("editTkbDateInput");
  const imgInputEl = document.getElementById("editTkbModalImageInput");
  const imgStatusEl = document.getElementById("editTkbModalImageStatus");
  const bannerHint = document.getElementById("editTkbUploadNotice");
  const tbody = document.getElementById("editTkbScheduleBody");

  if (verEl) {
    if (verEl.dataset) delete verEl.dataset.edited;
    verEl.value = activeTkb.versionLabel || "Số 4";
  }
  if (dateEl) dateEl.value = activeTkb.effectiveDate || "";
  if (imgInputEl) imgInputEl.value = "";
  if (imgStatusEl) {
    const hasB64 = (activeTkb.imageBase64 && activeTkb.imageBase64.startsWith("data:image")) || (appState.tkbCustomImage && String(appState.tkbCustomImage).startsWith("data:image"));
    imgStatusEl.innerText = hasB64 ? "Đang gắn ảnh TKB tùy chỉnh (Base64)" : "Đang dùng ảnh mặc định / chưa chọn ảnh mới";
  }
  if (bannerHint) {
    if (fromUpload) bannerHint.classList.remove("hidden");
    else bannerHint.classList.add("hidden");
  }
  if (tbody) {
    tbody.innerHTML = buildEditTkbGridRowsHtml(activeTkb.morning || [], "morning", "Sáng") +
      buildEditTkbGridRowsHtml(activeTkb.afternoon || [], "afternoon", "Chiều");
  }
  return activeTkb;
}

function openEditTkbModal(fromUpload) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền sửa nội dung Thời khóa biểu!");
    return;
  }
  const modal = document.getElementById("editTkbModal");
  if (!modal) return;
  populateTkbModal(fromUpload);
  modal.classList.remove("hidden");
}

function closeEditTkbModal() {
  pendingModalTkbImageBase64 = "";
  const modal = document.getElementById("editTkbModal");
  if (modal) modal.classList.add("hidden");
}

async function saveTkbConfigChanges() {
  if (appState.roleLevel !== "GVCN") return;
  const verInput = document.getElementById("editTkbVersionInput");
  const dateInput = document.getElementById("editTkbDateInput");
  let nextVer = verInput ? String(verInput.value || "").trim() : "";
  if (!nextVer) {
    alert("Vui lòng nhập Số hiệu TKB (ví dụ: Số 4)!");
    return;
  }
  if (/^\d+$/.test(nextVer)) nextVer = `Số ${nextVer}`;
  const vShort = nextVer.replace(/\s*\([^)]*\)\s*$/, "").split(/\s*-\s*Từ/i)[0].trim() || nextVer;
  const nextDate = dateInput ? String(dateInput.value || "").trim() : "";
  const fullVer = nextDate ? `${vShort} (Từ ${nextDate})` : nextVer;

  const activeTkb = (typeof normalizeTkbConfig === "function") ? normalizeTkbConfig(getActiveTkbConfig()) : { ...getActiveTkbConfig() };
  activeTkb.versionLabel = vShort;
  activeTkb.effectiveDate = nextDate;
  activeTkb.version = fullVer;

  const hasNewModalImg = Boolean(pendingModalTkbImageBase64);
  if (hasNewModalImg) {
    appState.tkbCustomImage = pendingModalTkbImageBase64;
    activeTkb.imageBase64 = pendingModalTkbImageBase64;
    try { localStorage.setItem("10A12_TKB_IMAGE", pendingModalTkbImageBase64); } catch (e) {}
  } else if (appState.tkbCustomImage && String(appState.tkbCustomImage).startsWith("data:image")) {
    activeTkb.imageBase64 = String(appState.tkbCustomImage);
  }

  const tbody = document.getElementById("editTkbScheduleBody");
  const inputs = (tbody && typeof tbody.querySelectorAll === "function")
    ? Array.from(tbody.querySelectorAll("input[data-session], input[data-tkb-session]"))
    : [];

  if (inputs.length > 0) {
    inputs.forEach(inp => {
      const ds = inp.dataset || {};
      const sess = ds.session || ds.tkbSession;
      let idx = parseInt(ds.tkbIdx, 10);
      if (Number.isNaN(idx) && ds.tkbPeriod) idx = parseInt(ds.tkbPeriod, 10) - 1;
      const dayCol = ds.tkbDay || ds.day;
      if (activeTkb[sess] && idx >= 0 && activeTkb[sess][idx] && dayCol) {
        const cleaned = String(inp.value || "").trim();
        activeTkb[sess][idx][dayCol] = (!cleaned || cleaned === "—") ? "-" : cleaned;
      }
    });
  } else {
    ["morning", "afternoon"].forEach(sess => {
      (activeTkb[sess] || []).forEach(row => {
        ["t2", "t3", "t4", "t5", "t6", "t7"].forEach(dayCol => {
          const inp = document.getElementById(`${sess}_p${row.period}_${dayCol}`);
          if (inp) {
            const cleaned = String(inp.value || "").trim();
            row[dayCol] = (!cleaned || cleaned === "—") ? "-" : cleaned;
          }
        });
      });
    });
  }

  appState.tkbConfig = activeTkb;
  appState.tkbUpdatedAt = new Date().toLocaleString("vi-VN");
  if (typeof purgeLegacyTkbCacheKeys === "function") purgeLegacyTkbCacheKeys();
  try {
    localStorage.setItem("10A12_TKB_CONFIG", JSON.stringify(appState.tkbConfig));
  } catch (e) {
    try {
      const compact = (typeof getCloudSafeTkbConfig === "function") ? getCloudSafeTkbConfig(appState.tkbConfig) : appState.tkbConfig;
      localStorage.setItem("10A12_TKB_CONFIG", JSON.stringify(compact));
    } catch (e2) {}
  }
  saveStateToLocal();
  renderTkbSection();
  if (typeof renderOverviewDashboard === "function") renderOverviewDashboard();
  if (typeof updateLiveDashboardEngine === "function") updateLiveDashboardEngine();
  if (typeof updateSuggestedSubjectByTkb === "function") updateSuggestedSubjectByTkb();
  closeEditTkbModal();

  const cloudTkb = (typeof getCloudSafeTkbConfig === "function") ? getCloudSafeTkbConfig(activeTkb) : activeTkb;
  const payload = {
    tkbConfigJson: JSON.stringify(cloudTkb),
    tkbUpdatedAt: appState.tkbUpdatedAt
  };
  if (hasNewModalImg) {
    payload.tkbCustomImage = appState.tkbCustomImage;
  }

  const cloudRes = await callApi("saveConfig", payload, "POST");

  if (cloudRes && cloudRes.status === "success") {
    alert(`Đã lưu Thời khóa biểu ${activeTkb.version} và đồng bộ toàn hệ thống!`);
  } else {
    alert(`Đã cập nhật Thời khóa biểu ${activeTkb.version} trên giao diện (chờ đồng bộ Google Sheets).`);
  }
}

function saveTkbConfigFromModal() {
  return saveTkbConfigChanges();
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

// ==================== PHÂN HỆ TRỰC NHẬT 7 CA (CHIỀU THỨ 2 -> SÁNG THỨ 2 TUẦN SAU) & STUDIO KỶ NIỆM ====================
const DUTY_REMEDY_PRESETS = [
  "Trực nhật bù 15 phút đầu giờ buổi học kế tiếp",
  "Tổng vệ sinh lớp học & hành lang cuối tuần",
  "Nhắc nhở, rút kinh nghiệm trong tiết Sinh hoạt lớp",
  "Trực bổ sung thêm 01 ca cùng tổ khác",
  "Báo cáo GVCN phối hợp gia đình nhắc nhở"
];

const DUTY_7_SHIFTS_CYCLE = [
  { key: "T2_CHIEU", name: "Ca 1 • Chiều Thứ 2", time: "13:30 - 13:45 & Cuối buổi" },
  { key: "T3_SANG", name: "Ca 2 • Sáng Thứ 3", time: "06:30 - 06:45 & Cuối buổi" },
  { key: "T3_CHIEU", name: "Ca 3 • Chiều Thứ 3", time: "13:30 - 13:45 & Cuối buổi" },
  { key: "T4_SANG", name: "Ca 4 • Sáng Thứ 4", time: "06:30 - 06:45 & Cuối buổi" },
  { key: "T5_SANG", name: "Ca 5 • Sáng Thứ 5", time: "06:30 - 06:45 & Cuối buổi" },
  { key: "T6_SANG", name: "Ca 6 • Sáng Thứ 6", time: "06:30 - 06:45 & Tổng vệ sinh" },
  { key: "T2_SANG_NEXT", name: "Ca 7 • Sáng Thứ 2 (Tuần sau)", time: "06:30 - 06:45 • Bàn giao tuần mới" }
];

function getActiveWeekDutyMap() {
  const selWeek = Number(appState.selectedWeek) || getAutoSchoolWeek();
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : null;
  if (scoped && scoped.isArchivedView && !scoped.isGvcnUnlocked && scoped.archive && scoped.archive.dutyAssignments) {
    return scoped.archive.dutyAssignments;
  }
  if (typeof getDutyDataForWeek === "function") {
    return getDutyDataForWeek(selWeek);
  }
  if (!appState.dutyAssignments || typeof appState.dutyAssignments !== "object") {
    appState.dutyAssignments = {};
  }
  return appState.dutyAssignments;
}

function saveActiveWeekDutyMap(updatedMap) {
  const selWeek = Number(appState.selectedWeek) || getAutoSchoolWeek();
  if (typeof setDutyDataForWeek === "function") {
    setDutyDataForWeek(selWeek, updatedMap);
  } else {
    appState.dutyAssignments = updatedMap;
  }
  // Nếu tuần này đang được GVCN mở khóa từ kho lưu trữ, đồng bộ ngay vào bản lưu trữ tuần
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : null;
  if (scoped && scoped.isArchivedView && scoped.isGvcnUnlocked && scoped.archive) {
    scoped.archive.dutyAssignments = JSON.parse(JSON.stringify(updatedMap));
  }
}

function ensureDutyEvaluationState() {
  getActiveWeekDutyMap();
  if (!Array.isArray(appState.dutyRemediationLogs)) {
    appState.dutyRemediationLogs = safeJsonParse(localStorage.getItem("10A12_DUTY_REMEDIATION"), []);
  }
}

function getStudentDutyEvalRecord(sessionData, studentId) {
  if (!sessionData || !sessionData.studentEvaluations) return { status: "CHUA_CHAM", reason: "", remedy: "", resolved: false };
  return sessionData.studentEvaluations[studentId] || { status: "CHUA_CHAM", reason: "", remedy: "", resolved: false };
}

function renderLeaderLockNoticeBanner(tabId, roleLabel) {
  const tab = document.getElementById(tabId);
  if (!tab) return;
  const existing = tab.querySelector(".leader-lock-status-banner");
  if (!appState.currentUser || appState.roleLevel === "GVCN" || appState.roleLevel === "STUDENT") {
    if (existing) existing.remove();
    return;
  }
  const banner = existing || document.createElement("div");
  banner.className = "leader-lock-status-banner p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 mb-3";
  if (appState.allowStudentLeaderEdit) {
    banner.className += " bg-emerald-50 border border-emerald-200 text-emerald-900";
    banner.innerHTML = `<span><i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i>Quyền Cán sự (${escapeHtml(roleLabel)}): <b>Đang mở ghi</b> — Mọi thao tác sẽ đồng bộ lên Google Sheets của GVCN.</span>`;
  } else {
    banner.className += " bg-rose-50 border border-rose-300 text-rose-900";
    banner.innerHTML = `<span><i class="fa-solid fa-lock text-rose-600 mr-1.5"></i><b>GVCN đã khóa quyền chỉnh sửa của Ban cán sự</b> để chốt sổ tuần (chế độ chỉ xem).</span>`;
  }
  if (!existing) {
    tab.insertBefore(banner, tab.firstChild);
  }
}

async function copyDutyScheduleFromPreviousWeek() {
  if (!canManageDuty()) return;
  const selWeek = Number(appState.selectedWeek) || getAutoSchoolWeek();
  if (selWeek <= 1) {
    alert("Tuần 1 chưa có tuần trước đó để sao chép!");
    return;
  }
  const prevDuty = typeof getDutyDataForWeek === "function" ? getDutyDataForWeek(selWeek - 1) : {};
  const prevKeys = Object.keys(prevDuty || {});
  if (prevKeys.length === 0) {
    alert(`Tuần ${selWeek - 1} chưa có dữ liệu phân công trực nhật để sao chép!`);
    return;
  }
  if (!confirm(`Sao chép danh sách phân công trực nhật từ Tuần ${selWeek - 1} sang Tuần ${selWeek} (đặt lại trạng thái chưa đánh giá)?`)) return;

  const cloned = {};
  DUTY_7_SHIFTS_CYCLE.forEach(s => {
    const oldItem = prevDuty[s.key] || { students: [] };
    cloned[s.key] = {
      students: Array.isArray(oldItem.students) ? [...oldItem.students] : [],
      status: "CHUA_DANH_GIA",
      note: "",
      studentEvaluations: {}
    };
  });

  saveActiveWeekDutyMap(cloned);
  saveStateToLocal();
  render7DutySection();
  await callApi("saveDutyState", {
    dutyByWeek: appState.dutyByWeek,
    dutyAssignments: cloned,
    volunteerLaborList: appState.volunteerLaborList
  }, "POST");
  alert(`Đã sao chép lịch trực nhật từ Tuần ${selWeek - 1} sang Tuần ${selWeek}!`);
}

function render7DutySection() {
  renderLeaderLockNoticeBanner("tab-lao-dong", "Lao động & Ban cán sự");
  ensureDutyEvaluationState();
  const container = document.getElementById("weekly7DutyGrid");
  if (!container) return;

  const selWeek = Number(appState.selectedWeek) || getAutoSchoolWeek();
  const scoped = typeof getScopedWeekData === "function" ? getScopedWeekData() : { isEditable: true, isArchivedView: false };
  const weekDutyMap = getActiveWeekDutyMap();
  const isLaborLeader = canManageDuty() && scoped.isEditable;

  // Thanh thông tin chu kỳ trực nhật Tuần (Chiều T2 -> Sáng T2 tuần sau)
  if (container.parentElement) {
    let cycleBar = document.getElementById("dutyCycleHeaderInfoBar");
    if (!cycleBar) {
      cycleBar = document.createElement("div");
      cycleBar.id = "dutyCycleHeaderInfoBar";
      cycleBar.className = "p-3 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-3";
      container.parentElement.insertBefore(cycleBar, container);
    }
    cycleBar.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="px-2.5 py-0.5 rounded-lg bg-sky-700 text-white font-black text-[11px]">Tuần ${selWeek}</span>
        <span class="font-bold text-sky-950">Chu kỳ trực nhật 7 ca: <b>Chiều Thứ 2 (Tuần ${selWeek}) $\rightarrow$ Sáng Thứ 2 (Tuần ${selWeek + 1})</b></span>
        ${scoped.isArchivedView ? `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10.5px]">${scoped.isGvcnUnlocked ? '🔓 Đang mở khóa chỉnh sửa' : '🔒 Tuần đã chốt sổ'}</span>` : ''}
      </div>
      ${isLaborLeader && selWeek > 1 ? `
        <button type="button" onclick="copyDutyScheduleFromPreviousWeek()" class="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-[11px] shrink-0 self-start sm:self-auto">
          <i class="fa-solid fa-copy mr-1"></i> Chép lịch từ Tuần ${selWeek - 1}
        </button>
      ` : ''}
    `;
  }

  container.innerHTML = DUTY_7_SHIFTS_CYCLE.map(sess => {
    const data = weekDutyMap[sess.key] || { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
    const isDat = data.status === "DAT";
    const isChuaDat = data.status === "CHUA_DAT";

    const stList = Array.isArray(data.students) ? data.students : [];
    const goodCount = stList.filter(id => getStudentDutyEvalRecord(data, id).status === "TOT").length;
    const poorCount = stList.filter(id => getStudentDutyEvalRecord(data, id).status === "CHUA_DAT").length;

    return `
      <div class="p-3.5 rounded-2xl bg-white border ${poorCount > 0 ? 'border-rose-300 bg-rose-50/10' : (goodCount > 0 && goodCount === stList.length && stList.length > 0 ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200')} shadow-xs space-y-2.5 flex flex-col justify-between">
        <div class="space-y-2.5">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 class="font-black text-xs text-slate-800 uppercase">${sess.name}</h4>
              <span class="text-[9.5px] text-slate-400 block">${sess.time}</span>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isDat ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (isChuaDat ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600')}">
              ${isDat ? 'Đạt' : (isChuaDat ? 'Trực bù' : 'Chưa trực')}
            </span>
          </div>

          <div class="space-y-1.5 min-h-[58px]">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-slate-400 font-bold uppercase">Học sinh trực nhật (${stList.length}):</span>
              ${stList.length > 0 && (goodCount > 0 || poorCount > 0) ? `
                <span class="text-[9.5px] font-bold">
                  <span class="text-emerald-700">${goodCount} tốt</span> • <span class="text-rose-600">${poorCount} chưa đạt</span>
                </span>
              ` : ''}
            </div>
            ${stList.length === 0 ? `
              <p class="text-[11px] text-slate-400 italic">Chưa phân công học sinh.</p>
            ` : `
              <div class="flex flex-wrap gap-1.5">
                ${stList.map(stId => {
                  const s = appState.students.find(x => x.id === stId);
                  const stName = s ? s.hoTen : stId;
                  const ev = getStudentDutyEvalRecord(data, stId);
                  let chipCls = "bg-slate-100 text-slate-800 border-slate-200";
                  let iconHtml = "";
                  if (ev.status === "TOT") {
                    chipCls = "bg-emerald-50 text-emerald-800 border-emerald-300";
                    iconHtml = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i>`;
                  } else if (ev.status === "CHUA_DAT") {
                    chipCls = "bg-rose-50 text-rose-800 border-rose-300";
                    iconHtml = `<i class="fa-solid fa-circle-exclamation text-rose-600 mr-1"></i>`;
                  }
                  return `
                    <span ${isLaborLeader ? `onclick="openStudentDutyEvalModal('${sess.key}')"` : ''}
                      title="${ev.status === 'CHUA_DAT' ? `Chưa đạt: ${escapeAttr(ev.reason || '')} -> Hướng giải quyết: ${escapeAttr(ev.remedy || '')}` : (ev.status === 'TOT' ? 'Thực hiện tốt ca trực' : 'Bấm để đánh giá từng bạn')}"
                      class="px-2 py-0.5 rounded-md text-[10px] font-bold border ${chipCls} ${isLaborLeader ? 'cursor-pointer hover:opacity-80' : ''} inline-flex items-center">
                      ${iconHtml}${escapeHtml(stName)}
                    </span>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        </div>

        ${isLaborLeader ? `
          <div class="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
            <button onclick="openAssignDutyModal('${sess.key}')" class="py-1 px-2 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[10px] font-bold border border-sky-200">
              <i class="fa-solid fa-user-plus mr-0.5"></i> Phân công
            </button>
            <button onclick="openStudentDutyEvalModal('${sess.key}')" class="flex-1 py-1 px-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-black shadow-2xs">
              <i class="fa-solid fa-list-check mr-0.5"></i> Chấm từng bạn
            </button>
            <button onclick="submitDutyEvaluation('${sess.key}', 'DAT')" class="py-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200" title="Đánh giá cả ca Đạt">
              <i class="fa-solid fa-check"></i>
            </button>
            <button onclick="submitDutyEvaluation('${sess.key}', 'CHUA_DAT')" class="py-1 px-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold border border-rose-200" title="Đánh giá cả ca Chưa đạt">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join("");

  renderDutyRemediationTracker();
  renderLaborVolunteerList();
}

let currentEvaluatingDutySessionKey = "T2_CHIEU";

function ensureStudentDutyEvalModal() {
  if (document.getElementById("studentDutyEvalModal")) return;
  const html = `
    <div id="studentDutyEvalModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeStudentDutyEvalModal()">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <i class="fa-solid fa-clipboard-check text-indigo-600"></i>
              Đánh Giá Trực Nhật Từng Học Sinh — <span id="dutyEvalModalSessionLabel" class="text-indigo-700">Chiều Thứ 2</span>
            </h3>
            <p class="text-[11px] text-slate-500">Lớp phó Lao động & GVCN đánh dấu mức độ hoàn thành và đề xuất hướng giải quyết cụ thể</p>
          </div>
          <button onclick="closeStudentDutyEvalModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div id="dutyEvalStudentRowsContainer" class="overflow-y-auto py-3.5 space-y-3 pr-1 text-xs flex-1"></div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <button type="button" onclick="markAllDutyStudentsGoodInModal()" class="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition">
            <i class="fa-solid fa-check-double mr-1"></i> Đánh dấu tất cả Thực hiện tốt
          </button>
          <div class="flex items-center gap-2">
            <button type="button" onclick="closeStudentDutyEvalModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
              Hủy
            </button>
            <button type="button" onclick="saveStudentDutyEvaluations()" class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition">
              <i class="fa-solid fa-floppy-disk"></i> Lưu Đánh Giá & Hướng Giải Quyết
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

function openStudentDutyEvalModal(sessionKey) {
  if (!canManageDuty()) {
    alert("Chỉ GVCN hoặc Lớp phó Lao động mới có quyền đánh giá trực nhật!");
    return;
  }
  ensureDutyEvaluationState();
  currentEvaluatingDutySessionKey = sessionKey;
  const weekDutyMap = getActiveWeekDutyMap();
  const data = weekDutyMap[sessionKey] || { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
  const stList = Array.isArray(data.students) ? data.students : [];
  if (stList.length === 0) {
    alert("Ca trực này chưa phân công học sinh nào. Vui lòng bấm 'Phân công' để chọn học sinh trước!");
    openAssignDutyModal(sessionKey);
    return;
  }

  ensureStudentDutyEvalModal();
  const titleEl = document.getElementById("dutyEvalModalSessionLabel");
  if (titleEl) titleEl.innerText = getSessionLabel(sessionKey);

  const container = document.getElementById("dutyEvalStudentRowsContainer");
  if (container) {
    container.innerHTML = stList.map(stId => {
      const st = appState.students.find(x => x.id === stId) || { id: stId, hoTen: stId, to: "" };
      const ev = getStudentDutyEvalRecord(data, stId);
      const isPoor = ev.status === "CHUA_DAT";
      return `
        <div class="p-3.5 rounded-2xl border ${isPoor ? 'border-rose-300 bg-rose-50/30' : (ev.status === 'TOT' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/60')} space-y-2.5" id="duty_eval_card_${escapeAttr(stId)}">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <b class="text-slate-900 text-sm">${escapeHtml(st.hoTen)}</b>
              <span class="text-[11px] text-slate-500 ml-1.5">(${escapeHtml(st.id)} • ${escapeHtml(st.to)})</span>
            </div>
            <div class="flex items-center gap-1.5">
              <label class="px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 cursor-pointer flex items-center gap-1.5 font-bold text-emerald-800">
                <input type="radio" name="duty_status_${escapeAttr(stId)}" value="TOT" ${ev.status === "TOT" ? "checked" : ""} onchange="toggleDutyRemedyBox('${escapeAttr(stId)}', false)" class="accent-emerald-600">
                <span>🟢 Thực hiện tốt</span>
              </label>
              <label class="px-3 py-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 cursor-pointer flex items-center gap-1.5 font-bold text-rose-800">
                <input type="radio" name="duty_status_${escapeAttr(stId)}" value="CHUA_DAT" ${isPoor ? "checked" : ""} onchange="toggleDutyRemedyBox('${escapeAttr(stId)}', true)" class="accent-rose-600">
                <span>🔴 Chưa hoàn thành</span>
              </label>
            </div>
          </div>

          <div id="duty_remedy_box_${escapeAttr(stId)}" class="${isPoor ? '' : 'hidden'} pt-2 border-t border-rose-200/70 space-y-2">
            <div>
              <label class="block text-[11px] font-bold text-rose-900 mb-1">Lý do chưa hoàn thành trực nhật:</label>
              <input type="text" id="duty_reason_${escapeAttr(stId)}" value="${escapeAttr(ev.reason || '')}" placeholder="Ví dụ: Đi trực muộn, chưa lau bảng, quên đổ rác cuối buổi..."
                class="w-full px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-slate-800 font-medium focus:outline-none focus:border-rose-500">
            </div>
            <div>
              <label class="block text-[11px] font-bold text-indigo-900 mb-1">Hướng giải quyết / Biện pháp khắc phục:</label>
              <div class="flex gap-1.5 flex-col sm:flex-row">
                <select onchange="if(this.value) document.getElementById('duty_remedy_${escapeAttr(stId)}').value = this.value" class="px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-900 font-bold text-[11px] focus:outline-none">
                  <option value="">-- Chọn nhanh hướng giải quyết --</option>
                  ${DUTY_REMEDY_PRESETS.map(p => `<option value="${escapeAttr(p)}">${escapeHtml(p)}</option>`).join("")}
                </select>
                <input type="text" id="duty_remedy_${escapeAttr(stId)}" value="${escapeAttr(ev.remedy || DUTY_REMEDY_PRESETS[0])}" placeholder="Nhập hướng giải quyết..."
                  class="flex-1 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-slate-800 font-bold focus:outline-none focus:border-indigo-500">
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  document.getElementById("studentDutyEvalModal").classList.remove("hidden");
}

function toggleDutyRemedyBox(stId, show) {
  const box = document.getElementById(`duty_remedy_box_${stId}`);
  const card = document.getElementById(`duty_eval_card_${stId}`);
  if (box) {
    if (show) box.classList.remove("hidden");
    else box.classList.add("hidden");
  }
  if (card) {
    card.className = show
      ? "p-3.5 rounded-2xl border border-rose-300 bg-rose-50/30 space-y-2.5"
      : "p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/30 space-y-2.5";
  }
}

function markAllDutyStudentsGoodInModal() {
  const sessionKey = currentEvaluatingDutySessionKey;
  const weekDutyMap = getActiveWeekDutyMap();
  const data = weekDutyMap[sessionKey];
  if (!data || !Array.isArray(data.students)) return;
  data.students.forEach(stId => {
    const radio = document.querySelector(`input[name="duty_status_${stId}"][value="TOT"]`);
    if (radio) radio.checked = true;
    toggleDutyRemedyBox(stId, false);
  });
}

function closeStudentDutyEvalModal() {
  const m = document.getElementById("studentDutyEvalModal");
  if (m) m.classList.add("hidden");
}

async function saveStudentDutyEvaluations() {
  if (!canManageDuty()) return;
  ensureDutyEvaluationState();

  const sessionKey = currentEvaluatingDutySessionKey;
  const weekDutyMap = getActiveWeekDutyMap();
  if (!weekDutyMap[sessionKey]) {
    weekDutyMap[sessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
  }
  const data = weekDutyMap[sessionKey];
  if (!data.studentEvaluations) data.studentEvaluations = {};

  const recorderName = appState.currentUser ? appState.currentUser.fullName : "Lớp phó Lao động";
  const dateStr = formatDateVN();
  const sessLabel = getSessionLabel(sessionKey);

  let anyPoor = false;
  let allGood = data.students.length > 0;

  data.students.forEach(stId => {
    const checked = document.querySelector(`input[name="duty_status_${stId}"]:checked`);
    const status = checked ? checked.value : "CHUA_CHAM";
    const reasonEl = document.getElementById(`duty_reason_${stId}`);
    const remedyEl = document.getElementById(`duty_remedy_${stId}`);
    const reason = reasonEl ? reasonEl.value.trim() : "";
    const remedy = remedyEl ? remedyEl.value.trim() : "";

    data.studentEvaluations[stId] = {
      status,
      reason,
      remedy,
      evaluatedAt: dateStr,
      evaluatedBy: recorderName,
      resolved: false
    };

    if (status === "CHUA_DAT") {
      anyPoor = true;
      allGood = false;
      const st = appState.students.find(x => x.id === stId);
      const logId = `REM_${appState.selectedWeek}_${sessionKey}_${stId}`;
      const existingIdx = appState.dutyRemediationLogs.findIndex(x => x.id === logId);
      const logEntry = {
        id: logId,
        week: appState.selectedWeek,
        date: dateStr,
        sessionKey,
        sessionLabel: sessLabel,
        studentId: stId,
        studentName: st ? st.hoTen : stId,
        team: st ? st.to : "",
        reason: reason || "Chưa hoàn thành nhiệm vụ trực nhật",
        remedy: remedy || DUTY_REMEDY_PRESETS[0],
        recorder: recorderName,
        resolved: false
      };
      if (existingIdx >= 0) appState.dutyRemediationLogs[existingIdx] = logEntry;
      else appState.dutyRemediationLogs.unshift(logEntry);
    } else {
      if (status !== "TOT") allGood = false;
      const logId = `REM_${appState.selectedWeek}_${sessionKey}_${stId}`;
      appState.dutyRemediationLogs = appState.dutyRemediationLogs.filter(x => x.id !== logId);
    }
  });

  if (anyPoor) data.status = "CHUA_DAT";
  else if (allGood) data.status = "DAT";

  saveActiveWeekDutyMap(weekDutyMap);
  localStorage.setItem("10A12_DUTY_REMEDIATION", JSON.stringify(appState.dutyRemediationLogs));
  saveStateToLocal();
  render7DutySection();
  closeStudentDutyEvalModal();

  await callApi("saveDutyState", {
    dutyByWeek: appState.dutyByWeek,
    dutyAssignments: weekDutyMap,
    volunteerLaborList: appState.volunteerLaborList
  }, "POST");

  alert(`Đã lưu kết quả đánh giá trực nhật từng học sinh cho ${sessLabel}!`);
}

async function toggleDutyRemediationResolved(logId) {
  if (!canManageDuty()) return;
  ensureDutyEvaluationState();
  const item = appState.dutyRemediationLogs.find(x => x.id === logId);
  if (!item) return;

  item.resolved = !item.resolved;
  item.resolvedAt = item.resolved ? formatDateVN() : "";
  localStorage.setItem("10A12_DUTY_REMEDIATION", JSON.stringify(appState.dutyRemediationLogs));
  saveStateToLocal();
  renderDutyRemediationTracker();
}

function renderDutyRemediationTracker() {
  const grid = document.getElementById("weekly7DutyGrid");
  if (!grid || !grid.parentElement) return;

  let trackerBox = document.getElementById("dutyRemediationTrackerBox");
  if (!trackerBox) {
    trackerBox = document.createElement("div");
    trackerBox.id = "dutyRemediationTrackerBox";
    trackerBox.className = "mt-4 p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3";
    grid.parentElement.insertBefore(trackerBox, grid.nextSibling);
  }

  const logs = (appState.dutyRemediationLogs || []).filter(x => !x.week || Number(x.week) === Number(appState.selectedWeek));
  const isLeader = canManageDuty();

  if (logs.length === 0) {
    trackerBox.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-black text-slate-800 uppercase flex items-center gap-1.5">
          <i class="fa-solid fa-clipboard-list text-emerald-600"></i>
          Theo Dõi Khắc Phục & Hướng Giải Quyết Trực Nhật (Tuần ${appState.selectedWeek})
        </span>
        <span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Các tổ trực nhật tốt, chưa có tồn đọng</span>
      </div>
    `;
    return;
  }

  trackerBox.innerHTML = `
    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
      <div>
        <h4 class="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-1.5">
          <i class="fa-solid fa-screwdriver-wrench text-rose-600"></i>
          Danh Sách Học Sinh Chưa Hoàn Thành Trực Nhật & Hướng Giải Quyết (${logs.length} em)
        </h4>
        <p class="text-[11px] text-slate-500">Lớp phó Lao động theo dõi và xác nhận khi học sinh hoàn thành trực bù / khắc phục</p>
      </div>
    </div>
    <div class="space-y-2">
      ${logs.map(item => `
        <div class="p-3 rounded-2xl border ${item.resolved ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'} flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded-md font-black text-[10px] ${item.resolved ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
                ${item.resolved ? '✓ Đã khắc phục xong' : '⏳ Cần giải quyết'}
              </span>
              <b class="text-slate-900">${escapeHtml(item.studentName)}</b>
              <span class="text-slate-500 font-bold">(${escapeHtml(item.team)} • ${escapeHtml(item.sessionLabel)})</span>
            </div>
            <p class="text-slate-700"><b>Lý do:</b> ${escapeHtml(item.reason)}</p>
            <p class="text-indigo-900 font-bold"><i class="fa-solid fa-arrow-right mr-1 text-indigo-600"></i>Hướng giải quyết: ${escapeHtml(item.remedy)}</p>
          </div>
          ${isLeader ? `
            <button type="button" onclick="toggleDutyRemediationResolved('${escapeAttr(item.id)}')" class="px-3 py-1.5 rounded-xl ${item.resolved ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} font-bold text-[11px] transition shrink-0 self-start sm:self-center">
              ${item.resolved ? 'Hoàn tác' : '✓ Xác nhận đã trực bù'}
            </button>
          ` : ''}
        </div>
      `).join("")}
    </div>
  `;
}

let currentAssigningSessionKey = "T2_CHIEU";

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

  const weekDutyMap = getActiveWeekDutyMap();
  const current = weekDutyMap[sessionKey] || { students: [] };
  const container = document.getElementById("assignStudentCheckboxList");
  if (container) {
    container.innerHTML = appState.students.map(s => {
      const isChecked = (current.students || []).includes(s.id);
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

  const weekDutyMap = getActiveWeekDutyMap();
  if (!weekDutyMap[currentAssigningSessionKey]) {
    weekDutyMap[currentAssigningSessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
  }
  weekDutyMap[currentAssigningSessionKey].students = selected;
  saveActiveWeekDutyMap(weekDutyMap);

  saveStateToLocal();
  render7DutySection();
  closeAssignDutyModal();
  await callApi("saveDutyState", {
    dutyByWeek: appState.dutyByWeek,
    dutyAssignments: weekDutyMap,
    volunteerLaborList: appState.volunteerLaborList
  }, "POST");
  alert(`Đã phân công ${selected.length} học sinh cho ${getSessionLabel(currentAssigningSessionKey)}!`);
}

async function submitDutyEvaluation(sessionKey, status) {
  if (!canManageDuty()) {
    alert("Chỉ GVCN hoặc Lớp phó Lao động mới có quyền nghiệm thu ca trực!");
    return;
  }
  const weekDutyMap = getActiveWeekDutyMap();
  if (!weekDutyMap[sessionKey]) {
    weekDutyMap[sessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
  }

  let note = "";
  if (status === "CHUA_DAT") {
    note = prompt("Nhập nội dung nhắc nhở / ca trực bù:", "Trực nhật bù 15 phút đầu giờ hôm sau");
    if (note === null) return;
  }

  weekDutyMap[sessionKey].status = status;
  weekDutyMap[sessionKey].note = note;
  saveActiveWeekDutyMap(weekDutyMap);

  saveStateToLocal();
  render7DutySection();
  await callApi("saveDutyState", {
    dutyByWeek: appState.dutyByWeek,
    dutyAssignments: weekDutyMap,
    volunteerLaborList: appState.volunteerLaborList
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
  await callApi("saveDutyState", {
    dutyByWeek: appState.dutyByWeek,
    dutyAssignments: getActiveWeekDutyMap(),
    volunteerLaborList: appState.volunteerLaborList
  }, "POST");
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

  await callApi("saveDutyState", {
    dutyByWeek: appState.dutyByWeek,
    dutyAssignments: getActiveWeekDutyMap(),
    volunteerLaborList: appState.volunteerLaborList
  }, "POST");
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

// ==================== KHO MEDIA GOOGLE DRIVE PHÂN LOẠI + HÀNG ĐỢI INDEXEDDB CHẠY NGẦM ====================
const CLASS_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1fzwD2dIQ42dXCBPYXG2HYG-wFpgV5wlz";
const MEDIA_ALBUM_CATEGORIES = [
  "Học tập & Tiết học thực tế",
  "Hoạt động Đoàn & Văn Thể Mỹ",
  "Cắm trại / Dã ngoại / Ngoại khóa",
  "Sinh nhật & Kỷ niệm tập thể 10A12",
  "Video Kỷ Niệm (AI Memories)"
];

let mediaGalleryTypeFilter = "ALL"; // ALL | IMAGE | VIDEO
let mediaGalleryCategoryFilter = "ALL";
let pendingUploadPreviewFiles = []; // { id, file, previewUrl, name, sizeText, isVideo }
let activeBackgroundUploadQueue = []; // In-memory mirror synced with IndexedDB
let isUploadQueueWorkerRunning = false;

function canContributeMedia() {
  return Boolean(appState.currentUser);
}

// ---------- IndexedDB Persistent Upload Queue (Tự động chạy khi có Wi-Fi / 4G / 5G & phục hồi khi mở lại app) ----------
function openMediaUploadQueueDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB không khả dụng"));
      return;
    }
    const req = indexedDB.open("10A12_DriveUploadQueueDB", 1);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains("uploadQueue")) {
        db.createObjectStore("uploadQueue", { keyPath: "id" });
      }
    };
    req.onsuccess = (ev) => resolve(ev.target.result);
    req.onerror = (ev) => reject(ev.target.error);
  });
}

async function idbPutUploadTask(task) {
  try {
    const db = await openMediaUploadQueueDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("uploadQueue", "readwrite");
      tx.objectStore("uploadQueue").put(task);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    return false;
  }
}

async function idbGetAllUploadTasks() {
  try {
    const db = await openMediaUploadQueueDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("uploadQueue", "readonly");
      const req = tx.objectStore("uploadQueue").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    return [];
  }
}

async function idbDeleteUploadTask(taskId) {
  try {
    const db = await openMediaUploadQueueDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("uploadQueue", "readwrite");
      tx.objectStore("uploadQueue").delete(taskId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    return false;
  }
}

function updateFloatingUploadProgressBanner() {
  let banner = document.getElementById("floatingDriveUploadProgressToast");
  const total = activeBackgroundUploadQueue.length;
  if (total === 0) {
    if (banner) banner.remove();
    return;
  }

  const doneCount = activeBackgroundUploadQueue.filter(t => t.status === "DONE").length;
  const activeItem = activeBackgroundUploadQueue.find(t => t.status === "UPLOADING") || activeBackgroundUploadQueue[0];
  const avgPct = Math.round(activeBackgroundUploadQueue.reduce((s, t) => s + (t.progress || 0), 0) / total);
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "floatingDriveUploadProgressToast";
    banner.className = "fixed bottom-20 md:bottom-6 left-4 z-50 w-80 max-w-[92vw] p-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-sky-400/40 space-y-2 text-xs";
    document.body.appendChild(banner);
  }

  banner.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <i class="fa-solid ${isOffline ? 'fa-wifi text-amber-400' : 'fa-cloud-arrow-up fa-bounce text-sky-400'}"></i>
        <b class="truncate">${isOffline ? 'Đang chờ Wi-Fi / 4G / 5G...' : `Đang tải lên Drive (${doneCount}/${total})`}</b>
      </div>
      <span class="font-mono font-black text-sky-300 shrink-0">${avgPct}%</span>
    </div>
    <p class="text-[11px] text-slate-300 truncate">${escapeHtml(activeItem ? activeItem.title : '')}</p>
    <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div class="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-200" style="width: ${avgPct}%"></div>
    </div>
    <p class="text-[10px] text-slate-400">Hàng đợi tự động chạy ngầm kể cả khi chuyển app hoặc rớt mạng tạm thời.</p>
  `;
}

async function enqueueMediaTasksToBackgroundDrive(tasksArray) {
  for (const t of tasksArray) {
    await idbPutUploadTask(t);
    activeBackgroundUploadQueue.push({
      id: t.id,
      title: t.title,
      progress: 0,
      status: "PENDING"
    });
  }
  updateFloatingUploadProgressBanner();
  processBackgroundDriveUploadQueue();
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready.then(reg => reg.sync.register("10a12-drive-upload-sync")).catch(() => {});
  }
}

async function processBackgroundDriveUploadQueue() {
  if (isUploadQueueWorkerRunning) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    updateFloatingUploadProgressBanner();
    return;
  }

  const storedTasks = await idbGetAllUploadTasks();
  if (!storedTasks || storedTasks.length === 0) {
    activeBackgroundUploadQueue = [];
    updateFloatingUploadProgressBanner();
    return;
  }

  isUploadQueueWorkerRunning = true;
  try {
    // Đồng bộ danh sách tiến độ hiển thị
    storedTasks.forEach(st => {
      if (!activeBackgroundUploadQueue.some(x => x.id === st.id)) {
        activeBackgroundUploadQueue.push({ id: st.id, title: st.title, progress: 0, status: "PENDING" });
      }
    });
    updateFloatingUploadProgressBanner();

    for (const task of storedTasks) {
      if (typeof navigator !== "undefined" && navigator.onLine === false) break;

      const uiItem = activeBackgroundUploadQueue.find(x => x.id === task.id);
      if (uiItem) {
        uiItem.status = "UPLOADING";
        uiItem.progress = 25;
      }
      updateFloatingUploadProgressBanner();

      // Đọc Blob/File sang base64 nếu chưa có sẵn
      let base64Data = task.base64Data || "";
      if (!base64Data && task.blob) {
        if (task.mediaType === "IMAGE") {
          base64Data = await compressImageDataUrl(task.blob, 1280, 0.82);
        } else {
          base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target.result);
            reader.onerror = () => reject(new Error("Lỗi đọc video"));
            reader.readAsDataURL(task.blob);
          });
        }
      }

      if (uiItem) uiItem.progress = 60;
      updateFloatingUploadProgressBanner();

      const res = await callApi("uploadClassMediaToDrive", {
        category: task.category || "Hoạt động & Kỷ niệm lớp",
        title: task.title,
        fileName: task.fileName,
        mimeType: task.mimeType,
        mediaType: task.mediaType,
        base64Data: base64Data,
        uploaderName: task.uploaderName
      }, "POST");

      if (res && res.status === "success") {
        if (uiItem) {
          uiItem.status = "DONE";
          uiItem.progress = 100;
        }
        await idbDeleteUploadTask(task.id);
        if (Array.isArray(res.classMedia)) {
          appState.classMedia = res.classMedia;
        } else if (res.item) {
          appState.classMedia.unshift(res.item);
        }
        saveStateToLocal();
        renderVtmSection();
      } else {
        if (uiItem) {
          uiItem.status = "PENDING";
          uiItem.progress = 10;
        }
      }
      updateFloatingUploadProgressBanner();
    }
  } finally {
    isUploadQueueWorkerRunning = false;
    const remaining = await idbGetAllUploadTasks();
    if (remaining.length === 0) {
      setTimeout(() => {
        activeBackgroundUploadQueue = [];
        updateFloatingUploadProgressBanner();
      }, 1500);
    }
  }
}

// Tự động tiếp tục tải lên khi có lại Wi-Fi / 4G / 5G hoặc khi quay lại ứng dụng
if (typeof window !== "undefined") {
  window.addEventListener("online", () => processBackgroundDriveUploadQueue());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      processBackgroundDriveUploadQueue();
    }
  });
  window.addEventListener("load", () => {
    setTimeout(() => processBackgroundDriveUploadQueue(), 1200);
  });
}

function setMediaGalleryTypeFilter(t) {
  mediaGalleryTypeFilter = t;
  renderVtmSection();
}

function setMediaGalleryCategoryFilter(cat) {
  mediaGalleryCategoryFilter = cat;
  renderVtmSection();
}

function renderVtmSection() {
  renderLeaderLockNoticeBanner("tab-van-the-my", "Văn thể mỹ & Ban cán sự");
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

  // Thanh công cụ Google Drive, Studio Video Kỷ Niệm & Bộ lọc phân loại Ảnh / Video / Chủ đề
  if (mediaGrid && mediaGrid.parentElement) {
    let aiBar = document.getElementById("vtmDriveMemoryActionBar");
    if (!aiBar) {
      aiBar = document.createElement("div");
      aiBar.id = "vtmDriveMemoryActionBar";
      aiBar.className = "p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200 space-y-3 text-xs mb-3";
      mediaGrid.parentElement.insertBefore(aiBar, mediaGrid);
    }

    const allMedia = Array.isArray(appState.classMedia) ? appState.classMedia : [];
    const imgCount = allMedia.filter(m => String(m.mediaType || "").toUpperCase() !== "VIDEO" && !String(m.viewUrl || m.imgData || "").includes("/preview")).length;
    const vidCount = allMedia.length - imgCount;

    const typeBtnCls = (t) => mediaGalleryTypeFilter === t
      ? "px-3 py-1.5 rounded-xl bg-slate-900 text-white font-black shadow-2xs"
      : "px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200";

    aiBar.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2 py-0.5 rounded-md bg-purple-700 text-white font-black text-[10px] uppercase"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Drive & AI Memories</span>
            <b class="text-slate-900">Kho Ảnh & Video Kỷ Niệm Lớp 10A12 (Tự động phân thư mục Drive)</b>
          </div>
          <p class="text-[11px] text-slate-600">Mọi học sinh đều có thể đăng ảnh/video; có xem trước, thanh tiến độ & tự động tải ngầm khi có Wi-Fi/4G/5G.</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap shrink-0">
          <button type="button" onclick="openUploadMediaModal()" class="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-black text-xs shadow-2xs transition flex items-center gap-1.5">
            <i class="fa-solid fa-cloud-arrow-up"></i> Đăng Ảnh / Video Lên Drive
          </button>
          <button type="button" onclick="openAiMemoryVideoCreatorModal()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5">
            <i class="fa-solid fa-film"></i> Studio Video Kỷ Niệm
          </button>
          <a href="${CLASS_DRIVE_FOLDER_URL}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5">
            <i class="fa-brands fa-google-drive text-emerald-600"></i> Mở Drive
          </a>
        </div>
      </div>

      <!-- Thanh phân tách riêng Hình ảnh / Video & Chủ đề Album -->
      <div class="pt-2.5 border-t border-purple-200/70 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <button type="button" onclick="setMediaGalleryTypeFilter('ALL')" class="${typeBtnCls('ALL')}">Tất cả (${allMedia.length})</button>
          <button type="button" onclick="setMediaGalleryTypeFilter('IMAGE')" class="${typeBtnCls('IMAGE')}">📷 Hình ảnh (${imgCount})</button>
          <button type="button" onclick="setMediaGalleryTypeFilter('VIDEO')" class="${typeBtnCls('VIDEO')}">🎬 Video kỷ niệm (${vidCount})</button>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-bold text-slate-600">Chủ đề:</span>
          <select onchange="setMediaGalleryCategoryFilter(this.value)" class="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-800 text-[11px] focus:outline-none">
            <option value="ALL" ${mediaGalleryCategoryFilter === 'ALL' ? 'selected' : ''}>Tất cả chủ đề / thư mục</option>
            ${MEDIA_ALBUM_CATEGORIES.map(c => `<option value="${escapeAttr(c)}" ${mediaGalleryCategoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
  }

  if (mediaGrid) {
    let filteredMedia = Array.isArray(appState.classMedia) ? [...appState.classMedia] : [];
    if (mediaGalleryTypeFilter !== "ALL") {
      filteredMedia = filteredMedia.filter(m => {
        const u = String(m.viewUrl || m.imgData || "");
        const isVid = String(m.mediaType || "").toUpperCase() === "VIDEO" || u.includes("/preview") || u.startsWith("data:video");
        return mediaGalleryTypeFilter === "VIDEO" ? isVid : !isVid;
      });
    }
    if (mediaGalleryCategoryFilter !== "ALL") {
      filteredMedia = filteredMedia.filter(m => String(m.category || "Hoạt động & Kỷ niệm lớp") === mediaGalleryCategoryFilter);
    }

    if (filteredMedia.length === 0) {
      mediaGrid.innerHTML = `<p class="col-span-full text-xs text-slate-400 italic py-4 text-center">Chưa có hình ảnh hoặc video nào trong mục đang lọc. Hãy bấm "Đăng Ảnh / Video Lên Drive"!</p>`;
    } else {
      mediaGrid.innerHTML = filteredMedia.map(m => {
        const mediaUrl = safeMediaSrc(m.viewUrl || m.imgData);
        const isVideo = String(m.mediaType || "").toUpperCase() === "VIDEO" || String(mediaUrl).includes("/preview") || String(mediaUrl).startsWith("data:video");
        const catLabel = m.category || (isVideo ? "Video Kỷ Niệm (AI Memories)" : "Hoạt động & Kỷ niệm lớp");
        return `
          <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs group flex flex-col justify-between">
            <div class="h-44 bg-slate-900 overflow-hidden relative flex items-center justify-center">
              ${isVideo ? (
                String(mediaUrl).includes("drive.google.com")
                  ? `<iframe src="${escapeAttr(mediaUrl)}" class="w-full h-full border-0" allow="autoplay; fullscreen"></iframe>`
                  : `<video src="${escapeAttr(mediaUrl)}" controls class="w-full h-full object-cover"></video>`
              ) : (
                mediaUrl
                  ? `<img src="${escapeAttr(mediaUrl)}" alt="${escapeAttr(m.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">`
                  : `<div class="w-full h-full flex items-center justify-center text-slate-400 text-xs">Media lớp 10A12</div>`
              )}
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase ${isVideo ? 'bg-purple-600 text-white' : 'bg-sky-700 text-white'}">
                ${isVideo ? '🎬 VIDEO' : '📷 ẢNH'}
              </span>
              ${isVtmLeader ? `
                <button onclick="deleteClassMedia('${escapeAttr(m.id)}', '${escapeAttr(m.driveFileId || '')}')" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 text-white text-[10px] flex items-center justify-center hover:bg-rose-600" title="Chỉ GVCN & VTM được xóa">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
            </div>
            <div class="p-2.5 space-y-1">
              <span class="inline-block px-2 py-0.2 rounded bg-slate-100 text-slate-600 font-bold text-[9.5px] truncate max-w-full">
                📁 ${escapeHtml(catLabel)}
              </span>
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h5 class="text-xs font-black text-slate-800 truncate">${escapeHtml(m.title)}</h5>
                  <span class="text-[9.5px] text-slate-400 block truncate">${escapeHtml(m.date || '')}${m.uploader ? ` • ${escapeHtml(m.uploader)}` : ''}</span>
                </div>
                ${m.downloadUrl ? `
                  <a href="${escapeAttr(m.downloadUrl)}" target="_blank" rel="noopener" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-sky-100 text-sky-700 font-bold text-[10px] shrink-0" title="Tải về từ Google Drive">
                    <i class="fa-solid fa-download"></i>
                  </a>
                ` : ''}
              </div>
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

// ---------- Modal Tải Ảnh/Video Lên Drive Có Xem Trước & Phân Loại Chủ Đề ----------
function ensureSmartDriveUploadModal() {
  if (document.getElementById("smartDriveUploadModal")) return;
  const html = `
    <div id="smartDriveUploadModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeUploadMediaModal()">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm sm:text-base">Đăng Ảnh & Video Lên Google Drive Lớp 10A12</h3>
              <p class="text-[11px] text-slate-500">Xem trước tệp chọn, phân loại thư mục chủ đề & tự động tải ngầm khi có Wi-Fi / 4G / 5G</p>
            </div>
          </div>
          <button onclick="closeUploadMediaModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="overflow-y-auto py-3.5 space-y-3 text-xs flex-1 pr-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">1. Chọn Chủ đề / Thư mục Drive:</label>
              <select id="smartDriveCategorySelect" class="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-sky-600">
                ${MEDIA_ALBUM_CATEGORIES.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">2. Tiêu đề / Chú thích chung:</label>
              <input type="text" id="smartDriveTitleInput" placeholder="VD: Hoạt động ngoại khóa tuần 11..."
                class="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-sky-600">
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">3. Chọn Hình ảnh hoặc Video từ máy (không giới hạn số lượng):</label>
            <input type="file" id="smartDriveFilesInput" accept="image/*,video/*" multiple onchange="handleSmartDriveFilesPreview(event)"
              class="w-full px-3 py-2 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/40 text-slate-700 font-bold cursor-pointer">
          </div>

          <!-- Khu vực Xem Trước (Preview) trước khi tải lên -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-black text-slate-700 uppercase text-[11px]">Xem trước tệp đã chọn (<span id="smartDrivePreviewCount">0</span> tệp):</span>
              <button type="button" onclick="clearSmartDrivePreviewFiles()" class="text-[11px] text-rose-600 font-bold hover:underline">Xóa tất cả</button>
            </div>
            <div id="smartDrivePreviewGrid" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 min-h-[100px]">
              <p class="col-span-full text-center text-slate-400 italic py-6">Chưa chọn ảnh hoặc video nào. Chọn tệp phía trên để xem trước!</p>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <button type="button" onclick="closeUploadMediaModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
            Đóng
          </button>
          <div class="flex items-center gap-2">
            <button type="button" onclick="startSmartBackgroundDriveUpload(true)" class="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-black text-xs transition flex items-center gap-1.5">
              <i class="fa-solid fa-film"></i> Tải Lên & Ghép Video Kỷ Niệm
            </button>
            <button type="button" onclick="startSmartBackgroundDriveUpload(false)" class="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-black text-xs shadow-md transition flex items-center gap-1.5">
              <i class="fa-solid fa-cloud-arrow-up"></i> Bắt Đầu Tải Lên Drive
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

function openUploadMediaModal() {
  if (!canContributeMedia()) {
    alert("Vui lòng đăng nhập để đăng ảnh/video kỷ niệm!");
    return;
  }
  ensureSmartDriveUploadModal();
  document.getElementById("smartDriveUploadModal").classList.remove("hidden");
}

function closeUploadMediaModal() {
  const m = document.getElementById("smartDriveUploadModal");
  if (m) m.classList.add("hidden");
}

function handleSmartDriveFilesPreview(event) {
  const files = event && event.target && event.target.files ? Array.from(event.target.files) : [];
  files.forEach((f, idx) => {
    const isVideo = String(f.type || "").startsWith("video/");
    const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
    pendingUploadPreviewFiles.push({
      id: `PREV_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      name: f.name,
      sizeText: `${sizeMb} MB`,
      isVideo
    });
  });
  if (event && event.target) event.target.value = "";
  renderSmartDrivePreviewGrid();
}

function removeSinglePreviewFile(prevId) {
  const idx = pendingUploadPreviewFiles.findIndex(x => x.id === prevId);
  if (idx !== -1) {
    URL.revokeObjectURL(pendingUploadPreviewFiles[idx].previewUrl);
    pendingUploadPreviewFiles.splice(idx, 1);
  }
  renderSmartDrivePreviewGrid();
}

function clearSmartDrivePreviewFiles() {
  pendingUploadPreviewFiles.forEach(p => URL.revokeObjectURL(p.previewUrl));
  pendingUploadPreviewFiles = [];
  renderSmartDrivePreviewGrid();
}

function renderSmartDrivePreviewGrid() {
  const grid = document.getElementById("smartDrivePreviewGrid");
  const cntEl = document.getElementById("smartDrivePreviewCount");
  if (cntEl) cntEl.innerText = String(pendingUploadPreviewFiles.length);
  if (!grid) return;

  if (pendingUploadPreviewFiles.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-6">Chưa chọn ảnh hoặc video nào. Chọn tệp phía trên để xem trước!</p>`;
    return;
  }

  grid.innerHTML = pendingUploadPreviewFiles.map(p => `
    <div class="relative rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs flex flex-col">
      <div class="h-24 bg-slate-900 relative flex items-center justify-center overflow-hidden">
        ${p.isVideo
          ? `<video src="${escapeAttr(p.previewUrl)}" muted class="w-full h-full object-cover"></video><span class="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-purple-600 text-white text-[9px] font-black">🎬 VIDEO</span>`
          : `<img src="${escapeAttr(p.previewUrl)}" class="w-full h-full object-cover"><span class="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-sky-700 text-white text-[9px] font-black">📷 ẢNH</span>`
        }
        <button type="button" onclick="removeSinglePreviewFile('${escapeAttr(p.id)}')" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white text-[10px] flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="p-1.5 text-[10px]">
        <b class="block truncate text-slate-800">${escapeHtml(p.name)}</b>
        <span class="text-slate-400 font-mono">${escapeHtml(p.sizeText)}</span>
      </div>
    </div>
  `).join("");
}

async function startSmartBackgroundDriveUpload(alsoOpenMemoryStudio = false) {
  if (pendingUploadPreviewFiles.length === 0) {
    alert("Vui lòng chọn ít nhất 01 ảnh hoặc video trước khi tải lên!");
    return;
  }

  const category = document.getElementById("smartDriveCategorySelect")?.value || "Hoạt động & Kỷ niệm lớp";
  const baseTitle = (document.getElementById("smartDriveTitleInput")?.value || "").trim() || category;
  const uploaderName = appState.currentUser ? `${appState.currentUser.fullName}${appState.currentUser.team ? ' (' + appState.currentUser.team + ')' : ''}` : "Thành viên 10A12";

  const snapshotFiles = [...pendingUploadPreviewFiles];
  const tasks = snapshotFiles.map((item, idx) => ({
    id: `TASK_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    category,
    title: snapshotFiles.length > 1 ? `${baseTitle} (${idx + 1}/${snapshotFiles.length})` : baseTitle,
    fileName: item.name,
    mimeType: item.file.type || (item.isVideo ? "video/mp4" : "image/jpeg"),
    mediaType: item.isVideo ? "VIDEO" : "IMAGE",
    blob: item.file,
    uploaderName
  }));

  closeUploadMediaModal();
  await enqueueMediaTasksToBackgroundDrive(tasks);

  if (alsoOpenMemoryStudio) {
    const studioItems = snapshotFiles.map(item => ({
      url: item.previewUrl,
      isVideo: item.isVideo,
      name: item.name
    }));
    openAiMemoryVideoCreatorModal(studioItems, baseTitle);
  } else {
    pendingUploadPreviewFiles = [];
    renderSmartDrivePreviewGrid();
  }
}

async function deleteClassMedia(id, driveFileId) {
  if (!canManageVtm()) {
    alert("Chỉ GVCN và Ban Văn Thể Mỹ mới có quyền xóa media khỏi kho chung!");
    return;
  }
  if (confirm("Xóa tệp media này khỏi Kho Media và thư mục Google Drive lớp?")) {
    appState.classMedia = appState.classMedia.filter(x => x.id !== id);
    saveStateToLocal();
    renderVtmSection();
    await callApi("deleteClassMediaFromDrive", { id, driveFileId }, "POST");
  }
}

// ==================== STUDIO DỰNG VIDEO KỶ NIỆM (ẢNH + VIDEO KHÔNG GIỚI HẠN • NHẠC CHỦ ĐỀ / TỪ MÁY • HIỆU ỨNG) ====================
const AI_MEMORY_MUSIC_THEMES = {
  "KY_YEU": {
    label: "Tuổi học trò & Kỷ yếu (Nhẹ nhàng, sâu lắng)",
    notes: [523.25, 659.25, 783.99, 1046.50, 987.77, 783.99, 659.25, 587.33, 698.46, 880.00, 783.99, 659.25],
    tempoMs: 580,
    wave: "sine",
    overlayType: "SPARKLE",
    captions: [
      "Thanh xuân rực rỡ dưới mái trường THPT số 1 Quang Trung",
      "Những nụ cười vô tư của tập thể lớp 10A12",
      "Cùng nhau học tập, cùng nhau trưởng thành",
      "Lưu giữ mãi khoảnh khắc đẹp tuổi học trò"
    ]
  },
  "SOI_DONG": {
    label: "Sôi động & Cắm trại / Thể thao (Vui tươi, nhiệt huyết)",
    notes: [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1174.66, 1046.50, 880.00, 1046.50],
    tempoMs: 340,
    wave: "triangle",
    overlayType: "CONFETTI",
    captions: [
      "Tuổi trẻ 10A12 bùng cháy hết mình!",
      "Đoàn kết là sức mạnh — Chơi hết sức, học hết mình",
      "Bứt phá giới hạn cùng tập thể K58 Quang Trung",
      "Khoảnh khắc bùng nổ năng lượng tuổi trẻ"
    ]
  },
  "TRI_AN": {
    label: "Tri ân Thầy Cô 20/11 (Ấm áp, trang trọng)",
    notes: [440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 587.33, 659.25, 783.99, 659.25],
    tempoMs: 650,
    wave: "sine",
    overlayType: "HEARTS",
    captions: [
      "Tri ân người lái đò thầm lặng dìu dắt 10A12",
      "Mỗi bài giảng là một hành trang bước vào đời",
      "Tập thể lớp 10A12 kính chúc Thầy Cô luôn mạnh khỏe",
      "Mãi khắc ghi công ơn Thầy Cô"
    ]
  },
  "MUA_HE": {
    label: "Mùa hè & Hoa phượng đỏ (Hoài niệm, cảm xúc)",
    notes: [587.33, 739.99, 880.00, 1174.66, 1108.73, 880.00, 739.99, 659.25, 783.99, 987.77],
    tempoMs: 600,
    wave: "sine",
    overlayType: "PETALS",
    captions: [
      "Mùa hoa phượng nở rực góc sân trường",
      "Gói ghém yêu thương gửi vào từng trang lưu bút",
      "Dù đi muôn phương vẫn nhớ về mái nhà 10A12",
      "Hẹn gặp lại trong những chặng đường rực rỡ phía trước"
    ]
  }
};

let aiMemoryMediaItems = []; // { id, url, isVideo, name, caption }
let aiMemoryCustomAudioUrl = "";
let aiMemoryGeneratedVideoBlob = null;
let aiMemoryGeneratedVideoUrl = "";

function ensureAiMemoryVideoModal() {
  if (document.getElementById("aiMemoryVideoModal")) return;
  const html = `
    <div id="aiMemoryVideoModal" class="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 hidden" onclick="if(event.target===this) closeAiMemoryVideoModal()">
      <div class="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[94vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <i class="fa-solid fa-film"></i>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm sm:text-base">Studio Tạo Video Kỷ Niệm (Ảnh + Video Không Giới Hạn)</h3>
              <p class="text-[11px] text-slate-500">Hỗ trợ ghép hỗn hợp Ảnh & Video clip, nhạc theo chủ đề hoặc MP3 từ máy, tự chèn chữ & hiệu ứng sinh động</p>
            </div>
          </div>
          <button onclick="closeAiMemoryVideoModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="overflow-y-auto py-3 space-y-3 text-xs flex-1 pr-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">1. Tiêu đề phim kỷ niệm (Intro):</label>
              <input type="text" id="aiMemoryTitleInput" value="Thanh Xuân Rực Rỡ • Tập Thể 10A12"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-purple-600">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">2. Chủ đề nhạc nền & hiệu ứng tự động:</label>
              <select id="aiMemoryThemeSelect" class="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-purple-600">
                ${Object.keys(AI_MEMORY_MUSIC_THEMES).map(k => `<option value="${k}">${escapeHtml(AI_MEMORY_MUSIC_THEMES[k].label)}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block font-bold text-slate-700 mb-1">3. Thêm Ảnh & Video (Không giới hạn):</label>
              <input type="file" id="aiMemoryFilesInput" accept="image/*,video/*" multiple onchange="handleAiMemoryMediaAdded(event)"
                class="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">4. Hoặc chọn nhạc MP3 từ máy:</label>
              <input type="file" id="aiMemoryCustomAudioInput" accept="audio/*" onchange="handleAiMemoryCustomAudioPick(event)"
                class="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">5. Hiệu ứng chuyển cảnh & trang trí:</label>
              <select id="aiMemoryTransitionSelect" class="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-800">
                <option value="AUTO_MIX">✨ Tự động phối hợp đa hiệu ứng</option>
                <option value="KEN_BURNS">🔍 Zoom điện ảnh + Mờ dần</option>
                <option value="SLIDE">🎞️ Trượt khung hình ngang</option>
                <option value="POLAROID">🖼️ Khung ảnh Kỷ yếu + Hoa rơi</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-between flex-wrap gap-2 bg-purple-50/60 p-2.5 rounded-2xl border border-purple-200">
            <label class="flex items-center gap-2 font-bold text-purple-950 cursor-pointer">
              <input type="checkbox" id="aiMemoryAutoCaptionCb" checked class="w-4 h-4 accent-purple-600">
              <span>Tự động chèn các dòng chữ cảm xúc & khung trang trí kỷ niệm lên từng cảnh</span>
            </label>
            <button type="button" onclick="aiMemoryMediaItems=[]; renderAiMemoryPreviewThumbs();" class="text-[11px] text-rose-600 font-bold hover:underline">Xóa danh sách chọn</button>
          </div>

          <div id="aiMemoryPreviewThumbs" class="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 min-h-[82px] max-h-44 overflow-y-auto">
            <p class="col-span-full text-center text-slate-400 italic py-4">Chọn không giới hạn Hình ảnh và Video clip từ máy để dựng phim...</p>
          </div>

          <div id="aiMemoryProgressBox" class="hidden p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
            <div class="flex items-center justify-between font-black text-purple-900">
              <span id="aiMemoryProgressLabel"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Đang kết xuất khung hình, hiệu ứng & âm thanh...</span>
              <span id="aiMemoryProgressPct">0%</span>
            </div>
            <div class="w-full h-2.5 bg-purple-200 rounded-full overflow-hidden">
              <div id="aiMemoryProgressBar" class="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-200" style="width: 0%"></div>
            </div>
          </div>

          <div id="aiMemoryResultBox" class="hidden space-y-2.5">
            <div class="rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 shadow-md">
              <video id="aiMemoryResultVideoPlayer" controls playsinline class="w-full max-h-64 mx-auto"></video>
            </div>
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <button type="button" onclick="downloadGeneratedAiMemoryVideo()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5">
                <i class="fa-solid fa-download"></i> Tải Video Về Máy
              </button>
              <button type="button" id="btnUploadAiVideoDrive" onclick="uploadGeneratedAiMemoryVideoToDrive()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-sm flex items-center gap-1.5">
                <i class="fa-brands fa-google-drive"></i> Lưu Lên Google Drive Lớp 10A12
              </button>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button type="button" onclick="closeAiMemoryVideoModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
            Đóng
          </button>
          <button type="button" id="btnRunAiMemoryGenerator" onclick="generateAutoMemoryVideoFromPhotos()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-md flex items-center gap-1.5">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Xuất Video Kỷ Niệm Sinh Động
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

function openAiMemoryVideoCreatorModal(preloadedItems = null, presetTitle = "") {
  ensureAiMemoryVideoModal();
  aiMemoryGeneratedVideoBlob = null;
  if (aiMemoryGeneratedVideoUrl) {
    URL.revokeObjectURL(aiMemoryGeneratedVideoUrl);
    aiMemoryGeneratedVideoUrl = "";
  }
  document.getElementById("aiMemoryResultBox").classList.add("hidden");
  document.getElementById("aiMemoryProgressBox").classList.add("hidden");
  if (presetTitle) {
    document.getElementById("aiMemoryTitleInput").value = presetTitle;
  }
  if (Array.isArray(preloadedItems) && preloadedItems.length > 0) {
    aiMemoryMediaItems = preloadedItems.map((it, idx) => typeof it === "string"
      ? { id: `MEM_IN_${idx}`, url: it, isVideo: false, name: `Ảnh ${idx + 1}` }
      : { id: `MEM_IN_${idx}`, url: it.url, isVideo: Boolean(it.isVideo), name: it.name || `Cảnh ${idx + 1}` }
    );
  }
  renderAiMemoryPreviewThumbs();
  document.getElementById("aiMemoryVideoModal").classList.remove("hidden");
}

function closeAiMemoryVideoModal() {
  const m = document.getElementById("aiMemoryVideoModal");
  if (m) m.classList.add("hidden");
}

function handleAiMemoryCustomAudioPick(event) {
  const f = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!f) return;
  if (aiMemoryCustomAudioUrl) URL.revokeObjectURL(aiMemoryCustomAudioUrl);
  aiMemoryCustomAudioUrl = URL.createObjectURL(f);
}

function handleAiMemoryMediaAdded(event) {
  const files = event && event.target && event.target.files ? Array.from(event.target.files) : [];
  if (files.length === 0) return;
  files.forEach((f, idx) => {
    const isVid = String(f.type || "").startsWith("video/");
    aiMemoryMediaItems.push({
      id: `CLIP_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      url: URL.createObjectURL(f),
      isVideo: isVid,
      name: f.name
    });
  });
  if (event && event.target) event.target.value = "";
  renderAiMemoryPreviewThumbs();
}

function removeAiMemoryClipItem(id) {
  const idx = aiMemoryMediaItems.findIndex(x => x.id === id);
  if (idx !== -1) {
    aiMemoryMediaItems.splice(idx, 1);
  }
  renderAiMemoryPreviewThumbs();
}

function renderAiMemoryPreviewThumbs() {
  const box = document.getElementById("aiMemoryPreviewThumbs");
  if (!box) return;
  if (aiMemoryMediaItems.length === 0) {
    box.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-4">Chọn không giới hạn Hình ảnh và Video clip từ máy để dựng phim...</p>`;
    return;
  }
  box.innerHTML = aiMemoryMediaItems.map((item, idx) => `
    <div class="relative rounded-xl overflow-hidden border border-slate-300 h-16 bg-slate-900">
      ${item.isVideo
        ? `<video src="${escapeAttr(item.url)}" muted class="w-full h-full object-cover"></video>`
        : `<img src="${escapeAttr(item.url)}" class="w-full h-full object-cover">`
      }
      <button type="button" onclick="removeAiMemoryClipItem('${escapeAttr(item.id)}')" class="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-950/80 text-white text-[9px] flex items-center justify-center hover:bg-rose-600">×</button>
      <span class="absolute bottom-0.5 left-1 px-1 rounded bg-slate-900/80 text-white text-[8.5px] font-bold">${item.isVideo ? '🎬' : '📷'} #${idx + 1}</span>
    </div>
  `).join("");
}

function loadHtmlImageAsync(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không tải được ảnh"));
    img.src = src;
  });
}

function loadHtmlVideoAsync(src) {
  return new Promise((resolve, reject) => {
    const vid = document.createElement("video");
    vid.crossOrigin = "anonymous";
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = "auto";
    vid.onloadeddata = () => resolve(vid);
    vid.onerror = () => reject(new Error("Không nạp được video clip"));
    vid.src = src;
  });
}

function drawDecorativeParticlesOnCanvas(ctx, w, h, frameIdx, overlayType) {
  const count = 18;
  for (let i = 0; i < count; i++) {
    const seed = i * 97.3;
    const x = ((seed * 13 + frameIdx * (1.2 + (i % 3) * 0.5)) % (w + 40)) - 20;
    const y = ((seed * 7 + frameIdx * (1.8 + (i % 4) * 0.6)) % (h + 40)) - 20;
    ctx.save();
    ctx.globalAlpha = 0.65;
    if (overlayType === "PETALS") {
      ctx.fillStyle = i % 2 === 0 ? "#fb7185" : "#f43f5e";
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 4, (frameIdx * 0.05 + i), 0, Math.PI * 2);
      ctx.fill();
    } else if (overlayType === "CONFETTI") {
      const colors = ["#fbbf24", "#38bdf8", "#a855f7", "#34d399", "#fb7185"];
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x, y, 8, 5);
    } else if (overlayType === "HEARTS") {
      ctx.fillStyle = "#f43f5e";
      ctx.font = "16px sans-serif";
      ctx.fillText("♥", x, y);
    } else {
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

async function generateAutoMemoryVideoFromPhotos() {
  if (aiMemoryMediaItems.length < 1) {
    alert("Vui lòng chọn ít nhất 01 hình ảnh hoặc video clip để tạo Video Kỷ Niệm!");
    return;
  }
  if (typeof MediaRecorder === "undefined") {
    alert("Trình duyệt chưa hỗ trợ xuất video trực tiếp. Vui lòng dùng Chrome hoặc Edge!");
    return;
  }

  const title = (document.getElementById("aiMemoryTitleInput").value || "Kỷ Niệm Lớp 10A12").trim();
  const themeKey = document.getElementById("aiMemoryThemeSelect")?.value || "KY_YEU";
  const themeMeta = AI_MEMORY_MUSIC_THEMES[themeKey] || AI_MEMORY_MUSIC_THEMES.KY_YEU;
  const transitionMode = document.getElementById("aiMemoryTransitionSelect")?.value || "AUTO_MIX";
  const enableAutoCaption = Boolean(document.getElementById("aiMemoryAutoCaptionCb")?.checked);

  const progBox = document.getElementById("aiMemoryProgressBox");
  const progBar = document.getElementById("aiMemoryProgressBar");
  const progPct = document.getElementById("aiMemoryProgressPct");
  const runBtn = document.getElementById("btnRunAiMemoryGenerator");

  progBox.classList.remove("hidden");
  document.getElementById("aiMemoryResultBox").classList.add("hidden");
  runBtn.disabled = true;

  let audioCtx = null;
  let musicTimer = null;
  let customAudioEl = null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");

    // Thiết lập âm thanh (nhạc MP3 từ máy hoặc hòa âm tự động theo chủ đề)
    let audioDest = null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        audioDest = audioCtx.createMediaStreamDestination();

        if (aiMemoryCustomAudioUrl) {
          customAudioEl = new Audio(aiMemoryCustomAudioUrl);
          customAudioEl.crossOrigin = "anonymous";
          customAudioEl.loop = true;
          const srcNode = audioCtx.createMediaElementSource(customAudioEl);
          srcNode.connect(audioDest);
          await customAudioEl.play().catch(() => {});
        } else {
          const melody = themeMeta.notes;
          let step = 0;
          const playNote = () => {
            if (!audioCtx || audioCtx.state === "closed") return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = themeMeta.wave || "sine";
            osc.frequency.value = melody[step % melody.length];
            gain.gain.setValueAtTime(0.065, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (themeMeta.tempoMs / 1000) * 0.92);
            osc.connect(gain);
            gain.connect(audioDest);
            osc.start();
            osc.stop(audioCtx.currentTime + (themeMeta.tempoMs / 1000) * 0.95);
            step++;
          };
          playNote();
          musicTimer = setInterval(playNote, themeMeta.tempoMs);
        }
      }
    } catch (audioErr) {}

    const canvasStream = canvas.captureStream(24);
    if (audioDest && audioDest.stream) {
      audioDest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
    }

    const mimeCandidate = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : (MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "");
    const recorder = mimeCandidate ? new MediaRecorder(canvasStream, { mimeType: mimeCandidate }) : new MediaRecorder(canvasStream);
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    const donePromise = new Promise(resolve => { recorder.onstop = () => resolve(); });
    recorder.start();

    const fps = 24;
    const introFrames = 36;
    const outroFrames = 36;
    const framesPerImage = 54; // 2.25s mỗi ảnh
    const totalClips = aiMemoryMediaItems.length;

    // 1. Cảnh mở đầu (Intro)
    for (let f = 0; f < introFrames; f++) {
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#311042");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawDecorativeParticlesOnCanvas(ctx, canvas.width, canvas.height, f, themeMeta.overlayType);

      ctx.save();
      ctx.globalAlpha = Math.min(1, f / 14);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 19px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TRƯỜNG THPT SỐ 1 QUANG TRUNG • LỚP 10A12 (K58)", canvas.width / 2, 215);

      ctx.fillStyle = "#ffffff";
      ctx.font = "900 36px sans-serif";
      ctx.fillText(title.toUpperCase(), canvas.width / 2, 272);

      ctx.fillStyle = "#93c5fd";
      ctx.font = "bold 17px sans-serif";
      ctx.fillText(`Album Kỷ Niệm • ${formatDateVN()}`, canvas.width / 2, 318);
      ctx.restore();

      if (progBar) progBar.style.width = `${Math.round((f / introFrames) * 8)}%`;
      await new Promise(r => setTimeout(r, Math.round(1000 / fps)));
    }

    // 2. Xử lý tuần tự từng Ảnh / Video (Lazy Streaming để không giới hạn số lượng & không tràn RAM)
    for (let idx = 0; idx < totalClips; idx++) {
      const item = aiMemoryMediaItems[idx];
      const captionText = themeMeta.captions[idx % themeMeta.captions.length];

      if (item.isVideo) {
        let vidEl = null;
        try {
          vidEl = await loadHtmlVideoAsync(item.url);
          const clipDurationSec = Math.min(4.5, Math.max(2.0, vidEl.duration || 3.0));
          const clipFrames = Math.round(clipDurationSec * fps);
          vidEl.currentTime = 0;
          await vidEl.play().catch(() => {});

          for (let lf = 0; lf < clipFrames; lf++) {
            ctx.fillStyle = "#090d16";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const vRatio = (vidEl.videoWidth || 16) / (vidEl.videoHeight || 9);
            const cRatio = canvas.width / canvas.height;
            let dw, dh;
            if (vRatio > cRatio) {
              dw = canvas.width;
              dh = dw / vRatio;
            } else {
              dh = canvas.height;
              dw = dh * vRatio;
            }
            ctx.drawImage(vidEl, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
            drawDecorativeParticlesOnCanvas(ctx, canvas.width, canvas.height, lf + idx * 30, themeMeta.overlayType);

            if (enableAutoCaption) {
              ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
              ctx.fillRect(0, canvas.height - 56, canvas.width, 56);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 18px sans-serif";
              ctx.textAlign = "left";
              ctx.fillText(`🎬 ${captionText}`, 24, canvas.height - 22);
              ctx.textAlign = "right";
              ctx.fillStyle = "#fde68a";
              ctx.fillText(`10A12 • ${idx + 1}/${totalClips}`, canvas.width - 24, canvas.height - 22);
            }

            await new Promise(r => setTimeout(r, Math.round(1000 / fps)));
          }
          vidEl.pause();
        } catch (vErr) {}
      } else {
        let imgEl = null;
        try {
          imgEl = await loadHtmlImageAsync(item.url);
        } catch (iErr) {
          continue;
        }

        for (let lf = 0; lf < framesPerImage; lf++) {
          const p = lf / framesPerImage;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Vẽ nền mờ nghệ thuật phía sau cho ảnh dọc
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.drawImage(imgEl, -40, -40, canvas.width + 80, canvas.height + 80);
          ctx.restore();

          // Hiệu ứng chuyển động đa dạng
          const activeEffect = transitionMode === "AUTO_MIX"
            ? ["KEN_BURNS", "SLIDE", "POLAROID"][idx % 3]
            : transitionMode;

          const scale = activeEffect === "KEN_BURNS" ? (1.0 + p * 0.09) : 1.02;
          const slideOffsetX = activeEffect === "SLIDE" ? (1 - Math.min(1, p * 4)) * 120 : 0;
          const imgRatio = imgEl.width / imgEl.height;
          const cRatio = canvas.width / canvas.height;
          let dw, dh;
          if (imgRatio > cRatio) {
            dh = canvas.height * scale;
            dw = dh * imgRatio;
          } else {
            dw = canvas.width * scale;
            dh = dw / imgRatio;
          }

          ctx.save();
          ctx.globalAlpha = Math.min(1, lf / 10);
          if (activeEffect === "POLAROID") {
            const boxW = Math.min(canvas.width - 140, dw * 0.82);
            const boxH = Math.min(canvas.height - 110, dh * 0.82);
            const bx = (canvas.width - boxW) / 2;
            const by = (canvas.height - boxH) / 2 - 10;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx - 12, by - 12, boxW + 24, boxH + 44);
            ctx.drawImage(imgEl, bx, by, boxW, boxH);
          } else {
            ctx.drawImage(imgEl, (canvas.width - dw) / 2 + slideOffsetX, (canvas.height - dh) / 2, dw, dh);
          }
          ctx.restore();

          drawDecorativeParticlesOnCanvas(ctx, canvas.width, canvas.height, lf + idx * 40, themeMeta.overlayType);

          if (enableAutoCaption) {
            ctx.fillStyle = "rgba(15, 23, 42, 0.68)";
            ctx.fillRect(0, canvas.height - 56, canvas.width, 56);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`✨ ${captionText}`, 24, canvas.height - 22);
            ctx.textAlign = "right";
            ctx.fillStyle = "#fde68a";
            ctx.fillText(`10A12 • ${idx + 1}/${totalClips}`, canvas.width - 24, canvas.height - 22);
          }

          await new Promise(r => setTimeout(r, Math.round(1000 / fps)));
        }
      }

      const overallPct = Math.min(92, 8 + Math.round(((idx + 1) / totalClips) * 84));
      if (progBar) progBar.style.width = `${overallPct}%`;
      if (progPct) progPct.innerText = `${overallPct}%`;
    }

    // 3. Cảnh kết thúc (Outro)
    for (let f = 0; f < outroFrames; f++) {
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, "#1e1b4b");
      bgGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawDecorativeParticlesOnCanvas(ctx, canvas.width, canvas.height, f + 100, themeMeta.overlayType);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "900 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TẬP THỂ LỚP 10A12 • NIÊN KHÓA 2026 - 2027", canvas.width / 2, 245);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("GVCN: ThS. Trần Dương Quốc Mẫn • Trường THPT số 1 Quang Trung", canvas.width / 2, 295);

      const finalPct = 92 + Math.round(((f + 1) / outroFrames) * 8);
      if (progBar) progBar.style.width = `${finalPct}%`;
      if (progPct) progPct.innerText = `${finalPct}%`;
      await new Promise(r => setTimeout(r, Math.round(1000 / fps)));
    }

    recorder.stop();
    await donePromise;
    if (musicTimer) clearInterval(musicTimer);
    if (customAudioEl) customAudioEl.pause();
    if (audioCtx) audioCtx.close().catch(() => {});

    aiMemoryGeneratedVideoBlob = new Blob(chunks, { type: "video/webm" });
    aiMemoryGeneratedVideoUrl = URL.createObjectURL(aiMemoryGeneratedVideoBlob);

    const player = document.getElementById("aiMemoryResultVideoPlayer");
    if (player) player.src = aiMemoryGeneratedVideoUrl;
    progBox.classList.add("hidden");
    document.getElementById("aiMemoryResultBox").classList.remove("hidden");
  } catch (err) {
    progBox.classList.add("hidden");
    alert("Lỗi khi tạo Video Kỷ Niệm: " + err.message);
  } finally {
    runBtn.disabled = false;
  }
}

function downloadGeneratedAiMemoryVideo() {
  if (!aiMemoryGeneratedVideoUrl) return;
  const title = (document.getElementById("aiMemoryTitleInput").value || "Ky_Niem_10A12").trim().replace(/\s+/g, "_");
  const a = document.createElement("a");
  a.href = aiMemoryGeneratedVideoUrl;
  a.download = `${title}.webm`;
  a.click();
}

async function uploadGeneratedAiMemoryVideoToDrive() {
  if (!aiMemoryGeneratedVideoBlob) return;
  const title = (document.getElementById("aiMemoryTitleInput").value || "Video Kỷ Niệm 10A12").trim();
  const uploaderName = appState.currentUser ? appState.currentUser.fullName : "Thành viên 10A12";

  closeAiMemoryVideoModal();
  await enqueueMediaTasksToBackgroundDrive([{
    id: `VID_TASK_${Date.now()}`,
    category: "Video Kỷ Niệm (AI Memories)",
    title,
    fileName: `${title.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9 -]/g, "_")}_${Date.now()}.webm`,
    mimeType: "video/webm",
    mediaType: "VIDEO",
    blob: aiMemoryGeneratedVideoBlob,
    uploaderName
  }]);
}

function submitUploadMediaItem() { openUploadMediaModal(); }
