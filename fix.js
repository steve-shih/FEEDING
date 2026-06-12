const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

const brokenPattern = `  // 3. 無 TAG 且非同一天的自動時間分組
  const sorted = [...reallyNoTag].sort((a,b)=>String(a.dateValue).localeCompare(String(b.dateValue)));
  if (!OVERRIDES.customKittens[selectedChip]) OVERRIDES.customKittens[selectedChip] = [];`;

const fixedPart1 = `  // 3. 無 TAG 且非同一天的自動時間分組
  const sorted = [...reallyNoTag].sort((a,b)=>String(a.dateValue).localeCompare(String(b.dateValue)));
  const thresholdGroups = [];
  for (const child of sorted) {
    const ct = child.dateValue ? new Date(child.dateValue).getTime() : 0;
    const last = thresholdGroups.slice(-1)[0];
    if (!last || !ct) { thresholdGroups.push({ isManual:false, isSameDate:false, startDate:child.dateValue||'', endDate:child.dateValue||'', children:[child] }); continue; }
    const lt = new Date(last.endDate).getTime();
    if (Math.abs(ct-lt)/86400000 <= thresholdDays) { last.children.push(child); last.endDate = child.dateValue||last.endDate; }
    else thresholdGroups.push({ isManual:false, isSameDate:false, startDate:child.dateValue||'', endDate:child.dateValue||'', children:[child] });
  }

  autoGroups.push(...thresholdGroups);
  autoGroups.sort((a,b) => String(a.startDate).localeCompare(String(b.startDate)));

  return [...manualGroups, ...autoGroups];
}

// ── 手動新增子代邏輯 ──────────────────────────────────────
function showCustomKittenForm() { document.getElementById('customKittenForm').style.display = 'block'; }
function hideCustomKittenForm() {
  document.getElementById('customKittenForm').style.display = 'none';
  document.getElementById('ckChipId').value = '';
  document.getElementById('ckName').value = '';
  document.getElementById('ckSex').value = '';
  document.getElementById('ckBreed').value = '';
  document.getElementById('ckDate').value = '';
}
async function saveCustomKitten() {
  const chipId = document.getElementById('ckChipId').value.trim();
  if (!chipId) return alert('晶片號為必填！');
  if (!OVERRIDES.customKittens[selectedChip]) OVERRIDES.customKittens[selectedChip] = [];`;

content = content.replace(brokenPattern, fixedPart1);

const originalRenderDetailMiddle = `  // 合併原本的其他子代與手動新增的子代
  const customKids = OVERRIDES.customKittens[parent.chipId] || [];
  const mergedOther = [...parent.otherChildren, ...customKids];
  const otherGroups = groupOtherChildren(mergedOther, thresholdDays);

  const pdfHtml = parent.pdfLitters.length
    ? parent.pdfLitters.map(l => \`<div class="litter">
        <div class="litterHead">
          <div><b>第 \${escapeHtml(l.litterNo)} 胎</b> <span class="badge ok">PDF確定</span></div>
          <div class="small">生產：\${escapeHtml(l.productionDate||'未填')}｜配種：\${escapeHtml(l.matingDate||'未填')}｜\${partnerLabel()}：\${escapeHtml(l.partnerChipId||'未填')}｜子代：\${l.kittens.length}</div>
        </div>
        <div class="kittenGrid">\${l.kittens.map(k=>renderKitten(k,\`<br/>寵登狀態：\${escapeHtml(k.registrationStatus||'')}\${k.status?'<br/>cat_family狀態：'+escapeHtml(k.status):''}\${k.firstRecordDate?'<br/>第一筆異動：'+escapeHtml(k.firstRecordDate):''}\`)).join('')}</div>
      </div>\`).join('')
    : \`<div class="empty">此\${modeLabel()}沒有 PDF 確定胎次。</div>\`;`;

const newRenderDetailMiddle = `  // 合併原本的其他子代與手動新增的子代
  const customKids = OVERRIDES.customKittens[parent.chipId] || [];
  const mergedOther = [...parent.otherChildren, ...customKids];

  const htmlPdfLitters = parent.pdfLitters.map(l => ({ ...l, kittens: [...l.kittens] }));
  const htmlRemainingOther = [];

  mergedOther.forEach(child => {
    const bDate = OVERRIDES.kittenBirthDates[child.chipId] || child.dateValue;
    const matchingPdfLitter = htmlPdfLitters.find(l => l.productionDate && l.productionDate === bDate);
    if (matchingPdfLitter) {
      child._isHtmlMergedFromOther = true;
      matchingPdfLitter.kittens.push(child);
    } else {
      htmlRemainingOther.push(child);
    }
  });

  const otherGroups = groupOtherChildren(htmlRemainingOther, thresholdDays);

  // --- 計算半年內密集生育警告 ---
  const allLitterDates = [];
  htmlPdfLitters.forEach(l => {
    if (l.productionDate && !isNaN(new Date(l.productionDate).getTime())) {
      allLitterDates.push({ date: l.productionDate, type: 'pdf', obj: l });
    }
  });
  otherGroups.forEach(g => {
    const d = getGroupDate(g.children) || g.startDate;
    if (d && !isNaN(new Date(d).getTime())) {
      allLitterDates.push({ date: d, type: 'other', obj: g });
    }
  });
  
  allLitterDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (let i = 1; i < allLitterDates.length; i++) {
    const t1 = new Date(allLitterDates[i-1].date).getTime();
    const t2 = new Date(allLitterDates[i].date).getTime();
    if (t2 - t1 <= 183 * 24 * 3600 * 1000) {
      allLitterDates[i].obj._warning = true;
    }
  }

  const pdfHtml = htmlPdfLitters.length
    ? htmlPdfLitters.map(l => \`<div class="litter">
        <div class="litterHead">
          <div><b>第 \${escapeHtml(l.litterNo)} 胎</b> <span class="badge ok">PDF確定</span>\${l._warning ? ' <span class="badge" style="background:#fef2f2;color:#dc2626;font-weight:bold;">⚠️半年內生育</span>' : ''}</div>
          <div class="small">生產：\${escapeHtml(l.productionDate||'未填')}｜配種：\${escapeHtml(l.matingDate||'未填')}｜\${partnerLabel()}：\${escapeHtml(l.partnerChipId||'未填')}｜子代：\${l.kittens.length}</div>
        </div>
        <div class="kittenGrid">\${l.kittens.map(k => {
          if (k._isHtmlMergedFromOther) return renderOtherKitten(k, true);
          return renderKitten(k, \\\`<br/>寵登狀態：\\\${escapeHtml(k.registrationStatus||'')}\\\${k.status?'<br/>cat_family狀態：'+escapeHtml(k.status):''}\\\${k.firstRecordDate?'<br/>第一筆異動：'+escapeHtml(k.firstRecordDate):''}\\\`);
        }).join('')}</div>
      </div>\`).join('')
    : \`<div class="empty">此\${modeLabel()}沒有 PDF 確定胎次。</div>\`;`;

content = content.replace(originalRenderDetailMiddle, newRenderDetailMiddle);

fs.writeFileSync('public/index.html', content, 'utf8');
console.log('Fixed index.html successfully.');
