/**
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ QUỸ LỚP, HỒ SƠ 45 HS, TÂM TƯ & CÀI ĐẶT
 */

function canModifyFund() {
  return appState.roleLevel === "GVCN" || appState.roleLevel === "TREASURER";
}

function escapeCsvCell(val) {
  let str = String(val === null || val === undefined ? "" : val);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function getNextStudentId() {
  let maxNum = 0;
  appState.students.forEach(s => {
    const m = String(s.id || "").match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  });
  const next = maxNum + 1;
  return "HS" + (next < 10 ? "0" + next : String(next));
}

function buildLoginUsername(fullName, fallbackId) {
  if (typeof removeVietnameseTones === "function" && fullName) {
    const normalized = removeVietnameseTones(fullName)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(".");
    if (normalized) return `${normalized}.k58qt`;
  }
  return fallbackId;
}

function recalculateFundSummary() {
  let totalIncome = 0;
  appState.fundPayments.forEach(p => {
    if (p.isPaid) {
      const camp = appState.campaigns.find(c => c.id === p.campaignId);
      const campTarget = camp ? parseScore(camp.target, 0) : 100000;
      const paid = parseScore(p.amountPaid, 0);
      totalIncome += (paid > 0 ? paid : campTarget);
    }
  });

  let totalExpense = 0;
  appState.cashbook.forEach(tx => {
    const status = tx.status || "DA_DUYET";
    if (status === "DA_DUYET") {
      const amt = parseScore(tx.amount, 0);
      if (tx.type === "CHI") totalExpense += amt;
      else totalIncome += amt;
    }
  });

  appState.fundSummary = { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

function renderFundCampaigns() {
  const select = document.getElementById("campaignSelect");
  if (!select) return;

  if (!Array.isArray(appState.campaigns) || appState.campaigns.length === 0) {
    appState.campaigns = [{ id: "KY1_100K", title: "Quỹ lớp Học kỳ I", target: 100000, status: "Đang thu" }];
  }

  select.innerHTML = appState.campaigns.map(c => `
    <option value="${escapeAttr(c.id)}">${escapeHtml(c.title)} (${parseScore(c.target, 0).toLocaleString()}đ)</option>
  `).join("");

  const hasCurrent = appState.campaigns.some(c => c.id === appState.currentCampaignId);
  appState.currentCampaignId = hasCurrent ? appState.currentCampaignId : appState.campaigns[0].id;
  select.value = appState.currentCampaignId;
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

  let studentFundTotal = 0;
  appState.fundPayments.forEach(p => {
    if (p.isPaid) {
      const c = appState.campaigns.find(item => item.id === p.campaignId);
      const t = c ? parseScore(c.target, 0) : 100000;
      const paid = parseScore(p.amountPaid, 0);
      studentFundTotal += (paid > 0 ? paid : t);
    }
  });
  let extraSupportTotal = 0;
  appState.cashbook.forEach(tx => {
    if ((tx.status || "DA_DUYET") === "DA_DUYET" && String(tx.type || "").toUpperCase() === "THU") {
      extraSupportTotal += parseScore(tx.amount, 0);
    }
  });

  const curCamp = appState.campaigns.find(c => c.id === appState.currentCampaignId);
  const campTarget = curCamp ? parseScore(curCamp.target, 0) : 100000;
  const paymentsForCampaign = appState.fundPayments.filter(p => p.campaignId === appState.currentCampaignId);
  const paidItems = paymentsForCampaign.filter(p => p.isPaid);
  const campCollected = paidItems.reduce((sum, p) => {
    const amt = parseScore(p.amountPaid, 0);
    return sum + (amt > 0 ? amt : campTarget);
  }, 0);

  if (countEl) {
    const extraTxt = extraSupportTotal > 0
      ? ` • Thu/Ủng hộ thêm: +${extraSupportTotal.toLocaleString()}đ (Tổng HS: ${studentFundTotal.toLocaleString()}đ)`
      : "";
    countEl.innerText = `Đã thu: ${paidItems.length}/${appState.students.length} HS (${campCollected.toLocaleString()}đ)${extraTxt}`;
  }

  const grid = document.getElementById("fundStudentGrid");
  if (!grid) return;

  const canEditFund = canModifyFund();

  grid.innerHTML = appState.students.map(st => {
    const pay = paymentsForCampaign.find(p => p.studentId === st.id);
    const isPaid = pay ? Boolean(pay.isPaid) : false;

    return `
      <div class="p-2.5 rounded-xl bg-white border ${isPaid ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200"} flex items-center justify-between">
        <div class="flex items-center gap-2">
          <input type="checkbox" ${isPaid ? "checked" : ""} ${canEditFund ? "" : "disabled cursor-not-allowed opacity-50"} onchange="toggleFundLocal('${escapeAttr(st.id)}', this.checked)" class="w-4 h-4 accent-emerald-600 rounded cursor-pointer">
          <div>
            <p class="text-xs font-bold text-slate-800 leading-tight">${escapeHtml(st.hoTen)}</p>
            <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(st.id)} • ${escapeHtml(st.to)}</span>
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
  const canDelete = canModifyFund();

  container.innerHTML = appState.cashbook.map(tx => {
    const status = tx.status || "DA_DUYET";
    const isApproved = (status === "DA_DUYET");
    const isPending = (status === "CHO_DUYET");
    const amt = parseScore(tx.amount, 0);

    let badge = "";
    if (isApproved) badge = `<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200"><i class="fa-solid fa-circle-check mr-1"></i>Đã duyệt</span>`;
    else if (isPending) badge = `<span class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200"><i class="fa-solid fa-clock mr-1"></i>Chờ GVCN duyệt</span>`;
    else badge = `<span class="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">Từ chối</span>`;

    const isIncome = String(tx.type || "CHI").toUpperCase() !== "CHI";
    const typePill = isIncome
      ? `<span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300">+ THU / ỦNG HỘ</span>`
      : `<span class="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px] border border-rose-300">- PHIẾU CHI</span>`;

    return `
      <div class="p-3 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-1.5">
            ${typePill}
            <span class="text-xs font-black text-slate-800">${escapeHtml(tx.category)}</span>
            ${badge}
          </div>
          <p class="text-[11px] text-slate-600">${escapeHtml(tx.note)} <span class="text-slate-400 font-mono">(${escapeHtml(tx.time)} • ${escapeHtml(tx.author)})</span></p>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-auto">
          <span class="text-sm font-black ${tx.type === 'CHI' ? 'text-rose-600' : 'text-emerald-700'} font-mono">
            ${tx.type === 'CHI' ? '-' : '+'}${amt.toLocaleString()}đ
          </span>
          ${isGVCN && isPending ? `
            <button onclick="approveExpenseLocal('${escapeAttr(tx.code)}', 'DA_DUYET')" class="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100">Duyệt</button>
            <button onclick="approveExpenseLocal('${escapeAttr(tx.code)}', 'TU_CHOI')" class="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100">Hủy</button>
          ` : ""}
          ${canDelete ? `
            <button onclick="deleteFundTransaction('${escapeAttr(tx.code)}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Xóa giao dịch này">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }).join("");
}

async function approveExpenseLocal(code, status) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền duyệt hoặc từ chối phiếu chi!");
    return;
  }
  const tx = appState.cashbook.find(t => t.code === code);
  if (!tx) return;

  const actor = appState.currentUser ? appState.currentUser.fullName : "GVCN";
  tx.status = status;
  appState.auditLogs.unshift({
    time: new Date().toLocaleString("vi-VN"),
    code: code,
    action: status === "DA_DUYET" ? "DUYỆT CHI" : "TỪ CHỐI",
    author: actor,
    amount: tx.amount,
    detail: `Cập nhật trạng thái phiếu ${tx.category}`
  });
  saveStateToLocal();
  renderFundChecklist();
  await callApi("approveFundExpense", { code, status, author: actor });
  alert(`Đã cập nhật trạng thái phiếu chi: ${status === "DA_DUYET" ? "Đã duyệt" : "Từ chối"}!`);
}

async function deleteFundTransaction(code) {
  if (!canModifyFund()) {
    alert("Bạn không có quyền xóa giao dịch quỹ!");
    return;
  }
  const tx = appState.cashbook.find(t => t.code === code);
  if (!tx) return;

  const reason = prompt(`Xác nhận xóa giao dịch [${tx.category} - ${parseScore(tx.amount, 0).toLocaleString()}đ]?\nNhập lý do xóa (để lưu nhật ký kiểm toán):`, "Ghi nhầm số tiền");
  if (reason === null) return;

  const actor = appState.currentUser ? appState.currentUser.fullName : "Thủ quỹ / GVCN";
  appState.auditLogs.unshift({
    time: new Date().toLocaleString("vi-VN"),
    code: tx.code,
    action: "XÓA GIAO DỊCH",
    author: actor,
    amount: tx.amount,
    detail: `Lý do: ${reason}`
  });

  appState.cashbook = appState.cashbook.filter(t => t.code !== code);
  saveStateToLocal();
  renderFundChecklist();
  await callApi("deleteFundTransaction", { code, reason, author: actor });
  alert("Đã xóa giao dịch và ghi nhận vào Nhật ký kiểm toán!");
}

function toggleFundLocal(studentId, isChecked) {
  if (!canModifyFund()) {
    alert("Chỉ GVCN hoặc Thủ quỹ mới có quyền cập nhật thu quỹ!");
    return;
  }
  const camp = appState.campaigns.find(c => c.id === appState.currentCampaignId);
  const target = camp ? parseScore(camp.target, 0) : 100000;

  const pay = appState.fundPayments.find(p => p.campaignId === appState.currentCampaignId && p.studentId === studentId);
  if (pay) {
    pay.isPaid = Boolean(isChecked);
    pay.amountPaid = isChecked ? target : 0;
  } else {
    appState.fundPayments.push({
      campaignId: appState.currentCampaignId,
      studentId: studentId,
      isPaid: Boolean(isChecked),
      amountPaid: isChecked ? target : 0
    });
  }
  saveStateToLocal();
  renderFundChecklist();
}

async function saveCurrentFundState() {
  if (!canModifyFund()) {
    alert("Chỉ GVCN hoặc Thủ quỹ mới có quyền đồng bộ quỹ lớp!");
    return;
  }
  saveStateToLocal();
  const camp = appState.campaigns.find(c => c.id === appState.currentCampaignId);
  const target = camp ? parseScore(camp.target, 0) : 100000;
  const actor = appState.currentUser ? appState.currentUser.fullName : "Thủ quỹ";

  const currentPayments = appState.students.map(st => {
    const pay = appState.fundPayments.find(p => p.campaignId === appState.currentCampaignId && p.studentId === st.id);
    const isPaid = pay ? Boolean(pay.isPaid) : false;
    const paidAmt = isPaid ? (parseScore(pay.amountPaid, 0) || target) : 0;
    return {
      studentId: st.id,
      studentName: st.hoTen,
      isPaid,
      amountPaid: paidAmt
    };
  });

  const res = await callApi("saveFundPaymentBatch", {
    campaignId: appState.currentCampaignId,
    payments: currentPayments,
    author: actor
  });
  alert(res.status === "success" ? "Đã đồng bộ quỹ lớp lên Google Sheets!" : "Đã lưu trạng thái quỹ vào bộ nhớ máy!");
}

function openNewCampaignModal() {
  if (!canModifyFund()) {
    alert("Chỉ GVCN hoặc Thủ quỹ mới có quyền tạo đợt thu quỹ!");
    return;
  }
  document.getElementById("newCampaignModal").classList.remove("hidden");
}
function closeNewCampaignModal() {
  document.getElementById("newCampaignModal").classList.add("hidden");
}

async function submitNewCampaign() {
  if (!canModifyFund()) return;
  const title = document.getElementById("campaignTitleInput").value.trim();
  const target = parseScore(document.getElementById("campaignTargetInput").value, 0);

  if (!title) {
    alert("Vui lòng nhập tên đợt thu!");
    return;
  }

  const newId = `KY_${Date.now()}`;
  const actor = appState.currentUser ? appState.currentUser.fullName : "Thủ quỹ";
  appState.campaigns.push({ id: newId, title, target, status: "Đang thu" });
  appState.currentCampaignId = newId;

  saveStateToLocal();
  renderFundCampaigns();
  renderFundChecklist();
  closeNewCampaignModal();
  await callApi("createFundCampaign", { id: newId, title, target, author: actor });
  alert("Đã khởi tạo đợt thu quỹ mới thành công!");
}

function openAddExpenseModal() {
  if (!canModifyFund()) {
    alert("Chỉ GVCN hoặc Thủ quỹ mới có quyền lập phiếu chi!");
    return;
  }
  document.getElementById("addExpenseModal").classList.remove("hidden");
}
function closeAddExpenseModal() {
  document.getElementById("addExpenseModal").classList.add("hidden");
}

function openAddIncomeModal() {
  if (!canModifyFund()) {
    alert("Chỉ GVCN hoặc Thủ quỹ mới có quyền ghi nhận thu ủng hộ / tài trợ!");
    return;
  }
  const donorInput = document.getElementById("incomeDonorInput");
  if (donorInput && !donorInput.value) {
    donorInput.value = appState.roleLevel === "GVCN"
      ? "ThS. Trần Dương Quốc Mẫn (GVCN)"
      : (appState.currentUser ? appState.currentUser.fullName : "GVCN / Phụ huynh");
  }
  const modal = document.getElementById("addIncomeModal");
  if (modal) modal.classList.remove("hidden");
}
function closeAddIncomeModal() {
  const modal = document.getElementById("addIncomeModal");
  if (modal) modal.classList.add("hidden");
}

async function submitCashbookTransaction({ type, category, amount, note, author, auditAction, onClose, successApprovedMsg, successPendingMsg }) {
  if (!canModifyFund()) return null;
  if (amount <= 0) {
    alert(type === "THU" ? "Số tiền thu / ủng hộ phải lớn hơn 0 đ!" : "Số tiền chi phải lớn hơn 0 đ!");
    return null;
  }
  if (!note) {
    alert("Vui lòng nhập nội dung chi tiết!");
    return null;
  }

  const isGVCN = (appState.roleLevel === "GVCN");
  const defaultStatus = isGVCN ? "DA_DUYET" : "CHO_DUYET";
  const prefix = type === "THU" ? "THU" : "CHI";

  const newTx = {
    code: `${prefix}_${Date.now()}`,
    time: new Date().toLocaleDateString("vi-VN"),
    type,
    category,
    amount,
    author: author || (appState.currentUser ? appState.currentUser.fullName : "Thủ quỹ lớp"),
    note,
    status: defaultStatus
  };

  appState.cashbook.unshift(newTx);
  appState.auditLogs.unshift({
    time: new Date().toLocaleString("vi-VN"),
    code: newTx.code,
    action: auditAction,
    author: newTx.author,
    amount: newTx.amount,
    detail: `Khoản mục: ${category} - ${note}`
  });

  saveStateToLocal();
  renderFundChecklist();
  if (typeof renderOverviewDashboard === "function") renderOverviewDashboard();
  if (typeof onClose === "function") onClose();

  await callApi("saveFundExpense", newTx);
  alert(isGVCN ? successApprovedMsg : successPendingMsg);
  return newTx;
}

async function submitAddExpense() {
  const category = document.getElementById("expenseCategorySelect").value;
  const amount = parseScore(document.getElementById("expenseAmountInput").value, 0);
  const note = document.getElementById("expenseNoteInput").value.trim();

  await submitCashbookTransaction({
    type: "CHI",
    category,
    amount,
    note,
    author: appState.currentUser ? appState.currentUser.fullName : "Thủ quỹ lớp",
    auditAction: "LẬP PHIẾU CHI",
    onClose: closeAddExpenseModal,
    successApprovedMsg: "Đã lập phiếu chi và xuất quỹ thành công!",
    successPendingMsg: "Đã gửi phiếu chi! Đang chờ Thầy chủ nhiệm duyệt."
  });
}

async function submitAddIncome() {
  const categoryEl = document.getElementById("incomeCategorySelect");
  const amountEl = document.getElementById("incomeAmountInput");
  const noteEl = document.getElementById("incomeNoteInput");
  const donorEl = document.getElementById("incomeDonorInput");

  const category = categoryEl ? categoryEl.value : "GVCN ủng hộ thêm";
  const amount = parseScore(amountEl ? amountEl.value : 0, 0);
  const note = noteEl ? noteEl.value.trim() : "";
  const donor = donorEl ? donorEl.value.trim() : "";

  const tx = await submitCashbookTransaction({
    type: "THU",
    category,
    amount,
    note,
    author: donor || (appState.currentUser ? appState.currentUser.fullName : "GVCN"),
    auditAction: "LẬP PHIẾU THU ỦNG HỘ",
    onClose: closeAddIncomeModal,
    successApprovedMsg: "Đã ghi nhận khoản thu / ủng hộ vào Sổ Cái Quỹ lớp & đồng bộ!",
    successPendingMsg: "Đã lập phiếu thu ủng hộ! Đang chờ GVCN duyệt cộng vào tồn quỹ."
  });
  if (tx) {
    if (amountEl) amountEl.value = "";
    if (noteEl) noteEl.value = "";
  }
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
      container.innerHTML = appState.auditLogs.map(l => {
        const msg = l.detail || l.note || "";
        const amt = parseScore(l.amount, 0);
        const amtHtml = amt > 0 ? ` • <b>${amt.toLocaleString()}đ</b>` : "";
        return `
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-800">${escapeHtml(l.action)} (${escapeHtml(l.code)})</span>
              <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(l.time)}</span>
            </div>
            <p class="text-[11px] text-slate-600">${escapeHtml(msg)}${amtHtml}</p>
            <span class="text-[10px] text-indigo-600 block">Thực hiện: ${escapeHtml(l.author)}</span>
          </div>
        `;
      }).join("");
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
    const score = parseScore(st.diemThiDua, 100);
    const scoreColor = score >= 90
      ? "text-emerald-700 bg-emerald-100/80 border border-emerald-200"
      : (score >= 70 ? "text-amber-700 bg-amber-100/80 border border-amber-200" : "text-rose-700 bg-rose-100/80 border border-rose-200");
    const lastWord = String(st.hoTen || "").trim().split(/\s+/).pop() || "H";
    const initial = lastWord.charAt(0).toUpperCase();
    const avatarGrad = st.to === "Tổ 1"
      ? "from-sky-500 to-blue-700"
      : (st.to === "Tổ 2"
        ? "from-violet-500 to-indigo-700"
        : (st.to === "Tổ 3" ? "from-emerald-500 to-teal-700" : "from-amber-500 to-orange-600"));
    const cardAccent = st.to === "Tổ 1"
      ? "border-sky-200 bg-gradient-to-br from-white to-sky-50/40 hover:border-sky-400"
      : (st.to === "Tổ 2"
        ? "border-violet-200 bg-gradient-to-br from-white to-violet-50/40 hover:border-violet-400"
        : (st.to === "Tổ 3"
          ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 hover:border-emerald-400"
          : "border-amber-200 bg-gradient-to-br from-white to-amber-50/40 hover:border-amber-400"));

    return `
      <div class="p-3.5 rounded-2xl border ${cardAccent} flex flex-col justify-between gap-3 transition shadow-xs">
        <div class="flex items-start justify-between gap-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr ${avatarGrad} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
              ${escapeHtml(initial)}
            </div>
            <div class="min-w-0">
              <h3 class="text-xs sm:text-sm font-black text-slate-800 truncate">${escapeHtml(st.hoTen)}</h3>
              <p class="text-[10px] text-slate-500 font-mono mt-0.5">
                <span>${escapeHtml(st.id)}</span> • <span>${escapeHtml(st.to)}</span>
                ${st.chucVu && st.chucVu !== "Thành viên" ? `• <span class="text-sky-700 font-bold">${escapeHtml(st.chucVu)}</span>` : ""}
              </p>
            </div>
          </div>
          <span class="text-xs font-black px-2 py-0.5 rounded-lg ${scoreColor} shrink-0">
            ${score}đ
          </span>
        </div>

        <button onclick="openStudentDetailModal('${escapeAttr(st.id)}')" class="w-full py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-address-card text-sky-600"></i>
          <span>Xem lý lịch chi tiết</span>
        </button>
      </div>
    `;
  }).join("");
}

function handleSearchStudent(query) {
  const q = String(query || "").toLowerCase().trim();
  const isGVCN = (appState.roleLevel === "GVCN");
  const selfId = appState.currentUser ? appState.currentUser.studentId : "";

  const filtered = appState.students.filter(s => {
    const canSeeCccd = isGVCN || (selfId && s.id === selfId);
    return (
      String(s.hoTen || "").toLowerCase().includes(q) ||
      String(s.id || "").toLowerCase().includes(q) ||
      (canSeeCccd && s.soCCCD && String(s.soCCCD).includes(q)) ||
      String(s.to || "").toLowerCase().includes(q)
    );
  });
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

  const isGVCN = (appState.roleLevel === "GVCN");
  const isSelf = Boolean(appState.currentUser && appState.currentUser.studentId === st.id);
  const canSeePii = isGVCN || isSelf;

  const btnDel = document.getElementById("btnDeleteStudent");
  const btnSave = document.getElementById("btnSaveStudentChanges");
  if (btnDel) btnDel.classList.toggle("hidden", !isGVCN);
  if (btnSave) btnSave.classList.toggle("hidden", !isGVCN);

  const maskPlaceholder = "(Ẩn theo quyền bảo mật)";
  const formEl = document.getElementById("modalStudentForm");
  if (formEl) {
    formEl.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-slate-500 block mb-1">Họ và tên:</label>
          <input type="text" id="detailStudentName" value="${escapeAttr(st.hoTen)}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Tổ sinh hoạt:</label>
          <select id="detailStudentTeam" ${isGVCN ? "" : "disabled"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
            <option value="Tổ 1" ${st.to === "Tổ 1" ? "selected" : ""}>Tổ 1</option>
            <option value="Tổ 2" ${st.to === "Tổ 2" ? "selected" : ""}>Tổ 2</option>
            <option value="Tổ 3" ${st.to === "Tổ 3" ? "selected" : ""}>Tổ 3</option>
            <option value="Tổ 4" ${st.to === "Tổ 4" ? "selected" : ""}>Tổ 4</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="text-slate-500 block mb-1">Chức vụ cán sự:</label>
          <input type="text" id="detailStudentRole" value="${escapeAttr(st.chucVu || "Thành viên")}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Số thẻ CCCD:</label>
          <input type="text" id="detailStudentCCCD" value="${escapeAttr(canSeePii ? (st.soCCCD || "") : maskPlaceholder)}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Ngày cấp CCCD:</label>
          <input type="text" id="detailStudentIssueDate" value="${escapeAttr(canSeePii ? (st.ngayCapCCCD || "") : maskPlaceholder)}" placeholder="dd/mm/yyyy" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-slate-500 block mb-1">Họ tên Ba:</label>
          <input type="text" id="detailStudentFatherName" value="${escapeAttr(canSeePii ? (st.tenBa || "") : maskPlaceholder)}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">SĐT Ba:</label>
          <input type="text" id="detailStudentFatherPhone" value="${escapeAttr(canSeePii ? (st.sdtBa || "") : maskPlaceholder)}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">Họ tên Mẹ:</label>
          <input type="text" id="detailStudentMotherName" value="${escapeAttr(canSeePii ? (st.tenMe || "") : maskPlaceholder)}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
        </div>
        <div>
          <label class="text-slate-500 block mb-1">SĐT Mẹ:</label>
          <input type="text" id="detailStudentMotherPhone" value="${escapeAttr(canSeePii ? (st.sdtMe || "") : maskPlaceholder)}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800">
        </div>
      </div>

      <div>
        <label class="text-slate-500 block mb-1">Địa chỉ thường trú:</label>
        <input type="text" id="detailStudentAddress" value="${escapeAttr(canSeePii ? (st.diaChi || "Tây Sơn, Gia Lai") : maskPlaceholder)}" ${isGVCN ? "" : "readonly"} class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
      </div>
    `;
  }
}

function closeStudentModal() {
  const modal = document.getElementById("studentDetailModal");
  if (modal) modal.classList.add("hidden");
}

async function saveStudentProfileChanges() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền chỉnh sửa hồ sơ học sinh!");
    return;
  }
  const st = appState.selectedStudentForDetail;
  if (!st) return;

  const newName = document.getElementById("detailStudentName").value.trim();
  if (!newName) {
    alert("Họ tên học sinh không được để trống!");
    return;
  }

  st.hoTen = newName;
  st.to = document.getElementById("detailStudentTeam").value;
  st.chucVu = document.getElementById("detailStudentRole").value.trim() || "Thành viên";
  st.soCCCD = document.getElementById("detailStudentCCCD").value.trim();
  const issueEl = document.getElementById("detailStudentIssueDate");
  if (issueEl) st.ngayCapCCCD = issueEl.value.trim();
  st.tenBa = document.getElementById("detailStudentFatherName").value.trim();
  st.sdtBa = document.getElementById("detailStudentFatherPhone").value.trim();
  st.tenMe = document.getElementById("detailStudentMotherName").value.trim();
  st.sdtMe = document.getElementById("detailStudentMotherPhone").value.trim();
  st.diaChi = document.getElementById("detailStudentAddress").value.trim();

  saveStateToLocal();
  renderAllSections();
  closeStudentModal();

  await callApi("updateStudentProfile", {
    id: st.id,
    hoTen: st.hoTen,
    to: st.to,
    chucVu: st.chucVu,
    soCCCD: st.soCCCD,
    ngayCapCCCD: st.ngayCapCCCD,
    tenBa: st.tenBa,
    sdtBa: st.sdtBa,
    tenMe: st.tenMe,
    sdtMe: st.sdtMe,
    diaChi: st.diaChi
  }, "POST");

  alert("Đã cập nhật và đồng bộ hồ sơ học sinh thành công!");
}

async function deleteCurrentModalStudent() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền xóa học sinh khỏi lớp!");
    return;
  }
  const st = appState.selectedStudentForDetail;
  if (!st) return;

  if (!confirm(`Xác nhận xóa học sinh [${st.hoTen} - ${st.id}] khỏi danh sách lớp?`)) return;

  appState.students = appState.students.filter(s => s.id !== st.id);
  appState.fundPayments = appState.fundPayments.filter(p => p.studentId !== st.id);

  let seatChanged = false;
  if (Array.isArray(currentSeatingLayout)) {
    currentSeatingLayout.forEach(row => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, c) => {
        if (cell && (cell.studentId === st.id || (cell.name && cell.name.trim() === st.hoTen.trim()))) {
          row[c] = null;
          seatChanged = true;
        }
      });
    });
  }

  saveStateToLocal();
  renderAllSections();
  closeStudentModal();

  await callApi("deleteStudent", { id: st.id }, "POST");
  if (seatChanged && typeof buildSeatingSheetPayload === "function") {
    await callApi("saveSeatingChart", { layout: buildSeatingSheetPayload() }, "POST");
  }
  alert(`Đã xóa học sinh [${st.hoTen}] khỏi danh sách lớp!`);
}

function openAddNewStudentModal() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền tiếp nhận học sinh mới!");
    return;
  }
  document.getElementById("addStudentModal").classList.remove("hidden");
}
function closeAddNewStudentModal() {
  document.getElementById("addStudentModal").classList.add("hidden");
}

async function submitAddNewStudent() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền tiếp nhận học sinh mới!");
    return;
  }
  const name = document.getElementById("newStudentName").value.trim();
  const team = document.getElementById("newStudentTeam").value;
  const role = document.getElementById("newStudentRole").value.trim();
  const cccd = document.getElementById("newStudentCCCD").value.trim();
  const issueDate = document.getElementById("newStudentIssueDate") ? document.getElementById("newStudentIssueDate").value.trim() : "";

  if (!name) {
    alert("Vui lòng nhập họ tên học sinh!");
    return;
  }

  const nextId = getNextStudentId();
  const username = buildLoginUsername(name, nextId);
  const newSt = {
    id: nextId,
    hoTen: name,
    to: team,
    chucVu: role || "Thành viên",
    soCCCD: cccd,
    ngayCapCCCD: issueDate,
    tenDangNhap: username,
    taiKhoan: username,
    diemThiDua: 100
  };

  appState.students.push(newSt);
  saveStateToLocal();
  renderAllSections();
  closeAddNewStudentModal();

  document.getElementById("newStudentName").value = "";
  document.getElementById("newStudentRole").value = "Thành viên";
  document.getElementById("newStudentCCCD").value = "";
  if (document.getElementById("newStudentIssueDate")) document.getElementById("newStudentIssueDate").value = "";

  const res = await callApi("addNewStudent", newSt, "POST");
  if (res && res.status === "success" && res.studentId && res.studentId !== newSt.id) {
    newSt.id = res.studentId;
    saveStateToLocal();
    renderAllSections();
  }
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
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền nhập danh sách từ file Excel!");
    if (event && event.target) event.target.value = "";
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json && json.length > 0) {
        appState.students = json.map((row, idx) => {
          const stId = String(row["Mã HS"] || row["id"] || `HS${idx < 9 ? "0" : ""}${idx + 1}`).trim();
          const stName = String(row["Họ và Tên"] || row["hoTen"] || "Học sinh").trim();
          const existing = appState.students.find(old => old.id === stId);
          const taiKhoan = String(row["Tài khoản"] || row["taiKhoan"] || row["tenDangNhap"] || (existing && existing.tenDangNhap) || buildLoginUsername(stName, stId)).trim();

          return {
            id: stId,
            hoTen: stName,
            to: String(row["Tổ"] || row["to"] || "Tổ 1").trim(),
            chucVu: String(row["Chức Vụ"] || row["chucVu"] || "Thành viên").trim(),
            soCCCD: String(row["Số CCCD"] || row["soCCCD"] || "").trim(),
            ngayCapCCCD: String(row["Ngày Cấp CCCD"] || row["ngayCapCCCD"] || "").trim(),
            tenBa: String(row["Họ Tên Ba"] || row["tenBa"] || "").trim(),
            sdtBa: String(row["SĐT Ba"] || row["sdtBa"] || "").trim(),
            tenMe: String(row["Họ Tên Mẹ"] || row["tenMe"] || "").trim(),
            sdtMe: String(row["SĐT Mẹ"] || row["sdtMe"] || "").trim(),
            diaChi: String(row["Địa Chỉ"] || row["diaChi"] || "Tây Sơn, Gia Lai").trim(),
            tenDangNhap: taiKhoan,
            taiKhoan: taiKhoan,
            diemThiDua: parseScore(row["Điểm Thi Đua"] ?? row["diemThiDua"], existing ? parseScore(existing.diemThiDua, 100) : 100)
          };
        });

        saveStateToLocal();
        renderAllSections();
        const res = await callApi("saveAllStudentsBatch", { students: appState.students }, "POST");
        alert(res.status === "success"
          ? `Đã nạp và đồng bộ thành công ${appState.students.length} học sinh lên Google Sheets!`
          : `Đã nạp thành công ${appState.students.length} học sinh vào bộ nhớ máy!`);
      }
    } catch (err) {
      alert("Không thể đọc file Excel: " + err.message);
    } finally {
      if (event && event.target) event.target.value = "";
    }
  };
  reader.readAsArrayBuffer(file);
}

function exportStudentProfilesExcel() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền xuất danh sách hồ sơ chi tiết kèm CCCD!");
    return;
  }
  let csv = "Mã HS,Họ và Tên,Tổ,Chức Vụ,Số CCCD,Ngày Cấp CCCD,Điểm Thi Đua\n";
  appState.students.forEach(s => {
    const pts = parseScore(s.diemThiDua, 100);
    csv += [
      escapeCsvCell(s.id),
      escapeCsvCell(s.hoTen),
      escapeCsvCell(s.to),
      escapeCsvCell(s.chucVu || "Thành viên"),
      escapeCsvCell(s.soCCCD || ""),
      escapeCsvCell(s.ngayCapCCCD || ""),
      pts
    ].join(",") + "\n";
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

  if (appState.roleLevel !== "GVCN") {
    container.innerHTML = `<p class="text-xs text-slate-400 italic py-6 text-center">Nội dung bảo mật: Chỉ GVCN mới được xem Hòm thư tâm sự.</p>`;
    return;
  }

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
    <div class="p-4 rounded-2xl bg-white border ${l.status === "Chưa đọc" ? "border-amber-300 bg-amber-50/20" : "border-slate-200"} space-y-2 shadow-xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold text-[10px] border border-sky-200">${escapeHtml(l.category)}</span>
          <span class="text-xs font-black text-slate-800">${escapeHtml(l.senderName)}</span>
        </div>
        <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(l.time)}</span>
      </div>
      <h4 class="text-xs font-black text-slate-800">${escapeHtml(l.title)}</h4>
      <p class="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">${escapeHtml(l.content)}</p>

      ${l.teacherReply ? `
        <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <b>Lời nhắn của Thầy:</b> ${escapeHtml(l.teacherReply)}
        </div>
      ` : ""}

      <div class="pt-2 flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold ${l.status === "Chưa đọc" ? "text-amber-600" : "text-emerald-700"}">Trạng thái: ${escapeHtml(l.status)}</span>
        <button onclick="openReplyLetterModal('${escapeAttr(l.id)}')" class="px-3 py-1 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition">
          <i class="fa-solid fa-reply mr-1"></i> Tư vấn / Phản hồi
        </button>
      </div>
    </div>
  `).join("");
}

async function openReplyLetterModal(letterId) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền phản hồi thư tâm sự!");
    return;
  }
  const l = appState.letters.find(item => item.id === letterId);
  if (!l) return;

  const reply = prompt(`Nhập lời nhắn gửi đến học sinh [${l.senderName}]:`, l.teacherReply || "");
  if (reply !== null) {
    l.teacherReply = reply.trim();
    l.status = "Đã tư vấn";
    saveStateToLocal();
    renderTeacherLettersList();
    await callApi("updateLetterStatus", { letterId, status: "Đã tư vấn", teacherReply: l.teacherReply });
    alert("Đã lưu lời nhắn tư vấn tâm lý học sinh!");
  }
}

function renderSettingsTab() {
  renderCurrentOfficers();

  const cBody = document.getElementById("criteriaSettingList");
  if (cBody) {
    cBody.innerHTML = appState.criteriaList.map(c => `
      <div class="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg ${c.type === "CONG" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"} font-black text-[10px] flex items-center justify-center">${escapeHtml(c.code)}</span>
          <span class="text-slate-800 font-medium">${escapeHtml(c.name)}</span>
        </div>
        <span class="font-black ${c.type === "CONG" ? "text-emerald-700" : "text-rose-600"} font-mono">${c.points > 0 ? "+" : ""}${c.points}đ</span>
      </div>
    `).join("");
  }
}

function renderCurrentOfficers() {
  const container = document.getElementById("currentOfficersGrid");
  if (!container) return;

  const isGVCN = (appState.roleLevel === "GVCN");
  const officers = appState.students.filter(s => s.chucVu && s.chucVu !== "Thành viên");

  container.innerHTML = officers.map(o => `
    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
      <div>
        <b class="text-slate-800 block">${escapeHtml(o.hoTen)}</b>
        <span class="text-[10px] text-sky-700 font-bold">${escapeHtml(o.chucVu)} (${escapeHtml(o.to)})</span>
      </div>
      ${isGVCN ? `
        <button onclick="openAssignRoleModalForStudent('${escapeAttr(o.id)}')" class="text-slate-400 hover:text-indigo-600" title="Đổi chức vụ">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
      ` : ""}
    </div>
  `).join("");
}

function openAssignRoleModal() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền phân quyền ban cán sự!");
    return;
  }
  const modal = document.getElementById("assignRoleModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const sel = document.getElementById("roleAssignStudentSelect");
  if (sel) {
    sel.innerHTML = appState.students.map(s => `<option value="${escapeAttr(s.id)}">${escapeHtml(s.hoTen)} (${escapeHtml(s.to)} - Hiện tại: ${escapeHtml(s.chucVu)})</option>`).join("");
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

async function submitAssignRole() {
  if (appState.roleLevel !== "GVCN") return;
  const stId = document.getElementById("roleAssignStudentSelect").value;
  const newRole = document.getElementById("roleAssignRoleSelect").value;

  const st = appState.students.find(s => s.id === stId);
  if (!st) return;

  st.chucVu = newRole;
  saveStateToLocal();
  renderCurrentOfficers();
  renderStudentCards(appState.students);
  closeAssignRoleModal();

  await callApi("updateStudentProfile", { id: st.id, chucVu: newRole }, "POST");
  alert(`Đã bổ nhiệm học sinh [${st.hoTen}] giữ chức vụ: [${newRole}]!`);
}

async function changeGvcnPassword() {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền đổi mật khẩu chủ nhiệm!");
    return;
  }
  const oldPass = prompt("Nhập mật khẩu hiện tại của Thầy:");
  if (oldPass === null) return;

  const newPass = prompt("Nhập mật khẩu mới (tối thiểu 6 ký tự):");
  if (newPass === null) return;
  if (newPass.trim().length < 6) {
    alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
    return;
  }

  if (appState.authToken) {
    const res = await callApi("changeGvcnPassword", {
      oldPassword: oldPass.trim(),
      newPassword: newPass.trim()
    }, "POST");

    if (res && res.status === "success") {
      localStorage.setItem("10A12_GVCN_PASSWORD", newPass.trim());
      alert(res.message || "Đã đổi mật khẩu GVCN trên máy chủ thành công!");
      return;
    }
    if (res && res.status === "error") {
      alert(res.message || "Đổi mật khẩu thất bại!");
      return;
    }
  }

  const curSaved = localStorage.getItem("10A12_GVCN_PASSWORD") || "123456";
  if (oldPass.trim() !== curSaved) {
    alert("Mật khẩu hiện tại không đúng!");
    return;
  }
  localStorage.setItem("10A12_GVCN_PASSWORD", newPass.trim());
  alert("Đã lưu mật khẩu GVCN mới trên thiết bị (chế độ ngoại tuyến)!");
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
    const pts = parseScore(st.diemThiDua, 100);
    scoreEl.innerText = `${pts}đ`;
    scoreEl.className = `text-3xl font-black ${pts >= 90 ? "text-emerald-700" : (pts >= 70 ? "text-sky-700" : "text-amber-700")}`;
  }

  let seatFound = "Chưa xếp chỗ";
  const targetName = String(st.hoTen || "").trim().toLowerCase();
  if (Array.isArray(currentSeatingLayout)) {
    currentSeatingLayout.forEach((row, r) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, c) => {
        if (!cell) return;
        const cellIdMatch = cell.studentId && cell.studentId === st.id;
        const cellNameMatch = cell.name && String(cell.name).trim().toLowerCase() === targetName;
        if (cellIdMatch || cellNameMatch) {
          seatFound = `Dãy ${Math.floor(c / 2) + 1} • Bàn ${6 - r} • Ghế ${c % 2 === 0 ? "Trái" : "Phải"}`;
        }
      });
    });
  }
  const seatEl = document.getElementById("studentPortalSeat");
  if (seatEl) seatEl.innerText = seatFound;

  const dutyLabels = {
    T2_SANG: "Sáng Thứ 2",
    T2_CHIEU: "Chiều Thứ 2",
    T3_SANG: "Sáng Thứ 3",
    T3_CHIEU: "Chiều Thứ 3",
    T4_SANG: "Sáng Thứ 4",
    T5_SANG: "Sáng Thứ 5",
    T6_SANG: "Sáng Thứ 6"
  };
  const assignedKeys = Object.keys(dutyLabels).filter(key => {
    const slot = appState.dutyAssignments && appState.dutyAssignments[key];
    return slot && Array.isArray(slot.students) && slot.students.includes(st.id);
  });
  const laborEl = document.getElementById("studentPortalLabor");
  const laborStatusEl = document.getElementById("studentPortalLaborStatus");
  if (laborEl) {
    laborEl.innerText = assignedKeys.length > 0
      ? assignedKeys.map(k => dutyLabels[k]).join(", ")
      : "Chưa phân công ca tuần này";
  }
  if (laborStatusEl) {
    const pendingPenaltyCount = assignedKeys.filter(k => (appState.dutyAssignments[k] || {}).status === "CHUA_DAT").length;
    if (pendingPenaltyCount > 0) {
      laborStatusEl.className = "text-[11px] text-rose-700 font-bold";
      laborStatusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i>Cần trực bù ${pendingPenaltyCount} ca`;
    } else {
      laborStatusEl.className = "text-[11px] text-emerald-800 font-bold";
      laborStatusEl.innerHTML = `<i class="fa-solid fa-circle-check mr-1"></i>Không nợ ca trực`;
    }
  }

  const curCampaign = appState.campaigns.find(c => c.id === appState.currentCampaignId) || appState.campaigns[0];
  const curTarget = curCampaign ? parseScore(curCampaign.target, 0) : 100000;
  const campId = curCampaign ? curCampaign.id : appState.currentCampaignId;
  const pay = appState.fundPayments.find(p => p.campaignId === campId && p.studentId === st.id);
  const isPaid = pay ? Boolean(pay.isPaid) : false;
  const paidAmt = isPaid ? (parseScore(pay.amountPaid, 0) || curTarget) : curTarget;

  const fundEl = document.getElementById("studentPortalFund");
  if (fundEl) {
    fundEl.innerHTML = isPaid
      ? `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-check mr-1"></i>Đã đóng đủ (${paidAmt.toLocaleString()}đ)</span>`
      : `<span class="text-rose-600 font-bold"><i class="fa-solid fa-clock mr-1"></i>Chưa nộp (${curTarget.toLocaleString()}đ)</span>`;
  }

  renderMyLettersHistory();
}

async function submitStudentLetterForm(e) {
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

  const res = await callApi("sendStudentLetter", { ...newLetter, isAnonymous }, "POST");
  alert(res.status === "success"
    ? "Thư tâm sự của em đã được gửi lên Thầy chủ nhiệm trên Google Sheets!"
    : "Thư tâm sự của em đã được lưu an toàn!");
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
        <span class="font-bold text-slate-800">${escapeHtml(l.title)}</span>
        <span class="text-[10px] text-slate-400 font-mono">${escapeHtml(l.time)}</span>
      </div>
      <p class="text-slate-600">${escapeHtml(l.content)}</p>
      ${l.teacherReply ? `
        <div class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 mt-1">
          <b>Thầy phản hồi:</b> ${escapeHtml(l.teacherReply)}
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
        <b class="text-slate-900">${escapeHtml(c.title)}</b>
        <span class="text-[10px] text-slate-500 block">Định mức: ${parseScore(c.target, 0).toLocaleString()}đ</span>
      </div>
      ${appState.roleLevel === "GVCN" ? `
        <button onclick="deleteFundCampaign('${escapeAttr(c.id)}')" class="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 font-bold text-[10px]">
          <i class="fa-solid fa-trash-can mr-1"></i> Xóa đợt này
        </button>
      ` : ""}
    </div>
  `).join("");
}

function closeManageCampaignsModal() {
  const modal = document.getElementById("manageCampaignsModal");
  if (modal) modal.classList.add("hidden");
}

async function deleteFundCampaign(campaignId) {
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền xóa đợt thu quỹ!");
    return;
  }
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

  const actor = appState.currentUser ? appState.currentUser.fullName : "GVCN";
  await callApi("deleteFundCampaign", { campaignId, author: actor }, "POST");
  alert("Đã xóa đợt thu thành công!");
}

function exportSemesterSummaryExcel() {
  let csv = "STT,Mã HS,Họ và Tên,Tổ,Chức Vụ,Điểm TB Rèn Luyện,Xếp Loại TT22\n";
  appState.students.forEach((s, idx) => {
    const pts = parseScore(s.diemThiDua, 100);
    const rank = getTT22Label(pts);
    csv += [
      idx + 1,
      escapeCsvCell(s.id),
      escapeCsvCell(s.hoTen),
      escapeCsvCell(s.to),
      escapeCsvCell(s.chucVu || "Thành viên"),
      pts,
      escapeCsvCell(rank)
    ].join(",") + "\n";
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
    vtmMediaList: appState.vtmMediaList,
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
  if (appState.roleLevel !== "GVCN") {
    alert("Chỉ GVCN mới có quyền phục hồi dữ liệu sao lưu!");
    if (event && event.target) event.target.value = "";
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== "object") throw new Error("Cấu trúc JSON không hợp lệ");
      if (Array.isArray(data.students)) appState.students = data.students;
      if (Array.isArray(data.violations)) appState.violations = data.violations;
      if (Array.isArray(data.campaigns)) appState.campaigns = data.campaigns;
      if (Array.isArray(data.fundPayments)) appState.fundPayments = data.fundPayments;
      if (Array.isArray(data.cashbook)) appState.cashbook = data.cashbook;
      if (Array.isArray(data.auditLogs)) appState.auditLogs = data.auditLogs;
      if (data.dutyAssignments && typeof data.dutyAssignments === "object") appState.dutyAssignments = data.dutyAssignments;
      if (Array.isArray(data.volunteerLaborList)) appState.volunteerLaborList = data.volunteerLaborList;
      if (Array.isArray(data.vtmEvents)) appState.vtmEvents = data.vtmEvents;
      if (Array.isArray(data.vtmMediaList)) appState.vtmMediaList = data.vtmMediaList;
      if (Array.isArray(data.seatingLayout)) currentSeatingLayout = data.seatingLayout;
      if (data.weeklyArchives && typeof data.weeklyArchives === "object") appState.weeklyArchives = data.weeklyArchives;

      saveStateToLocal();
      renderAllSections();
      alert("🎉 Đã phục hồi dữ liệu lớp 10A12 thành công từ tệp sao lưu!");
    } catch (err) {
      alert("Lỗi: Tệp JSON sao lưu không hợp lệ!");
    } finally {
      if (event && event.target) event.target.value = "";
    }
  };
  reader.readAsText(file);
}