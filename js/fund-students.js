/**
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ QUỸ LỚP, HỒ SƠ 45 HS, TÂM TƯ & CÀI ĐẶT
 */

function recalculateFundSummary() {
  let totalIncome = 0;
  appState.fundPayments.forEach(p => {
    if (p.isPaid) {
      const camp = appState.campaigns.find(c => c.id === p.campaignId);
      const campTarget = camp ? Number(camp.target) || 0 : 100000;
      totalIncome += (Number(p.amountPaid) || campTarget);
    }
  });
  
  let totalExpense = 0;
  appState.cashbook.forEach(tx => {
    const status = tx.status || "DA_DUYET";
    if (status === "DA_DUYET") {
      if (tx.type === "CHI") totalExpense += Number(tx.amount) || 0;
      else totalIncome += Number(tx.amount) || 0;
    }
  });

  appState.fundSummary = { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

function renderFundCampaigns() {
  const select = document.getElementById("campaignSelect");
  if (!select) return;

  select.innerHTML = appState.campaigns.map(c => `
    <option value="${c.id}">${c.title} (${(c.target || 0).toLocaleString()}đ)</option>
  `).join("");
  appState.currentCampaignId = select.value || "KY1_100K";
}

function switchFundCampaign(campaignId) {
  appState.currentCampaignId = campaignId;
  renderFundChecklist();
}

function renderFundChecklist() {
  recalculateFundSummary();

  const incomeEl = document.getElementById("fundIncomeDisplay");
  const expenseEl = document.getElementById("fundExpenseDisplay");
  const balanceEl = document.getElementById("fundBalanceDisplay");
  const countEl = document.getElementById("fundPaidRatio");

  if (incomeEl) incomeEl.innerText = `${appState.fundSummary.totalIncome.toLocaleString()} đ`;
  if (expenseEl) expenseEl.innerText = `${appState.fundSummary.totalExpense.toLocaleString()} đ`;
  if (balanceEl) balanceEl.innerText = `${appState.fundSummary.balance.toLocaleString()} đ`;

  const paymentsForCampaign = appState.fundPayments.filter(p => p.campaignId === appState.currentCampaignId);
  const paidCount = paymentsForCampaign.filter(p => p.isPaid).length;
  if (countEl) countEl.innerText = `Đã thu: ${paidCount}/${appState.students.length} HS`;

  const grid = document.getElementById("fundStudentGrid");
  if (!grid) return;

  const canEditFund = (appState.roleLevel === "GVCN") || (appState.roleLevel === "TREASURER");

  grid.innerHTML = appState.students.map(st => {
    const pay = paymentsForCampaign.find(p => p.studentId === st.id);
    const isPaid = pay ? pay.isPaid : false;

    return `
      <div class="p-2.5 rounded-xl bg-white border ${isPaid ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200"} flex items-center justify-between">
        <div class="flex items-center gap-2">
          <input type="checkbox" ${isPaid ? "checked" : ""} ${canEditFund ? "" : "disabled cursor-not-allowed opacity-50"} onchange="toggleFundLocal('${st.id}', this.checked)" class="w-4 h-4 accent-emerald-600 rounded cursor-pointer">
          <div>
            <p class="text-xs font-bold text-slate-800 leading-tight">${st.hoTen}</p>
            <span class="text-[10px] text-slate-400 font-mono">${st.id} • ${st.to}</span>
          </div>
        </div>
        <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${isPaid ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-rose-600 bg-rose-50 border border-rose-200"}">
          ${isPaid ? "Đã nộp" : "Chưa nộp"}
        </span>
      </div>
    `;
  }).join("");

  renderExpenseHistoryTable();
}

function renderExpenseHistoryTable() {
  const container = document.getElementById("expenseHistoryList");
  if (!container) return;

  if (appState.cashbook.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic py-3 text-center">Chưa có phiếu thu chi nào.</p>`;
    return;
  }

  const isGVCN = (appState.roleLevel === "GVCN");
  const canDelete = (appState.roleLevel === "GVCN") || (appState.roleLevel === "TREASURER");

  container.innerHTML = appState.cashbook.map(tx => {
    const status = tx.status || "DA_DUYET";
    const isApproved = (status === "DA_DUYET");
    const isPending = (status === "CHO_DUYET");

    let badge = "";
    if (isApproved) badge = `<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200"><i class="fa-solid fa-circle-check mr-1"></i>Đã duyệt</span>`;
    else if (isPending) badge = `<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200"><i class="fa-solid fa-clock mr-1"></i>Chờ GVCN duyệt</span>`;
    else badge = `<span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">Từ chối</span>`;

    return `
      <div class="p-3 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-slate-800">${tx.category}</span>
            ${badge}
          </div>
          <p class="text-[11px] text-slate-600">${tx.note} <span class="text-slate-400 font-mono">(${tx.time} • ${tx.author})</span></p>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-auto">
          <span class="text-sm font-black ${tx.type === 'CHI' ? 'text-rose-600' : 'text-emerald-700'} font-mono">
            ${tx.type === 'CHI' ? '-' : '+'}${Number(tx.amount || 0).toLocaleString()}đ
          </span>
          ${isGVCN && isPending ? `
            <button onclick="approveExpenseLocal('${tx.code}', 'DA_DUYET')" class="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100">Duyệt</button>
            <button onclick="approveExpenseLocal('${tx.code}', 'TU_CHOI')" class="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100">Hủy</button>
          ` : ""}
          ${canDelete ? `
            <button onclick="deleteFundTransaction('${tx.code}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Xóa giao dịch này">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function approveExpenseLocal(code, status) {
  const tx = appState.cashbook.find(t => t.code === code);
  if (tx) {
    tx.status = status;
    appState.auditLogs.unshift({
      time: new Date().toLocaleString("vi-VN"),
      code: code,
      action: status === "DA_DUYET" ? "DUYỆT CHI" : "TỪ CHỐI",
      author: appState.currentUser ? appState.currentUser.fullName : "GVCN",
      amount: tx.amount,
      note: `Cập nhật trạng thái phiếu ${tx.category}`
    });
    saveStateToLocal();
    renderFundChecklist();
    callApi("approveFundExpense", { code, status });
    alert(`Đã cập nhật trạng thái phiếu chi: ${status === 'DA_DUYET' ? 'Đã duyệt' : 'Từ chối'}!`);
  }
}

function deleteFundTransaction(code) {
  const tx = appState.cashbook.find(t => t.code === code);
  if (!tx) return;

  const reason = prompt(`Xác nhận xóa giao dịch [${tx.category} - ${Number(tx.amount).toLocaleString()}đ]?\nNhập lý do xóa (để lưu nhật ký kiểm toán):`, "Ghi nhầm số tiền");
  if (reason === null) return;

  appState.auditLogs.unshift({
    time: new Date().toLocaleString("vi-VN"),
    code: tx.code,
    action: "XÓA GIAO DỊCH",
    author: appState.currentUser ? appState.currentUser.fullName : "Thủ quỹ / GVCN",
    amount: tx.amount,
    note: `Lý do: ${reason}`
  });

  appState.cashbook = appState.cashbook.filter(t => t.code !== code);
  saveStateToLocal();
  renderFundChecklist();
  alert("Đã xóa giao dịch và ghi nhận vào Nhật ký kiểm toán!");
  callApi("deleteFundTransaction", { code, reason });
}

function toggleFundLocal(studentId, isChecked) {
  const camp = appState.campaigns.find(c => c.id === appState.currentCampaignId);
  const target = camp ? Number(camp.target) || 0 : 100000;

  let pay = appState.fundPayments.find(p => p.campaignId === appState.currentCampaignId && p.studentId === studentId);
  if (pay) {
    pay.isPaid = isChecked;
    pay.amountPaid = isChecked ? target : 0;
  } else {
    appState.fundPayments.push({
      campaignId: appState.currentCampaignId,
      studentId: studentId,
      isPaid: isChecked,
      amountPaid: isChecked ? target : 0
    });
  }
  saveStateToLocal();
  renderFundChecklist();
}

async function saveCurrentFundState() {
  saveStateToLocal();
  const camp = appState.campaigns.find(c => c.id === appState.currentCampaignId);
  const target = camp ? Number(camp.target) || 0 : 100000;

  const currentPayments = appState.students.map(st => {
    const pay = appState.fundPayments.find(p => p.campaignId === appState.currentCampaignId && p.studentId === st.id);
    return {
      studentId: st.id,
      studentName: st.hoTen,
      isPaid: pay ? pay.isPaid : false,
      amountPaid: pay && pay.isPaid ? target : 0
    };
  });

  const res = await callApi("saveFundPaymentBatch", {
    campaignId: appState.currentCampaignId,
    payments: currentPayments
  });
  alert(res.status === "success" ? "Đã đồng bộ quỹ lớp lên Google Sheets!" : "Đã lưu trạng thái quỹ vào bộ nhớ máy!");
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

  const newId = `KY_${Date.now()}`;
  appState.campaigns.push({ id: newId, title, target, status: "Đang thu" });
  appState.currentCampaignId = newId;

  saveStateToLocal();
  renderFundCampaigns();
  renderFundChecklist();
  closeNewCampaignModal();
  alert("Đã khởi tạo đợt thu quỹ mới thành công!");

  callApi("createFundCampaign", { title, target });
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

  const isGVCN = (appState.roleLevel === "GVCN");
  const defaultStatus = isGVCN ? "DA_DUYET" : "CHO_DUYET";

  const newTx = {
    code: `CHI_${Date.now()}`,
    time: new Date().toLocaleDateString("vi-VN"),
    type: "CHI",
    category,
    amount,
    author: appState.currentUser ? appState.currentUser.fullName : "Thủ quỹ lớp",
    note,
    status: defaultStatus
  };

  appState.cashbook.unshift(newTx);
  appState.auditLogs.unshift({
    time: new Date().toLocaleString("vi-VN"),
    code: newTx.code,
    action: "LẬP PHIẾU CHI",
    author: newTx.author,
    amount: newTx.amount,
    note: `Khoản mục: ${category} - ${note}`
  });

  saveStateToLocal();
  renderFundChecklist();
  closeAddExpenseModal();

  alert(isGVCN ? "Đã lập phiếu chi và xuất quỹ thành công!" : "Đã gửi phiếu chi! Đang chờ Thầy chủ nhiệm duyệt.");
  callApi("saveFundExpense", newTx);
}

function openFundAuditLogsModal() {
  const modal = document.getElementById("fundAuditModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const container = document.getElementById("fundAuditLogsList");
  if (container) {
    if (appState.auditLogs.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic py-3 text-center">Chưa có lịch sử biến động nào được ghi nhận.</p>`;
    } else {
      container.innerHTML = appState.auditLogs.map(l => `
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800">${l.action} (${l.code})</span>
            <span class="text-[10px] text-slate-400 font-mono">${l.time}</span>
          </div>
          <p class="text-[11px] text-slate-600">${l.note} • <b>${Number(l.amount || 0).toLocaleString()}đ</b></p>
          <span class="text-[10px] text-indigo-600 block">Thực hiện: ${l.author}</span>
        </div>
      `).join("");
    }
  }
}

function closeFundAuditModal() {
  const modal = document.getElementById("fundAuditModal");
  if (modal) modal.classList.add("hidden");
}

function renderStudentCards(list) {
  const grid = document.getElementById("studentCardsGrid");
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<p class="col-span-full py-8 text-center text-xs text-slate-400 italic">Không tìm thấy học sinh phù hợp.</p>`;
    return;
  }

  grid.innerHTML = list.map(st => {
    const score = Number(st.diemThiDua) || 100;
    const scoreColor = score >= 90 
      ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
      : (score >= 70 ? "text-sky-700 bg-sky-50 border border-sky-200" : "text-amber-700 bg-amber-50 border border-amber-200");

    return `
      <div class="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between gap-3 hover:border-slate-300 transition shadow-xs">
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
              ${st.hoTen.split(" ").pop().charAt(0)}
            </div>
            <div class="min-w-0">
              <h3 class="text-xs sm:text-sm font-black text-slate-800 truncate">${st.hoTen}</h3>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5">
                <span>${st.id}</span> • <span>${st.to}</span>
                ${st.chucVu && st.chucVu !== 'Thành viên' ? `• <span class="text-sky-700 font-bold">${st.chucVu}</span>` : ''}
              </p>
            </div>
          </div>
          <span class="text-xs font-black px-2 py-0.5 rounded-lg ${scoreColor} shrink-0">
            ${score}đ
          </span>
        </div>

        <button onclick="openStudentDetailModal('${st.id}')" class="w-full py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-address-card text-sky-600"></i>
          <span>Xem lý lịch chi tiết</span>
        </button>
      </div>
    `;
  }).join("");
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

function openStudentDetailModal(studentId) {
  const st = appState.students.find(s => s.id === studentId);
  if (!st) return;

  appState.selectedStudentForDetail = st;
  const modal = document.getElementById("studentDetailModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const titleEl = document.getElementById("modalStudentTitle");
  if (titleEl) titleEl.innerText = `Lý Lịch: ${st.hoTen} (${st.id})`;

  const formEl = document.getElementById("modalStudentForm");
  const isGVCN = (appState.roleLevel === "GVCN");

  if (formEl) {
    formEl.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-slate-500 block mb-1">Họ và tên:</label>
          <input type="text" id="detailStudentName" value="${st.hoTen}" ${isGVCN ? '' : 'readonly'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Tổ sinh hoạt:</label>
          <select id="detailStudentTeam" ${isGVCN ? '' : 'disabled'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
            <option value="Tổ 1" ${st.to === 'Tổ 1' ? 'selected' : ''}>Tổ 1</option>
            <option value="Tổ 2" ${st.to === 'Tổ 2' ? 'selected' : ''}>Tổ 2</option>
            <option value="Tổ 3" ${st.to === 'Tổ 3' ? 'selected' : ''}>Tổ 3</option>
            <option value="Tổ 4" ${st.to === 'Tổ 4' ? 'selected' : ''}>Tổ 4</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-slate-500 block mb-1">Chức vụ cán sự:</label>
          <input type="text" id="detailStudentRole" value="${st.chucVu || 'Thành viên'}" ${isGVCN ? '' : 'readonly'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Số thẻ CCCD:</label>
          <input type="text" id="detailStudentCCCD" value="${st.soCCCD || ''}" ${isGVCN ? '' : 'readonly'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Ngày cấp CCCD:</label>
          <input type="text" id="detailStudentIssueDate" value="${st.ngayCapCCCD || ''}" placeholder="dd/mm/yyyy" ${isGVCN ? '' : 'readonly'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-slate-500 block mb-1">Họ tên Ba & SĐT:</label>
          <input type="text" id="detailStudentFather" value="${st.tenBa || ''} - ${st.sdtBa || ''}" ${isGVCN ? '' : 'readonly'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Họ tên Mẹ & SĐT:</label>
          <input type="text" id="detailStudentMother" value="${st.tenMe || ''} - ${st.sdtMe || ''}" ${isGVCN ? '' : 'readonly'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
      </div>

      <div>
        <label class="text-slate-500 block mb-1">Địa chỉ thường trú:</label>
        <input type="text" id="detailStudentAddress" value="${st.diaChi || 'Tây Sơn, Gia Lai'}" ${isGVCN ? '' : 'readonly'} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
      </div>
    `;
  }
}

function closeStudentModal() {
  const modal = document.getElementById("studentDetailModal");
  if (modal) modal.classList.add("hidden");
}

function saveStudentProfileChanges() {
  if (appState.roleLevel !== "GVCN") return;
  const st = appState.selectedStudentForDetail;
  if (!st) return;

  st.hoTen = document.getElementById("detailStudentName").value.trim();
  st.to = document.getElementById("detailStudentTeam").value;
  st.chucVu = document.getElementById("detailStudentRole").value.trim();
  st.soCCCD = document.getElementById("detailStudentCCCD").value.trim();
  const issueEl = document.getElementById("detailStudentIssueDate");
  if (issueEl) st.ngayCapCCCD = issueEl.value.trim();
  st.diaChi = document.getElementById("detailStudentAddress").value.trim();

  saveStateToLocal();
  renderStudentCards(appState.students);
  closeStudentModal();
  alert("Đã cập nhật thay đổi hồ sơ học sinh thành công!");
}

function openAddNewStudentModal() {
  document.getElementById("addStudentModal").classList.remove("hidden");
}
function closeAddNewStudentModal() {
  document.getElementById("addStudentModal").classList.add("hidden");
}

function submitAddNewStudent() {
  const name = document.getElementById("newStudentName").value.trim();
  const team = document.getElementById("newStudentTeam").value;
  const role = document.getElementById("newStudentRole").value.trim();
  const cccd = document.getElementById("newStudentCCCD").value.trim();
  const issueDate = document.getElementById("newStudentIssueDate") ? document.getElementById("newStudentIssueDate").value.trim() : "";

  if (!name) {
    alert("Vui lòng nhập họ tên học sinh!");
    return;
  }

  const nextId = "HS" + (appState.students.length < 9 ? "0" + (appState.students.length + 1) : (appState.students.length + 1));
  const newSt = {
    id: nextId,
    hoTen: name,
    to: team,
    chucVu: role || "Thành viên",
    soCCCD: cccd,
    ngayCapCCCD: issueDate,
    diemThiDua: 100,
    matKhau: "123456"
  };

  appState.students.push(newSt);
  saveStateToLocal();
  renderStudentCards(appState.students);
  closeAddNewStudentModal();
  alert(`Đã tiếp nhận học sinh mới [${name}] vào ${team}!`);
}

function downloadSampleExcelTemplate() {
  let csv = "Mã HS,Họ và Tên,Tổ,Chức Vụ,Số CCCD,Ngày Cấp CCCD,Họ Tên Ba,SĐT Ba,Họ Tên Mẹ,SĐT Mẹ,Địa Chỉ\n" +
            "HS01,Nguyễn Tấn An,Tổ 1,Lớp trưởng,052206001234,15/05/2023,Nguyễn Văn Hùng,0905123456,Trần Thị Mai,0905123457,Tây Sơn Gia Lai\n" +
            "HS02,Võ Hiền Đức,Tổ 1,Tổ trưởng T1,052206001235,10/08/2023,Võ Văn Nam,0914123456,Lê Thị Lan,0914123457,Tây Sơn Gia Lai\n";
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Mau_Danh_Sach_10A12.csv";
  a.click();
}

function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);

    if (json && json.length > 0) {
      appState.students = json.map((row, idx) => ({
        id: row["Mã HS"] || row["id"] || `HS${idx < 9 ? '0' : ''}${idx + 1}`,
        hoTen: row["Họ và Tên"] || row["hoTen"] || "Học sinh",
        to: row["Tổ"] || row["to"] || "Tổ 1",
        chucVu: row["Chức Vụ"] || row["chucVu"] || "Thành viên",
        soCCCD: row["Số CCCD"] || row["soCCCD"] || "",
        ngayCapCCCD: row["Ngày Cấp CCCD"] || row["ngayCapCCCD"] || "",
        tenBa: row["Họ Tên Ba"] || row["tenBa"] || "",
        sdtBa: row["SĐT Ba"] || row["sdtBa"] || "",
        tenMe: row["Họ Tên Mẹ"] || row["tenMe"] || "",
        sdtMe: row["SĐT Mẹ"] || row["sdtMe"] || "",
        diaChi: row["Địa Chỉ"] || row["diaChi"] || "Tây Sơn, Gia Lai",
        diemThiDua: 100,
        matKhau: "123456"
      }));

      saveStateToLocal();
      renderAllSections();
      alert(`Đã nạp thành công ${appState.students.length} học sinh từ file Excel!`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function exportStudentProfilesExcel() {
  let csv = "Mã HS,Họ và Tên,Tổ,Chức Vụ,Số CCCD,Ngày Cấp CCCD,Điểm Thi Đua\n";
  appState.students.forEach(s => {
    csv += `"${s.id}","${s.hoTen}","${s.to}","${s.chucVu}","${s.soCCCD || ''}","${s.ngayCapCCCD || ''}",${s.diemThiDua}\n`;
  });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Danh_Sach_10A12_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function renderTeacherLettersList() {
  const container = document.getElementById("teacherLettersList");
  if (!container) return;

  if (appState.letters.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic py-6 text-center">Hòm thư hiện tại chưa có tâm sự nào từ học sinh.</p>`;
    return;
  }

  const unreadCount = appState.letters.filter(l => l.status === "Chưa đọc").length;
  const badgeEl = document.getElementById("unreadLetterBadge");
  if (badgeEl) {
    badgeEl.innerText = unreadCount;
    if (unreadCount > 0) badgeEl.classList.remove("hidden");
    else badgeEl.classList.add("hidden");
  }

  container.innerHTML = appState.letters.map(l => `
    <div class="p-4 rounded-2xl bg-white border ${l.status === 'Chưa đọc' ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'} space-y-2 shadow-xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold text-[10px] border border-sky-200">${l.category}</span>
          <span class="text-xs font-black text-slate-800">${l.senderName}</span>
        </div>
        <span class="text-[10px] text-slate-400 font-mono">${l.time}</span>
      </div>
      <h4 class="text-xs font-black text-slate-800">${l.title}</h4>
      <p class="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">${l.content}</p>

      ${l.teacherReply ? `
        <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <b>Lời nhắn của Thầy:</b> ${l.teacherReply}
        </div>
      ` : ""}

      <div class="pt-2 flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold ${l.status === 'Chưa đọc' ? 'text-amber-600' : 'text-emerald-700'}">Trạng thái: ${l.status}</span>
        <button onclick="openReplyLetterModal('${l.id}')" class="px-3 py-1 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition">
          <i class="fa-solid fa-reply mr-1"></i> Tư vấn / Phản hồi
        </button>
      </div>
    </div>
  `).join("");
}

function openReplyLetterModal(letterId) {
  const l = appState.letters.find(item => item.id === letterId);
  if (!l) return;

  const reply = prompt(`Nhập lời nhắn gửi đến học sinh [${l.senderName}]:`, l.teacherReply || "");
  if (reply !== null) {
    l.teacherReply = reply.trim();
    l.status = "Đã tư vấn";
    saveStateToLocal();
    renderTeacherLettersList();
    alert("Đã lưu lời nhắn tư vấn tâm lý học sinh!");
    callApi("updateLetterStatus", { letterId, status: "Đã tư vấn", teacherReply: l.teacherReply });
  }
}

function renderSettingsTab() {
  renderCurrentOfficers();

  const cBody = document.getElementById("criteriaSettingList");
  if (cBody) {
    cBody.innerHTML = appState.criteriaList.map(c => `
      <div class="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg ${c.type === 'CONG' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'} font-black text-[10px] flex items-center justify-center">${c.code}</span>
          <span class="text-slate-800 font-medium">${c.name}</span>
        </div>
        <span class="font-black ${c.type === 'CONG' ? 'text-emerald-700' : 'text-rose-600'} font-mono">${c.points > 0 ? '+' : ''}${c.points}đ</span>
      </div>
    `).join("");
  }
}

function renderCurrentOfficers() {
  const container = document.getElementById("currentOfficersGrid");
  if (!container) return;

  const officers = appState.students.filter(s => s.chucVu && s.chucVu !== "Thành viên");

  container.innerHTML = officers.map(o => `
    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
      <div>
        <b class="text-slate-800 block">${o.hoTen}</b>
        <span class="text-[10px] text-sky-700 font-bold">${o.chucVu} (${o.to})</span>
      </div>
      <button onclick="openAssignRoleModalForStudent('${o.id}')" class="text-slate-400 hover:text-indigo-600" title="Đổi chức vụ">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
    </div>
  `).join("");
}

function openAssignRoleModal() {
  const modal = document.getElementById("assignRoleModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const sel = document.getElementById("roleAssignStudentSelect");
  if (sel) {
    sel.innerHTML = appState.students.map(s => `<option value="${s.id}">${s.hoTen} (${s.to} - Hiện tại: ${s.chucVu})</option>`).join("");
  }
}

function openAssignRoleModalForStudent(studentId) {
  openAssignRoleModal();
  const sel = document.getElementById("roleAssignStudentSelect");
  if (sel) sel.value = studentId;
}

function closeAssignRoleModal() {
  const modal = document.getElementById("assignRoleModal");
  if (modal) modal.classList.add("hidden");
}

function submitAssignRole() {
  const stId = document.getElementById("roleAssignStudentSelect").value;
  const newRole = document.getElementById("roleAssignRoleSelect").value;

  const st = appState.students.find(s => s.id === stId);
  if (!st) return;

  st.chucVu = newRole;
  saveStateToLocal();
  renderCurrentOfficers();
  renderStudentCards(appState.students);
  closeAssignRoleModal();

  alert(`Đã bổ nhiệm học sinh [${st.hoTen}] giữ chức vụ: [${newRole}]!`);
}

function changeGvcnPassword() {
  const oldPass = prompt("Nhập mật khẩu hiện tại của Thầy:");
  const curSaved = localStorage.getItem("10A12_GVCN_PASSWORD") || "123456";
  if (oldPass !== curSaved) {
    alert("Mật khẩu hiện tại không đúng!");
    return;
  }
  const newPass = prompt("Nhập mật khẩu mới:");
  if (newPass && newPass.trim().length >= 6) {
    localStorage.setItem("10A12_GVCN_PASSWORD", newPass.trim());
    alert("Đã đổi mật khẩu GVCN thành công!");
  } else {
    alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
  }
}

function renderStudentPortal() {
  if (!appState.currentUser || !appState.currentUser.studentId) return;
  const st = appState.students.find(s => s.id === appState.currentUser.studentId);
  if (!st) return;

  const nameEl = document.getElementById("studentPortalName");
  const subEl = document.getElementById("studentPortalSub");
  if (nameEl) nameEl.innerText = `${st.hoTen}`;
  if (subEl) subEl.innerText = `${st.to} • Chức vụ: ${st.chucVu || "Thành viên"}`;
  
  const scoreEl = document.getElementById("studentPortalScore");
  if (scoreEl) {
    const pts = st.diemThiDua || 100;
    scoreEl.innerText = `${pts}đ`;
    scoreEl.className = `text-3xl font-black ${pts >= 90 ? 'text-emerald-700' : (pts >= 70 ? 'text-sky-700' : 'text-amber-700')}`;
  }

  let seatFound = "Chưa xếp chỗ";
  currentSeatingLayout.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && cell.name && st.hoTen.includes(cell.name)) {
        seatFound = `Dãy ${Math.floor(c / 2) + 1} • Bàn ${6 - r} • Ghế ${c % 2 === 0 ? "Trái" : "Phải"}`;
      }
    });
  });
  const seatEl = document.getElementById("studentPortalSeat");
  if (seatEl) seatEl.innerText = seatFound;

  const curCampaign = appState.campaigns.find(c => c.id === appState.currentCampaignId);
  const curTarget = curCampaign ? curCampaign.target : 100000;
  const pay = appState.fundPayments.find(p => p.campaignId === appState.currentCampaignId && p.studentId === st.id);
  const isPaid = pay ? pay.isPaid : false;

  const fundEl = document.getElementById("studentPortalFund");
  if (fundEl) {
    fundEl.innerHTML = isPaid 
      ? `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-check mr-1"></i>Đã đóng đủ (${curTarget.toLocaleString()}đ)</span>`
      : `<span class="text-rose-600 font-bold"><i class="fa-solid fa-clock mr-1"></i>Chưa nộp (${curTarget.toLocaleString()}đ)</span>`;
  }

  renderMyLettersHistory();
}

function submitStudentLetterForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!appState.currentUser || !appState.currentUser.studentId) return;

  const isAnonymous = document.getElementById("letterAnonymousCheck").checked;
  const category = document.getElementById("letterCategorySelect").value;
  const title = document.getElementById("letterTitleInput").value.trim();
  const content = document.getElementById("letterContentInput").value.trim();

  if (!content) {
    alert("Vui lòng nhập nội dung tâm tư!");
    return;
  }

  const newLetter = {
    id: `THU_${Date.now()}`,
    time: new Date().toLocaleString("vi-VN"),
    senderName: isAnonymous ? "🔒 Ẩn danh bảo mật" : appState.currentUser.fullName,
    studentId: isAnonymous ? "ANONYMOUS" : appState.currentUser.studentId,
    category,
    title: title || "Tâm tư gửi Thầy",
    content,
    status: "Chưa đọc",
    teacherReply: ""
  };

  appState.letters.unshift(newLetter);
  saveStateToLocal();
  renderStudentPortal();

  document.getElementById("letterTitleInput").value = "";
  document.getElementById("letterContentInput").value = "";
  alert("Thư tâm sự của em đã được gửi an toàn tới Thầy chủ nhiệm!");
}

function renderMyLettersHistory() {
  const container = document.getElementById("myLettersHistoryList");
  if (!container || !appState.currentUser) return;

  const myLetters = appState.letters.filter(l => l.studentId === appState.currentUser.studentId);
  if (myLetters.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">Em chưa gửi thư tâm sự nào.</p>`;
    return;
  }

  container.innerHTML = myLetters.map(l => `
    <div class="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 text-xs">
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-800">${l.title}</span>
        <span class="text-[10px] text-slate-400 font-mono">${l.time}</span>
      </div>
      <p class="text-slate-600">${l.content}</p>
      ${l.teacherReply ? `
        <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 mt-1">
          <b>Thầy phản hồi:</b> ${l.teacherReply}
        </div>
      ` : `<span class="text-[10px] text-amber-600 italic">Thầy đã nhận được thư và sẽ sớm nhắn lại em nhé!</span>`}
    </div>
  `).join("");
}

function openManageCampaignsModal() {
  const modal = document.getElementById("manageCampaignsModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const container = document.getElementById("campaignManageList");
  if (!container) return;

  container.innerHTML = appState.campaigns.map(c => `
    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between">
      <div>
        <b class="text-slate-900">${c.title}</b>
        <span class="text-[10px] text-slate-500 block">Định mức: ${Number(c.target || 0).toLocaleString()}đ</span>
      </div>
      ${appState.roleLevel === "GVCN" ? `
        <button onclick="deleteFundCampaign('${c.id}')" class="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 font-bold text-[10px]">
          <i class="fa-solid fa-trash-can mr-1"></i> Xóa đợt này
        </button>
      ` : ''}
    </div>
  `).join("");
}

function closeManageCampaignsModal() {
  const modal = document.getElementById("manageCampaignsModal");
  if (modal) modal.classList.add("hidden");
}

function deleteFundCampaign(campaignId) {
  if (appState.campaigns.length <= 1) {
    alert("Cần giữ lại ít nhất 1 đợt thu trong hệ thống!");
    return;
  }
  const c = appState.campaigns.find(x => x.id === campaignId);
  if (!confirm(`Xác nhận xóa đợt thu [${c ? c.title : campaignId}]?`)) return;

  appState.campaigns = appState.campaigns.filter(x => x.id !== campaignId);
  appState.fundPayments = appState.fundPayments.filter(x => x.campaignId !== campaignId);
  if (appState.currentCampaignId === campaignId) {
    appState.currentCampaignId = appState.campaigns[0].id;
  }

  saveStateToLocal();
  renderFundCampaigns();
  renderFundChecklist();
  openManageCampaignsModal();
  alert("Đã xóa đợt thu thành công!");
}

function exportSemesterSummaryExcel() {
  let csv = "STT,Mã HS,Họ và Tên,Tổ,Chức Vụ,Điểm TB Rèn Luyện,Xếp Loại TT22\n";
  appState.students.forEach((s, idx) => {
    const pts = Number(s.diemThiDua) || 100;
    const rank = getTT22Label(pts);
    csv += `${idx + 1},"${s.id}","${s.hoTen}","${s.to}","${s.chucVu}",${pts},"${rank}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Bang_Diem_Ren_Luyen_10A12_HK1_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function downloadBackupJson() {
  const backupData = {
    exportDate: new Date().toISOString(),
    class: "10A12 (K58-QT)",
    teacher: "ThS. Trần Dương Quốc Mẫn",
    students: appState.students,
    violations: appState.violations,
    campaigns: appState.campaigns,
    fundPayments: appState.fundPayments,
    cashbook: appState.cashbook,
    auditLogs: appState.auditLogs,
    dutyAssignments: appState.dutyAssignments,
    volunteerLaborList: appState.volunteerLaborList,
    vtmEvents: appState.vtmEvents,
    seatingLayout: currentSeatingLayout,
    weeklyArchives: appState.weeklyArchives || {}
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Backup_SoChuNhiem_10A12_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function handleRestoreBackupJson(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.students) appState.students = data.students;
      if (data.violations) appState.violations = data.violations;
      if (data.campaigns) appState.campaigns = data.campaigns;
      if (data.fundPayments) appState.fundPayments = data.fundPayments;
      if (data.cashbook) appState.cashbook = data.cashbook;
      if (data.auditLogs) appState.auditLogs = data.auditLogs;
      if (data.dutyAssignments) appState.dutyAssignments = data.dutyAssignments;
      if (data.volunteerLaborList) appState.volunteerLaborList = data.volunteerLaborList;
      if (data.vtmEvents) appState.vtmEvents = data.vtmEvents;
      if (data.seatingLayout) currentSeatingLayout = data.seatingLayout;
      if (data.weeklyArchives) appState.weeklyArchives = data.weeklyArchives;

      saveStateToLocal();
      renderAllSections();
      alert("🎉 Đã phục hồi dữ liệu lớp 10A12 thành công từ tệp sao lưu!");
    } catch (err) {
      alert("Lỗi: Tệp JSON sao lưu không hợp lệ!");
    }
  };
  reader.readAsText(file);
}