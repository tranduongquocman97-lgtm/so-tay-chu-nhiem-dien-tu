const SCHEDULE_CONFIG = [
  { key: 'T2_SANG', day: 1, isMorning: true, dayName: 'Thứ 2', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 1' },
  { key: 'T2_CHIEU', day: 1, isMorning: false, dayName: 'Thứ 2', session: 'Chiều', time: '13:45 - 16:40', team: 'Tổ 2' },
  { key: 'T3_SANG', day: 2, isMorning: true, dayName: 'Thứ 3', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 3' },
  { key: 'T3_CHIEU', day: 2, isMorning: false, dayName: 'Thứ 3', session: 'Chiều', time: '13:45 - 16:40', team: 'Tổ 4' },
  { key: 'T4_SANG', day: 3, isMorning: true, dayName: 'Thứ 4', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 1' },
  { key: 'T5_SANG', day: 4, isMorning: true, dayName: 'Thứ 5', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 2' },
  { key: 'T6_SANG', day: 5, isMorning: true, dayName: 'Thứ 6', session: 'Sáng', time: '06:45 - 11:20', team: 'Tổ 3 & 4' }
];

function getCurrentClassSession() {
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const isMorning = mins <= 720; // Trước 12:00
  return SCHEDULE_CONFIG.find(s => s.day === day && s.isMorning === isMorning) || null;
}

function renderLiveSessionHeader() {
  const current = getCurrentClassSession();
  if (current) {
    document.getElementById("liveBannerSub").innerText = `ĐANG DIỄN RA: ${current.dayName} (${current.session})`;
    document.getElementById("liveBannerTitle").innerText = `${current.session} ${current.dayName} • Giờ học: ${current.time}`;
    document.getElementById("liveDutyTeam").innerText = current.team.toUpperCase();
  } else {
    document.getElementById("liveBannerSub").innerText = "NGOÀI GIỜ LÊN LỚP";
    document.getElementById("liveBannerTitle").innerText = "Không có ca học lúc này";
    document.getElementById("liveDutyTeam").innerText = "Nghỉ";
  }
}
window.addEventListener("DOMContentLoaded", renderLiveSessionHeader);