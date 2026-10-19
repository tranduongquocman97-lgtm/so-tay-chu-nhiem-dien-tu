let weeklyViolations = [];
const SESSION_MAP = { 'T2_SANG':'Sáng Thứ 2', 'T2_CHIEU':'Chiều Thứ 2', 'T3_SANG':'Sáng Thứ 3', 'T3_CHIEU':'Chiều Thứ 3', 'T4_SANG':'Sáng Thứ 4', 'T5_SANG':'Sáng Thứ 5', 'T6_SANG':'Sáng Thứ 6'};

async function loadWeeklyOverview() {
  try {
    const res = await fetch(`${SCRIPT_URL}?action=getRecentNotifications`);
    const json = await res.json();
    if (json.status === "success") {
      weeklyViolations = json.data.filter(v => Number(v.points) < 0 && !v.note?.includes("[ĐÃ HỦY]"));
      document.getElementById("totalViolationsCount").innerText = weeklyViolations.length;
      
      const counts = {};
      weeklyViolations.forEach(v => counts[v.time.includes("14:") || v.time.includes("15:") ? 'Chiều' : 'Sáng'] = (counts[...] || 0) + 1);
      // Giản lược logic render
      renderViolationTable();
    }
  } catch(e) { console.log(e); }
}

function renderViolationTable() {
  const tbody = document.getElementById("violationTableBody");
  tbody.innerHTML = weeklyViolations.map(item => `
    <tr class="border-b">
      <td class="p-3 font-bold">${item.studentName}<br><span class="text-[10px] text-slate-400">${item.time}</span></td>
      <td class="p-3">${item.criteria}</td>
      <td class="p-3 text-center text-rose-600 font-black">${item.points}</td>
      <td class="p-3 text-right"><button onclick="alert('Cần mã PIN GVCN để hoàn điểm')" class="text-xs text-brand-600 font-bold">Hoàn</button></td>
    </tr>`).join('');
}
window.addEventListener("DOMContentLoaded", loadWeeklyOverview);