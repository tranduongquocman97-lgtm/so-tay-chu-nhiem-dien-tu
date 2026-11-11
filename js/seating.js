/**
 * SỔ TAY CHỦ NHIỆM 10A12 - PHÂN HỆ SƠ ĐỒ LỚP HỌC (4 DÃY - 6 HÀNG, TỔ ĐỘC LẬP & XUẤT DOCX)
 */

function getSeatingTeamStyle(teamName) {
  const t = String(teamName || "").trim();
  if (t === "Tổ 1") {
    return {
      team: "Tổ 1",
      dot: "bg-sky-600",
      badge: "bg-sky-100 text-sky-800 border-sky-300",
      cellTint: "bg-sky-50/45 hover:bg-sky-100/75",
      hexFill: "E0F2FE",
      hexText: "0369A1"
    };
  }
  if (t === "Tổ 2") {
    return {
      team: "Tổ 2",
      dot: "bg-violet-600",
      badge: "bg-violet-100 text-violet-800 border-violet-300",
      cellTint: "bg-violet-50/45 hover:bg-violet-100/75",
      hexFill: "EDE9FE",
      hexText: "6D28D9"
    };
  }
  if (t === "Tổ 3") {
    return {
      team: "Tổ 3",
      dot: "bg-emerald-600",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      cellTint: "bg-emerald-50/45 hover:bg-emerald-100/75",
      hexFill: "D1FAE5",
      hexText: "047857"
    };
  }
  if (t === "Tổ 4") {
    return {
      team: "Tổ 4",
      dot: "bg-amber-600",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      cellTint: "bg-amber-50/45 hover:bg-amber-100/75",
      hexFill: "FEF3C7",
      hexText: "B45309"
    };
  }
  return {
    team: t || "Chưa rõ Tổ",
    dot: "bg-slate-500",
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    cellTint: "bg-white hover:bg-slate-50",
    hexFill: "F8FAFC",
    hexText: "475569"
  };
}

function resolveSeatStudentInfo(seat) {
  if (!seat || !seat.name) return null;
  const studentsList = (typeof appState !== "undefined" && Array.isArray(appState.students)) ? appState.students : [];
  const normSeatName = (typeof removeVietnameseTones === "function") ? removeVietnameseTones(seat.name) : String(seat.name).toLowerCase();
  const matched = studentsList.find(s =>
    (seat.id && s.id === seat.id) ||
    ((typeof removeVietnameseTones === "function") ? removeVietnameseTones(s.hoTen) === normSeatName : String(s.hoTen || "").toLowerCase() === normSeatName)
  );
  const rawRole = seat.role || (matched && matched.chucVu && matched.chucVu !== "Thành viên" ? matched.chucVu : "");
  return {
    id: matched ? matched.id : (seat.id || ""),
    name: matched ? matched.hoTen : seat.name,
    team: (matched && matched.to) || seat.to || "",
    role: rawRole
  };
}

function renderSeatingTeamLegend() {
  const legendEl = document.getElementById("seatingTeamLegend");
  if (!legendEl) return;
  const counts = { "Tổ 1": 0, "Tổ 2": 0, "Tổ 3": 0, "Tổ 4": 0 };
  currentSeatingLayout.forEach(row => {
    row.forEach(cell => {
      const info = resolveSeatStudentInfo(cell);
      if (info && counts[info.team] !== undefined) counts[info.team]++;
    });
  });

  const teams = ["Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4"];
  legendEl.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-slate-50 via-sky-50/70 to-indigo-50/70 border border-slate-200 text-[11px]">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-black text-slate-700 uppercase tracking-wide text-[10px]">
          <i class="fa-solid fa-layer-group text-sky-600 mr-1"></i> Phân màu theo Tổ thực tế (Dãy ≠ Tổ):
        </span>
        ${teams.map(tName => {
          const st = getSeatingTeamStyle(tName);
          return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${st.badge} font-extrabold">
            <span class="w-2 h-2 rounded-full ${st.dot}"></span>
            <span>${tName}: ${counts[tName]} HS</span>
          </span>`;
        }).join("")}
      </div>
      <span class="text-[10px] text-slate-500 italic font-medium">Mỗi Dãy ghế gồm nhiều học sinh thuộc các Tổ khác nhau</span>
    </div>
  `;
}

function renderSeatingChart() {
  const container = document.getElementById("seatingGridRows");
  if (!container) return;
  container.innerHTML = "";
  renderSeatingTeamLegend();

  currentSeatingLayout.forEach((rowData, rIndex) => {
    const rowNumber = 6 - rIndex;
    const rowDiv = document.createElement("div");
    rowDiv.className = "grid grid-cols-12 gap-2 sm:gap-4 items-center";

    // Cụm bàn trái (Dãy 1 & Dãy 2)
    const leftDeskGroup = document.createElement("div");
    leftDeskGroup.className = "col-span-5 grid grid-cols-2 gap-2.5";
    leftDeskGroup.appendChild(createDeskElement(rowData[0], rowData[1], rIndex, 0, 1));
    leftDeskGroup.appendChild(createDeskElement(rowData[2], rowData[3], rIndex, 2, 3));
    rowDiv.appendChild(leftDeskGroup);

    // Lối đi trung tâm
    const aisleDiv = document.createElement("div");
    aisleDiv.className = "col-span-2 text-center text-xs font-black uppercase text-slate-600 flex items-center justify-center";
    aisleDiv.innerHTML = `<span class="px-2.5 py-1 rounded-lg bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 text-slate-800 font-black shadow-2xs">BÀN ${rowNumber}</span>`;
    rowDiv.appendChild(aisleDiv);

    // Cụm bàn phải (Dãy 3 & Dãy 4)
    const rightDeskGroup = document.createElement("div");
    rightDeskGroup.className = "col-span-5 grid grid-cols-2 gap-2.5";
    rightDeskGroup.appendChild(createDeskElement(rowData[4], rowData[5], rIndex, 4, 5));
    rightDeskGroup.appendChild(createDeskElement(rowData[6], rowData[7], rIndex, 6, 7));
    rowDiv.appendChild(rightDeskGroup);

    container.appendChild(rowDiv);
  });
}

function createDeskElement(seat1, seat2, rIndex, c1, c2) {
  const desk = document.createElement("div");
  desk.className = "bg-white rounded-2xl border-2 border-slate-300 hover:border-sky-400 grid grid-cols-2 divide-x divide-slate-200 overflow-hidden shadow-xs transition duration-150";
  desk.appendChild(createSeatCell(seat1, rIndex, c1));
  desk.appendChild(createSeatCell(seat2, rIndex, c2));
  return desk;
}

function createSeatCell(student, rIndex, cIndex) {
  const cell = document.createElement("div");
  const isEmpty = !student || !student.name;
  const isSelected = selectedSeatFirst && selectedSeatFirst.r === rIndex && selectedSeatFirst.c === cIndex;
  const info = isEmpty ? null : resolveSeatStudentInfo(student);
  const teamStyle = info ? getSeatingTeamStyle(info.team) : getSeatingTeamStyle("");

  cell.className = `seat-cell p-2 min-h-[70px] flex flex-col justify-center items-center text-center cursor-pointer select-none transition ${
    isSelected
      ? 'selected-seat'
      : (isEmpty ? 'bg-slate-50/80 hover:bg-slate-100' : teamStyle.cellTint)
  }`;

  if (!isEmpty && info) {
    cell.innerHTML = `
      <div class="flex items-center justify-center gap-1.5 w-full px-1">
        <span class="w-2 h-2 rounded-full ${teamStyle.dot} shrink-0 shadow-2xs" title="${escapeAttr(info.team || '')}"></span>
        <span class="text-xs sm:text-[12.5px] font-black text-slate-900 leading-snug whitespace-normal break-words text-center">
          ${escapeHtml(info.name)}
        </span>
      </div>
      <div class="flex flex-wrap items-center justify-center gap-1 mt-1">
        ${info.team ? `<span class="text-[9px] font-black px-1.5 py-0.2 rounded border ${teamStyle.badge}">${escapeHtml(info.team)}</span>` : ''}
        ${info.role ? `<span class="text-[9px] font-bold text-slate-800 bg-white/90 px-1.5 py-0.2 rounded border border-slate-300 shadow-2xs">${escapeHtml(info.role)}</span>` : ''}
      </div>
    `;
  } else {
    cell.innerHTML = `<span class="text-[10px] text-slate-400 font-bold italic tracking-wide">+ Trống</span>`;
  }

  cell.addEventListener("click", () => {
    if (!canModifySeating()) return;

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

function canModifySeating() {
  if (!appState.currentUser) return false;
  if (appState.roleLevel === "GVCN") return true;
  const roleStr = String(appState.currentUser.role || "").toLowerCase();
  return roleStr.includes("lớp trưởng");
}

function buildSeatingSheetPayload() {
  const layoutRows = [];
  currentSeatingLayout.forEach((rowData, rIndex) => {
    const ban = 6 - rIndex;
    for (let cIndex = 0; cIndex < 8; cIndex++) {
      const cell = rowData[cIndex];
      const day = Math.floor(cIndex / 2) + 1;
      const viTri = (cIndex % 2 === 0) ? "Trái" : "Phải";
      let stId = "";
      let stName = "";
      let ghiChu = "";
      if (cell && cell.name) {
        stName = cell.name;
        ghiChu = cell.role || "";
        const norm = removeVietnameseTones(cell.name);
        const matched = appState.students.find(s =>
          (cell.id && s.id === cell.id) || removeVietnameseTones(s.hoTen) === norm
        );
        stId = matched ? matched.id : (cell.id || "");
      }
      layoutRows.push({ day, ban, viTri, id: stId, hoTen: stName, ghiChu });
    }
  });
  return layoutRows;
}

function applyCloudSeatingRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const hasNamedSeat = rows.some(r => r && r.hoTen);
  if (!hasNamedSeat) return;

  const grid = Array.from({ length: 6 }, () => Array(8).fill(null));
  rows.forEach(item => {
    const day = Number(item.day);
    const ban = Number(item.ban);
    if (day < 1 || day > 4 || ban < 1 || ban > 6) return;
    const rIndex = 6 - ban;
    const isRight = String(item.viTri || "").toLowerCase().includes("phải");
    const cIndex = (day - 1) * 2 + (isRight ? 1 : 0);
    if (item.hoTen) {
      grid[rIndex][cIndex] = {
        id: item.id || "",
        name: String(item.hoTen),
        role: item.ghiChu ? String(item.ghiChu) : ""
      };
    } else {
      grid[rIndex][cIndex] = null;
    }
  });
  currentSeatingLayout = grid;
}

async function rotateSeatingColumns() {
  if (!canModifySeating()) {
    alert("Chỉ GVCN và Lớp trưởng mới có quyền xoay dãy!");
    return;
  }
  if (!confirm("Thầy/bạn có muốn xoay dãy tuần hoàn: Dãy 1 ➔ Dãy 2 ➔ Dãy 3 ➔ Dãy 4 ➔ Dãy 1?")) return;

  currentSeatingLayout = currentSeatingLayout.map(row => [
    row[6], row[7],
    row[0], row[1],
    row[2], row[3],
    row[4], row[5]
  ]);

  saveStateToLocal();
  renderSeatingChart();
  await callApi("saveSeatingChart", { layout: buildSeatingSheetPayload() }, "POST");
  alert("Đã xoay dãy ghế tuần hoàn và đồng bộ lên Google Sheets thành công!");
}

async function syncSeatingToSheets() {
  if (!canModifySeating()) {
    alert("Chỉ GVCN và Lớp trưởng mới có quyền lưu sơ đồ lên Google Sheets!");
    return;
  }
  saveStateToLocal();
  const res = await callApi("saveSeatingChart", { layout: buildSeatingSheetPayload() }, "POST");
  if (res && res.status === "success") {
    alert("Sơ đồ chỗ ngồi đã được lưu và đồng bộ lên Google Sheets thành công!");
  } else {
    alert("Đã lưu sơ đồ chỗ ngồi vào bộ nhớ thiết bị (sẽ đồng bộ khi trực tuyến).");
  }
}

function saveSeatingHistorySnapshot() {
  if (!canModifySeating()) {
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

// ==================== XUẤT SƠ ĐỒ LỚP RA FILE WORD (.DOCX) ====================
function escapeXmlForDocx(str) {
  return String(str === null || str === undefined ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function crc32Bytes(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0xEDB88320) : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildStoredZipUint8(entries) {
  const encoder = new TextEncoder();
  const fileRecords = [];
  let localOffset = 0;

  entries.forEach(entry => {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = (entry.content instanceof Uint8Array) ? entry.content : encoder.encode(entry.content);
    const crc = crc32Bytes(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034B50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x5421, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    fileRecords.push({
      nameBytes,
      dataBytes,
      localHeader,
      crc,
      offset: localOffset
    });
    localOffset += localHeader.length + dataBytes.length;
  });

  const centralParts = [];
  let centralSize = 0;
  fileRecords.forEach(rec => {
    const ch = new Uint8Array(46 + rec.nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014B50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, rec.crc, true);
    cv.setUint32(20, rec.dataBytes.length, true);
    cv.setUint32(24, rec.dataBytes.length, true);
    cv.setUint16(28, rec.nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, rec.offset, true);
    ch.set(rec.nameBytes, 46);
    centralParts.push(ch);
    centralSize += ch.length;
  });

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054B50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, fileRecords.length, true);
  ev.setUint16(10, fileRecords.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, localOffset, true);
  ev.setUint16(20, 0, true);

  const totalLen = localOffset + centralSize + eocd.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  fileRecords.forEach(rec => {
    out.set(rec.localHeader, pos);
    pos += rec.localHeader.length;
    out.set(rec.dataBytes, pos);
    pos += rec.dataBytes.length;
  });
  centralParts.forEach(ch => {
    out.set(ch, pos);
    pos += ch.length;
  });
  out.set(eocd, pos);
  return out;
}

function buildDocxBorderXml(edges) {
  const mk = (tag, cfg) => cfg
    ? `<w:${tag} w:val="${cfg.val || "single"}" w:sz="${cfg.sz || "6"}" w:space="0" w:color="${cfg.color || "94A3B8"}"/>`
    : `<w:${tag} w:val="nil"/>`;
  return `<w:tcBorders>${mk("top", edges.top)}${mk("left", edges.left)}${mk("bottom", edges.bottom)}${mk("right", edges.right)}</w:tcBorders>`;
}

function buildDocxSpacerCellXml(widthDxa) {
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${widthDxa}" w:type="dxa"/>
      ${buildDocxBorderXml({})}
      <w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>
    </w:tcPr>
    <w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>
  </w:tc>`;
}

function buildDocxHorizontalSpacerRowXml(colWidths, heightDxa) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return `<w:tr>
    <w:trPr><w:trHeight w:val="${heightDxa}" w:hRule="exact"/><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="${totalW}" w:type="dxa"/>
        <w:gridSpan w:val="${colWidths.length}"/>
        ${buildDocxBorderXml({})}
        <w:tcMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>
      </w:tcPr>
      <w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:rPr><w:sz w:val="4"/></w:rPr></w:pPr></w:p>
    </w:tc>
  </w:tr>`;
}

function buildSeatingDocxCellXml(info, widthDxa, isLeftSeatInDesk) {
  const isOccupied = Boolean(info && info.name);
  const teamStyle = isOccupied ? getSeatingTeamStyle(info.team) : getSeatingTeamStyle("");
  const fillHex = isOccupied ? teamStyle.hexFill : "F8FAFC";
  const subParts = [];
  if (isOccupied) {
    if (info.team) subParts.push(info.team);
    if (info.role) subParts.push(info.role);
  }
  const subText = subParts.join(" • ");
  const outerEdge = { val: "single", sz: "8", color: "64748B" };
  const innerDivider = { val: "dashed", sz: "4", color: "94A3B8" };

  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${widthDxa}" w:type="dxa"/>
      <w:shd w:val="clear" w:color="auto" w:fill="${fillHex}"/>
      ${buildDocxBorderXml({
        top: outerEdge,
        bottom: outerEdge,
        left: isLeftSeatInDesk ? outerEdge : innerDivider,
        right: isLeftSeatInDesk ? innerDivider : outerEdge
      })}
      <w:tcMar>
        <w:top w:w="130" w:type="dxa"/><w:bottom w:w="130" w:type="dxa"/>
        <w:left w:w="85" w:type="dxa"/><w:right w:w="85" w:type="dxa"/>
      </w:tcMar>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="35"/></w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          ${isOccupied ? "<w:b/>" : "<w:i/>"}
          <w:color w:val="${isOccupied ? "0F172A" : "94A3B8"}"/>
          <w:sz w:val="${isOccupied ? "19" : "17"}"/>
        </w:rPr>
        <w:t>${escapeXmlForDocx(isOccupied ? info.name : "(Trống)")}</w:t>
      </w:r>
    </w:p>
    ${subText ? `<w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
          <w:color w:val="${teamStyle.hexText}"/>
          <w:sz w:val="15"/>
        </w:rPr>
        <w:t>${escapeXmlForDocx(subText)}</w:t>
      </w:r>
    </w:p>` : ""}
  </w:tc>`;
}

function buildSeatingDocxBytes() {
  const nowStr = new Date().toLocaleDateString("vi-VN");
  const curWeek = (typeof getAutoSchoolWeek === "function") ? getAutoSchoolWeek() : 11;
  const seatWidth = 1740;
  const gapWidth = 240;
  const aisleWidth = 1120;
  // 11 cột: [D1-T, D1-P, Kẽ, D2-T, D2-P, LỐI ĐI, D3-T, D3-P, Kẽ, D4-T, D4-P]
  const colWidths = [
    seatWidth, seatWidth, gapWidth,
    seatWidth, seatWidth, aisleWidth,
    seatWidth, seatWidth, gapWidth,
    seatWidth, seatWidth
  ];
  const totalTableW = colWidths.reduce((a, b) => a + b, 0);

  const mkHeaderCell = (label, span, w, fill) => `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${w}" w:type="dxa"/>
      ${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}
      <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
      ${buildDocxBorderXml({
        top: { val: "single", sz: "6", color: fill },
        bottom: { val: "single", sz: "6", color: fill },
        left: { val: "single", sz: "6", color: fill },
        right: { val: "single", sz: "6", color: fill }
      })}
      <w:vAlign w:val="center"/>
      <w:tcMar><w:top w:w="115" w:type="dxa"/><w:bottom w:w="115" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>
    </w:tcPr>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="21"/></w:rPr>
        <w:t>${escapeXmlForDocx(label)}</w:t>
      </w:r>
    </w:p>
  </w:tc>`;

  const headerCells = [
    mkHeaderCell("DÃY 1", 2, seatWidth * 2, "1E3A8A"),
    buildDocxSpacerCellXml(gapWidth),
    mkHeaderCell("DÃY 2", 2, seatWidth * 2, "4338CA"),
    mkHeaderCell("LỐI ĐI", 1, aisleWidth, "334155"),
    mkHeaderCell("DÃY 3", 2, seatWidth * 2, "047857"),
    buildDocxSpacerCellXml(gapWidth),
    mkHeaderCell("DÃY 4", 2, seatWidth * 2, "C2410C")
  ].join("");

  const deskRowsXml = currentSeatingLayout.map((rowData, rIndex) => {
    const rowNumber = 6 - rIndex;
    const d1 = buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[0]), seatWidth, true) +
               buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[1]), seatWidth, false);
    const d2 = buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[2]), seatWidth, true) +
               buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[3]), seatWidth, false);
    const d3 = buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[4]), seatWidth, true) +
               buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[5]), seatWidth, false);
    const d4 = buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[6]), seatWidth, true) +
               buildSeatingDocxCellXml(resolveSeatStudentInfo(rowData[7]), seatWidth, false);

    const aisleCell = `<w:tc>
      <w:tcPr>
        <w:tcW w:w="${aisleWidth}" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
        ${buildDocxBorderXml({
          top: { val: "single", sz: "4", color: "CBD5E1" },
          bottom: { val: "single", sz: "4", color: "CBD5E1" },
          left: { val: "single", sz: "4", color: "CBD5E1" },
          right: { val: "single", sz: "4", color: "CBD5E1" }
        })}
        <w:vAlign w:val="center"/>
        <w:tcMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:left w:w="40" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
        <w:r>
          <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="1E293B"/><w:sz w:val="18"/></w:rPr>
          <w:t>BÀN ${rowNumber}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;

    const rowXml = `<w:tr><w:trPr><w:trHeight w:val="860" w:hRule="atLeast"/><w:cantSplit/></w:trPr>${d1}${buildDocxSpacerCellXml(gapWidth)}${d2}${aisleCell}${d3}${buildDocxSpacerCellXml(gapWidth)}${d4}</w:tr>`;
    const spacerAfter = (rIndex < currentSeatingLayout.length - 1) ? buildDocxHorizontalSpacerRowXml(colWidths, 140) : "";
    return rowXml + spacerAfter;
  }).join("");

  const wingSpanW = seatWidth * 4 + gapWidth;
  const podiumEdge = { val: "single", sz: "8", color: "475569" };
  const podiumRowXml = `<w:tr>
    <w:trPr><w:trHeight w:val="600" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="${wingSpanW}" w:type="dxa"/><w:gridSpan w:val="5"/><w:shd w:val="clear" w:color="auto" w:fill="E2E8F0"/>${buildDocxBorderXml({ top: podiumEdge, left: podiumEdge, bottom: podiumEdge, right: podiumEdge })}<w:vAlign w:val="center"/><w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="0F172A"/><w:sz w:val="20"/></w:rPr><w:t>BÀN GIÁO VIÊN &amp; BỤC GIẢNG</w:t></w:r>
      </w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="${aisleWidth}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E293B"/>${buildDocxBorderXml({ top: podiumEdge, left: podiumEdge, bottom: podiumEdge, right: podiumEdge })}<w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="17"/></w:rPr><w:t>BẢNG ĐEN</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="${wingSpanW}" w:type="dxa"/><w:gridSpan w:val="5"/><w:shd w:val="clear" w:color="auto" w:fill="FEF3C7"/>${buildDocxBorderXml({ top: podiumEdge, left: podiumEdge, bottom: podiumEdge, right: podiumEdge })}<w:vAlign w:val="center"/><w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:color w:val="92400E"/><w:sz w:val="20"/></w:rPr><w:t>CỬA RA VÀO LỚP HỌC</w:t></w:r>
      </w:p>
    </w:tc>
  </w:tr>`;

  const halfSignW = Math.floor(totalTableW / 2);
  const signatureTableXml = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${totalTableW}" w:type="dxa"/>
      <w:jc w:val="center"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${halfSignW}"/><w:gridCol w:w="${totalTableW - halfSignW}"/></w:tblGrid>
    <w:tr>
      <w:tc>
        <w:tcPr><w:tcW w:w="${halfSignW}" w:type="dxa"/><w:tcMar><w:top w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>TM. BAN CÁN SỰ LỚP</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="240"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>(Lớp trưởng ký tên)</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="180" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>Nguyễn Tấn An</w:t></w:r></w:p>
      </w:tc>
      <w:tc>
        <w:tcPr><w:tcW w:w="${totalTableW - halfSignW}" w:type="dxa"/><w:tcMar><w:top w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="40"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>GIÁO VIÊN CHỦ NHIỆM</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="240"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>(Ký và ghi rõ họ tên)</w:t></w:r></w:p>
        <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="180" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>ThS. Trần Dương Quốc Mẫn</w:t></w:r></w:p>
      </w:tc>
    </w:tr>
  </w:tbl>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="22"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>TRƯỜNG THPT SỐ 1 QUANG TRUNG (PHÂN HIỆU) • LỚP 10A12 (K58-QT)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="32"/><w:color w:val="0F172A"/></w:rPr>
        <w:t>SƠ ĐỒ CHỖ NGỒI LỚP 10A12</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="160"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:i/><w:sz w:val="19"/><w:color w:val="475569"/></w:rPr>
        <w:t>${escapeXmlForDocx(`Tuần học ${curWeek} • Ngày xuất: ${nowStr} • Ghi chú: Tổ 1–4 phân bổ độc lập theo từng vị trí ghế (Dãy ≠ Tổ)`)}</w:t>
      </w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="${totalTableW}" w:type="dxa"/>
        <w:jc w:val="center"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblCellSpacing w:w="0" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${colWidths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>
      <w:tr><w:trPr><w:trHeight w:val="520" w:hRule="atLeast"/><w:tblHeader/><w:cantSplit/></w:trPr>${headerCells}</w:tr>
      ${buildDocxHorizontalSpacerRowXml(colWidths, 140)}
      ${deskRowsXml}
      ${buildDocxHorizontalSpacerRowXml(colWidths, 220)}
      ${podiumRowXml}
    </w:tbl>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="180" w:after="100"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr>
        <w:t>Chú thích màu Tổ: Tổ 1 (Xanh dương)  |  Tổ 2 (Tím)  |  Tổ 3 (Xanh lá)  |  Tổ 4 (Vàng cam)</w:t>
      </w:r>
    </w:p>
    ${signatureTableXml}
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="450" w:right="480" w:bottom="450" w:left="480" w:header="250" w:footer="250" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

  return buildStoredZipUint8([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: relsXml },
    { name: "word/_rels/document.xml.rels", content: docRelsXml },
    { name: "word/document.xml", content: documentXml }
  ]);
}

function exportSeatingToDocx() {
  const bytes = buildSeatingDocxBytes();
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SoDoChoNgoi_10A12_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}