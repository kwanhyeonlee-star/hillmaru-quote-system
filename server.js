'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');
const { URL } = require('url');
const { createClient } = require('@libsql/client');
const zlib = require('zlib');

// ===== embedded CSS =====
// 디자인 방향: 포레스트 그린 & 아이보리 — 골프클럽/리조트 프리미엄 톤 (동훈그룹 힐마루)
const STYLE_CSS = `
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Noto Sans KR', -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif;
  background: #f5f2e8;
  color: #23281f;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
a { color: #1f3d2b; text-decoration: none; }
a:hover { color: #a2793e; }

.topbar {
  background: #16281c;
  color: #f2efe3;
  border-bottom: 1px solid #0e1a12;
}
.topbar-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.brand {
  color: #f2efe3;
  font-family: 'Noto Serif KR', serif;
  font-weight: 600;
  font-size: 20px;
  letter-spacing: 1.5px;
  padding-bottom: 2px;
  border-bottom: 2px solid #a2793e;
}
.brand-tagline { color: #8fa190; font-size: 10px; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase; }
.topbar nav { display: flex; align-items: center; }
.topbar nav a { color: #cbd4c9; margin-left: 18px; font-size: 13px; letter-spacing: .3px; }
.topbar nav a:hover { color: #f2efe3; }
.who { color: #8fa190; font-size: 13px; }

.container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.footer {
  text-align: center;
  color: #9c9280;
  font-size: 11px;
  letter-spacing: 1px;
  padding: 26px;
  border-top: 1px solid #e3dcc7;
  margin-top: 28px;
}

h1 { font-family: 'Noto Serif KR', serif; font-size: 24px; margin: 0 0 22px; color: #16281c; font-weight: 600; letter-spacing: .2px; }
h2 { font-size: 17px; margin: 34px 0 14px; color: #1f3d2b; font-weight: 600; letter-spacing: .2px; }
h3 { font-size: 15px; margin: 18px 0 8px; color: #33422f; font-weight: 600; }

.flash { padding: 11px 15px; border-radius: 6px; margin-bottom: 18px; font-size: 14px; border: 1px solid transparent; }
.flash.info { background: #eef1e6; color: #445238; border-color: #dde5d2; }
.flash.error { background: #fbeae5; color: #8a3d28; border-color: #f1d3c8; }
.flash.success { background: #e8f0e0; color: #2f4d24; border-color: #d3e2c3; }

.card {
  background: #fffffc;
  border: 1px solid #e3dcc7;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 18px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.qr-card { display: block; color: inherit; }
.qr-card:hover { border-color: #a2793e; }
.qr-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; color: #16281c; }
.qr-status { display: inline-block; font-size: 11px; padding: 2px 9px; border-radius: 3px; margin-bottom: 10px; letter-spacing: .3px; font-weight: 500; }
.qr-status.selecting { background: #f6ecd7; color: #8a5a1e; }
.qr-status.completed { background: #e2ecd8; color: #2f4d24; }
.qr-status.open { background: #eae7f0; color: #5b4a86; }
.qr-meta { font-size: 13px; color: #6f6a5a; margin: 2px 0; }
.qr-total { margin-top: 10px; font-size: 15px; font-weight: 600; color: #16281c; }
.qr-progress-bar { height: 5px; background: #e6e0cd; border-radius: 999px; overflow: hidden; margin: 8px 0; }
.qr-progress-fill { height: 100%; background: #a2793e; }

table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #ece6d5; text-align: left; vertical-align: top; }
th { background: #f0efe3; font-weight: 500; color: #445238; letter-spacing: .2px; }
tr.row-substitute { background: #fbf6e9; }
tr.row-lowest { outline: 1px solid #a2793e; outline-offset: -1px; }
tr.row-selected { background: #edf2e5; }
.badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 3px; font-weight: 500; letter-spacing: .2px; }
.badge.requested { background: #eae7f0; color: #5b4a86; }
.badge.substitute { background: #f6ecd7; color: #8a5a1e; }
.badge.lowest { background: #a2793e; color: #fff; margin-left: 6px; }
.badge.selected { background: #1f3d2b; color: #fff; }

form.inline { display: inline; }
label { display: block; font-size: 12px; color: #5f6a56; margin: 12px 0 5px; letter-spacing: .2px; }
input[type=text], input[type=email], input[type=number], input[type=date], input[type=password], select, textarea {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid #d8d2ba;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  background: #fffffc;
  color: #23281f;
}
input:focus, select:focus, textarea:focus { outline: none; border-color: #1f3d2b; }
textarea { resize: vertical; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 12px; }
fieldset { border: 1px solid #e3dcc7; border-radius: 8px; margin: 14px 0; padding: 14px; }
legend { font-weight: 600; font-size: 13px; padding: 0 6px; color: #445238; }

button, .btn {
  display: inline-block;
  background: #1f3d2b;
  color: #f2efe3;
  border: none;
  padding: 9px 16px;
  border-radius: 4px;
  font-size: 13px;
  letter-spacing: .3px;
  cursor: pointer;
  text-decoration: none;
}
button:hover, .btn:hover { background: #16281c; text-decoration: none; }
.btn.secondary { background: #a2793e; color: #211a0f; }
.btn.secondary:hover { background: #8a6634; }
.btn.small { padding: 5px 11px; font-size: 12px; }
.btn.danger { background: #8a3d28; color: #fff; }
.btn.danger:hover { background: #712f1e; }
.btn.ghost { background: transparent; border: 1px solid #d8d2ba; color: #445238; }
.btn.ghost:hover { background: #f0efe3; }

.category-block { border: 1px solid #e3dcc7; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; background: #fbf9f0; }
.category-title { font-weight: 600; margin-bottom: 8px; color: #33422f; }
.vendor-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 14px; }
.vendor-row .vname { flex: 1; }
.bulk-btns { margin-bottom: 8px; }
.bulk-btns button { margin-right: 6px; }

.login-wrap { max-width: 380px; margin: 72px auto; }
.login-hero { text-align: center; margin-bottom: 28px; }
.login-hero .mark { font-family: 'Noto Serif KR', serif; font-weight: 600; font-size: 30px; color: #16281c; letter-spacing: 2px; }
.login-hero .tagline { font-size: 11px; color: #8a8266; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
.login-tabs { display: flex; gap: 20px; margin-bottom: 4px; border-bottom: 1px solid #e3dcc7; }
.login-tabs a { padding: 10px 2px; color: #8a8266; font-weight: 500; font-size: 13px; letter-spacing: .3px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.login-tabs a.active { color: #16281c; border-bottom-color: #a2793e; }

.total-box { background: #16281c; color: #f2efe3; padding: 18px 22px; border-radius: 8px; margin-top: 16px; }
.total-box .label { font-size: 12px; color: #a9b8a3; letter-spacing: .3px; }
.total-box .value { font-size: 24px; font-weight: 600; font-family: 'Noto Serif KR', serif; }

.hint { font-size: 12px; color: #8a8266; }
.section-actions { display: flex; justify-content: space-between; align-items: center; }
`;

// ===== lib/router.js =====
// 아주 가벼운 라우터 (외부 패키지 없이 순수 Node.js로 구현)

class Router {
constructor() {
this.routes = [];
}

add(method, path, handler) {
const keys = [];
const pattern = path
.split('/')
.map((seg) => {
if (seg.startsWith(':')) {
keys.push(seg.slice(1));
return '([^/]+)';
}
return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
})
.join('/');
this.routes.push({ method, regex: new RegExp(`^${pattern}$`), keys, handler });
}

get(path, handler) { this.add('GET', path, handler); }
post(path, handler) { this.add('POST', path, handler); }

async handle(req, res) {
const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
const pathname = decodeURIComponent(parsedUrl.pathname);
req.query = querystring.parse(parsedUrl.search.replace(/^\?/, ''));

for (const route of this.routes) {
if (route.method !== req.method) continue;
const m = pathname.match(route.regex);
if (!m) continue;
req.params = {};
route.keys.forEach((k, i) => { req.params[k] = decodeURIComponent(m[i + 1]); });
try {
await route.handler(req, res);
} catch (err) {
console.error(err);
res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
res.end('서버 오류가 발생했습니다: ' + err.message);
}
return true;
}
return false;
}
}

// multipart/form-data 본문을 파싱한다 (외부 패키지 없이 직접 구현).
// buffer: 전체 요청 본문, boundary: Content-Type 헤더에서 추출한 경계 문자열
function parseMultipart(buffer, boundary) {
const fields = {};
const files = {};
const boundaryBuf = Buffer.from(`--${boundary}`);
const parts = [];
let searchStart = 0;
while (true) {
const idx = buffer.indexOf(boundaryBuf, searchStart);
if (idx === -1) break;
parts.push(idx);
searchStart = idx + boundaryBuf.length;
}
for (let i = 0; i < parts.length - 1; i++) {
let start = parts[i] + boundaryBuf.length;
const end = parts[i + 1];
// 경계 뒤 "--"이면 종료 경계
const afterBoundary = buffer.slice(start, start + 2).toString();
if (afterBoundary === '--') continue;
// \r\n 건너뛰기
if (buffer.slice(start, start + 2).toString() === '\r\n') start += 2;
let chunk = buffer.slice(start, end);
// 마지막 \r\n 제거
if (chunk.slice(chunk.length - 2).toString() === '\r\n') chunk = chunk.slice(0, chunk.length - 2);

const headerEnd = chunk.indexOf('\r\n\r\n');
if (headerEnd === -1) continue;
const headerStr = chunk.slice(0, headerEnd).toString('utf8');
const partBody = chunk.slice(headerEnd + 4);

const nameMatch = headerStr.match(/name="([^"]*)"/);
const filenameMatch = headerStr.match(/filename="([^"]*)"/);
const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
const name = nameMatch ? nameMatch[1] : null;
if (!name) continue;

if (filenameMatch) {
if (filenameMatch[1]) {
files[name] = {
filename: filenameMatch[1],
contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
data: partBody,
};
}
} else {
const val = partBody.toString('utf8');
// 같은 name의 필드(체크박스 여러 개 선택, 여러 품목 행 등)가 반복되면 배열로 누적한다.
// querystring.parse()가 중복 키를 배열로 돌려주는 것과 동일한 동작을 맞추기 위함.
if (Object.prototype.hasOwnProperty.call(fields, name)) {
if (Array.isArray(fields[name])) fields[name].push(val);
else fields[name] = [fields[name], val];
} else {
fields[name] = val;
}
}
}
return { fields, files };
}

function parseBody(req) {
return new Promise((resolve, reject) => {
const chunks = [];
let size = 0;
req.on('data', (chunk) => {
chunks.push(chunk);
size += chunk.length;
if (size > 15 * 1024 * 1024) {
reject(new Error('요청 본문이 너무 큽니다 (최대 15MB)'));
req.destroy();
}
});
req.on('end', () => {
const buf = Buffer.concat(chunks);
const ct = req.headers['content-type'] || '';
try {
if (ct.includes('multipart/form-data')) {
const bm = ct.match(/boundary=(?:"([^"]+)"|([^;]+))/);
const boundary = bm ? (bm[1] || bm[2]) : null;
if (!boundary) { req.files = {}; return resolve({}); }
const { fields, files } = parseMultipart(buf, boundary);
req.files = files;
resolve(fields);
} else if (ct.includes('application/json')) {
req.files = {};
resolve(buf.length ? JSON.parse(buf.toString('utf8')) : {});
} else {
req.files = {};
resolve(querystring.parse(buf.toString('utf8')));
}
} catch (e) {
reject(e);
}
});
req.on('error', reject);
});
}

// ===== lib/auth.js =====
function hashPassword(password) {
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
if (!stored || !stored.includes(':')) return false;
const [salt, hash] = stored.split(':');
const check = crypto.scryptSync(password, salt, 64).toString('hex');
const a = Buffer.from(hash, 'hex');
const b = Buffer.from(check, 'hex');
if (a.length !== b.length) return false;
return crypto.timingSafeEqual(a, b);
}

// 아주 단순한 메모리 세션 저장소 (프로세스가 살아있는 동안 유지)
const sessions = new Map();
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12시간 후 자동 로그아웃

function createSession(data) {
const id = crypto.randomBytes(24).toString('hex');
sessions.set(id, { ...data, createdAt: Date.now() });
return id;
}

function getSession(id) {
const s = sessions.get(id);
if (!s) return null;
if (Date.now() - s.createdAt > SESSION_MAX_AGE_MS) {
sessions.delete(id);
return null;
}
return s;
}

function destroySession(id) {
sessions.delete(id);
}

// ---- 로그인 실패 횟수 제한 (아주 단순한 메모리 기반 브루트포스 방지) ----
const loginAttempts = new Map(); // key: ip+role+loginId -> { count, firstAt, lockedUntil }
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

function loginAttemptKey(ip, role, loginId) {
return `${ip}::${role}::${(loginId || '').toLowerCase()}`;
}

function isLoginLocked(ip, role, loginId) {
const rec = loginAttempts.get(loginAttemptKey(ip, role, loginId));
if (!rec) return false;
if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
return false;
}

function recordLoginFailure(ip, role, loginId) {
const key = loginAttemptKey(ip, role, loginId);
const now = Date.now();
let rec = loginAttempts.get(key);
if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
rec = { count: 0, firstAt: now, lockedUntil: 0 };
}
rec.count += 1;
if (rec.count >= LOGIN_MAX_ATTEMPTS) {
rec.lockedUntil = now + LOGIN_LOCK_MS;
rec.count = 0;
rec.firstAt = now;
}
loginAttempts.set(key, rec);
}

function clearLoginFailures(ip, role, loginId) {
loginAttempts.delete(loginAttemptKey(ip, role, loginId));
}

function parseCookies(req) {
const header = req.headers.cookie;
const out = {};
if (!header) return out;
header.split(';').forEach((pair) => {
const idx = pair.indexOf('=');
if (idx === -1) return;
const k = pair.slice(0, idx).trim();
const v = pair.slice(idx + 1).trim();
out[k] = decodeURIComponent(v);
});
return out;
}

function getCurrentSession(req) {
const cookies = parseCookies(req);
const sid = cookies.sid;
if (!sid) return null;
const s = getSession(sid);
if (!s) return null;
s.sid = sid;
return s;
}

function setSessionCookie(res, sid, secure) {
const secureAttr = secure ? '; Secure' : '';
res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax${secureAttr}`);
}

function clearSessionCookie(res, secure) {
const secureAttr = secure ? '; Secure' : '';
res.setHeader('Set-Cookie', `sid=; HttpOnly; Path=/; SameSite=Lax${secureAttr}; Max-Age=0`);
}
const auth = {
hashPassword, verifyPassword, createSession, getSession, destroySession, parseCookies, getCurrentSession, setSessionCookie, clearSessionCookie,
isLoginLocked, recordLoginFailure, clearLoginFailures,
};

// ===== lib/db.js =====
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'app.db');

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Turso(libSQL) 클라이언트. TURSO_DATABASE_URL이 없으면(로컬 개발) 로컬 파일 DB로 폴백한다.
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:' + DB_PATH,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// node:sqlite의 DatabaseSync.prepare(sql).get/all/run(...) 패턴과 호환되도록 만든
// 얇은 비동기 호환 레이어. 기존 호출부는 db.prepare(sql).get(...)/.all(...)/.run(...) 형태를
// 그대로 유지하고 앞에 await만 붙이면 되도록 하기 위함.
db.prepare = function dbPrepare(sql) {
  return {
    get: async (...params) => {
      const r = await db.execute({ sql, args: params });
      return r.rows[0];
    },
    all: async (...params) => {
      const r = await db.execute({ sql, args: params });
      return r.rows;
    },
    run: async (...params) => {
      const r = await db.execute({ sql, args: params });
      return { lastInsertRowid: r.lastInsertRowid, changes: Number(r.rowsAffected) };
    },
  };
};

// DB 스키마 생성 / 마이그레이션 / 기본 데이터 시딩. 서버가 listen을 시작하기 전에 await로 호출된다.
async function initDb() {
await db.execute('PRAGMA foreign_keys = ON;');

await db.executeMultiple(`
CREATE TABLE IF NOT EXISTS admins (
id INTEGER PRIMARY KEY AUTOINCREMENT,
login_id TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
display_name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vendors (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
category1 TEXT DEFAULT '',
category2 TEXT DEFAULT '',
category3 TEXT DEFAULT '',
biz_reg_no TEXT DEFAULT '',
contact_name TEXT DEFAULT '',
contact_email TEXT DEFAULT '',
login_id TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
display_name TEXT DEFAULT '',
bank_name TEXT DEFAULT '',
account_number TEXT DEFAULT '',
account_holder TEXT DEFAULT '',
biz_reg_file TEXT DEFAULT '',
bankbook_file TEXT DEFAULT '',
active INTEGER NOT NULL DEFAULT 1,
created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS category_options (
id INTEGER PRIMARY KEY AUTOINCREMENT,
group_key TEXT NOT NULL, -- cat1 | cat2 | cat3
label TEXT NOT NULL,
sort_order INTEGER NOT NULL DEFAULT 0,
UNIQUE(group_key, label)
);
CREATE TABLE IF NOT EXISTS sites (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
title_label TEXT DEFAULT '',
company_name TEXT DEFAULT '(주)동훈',
address TEXT DEFAULT '',
ceo_name TEXT DEFAULT '',
phone TEXT DEFAULT '',
biz_reg_no TEXT DEFAULT '',
item_type TEXT DEFAULT '',
biz_type TEXT DEFAULT '',
tax_email TEXT DEFAULT '',
onsite_contact TEXT DEFAULT '',
footer_label TEXT DEFAULT '',
sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS onsite_contacts (
id INTEGER PRIMARY KEY AUTOINCREMENT,
site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
name TEXT NOT NULL,
phone TEXT DEFAULT '',
sort_order INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS quote_requests (
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT NOT NULL,
submission_deadline TEXT,
requested_delivery_date TEXT,
site_id INTEGER REFERENCES sites(id),
manager_name TEXT DEFAULT '',
manager_email TEXT DEFAULT '',
status TEXT NOT NULL DEFAULT 'open',
draft_no TEXT DEFAULT '',
draft_title TEXT DEFAULT '',
created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quote_items (
id INTEGER PRIMARY KEY AUTOINCREMENT,
quote_request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
item_name TEXT NOT NULL,
spec TEXT DEFAULT '',
qty INTEGER NOT NULL DEFAULT 1,
unit TEXT DEFAULT '',
category1 TEXT DEFAULT '',
category2 TEXT DEFAULT '',
category3 TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS vendor_assignments (
id INTEGER PRIMARY KEY AUTOINCREMENT,
quote_request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
permission TEXT NOT NULL DEFAULT 'view',
UNIQUE(quote_request_id, vendor_id)
);
CREATE TABLE IF NOT EXISTS submissions (
id INTEGER PRIMARY KEY AUTOINCREMENT,
quote_item_id INTEGER NOT NULL REFERENCES quote_items(id) ON DELETE CASCADE,
vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
type TEXT NOT NULL DEFAULT 'requested',
product_name TEXT NOT NULL,
spec TEXT DEFAULT '',
qty INTEGER NOT NULL DEFAULT 1,
unit TEXT DEFAULT '',
unit_price INTEGER NOT NULL DEFAULT 0,
delivery_date TEXT,
manufacturer TEXT DEFAULT '',
substitute_reason TEXT DEFAULT '',
note TEXT DEFAULT '',
submitted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS final_selections (
quote_item_id INTEGER PRIMARY KEY REFERENCES quote_items(id) ON DELETE CASCADE,
submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
reason TEXT DEFAULT '',
received_date TEXT DEFAULT '',
payment_date TEXT DEFAULT '',
payment_recipient TEXT DEFAULT '',
selected_at TEXT NOT NULL
);
`);

// ---- 마이그레이션: 기존 vendors 테이블에 category(단일) 컬럼만 있던 경우 대응 ----
const vendorCols = (await db.prepare("PRAGMA table_info(vendors)").all()).map((c) => c.name);
async function addColumnIfMissing(col, ddl) {
if (!vendorCols.includes(col)) {
await db.execute(`ALTER TABLE vendors ADD COLUMN ${ddl}`);
vendorCols.push(col);
}
}
await addColumnIfMissing('category1', "category1 TEXT DEFAULT ''");
await addColumnIfMissing('category2', "category2 TEXT DEFAULT ''");
await addColumnIfMissing('category3', "category3 TEXT DEFAULT ''");
await addColumnIfMissing('bank_name', "bank_name TEXT DEFAULT ''");
await addColumnIfMissing('account_number', "account_number TEXT DEFAULT ''");
await addColumnIfMissing('account_holder', "account_holder TEXT DEFAULT ''");
await addColumnIfMissing('biz_reg_file', "biz_reg_file TEXT DEFAULT ''");
await addColumnIfMissing('bankbook_file', "bankbook_file TEXT DEFAULT ''");
await addColumnIfMissing('address', "address TEXT DEFAULT ''");
await addColumnIfMissing('ceo_name', "ceo_name TEXT DEFAULT ''");
await addColumnIfMissing('phone', "phone TEXT DEFAULT ''");
await addColumnIfMissing('item_type', "item_type TEXT DEFAULT ''");
await addColumnIfMissing('biz_type', "biz_type TEXT DEFAULT ''");

// quote_requests에 site_id 컬럼이 없던 예전 DB 대응
const qrCols = (await db.prepare("PRAGMA table_info(quote_requests)").all()).map((c) => c.name);
if (!qrCols.includes('site_id')) {
await db.execute('ALTER TABLE quote_requests ADD COLUMN site_id INTEGER REFERENCES sites(id)');
}
if (!qrCols.includes('manager_name')) {
await db.execute("ALTER TABLE quote_requests ADD COLUMN manager_name TEXT DEFAULT ''");
}
if (!qrCols.includes('manager_email')) {
await db.execute("ALTER TABLE quote_requests ADD COLUMN manager_email TEXT DEFAULT ''");
}
// 완료 처리(기안번호/기안제목) — 구매Data 내보내기의 품의번호/제목 채우기용
if (!qrCols.includes('draft_no')) {
await db.execute("ALTER TABLE quote_requests ADD COLUMN draft_no TEXT DEFAULT ''");
}
if (!qrCols.includes('draft_title')) {
await db.execute("ALTER TABLE quote_requests ADD COLUMN draft_title TEXT DEFAULT ''");
}

// final_selections에 reason 컬럼이 없던 예전 DB 대응
const finalSelCols = (await db.prepare("PRAGMA table_info(final_selections)").all()).map((c) => c.name);
if (!finalSelCols.includes('reason')) {
await db.execute("ALTER TABLE final_selections ADD COLUMN reason TEXT DEFAULT ''");
}
// 완료 처리(품목별 실제 입고일자/대금지급일자/지급처) — 구매Data 내보내기의 입고일/대금지급일/지급처 채우기용
if (!finalSelCols.includes('received_date')) {
await db.execute("ALTER TABLE final_selections ADD COLUMN received_date TEXT DEFAULT ''");
}
if (!finalSelCols.includes('payment_date')) {
await db.execute("ALTER TABLE final_selections ADD COLUMN payment_date TEXT DEFAULT ''");
}
if (!finalSelCols.includes('payment_recipient')) {
await db.execute("ALTER TABLE final_selections ADD COLUMN payment_recipient TEXT DEFAULT ''");
}

// quote_items에 카테고리(과목1/2/3 대응) 컬럼이 없던 예전 DB 대응
const qiCols = (await db.prepare("PRAGMA table_info(quote_items)").all()).map((c) => c.name);
if (!qiCols.includes('category1')) await db.execute("ALTER TABLE quote_items ADD COLUMN category1 TEXT DEFAULT ''");
if (!qiCols.includes('category2')) await db.execute("ALTER TABLE quote_items ADD COLUMN category2 TEXT DEFAULT ''");
if (!qiCols.includes('category3')) await db.execute("ALTER TABLE quote_items ADD COLUMN category3 TEXT DEFAULT ''");

if (vendorCols.includes('category') && vendorCols.includes('category1')) {
// 예전 단일 category 값을 category1로 옮겨준다 (비어있는 경우에만)
await db.execute("UPDATE vendors SET category1 = category WHERE (category1 IS NULL OR category1 = '') AND category IS NOT NULL AND category <> ''");
}

// 기본 관리자 계정 시딩 (없을 때만)
const adminCount = (await db.prepare('SELECT COUNT(*) AS c FROM admins').get()).c;
if (adminCount === 0) {
await db.prepare('INSERT INTO admins (login_id, password_hash, display_name) VALUES (?, ?, ?)')
.run('admin', hashPassword('admin1234'), '관리자');
console.log('[초기화] 기본 관리자 계정 생성: admin / admin1234 (로그인 후 반드시 변경하세요)');
}

// 카테고리 옵션 기본값 시딩 (해당 그룹에 아무 옵션도 없을 때만)
async function seedCategoryGroup(groupKey, labels) {
const count = (await db.prepare('SELECT COUNT(*) AS c FROM category_options WHERE group_key = ?').get(groupKey)).c;
if (count === 0 && labels.length > 0) {
const insert = db.prepare('INSERT INTO category_options (group_key, label, sort_order) VALUES (?, ?, ?)');
for (let i = 0; i < labels.length; i++) {
await insert.run(groupKey, labels[i], i);
}
}
}
await seedCategoryGroup('cat1', ['코스', '일반관리', '시설']);
await seedCategoryGroup('cat2', ['저장품', '소모품', '코스 관리비']);
await seedCategoryGroup('cat3', []);

// 사업장 기본값 시딩 (사업장이 하나도 없을 때만)
const siteCount = (await db.prepare('SELECT COUNT(*) AS c FROM sites').get()).c;
if (siteCount === 0) {
const insertSite = db.prepare(`
INSERT INTO sites (name, title_label, company_name, address, ceo_name, phone, biz_reg_no, item_type, biz_type, tax_email, footer_label, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
await insertSite.run('힐마루 포천', '포천', '(주)동훈', '경기 포천시 영중면 금화봉4길 77', '김남연, 김태훈 (공동대표)', '1899-5800', '422-85-02210', '골프장', '서비스업', 'pcbill@donghoon.com', '주식회사동훈힐마루CC포천', 0);
await insertSite.run('힐마루 창녕', '창녕', '(주)동훈', '경상남도 창녕군 장마면 영산계성로 469-195', '김남연, 김태훈 (공동대표)', '1899-5800', '608-85-29021', '골프장', '서비스', '', '주식회사동훈힐마루CC창녕', 1);
}
} // ==== end of initDb() ====

async function getCategoryOptions(groupKey) {
return await db.prepare('SELECT * FROM category_options WHERE group_key = ? ORDER BY sort_order, id').all(groupKey);
}

async function getSites() {
return await db.prepare('SELECT * FROM sites ORDER BY sort_order, id').all();
}

async function getOnsiteContacts(siteId) {
return await db.prepare('SELECT * FROM onsite_contacts WHERE site_id = ? ORDER BY sort_order, id').all(siteId);
}

module.exports.UPLOAD_DIR = UPLOAD_DIR;
module.exports.getCategoryOptions = getCategoryOptions;
module.exports.getSites = getSites;
module.exports.getOnsiteContacts = getOnsiteContacts;

// ===== lib/zip.js =====
// 외부 패키지 없이 zlib만으로 구현한 최소 ZIP 리더/라이터 (xlsx 편집용)

function readUInt32LE(buf, off) { return buf.readUInt32LE(off); }
function readUInt16LE(buf, off) { return buf.readUInt16LE(off); }

// buffer(zip 전체) -> Map<파일명, Buffer(압축 해제된 내용)>
function readZip(buffer) {
// EOCD(End Of Central Directory) 시그니처를 뒤에서부터 탐색
const EOCD_SIG = 0x06054b50;
let eocdOffset = -1;
for (let i = buffer.length - 22; i >= 0; i--) {
if (readUInt32LE(buffer, i) === EOCD_SIG) { eocdOffset = i; break; }
}
if (eocdOffset === -1) throw new Error('유효한 ZIP(EOCD)을 찾을 수 없습니다.');

const totalEntries = readUInt16LE(buffer, eocdOffset + 10);
const cdOffset = readUInt32LE(buffer, eocdOffset + 16);

const entries = new Map();
let ptr = cdOffset;
const CD_SIG = 0x02014b50;
for (let i = 0; i < totalEntries; i++) {
if (readUInt32LE(buffer, ptr) !== CD_SIG) throw new Error('중앙 디렉터리 항목이 올바르지 않습니다.');
const compMethod = readUInt16LE(buffer, ptr + 10);
const compSize = readUInt32LE(buffer, ptr + 20);
const nameLen = readUInt16LE(buffer, ptr + 28);
const extraLen = readUInt16LE(buffer, ptr + 30);
const commentLen = readUInt16LE(buffer, ptr + 32);
const lfhOffset = readUInt32LE(buffer, ptr + 42);
const fileName = buffer.slice(ptr + 46, ptr + 46 + nameLen).toString('utf8');

// 로컬 파일 헤더에서 실제 데이터 위치 계산
const lfhNameLen = readUInt16LE(buffer, lfhOffset + 26);
const lfhExtraLen = readUInt16LE(buffer, lfhOffset + 28);
const dataStart = lfhOffset + 30 + lfhNameLen + lfhExtraLen;
const rawData = buffer.slice(dataStart, dataStart + compSize);
const data = compMethod === 8 ? zlib.inflateRawSync(rawData) : rawData;
entries.set(fileName, data);

ptr += 46 + nameLen + extraLen + commentLen;
}
return entries;
}

// Map<파일명, Buffer> -> zip Buffer
function writeZip(entriesMap) {
const localParts = [];
const centralParts = [];
let offset = 0;
const dosTime = 0;
const dosDate = 0x21; // 임의의 고정 날짜(1980-01-01 이후) - 실제 값 중요치 않음

for (const [name, content] of entriesMap.entries()) {
const nameBuf = Buffer.from(name, 'utf8');
const crc = zlib.crc32(content) >>> 0;
const compressed = zlib.deflateRawSync(content, { level: 6 });
const useStore = compressed.length >= content.length;
const method = useStore ? 0 : 8;
const dataToWrite = useStore ? content : compressed;

const lfh = Buffer.alloc(30);
lfh.writeUInt32LE(0x04034b50, 0);
lfh.writeUInt16LE(20, 4); // version needed
lfh.writeUInt16LE(0, 6); // flags
lfh.writeUInt16LE(method, 8);
lfh.writeUInt16LE(dosTime, 10);
lfh.writeUInt16LE(dosDate, 12);
lfh.writeUInt32LE(crc, 14);
lfh.writeUInt32LE(dataToWrite.length, 18);
lfh.writeUInt32LE(content.length, 22);
lfh.writeUInt16LE(nameBuf.length, 26);
lfh.writeUInt16LE(0, 28);

localParts.push(lfh, nameBuf, dataToWrite);

const cde = Buffer.alloc(46);
cde.writeUInt32LE(0x02014b50, 0);
cde.writeUInt16LE(20, 4); // version made by
cde.writeUInt16LE(20, 6); // version needed
cde.writeUInt16LE(0, 8); // flags
cde.writeUInt16LE(method, 10);
cde.writeUInt16LE(dosTime, 12);
cde.writeUInt16LE(dosDate, 14);
cde.writeUInt32LE(crc, 16);
cde.writeUInt32LE(dataToWrite.length, 20);
cde.writeUInt32LE(content.length, 24);
cde.writeUInt16LE(nameBuf.length, 28);
cde.writeUInt16LE(0, 30); // extra len
cde.writeUInt16LE(0, 32); // comment len
cde.writeUInt16LE(0, 34); // disk number start
cde.writeUInt16LE(0, 36); // internal attrs
cde.writeUInt32LE(0, 38); // external attrs
cde.writeUInt32LE(offset, 42); // local header offset

centralParts.push(cde, nameBuf);
offset += lfh.length + nameBuf.length + dataToWrite.length;
}

const centralDirStart = offset;
const centralBuf = Buffer.concat(centralParts);
const centralSize = centralBuf.length;

const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(entriesMap.size, 8);
eocd.writeUInt16LE(entriesMap.size, 10);
eocd.writeUInt32LE(centralSize, 12);
eocd.writeUInt32LE(centralDirStart, 16);
eocd.writeUInt16LE(0, 20);

return Buffer.concat([...localParts, centralBuf, eocd]);
}

// ===== lib/xlsx.js =====
// 외부 패키지 없이 zlib(readZip)만으로 구현한 최소 XLSX "읽기" 유틸.
// 업로드된 .xlsx 파일의 첫 번째 시트를 읽어 행(row) 배열로 반환한다.
// 각 행은 셀 값 배열이며, 1행이 헤더라고 가정하고 사용하는 쪽에서 처리한다.

function xlsxXmlUnescape(str) {
return String(str)
.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
.replace(/&lt;/g, '<')
.replace(/&gt;/g, '>')
.replace(/&quot;/g, '"')
.replace(/&apos;/g, "'")
.replace(/&amp;/g, '&');
}

function xlsxColToIndex(letters) {
let idx = 0;
for (let i = 0; i < letters.length; i++) idx = idx * 26 + (letters.charCodeAt(i) - 64);
return idx - 1; // 0-based
}

function parseSharedStrings(entries) {
const buf = entries.get('xl/sharedStrings.xml');
if (!buf) return [];
const xml = buf.toString('utf8');
const strings = [];
const siRe = /<si>([\s\S]*?)<\/si>/g;
let m;
while ((m = siRe.exec(xml))) {
const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
let tm;
let text = '';
while ((tm = tRe.exec(m[1]))) text += tm[1];
strings.push(xlsxXmlUnescape(text));
}
return strings;
}

// 업로드된 xlsx Buffer -> 2차원 배열 (행 -> 셀 문자열 값 배열)
function readXlsxFirstSheet(buffer) {
const entries = readZip(buffer);
const sharedStrings = parseSharedStrings(entries);

let sheetPath = 'xl/worksheets/sheet1.xml';
if (!entries.has(sheetPath)) {
const found = Array.from(entries.keys()).find((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
if (found) sheetPath = found;
}
const sheetBuf = entries.get(sheetPath);
if (!sheetBuf) throw new Error('엑셀 파일에서 시트를 찾을 수 없습니다. .xlsx 형식인지 확인해주세요.');
const xml = sheetBuf.toString('utf8');

const rows = [];
const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
let rm;
while ((rm = rowRe.exec(xml))) {
const rowNum = Number(rm[1]);
const rowXml = rm[2];
const cellRe = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
let cm;
const rowData = [];
while ((cm = cellRe.exec(rowXml))) {
const colIdx = xlsxColToIndex(cm[1]);
const attrs = cm[2] || '';
const inner = cm[3] || '';
const typeMatch = attrs.match(/\st="([^"]+)"/);
const type = typeMatch ? typeMatch[1] : 'n';
let value = '';
if (type === 's') {
const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
const idx = vMatch ? Number(vMatch[1]) : -1;
value = sharedStrings[idx] !== undefined ? sharedStrings[idx] : '';
} else if (type === 'inlineStr') {
const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
value = tMatch ? xlsxXmlUnescape(tMatch[1]) : '';
} else {
const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
value = vMatch ? xlsxXmlUnescape(vMatch[1]) : '';
}
rowData[colIdx] = value;
}
rows[rowNum - 1] = rowData;
}

const maxCols = rows.reduce((mx, r) => Math.max(mx, r ? r.length : 0), 0);
const normalized = [];
for (let i = 0; i < rows.length; i++) {
const r = rows[i] || [];
const out = [];
for (let c = 0; c < maxCols; c++) out.push(r[c] !== undefined ? String(r[c]).trim() : '');
normalized.push(out);
}
return normalized;
}

// 행이 전부 빈 값인지 체크 (엑셀 하단 빈 행 스킵용)
function xlsxRowIsEmpty(row) {
return !row || row.every((v) => !v || !String(v).trim());
}

// 엑셀 날짜 셀은 서식 없이 읽으면 순수 숫자(일련번호, 예: 46255)로 나온다.
// 이미 "2026-09-01"처럼 문자열로 적힌 값은 그대로 두고, 순수 숫자(그럴듯한 날짜 범위)만 날짜로 변환한다.
function excelSerialToDateStr(v) {
if (v === null || v === undefined) return '';
const s = String(v).trim();
if (!s) return '';
if (!/^\d+(\.\d+)?$/.test(s)) return s;
const num = Number(s);
if (!Number.isFinite(num) || num < 1 || num > 60000) return s;
const ms = Date.UTC(1899, 11, 30) + Math.round(num) * 86400000;
const d = new Date(ms);
if (Number.isNaN(d.getTime())) return s;
const yyyy = d.getUTCFullYear();
const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
const dd = String(d.getUTCDate()).padStart(2, '0');
return `${yyyy}-${mm}-${dd}`;
}

// ---- 엑셀 "쓰기" (업로드용 빈 양식 다운로드) ----
// 0-based 열 인덱스 -> 엑셀 열 문자 (0->A, 25->Z, 26->AA ...)
function xlsxColLetter(idx) {
let n = idx + 1;
let s = '';
while (n > 0) {
const rem = (n - 1) % 26;
s = String.fromCharCode(65 + rem) + s;
n = Math.floor((n - 1) / 26);
}
return s;
}

function xlsxCellInline(ref, text) {
const safe = String(text == null ? '' : text)
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${safe}</t></is></c>`;
}

// headers: 문자열 배열(1행), exampleRows: 문자열 배열의 배열(2행부터, 작성 예시) -> 최소한의 유효한 .xlsx Buffer
// dataValidations(선택): [{ col: 0-based 열 인덱스, list: ['값1','값2'], firstRow, lastRow }] -> 해당 열에 드롭다운(목록) 유효성검사 추가
function buildTemplateXlsx(headers, exampleRows, dataValidations) {
exampleRows = exampleRows || [];
const rowsXml = [`<row r="1">${headers.map((h, i) => xlsxCellInline(`${xlsxColLetter(i)}1`, h)).join('')}</row>`];
exampleRows.forEach((row, rIdx) => {
const rn = rIdx + 2;
rowsXml.push(`<row r="${rn}">${row.map((v, i) => xlsxCellInline(`${xlsxColLetter(i)}${rn}`, v)).join('')}</row>`);
});
let dvXml = '';
if (dataValidations && dataValidations.length) {
const items = dataValidations.map((dv) => {
const col = xlsxColLetter(dv.col);
const sqref = `${col}${dv.firstRow}:${col}${dv.lastRow}`;
const formula = dv.list.join(',').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${sqref}"><formula1>"${formula}"</formula1></dataValidation>`;
}).join('');
dvXml = `<dataValidations count="${dataValidations.length}">${items}</dataValidations>`;
}
const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml.join('')}</sheetData>${dvXml}</worksheet>`;
const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;
const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
const entries = new Map();
entries.set('[Content_Types].xml', Buffer.from(contentTypes, 'utf8'));
entries.set('_rels/.rels', Buffer.from(rootRels, 'utf8'));
entries.set('xl/workbook.xml', Buffer.from(workbookXml, 'utf8'));
entries.set('xl/_rels/workbook.xml.rels', Buffer.from(workbookRels, 'utf8'));
entries.set('xl/worksheets/sheet1.xml', Buffer.from(sheetXml, 'utf8'));
return writeZip(entries);
}

function sendXlsxTemplate(res, filename, headers, exampleRows, dataValidations) {
const buf = buildTemplateXlsx(headers, exampleRows, dataValidations);
res.writeHead(200, {
'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
});
res.end(buf);
}

// ===== lib/po.js =====
// 외부 패키지 없이 업로드된 발주서 템플릿(xlsx)의 특정 셀만 값을 바꿔 넣는 유틸

function xmlEscape(str) {
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;');
}

function cellRegex(ref) {
// ref 뒤에 다른 참조(B10 같은게 B1을 잘못 매칭하는 것)를 방지하기 위해 "를 경계로 사용
return new RegExp(`<c r="${ref}"([^>]*?)(/>|>[\\s\\S]*?</c>)`);
}

function setCellText(xml, ref, text) {
const re = cellRegex(ref);
const m = xml.match(re);
if (!m) return xml; // 셀이 없으면 그냥 무시 (템플릿 구조가 다를 수 있음)
const attrs = m[1];
const styleMatch = attrs.match(/\ss="(\d+)"/);
const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : '';
const replacement = `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
return xml.replace(re, replacement);
}

function setCellNumber(xml, ref, num) {
const re = cellRegex(ref);
const m = xml.match(re);
if (!m) return xml;
const attrs = m[1];
const styleMatch = attrs.match(/\ss="(\d+)"/);
const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : '';
const replacement = `<c r="${ref}"${styleAttr}><v>${num}</v></c>`;
return xml.replace(re, replacement);
}

// 수식(<f>)이 있는 셀은 수식을 그대로 두고 캐시된 <v>만 우리가 계산한 값으로 갱신한다.
// (뷰어에 따라 재계산을 하지 않는 경우에도 올바른 값이 바로 보이도록 하기 위함)
function setCellComputed(xml, ref, value) {
const re = cellRegex(ref);
const m = xml.match(re);
if (!m) return xml;
const attrs = m[1];
const rest = m[2];
const styleMatch = attrs.match(/\ss="(\d+)"/);
const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : '';
let fPart = '';
if (rest !== '/>') {
const fMatch = rest.match(/<f[^>]*(?:\/>|>[\s\S]*?<\/f>)/);
if (fMatch) fPart = fMatch[0];
}
const replacement = `<c r="${ref}"${styleAttr}>${fPart}<v>${value}</v></c>`;
return xml.replace(re, replacement);
}

// JS Date -> 엑셀 날짜 일련번호 (1900 날짜 시스템, 윤년 버그 포함 기본 동작과 호환)
function excelDateSerial(dateInput) {
if (!dateInput) return null;
const d = typeof dateInput === 'string' ? new Date(dateInput + 'T00:00:00Z') : dateInput;
if (isNaN(d.getTime())) return null;
const epoch = Date.UTC(1899, 11, 30); // 엑셀의 1900 날짜 체계 기준점
const days = Math.round((d.getTime() - epoch) / 86400000);
return days;
}

const BUYERS = {
'이관현 과장': { name: '이관현', dept: '기획감사팀', email: 'khlee@donghoon.com', phone: '010-2205-1324' },
'유환익 차장': { name: '유환익', dept: '기획감사팀', email: 'hiyoo@donghoon.com', phone: '010-3500-6370' },
};

// 대금지급 지급처(돈이 실제로 나가는 사업장) 고정 목록
const PAYMENT_SOURCES = ['본사', '창녕', '포천'];

const ITEM_ROW_START = 16;
const ITEM_ROW_MAX = 36; // 템플릿에 준비된 품목 행 범위 (21행)

function buildPurchaseOrder({ templateBuffer, site, vendor, buyerLabel, items, orderDateStr }) {
const entries = readZip(templateBuffer);
const sheetPath = 'xl/worksheets/sheet1.xml';
let xml = entries.get(sheetPath).toString('utf8');
const buyer = BUYERS[buyerLabel] || BUYERS['이관현 과장'];

// 제목 / 하단 사업장 표기
xml = setCellText(xml, 'B1', `발 주 서 (${site.title_label || ''})`);
xml = setCellText(xml, 'B53', Array.from(site.footer_label || '').join(' '));

// 발주자(사업장) 정보
xml = setCellText(xml, 'D5', site.company_name || '(주)동훈');
xml = setCellText(xml, 'I5', buyerLabel);
xml = setCellText(xml, 'D6', site.address || '');
xml = setCellText(xml, 'D7', site.ceo_name || '');
xml = setCellText(xml, 'I7', site.phone || '');
xml = setCellText(xml, 'D8', site.biz_reg_no || '');
xml = setCellText(xml, 'D9', site.item_type || '');
xml = setCellText(xml, 'I9', site.biz_type || '');
xml = setCellText(xml, 'L39', site.tax_email ? `전자세금계산서 주소 ▶ ${site.tax_email}` : '전자세금계산서 주소 ▶ ');
if (site.onsite_contact) {
xml = setCellText(xml, 'B38', `현장 입고 담당자 : ${site.onsite_contact}`);
}

// 담당자 서명/이메일/연락처 (선택된 구매담당 기준)
xml = setCellText(xml, 'N50', `서명 : ${buyer.dept} ${buyer.name} (직인생략)`);
xml = setCellText(xml, 'I51', `발주자 Email : ${buyer.email}`);
xml = setCellText(xml, 'Q51', `H.P ${buyer.phone}`);

// 공급자(업체) 정보
xml = setCellText(xml, 'O5', vendor.name || '');
xml = setCellText(xml, 'T5', vendor.contact_name || '');
xml = setCellText(xml, 'O6', vendor.address || '');
xml = setCellText(xml, 'O7', vendor.ceo_name || '');
xml = setCellText(xml, 'T7', vendor.phone || '');
xml = setCellText(xml, 'O8', vendor.biz_reg_no || '');
xml = setCellText(xml, 'O9', vendor.item_type || '');
xml = setCellText(xml, 'T9', vendor.biz_type || '');
if (vendor.contact_email) {
xml = setCellText(xml, 'Q3', vendor.contact_email);
}

// 발주일 / 납기일
const orderSerial = excelDateSerial(orderDateStr || new Date().toISOString().slice(0, 10));
if (orderSerial !== null) xml = setCellNumber(xml, 'B12', orderSerial);
const deliverySerial = excelDateSerial(site.deliveryDateStr);
if (deliverySerial !== null) xml = setCellNumber(xml, 'G12', deliverySerial);

// 대금지불조건 (기본값)
xml = setCellText(xml, 'N12', '익월 말 현금 지급');

// 품목 + 공급가액(단가*수량) 계산
let totalSupply = 0;
items.forEach((it, idx) => {
const row = ITEM_ROW_START + idx;
if (row > ITEM_ROW_MAX) return; // 템플릿 행 초과분은 생략 (추후 확장 가능)
const qty = it.qty || 0;
const unitPrice = it.unitPrice || 0;
const supplyAmount = qty * unitPrice;
totalSupply += supplyAmount;
xml = setCellText(xml, `B${row}`, it.name || '');
xml = setCellText(xml, `H${row}`, it.spec || '');
xml = setCellText(xml, `L${row}`, it.unit || '');
xml = setCellNumber(xml, `N${row}`, qty);
xml = setCellNumber(xml, `P${row}`, unitPrice);
xml = setCellComputed(xml, `S${row}`, supplyAmount);
});

// 합계(공급가액/부가세/합계금액) 캐시 값 갱신 - 수식은 유지, 값만 즉시 보이도록 채움
const vat = Math.round(totalSupply * 0.1);
const grandTotal = totalSupply + vat;
xml = setCellComputed(xml, 'P37', totalSupply);
xml = setCellComputed(xml, 'P38', vat);
xml = setCellComputed(xml, 'K14', grandTotal);

entries.set(sheetPath, Buffer.from(xml, 'utf8'));
// calcChain은 이제 실제 계산 순서와 안 맞아도 무방 - 엑셀이 열 때 재계산함. 제거해서 혹시 모를 충돌 방지.
entries.delete('xl/calcChain.xml');
// [Content_Types].xml / workbook rels에서 calcChain 참조 제거
if (entries.has('[Content_Types].xml')) {
let ct = entries.get('[Content_Types].xml').toString('utf8');
ct = ct.replace(/<Override[^>]*calcChain[^>]*\/>/, '');
entries.set('[Content_Types].xml', Buffer.from(ct, 'utf8'));
}
if (entries.has('xl/_rels/workbook.xml.rels')) {
let rels = entries.get('xl/_rels/workbook.xml.rels').toString('utf8');
rels = rels.replace(/<Relationship[^>]*calcChain[^>]*\/>/, '');
entries.set('xl/_rels/workbook.xml.rels', Buffer.from(rels, 'utf8'));
}

return writeZip(entries);
}

// ===== lib/mail.js =====
// 외부 패키지 없이 net/tls만으로 구현한 최소 SMTP 발신 클라이언트.
// Render 환경변수(SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM)로 설정한다.
// 설정이 안 되어 있으면 콘솔에만 로그를 남기고 조용히 넘어간다 (앱이 죽지 않도록).
const net = require('net');
const tls = require('tls');

function mailConfig() {
return {
host: process.env.SMTP_HOST || '',
port: Number(process.env.SMTP_PORT) || 587,
secure: process.env.SMTP_SECURE === 'true',
user: process.env.SMTP_USER || '',
pass: process.env.SMTP_PASS || '',
from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
};
}

function smtpReadResponse(socket) {
return new Promise((resolve) => {
let buf = '';
function onData(d) {
buf += d.toString('utf8');
const lines = buf.split('\r\n').filter(Boolean);
const last = lines[lines.length - 1] || '';
if (/^\d{3} /.test(last)) {
socket.removeListener('data', onData);
resolve(buf);
}
}
socket.on('data', onData);
});
}

function smtpWrite(socket, line) {
return new Promise((resolve, reject) => {
socket.write(line + '\r\n', (err) => (err ? reject(err) : resolve()));
});
}

async function smtpConverse(socket, { host, user, pass, from, to, subject, html }, startSecure) {
let sock = socket;
let secure = startSecure;
await smtpReadResponse(sock); // 220 greeting
await smtpWrite(sock, `EHLO ${host}`); await smtpReadResponse(sock);
if (!secure) {
await smtpWrite(sock, 'STARTTLS'); await smtpReadResponse(sock);
const upgraded = tls.connect({ socket: sock, host });
await new Promise((resolve, reject) => {
upgraded.once('secureConnect', resolve);
upgraded.once('error', reject);
});
sock = upgraded;
secure = true;
await smtpWrite(sock, `EHLO ${host}`); await smtpReadResponse(sock);
}
await smtpWrite(sock, 'AUTH LOGIN'); await smtpReadResponse(sock);
await smtpWrite(sock, Buffer.from(user, 'utf8').toString('base64')); await smtpReadResponse(sock);
await smtpWrite(sock, Buffer.from(pass, 'utf8').toString('base64')); await smtpReadResponse(sock);
await smtpWrite(sock, `MAIL FROM:<${from}>`); await smtpReadResponse(sock);
const recipients = Array.isArray(to) ? to : [to];
for (const r of recipients) {
await smtpWrite(sock, `RCPT TO:<${r}>`); await smtpReadResponse(sock);
}
await smtpWrite(sock, 'DATA'); await smtpReadResponse(sock);
const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
const headers = [
`From: ${from}`,
`To: ${recipients.join(', ')}`,
`Subject: ${encodedSubject}`,
'MIME-Version: 1.0',
'Content-Type: text/html; charset=UTF-8',
'',
''
].join('\r\n');
const safeBody = String(html).replace(/\r\n\.\r\n/g, '\r\n..\r\n');
await smtpWrite(sock, headers + safeBody + '\r\n.'); await smtpReadResponse(sock);
await smtpWrite(sock, 'QUIT');
return sock;
}

// { to: string|string[], subject, html } -> Promise<boolean>
function sendMail({ to, subject, html }) {
const cfg = mailConfig();
if (!cfg.host || !cfg.user || !cfg.pass || !cfg.from) {
console.warn(`[메일] SMTP 설정이 없어 메일을 보내지 않았습니다. 제목="${subject}" 수신자=${Array.isArray(to) ? to.join(',') : to}`);
return Promise.resolve(false);
}
return new Promise((resolve) => {
let settled = false;
const finish = (ok, err) => {
if (settled) return;
settled = true;
if (err) console.error('[메일] 전송 실패:', err.message || err);
resolve(ok);
};
try {
const socket = cfg.secure
? tls.connect({ host: cfg.host, port: cfg.port })
: net.connect({ host: cfg.host, port: cfg.port });
socket.setTimeout(15000, () => { finish(false, new Error('SMTP 연결 시간 초과')); try { socket.destroy(); } catch (e) {} });
socket.once('error', (e) => finish(false, e));
const onReady = () => {
smtpConverse(socket, { host: cfg.host, user: cfg.user, pass: cfg.pass, from: cfg.from, to, subject, html }, cfg.secure)
.then((finalSock) => { try { finalSock.end(); } catch (e) {} finish(true); })
.catch((e) => finish(false, e));
};
if (cfg.secure) socket.once('secureConnect', onReady);
else socket.once('connect', onReady);
} catch (e) {
finish(false, e);
}
});
}

const mail = { sendMail };

// ===== lib/render.js =====
function escapeHtml(str) {
if (str === null || str === undefined) return '';
return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&#39;');
}

function money(n) {
if (n === null || n === undefined) return '-';
return Number(n).toLocaleString('ko-KR') + '원';
}

function fmtDate(s) {
if (!s) return '-';
return s;
}

function layout({ title, body, user, flash }) {
return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · 힐마루 견적관리</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&family=Noto+Serif+KR:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/style.css">
</head>
<body>
<header class="topbar">
<div class="topbar-inner">
<div>
<a class="brand" href="${user ? (user.role === 'admin' ? '/admin' : '/vendor') : '/'}">힐마루</a>
<div class="brand-tagline">동훈그룹 · 견적관리시스템</div>
</div>
<nav>
${user ? `
<span class="who">${escapeHtml(user.displayName)}${user.role === 'admin' ? ' (관리자)' : ' (업체)'}</span>
<a href="${user.role === 'admin' ? '/admin/account' : '/vendor/account'}">계정설정</a>
<a href="/logout">로그아웃</a>
` : `<a href="/login">로그인</a>`}
</nav>
</div>
</header>
<main class="container">
${flash ? `<div class="flash ${flash.type || 'info'}">${escapeHtml(flash.message)}</div>` : ''}
${body}
</main>
<footer class="footer">힐마루 견적관리 시스템</footer>
</body>
</html>`;
}

// ===== lib/views.js =====
function optionTags(options, selected) {
return options.map((o) => `<option value="${escapeHtml(o)}" ${o === selected ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
}

function loginPage({ role = 'admin', error } = {}) {
const body = `
<div class="login-wrap">
<div class="login-hero">
<div class="mark">힐마루</div>
<div class="tagline">동훈그룹 · 견적관리시스템</div>
</div>
<div class="login-tabs">
<a href="/login?role=admin" class="${role === 'admin' ? 'active' : ''}">관리자</a>
<a href="/login?role=vendor" class="${role === 'vendor' ? 'active' : ''}">업체</a>
</div>
<div class="card" style="border-top:none;border-top-left-radius:0;border-top-right-radius:0;">
${error ? `<div class="flash error">${escapeHtml(error)}</div>` : ''}
<form method="POST" action="/login">
<input type="hidden" name="role" value="${role}">
<label>아이디</label>
<input type="text" name="login_id" required autofocus>
<label>비밀번호</label>
<input type="password" name="password" required>
<div style="margin-top:18px;"><button type="submit" style="width:100%;padding:11px;">로그인</button></div>
</form>
</div>
</div>`;
return layout({ title: '로그인', body });
}

function progressBar(selected, total) {
const pct = total > 0 ? Math.round((selected / total) * 100) : 0;
return `<div class="qr-progress-bar"><div class="qr-progress-fill" style="width:${pct}%"></div></div>`;
}
function adminDashboard({ user, requests, flash }) {
const cards = requests.map((r) => {
const statusLabel = r.selectedCount === 0 ? '접수중' : (r.selectedCount === r.totalItems ? '선정 완료' : `선정 ${r.selectedCount}/${r.totalItems}`);
const statusClass = r.selectedCount === 0 ? 'open' : (r.selectedCount === r.totalItems ? 'completed' : 'selecting');
return `
<a class="card qr-card" href="/admin/quote-requests/${r.id}">
<span class="qr-status ${statusClass}">${statusLabel}</span>
<div class="qr-title">${escapeHtml(r.title)}</div>
<div class="qr-meta">품목 ${r.totalItems} · 업체 ${r.vendorCount} · 제출 ${r.submittedVendorCount}/${r.vendorCount}</div>
<div class="qr-meta">제출 마감: ${escapeHtml(r.submission_deadline || '-')} · 요청 납기: ${escapeHtml(r.requested_delivery_date || '-')}</div>
${progressBar(r.selectedCount, r.totalItems)}
<div class="qr-total">${r.selectedCount === r.totalItems && r.totalItems > 0 ? '최종 총금액' : '현재 선정금액'}<br>${money(r.selectedAmount)}</div>
</a>`;
}).join('');

const body = `
<div class="section-actions">
<h1>관리자 대시보드</h1>
<a class="btn" href="/admin/quote-requests/new">+ 새 견적요청</a>
</div>
<div class="card" style="margin-bottom:14px;">
<form method="GET" action="/admin/quote-requests/export-results" style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;">
<div><label>발주일(선정일) 시작</label><input type="date" name="from"></div>
<div><label>발주일(선정일) 종료</label><input type="date" name="to"></div>
<div><button type="submit" class="btn secondary">↓ 구매Data 다운로드(.xlsx)</button></div>
<div class="hint" style="flex-basis:100%;">기간을 비워두면 전체 기간이 다운로드됩니다. 기준은 발주일(현재는 최종 선정일시로 대체)입니다.</div>
</form>
</div>
<div class="section-actions" style="margin-bottom:14px;">
<div><a href="/admin/vendors">업체 관리 →</a></div>
<div><a href="/admin/categories">업체 카테고리 관리 →</a></div>
<div><a href="/admin/sites">사업장 관리 →</a></div>
</div>
${requests.length === 0 ? '<div class="card">등록된 견적요청이 없습니다.</div>' : `<div class="card-grid">${cards}</div>`}
`;
return layout({ title: '관리자 대시보드', body, user, flash });
}

function fileLink(id, type, filename) {
if (!filename) return '<span class="hint">미등록</span>';
return `<a href="/admin/vendors/file/${id}/${type}" target="_blank">파일 보기</a>`;
}

function adminVendorsPage({ user, vendors, flash, editVendor, cat1Options, cat2Options, cat3Options }) {
const rows = vendors.map((v) => `
<tr>
<td>${escapeHtml(v.name)}</td>
<td>${escapeHtml([v.category1, v.category2, v.category3].filter(Boolean).join(' / ') || '-')}</td>
<td>${escapeHtml(v.contact_name)}</td>
<td>${escapeHtml(v.contact_email)}</td>
<td>${escapeHtml(v.login_id)}</td>
<td>${v.active ? '사용' : '비활성'}</td>
<td>${fileLink(v.id, 'biz', v.biz_reg_file)}</td>
<td>${fileLink(v.id, 'bankbook', v.bankbook_file)}</td>
<td><a class="btn small ghost" href="/admin/vendors?edit=${v.id}">수정</a></td>
</tr>`).join('');

const cat1Sel = editVendor ? editVendor.category1 : '';
const cat2Sel = editVendor ? editVendor.category2 : '';
const cat3Sel = editVendor ? editVendor.category3 : '';

const body = `
<div class="section-actions">
<h1>업체 관리</h1>
<a class="btn secondary" href="/admin/vendors/export">↓ 전체 업체 다운로드(.xlsx)</a>
</div>
<div class="card">
<table>
<thead><tr><th>업체명</th><th>카테고리</th><th>담당자</th><th>이메일</th><th>로그인ID</th><th>상태</th><th>사업자등록증</th><th>통장사본</th><th></th></tr></thead>
<tbody>${rows || '<tr><td colspan="9">등록된 업체가 없습니다.</td></tr>'}</tbody>
</table>
</div>
<h2>엑셀로 업체 일괄 등록</h2>
<div class="card">
<p class="hint"><a href="/admin/vendors/template">↓ 등록 양식 다운로드(.xlsx)</a> — 양식을 내려받아 작성한 뒤 업로드해주세요.</p>
<form method="POST" action="/admin/vendors/import" enctype="multipart/form-data">
<label>업체 목록 엑셀(.xlsx)</label>
<input type="file" name="vendors_excel" accept=".xlsx" required>
<p class="hint">1행은 머릿글로 건너뜁니다. 이미 있는 로그인아이디는 건너뜁니다.</p>
<button type="submit" class="btn secondary">일괄 등록</button>
</form>
</div>
<h2>${editVendor ? `업체 정보 수정 — ${escapeHtml(editVendor.name)}` : '업체 신규 등록'}</h2>
<div class="card">
<form method="POST" action="${editVendor ? `/admin/vendors/${editVendor.id}` : '/admin/vendors'}" enctype="multipart/form-data">
<div class="form-row">
<div><label>업체명</label><input type="text" name="name" required value="${editVendor ? escapeHtml(editVendor.name) : ''}"></div>
<div><label>사업자번호</label><input type="text" name="biz_reg_no" value="${editVendor ? escapeHtml(editVendor.biz_reg_no) : ''}"></div>
</div>
<fieldset>
<legend>발주서용 공급자 정보</legend>
<p class="hint">발주서 생성 시 '공급자' 란에 그대로 들어갑니다.</p>
<div class="form-row">
<div><label>주소</label><input type="text" name="address" value="${editVendor ? escapeHtml(editVendor.address) : ''}"></div>
<div><label>대표자</label><input type="text" name="ceo_name" value="${editVendor ? escapeHtml(editVendor.ceo_name) : ''}"></div>
<div><label>연락처</label><input type="text" name="phone" value="${editVendor ? escapeHtml(editVendor.phone) : ''}"></div>
</div>
<div class="form-row">
<div><label>종목</label><input type="text" name="item_type" value="${editVendor ? escapeHtml(editVendor.item_type) : ''}"></div>
<div><label>업태</label><input type="text" name="biz_type" value="${editVendor ? escapeHtml(editVendor.biz_type) : ''}"></div>
</div>
</fieldset>
<fieldset>
<legend>업체 카테고리</legend>
<p class="hint">목록에 없는 값이 필요하면 <a href="/admin/categories" target="_blank">카테고리 관리</a>에서 먼저 추가해주세요.</p>
<div class="form-row">
<div>
<label>카테고리1</label>
<select name="category1">
<option value="">선택 안 함</option>
${optionTags(cat1Options, cat1Sel)}
</select>
</div>
<div>
<label>카테고리2</label>
<select name="category2">
<option value="">선택 안 함</option>
${optionTags(cat2Options, cat2Sel)}
</select>
</div>
<div>
<label>카테고리3</label>
<select name="category3">
<option value="">선택 안 함</option>
${optionTags(cat3Options, cat3Sel)}
</select>
</div>
</div>
</fieldset>
<div class="form-row">
<div><label>담당자명</label><input type="text" name="contact_name" value="${editVendor ? escapeHtml(editVendor.contact_name) : ''}"></div>
<div><label>담당자 이메일</label><input type="email" name="contact_email" value="${editVendor ? escapeHtml(editVendor.contact_email) : ''}"></div>
<div><label>담당자 표시명</label><input type="text" name="display_name" value="${editVendor ? escapeHtml(editVendor.display_name) : ''}"></div>
</div>
<div class="form-row">
<div><label>업체 로그인 아이디</label><input type="text" name="login_id" required value="${editVendor ? escapeHtml(editVendor.login_id) : ''}"></div>
<div><label>비밀번호${editVendor ? ' (변경 시에만 입력)' : ''}</label><input type="password" name="password" ${editVendor ? '' : 'required'}></div>
<div><label>사용 상태</label>
<select name="active">
<option value="1" ${!editVendor || editVendor.active ? 'selected' : ''}>사용</option>
<option value="0" ${editVendor && !editVendor.active ? 'selected' : ''}>비활성</option>
</select>
</div>
</div>
<fieldset>
<legend>계좌 정보</legend>
<div class="form-row">
<div><label>은행명</label><input type="text" name="bank_name" value="${editVendor ? escapeHtml(editVendor.bank_name) : ''}"></div>
<div><label>계좌번호</label><input type="text" name="account_number" value="${editVendor ? escapeHtml(editVendor.account_number) : ''}"></div>
<div><label>예금주</label><input type="text" name="account_holder" value="${editVendor ? escapeHtml(editVendor.account_holder) : ''}"></div>
</div>
</fieldset>
<fieldset>
<legend>첨부 서류</legend>
<div class="form-row">
<div>
<label>사업자등록증</label>
<input type="file" name="biz_reg_file" accept=".pdf,.jpg,.jpeg,.png">
${editVendor ? `<div class="hint">현재: ${fileLink(editVendor.id, 'biz', editVendor.biz_reg_file)}</div>` : ''}
</div>
<div>
<label>통장사본</label>
<input type="file" name="bankbook_file" accept=".pdf,.jpg,.jpeg,.png">
${editVendor ? `<div class="hint">현재: ${fileLink(editVendor.id, 'bankbook', editVendor.bankbook_file)}</div>` : ''}
</div>
</div>
</fieldset>
<div style="margin-top:16px;">
<button type="submit">${editVendor ? '수정 저장' : '등록'}</button>
${editVendor ? '<a class="btn ghost" href="/admin/vendors" style="margin-left:8px;">취소</a>' : ''}
</div>
</form>
</div>
`;
return layout({ title: '업체 관리', body, user, flash });
}

function adminCategoriesPage({ user, groups, flash }) {
const groupLabels = { cat1: '카테고리1', cat2: '카테고리2', cat3: '카테고리3' };
const blocks = ['cat1', 'cat2', 'cat3'].map((gk) => {
const items = groups[gk] || [];
const rows = items.map((o) => `
<div class="vendor-row">
<form method="POST" action="/admin/categories/${o.id}" class="inline" style="flex:1;display:flex;gap:8px;align-items:center;">
<input type="text" name="label" value="${escapeHtml(o.label)}" style="flex:1;">
<button type="submit" class="btn small">저장</button>
</form>
<form method="POST" action="/admin/categories/${o.id}/delete" class="inline" onsubmit="return confirm('이 카테고리 값을 삭제할까요? 이미 등록된 업체의 값은 유지됩니다.');">
<button type="submit" class="btn small danger">삭제</button>
</form>
</div>`).join('');
return `
<div class="card">
<h3 style="margin-top:0;">${groupLabels[gk]}</h3>
${items.length === 0 ? '<p class="hint">등록된 값이 없습니다.</p>' : rows}
<form method="POST" action="/admin/categories" style="margin-top:12px;display:flex;gap:8px;">
<input type="hidden" name="group_key" value="${gk}">
<input type="text" name="label" placeholder="새 값 추가" required style="flex:1;">
<button type="submit" class="btn secondary small">추가</button>
</form>
</div>`;
}).join('');

const body = `
<h1>업체 카테고리 관리</h1>
<p class="hint">여기서 추가·수정·삭제한 값은 업체 등록/수정 화면의 카테고리1·2·3 선택 목록에 바로 반영됩니다.</p>
${blocks}
<div class="card">
<h3 style="margin-top:0;">엑셀로 카테고리 일괄 추가</h3>
<p class="hint"><a href="/admin/categories/template">↓ 등록 양식 다운로드(.xlsx)</a> — 양식을 내려받아 작성한 뒤 업로드해주세요.</p>
<form method="POST" action="/admin/categories/import" enctype="multipart/form-data">
<label>카테고리 목록 엑셀(.xlsx)</label>
<input type="file" name="categories_excel" accept=".xlsx" required>
<p class="hint">1행은 머릿글로 건너뜁니다. 구분 칸에는 "카테고리1"/"카테고리2"/"카테고리3" 중 하나를 적어주세요.</p>
<button type="submit" class="btn secondary">일괄 추가</button>
</form>
</div>
<a href="/admin/vendors">← 업체 관리로 돌아가기</a>
`;
return layout({ title: '카테고리 관리', body, user, flash });
}

function adminSitesPage({ user, sites, flash, editSite, onsiteContacts }) {
const rows = sites.map((st) => `
<tr>
<td>${escapeHtml(st.name)}</td>
<td>${escapeHtml(st.title_label)}</td>
<td>${escapeHtml(st.address)}</td>
<td>${escapeHtml(st.biz_reg_no)}</td>
<td><a class="btn small ghost" href="/admin/sites?edit=${st.id}">수정</a></td>
</tr>`).join('');

const body = `
<h1>사업장 관리</h1>
<p class="hint">여기서 등록한 사업장 정보는 발주서의 발주자(㈜동훈) 정보로 자동으로 채워집니다.</p>
<div class="card">
<table>
<thead><tr><th>사업장명</th><th>발주서 표기</th><th>주소</th><th>사업자번호</th><th></th></tr></thead>
<tbody>${rows || '<tr><td colspan="5">등록된 사업장이 없습니다.</td></tr>'}</tbody>
</table>
</div>
<h2>엑셀로 사업장 일괄 등록</h2>
<div class="card">
<p class="hint"><a href="/admin/sites/template">↓ 등록 양식 다운로드(.xlsx)</a> — 양식을 내려받아 작성한 뒤 업로드해주세요.</p>
<form method="POST" action="/admin/sites/import" enctype="multipart/form-data">
<label>사업장 목록 엑셀(.xlsx)</label>
<input type="file" name="sites_excel" accept=".xlsx" required>
<p class="hint">1행은 머릿글로 건너뜁니다.</p>
<button type="submit" class="btn secondary">일괄 등록</button>
</form>
</div>
<h2>${editSite ? `사업장 수정 — ${escapeHtml(editSite.name)}` : '사업장 신규 등록'}</h2>
<div class="card">
<form method="POST" action="${editSite ? `/admin/sites/${editSite.id}` : '/admin/sites'}">
<div class="form-row">
<div><label>사업장명</label><input type="text" name="name" required value="${editSite ? escapeHtml(editSite.name) : ''}" placeholder="예) 힐마루 포천"></div>
<div><label>발주서 표기(괄호 안 지역명)</label><input type="text" name="title_label" required value="${editSite ? escapeHtml(editSite.title_label) : ''}" placeholder="예) 포천"></div>
<div><label>발주자 회사명</label><input type="text" name="company_name" value="${editSite ? escapeHtml(editSite.company_name) : '(주)동훈'}"></div>
</div>
<div class="form-row">
<div><label>주소</label><input type="text" name="address" value="${editSite ? escapeHtml(editSite.address) : ''}"></div>
<div><label>대표자</label><input type="text" name="ceo_name" value="${editSite ? escapeHtml(editSite.ceo_name) : ''}"></div>
<div><label>연락처</label><input type="text" name="phone" value="${editSite ? escapeHtml(editSite.phone) : ''}"></div>
</div>
<div class="form-row">
<div><label>사업자번호</label><input type="text" name="biz_reg_no" value="${editSite ? escapeHtml(editSite.biz_reg_no) : ''}"></div>
<div><label>종목</label><input type="text" name="item_type" value="${editSite ? escapeHtml(editSite.item_type) : ''}"></div>
<div><label>업태</label><input type="text" name="biz_type" value="${editSite ? escapeHtml(editSite.biz_type) : ''}"></div>
</div>
<div class="form-row">
<div><label>전자세금계산서 이메일</label><input type="email" name="tax_email" value="${editSite ? escapeHtml(editSite.tax_email) : ''}"></div>
<div><label>현장 입고 담당자 표시</label><input type="text" name="onsite_contact" value="${editSite ? escapeHtml(editSite.onsite_contact) : ''}" placeholder="예) 홍길동 010-0000-0000"></div>
<div><label>발주서 하단 표기</label><input type="text" name="footer_label" value="${editSite ? escapeHtml(editSite.footer_label) : ''}" placeholder="예) 주식회사동훈힐마루CC포천"></div>
</div>
<div style="margin-top:16px;">
<button type="submit">${editSite ? '수정 저장' : '등록'}</button>
${editSite ? '<a class="btn ghost" href="/admin/sites" style="margin-left:8px;">취소</a>' : ''}
</div>
</form>
</div>
${editSite ? `
<h2>${escapeHtml(editSite.name)} — 현장 입고 담당자 목록</h2>
<div class="card">
<p class="hint">발주서 생성 시 여기 등록된 담당자 중에서 선택할 수 있습니다.</p>
${(onsiteContacts || []).map((c) => `
<div class="vendor-row">
<form method="POST" action="/admin/sites/contacts/${c.id}" class="inline" style="flex:1;display:flex;gap:8px;align-items:center;">
<input type="text" name="name" value="${escapeHtml(c.name)}" placeholder="이름" style="flex:1;">
<input type="text" name="phone" value="${escapeHtml(c.phone)}" placeholder="연락처" style="flex:1;">
<button type="submit" class="btn small">저장</button>
</form>
<form method="POST" action="/admin/sites/contacts/${c.id}/delete" class="inline" onsubmit="return confirm('삭제할까요?');">
<button type="submit" class="btn small danger">삭제</button>
</form>
</div>`).join('') || '<p class="hint">등록된 담당자가 없습니다.</p>'}
<form method="POST" action="/admin/sites/${editSite.id}/contacts" style="margin-top:12px;display:flex;gap:8px;">
<input type="text" name="name" placeholder="이름" required style="flex:1;">
<input type="text" name="phone" placeholder="연락처 (예: 010-0000-0000)" style="flex:1;">
<button type="submit" class="btn secondary small">추가</button>
</form>
</div>` : ''}
`;
return layout({ title: '사업장 관리', body, user, flash });
}

function itemCategorySelects(cat1Options, cat2Options, cat3Options, sel1, sel2, sel3) {
return `
<div><label>과목1(품목구분)</label>
<select name="item_category1[]"><option value="">선택 안 함</option>${optionTags(cat1Options || [], sel1)}</select>
</div>
<div><label>과목2</label>
<select name="item_category2[]"><option value="">선택 안 함</option>${optionTags(cat2Options || [], sel2)}</select>
</div>
<div><label>과목3</label>
<select name="item_category3[]"><option value="">선택 안 함</option>${optionTags(cat3Options || [], sel3)}</select>
</div>`;
}

function quoteRequestNewPage({ user, vendorsByCategory, cat1Options, cat2Options, cat3Options, sites, flash }) {
const groups = [...cat1Options, ...Object.keys(vendorsByCategory).filter((k) => !cat1Options.includes(k))];
const catBlocks = groups.map((cat) => {
const vs = vendorsByCategory[cat] || [];
if (vs.length === 0) return '';
const rows = vs.map((v) => `
<div class="vendor-row">
<span class="vname">${escapeHtml(v.name)}</span>
<label style="display:inline;margin:0;"><input type="checkbox" name="assign_view" value="${v.id}"> 조회</label>
<label style="display:inline;margin:0;"><input type="checkbox" name="assign_submit" value="${v.id}" class="submit-cb-${cat}"> 견적입력</label>
</div>`).join('');
return `
<div class="category-block">
<div class="category-title">${escapeHtml(cat)} (${vs.length}개 업체)</div>
${rows}
</div>`;
}).join('');

const siteOptions = (sites || []).map((st) => `<option value="${st.id}">${escapeHtml(st.name)}</option>`).join('');
const body = `
<h1>새 견적요청</h1>
<form method="POST" action="/admin/quote-requests" enctype="multipart/form-data">
<div class="card">
<label>견적요청 제목</label>
<input type="text" name="title" required placeholder="예) 2026년 9월 코스관리 자재 견적">
<div class="form-row">
<div><label>사업장</label>
<select name="site_id" required>
<option value="">선택</option>
${siteOptions}
</select>
</div>
<div><label>견적 제출 마감일</label><input type="date" name="submission_deadline"></div>
<div><label>요청 납기일자</label><input type="date" name="requested_delivery_date"></div>
</div>
<div class="form-row">
<div><label>담당자명</label><input type="text" name="manager_name" placeholder="이 견적요청 담당자"></div>
<div><label>담당자 이메일</label><input type="email" name="manager_email" placeholder="업체가 견적을 제출하면 이 메일로 알림이 갑니다"></div>
</div>
</div>
<div class="card">
<h3 style="margin-top:0;">품목 목록</h3>
<div id="items-wrap">
<div class="form-row item-row">
<div><label>품목명</label><input type="text" name="item_name[]"></div>
<div><label>규격</label><input type="text" name="item_spec[]"></div>
<div><label>수량</label><input type="number" name="item_qty[]" value="1" min="1"></div>
<div><label>단위</label><input type="text" name="item_unit[]" placeholder="예) 포, 톤, EA"></div>
${itemCategorySelects(cat1Options, cat2Options, cat3Options)}
</div>
</div>
<p class="hint">품목명은 직접 입력하거나 엑셀 업로드만으로 등록해도 됩니다(둘 다 비워두면 품목 없이 견적요청만 생성됩니다).</p>
<p class="hint">과목1/2/3은 나중에 구매Data를 다운로드해서 구매 실적 보고서를 만들 때 품목 분류로 쓰입니다. 목록에 없는 값이 필요하면 <a href="/admin/categories" target="_blank">카테고리 관리</a>에서 먼저 추가해주세요.</p>
<button type="button" class="btn secondary small" onclick="addItemRow()">+ 품목 추가</button>
<div style="margin-top:14px;">
<label>또는 엑셀로 품목 일괄 등록</label>
<p class="hint"><a href="/admin/quote-requests/items-template">↓ 등록 양식 다운로드(.xlsx)</a></p>
<input type="file" name="items_excel" accept=".xlsx">
<p class="hint">엑셀 업로드 시 위에 직접 입력한 품목과 함께 등록됩니다.</p>
</div>
</div>
<div class="card">
<h3 style="margin-top:0;">카테고리별(카테고리1 기준) 업체 배정</h3>
<p class="hint">체크한 업체에게 이 견적요청이 노출됩니다. '견적입력'은 견적 제출 가능, '조회'만 체크하면 열람만 가능합니다. 생성 시 배정된 업체에게 안내 메일이 발송됩니다.</p>
${catBlocks || '<p class="hint">등록된 업체가 없습니다. 먼저 업체를 등록하세요.</p>'}
</div>
<button type="submit">견적요청 생성</button>
</form>
<script>
function addItemRow() {
const wrap = document.getElementById('items-wrap');
const row = wrap.firstElementChild.cloneNode(true);
row.querySelectorAll('input').forEach(i => { if (i.name === 'item_qty[]') i.value = 1; else i.value = ''; });
row.querySelectorAll('select').forEach(s => { s.selectedIndex = 0; });
wrap.appendChild(row);
}
</script>
`;
return layout({ title: '새 견적요청', body, user, flash });
}

function quoteRequestEditPage({ user, qr, items, vendorsByCategory, assignments, cat1Options, cat2Options, cat3Options, sites, flash }) {
const groups = [...cat1Options, ...Object.keys(vendorsByCategory).filter((k) => !cat1Options.includes(k))];
const assignedViewIds = new Set(assignments.filter((a) => a.permission !== 'submit').map((a) => a.vendor_id));
const assignedSubmitIds = new Set(assignments.filter((a) => a.permission === 'submit').map((a) => a.vendor_id));

const catBlocks = groups.map((cat) => {
const vs = vendorsByCategory[cat] || [];
if (vs.length === 0) return '';
const rows = vs.map((v) => {
const isSubmit = assignedSubmitIds.has(v.id);
const isView = assignedViewIds.has(v.id) || isSubmit;
return `
<div class="vendor-row">
<span class="vname">${escapeHtml(v.name)}</span>
<label style="display:inline;margin:0;"><input type="checkbox" name="assign_view" value="${v.id}" ${isView ? 'checked' : ''}> 조회</label>
<label style="display:inline;margin:0;"><input type="checkbox" name="assign_submit" value="${v.id}" ${isSubmit ? 'checked' : ''}> 견적입력</label>
</div>`;
}).join('');
return `
<div class="category-block">
<div class="category-title">${escapeHtml(cat)} (${vs.length}개 업체)</div>
${rows}
</div>`;
}).join('');

const itemRows = items.map((it) => `
<div class="form-row item-row">
<input type="hidden" name="item_id[]" value="${it.id}">
<div><label>품목명</label><input type="text" name="item_name[]" required value="${escapeHtml(it.item_name)}"></div>
<div><label>규격</label><input type="text" name="item_spec[]" value="${escapeHtml(it.spec || '')}"></div>
<div><label>수량</label><input type="number" name="item_qty[]" value="${it.qty}" min="1"></div>
<div><label>단위</label><input type="text" name="item_unit[]" value="${escapeHtml(it.unit || '')}"></div>
${itemCategorySelects(cat1Options, cat2Options, cat3Options, it.category1 || '', it.category2 || '', it.category3 || '')}
<div style="align-self:end;"><label>&nbsp;</label><label style="display:inline;margin:0;"><input type="checkbox" name="item_remove[]" value="${it.id}"> 이 품목 삭제</label></div>
</div>`).join('');

const blankRow = `
<div class="form-row item-row">
<input type="hidden" name="item_id[]" value="">
<div><label>품목명</label><input type="text" name="item_name[]"></div>
<div><label>규격</label><input type="text" name="item_spec[]"></div>
<div><label>수량</label><input type="number" name="item_qty[]" value="1" min="1"></div>
<div><label>단위</label><input type="text" name="item_unit[]"></div>
${itemCategorySelects(cat1Options, cat2Options, cat3Options)}
<div style="align-self:end;"><label>&nbsp;</label><span class="hint">신규 품목</span></div>
</div>`;

const siteOptions = (sites || []).map((st) => `<option value="${st.id}" ${Number(qr.site_id) === st.id ? 'selected' : ''}>${escapeHtml(st.name)}</option>`).join('');
const body = `
<h1>견적요청 수정 — ${escapeHtml(qr.title)}</h1>
<p class="hint">이미 제출된 견적이 있는 품목을 삭제하면 해당 견적·선정 내역도 함께 삭제됩니다.</p>
<form method="POST" action="/admin/quote-requests/${qr.id}/edit" enctype="multipart/form-data">
<div class="card">
<label>견적요청 제목</label>
<input type="text" name="title" required value="${escapeHtml(qr.title)}">
<div class="form-row">
<div><label>사업장</label>
<select name="site_id" required>
<option value="">선택</option>
${siteOptions}
</select>
</div>
<div><label>견적 제출 마감일</label><input type="date" name="submission_deadline" value="${escapeHtml(qr.submission_deadline || '')}"></div>
<div><label>요청 납기일자</label><input type="date" name="requested_delivery_date" value="${escapeHtml(qr.requested_delivery_date || '')}"></div>
</div>
<div class="form-row">
<div><label>담당자명</label><input type="text" name="manager_name" value="${escapeHtml(qr.manager_name || '')}"></div>
<div><label>담당자 이메일</label><input type="email" name="manager_email" value="${escapeHtml(qr.manager_email || '')}"></div>
</div>
</div>
<div class="card">
<h3 style="margin-top:0;">품목 목록</h3>
<div id="items-wrap">
${itemRows}
</div>
<button type="button" class="btn secondary small" onclick="addItemRow()">+ 품목 추가</button>
<div style="margin-top:14px;">
<label>또는 엑셀로 품목 추가</label>
<p class="hint"><a href="/admin/quote-requests/items-template">↓ 등록 양식 다운로드(.xlsx)</a></p>
<input type="file" name="items_excel" accept=".xlsx">
<p class="hint">엑셀 업로드 시 기존 품목은 유지되고 새 품목으로 추가됩니다.</p>
</div>
</div>
<div class="card">
<h3 style="margin-top:0;">카테고리별(카테고리1 기준) 업체 배정</h3>
<p class="hint">체크한 업체에게 이 견적요청이 노출됩니다. '견적입력'은 견적 제출 가능, '조회'만 체크하면 열람만 가능합니다. 체크를 해제하면 해당 업체는 더 이상 이 견적요청에 접근할 수 없습니다(단, 이미 제출한 견적 내역은 유지됩니다).</p>
${catBlocks || '<p class="hint">등록된 업체가 없습니다.</p>'}
</div>
<button type="submit">수정 저장</button>
<a class="btn ghost" href="/admin/quote-requests/${qr.id}" style="margin-left:8px;">취소</a>
</form>
<script>
function addItemRow() {
const wrap = document.getElementById('items-wrap');
const template = document.createElement('div');
template.innerHTML = ${JSON.stringify(blankRow)};
wrap.appendChild(template.firstElementChild);
}
</script>
`;
return layout({ title: `견적요청 수정 — ${qr.title}`, body, user, flash });
}

function submissionRow(s, { isLowest, isSelected }) {
const typeLabel = s.type === 'requested' ? '요청품' : '대체품';
const typeBadge = `<span class="badge ${s.type}">${typeLabel}</span>`;
const total = s.unit_price * s.qty;
return `
<tr class="${s.type === 'substitute' ? 'row-substitute' : ''} ${isLowest ? 'row-lowest' : ''} ${isSelected ? 'row-selected' : ''}">
<td>${typeBadge}${isLowest ? '<span class="badge lowest">최저가</span>' : ''}${isSelected ? '<span class="badge selected">선정됨</span>' : ''}</td>
<td>${escapeHtml(s.vendor_name)}</td>
<td>${escapeHtml(s.product_name)}</td>
<td>${escapeHtml(s.spec)}</td>
<td>${s.qty}${escapeHtml(s.unit)}</td>
<td>${money(s.unit_price)}</td>
<td>${money(total)}</td>
<td>${escapeHtml(s.delivery_date || '-')}</td>
<td>${escapeHtml(s.manufacturer || '-')}</td>
<td>${s.substitute_reason ? escapeHtml(s.substitute_reason) : '-'}</td>
<td>
${isSelected ? '<span class="hint">현재 선정됨</span>' : (isLowest ? `
<form method="POST" action="/admin/quote-requests/select" class="inline">
<input type="hidden" name="quote_item_id" value="${s.quote_item_id}">
<input type="hidden" name="submission_id" value="${s.id}">
<button type="submit" class="btn small">이 업체로 선정</button>
</form>` : `
<form method="POST" action="/admin/quote-requests/select" style="display:flex;gap:4px;align-items:center;">
<input type="hidden" name="quote_item_id" value="${s.quote_item_id}">
<input type="hidden" name="submission_id" value="${s.id}">
<input type="text" name="reason" placeholder="선정 사유(필수)" required style="width:120px;font-size:12px;padding:4px 6px;">
<button type="submit" class="btn small secondary">선정</button>
</form>`)}
</td>
</tr>`;
}

function quoteRequestDetailPage({ user, qr, items, assignments, vendorsByCategory, submissionsByItem, selections, buyerLabels, hasSite, onsiteContacts, flash }) {
const totalItems = items.length;
const selectedCount = items.filter((it) => selections[it.id]).length;
const selectedAmount = items.reduce((sum, it) => {
const sel = selections[it.id];
if (!sel) return sum;
return sum + sel.unit_price * sel.qty;
}, 0);

const itemsBlocks = items.map((it) => {
const subs = submissionsByItem[it.id] || [];
const sel = selections[it.id];
let minPrice = null;
if (subs.length > 0) minPrice = Math.min(...subs.map((s) => s.unit_price));
const rows = subs
.slice()
.sort((a, b) => a.unit_price - b.unit_price)
.map((s) => submissionRow(s, { isLowest: s.unit_price === minPrice, isSelected: sel && sel.id === s.id }))
.join('');

return `
<div class="card">
<div class="section-actions">
<h3 style="margin:0;">${escapeHtml(it.item_name)} <span class="hint">(${escapeHtml(it.spec || '')} · ${it.qty}${escapeHtml(it.unit || '')})</span> ${[it.category1, it.category2, it.category3].filter(Boolean).length ? `<span class="hint">[${escapeHtml([it.category1, it.category2, it.category3].filter(Boolean).join(' / '))}]</span>` : ''}</h3>
${sel ? '<span class="badge selected">선정 완료</span>' : '<span class="hint">미선정</span>'}
</div>
${subs.length === 0 ? '<p class="hint">아직 제출된 견적이 없습니다.</p>' : `
<table>
<thead><tr><th>구분</th><th>업체</th><th>제안 품목</th><th>규격</th><th>수량</th><th>단가</th><th>총액</th><th>납기일자</th><th>제조사</th><th>대체 사유</th><th></th></tr></thead>
<tbody>${rows}</tbody>
</table>`}
</div>`;
}).join('');

const catBlocks = Object.keys(vendorsByCategory).map((cat) => {
const vs = vendorsByCategory[cat] || [];
if (vs.length === 0) return '';
const rows = vs.map((v) => {
const a = assignments.find((x) => x.vendor_id === v.id);
return `
<div class="vendor-row">
<span class="vname">${escapeHtml(v.name)}</span>
<span class="hint">${a ? (a.permission === 'submit' ? '견적입력 권한' : '조회 권한') : '미배정'}</span>
</div>`;
}).join('');
return `<div class="category-block"><div class="category-title">${escapeHtml(cat)}</div>${rows}</div>`;
}).join('');

const body = `
<div class="section-actions">
<h1>${escapeHtml(qr.title)}</h1>
<a class="btn ghost" href="/admin/quote-requests/${qr.id}/edit">견적요청 수정</a>
</div>
<div class="card">
<div class="qr-meta">제출 마감: ${escapeHtml(qr.submission_deadline || '-')} · 요청 납기일자: ${escapeHtml(qr.requested_delivery_date || '-')}</div>
<h3 style="margin-bottom:4px;">최종 선정 진행 현황</h3>
<div>${selectedCount} / ${totalItems} 품목 선정</div>
${progressBar(selectedCount, totalItems)}
${selectedCount === totalItems && totalItems > 0 ? '<div class="flash success" style="margin-top:10px;">모든 품목의 최종 선정이 완료되었습니다.</div>' : ''}
</div>
<h2>품목별 견적 비교</h2>
${itemsBlocks}
${selectedCount > 0 ? `
<h2>품목별 최종 선정 결과</h2>
<div class="card">
<table>
<thead><tr><th>기준 품목</th><th>선정 구분</th><th>선정 품목</th><th>선정 업체</th><th>수량</th><th>단가</th><th>품목 총금액</th><th>납기일자</th><th>선정 사유</th></tr></thead>
<tbody>
${items.filter((it) => selections[it.id]).map((it) => {
const s = selections[it.id];
const reasonLabel = s.isLowestPick ? '최저가' : (s.selectionReason || '-');
return `<tr>
<td>${escapeHtml(it.item_name)}</td>
<td><span class="badge ${s.type}">${s.type === 'requested' ? '요청품' : '대체품'}</span></td>
<td>${escapeHtml(s.product_name)}</td>
<td>${escapeHtml(s.vendor_name)}</td>
<td>${s.qty}${escapeHtml(s.unit)}</td>
<td>${money(s.unit_price)}</td>
<td>${money(s.unit_price * s.qty)}</td>
<td>${escapeHtml(s.delivery_date || '-')}</td>
<td>${s.isLowestPick ? `<span class="badge lowest" style="margin-left:0;">${escapeHtml(reasonLabel)}</span>` : escapeHtml(reasonLabel)}</td>
</tr>`;
}).join('')}
</tbody>
</table>
<div class="total-box">
<div class="label">${selectedCount === totalItems ? '완전 총금액' : '현재 선정금액'}</div>
<div class="value">${money(selectedAmount)}</div>
</div>
</div>` : ''}
${selectedCount > 0 ? `
<h2>업체별 발주서 생성</h2>
${!hasSite ? `<div class="card"><p class="hint">발주서를 생성하려면 먼저 <a href="/admin/quote-requests/${qr.id}/edit">견적요청 수정</a>에서 사업장을 지정해주세요.</p></div>` : (() => {
const groups = {};
items.filter((it) => selections[it.id]).forEach((it) => {
const s = selections[it.id];
if (!groups[s.vendor_id]) groups[s.vendor_id] = { vendorName: s.vendor_name, rows: [] };
groups[s.vendor_id].rows.push({ itemName: it.item_name, product_name: s.product_name, qty: s.qty, unit: s.unit, unit_price: s.unit_price });
});
return Object.keys(groups).map((vid) => {
const g = groups[vid];
const itemRows = g.rows.map((r) => `<li>${escapeHtml(r.product_name)} · ${r.qty}${escapeHtml(r.unit)} · ${money(r.unit_price)}</li>`).join('');
const buyerOpts = (buyerLabels || []).map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
const contactOpts = (onsiteContacts || []).map((c) => `<option value="${c.id}">${escapeHtml(c.name)}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</option>`).join('');
const today = new Date().toISOString().slice(0, 10);
return `
<div class="card">
<h3 style="margin-top:0;">${escapeHtml(g.vendorName)}</h3>
<ul style="margin:4px 0 12px 20px;padding:0;font-size:14px;">${itemRows}</ul>
<form method="GET" action="/admin/quote-requests/${qr.id}/po/${vid}" style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;">
<div><label>구매담당</label><select name="buyer">${buyerOpts}</select></div>
<div><label>발주일자</label><input type="date" name="orderDate" value="${today}"></div>
<div><label>입고 요청일자</label><input type="date" name="deliveryDate" value="${escapeHtml(qr.requested_delivery_date || today)}"></div>
<div><label>현장 입고 담당자(저장된 목록)</label>
<select name="onsiteContactId">
<option value="">선택 안 함(기본값)</option>
${contactOpts}
</select>
</div>
<div><label>담당자 직접입력</label><input type="text" name="onsiteContactName" placeholder="목록에 없으면 직접 입력"></div>
<div><label>담당자 연락처</label><input type="text" name="onsiteContactPhone" placeholder="010-0000-0000"></div>
<button type="submit" class="btn small">발주서 다운로드</button>
</form>
<p class="hint" style="margin-top:6px;">담당자를 직접 입력하면 저장된 목록 선택은 무시되고 직접입력 값이 사용됩니다.</p>
</div>`;
}).join('');
})()}
` : ''}
<h2>배정된 업체</h2>
<div class="card">${catBlocks || '<p class="hint">배정된 업체가 없습니다.</p>'}</div>
${selectedCount === totalItems && totalItems > 0 ? `
<h2>견적요청 완료 처리</h2>
<div class="card">
${qr.status === 'completed' ? '<div class="flash success" style="margin-bottom:12px;">완료 처리된 견적요청입니다. 아래 정보는 다시 수정해서 저장할 수 있습니다.</div>' : '<p class="hint" style="margin-top:0;">기안번호/기안제목과 품목별 실제 입고일자·대금지급일자·지급처를 입력하고 완료 처리하면, 구매Data 다운로드에 해당 정보가 빈칸 없이 채워집니다.</p>'}
<form method="POST" action="/admin/quote-requests/${qr.id}/complete">
<div class="form-row">
<div><label>기안번호</label><input type="text" name="draft_no" value="${escapeHtml(qr.draft_no || '')}" placeholder="예) 2026-구매-0123"></div>
<div><label>기안제목</label><input type="text" name="draft_title" value="${escapeHtml(qr.draft_title || '')}" placeholder="예) 코스 배토사 구매"></div>
</div>
<h4 style="margin:16px 0 8px;">품목별 입고/대금지급 정보</h4>
<table>
<thead><tr><th>품목</th><th>선정 업체</th><th>실제 입고일자</th><th>대금지급일자</th><th>지급처</th></tr></thead>
<tbody>
${items.filter((it) => selections[it.id]).map((it) => {
const s = selections[it.id];
const recipientOpts = PAYMENT_SOURCES.map((p) => `<option value="${escapeHtml(p)}" ${s.paymentRecipient === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
const customRecipient = s.paymentRecipient && !PAYMENT_SOURCES.includes(s.paymentRecipient);
return `<tr>
<td>${escapeHtml(it.item_name)}<input type="hidden" name="fs_item_id[]" value="${it.id}"></td>
<td>${escapeHtml(s.vendor_name)}</td>
<td><input type="date" name="fs_received_date[]" value="${escapeHtml(s.receivedDate || '')}"></td>
<td><input type="date" name="fs_payment_date[]" value="${escapeHtml(s.paymentDate || '')}"></td>
<td><select name="fs_payment_recipient[]">
<option value="" ${!s.paymentRecipient ? 'selected' : ''}>선택 안 함</option>
${recipientOpts}
${customRecipient ? `<option value="${escapeHtml(s.paymentRecipient)}" selected>${escapeHtml(s.paymentRecipient)}(기존값)</option>` : ''}
</select></td>
</tr>`;
}).join('')}
</tbody>
</table>
<div style="margin-top:14px;"><button type="submit" class="btn">${qr.status === 'completed' ? '완료 정보 저장' : '완료 처리'}</button></div>
</form>
</div>
` : ''}
`;
return layout({ title: qr.title, body, user, flash });
}

function vendorDashboard({ user, requests, flash }) {
const rows = requests.map((r) => `
<a class="card qr-card" href="/vendor/quote-requests/${r.id}">
<div class="qr-title">${escapeHtml(r.title)}</div>
<div class="qr-meta">${r.permission === 'submit' ? '견적입력 가능' : '열람 전용'}</div>
<div class="qr-meta">제출 마감: ${escapeHtml(r.submission_deadline || '-')} · 요청 납기: ${escapeHtml(r.requested_delivery_date || '-')}</div>
</a>`).join('');
const body = `
<h1>업체 대시보드</h1>
${requests.length === 0 ? '<div class="card">배정된 견적요청이 없습니다.</div>' : `<div class="card-grid">${rows}</div>`}
`;
return layout({ title: '업체 대시보드', body, user, flash });
}

function vendorQuoteRequestPage({ user, qr, items, permission, mySubmissions, flash }) {
const canSubmit = permission === 'submit';
const itemBlocks = items.map((it) => {
const mine = mySubmissions.filter((s) => s.quote_item_id === it.id);
const requestedMine = mine.filter((s) => s.type === 'requested');
const subsMine = mine.filter((s) => s.type === 'substitute');
const req0 = requestedMine[0] || null;

const subBlocks = subsMine.map((s) => `
<div class="card" style="background:#fdf7ec;margin-bottom:8px;">
<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
<div style="font-size:14px;"><span class="badge substitute">대체품</span> ${escapeHtml(s.product_name)} · ${escapeHtml(s.spec || '')} · ${s.qty}${escapeHtml(s.unit || '')} · ${money(s.unit_price)} · 납기 ${escapeHtml(s.delivery_date || '-')}</div>
${canSubmit ? `<form method="POST" action="/vendor/quote-requests/${qr.id}/submissions/${s.id}/delete" class="inline" onsubmit="return confirm('이 대체품 제안을 삭제할까요?');"><button type="submit" class="btn small danger">삭제</button></form>` : ''}
</div>
${s.substitute_reason ? `<p class="hint" style="margin:6px 0 0;">제안 사유: ${escapeHtml(s.substitute_reason)}</p>` : ''}
${canSubmit ? `
<details style="margin-top:8px;">
<summary style="cursor:pointer;color:#2563eb;font-size:13px;">▸ 수정하기</summary>
<form method="POST" action="/vendor/quote-requests/${qr.id}/submissions" style="margin-top:8px;">
<input type="hidden" name="quote_item_id" value="${it.id}">
<input type="hidden" name="type" value="substitute">
<input type="hidden" name="submission_id" value="${s.id}">
<div class="form-row">
<div><label>대체품명</label><input type="text" name="product_name" value="${escapeHtml(s.product_name)}" required></div>
<div><label>규격</label><input type="text" name="spec" value="${escapeHtml(s.spec || '')}"></div>
<div><label>수량</label><input type="number" name="qty" value="${s.qty}" min="1" required></div>
<div><label>단위</label><input type="text" name="unit" value="${escapeHtml(s.unit || '')}"></div>
</div>
<div class="form-row">
<div><label>단가(원)</label><input type="number" name="unit_price" min="0" required value="${s.unit_price}"></div>
<div><label>납기일자</label><input type="date" name="delivery_date" value="${escapeHtml(s.delivery_date || '')}"></div>
<div><label>제조사</label><input type="text" name="manufacturer" value="${escapeHtml(s.manufacturer || '')}"></div>
</div>
<label>제안 사유</label><textarea name="substitute_reason" rows="2">${escapeHtml(s.substitute_reason || '')}</textarea>
<div style="margin-top:10px;"><button type="submit">대체품 수정 저장</button></div>
</form>
</details>` : ''}
</div>`).join('');

return `
<div class="card">
<h3 style="margin-top:0;">${escapeHtml(it.item_name)} <span class="hint">(${escapeHtml(it.spec || '')} · 요청수량 ${it.qty}${escapeHtml(it.unit || '')})</span></h3>
${canSubmit ? `
<form method="POST" action="/vendor/quote-requests/${qr.id}/submissions">
<input type="hidden" name="quote_item_id" value="${it.id}">
<input type="hidden" name="type" value="requested">
${req0 ? `<input type="hidden" name="submission_id" value="${req0.id}">` : ''}
<div class="form-row">
<div><label>제안 품목명</label><input type="text" name="product_name" value="${escapeHtml(req0 ? req0.product_name : it.item_name)}" required></div>
<div><label>규격</label><input type="text" name="spec" value="${escapeHtml(req0 ? (req0.spec || '') : (it.spec || ''))}"></div>
<div><label>수량</label><input type="number" name="qty" value="${req0 ? req0.qty : it.qty}" min="1" required></div>
<div><label>단위</label><input type="text" name="unit" value="${escapeHtml(req0 ? (req0.unit || '') : (it.unit || ''))}"></div>
</div>
<div class="form-row">
<div><label>단가(원)</label><input type="number" name="unit_price" min="0" required value="${req0 ? req0.unit_price : ''}"></div>
<div><label>납기일자</label><input type="date" name="delivery_date" value="${escapeHtml(req0 ? (req0.delivery_date || '') : '')}"></div>
<div><label>제조사</label><input type="text" name="manufacturer" value="${escapeHtml(req0 ? (req0.manufacturer || '') : '')}"></div>
</div>
<label>비고</label><textarea name="note" rows="2">${escapeHtml(req0 ? (req0.note || '') : '')}</textarea>
<div style="margin-top:10px;"><button type="submit">${req0 ? '요청품 견적 수정' : '요청품 견적 제출'}</button></div>
</form>` : (req0 ? `<p class="hint">제출한 요청품 견적: ${escapeHtml(req0.product_name)} / ${money(req0.unit_price)} / 납기 ${escapeHtml(req0.delivery_date || '-')}</p>` : '<p class="hint">열람 권한만 있어 견적을 제출할 수 없습니다.</p>')}
${subsMine.length > 0 ? `
<h4 style="margin-bottom:4px;">제출한 대체품</h4>
${subBlocks}
` : ''}
${canSubmit ? `
<details style="margin-top:12px;">
<summary style="cursor:pointer;color:#2563eb;">+ 대체품 제안 추가</summary>
<form method="POST" action="/vendor/quote-requests/${qr.id}/submissions" style="margin-top:10px;">
<input type="hidden" name="quote_item_id" value="${it.id}">
<input type="hidden" name="type" value="substitute">
<div class="form-row">
<div><label>대체품명</label><input type="text" name="product_name" required></div>
<div><label>규격</label><input type="text" name="spec"></div>
<div><label>수량</label><input type="number" name="qty" value="${it.qty}" min="1" required></div>
<div><label>단위</label><input type="text" name="unit"></div>
</div>
<div class="form-row">
<div><label>단가(원)</label><input type="number" name="unit_price" min="0" required></div>
<div><label>납기일자</label><input type="date" name="delivery_date"></div>
<div><label>제조사</label><input type="text" name="manufacturer"></div>
</div>
<label>제안 사유</label><textarea name="substitute_reason" rows="2" placeholder="예) 납기가 빠름, 성능 우수, 비용 효율 등"></textarea>
<div style="margin-top:10px;"><button type="submit">대체품 견적 제출</button></div>
</form>
</details>` : ''}
</div>`;
}).join('');

const body = `
<h1>${escapeHtml(qr.title)}</h1>
<div class="card qr-meta">
제출 마감: ${escapeHtml(qr.submission_deadline || '-')} · 요청 납기일자: ${escapeHtml(qr.requested_delivery_date || '-')}<br>
권한: ${canSubmit ? '견적입력' : '열람 전용'}
</div>
${canSubmit ? `
<div class="card">
<h3 style="margin-top:0;">엑셀로 견적 일괄 제출</h3>
<p class="hint"><a href="/vendor/quote-requests/${qr.id}/submissions-template">↓ 이 견적요청의 제출 양식 다운로드(.xlsx)</a> — 요청 품목명이 미리 채워져 있습니다. 단가 등만 입력해서 올려주세요.</p>
<form method="POST" action="/vendor/quote-requests/${qr.id}/submissions/import" enctype="multipart/form-data">
<label>견적 엑셀(.xlsx)</label>
<input type="file" name="submissions_excel" accept=".xlsx" required>
<p class="hint">1행은 머릿글로 건너뜁니다.<br><strong>대체품을 제안하려면</strong>: 새 행을 추가해 <b>품목명</b>은 원래 요청 품목명과 똑같이 두고, <b>구분</b> 칸에 "대체품"이라고 적은 뒤 <b>제안품목명</b>에 실제로 제안할 제품명을 입력하세요. 양식 맨 아래에 예시 행이 들어있습니다.</p>
<button type="submit" class="btn secondary">일괄 제출</button>
</form>
</div>` : ''}
${itemBlocks}
`;
return layout({ title: qr.title, body, user, flash });
}
function accountPage({ user, flash }) {
const body = `
<h1>계정설정</h1>
<div class="card">
<p class="hint">로그인 아이디: ${escapeHtml(user.loginId || '')}</p>
<form method="POST" action="${user.role === 'admin' ? '/admin/account' : '/vendor/account'}">
<label>표시 이름</label>
<input type="text" name="display_name" value="${escapeHtml(user.displayName)}">
<label>새 비밀번호 (변경할 때만 입력)</label>
<input type="password" name="new_password" autocomplete="new-password">
<label>새 비밀번호 확인</label>
<input type="password" name="new_password_confirm" autocomplete="new-password">
<div style="margin-top:16px;"><button type="submit">저장</button></div>
</form>
</div>
`;
return layout({ title: '계정설정', body, user, flash });
}

const views = { loginPage, adminDashboard, adminVendorsPage, adminCategoriesPage, adminSitesPage, quoteRequestNewPage, quoteRequestEditPage, quoteRequestDetailPage, vendorDashboard, vendorQuoteRequestPage, accountPage };

// ===== server.js =====
const PO_TEMPLATE_PATH = path.join(__dirname, 'po_template.xlsx');
let PO_TEMPLATE = null;
try {
PO_TEMPLATE = fs.readFileSync(PO_TEMPLATE_PATH);
} catch (e) {
console.warn('[경고] 발주서 템플릿(assets/po_template.xlsx)을 찾을 수 없습니다. 발주서 생성 기능이 동작하지 않습니다.');
}

const PORT = process.env.PORT || 5007;
const router = new Router();

// ---------- 정적 파일 ----------
router.get('/static/style.css', (req, res) => {
res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
res.end(STYLE_CSS);
});

// ---------- 공통 헬퍼 ----------
function redirect(res, location) {
res.writeHead(302, { Location: location });
res.end();
}

function currentUser(req) {
const s = auth.getCurrentSession(req);
if (!s) return null;
return s;
}

function requireLogin(role) {
return (req, res) => {
const u = currentUser(req);
if (!u || u.role !== role) {
redirect(res, '/login?role=' + role);
return null;
}
return u;
};
}

function isHttps(req) {
return req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted === true;
}

function clientIp(req) {
const fwd = req.headers['x-forwarded-for'];
if (fwd) return fwd.split(',')[0].trim();
return req.socket.remoteAddress || 'unknown';
}

function sanitizeFilename(name) {
return String(name).replace(/[^a-zA-Z0-9._\-가-힣]/g, '_').slice(-80);
}

function saveUploadedFile(fileObj, prefix) {
if (!fileObj || !fileObj.filename) return null;
const stored = `${prefix}_${Date.now()}_${sanitizeFilename(fileObj.filename)}`;
fs.writeFileSync(path.join(UPLOAD_DIR, stored), fileObj.data);
return stored;
}

const CONTENT_TYPES = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

// ---------- 로그인 / 로그아웃 ----------
router.get('/', (req, res) => {
const u = currentUser(req);
if (u && u.role === 'admin') return redirect(res, '/admin');
if (u && u.role === 'vendor') return redirect(res, '/vendor');
redirect(res, '/login');
});

router.get('/login', (req, res) => {
const role = req.query.role === 'vendor' ? 'vendor' : 'admin';
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.loginPage({ role }));
});

router.post('/login', async (req, res) => {
const body = await parseBody(req);
const role = body.role === 'vendor' ? 'vendor' : 'admin';
const loginId = (body.login_id || '').trim();
const password = body.password || '';
const ip = clientIp(req);

if (auth.isLoginLocked(ip, role, loginId)) {
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
return res.end(views.loginPage({ role, error: '로그인 시도가 너무 많습니다. 5분 후 다시 시도해주세요.' }));
}

let ok = false, userData = null;
if (role === 'admin') {
const admin = await db.prepare('SELECT * FROM admins WHERE login_id = ?').get(loginId);
if (admin && auth.verifyPassword(password, admin.password_hash)) {
ok = true;
userData = { role: 'admin', userId: admin.id, displayName: admin.display_name };
}
} else {
const vendor = await db.prepare('SELECT * FROM vendors WHERE login_id = ?').get(loginId);
if (vendor && vendor.active && auth.verifyPassword(password, vendor.password_hash)) {
ok = true;
userData = { role: 'vendor', userId: vendor.id, displayName: vendor.display_name || vendor.name };
}
}

if (!ok) {
auth.recordLoginFailure(ip, role, loginId);
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
return res.end(views.loginPage({ role, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }));
}

auth.clearLoginFailures(ip, role, loginId);
const sid = auth.createSession(userData);
auth.setSessionCookie(res, sid, isHttps(req));
redirect(res, role === 'admin' ? '/admin' : '/vendor');
});

router.get('/logout', (req, res) => {
const s = auth.getCurrentSession(req);
if (s) auth.destroySession(s.sid);
auth.clearSessionCookie(res, isHttps(req));
redirect(res, '/login');
});

// ---------- 계정설정 (관리자/업체 공용 - 표시이름/비밀번호 변경) ----------
router.get('/admin/account', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').get(u.userId);
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.accountPage({ user: { ...u, loginId: admin ? admin.login_id : '' } }));
});

router.post('/admin/account', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const displayName = (body.display_name || '').trim();
const newPassword = body.new_password || '';
const confirm = body.new_password_confirm || '';
const admin = await db.prepare('SELECT * FROM admins WHERE id = ?').get(u.userId);
if (!admin) return redirect(res, '/admin/account');
if (newPassword && newPassword !== confirm) {
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
return res.end(views.accountPage({ user: { ...u, loginId: admin.login_id, displayName: displayName || u.displayName }, flash: { type: 'error', message: '새 비밀번호가 일치하지 않습니다.' } }));
}
const passwordHash = newPassword ? auth.hashPassword(newPassword) : admin.password_hash;
const finalDisplayName = displayName || admin.display_name;
await db.prepare('UPDATE admins SET display_name = ?, password_hash = ? WHERE id = ?').run(finalDisplayName, passwordHash, admin.id);
u.displayName = finalDisplayName; // 현재 세션에도 즉시 반영
redirect(res, '/admin/account');
});

router.get('/vendor/account', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const vendor = await db.prepare('SELECT * FROM vendors WHERE id = ?').get(u.userId);
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.accountPage({ user: { ...u, loginId: vendor ? vendor.login_id : '' } }));
});

router.post('/vendor/account', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const body = await parseBody(req);
const displayName = (body.display_name || '').trim();
const newPassword = body.new_password || '';
const confirm = body.new_password_confirm || '';
const vendor = await db.prepare('SELECT * FROM vendors WHERE id = ?').get(u.userId);
if (!vendor) return redirect(res, '/vendor/account');
if (newPassword && newPassword !== confirm) {
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
return res.end(views.accountPage({ user: { ...u, loginId: vendor.login_id, displayName: displayName || u.displayName }, flash: { type: 'error', message: '새 비밀번호가 일치하지 않습니다.' } }));
}
const passwordHash = newPassword ? auth.hashPassword(newPassword) : vendor.password_hash;
const finalDisplayName = displayName || vendor.display_name;
await db.prepare('UPDATE vendors SET display_name = ?, password_hash = ? WHERE id = ?').run(finalDisplayName, passwordHash, vendor.id);
u.displayName = finalDisplayName; // 현재 세션에도 즉시 반영
redirect(res, '/vendor/account');
});

// ---------- 관리자: 대시보드 ----------
async function computeSelectionForItem(itemId) {
const submissions = await db.prepare(`
SELECT s.*, v.name AS vendor_name FROM submissions s
JOIN vendors v ON v.id = s.vendor_id
WHERE s.quote_item_id = ?
`).all(itemId);
let minPrice = null;
if (submissions.length > 0) minPrice = Math.min(...submissions.map((s) => s.unit_price));
const candidates = submissions.filter((s) => s.unit_price === minPrice);
const selectedRow = await db.prepare('SELECT * FROM final_selections WHERE quote_item_id = ?').get(itemId);
let selected = null;
if (selectedRow) {
const found = submissions.find((s) => s.id === selectedRow.submission_id);
if (found) {
selected = {
...found,
selectionReason: selectedRow.reason || '',
isLowestPick: found.unit_price === minPrice,
receivedDate: selectedRow.received_date || '',
paymentDate: selectedRow.payment_date || '',
paymentRecipient: selectedRow.payment_recipient || '',
};
}
}
return { submissions, minPrice, candidates, selected };
}

// ---- 전체 견적요청의 선정 결과(품목·업체·단가 등)를 한 엑셀로 통합 다운로드 ----
router.get('/admin/quote-requests/export-results', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
// 기간 필터 기준: 발주일(현재는 최종선정일시 fs.selected_at을 발주일 대용으로 씀).
// 필요하면 나중에 실제 발주일 필드가 생기는 시점에 이 기준 컬럼만 바꾸면 된다.
const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '';
const toDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : '';
const dateConditions = [];
const dateArgs = [];
if (fromDate) { dateConditions.push("date(fs.selected_at) >= date(?)"); dateArgs.push(fromDate); }
if (toDate) { dateConditions.push("date(fs.selected_at) <= date(?)"); dateArgs.push(toDate); }
const whereClause = dateConditions.length ? `WHERE ${dateConditions.join(' AND ')}` : '';
const rows = await db.prepare(`
SELECT
qr.title AS request_title,
qr.draft_no AS draft_no,
qr.draft_title AS draft_title,
st.name AS site_name,
qr.submission_deadline AS submission_deadline,
qr.requested_delivery_date AS requested_delivery_date,
qi.item_name AS req_item_name,
qi.spec AS req_spec,
qi.qty AS req_qty,
qi.unit AS req_unit,
qi.category1 AS category1,
qi.category2 AS category2,
qi.category3 AS category3,
v.name AS vendor_name,
sub.product_name AS product_name,
sub.spec AS sub_spec,
sub.qty AS sub_qty,
sub.unit AS sub_unit,
sub.unit_price AS unit_price,
(sub.unit_price * sub.qty) AS total_price,
sub.manufacturer AS manufacturer,
sub.delivery_date AS delivery_date,
sub.type AS sub_type,
sub.substitute_reason AS substitute_reason,
fs.reason AS selection_reason,
fs.selected_at AS selected_at,
fs.received_date AS received_date,
fs.payment_date AS payment_date,
fs.payment_recipient AS payment_recipient
FROM final_selections fs
JOIN submissions sub ON sub.id = fs.submission_id
JOIN vendors v ON v.id = sub.vendor_id
JOIN quote_items qi ON qi.id = fs.quote_item_id
JOIN quote_requests qr ON qr.id = qi.quote_request_id
LEFT JOIN sites st ON st.id = qr.site_id
${whereClause}
ORDER BY qr.id DESC, qi.id
`).all(...dateArgs);
// 구매 실적 보고서 스킬(hillmaru-purchase-performance-report)이 읽는 원본 구매데이터 양식과
// 최대한 동일하게 맞춘 24개 컬럼. 헤더는 3행(header=2)에 오도록 1~2행은 비워둔다.
// 품의번호/제목은 견적요청 완료 처리 화면에서 입력한 기안번호/기안제목을 사용한다(없으면 제목은 견적요청 제목으로 대체).
// 입고일은 완료 처리에서 입력한 실제 입고일자를 우선 사용하고, 아직 완료 처리 전이면 업체가 제출한 납기일자로 대체한다.
// 대금지급일/지급처도 완료 처리에서 입력한 값을 사용한다. 완료 처리 전이면 계속 빈 칸일 수 있다.
// 견적 시스템에 아직 없는 항목(담당자/요청부서/대금지급)은 빈 칸으로 둔다.
const PURCHASE_DATA_COLS = ['담당자', '연도', '사업장', '요청부서', '과목1', '과목2', '과목3', '품의번호', '제목', '업체명', '발주일', '입고일', '제품구분', '제품명', '규격', '발주수량', '단가', '공급가', '입고수량', '포장단위', '대금지급일', '대금지급', '지급처', '비고'];
const dataRows = rows.map((r) => {
const orderDate = (r.selected_at || '').slice(0, 10);
const year = (r.selected_at || '').slice(0, 4);
const siteBare = (r.site_name || '').replace(/^힐마루\s*/, '');
return [
'', year, siteBare, '', r.category1 || '', r.category2 || '', r.category3 || '', r.draft_no || '', r.draft_title || r.request_title, r.vendor_name,
orderDate, r.received_date || r.delivery_date || '', r.sub_type === 'substitute' ? '대체품' : '요청품',
r.product_name, r.sub_spec || '', r.sub_qty, r.unit_price, r.total_price, r.sub_qty, r.sub_unit || '',
r.payment_date || '', '', r.payment_recipient || '', r.selection_reason || r.substitute_reason || '',
];
});
const rangeLabel = (fromDate || toDate) ? `${fromDate || '처음'}~${toDate || '오늘'}` : `전체_${new Date().toISOString().slice(0, 10)}`;
sendXlsxTemplate(res, `구매Data_${rangeLabel}.xlsx`, ['구매Data'], [[], PURCHASE_DATA_COLS, ...dataRows]);
});

router.get('/admin', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const qrs = await db.prepare('SELECT * FROM quote_requests ORDER BY id DESC').all();
const requests = [];
for (const qr of qrs) {
const items = await db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(qr.id);
let selectedCount = 0, selectedAmount = 0;
for (const it of items) {
const { selected } = await computeSelectionForItem(it.id);
if (selected) { selectedCount += 1; selectedAmount += selected.unit_price * selected.qty; }
}
const assignments = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ?').all(qr.id);
const vendorCount = assignments.length;
const submittedVendorRows = await db.prepare(`
SELECT DISTINCT s.vendor_id FROM submissions s
JOIN quote_items qi ON qi.id = s.quote_item_id
WHERE qi.quote_request_id = ?
`).all(qr.id);
const submittedVendorIds = new Set(submittedVendorRows.map((r) => r.vendor_id));
requests.push({
...qr,
totalItems: items.length,
selectedCount,
selectedAmount,
vendorCount,
submittedVendorCount: submittedVendorIds.size,
});
}
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.adminDashboard({ user: u, requests }));
});

// ---------- 관리자: 카테고리 관리 ----------
router.get('/admin/categories', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const groups = {
cat1: await getCategoryOptions('cat1'),
cat2: await getCategoryOptions('cat2'),
cat3: await getCategoryOptions('cat3'),
};
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.adminCategoriesPage({ user: u, groups }));
});

router.post('/admin/categories', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const groupKey = ['cat1', 'cat2', 'cat3'].includes(body.group_key) ? body.group_key : null;
const label = (body.label || '').trim();
if (groupKey && label) {
const maxOrder = (await db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM category_options WHERE group_key = ?').get(groupKey)).m;
try {
await db.prepare('INSERT INTO category_options (group_key, label, sort_order) VALUES (?, ?, ?)').run(groupKey, label, maxOrder + 1);
} catch (e) { /* 중복이면 무시 */ }
}
redirect(res, '/admin/categories');
});

function normalizeCategoryGroupKey(raw) {
const v = String(raw || '').trim().toLowerCase();
if (v === 'cat1' || v.includes('1')) return 'cat1';
if (v === 'cat2' || v.includes('2')) return 'cat2';
if (v === 'cat3' || v.includes('3')) return 'cat3';
return null;
}

router.get('/admin/categories/template', (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
sendXlsxTemplate(res, '카테고리_일괄추가_양식.xlsx',
['구분', '값'],
[['카테고리1', '예시카테고리']]
);
});

router.post('/admin/categories/import', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
await parseBody(req);
const files = req.files || {};
if (!files.categories_excel || !files.categories_excel.data) return redirect(res, '/admin/categories');
let rows;
try {
rows = readXlsxFirstSheet(files.categories_excel.data);
} catch (e) {
console.error('[엑셀] 카테고리 일괄 추가 파싱 실패:', e.message);
return redirect(res, '/admin/categories');
}
const insert = db.prepare('INSERT INTO category_options (group_key, label, sort_order) VALUES (?, ?, ?)');
let created = 0;
for (let i = 1; i < rows.length; i++) {
const r = rows[i];
if (xlsxRowIsEmpty(r)) continue;
const groupKey = normalizeCategoryGroupKey(r[0]);
const label = (r[1] || '').trim();
if (!groupKey || !label) continue;
const maxOrder = (await db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM category_options WHERE group_key = ?').get(groupKey)).m;
try {
await insert.run(groupKey, label, maxOrder + 1);
created++;
} catch (e) { /* 중복이면 무시 */ }
}
console.log(`[엑셀] 카테고리 일괄 추가: 생성 ${created}건`);
redirect(res, '/admin/categories');
});

router.post('/admin/categories/:id', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const body = await parseBody(req);
const label = (body.label || '').trim();
if (label) {
try {
await db.prepare('UPDATE category_options SET label = ? WHERE id = ?').run(label, id);
} catch (e) { /* 중복 라벨이면 무시 */ }
}
redirect(res, '/admin/categories');
});

router.post('/admin/categories/:id/delete', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
await db.prepare('DELETE FROM category_options WHERE id = ?').run(id);
redirect(res, '/admin/categories');
});

// ---------- 관리자: 업체 관리 ----------

// ---------- 관리자: 사업장 관리 ----------
router.get('/admin/sites', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const sites = await getSites();
let editSite = null;
let onsiteContacts = [];
if (req.query.edit) {
editSite = await db.prepare('SELECT * FROM sites WHERE id = ?').get(Number(req.query.edit));
if (editSite) onsiteContacts = await getOnsiteContacts(editSite.id);
}
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.adminSitesPage({ user: u, sites, editSite, onsiteContacts }));
});

router.post('/admin/sites/:id/contacts', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const siteId = Number(req.params.id);
const body = await parseBody(req);
const name = (body.name || '').trim();
if (name) {
const maxOrder = (await db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM onsite_contacts WHERE site_id = ?').get(siteId)).m;
await db.prepare('INSERT INTO onsite_contacts (site_id, name, phone, sort_order) VALUES (?, ?, ?, ?)').run(siteId, name, body.phone || '', maxOrder + 1);
}
redirect(res, `/admin/sites?edit=${siteId}`);
});

router.post('/admin/sites/contacts/:contactId', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const contactId = Number(req.params.contactId);
const body = await parseBody(req);
const contact = await db.prepare('SELECT * FROM onsite_contacts WHERE id = ?').get(contactId);
if (!contact) { res.writeHead(404); return res.end('담당자를 찾을 수 없습니다.'); }
await db.prepare('UPDATE onsite_contacts SET name = ?, phone = ? WHERE id = ?').run(body.name || contact.name, body.phone || '', contactId);
redirect(res, `/admin/sites?edit=${contact.site_id}`);
});

router.post('/admin/sites/contacts/:contactId/delete', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const contactId = Number(req.params.contactId);
const contact = await db.prepare('SELECT * FROM onsite_contacts WHERE id = ?').get(contactId);
if (!contact) { res.writeHead(404); return res.end('담당자를 찾을 수 없습니다.'); }
await db.prepare('DELETE FROM onsite_contacts WHERE id = ?').run(contactId);
redirect(res, `/admin/sites?edit=${contact.site_id}`);
});

router.get('/admin/sites/template', (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
sendXlsxTemplate(res, '사업장_일괄등록_양식.xlsx',
['사업장명', '발주서표기', '발주자회사명', '주소', '대표자', '연락처', '사업자번호', '종목', '업태', '전자세금계산서이메일', '현장입고담당자표시', '발주서하단표기'],
[['힐마루 예시', '예시', '(주)동훈', '경기 ○○시', '홍길동', '1899-0000', '000-00-00000', '골프장', '서비스업', 'bill@donghoon.com', '홍길동 010-0000-0000', '주식회사동훈힐마루예시']]
);
});

router.post('/admin/sites/import', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
await parseBody(req);
const files = req.files || {};
if (!files.sites_excel || !files.sites_excel.data) return redirect(res, '/admin/sites');
let rows;
try {
rows = readXlsxFirstSheet(files.sites_excel.data);
} catch (e) {
console.error('[엑셀] 사업장 일괄 등록 파싱 실패:', e.message);
return redirect(res, '/admin/sites');
}
const insertSite = db.prepare(`
INSERT INTO sites (name, title_label, company_name, address, ceo_name, phone, biz_reg_no, item_type, biz_type, tax_email, onsite_contact, footer_label, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
let created = 0;
for (let i = 1; i < rows.length; i++) {
const r = rows[i];
if (xlsxRowIsEmpty(r)) continue;
const [name, titleLabel, companyName, address, ceoName, phone, bizRegNo, itemType, bizType, taxEmail, onsiteContact, footerLabel] = r;
if (!name || !titleLabel) continue;
const maxOrder = (await db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM sites').get()).m;
await insertSite.run(name, titleLabel, companyName || '(주)동훈', address || '', ceoName || '', phone || '', bizRegNo || '', itemType || '', bizType || '', taxEmail || '', onsiteContact || '', footerLabel || '', maxOrder + 1);
created++;
}
console.log(`[엑셀] 사업장 일괄 등록: 생성 ${created}건`);
redirect(res, '/admin/sites');
});

router.post('/admin/sites', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const { name, title_label, company_name, address, ceo_name, phone, biz_reg_no, item_type, biz_type, tax_email, onsite_contact, footer_label } = body;
if (!name || !title_label) return redirect(res, '/admin/sites');
const maxOrder = (await db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM sites').get()).m;
await db.prepare(`
INSERT INTO sites (name, title_label, company_name, address, ceo_name, phone, biz_reg_no, item_type, biz_type, tax_email, onsite_contact, footer_label, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(name, title_label, company_name || '(주)동훈', address || '', ceo_name || '', phone || '', biz_reg_no || '', item_type || '', biz_type || '', tax_email || '', onsite_contact || '', footer_label || '', maxOrder + 1);
redirect(res, '/admin/sites');
});

router.post('/admin/sites/:id', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const body = await parseBody(req);
const { name, title_label, company_name, address, ceo_name, phone, biz_reg_no, item_type, biz_type, tax_email, onsite_contact, footer_label } = body;
await db.prepare(`
UPDATE sites SET name=?, title_label=?, company_name=?, address=?, ceo_name=?, phone=?, biz_reg_no=?, item_type=?, biz_type=?, tax_email=?, onsite_contact=?, footer_label=?
WHERE id=?
`).run(name, title_label, company_name || '(주)동훈', address || '', ceo_name || '', phone || '', biz_reg_no || '', item_type || '', biz_type || '', tax_email || '', onsite_contact || '', footer_label || '', id);
redirect(res, '/admin/sites');
});

// ---------- 관리자: 업체 관리 ----------
router.get('/admin/vendors', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const vendors = await db.prepare('SELECT * FROM vendors ORDER BY category1, name').all();
let editVendor = null;
if (req.query.edit) {
editVendor = await db.prepare('SELECT * FROM vendors WHERE id = ?').get(Number(req.query.edit));
}
const cat1Options = (await getCategoryOptions('cat1')).map((o) => o.label);
const cat2Options = (await getCategoryOptions('cat2')).map((o) => o.label);
const cat3Options = (await getCategoryOptions('cat3')).map((o) => o.label);
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.adminVendorsPage({ user: u, vendors, editVendor, cat1Options, cat2Options, cat3Options }));
});

router.get('/admin/vendors/template', (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
sendXlsxTemplate(res, '업체_일괄등록_양식.xlsx',
['업체명', '사업자번호', '담당자명', '담당자이메일', '로그인아이디', '비밀번호', '카테고리1', '카테고리2', '카테고리3', '주소', '대표자', '연락처', '종목', '업태', '은행명', '계좌번호', '예금주'],
[['예시상사', '123-45-67890', '김담당', 'vendor@example.com', 'vendor01', 'pass1234', '코스', '', '', '서울시 ○○구', '홍길동', '010-0000-0000', '도매', '서비스업', '국민은행', '123456-78-901234', '예시상사']]
);
});

// ---- 등록된 업체 전체를 엑셀로 다운로드 (업로드 양식과 반대 방향) ----
router.get('/admin/vendors/export', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const vendors = await db.prepare('SELECT * FROM vendors ORDER BY category1, name').all();
const headers = ['업체명', '사업자번호', '담당자명', '담당자이메일', '로그인아이디', '카테고리1', '카테고리2', '카테고리3', '주소', '대표자', '연락처', '종목', '업태', '은행명', '계좌번호', '예금주', '사용여부', '등록일'];
const dataRows = vendors.map((v) => [
v.name, v.biz_reg_no, v.contact_name, v.contact_email, v.login_id,
v.category1, v.category2, v.category3, v.address, v.ceo_name, v.phone, v.item_type, v.biz_type,
v.bank_name, v.account_number, v.account_holder, v.active ? '사용' : '비활성', v.created_at,
]);
sendXlsxTemplate(res, `업체목록_${new Date().toISOString().slice(0, 10)}.xlsx`, headers, dataRows);
});

router.post('/admin/vendors/import', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const files = req.files || {};
if (!files.vendors_excel || !files.vendors_excel.data) return redirect(res, '/admin/vendors');
let rows;
try {
rows = readXlsxFirstSheet(files.vendors_excel.data);
} catch (e) {
console.error('[엑셀] 업체 일괄 등록 파싱 실패:', e.message);
return redirect(res, '/admin/vendors');
}
const insertVendor = db.prepare(`
INSERT INTO vendors (
name, category1, category2, category3, biz_reg_no, contact_name, contact_email,
login_id, password_hash, display_name, bank_name, account_number, account_holder,
biz_reg_file, bankbook_file, active, created_at, address, ceo_name, phone, item_type, biz_type
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', 1, ?, ?, ?, ?, ?, ?)
`);
let created = 0, skipped = 0;
for (let i = 1; i < rows.length; i++) {
const r = rows[i];
if (xlsxRowIsEmpty(r)) continue;
const [name, bizRegNo, contactName, contactEmail, loginId, password, cat1, cat2, cat3, address, ceoName, phone, itemType, bizType, bankName, accountNumber, accountHolder] = r;
if (!name || !loginId || !password) { skipped++; continue; }
const exists = await db.prepare('SELECT id FROM vendors WHERE login_id = ?').get(loginId);
if (exists) { skipped++; continue; }
await insertVendor.run(
name, cat1 || '', cat2 || '', cat3 || '', bizRegNo || '',
contactName || '', contactEmail || '', loginId, auth.hashPassword(password),
contactName || '', bankName || '', accountNumber || '', accountHolder || '',
new Date().toISOString(), address || '', ceoName || '', phone || '', itemType || '', bizType || ''
);
created++;
}
console.log(`[엑셀] 업체 일괄 등록: 생성 ${created}건, 스킵 ${skipped}건`);
redirect(res, '/admin/vendors');
});

router.post('/admin/vendors', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const files = req.files || {};
const {
name, category1, category2, category3, biz_reg_no,
contact_name, contact_email, display_name, login_id, password, active,
bank_name, account_number, account_holder,
address, ceo_name, phone, item_type, biz_type,
} = body;
if (!name || !login_id || !password) return redirect(res, '/admin/vendors');
const exists = await db.prepare('SELECT id FROM vendors WHERE login_id = ?').get(login_id);
if (exists) return redirect(res, '/admin/vendors');

const bizRegFile = saveUploadedFile(files.biz_reg_file, 'biz');
const bankbookFile = saveUploadedFile(files.bankbook_file, 'bankbook');

await db.prepare(`
INSERT INTO vendors (
name, category1, category2, category3, biz_reg_no, contact_name, contact_email,
login_id, password_hash, display_name, bank_name, account_number, account_holder,
biz_reg_file, bankbook_file, active, created_at, address, ceo_name, phone, item_type, biz_type
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
name, category1 || '', category2 || '', category3 || '', biz_reg_no || '',
contact_name || '', contact_email || '', login_id, auth.hashPassword(password),
display_name || contact_name || '', bank_name || '', account_number || '', account_holder || '',
bizRegFile || '', bankbookFile || '', active === '0' ? 0 : 1, new Date().toISOString(),
address || '', ceo_name || '', phone || '', item_type || '', biz_type || ''
);
redirect(res, '/admin/vendors');
});

router.post('/admin/vendors/:id', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const body = await parseBody(req);
const files = req.files || {};
const {
name, category1, category2, category3, biz_reg_no,
contact_name, contact_email, display_name, login_id, password, active,
bank_name, account_number, account_holder,
address, ceo_name, phone, item_type, biz_type,
} = body;
const current = await db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
if (!current) return redirect(res, '/admin/vendors');
const passwordHash = password && password.trim() ? auth.hashPassword(password) : current.password_hash;

const bizRegFile = saveUploadedFile(files.biz_reg_file, `biz_${id}`) || current.biz_reg_file;
const bankbookFile = saveUploadedFile(files.bankbook_file, `bankbook_${id}`) || current.bankbook_file;

await db.prepare(`
UPDATE vendors SET
name=?, category1=?, category2=?, category3=?, biz_reg_no=?, contact_name=?, contact_email=?,
login_id=?, password_hash=?, display_name=?, bank_name=?, account_number=?, account_holder=?,
biz_reg_file=?, bankbook_file=?, active=?, address=?, ceo_name=?, phone=?, item_type=?, biz_type=?
WHERE id=?
`).run(
name, category1 || '', category2 || '', category3 || '', biz_reg_no || '',
contact_name || '', contact_email || '', login_id, passwordHash,
display_name || contact_name || '', bank_name || '', account_number || '', account_holder || '',
bizRegFile || '', bankbookFile || '', active === '0' ? 0 : 1,
address || '', ceo_name || '', phone || '', item_type || '', biz_type || '', id
);
redirect(res, '/admin/vendors');
});

// 사업자등록증 / 통장사본 다운로드 (관리자 전용)
router.get('/admin/vendors/file/:id/:type', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const type = req.params.type;
const vendor = await db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
if (!vendor) { res.writeHead(404); return res.end('업체를 찾을 수 없습니다.'); }
const filename = type === 'biz' ? vendor.biz_reg_file : (type === 'bankbook' ? vendor.bankbook_file : null);
if (!filename) { res.writeHead(404); return res.end('첨부된 파일이 없습니다.'); }
const filePath = path.join(UPLOAD_DIR, filename);
if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) { res.writeHead(404); return res.end('파일을 찾을 수 없습니다.'); }
const ext = path.extname(filename).toLowerCase();
const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
res.writeHead(200, { 'Content-Type': contentType, 'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"` });
fs.createReadStream(filePath).pipe(res);
});

// ---------- 관리자: 견적요청 생성 ----------
router.get('/admin/quote-requests/new', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const vendors = await db.prepare('SELECT * FROM vendors WHERE active = 1 ORDER BY category1, name').all();
const vendorsByCategory = {};
for (const v of vendors) {
const key = v.category1 || '미분류';
if (!vendorsByCategory[key]) vendorsByCategory[key] = [];
vendorsByCategory[key].push(v);
}
const cat1Options = (await getCategoryOptions('cat1')).map((o) => o.label);
const cat2Options = (await getCategoryOptions('cat2')).map((o) => o.label);
const cat3Options = (await getCategoryOptions('cat3')).map((o) => o.label);
const sites = await getSites();
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.quoteRequestNewPage({ user: u, vendorsByCategory, cat1Options, cat2Options, cat3Options, sites }));
});

router.get('/admin/quote-requests/items-template', (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
sendXlsxTemplate(res, '견적요청_품목_일괄등록_양식.xlsx',
['품목명', '규격', '수량', '단위', '과목1', '과목2', '과목3'],
[['예) 비료', '20kg', '10', '포', '코스', '저장품', '']]
);
});

function toArray(v) {
if (v === undefined || v === null) return [];
return Array.isArray(v) ? v : [v];
}

// 업로드된 xlsx에서 품목 목록(품목명/규격/수량/단위)을 뽑아온다. 1행은 머릿글로 간주하고 건너뜀.
function parseItemsExcel(fileObj) {
if (!fileObj || !fileObj.data || !fileObj.data.length) return [];
let rows;
try {
rows = readXlsxFirstSheet(fileObj.data);
} catch (e) {
console.error('[엑셀] 품목 업로드 파싱 실패:', e.message);
return [];
}
const out = [];
for (let i = 1; i < rows.length; i++) { // 0행(머릿글) 스킵
const r = rows[i];
if (xlsxRowIsEmpty(r)) continue;
const name = (r[0] || '').trim();
if (!name) continue;
out.push({
name, spec: (r[1] || '').trim(), qty: Number(r[2]) || 1, unit: (r[3] || '').trim(),
category1: (r[4] || '').trim(), category2: (r[5] || '').trim(), category3: (r[6] || '').trim(),
});
}
return out;
}

router.post('/admin/quote-requests', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const files = req.files || {};
const title = (body.title || '').trim();
if (!title) return redirect(res, '/admin/quote-requests/new');
const managerName = (body.manager_name || '').trim();
const managerEmail = (body.manager_email || '').trim();

const insertQr = db.prepare(`
INSERT INTO quote_requests (title, submission_deadline, requested_delivery_date, site_id, manager_name, manager_email, status, created_at)
VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
`);
const info = await insertQr.run(title, body.submission_deadline || null, body.requested_delivery_date || null, body.site_id ? Number(body.site_id) : null, managerName, managerEmail, new Date().toISOString());
const qrId = info.lastInsertRowid;

const names = toArray(body['item_name[]']);
const specs = toArray(body['item_spec[]']);
const qtys = toArray(body['item_qty[]']);
const units = toArray(body['item_unit[]']);
const cat1s = toArray(body['item_category1[]']);
const cat2s = toArray(body['item_category2[]']);
const cat3s = toArray(body['item_category3[]']);
const insertItem = db.prepare('INSERT INTO quote_items (quote_request_id, item_name, spec, qty, unit, category1, category2, category3) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
for (let i = 0; i < names.length; i++) {
if (!names[i] || !names[i].trim()) continue;
await insertItem.run(qrId, names[i].trim(), specs[i] || '', Number(qtys[i]) || 1, units[i] || '', cat1s[i] || '', cat2s[i] || '', cat3s[i] || '');
}
for (const it of parseItemsExcel(files.items_excel)) {
await insertItem.run(qrId, it.name, it.spec, it.qty, it.unit, it.category1 || '', it.category2 || '', it.category3 || '');
}

const viewIds = new Set(toArray(body.assign_view).map(Number));
const submitIds = new Set(toArray(body.assign_submit).map(Number));
const insertAssign = db.prepare('INSERT OR REPLACE INTO vendor_assignments (quote_request_id, vendor_id, permission) VALUES (?, ?, ?)');
const allIds = new Set([...viewIds, ...submitIds]);
for (const vid of allIds) {
const perm = submitIds.has(vid) ? 'submit' : 'view';
await insertAssign.run(qrId, vid, perm);
}

// 배정된 업체들에게 새 견적요청 안내 메일 발송 (실패해도 화면 진행에는 영향 없음)
if (allIds.size > 0) {
const baseUrl = `${isHttps(req) ? 'https' : 'http'}://${req.headers.host}`;
const vendorRows = await db.prepare(`SELECT * FROM vendors WHERE id IN (${Array.from(allIds).map(() => '?').join(',')})`).all(...Array.from(allIds));
for (const v of vendorRows) {
if (!v.contact_email) continue;
mail.sendMail({
to: v.contact_email,
subject: `[힐마루 견적관리] 새 견적요청: ${title}`,
html: `<p>${escapeHtml(v.name)} 담당자님, 새로운 견적요청이 등록되었습니다.</p>
<p><b>${escapeHtml(title)}</b></p>
<p>제출 마감: ${escapeHtml(body.submission_deadline || '-')} · 요청 납기: ${escapeHtml(body.requested_delivery_date || '-')}</p>
<p><a href="${baseUrl}/vendor/quote-requests/${qrId}">여기를 눌러 견적요청 확인하기</a></p>`,
}).catch(() => {});
}
}

redirect(res, `/admin/quote-requests/${qrId}`);
});

// ---------- 관리자: 견적요청 상세 ----------
router.get('/admin/quote-requests/:id', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const qr = await db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }
const items = await db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
const assignments = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ?').all(id);
const vendors = await db.prepare('SELECT * FROM vendors ORDER BY category1, name').all();
const vendorsByCategory = {};
for (const v of vendors) {
if (!assignments.find((a) => a.vendor_id === v.id)) continue;
const key = v.category1 || '미분류';
if (!vendorsByCategory[key]) vendorsByCategory[key] = [];
vendorsByCategory[key].push(v);
}

const submissionsByItem = {};
const selections = {};
for (const it of items) {
const { submissions, selected } = await computeSelectionForItem(it.id);
submissionsByItem[it.id] = submissions;
if (selected) selections[it.id] = selected;
}

const onsiteContacts = qr.site_id ? await getOnsiteContacts(qr.site_id) : [];
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.quoteRequestDetailPage({ user: u, qr, items, assignments, vendorsByCategory, submissionsByItem, selections, buyerLabels: Object.keys(BUYERS), hasSite: !!qr.site_id, onsiteContacts }));
});

// ---------- 관리자: 견적요청 완료 처리(기안번호/기안제목 + 품목별 입고일자/대금지급일자/지급처) ----------
router.post('/admin/quote-requests/:id/complete', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const qr = await db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }

const body = await parseBody(req);
const draftNo = (body.draft_no || '').trim();
const draftTitle = (body.draft_title || '').trim();

await db.prepare("UPDATE quote_requests SET draft_no = ?, draft_title = ?, status = 'completed' WHERE id = ?")
.run(draftNo, draftTitle, id);

const itemIds = toArray(body['fs_item_id[]']).map(Number);
const receivedDates = toArray(body['fs_received_date[]']);
const paymentDates = toArray(body['fs_payment_date[]']);
const paymentRecipients = toArray(body['fs_payment_recipient[]']);
const updateFs = db.prepare(`
UPDATE final_selections SET received_date=?, payment_date=?, payment_recipient=?
WHERE quote_item_id=? AND quote_item_id IN (SELECT id FROM quote_items WHERE quote_request_id=?)
`);
for (let i = 0; i < itemIds.length; i++) {
await updateFs.run(receivedDates[i] || '', paymentDates[i] || '', paymentRecipients[i] || '', itemIds[i], id);
}

redirect(res, `/admin/quote-requests/${id}`);
});

// ---------- 관리자: 업체별 발주서 생성 ----------
router.get('/admin/quote-requests/:id/po/:vendorId', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
if (!PO_TEMPLATE) { res.writeHead(500); return res.end('발주서 템플릿을 찾을 수 없습니다.'); }

const qrId = Number(req.params.id);
const vendorId = Number(req.params.vendorId);
const qr = await db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(qrId);
if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }
if (!qr.site_id) { res.writeHead(400); return res.end('이 견적요청에는 사업장이 지정되어 있지 않습니다. 견적요청 수정에서 사업장을 지정해주세요.'); }
const site = await db.prepare('SELECT * FROM sites WHERE id = ?').get(qr.site_id);
if (!site) { res.writeHead(404); return res.end('사업장 정보를 찾을 수 없습니다.'); }
const vendor = await db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
if (!vendor) { res.writeHead(404); return res.end('업체를 찾을 수 없습니다.'); }

const items = await db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(qrId);
const poItems = [];
for (const it of items) {
const { selected } = await computeSelectionForItem(it.id);
if (selected && selected.vendor_id === vendorId) {
poItems.push({ name: selected.product_name, spec: selected.spec, qty: selected.qty, unit: selected.unit, unitPrice: selected.unit_price });
}
}
if (poItems.length === 0) { res.writeHead(404); return res.end('이 업체로 최종 선정된 품목이 없습니다.'); }

const buyerLabel = BUYERS[req.query.buyer] ? req.query.buyer : '이관현 과장';
const orderDateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.orderDate || '') ? req.query.orderDate : new Date().toISOString().slice(0, 10);
const deliveryDateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.deliveryDate || '') ? req.query.deliveryDate : (qr.requested_delivery_date || orderDateStr);

let effectiveOnsiteContact = site.onsite_contact || '';
const manualContactName = (req.query.onsiteContactName || '').trim();
if (manualContactName) {
const manualContactPhone = (req.query.onsiteContactPhone || '').trim();
effectiveOnsiteContact = manualContactPhone ? `${manualContactName} ${manualContactPhone}` : manualContactName;
} else if (req.query.onsiteContactId) {
const contact = await db.prepare('SELECT * FROM onsite_contacts WHERE id = ? AND site_id = ?').get(Number(req.query.onsiteContactId), site.id);
if (contact) effectiveOnsiteContact = contact.phone ? `${contact.name} ${contact.phone}` : contact.name;
}

let buf;
try {
buf = buildPurchaseOrder({
templateBuffer: PO_TEMPLATE,
site: { ...site, onsite_contact: effectiveOnsiteContact, deliveryDateStr },
vendor,
buyerLabel,
items: poItems,
orderDateStr,
});
} catch (e) {
console.error(e);
res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
return res.end('발주서 생성 중 오류가 발생했습니다: ' + e.message);
}

const itemLabel = poItems.length > 1 ? `${poItems[0].name} 외 ${poItems.length - 1}건` : poItems[0].name;
const safe = (s) => String(s).replace(/[\\/:*?"<>|]/g, '_');
const filename = `발주서_${safe(site.title_label)}_${safe(itemLabel)}_${safe(vendor.name)}.xlsx`;

res.writeHead(200, {
'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
});
res.end(buf);
});

// ---------- 관리자: 견적요청 수정 ----------
router.get('/admin/quote-requests/:id/edit', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const qr = await db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }
const items = await db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
const assignments = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ?').all(id);
const vendors = await db.prepare('SELECT * FROM vendors WHERE active = 1 ORDER BY category1, name').all();
const vendorsByCategory = {};
for (const v of vendors) {
const key = v.category1 || '미분류';
if (!vendorsByCategory[key]) vendorsByCategory[key] = [];
vendorsByCategory[key].push(v);
}
const cat1Options = (await getCategoryOptions('cat1')).map((o) => o.label);
const cat2Options = (await getCategoryOptions('cat2')).map((o) => o.label);
const cat3Options = (await getCategoryOptions('cat3')).map((o) => o.label);
const sites = await getSites();
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.quoteRequestEditPage({ user: u, qr, items, vendorsByCategory, assignments, cat1Options, cat2Options, cat3Options, sites }));
});

router.post('/admin/quote-requests/:id/edit', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
const qr = await db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }

const body = await parseBody(req);
const files = req.files || {};
const title = (body.title || '').trim();
if (!title) return redirect(res, `/admin/quote-requests/${id}/edit`);

await db.prepare(`
UPDATE quote_requests SET title = ?, submission_deadline = ?, requested_delivery_date = ?, site_id = ?, manager_name = ?, manager_email = ? WHERE id = ?
`).run(title, body.submission_deadline || null, body.requested_delivery_date || null, body.site_id ? Number(body.site_id) : null, (body.manager_name || '').trim(), (body.manager_email || '').trim(), id);

// ---- 품목 동기화 ----
const itemIds = toArray(body['item_id[]']);
const names = toArray(body['item_name[]']);
const specs = toArray(body['item_spec[]']);
const qtys = toArray(body['item_qty[]']);
const units = toArray(body['item_unit[]']);
const cat1s = toArray(body['item_category1[]']);
const cat2s = toArray(body['item_category2[]']);
const cat3s = toArray(body['item_category3[]']);
const removeIds = new Set(toArray(body['item_remove[]']).map(Number));

const updateItem = db.prepare('UPDATE quote_items SET item_name=?, spec=?, qty=?, unit=?, category1=?, category2=?, category3=? WHERE id=? AND quote_request_id=?');
const insertItem = db.prepare('INSERT INTO quote_items (quote_request_id, item_name, spec, qty, unit, category1, category2, category3) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const deleteItem = db.prepare('DELETE FROM quote_items WHERE id=? AND quote_request_id=?');

for (let i = 0; i < names.length; i++) {
const itemId = itemIds[i] ? Number(itemIds[i]) : null;
if (itemId && removeIds.has(itemId)) {
await deleteItem.run(itemId, id);
continue;
}
if (!names[i] || !names[i].trim()) continue;
if (itemId) {
await updateItem.run(names[i].trim(), specs[i] || '', Number(qtys[i]) || 1, units[i] || '', cat1s[i] || '', cat2s[i] || '', cat3s[i] || '', itemId, id);
} else {
await insertItem.run(id, names[i].trim(), specs[i] || '', Number(qtys[i]) || 1, units[i] || '', cat1s[i] || '', cat2s[i] || '', cat3s[i] || '');
}
}
for (const it of parseItemsExcel(files.items_excel)) {
await insertItem.run(id, it.name, it.spec, it.qty, it.unit, it.category1 || '', it.category2 || '', it.category3 || '');
}

// ---- 업체 배정 동기화 (기존 배정을 지우고 다시 반영) ----
const viewIds = new Set(toArray(body.assign_view).map(Number));
const submitIds = new Set(toArray(body.assign_submit).map(Number));
const allIds = new Set([...viewIds, ...submitIds]);
await db.prepare('DELETE FROM vendor_assignments WHERE quote_request_id = ?').run(id);
const insertAssign = db.prepare('INSERT OR REPLACE INTO vendor_assignments (quote_request_id, vendor_id, permission) VALUES (?, ?, ?)');
for (const vid of allIds) {
const perm = submitIds.has(vid) ? 'submit' : 'view';
await insertAssign.run(id, vid, perm);
}

redirect(res, `/admin/quote-requests/${id}`);
});

// ---------- 관리자: 최종 선정 ----------
router.post('/admin/quote-requests/select', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const itemId = Number(body.quote_item_id);
const submissionId = Number(body.submission_id);
const reasonInput = (body.reason || '').trim();
const item = await db.prepare('SELECT * FROM quote_items WHERE id = ?').get(itemId);
if (!item) { res.writeHead(404); return res.end('품목을 찾을 수 없습니다.'); }

const { submissions, minPrice } = await computeSelectionForItem(itemId);
const target = submissions.find((s) => s.id === submissionId);
if (!target) {
res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
return res.end('선택한 견적을 찾을 수 없습니다.');
}
const isLowest = target.unit_price === minPrice;
if (!isLowest && !reasonInput) {
res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
return res.end('최저가가 아닌 업체를 선정하려면 선정 사유를 입력해야 합니다.');
}
const reasonToStore = isLowest ? '' : reasonInput;

await db.prepare(`
INSERT INTO final_selections (quote_item_id, submission_id, reason, selected_at) VALUES (?, ?, ?, ?)
ON CONFLICT(quote_item_id) DO UPDATE SET submission_id = excluded.submission_id, reason = excluded.reason, selected_at = excluded.selected_at
`).run(itemId, submissionId, reasonToStore, new Date().toISOString());

redirect(res, `/admin/quote-requests/${item.quote_request_id}`);
});

// ---------- 업체: 대시보드 ----------
router.get('/vendor', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const rows = await db.prepare(`
SELECT qr.*, va.permission FROM vendor_assignments va
JOIN quote_requests qr ON qr.id = va.quote_request_id
WHERE va.vendor_id = ?
ORDER BY qr.id DESC
`).all(u.userId);
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.vendorDashboard({ user: u, requests: rows }));
});

router.get('/vendor/quote-requests/:id', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const id = Number(req.params.id);
const assign = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ? AND vendor_id = ?').get(id, u.userId);
if (!assign) { res.writeHead(403); return res.end('접근 권한이 없습니다.'); }
const qr = await db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
const items = await db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
const mySubmissions = await db.prepare(`
SELECT s.* FROM submissions s
JOIN quote_items qi ON qi.id = s.quote_item_id
WHERE qi.quote_request_id = ? AND s.vendor_id = ?
`).all(id, u.userId);
const flash = req.query.err === 'selected' ? { type: 'error', message: '이미 관리자가 최종 선정한 제안이라 삭제할 수 없습니다. 수정은 가능합니다.' } : null;
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.vendorQuoteRequestPage({ user: u, qr, items, permission: assign.permission, mySubmissions, flash }));
});

router.post('/vendor/quote-requests/:id/submissions', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const id = Number(req.params.id);
const assign = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ? AND vendor_id = ?').get(id, u.userId);
if (!assign || assign.permission !== 'submit') { res.writeHead(403); return res.end('견적입력 권한이 없습니다.'); }

const body = await parseBody(req);
const itemId = Number(body.quote_item_id);
const item = await db.prepare('SELECT * FROM quote_items WHERE id = ? AND quote_request_id = ?').get(itemId, id);
if (!item) { res.writeHead(404); return res.end('품목을 찾을 수 없습니다.'); }
const type = body.type === 'substitute' ? 'substitute' : 'requested';
const submissionId = body.submission_id ? Number(body.submission_id) : null;

let existing = null;
if (submissionId) {
existing = await db.prepare('SELECT * FROM submissions WHERE id = ? AND quote_item_id = ? AND vendor_id = ?').get(submissionId, itemId, u.userId);
} else if (type === 'requested') {
existing = await db.prepare("SELECT * FROM submissions WHERE quote_item_id=? AND vendor_id=? AND type='requested'").get(itemId, u.userId);
}

const vals = [
body.product_name || '', body.spec || '', Number(body.qty) || 1, body.unit || '',
Number(body.unit_price) || 0, body.delivery_date || null, body.manufacturer || '',
type === 'substitute' ? (body.substitute_reason || '') : '', type === 'requested' ? (body.note || '') : '',
new Date().toISOString(),
];

if (existing) {
await db.prepare(`
UPDATE submissions SET product_name=?, spec=?, qty=?, unit=?, unit_price=?, delivery_date=?, manufacturer=?, substitute_reason=?, note=?, submitted_at=?
WHERE id = ?
`).run(...vals, existing.id);
} else {
await db.prepare(`
INSERT INTO submissions (quote_item_id, vendor_id, type, product_name, spec, qty, unit, unit_price, delivery_date, manufacturer, substitute_reason, note, submitted_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(itemId, u.userId, type, ...vals);
}

notifyManagerOfSubmission(req, id, u).catch(() => {});

redirect(res, `/vendor/quote-requests/${id}`);
});

// 업체가 자신이 제출한 대체품 제안을 삭제. 이미 관리자가 최종 선정한 건은 삭제를 막는다(선정 결과가 사라지는 것을 방지).
router.post('/vendor/quote-requests/:id/submissions/:subId/delete', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const id = Number(req.params.id);
const subId = Number(req.params.subId);
const assign = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ? AND vendor_id = ?').get(id, u.userId);
if (!assign || assign.permission !== 'submit') { res.writeHead(403); return res.end('견적입력 권한이 없습니다.'); }

const sub = await db.prepare(`
SELECT s.* FROM submissions s JOIN quote_items qi ON qi.id = s.quote_item_id
WHERE s.id = ? AND qi.quote_request_id = ? AND s.vendor_id = ?
`).get(subId, id, u.userId);
if (!sub) { res.writeHead(404); return res.end('제출 내역을 찾을 수 없습니다.'); }

const picked = await db.prepare('SELECT quote_item_id FROM final_selections WHERE submission_id = ?').get(subId);
if (picked) return redirect(res, `/vendor/quote-requests/${id}?err=selected`);

await db.prepare('DELETE FROM submissions WHERE id = ?').run(subId);
redirect(res, `/vendor/quote-requests/${id}`);
});

router.get('/vendor/quote-requests/:id/submissions-template', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const id = Number(req.params.id);
const assign = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ? AND vendor_id = ?').get(id, u.userId);
if (!assign) { res.writeHead(403); return res.end('접근 권한이 없습니다.'); }
const items = await db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
const rows = items.map((it) => [it.item_name, '요청품', it.item_name, it.spec || '', String(it.qty), it.unit || '', '', '', '', '']);
const exampleFirstName = items[0] ? items[0].item_name : '비료';
const exampleRow = [
`(예시-실제로 반영되지 않는 샘플행. 참고 후 삭제하거나 그대로 두세요) ${exampleFirstName}`,
'대체품', `${exampleFirstName} 대신 제안할 실제 제품명`, '규격 예시', '10', '포', '14000', '2026-09-01', '제조사명', '대체 제안 사유(선택)',
];
const finalRows = rows.length ? [...rows, exampleRow] : [['예) 비료', '요청품', '비료', '20kg', '10', '포', '15000', '2026-09-01', '한국비료', ''], exampleRow];
sendXlsxTemplate(res, '견적_일괄제출_양식.xlsx',
['품목명', '구분(요청품/대체품)', '제안품목명', '규격', '수량', '단위', '단가', '납기일자', '제조사', '비고/제안사유'],
finalRows,
[{ col: 1, list: ['요청품', '대체품'], firstRow: 2, lastRow: finalRows.length + 1 }]
);
});

router.post('/vendor/quote-requests/:id/submissions/import', async (req, res) => {
const u = requireLogin('vendor')(req, res);
if (!u) return;
const id = Number(req.params.id);
const assign = await db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ? AND vendor_id = ?').get(id, u.userId);
if (!assign || assign.permission !== 'submit') { res.writeHead(403); return res.end('견적입력 권한이 없습니다.'); }

await parseBody(req);
const files = req.files || {};
if (!files.submissions_excel || !files.submissions_excel.data) return redirect(res, `/vendor/quote-requests/${id}`);

const items = await db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
const itemByName = new Map(items.map((it) => [it.item_name.trim().toLowerCase(), it]));

let rows;
try {
rows = readXlsxFirstSheet(files.submissions_excel.data);
} catch (e) {
console.error('[엑셀] 견적 일괄 제출 파싱 실패:', e.message);
return redirect(res, `/vendor/quote-requests/${id}`);
}

const insertSub = db.prepare(`
INSERT INTO submissions (quote_item_id, vendor_id, type, product_name, spec, qty, unit, unit_price, delivery_date, manufacturer, substitute_reason, note, submitted_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateSub = db.prepare(`
UPDATE submissions SET product_name=?, spec=?, qty=?, unit=?, unit_price=?, delivery_date=?, manufacturer=?, substitute_reason=?, note=?, submitted_at=?
WHERE id = ?
`);
let created = 0, updated = 0, skipped = 0;
for (let i = 1; i < rows.length; i++) {
const r = rows[i];
if (xlsxRowIsEmpty(r)) continue;
const [itemNameRaw, typeRaw, productNameRaw, spec, qty, unit, unitPrice, deliveryDateRaw, manufacturer, note] = r;
const item = itemByName.get(String(itemNameRaw || '').trim().toLowerCase());
if (!item) { skipped++; continue; }
const type = String(typeRaw || '').includes('대체') ? 'substitute' : 'requested';
const productName = productNameRaw || item.item_name;
const deliveryDate = excelSerialToDateStr(deliveryDateRaw) || null;

// 같은 업체가 같은 품목에 같은 구분으로 이미 제출한 건이 있으면(요청품은 품목당 1건, 대체품은 제안품목명 기준) 새로 만들지 않고 수정한다.
let existing;
if (type === 'requested') {
existing = await db.prepare("SELECT id FROM submissions WHERE quote_item_id=? AND vendor_id=? AND type='requested'").get(item.id, u.userId);
} else {
existing = await db.prepare("SELECT id FROM submissions WHERE quote_item_id=? AND vendor_id=? AND type='substitute' AND LOWER(TRIM(product_name))=LOWER(TRIM(?))").get(item.id, u.userId, productName);
}

const vals = [
productName, spec || '', Number(qty) || 1, unit || '',
Number(unitPrice) || 0, deliveryDate, manufacturer || '',
type === 'substitute' ? (note || '') : '', type === 'requested' ? (note || '') : '',
new Date().toISOString(),
];

if (existing) {
await updateSub.run(...vals, existing.id);
updated++;
} else {
await insertSub.run(item.id, u.userId, type, ...vals);
created++;
}
}
console.log(`[엑셀] 견적 일괄 제출: 생성 ${created}건, 수정 ${updated}건, 스킵 ${skipped}건`);
if (created > 0 || updated > 0) notifyManagerOfSubmission(req, id, u).catch(() => {});
redirect(res, `/vendor/quote-requests/${id}`);
});

// 업체가 견적을 제출하면 해당 견적요청의 담당자에게 알림 메일을 보낸다.
async function notifyManagerOfSubmission(req, quoteRequestId, vendorUser) {
const qr = await db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(quoteRequestId);
if (!qr || !qr.manager_email) return;
const baseUrl = `${isHttps(req) ? 'https' : 'http'}://${req.headers.host}`;
await mail.sendMail({
to: qr.manager_email,
subject: `[힐마루 견적관리] 견적 제출: ${qr.title}`,
html: `<p>${escapeHtml(qr.manager_name || '담당자')}님, <b>${escapeHtml(vendorUser.displayName)}</b> 업체가 견적을 제출했습니다.</p>
<p><b>${escapeHtml(qr.title)}</b></p>
<p><a href="${baseUrl}/admin/quote-requests/${quoteRequestId}">여기를 눌러 견적 비교표 확인하기</a></p>`,
});
}

// ---------- 서버 시작 ----------
const server = http.createServer(async (req, res) => {
const handled = await router.handle(req, res);
if (!handled) {
res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
res.end('페이지를 찾을 수 없습니다.');
}
});

// DB(Turso) 초기화가 끝난 뒤에만 서버를 listen 시작한다.
initDb()
.then(() => {
server.listen(PORT, () => {
console.log(`힐마루 견적관리 서버 실행 중: http://localhost:${PORT}`);
});
})
.catch((err) => {
console.error('[초기화 실패] DB 초기화 중 오류가 발생하여 서버를 시작할 수 없습니다:', err);
process.exit(1);
});
