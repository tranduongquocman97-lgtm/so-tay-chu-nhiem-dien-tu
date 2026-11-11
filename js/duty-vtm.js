/**
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ THỜI KHÓA BIỂU, TRỰC NHẬT 7 CA & VĂN THỂ MỸ
 */

function renderTkbSection() {
  const mBody = document.getElementById("tkbMorningTableBody");
  const aBody = document.getElementById("tkbAfternoonTableBody");

  if (mBody) {
    mBody.innerHTML = TKB_CONFIG_SO3.morning.map(r => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
        <td class="py-2.5 px-3 font-mono font-black text-sky-700">${r.period}</td>
        <td class="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">${r.time}</td>
        <td class="py-2.5 px-3 font-bold ${r.t2.includes('Mẫn') ? 'text-amber-700 font-black' : 'text-slate-800'}">${r.t2}</td>
        <td class="py-2.5 px-3 font-bold ${r.t3.includes('Mẫn') ? 'text-amber-700 font-black' : 'text-slate-800'}">${r.t3}</td>
        <td class="py-2.5 px-3 font-bold ${r.t4.includes('Mẫn') ? 'text-amber-700 font-black' : 'text-slate-800'}">${r.t4}</td>
        <td class="py-2.5 px-3 text-slate-400">${r.t5}</td>
        <td class="py-2.5 px-3 text-slate-400">${r.t6}</td>
        <td class="py-2.5 px-3 text-slate-400">${r.t7}</td>
      </tr>
    `).join("");
  }

  if (aBody) {
    aBody.innerHTML = TKB_CONFIG_SO3.afternoon.map(r => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs">
        <td class="py-2.5 px-3 font-mono font-black text-indigo-700">${r.period}</td>
        <td class="py-2.5 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">${r.time}</td>
        <td class="py-2.5 px-3 font-bold text-slate-800">${r.t2}</td>
        <td class="py-2.5 px-3 font-bold text-slate-800">${r.t3}</td>
        <td class="py-2.5 px-3 text-slate-400">${r.t4}</td>
        <td class="py-2.5 px-3 text-slate-400">${r.t5}</td>
        <td class="py-2.5 px-3 text-slate-400">${r.t6}</td>
        <td class="py-2.5 px-3 text-slate-400">${r.t7}</td>
      </tr>
    `).join("");
  }

  const imgEl = document.getElementById("tkbImageDisplay");
  if (imgEl) imgEl.src = appState.tkbCustomImage || "tkb_10a12.png";
}

function handleUploadNewTkbImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    appState.tkbCustomImage = e.target.result;
    saveStateToLocal();
    renderTkbSection();
    alert("Đã cập nhật ảnh Thời khóa biểu mới thành công!");
  };
  reader.readAsDataURL(file);
}

function openZoomTkbModal() {
  const modal = document.getElementById("zoomTkbModal");
  if (modal) {
    modal.classList.remove("hidden");
    const zoomImg = document.getElementById("zoomTkbImage");
    if (zoomImg) zoomImg.src = appState.tkbCustomImage || "tkb_10a12.png";
  }
}

function closeZoomTkbModal() {
  const modal = document.getElementById("zoomTkbModal");
  if (modal) modal.classList.add("hidden");
}

function downloadCurrentTkbImage() {
  const a = document.createElement("a");
  a.href = appState.tkbCustomImage || "tkb_10a12.png";
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
                return `<span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">${s ? s.hoTen : stId}</span>`;
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

function openAssignDutyModal(sessionKey) {
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
            <input type="checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 accent-sky-600 duty-assign-cb">
            <span class="font-bold text-slate-800">${s.hoTen}</span>
          </div>
          <span class="text-[10px] text-slate-500">${s.to}</span>
        </label>
      `;
    }).join("");
  }
}

function closeAssignDutyModal() {
  const modal = document.getElementById("assignDutyModal");
  if (modal) modal.classList.add("hidden");
}

function saveDutyAssignmentForSession() {
  const selected = [];
  document.querySelectorAll(".duty-assign-cb:checked").forEach(cb => selected.push(cb.value));

  if (!appState.dutyAssignments[currentAssigningSessionKey]) {
    appState.dutyAssignments[currentAssigningSessionKey] = { students: [], status: "CHUA_DANH_GIA", note: "" };
  }
  appState.dutyAssignments[currentAssigningSessionKey].students = selected;

  saveStateToLocal();
  render7DutySection();
  closeAssignDutyModal();
  alert(`Đã phân công ${selected.length} học sinh cho ${getSessionLabel(currentAssigningSessionKey)}!`);
}

function submitDutyEvaluation(sessionKey, status) {
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
  alert(`Đã cập nhật trạng thái ca trực: ${status === 'DAT' ? 'ĐẠT' : 'CHƯA ĐẠT (Trực bù)'}!`);
}

function openDutyRegisterModal() {
  const modal = document.getElementById("dutyRegisterModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const sel = document.getElementById("volunteerStudentSelect");
  if (sel) {
    sel.innerHTML = appState.students.map(s => `<option value="${s.id}|${s.hoTen}">${s.id} - ${s.hoTen} (${s.to})</option>`).join("");
  }
}

function closeDutyRegisterModal() {
  const modal = document.getElementById("dutyRegisterModal");
  if (modal) modal.classList.add("hidden");
}

function submitVolunteerRegistration() {
  const act = document.getElementById("volunteerActivityInput").value.trim();
  const stVal = document.getElementById("volunteerStudentSelect").value.split("|");

  if (!act) {
    alert("Vui lòng nhập tên hoạt động Đoàn trường!");
    return;
  }

  appState.volunteerLaborList.unshift({
    id: `VOL_${Date.now()}`,
    time: new Date().toLocaleDateString("vi-VN"),
    studentId: stVal[0],
    studentName: stVal[1],
    activity: act,
    status: "CHO_DUYET"
  });

  saveStateToLocal();
  renderLaborVolunteerList();
  closeDutyRegisterModal();
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
        <b class="text-slate-800">${v.studentName}</b>
        <span class="text-slate-600 ml-1.5">• Hoạt động: <b>${v.activity}</b> (${v.time})</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${v.status === 'DA_DUYET' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
          ${v.status === 'DA_DUYET' ? '+10đ Rèn luyện' : 'Chờ GVCN duyệt'}
        </span>
        ${isGVCN && v.status === 'CHO_DUYET' ? `
          <button onclick="approveVolunteerLabor('${v.id}')" class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">Duyệt (+10đ)</button>
        ` : ''}
      </div>
    </div>
  `).join("");
}

function approveVolunteerLabor(id) {
  const item = appState.volunteerLaborList.find(x => x.id === id);
  if (!item) return;

  item.status = "DA_DUYET";
  const st = appState.students.find(s => s.id === item.studentId);
  if (st) {
    st.diemThiDua = Math.min(100, (Number(st.diemThiDua) || 100) + 10);
    appState.violations.unshift({
      time: new Date().toLocaleDateString("vi-VN"),
      studentId: st.id,
      studentName: st.hoTen,
      criteria: `[Lao động Đoàn] ${item.activity}`,
      points: 10,
      note: "Hoàn thành xuất sắc hoạt động phong trào Đoàn",
      sender: "GVCN duyệt"
    });
  }

  saveStateToLocal();
  renderLaborVolunteerList();
  renderOverviewDashboard();
  alert(`Đã duyệt khen thưởng +10đ rèn luyện cho học sinh [${item.studentName}]!`);
}

function renderVtmSection() {
  const eventsGrid = document.getElementById("vtmEventsGrid");
  const mediaGrid = document.getElementById("classMediaGalleryGrid");
  const isVtmLeader = (appState.roleLevel === "GVCN") || (appState.roleLevel === "VTM");

  if (eventsGrid) {
    if (appState.vtmEvents.length === 0) {
      eventsGrid.innerHTML = `<p class="col-span-full text-xs text-slate-400 italic py-4">Chưa có sự kiện phong trào VTM nào.</p>`;
    } else {
      eventsGrid.innerHTML = appState.vtmEvents.map(ev => `
        <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 class="font-black text-xs text-purple-800 uppercase truncate">${ev.title}</h4>
            ${isVtmLeader ? `<button onclick="deleteVtmEvent('${ev.id}')" class="text-slate-400 hover:text-rose-600 text-xs"><i class="fa-solid fa-trash-can"></i></button>` : ''}
          </div>
          <p class="text-[11px] text-slate-600">Lịch: <b class="text-slate-800">${ev.schedule}</b></p>
          <p class="text-[11px] text-slate-500 italic">${ev.note || "Không có ghi chú"}</p>
        </div>
      `).join("");
    }
  }

  if (mediaGrid) {
    if (appState.classMedia.length === 0) {
      mediaGrid.innerHTML = `<p class="col-span-full text-xs text-slate-400 italic py-4 text-center">Chưa có hình ảnh/clip kỷ niệm. Hãy đăng tải khoảnh khắc đẹp của lớp!</p>`;
    } else {
      mediaGrid.innerHTML = appState.classMedia.map(m => `
        <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs group">
          <div class="h-32 bg-slate-100 overflow-hidden relative">
            <img src="${m.imgData}" alt="${m.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            ${isVtmLeader ? `
              <button onclick="deleteClassMedia('${m.id}')" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/70 text-white text-[10px] flex items-center justify-center hover:bg-rose-600">
                <i class="fa-solid fa-xmark"></i>
              </button>
            ` : ''}
          </div>
          <div class="p-2.5 space-y-1">
            <h5 class="text-xs font-black text-slate-800 truncate">${m.title}</h5>
            <span class="text-[9.5px] text-slate-400 block">${m.date}</span>
          </div>
        </div>
      `).join("");
    }
  }
}

function openAddVtmEventModal() {
  document.getElementById("addVtmModal").classList.remove("hidden");
}
function closeAddVtmModal() {
  document.getElementById("addVtmModal").classList.add("hidden");
}

function submitNewVtmEvent() {
  const title = document.getElementById("vtmEventTitleInput").value.trim();
  const schedule = document.getElementById("vtmEventScheduleInput").value.trim();
  const note = document.getElementById("vtmEventNoteInput").value.trim();

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
  alert("Đã lưu sự kiện phong trào Văn Thể Mỹ!");
}

function deleteVtmEvent(id) {
  if (confirm("Thầy/bạn có chắc chắn muốn xóa sự kiện này?")) {
    appState.vtmEvents = appState.vtmEvents.filter(x => x.id !== id);
    saveStateToLocal();
    renderVtmSection();
  }
}

function openUploadMediaModal() {
  document.getElementById("uploadMediaModal").classList.remove("hidden");
}
function closeUploadMediaModal() {
  document.getElementById("uploadMediaModal").classList.add("hidden");
}

function submitUploadMediaItem() {
  const title = document.getElementById("mediaTitleInput").value.trim();
  const fileInput = document.getElementById("mediaFileInput");

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Vui lòng chọn tệp ảnh!");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    appState.classMedia.unshift({
      id: `MED_${Date.now()}`,
      title: title || "Khoảnh khắc 10A12",
      imgData: e.target.result,
      date: new Date().toLocaleDateString("vi-VN")
    });
    saveStateToLocal();
    renderVtmSection();
    closeUploadMediaModal();
    alert("Đã thêm ảnh vào Kho Media Kỷ niệm của lớp!");
  };
  reader.readAsDataURL(file);
}

function deleteClassMedia(id) {
  if (confirm("Xóa bức ảnh này khỏi Kho Media lớp?")) {
    appState.classMedia = appState.classMedia.filter(x => x.id !== id);
    saveStateToLocal();
    renderVtmSection();
  }
}