const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'breeding_data.json');
const OVERRIDES_FILE = path.join(__dirname, 'data', 'user_overrides.json');
const EMPTY_OVERRIDES = { breedOverrides: {}, litterTags: {} };

// 確保 data 目錄存在
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 如果 data/breeding_data.json 不存在，從備份目錄拷貝過來
const BACKUP_DATA_FILE = path.join(__dirname, 'data_backup', 'breeding_data.json');
if (!fs.existsSync(DATA_FILE) && fs.existsSync(BACKUP_DATA_FILE)) {
  try {
    fs.copyFileSync(BACKUP_DATA_FILE, DATA_FILE);
    console.log('Successfully restored breeding_data.json from backup');
  } catch (err) {
    console.error('Failed to restore breeding_data.json from backup:', err);
  }
}

// 如果 user_overrides.json 不存在，初始化為空的 JSON
if (!fs.existsSync(OVERRIDES_FILE)) {
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(EMPTY_OVERRIDES, null, 2), 'utf8');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 靜態網頁路由
app.use(express.static(path.join(__dirname, 'public')));

// API：讀取所有培育數據
app.get(['/api/data', '/feeding/api/data'], (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, raw) => {
    if (err) {
      console.error('讀取數據失敗', err);
      return res.status(500).json({ error: '數據讀取失敗' });
    }
    try {
      // 消除 UTF-8 BOM
      const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
      const data = JSON.parse(cleaned);
      res.json(data);
    } catch (parseErr) {
      console.error('JSON 解析失敗:', parseErr);
      res.status(500).json({ error: 'JSON 格式有誤' });
    }
  });
});

// API：讀取使用者自訂覆寫數據
app.get(['/api/overrides', '/feeding/api/overrides'], (req, res) => {
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

// API：寫入/儲存使用者自訂覆寫數據
app.post(['/api/overrides', '/feeding/api/overrides'], (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: '格式有誤' });
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

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`伺服器已啟動`);
  console.log(`   網址: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/data`);
});
