let attendanceList = [];
let currentAttendTeam = 'ALL';

async function loadAttendanceList() {
  const dateVN = document.getElementById("attendDateInput").value.split('-').reverse().join('/');
  const sessionKey = document.getElementById("attendSessionSelect").value;
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getAttendanceData&date=${dateVN}&sessionKey=${sessionKey}`);
    const json = await res.json();
    if(json.status === "success") { attendanceList = json.data; renderAttendanceRows(); }
  } catch(e) {}
}

function renderAttendanceRows() {
  const container = document.getElementById("attendListContainer");
  const filtered = currentAttendTeam === 'ALL' ? attendanceList : attendanceList.filter(s => s.to === currentAttendTeam);
  container.innerHTML = filtered.map(st => `
    <div class="p-3 flex justify-between items-center hover:bg-slate-50">
      <div><b class="text-sm">${st.hoTen}</b> <span class="text-[10px] text-slate-400 bg-slate-100 px-1 rounded">${st.to}</span></div>
      <div class="flex gap-1">
        <button onclick="changeStatus('${st.id}', 'CO_MAT')" class="px-2 py-1 text-[10px] font-bold rounded ${st.status==='CO_MAT'?'bg-emerald-600 text-white':'bg-slate-200'}">Có mặt</button>
        <button onclick="changeStatus('${st.id}', 'KHONG_PHEP')" class="px-2 py-1 text-[10px] font-bold rounded ${st.status==='KHONG_PHEP'?'bg-rose-600 text-white':'bg-slate-200'}">Vắng</button>
      </div>
    </div>`).join('');
}

async function changeStatus(id, newStatus) {
  const pin = prompt("Nhập mã PIN xác nhận:");
  if(!pin) return;
  const dateVN = document.getElementById("attendDateInput").value.split('-').reverse().join('/');
  const sessionKey = document.getElementById("attendSessionSelect").value;
  const res = await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "saveAttendanceWithAntiDuplicate", data: { pin, date: dateVN, sessionKey, studentId: id, newStatus } })});
  const data = await res.json();
  alert(data.message);
  if(data.status === "success") loadAttendanceList();
}

function filterAttendTeam(t) { currentAttendTeam = t; renderAttendanceRows(); }