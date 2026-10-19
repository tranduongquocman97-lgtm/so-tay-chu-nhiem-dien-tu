let currentUser = null;
const ROLE_ACCOUNTS = {
  "9999": { role: "GVCN", title: "Thầy Quốc Mẫn (GVCN)" },
  "1001": { role: "LopTruong", title: "Lớp trưởng" },
  "1003": { role: "LP_LaoDong", title: "Lớp phó Lao động" },
  "1004": { role: "ThuQuy", title: "Thủ quỹ" },
  "1011": { role: "ToTruong", team: "Tổ 1", title: "Tổ trưởng 1" },
  "1012": { role: "ToTruong", team: "Tổ 2", title: "Tổ trưởng 2" },
  "1013": { role: "ToTruong", team: "Tổ 3", title: "Tổ trưởng 3" },
  "1014": { role: "ToTruong", team: "Tổ 4", title: "Tổ trưởng 4" }
};

function executeLoginPin() {
  const pin = document.getElementById("globalPinInput").value.trim();
  if (ROLE_ACCOUNTS[pin]) {
    currentUser = ROLE_ACCOUNTS[pin];
    document.getElementById("userDisplayName").innerText = currentUser.title;
    document.getElementById('authModal').classList.add('hidden');
    
    if(currentUser.role === "ToTruong" && typeof filterAttendTeam === 'function'){
      filterAttendTeam(currentUser.team);
    }
    alert(`Đăng nhập thành công: ${currentUser.title}`);
  } else {
    alert("Sai mã PIN!");
  }
}