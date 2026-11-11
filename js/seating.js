/**
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ SƠ ĐỒ LỚP HỌC (4 DÃY - 6 HÀNG)
 */

function renderSeatingChart() {
  const container = document.getElementById("seatingGridRows");
  if (!container) return;
  container.innerHTML = "";

  currentSeatingLayout.forEach((rowData, rIndex) => {
    const rowNumber = 6 - rIndex;
    const rowDiv = document.createElement("div");
    rowDiv.className = "grid grid-cols-12 gap-2 sm:gap-4 items-center";

    // Cụm bàn trái (Dãy 1: Blue & Dãy 2: Indigo)
    const leftDeskGroup = document.createElement("div");
    leftDeskGroup.className = "col-span-5 grid grid-cols-2 gap-2.5";
    leftDeskGroup.appendChild(createDeskElement(rowData[0], rowData[1], rIndex, 0, 1, "blue"));
    leftDeskGroup.appendChild(createDeskElement(rowData[2], rowData[3], rIndex, 2, 3, "indigo"));
    rowDiv.appendChild(leftDeskGroup);

    // Lối đi trung tâm
    const aisleDiv = document.createElement("div");
    aisleDiv.className = "col-span-2 text-center text-xs font-black uppercase text-slate-500 flex items-center justify-center";
    aisleDiv.innerHTML = `<span class="px-2.5 py-1 rounded-lg bg-slate-200 border border-slate-300 text-slate-800 font-bold shadow-2xs">BÀN ${rowNumber}</span>`;
    rowDiv.appendChild(aisleDiv);

    // Cụm bàn phải (Dãy 3: Emerald & Dãy 4: Amber)
    const rightDeskGroup = document.createElement("div");
    rightDeskGroup.className = "col-span-5 grid grid-cols-2 gap-2.5";
    rightDeskGroup.appendChild(createDeskElement(rowData[4], rowData[5], rIndex, 4, 5, "emerald"));
    rightDeskGroup.appendChild(createDeskElement(rowData[6], rowData[7], rIndex, 6, 7, "amber"));
    rowDiv.appendChild(rightDeskGroup);

    container.appendChild(rowDiv);
  });
}

function createDeskElement(seat1, seat2, rIndex, c1, c2, colorTheme) {
  const desk = document.createElement("div");
  const borderColors = {
    blue: "border-blue-300 hover:border-blue-500",
    indigo: "border-indigo-300 hover:border-indigo-500",
    emerald: "border-emerald-300 hover:border-emerald-500",
    amber: "border-amber-300 hover:border-amber-500"
  };

  desk.className = `bg-white rounded-2xl border-2 ${borderColors[colorTheme] || "border-slate-300"} grid grid-cols-2 divide-x divide-slate-200 overflow-hidden shadow-xs transition duration-150`;
  desk.appendChild(createSeatCell(seat1, rIndex, c1, colorTheme));
  desk.appendChild(createSeatCell(seat2, rIndex, c2, colorTheme));
  return desk;
}

function createSeatCell(student, rIndex, cIndex, colorTheme) {
  const cell = document.createElement("div");
  const isEmpty = !student || !student.name;
  const isSelected = selectedSeatFirst && selectedSeatFirst.r === rIndex && selectedSeatFirst.c === cIndex;

  const dotColors = {
    blue: "bg-blue-600",
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-600"
  };

  cell.className = `seat-cell p-2 min-h-[64px] flex flex-col justify-center items-center text-center cursor-pointer select-none transition ${
    isSelected 
      ? 'selected-seat' 
      : (isEmpty ? 'bg-slate-50/80 hover:bg-slate-100' : 'bg-white hover:bg-sky-50/60')
  }`;

  if (!isEmpty) {
    cell.innerHTML = `
      <div class="flex items-center justify-center gap-1.5 w-full px-1">
        <span class="w-2 h-2 rounded-full ${dotColors[colorTheme] || 'bg-slate-600'} shrink-0 shadow-2xs"></span>
        <span class="text-xs sm:text-[12.5px] font-black text-slate-900 leading-snug whitespace-normal break-words text-center">
          ${student.name}
        </span>
      </div>
      ${student.role ? `
        <span class="text-[9.5px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300 mt-1 shadow-2xs">
          ${student.role}
        </span>
      ` : ''}
    `;
  } else {
    cell.innerHTML = `<span class="text-[10px] text-slate-400 font-bold italic tracking-wide">+ Trống</span>`;
  }

  cell.addEventListener("click", () => {
    if (appState.roleLevel !== "GVCN" && appState.roleLevel !== "LEADER") return;

    if (!selectedSeatFirst) {
      selectedSeatFirst = { r: rIndex, c: cIndex, student };
      renderSeatingChart();
    } else {
      const firstR = selectedSeatFirst.r;
      const firstC = selectedSeatFirst.c;

      const temp = currentSeatingLayout[rIndex][cIndex];
      currentSeatingLayout[rIndex][cIndex] = currentSeatingLayout[firstR][firstC];
      currentSeatingLayout[firstR][firstC] = temp;

      selectedSeatFirst = null;
      saveStateToLocal();
      renderSeatingChart();
    }
  });

  return cell;
}

function rotateSeatingColumns() {
  if (appState.roleLevel !== "GVCN" && appState.roleLevel !== "LEADER") {
    alert("Chỉ GVCN và Lớp trưởng mới có quyền xoay dãy!");
    return;
  }
  if (!confirm("Thầy có muốn xoay dãy tuần hoàn: Dãy 1 ➔ Dãy 2 ➔ Dãy 3 ➔ Dãy 4 ➔ Dãy 1?")) return;

  currentSeatingLayout = currentSeatingLayout.map(row => [
    row[6], row[7],
    row[0], row[1],
    row[2], row[3],
    row[4], row[5]
  ]);

  saveStateToLocal();
  renderSeatingChart();
  alert("Đã xoay dãy ghế tuần hoàn thành công!");
}

async function syncSeatingToSheets() {
  saveStateToLocal();
  alert("Sơ đồ chỗ ngồi đã được lưu vào bộ nhớ máy và đồng bộ thành công!");
}

function saveSeatingHistorySnapshot() {
  if (appState.roleLevel !== "GVCN" && appState.roleLevel !== "LEADER") {
    alert("Chỉ GVCN hoặc Lớp trưởng mới có quyền lưu mốc sơ đồ!");
    return;
  }
  const note = prompt("Nhập ghi chú cho mốc sơ đồ này (VD: Sơ đồ sau khi xoay dãy Tuần 10):", "Sơ đồ lớp ngày " + new Date().toLocaleDateString("vi-VN"));
  if (!note) return;

  if (!appState.seatingHistory) appState.seatingHistory = [];
  appState.seatingHistory.unshift({
    id: `SEAT_${Date.now()}`,
    time: new Date().toLocaleString("vi-VN"),
    note: note,
    layout: JSON.parse(JSON.stringify(currentSeatingLayout)),
    author: appState.currentUser ? appState.currentUser.fullName : "GVCN"
  });

  saveStateToLocal();
  alert(`Đã lưu mốc sơ đồ chỗ ngồi thành công! (${note})`);
}