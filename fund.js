let classFundList = [];

async function loadFundData() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getFundCollectionList`);
    const json = await res.json();
    if(json.status === "success") { classFundList = json.data; renderFundChecklist(); }
  } catch(e){}
}

function renderFundChecklist() {
  const c = document.getElementById("fundChecklistContainer");
  c.innerHTML = classFundList.map(st => `
    <label class="flex justify-between items-center p-3 border rounded-xl cursor-pointer ${st.paid?'bg-emerald-50 border-emerald-300':''}">
      <div class="flex gap-2 items-center">
        <input type="checkbox" ${st.paid?'checked':''} onchange="toggleFund('${st.id}', this.checked)">
        <b>${st.hoTen}</b>
      </div>
      <span class="text-[10px] font-bold ${st.paid?'text-emerald-700':'text-rose-600'}">${st.paid?'Đã nộp':'Chưa'}</span>
    </label>`).join('');
}

function toggleFund(id, isChecked) {
  const st = classFundList.find(s => s.id === id);
  if(st) { st.paid = isChecked; renderFundChecklist(); }
}

async function saveFundCollectionData() {
  const pin = prompt("Mã PIN Thủ quỹ:");
  if(!pin) return;
  const paidIds = classFundList.filter(s => s.paid).map(s => s.id);
  const res = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "saveFundCollection", data: { pin, collectionName: "Quỹ Kỳ 1", paidStudentIds: paidIds } })});
  const data = await res.json();
  alert(data.message);
}