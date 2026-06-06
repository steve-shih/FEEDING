const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'breeding_data.json');
const OVERRIDES_FILE = path.join(__dirname, 'data', 'user_overrides.json');
const EMPTY_OVERRIDES = { breedOverrides: {}, litterTags: {} };

// 若 user_overrides.json 不存在，自動建立
if (!fs.existsSync(OVERRIDES_FILE)) {
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(EMPTY_OVERRIDES, null, 2), 'utf8');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 靜態托管前端
app.use(express.static(path.join(__dirname, 'public')));

// API：取得繁殖資料
app.get('/api/data', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, raw) => {
    if (err) {
      console.error('讀取資料失敗:', err);
      return res.status(500).json({ error: '資料讀取失敗' });
    }
    try {
      // 移除 UTF-8 BOM（\uFEFF）避免 JSON.parse 失敗
      const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
      const data = JSON.parse(cleaned);
      res.json(data);
    } catch (parseErr) {
      console.error('JSON 解析失敗:', parseErr);
      res.status(500).json({ error: 'JSON 格式錯誤' });
    }
  });
});

// API：讀取用戶自訂覆寫資料
app.get('/api/overrides', (req, res) => {
  fs.readFile(OVERRIDES_FILE, 'utf8', (err, raw) => {
    if (err) return res.json(EMPTY_OVERRIDES);
    try {
      const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
      res.json(JSON.parse(cleaned));
    } catch {
      res.json(EMPTY_OVERRIDES);
    }
  });
});

// API：儲存用戶自訂覆寫資料
app.post('/api/overrides', (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: '格式錯誤' });
  const toSave = {
    breedOverrides: data.breedOverrides || {},
    litterTags: data.litterTags || {},
    kittenBirthDates: data.kittenBirthDates || {},
    kittenExtraChips: data.kittenExtraChips || {},
    customKittens: data.customKittens || {},
    kittenMatingInfo: data.kittenMatingInfo || {},
    companyStamp: data.companyStamp || null,
    personalStamp: data.personalStamp || null,
    footerText: data.footerText || '',
    footerTextSize: data.footerTextSize || 14,
    companyStampSize: data.companyStampSize || 90,
    personalStampSize: data.personalStampSize || 70,
    companyStampPos: data.companyStampPos || 'top-right',
    personalStampPos: data.personalStampPos || 'top-left'
  };
  fs.writeFile(OVERRIDES_FILE, JSON.stringify(toSave, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: '寫入失敗' });
    res.json({ ok: true });
  });
});

// 其餘路由導回首頁（SPA fallback）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🐱 寵物繁殖紀錄伺服器已啟動`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → API: http://localhost:${PORT}/api/data`);
});
