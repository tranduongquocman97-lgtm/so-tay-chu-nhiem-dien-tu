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

// ==================== PHÂN HỆ TRỰC NHẬT 7 CA & ĐÁNH GIÁ CHI TIẾT TỪNG HỌC SINH ====================
const DUTY_REMEDY_PRESETS = [
  "Trực nhật bù 15 phút đầu giờ buổi học kế tiếp",
  "Tổng vệ sinh lớp học & hành lang cuối tuần",
  "Nhắc nhở, rút kinh nghiệm trong tiết Sinh hoạt lớp",
  "Trực bổ sung thêm 01 ca cùng tổ khác",
  "Báo cáo GVCN phối hợp gia đình nhắc nhở"
];

function ensureDutyEvaluationState() {
  if (!appState.dutyAssignments || typeof appState.dutyAssignments !== "object") {
    appState.dutyAssignments = {};
  }
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

function render7DutySection() {
  renderLeaderLockNoticeBanner("tab-lao-dong", "Lao động & Ban cán sự");
  ensureDutyEvaluationState();
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

  const isLaborLeader = canManageDuty();

  container.innerHTML = sessions.map(sess => {
    const data = appState.dutyAssignments[sess.key] || { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
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

// ==================== MODAL CHẤM CHI TIẾT TỪNG HỌC SINH TRỰC NHẬT & HƯỚNG GIẢI QUYẾT ====================
let currentEvaluatingDutySessionKey = "T2_SANG";

function ensureStudentDutyEvalModal() {
  if (document.getElementById("studentDutyEvalModal")) return;
  const html = `
    <div id="studentDutyEvalModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeStudentDutyEvalModal()">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 class="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <i class="fa-solid fa-clipboard-check text-indigo-600"></i>
              Đánh Giá Trực Nhật Từng Học Sinh — <span id="dutyEvalModalSessionLabel" class="text-indigo-700">Sáng Thứ 2</span>
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

  const data = appState.dutyAssignments[sessionKey] || { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
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
  const data = appState.dutyAssignments[sessionKey];
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
  if (!appState.dutyAssignments[sessionKey]) {
    appState.dutyAssignments[sessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
  }
  const data = appState.dutyAssignments[sessionKey];
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

  if (anyPoor) {
    data.status = "CHUA_DAT";
  } else if (allGood) {
    data.status = "DAT";
  }

  localStorage.setItem("10A12_DUTY_REMEDIATION", JSON.stringify(appState.dutyRemediationLogs));
  saveStateToLocal();
  render7DutySection();
  closeStudentDutyEvalModal();

  await callApi("saveDutyState", {
    dutyAssignments: appState.dutyAssignments,
    volunteerLaborList: appState.volunteerLaborList
  }, "POST");

  alert(`Đã lưu kết quả đánh giá trực nhật từng học sinh cho ca ${sessLabel}!`);
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
              <span class="text-slate-500 font-bold">(${escapeHtml(item.team)} • Ca: ${escapeHtml(item.sessionLabel)})</span>
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

let currentAssigningSessionKey = "T2_SANG";

function canManageDuty() {
  if (appState.roleLevel === "GVCN") return true;
  if (!appState.allowStudentLeaderEdit) return false;
  const r = String((appState.currentUser && appState.currentUser.role) || "").toLowerCase();
  return (appState.roleLevel === "LABOR") || r.includes("lớp trưởng") || r.includes("bí thư");
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
    appState.dutyAssignments[currentAssigningSessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
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
    appState.dutyAssignments[sessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "", studentEvaluations: {} };
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

const CLASS_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1fzwD2dIQ42dXCBPYXG2HYG-wFpgV5wlz";

function canManageVtm() {
  if (appState.roleLevel === "GVCN") return true;
  if (!appState.allowStudentLeaderEdit) return false;
  const r = String((appState.currentUser && appState.currentUser.role) || "").toLowerCase();
  return (appState.roleLevel === "VTM") || r.includes("lớp trưởng") || r.includes("bí thư");
}

function canContributeMedia() {
  return Boolean(appState.currentUser);
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

  // Hiển thị thanh công cụ Google Drive & Tạo Video Kỷ Niệm tự động ngay trên Kho Media
  if (mediaGrid && mediaGrid.parentElement) {
    let aiBar = document.getElementById("vtmDriveMemoryActionBar");
    if (!aiBar) {
      aiBar = document.createElement("div");
      aiBar.id = "vtmDriveMemoryActionBar";
      aiBar.className = "p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs mb-3";
      mediaGrid.parentElement.insertBefore(aiBar, mediaGrid);
    }

    aiBar.innerHTML = `
      <div class="space-y-0.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded-md bg-purple-700 text-white font-black text-[10px] uppercase"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Google Photos Memories</span>
          <b class="text-slate-900">Kho Ảnh & Video Kỷ Niệm Lớp 10A12 (Lưu trên Google Drive)</b>
        </div>
        <p class="text-[11px] text-slate-600">Học sinh & Cán sự đăng ảnh lên thư mục Drive chung; hệ thống tự động ghép thành Video Kỷ Niệm có nhạc nền!</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap shrink-0">
        <button type="button" onclick="openUploadMediaModal()" class="px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-black text-xs shadow-2xs transition flex items-center gap-1.5">
          <i class="fa-solid fa-cloud-arrow-up"></i> Đăng Ảnh Lên Drive
        </button>
        <button type="button" onclick="openAiMemoryVideoCreatorModal()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5">
          <i class="fa-solid fa-film"></i> Tạo Video Kỷ Niệm Tự Động
        </button>
        <a href="${CLASS_DRIVE_FOLDER_URL}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5">
          <i class="fa-brands fa-google-drive text-emerald-600"></i> Mở Thư Mục Drive
        </a>
      </div>
    `;
  }

  if (mediaGrid) {
    if (appState.classMedia.length === 0) {
      mediaGrid.innerHTML = `<p class="col-span-full text-xs text-slate-400 italic py-4 text-center">Chưa có hình ảnh/video kỷ niệm. Hãy đăng tải khoảnh khắc đẹp của lớp lên Google Drive!</p>`;
    } else {
      mediaGrid.innerHTML = appState.classMedia.map(m => {
        const mediaUrl = safeMediaSrc(m.viewUrl || m.imgData);
        const isVideo = String(m.mediaType || "").toUpperCase() === "VIDEO" || String(mediaUrl).includes("/preview") || String(mediaUrl).startsWith("data:video");
        return `
          <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs group flex flex-col justify-between">
            <div class="h-40 bg-slate-900 overflow-hidden relative flex items-center justify-center">
              ${isVideo ? (
                String(mediaUrl).includes("drive.google.com")
                  ? `<iframe src="${escapeAttr(mediaUrl)}" class="w-full h-full border-0" allow="autoplay; fullscreen"></iframe>`
                  : `<video src="${escapeAttr(mediaUrl)}" controls class="w-full h-full object-cover"></video>`
              ) : (
                mediaUrl
                  ? `<img src="${escapeAttr(mediaUrl)}" alt="${escapeAttr(m.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">`
                  : `<div class="w-full h-full flex items-center justify-center text-slate-400 text-xs">Media lớp 10A12</div>`
              )}
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase ${isVideo ? 'bg-purple-600 text-white' : 'bg-slate-900/75 text-white'}">
                ${isVideo ? '🎬 Video Kỷ Niệm' : '📷 Ảnh Drive'}
              </span>
              ${isVtmLeader ? `
                <button onclick="deleteClassMedia('${escapeAttr(m.id)}', '${escapeAttr(m.driveFileId || '')}')" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 text-white text-[10px] flex items-center justify-center hover:bg-rose-600">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              ` : ''}
            </div>
            <div class="p-2.5 space-y-1 flex items-center justify-between gap-2">
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
  if (!canContributeMedia()) {
    alert("Vui lòng đăng nhập để đăng ảnh kỷ niệm!");
    return;
  }
  const modal = document.getElementById("uploadMediaModal");
  const fileInput = document.getElementById("mediaFileInput");
  if (fileInput) {
    fileInput.setAttribute("multiple", "multiple");
    fileInput.setAttribute("accept", "image/*,video/*");
  }
  if (modal) modal.classList.remove("hidden");
}

function closeUploadMediaModal() {
  const modal = document.getElementById("uploadMediaModal");
  if (modal) modal.classList.add("hidden");
}

async function submitUploadMediaItem() {
  if (!canContributeMedia()) {
    alert("Vui lòng đăng nhập để tải ảnh lên Kho Media!");
    return;
  }
  const titleInput = document.getElementById("mediaTitleInput");
  const baseTitle = (titleInput ? titleInput.value.trim() : "") || "Khoảnh khắc 10A12";
  const fileInput = document.getElementById("mediaFileInput");

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Vui lòng chọn ít nhất 01 tệp ảnh!");
    return;
  }

  const files = Array.from(fileInput.files);
  const uploaderName = appState.currentUser ? appState.currentUser.fullName : "Thành viên 10A12";
  const uploadedDataUrls = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const itemTitle = files.length > 1 ? `${baseTitle} (${i + 1}/${files.length})` : baseTitle;
      const isVid = String(f.type || "").startsWith("video/");
      let dataUrl = "";
      if (isVid) {
        dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = ev => res(ev.target.result);
          r.onerror = () => rej(new Error("Lỗi đọc video"));
          r.readAsDataURL(f);
        });
      } else {
        dataUrl = await compressImageDataUrl(f, 1280, 0.8);
        uploadedDataUrls.push(dataUrl);
      }

      const cloudRes = await callApi("uploadClassMediaToDrive", {
        title: itemTitle,
        fileName: f.name,
        mimeType: f.type || (isVid ? "video/mp4" : "image/jpeg"),
        mediaType: isVid ? "VIDEO" : "IMAGE",
        base64Data: dataUrl,
        uploaderName
      }, "POST");

      if (cloudRes && cloudRes.status === "success" && cloudRes.item) {
        if (Array.isArray(cloudRes.classMedia)) {
          appState.classMedia = cloudRes.classMedia;
        } else {
          appState.classMedia.unshift(cloudRes.item);
        }
      } else {
        appState.classMedia.unshift({
          id: `MED_${Date.now()}_${i}`,
          title: itemTitle,
          mediaType: isVid ? "VIDEO" : "IMAGE",
          imgData: dataUrl,
          date: formatDateVN(),
          uploader: uploaderName
        });
      }
    }

    saveStateToLocal();
    renderVtmSection();
    closeUploadMediaModal();
    if (titleInput) titleInput.value = "";
    fileInput.value = "";

    if (uploadedDataUrls.length >= 2) {
      if (confirm(`Đã lưu ${files.length} ảnh lên thư mục Google Drive lớp 10A12! Bạn có muốn hệ thống TỰ ĐỘNG GHÉP ${uploadedDataUrls.length} ảnh này thành Video Kỷ Niệm có nhạc nền ngay không?`)) {
        openAiMemoryVideoCreatorModal(uploadedDataUrls, baseTitle);
        return;
      }
    } else {
      alert(`Đã lưu thành công ${files.length} tệp lên thư mục Google Drive của lớp 10A12!`);
    }
  } catch (err) {
    alert("Không thể tải media lên Google Drive: " + err.message);
  }
}

async function deleteClassMedia(id, driveFileId) {
  if (!canManageVtm()) {
    alert("Không có quyền xóa ảnh Kho Media!");
    return;
  }
  if (confirm("Xóa tệp media này khỏi Kho Media và thư mục Google Drive lớp?")) {
    appState.classMedia = appState.classMedia.filter(x => x.id !== id);
    saveStateToLocal();
    renderVtmSection();
    await callApi("deleteClassMediaFromDrive", { id, driveFileId }, "POST");
  }
}

// ==================== BỘ MÁY TỰ ĐỘNG TẠO VIDEO KỶ NIỆM GIỐNG GOOGLE PHOTOS ====================
let aiMemorySelectedImages = []; // Array of dataURLs / image URLs
let aiMemoryGeneratedVideoBlob = null;
let aiMemoryGeneratedVideoUrl = "";

function ensureAiMemoryVideoModal() {
  if (document.getElementById("aiMemoryVideoModal")) return;
  const html = `
    <div id="aiMemoryVideoModal" class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden" onclick="if(event.target===this) closeAiMemoryVideoModal()">
      <div class="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[93vh]">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <i class="fa-solid fa-film"></i>
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-sm sm:text-base">Tự Động Tạo Video Kỷ Niệm (AI Memories)</h3>
              <p class="text-[11px] text-slate-500">Tự động ghép ảnh + hiệu ứng chuyển cảnh + nhạc nền và lưu thẳng lên Google Drive lớp</p>
            </div>
          </div>
          <button onclick="closeAiMemoryVideoModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="overflow-y-auto py-3.5 space-y-3.5 text-xs flex-1 pr-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">1. Tiêu đề Video Kỷ Niệm:</label>
              <input type="text" id="aiMemoryTitleInput" value="Kỷ Niệm Đẹp Lớp 10A12 • K58-QT"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-purple-600">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">2. Chọn nhiều ảnh từ máy để ghép:</label>
              <input type="file" id="aiMemoryFilesInput" accept="image/*" multiple onchange="handleAiMemoryPhotosSelected(event)"
                class="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-medium">
            </div>
          </div>

          <div id="aiMemoryPreviewThumbs" class="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 min-h-[76px]">
            <p class="col-span-full text-center text-slate-400 italic py-4">Chọn từ 2 đến 15 bức ảnh để bắt đầu tạo video tự động...</p>
          </div>

          <div id="aiMemoryProgressBox" class="hidden p-3.5 rounded-2xl bg-purple-50 border border-purple-200 space-y-2">
            <div class="flex items-center justify-between font-black text-purple-900">
              <span id="aiMemoryProgressLabel"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Đang dựng khung hình & hòa âm nhạc nền...</span>
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
            <i class="fa-solid fa-wand-magic-sparkles"></i> Tự Động Ghép Video Kỷ Niệm
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

function openAiMemoryVideoCreatorModal(preloadedUrls = null, presetTitle = "") {
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
  if (Array.isArray(preloadedUrls) && preloadedUrls.length > 0) {
    aiMemorySelectedImages = [...preloadedUrls];
  } else {
    // Lấy sẵn các ảnh dataURL hiện có trong album lớp nếu chưa chọn mới
    const existingImgs = (appState.classMedia || [])
      .filter(m => String(m.imgData || "").startsWith("data:image"))
      .slice(0, 8)
      .map(m => m.imgData);
    aiMemorySelectedImages = existingImgs;
  }
  renderAiMemoryPreviewThumbs();
  document.getElementById("aiMemoryVideoModal").classList.remove("hidden");
}

function closeAiMemoryVideoModal() {
  const m = document.getElementById("aiMemoryVideoModal");
  if (m) m.classList.add("hidden");
}

async function handleAiMemoryPhotosSelected(event) {
  const files = event && event.target && event.target.files ? Array.from(event.target.files) : [];
  if (files.length === 0) return;
  aiMemorySelectedImages = [];
  for (const f of files.slice(0, 15)) {
    const compressed = await compressImageDataUrl(f, 960, 0.82);
    aiMemorySelectedImages.push(compressed);
  }
  renderAiMemoryPreviewThumbs();
}

function renderAiMemoryPreviewThumbs() {
  const box = document.getElementById("aiMemoryPreviewThumbs");
  if (!box) return;
  if (aiMemorySelectedImages.length === 0) {
    box.innerHTML = `<p class="col-span-full text-center text-slate-400 italic py-4">Chọn từ 2 đến 15 bức ảnh để bắt đầu tạo video tự động...</p>`;
    return;
  }
  box.innerHTML = aiMemorySelectedImages.map((src, idx) => `
    <div class="relative rounded-xl overflow-hidden border border-slate-300 h-16 bg-slate-200">
      <img src="${escapeAttr(src)}" class="w-full h-full object-cover">
      <span class="absolute bottom-0.5 right-1 px-1 rounded bg-slate-900/75 text-white text-[9px] font-bold">#${idx + 1}</span>
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

async function generateAutoMemoryVideoFromPhotos() {
  if (aiMemorySelectedImages.length < 1) {
    alert("Vui lòng chọn ít nhất 01 bức ảnh (tốt nhất từ 2 - 12 ảnh) để tạo Video Kỷ Niệm!");
    return;
  }
  if (typeof MediaRecorder === "undefined") {
    alert("Trình duyệt của bạn chưa hỗ trợ xuất video trực tiếp. Vui lòng dùng Chrome hoặc Edge phiên bản mới!");
    return;
  }

  const title = (document.getElementById("aiMemoryTitleInput").value || "Kỷ Niệm Lớp 10A12").trim();
  const progBox = document.getElementById("aiMemoryProgressBox");
  const progBar = document.getElementById("aiMemoryProgressBar");
  const progPct = document.getElementById("aiMemoryProgressPct");
  const progLbl = document.getElementById("aiMemoryProgressLabel");
  const runBtn = document.getElementById("btnRunAiMemoryGenerator");

  progBox.classList.remove("hidden");
  document.getElementById("aiMemoryResultBox").classList.add("hidden");
  runBtn.disabled = true;

  try {
    const loadedImgs = [];
    for (const src of aiMemorySelectedImages) {
      try {
        const im = await loadHtmlImageAsync(src);
        loadedImgs.push(im);
      } catch (e) {}
    }
    if (loadedImgs.length === 0) {
      throw new Error("Không nạp được hình ảnh hợp lệ để dựng video.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");

    // Tạo nhạc nền nhẹ nhàng bằng Web Audio API
    let audioDest = null;
    let audioCtx = null;
    let musicTimer = null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
        audioDest = audioCtx.createMediaStreamDestination();
        const melody = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 587.33, 698.46, 880.00, 783.99];
        let step = 0;
        const playNote = () => {
          if (!audioCtx || audioCtx.state === "closed") return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = melody[step % melody.length];
          gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
          osc.connect(gain);
          gain.connect(audioDest);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.56);
          step++;
        };
        playNote();
        musicTimer = setInterval(playNote, 600);
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

    const fps = 24;
    const framesPerSlide = 48; // 2 giây mỗi ảnh
    const introFrames = 36;    // 1.5 giây tiêu đề mở đầu
    const totalFrames = introFrames + loadedImgs.length * framesPerSlide;

    const donePromise = new Promise(resolve => {
      recorder.onstop = () => resolve();
    });

    recorder.start();

    for (let f = 0; f < totalFrames; f++) {
      // Vẽ nền gradient sang trọng
      const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (f < introFrames) {
        const alpha = Math.min(1, f / 15);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TRƯỜNG THPT SỐ 1 QUANG TRUNG • TẬP THỂ LỚP 10A12", canvas.width / 2, 220);

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 38px sans-serif";
        ctx.fillText(title.toUpperCase(), canvas.width / 2, 275);

        ctx.fillStyle = "#93c5fd";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`Album Kỷ Niệm • ${formatDateVN()}`, canvas.width / 2, 320);
        ctx.restore();
      } else {
        const slideFrame = f - introFrames;
        const slideIdx = Math.min(loadedImgs.length - 1, Math.floor(slideFrame / framesPerSlide));
        const localF = slideFrame % framesPerSlide;
        const progressInSlide = localF / framesPerSlide;
        const img = loadedImgs[slideIdx];

        // Hiệu ứng Ken Burns Zoom nhẹ + Fade in
        const scale = 1.0 + progressInSlide * 0.08;
        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let drawW, drawH;
        if (imgRatio > canvasRatio) {
          drawH = canvas.height * scale;
          drawW = drawH * imgRatio;
        } else {
          drawW = canvas.width * scale;
          drawH = drawW / imgRatio;
        }
        const offsetX = (canvas.width - drawW) / 2;
        const offsetY = (canvas.height - drawH) / 2;

        ctx.save();
        ctx.globalAlpha = Math.min(1, localF / 10);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.restore();

        // Thanh caption mờ phía dưới
        ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
        ctx.fillRect(0, canvas.height - 54, canvas.width, 54);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`✨ ${title}`, 24, canvas.height - 21);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fde68a";
        ctx.fillText(`10A12 • Ảnh ${slideIdx + 1}/${loadedImgs.length}`, canvas.width - 24, canvas.height - 21);
      }

      const pct = Math.round(((f + 1) / totalFrames) * 100);
      if (progBar) progBar.style.width = `${pct}%`;
      if (progPct) progPct.innerText = `${pct}%`;

      await new Promise(r => setTimeout(r, Math.round(1000 / fps)));
    }

    recorder.stop();
    await donePromise;
    if (musicTimer) clearInterval(musicTimer);
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
  const btn = document.getElementById("btnUploadAiVideoDrive");
  const prevHtml = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tải video lên Google Drive...`;
  }

  try {
    const title = (document.getElementById("aiMemoryTitleInput").value || "Video Kỷ Niệm 10A12").trim();
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.onerror = () => reject(new Error("Không đọc được dữ liệu video."));
      reader.readAsDataURL(aiMemoryGeneratedVideoBlob);
    });

    const uploaderName = appState.currentUser ? appState.currentUser.fullName : "Thành viên 10A12";
    const res = await callApi("uploadClassMediaToDrive", {
      title,
      fileName: `${title.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9 -]/g, "_")}_${Date.now()}.webm`,
      mimeType: "video/webm",
      mediaType: "VIDEO",
      base64Data,
      uploaderName
    }, "POST");

    if (res && res.status === "success") {
      if (Array.isArray(res.classMedia)) {
        appState.classMedia = res.classMedia;
      } else if (res.item) {
        appState.classMedia.unshift(res.item);
      }
      saveStateToLocal();
      renderVtmSection();
      closeAiMemoryVideoModal();
      alert("🎉 Đã lưu Video Kỷ Niệm lên thư mục Google Drive chung của lớp 10A12 thành công!");
    } else {
      alert("Không thể tải video lên Google Drive: " + ((res && res.message) || "Kiểm tra lại kết nối mạng hoặc quyền Drive trên Apps Script."));
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = prevHtml;
    }
  }
}
