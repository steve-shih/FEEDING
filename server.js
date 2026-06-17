const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'breeding_data.json');
const OVERRIDES_FILE = path.join(__dirname, 'data', 'user_overrides.json');
const EMPTY_OVERRIDES = { breedOverrides: {}, litterTags: {} };

// ??user_overrides.json ‰∏çÂ??®Ô??™Â?Âª∫Á?
if (!fs.existsSync(OVERRIDES_FILE)) {
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(EMPTY_OVERRIDES, null, 2), 'utf8');
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ?úÊ??òÁÆ°?çÁ´Ø
app.use(express.static(path.join(__dirname, 'public')));

// APIÔºöÂ?ÂæóÁ?ÊÆñË???app.get(['/api/data', '/feeding/api/data'], (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, raw) => {
    if (err) {
      console.error('ËÆÄ?ñË??ôÂ§±??', err);
      return res.status(500).json({ error: 'Ë≥áÊ?ËÆÄ?ñÂ§±?? });
    }
    try {
      // ÁßªÈô§ UTF-8 BOMÔºà\uFEFFÔºâÈÅø??JSON.parse Â§±Ê?
      const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
      const data = JSON.parse(cleaned);
      res.json(data);
    } catch (parseErr) {
      console.error('JSON Ëß??Â§±Ê?:', parseErr);
      res.status(500).json({ error: 'JSON ?ºÂ??ØË™§' });
    }
  });
});

// APIÔºöË??ñÁî®?∂Ëá™Ë®ÇË?ÂØ´Ë???app.get(['/api/overrides', '/feeding/api/overrides'], (req, res) => {
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

// APIÔºöÂÑ≤Â≠òÁî®?∂Ëá™Ë®ÇË?ÂØ´Ë???app.post(['/api/overrides', '/feeding/api/overrides'], (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: '?ºÂ??ØË™§' });
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
    if (err) return res.status(500).json({ error: 'ÂØ´ÂÖ•Â§±Ê?' });
    res.json({ ok: true });
  });
});

// ?∂È?Ë∑ØÁî±Â∞éÂ?È¶ñÈ?ÔºàSPA fallbackÔº?app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`?ê± ÂØµÁâ©ÁπÅÊ?Á¥Ä?Ñ‰º∫?çÂô®Â∑≤Â??ï`);
  console.log(`   ??http://localhost:${PORT}`);
  console.log(`   ??API: http://localhost:${PORT}/api/data`);
});

