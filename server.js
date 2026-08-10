'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');
const { URL } = require('url');
const { createClient } = require('@libsql/client');
const zlib = require('zlib');
const pptxgen = require('pptxgenjs');

// ===== embedded CSS =====
// 디자인 방향: Nocturne — 다크 톤 프리미엄 관리자 UI (동훈그룹 힐마루)
const STYLE_CSS = `
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Inter', -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif;
  background: #161826;
  color: #e9e9ed;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
a { color: #9184d9; text-decoration: none; }
a:hover { color: #d2cefd; }

.app-shell { display: flex; min-height: 100vh; }
.app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

/* ---- persistent admin sidebar ---- */
.sidebar { width: 200px; flex: none; background: #1c1e2c; border-right: 1px solid rgba(233,233,237,0.1); display: flex; flex-direction: column; padding: 16px 12px; }
.sidebar .brand-block { padding: 2px 8px 16px; margin-bottom: 10px; }
.sidebar .brand-block .brand { color: #e9e9ed; font-weight: 600; font-size: 16px; letter-spacing: -0.01em; border: none; padding: 0; }
.sidebar .brand-block .brand-tagline { color: #75798c; font-size: 10.5px; margin-top: 2px; letter-spacing: normal; text-transform: none; }
.sidebar nav { display: flex; flex-direction: column; gap: 6px; }
.sidebar nav a.navitem { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 8px; font-size: 13px; color: #b2b6ca; box-shadow: 0 0 0 1px #3f424d; white-space: nowrap; }
.sidebar nav a.navitem:hover { background: #282a3a; color: #e9e9ed; }
.sidebar nav a.navitem.active { background: rgba(145,132,217,0.14); color: #e9e9ed; }
.sidebar nav a.navitem .ic { flex: none; display: flex; color: #9397ab; }
.sidebar nav a.navitem.active .ic { color: #9184d9; }
.sidebar nav a.navitem .lbl { flex: 1; }
.sidebar nav a.navitem .arrow { flex: none; opacity: .5; }
.sidebar .sidebar-account { margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(233,233,237,0.1); }
.sidebar .sidebar-account .who-label { font-size: 11px; color: #75798c; margin-bottom: 2px; }
.sidebar .sidebar-account .who-name { font-size: 13px; margin-bottom: 8px; color: #e9e9ed; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar .sidebar-account .who-name b { color: #d2cefd; font-weight: 500; }
.sidebar .sidebar-account .account-links { display: flex; gap: 12px; align-items: center; }
.sidebar .sidebar-account .account-links a { font-weight: 500; font-size: 12.5px; color: #9184d9; }
.sidebar .sidebar-account .account-links a:hover { color: #d2cefd; }

/* ---- simple topbar (vendor pages) ---- */
.topbar {
  background: #1c1e2c;
  color: #e9e9ed;
  border-bottom: 1px solid rgba(233,233,237,0.1);
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
  color: #e9e9ed;
  font-weight: 600;
  font-size: 20px;
  letter-spacing: -.01em;
  padding-bottom: 2px;
  border-bottom: 2px solid #9184d9;
}
.brand-tagline { color: #75798c; font-size: 10px; letter-spacing: 1.5px; margin-top: 4px; text-transform: uppercase; }
.topbar nav { display: flex; align-items: center; }
.topbar nav a { color: #b2b6ca; margin-left: 18px; font-size: 13px; letter-spacing: .3px; }
.topbar nav a:hover { color: #e9e9ed; }
.who { color: #9397ab; font-size: 13px; }

.container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}
.app-shell.has-sidebar .app-main .container { max-width: 1180px; margin: 0; padding: 26px 36px 48px; }

.footer {
  text-align: center;
  color: #75798c;
  font-size: 11px;
  letter-spacing: 1px;
  padding: 26px;
  border-top: 1px solid rgba(233,233,237,0.1);
  margin-top: 28px;
}

h1 { font-size: 24px; margin: 0 0 22px; color: #e9e9ed; font-weight: 600; letter-spacing: -.01em; }
h2 { font-size: 17px; margin: 34px 0 14px; color: #cfd3e5; font-weight: 600; letter-spacing: .1px; }
h3 { font-size: 15px; margin: 18px 0 8px; color: #b2b6ca; font-weight: 600; }

.flash { padding: 11px 15px; border-radius: 8px; margin-bottom: 18px; font-size: 14px; border: 1px solid transparent; }
.flash.info { background: rgba(145,132,217,0.12); color: #d2cefd; border-color: rgba(145,132,217,0.28); }
.flash.error { background: rgba(196,90,72,0.16); color: #f0a898; border-color: rgba(196,90,72,0.32); }
.flash.success { background: rgba(112,168,112,0.14); color: #aedcae; border-color: rgba(112,168,112,0.3); }

.card {
  background: #232532;
  border: none;
  box-shadow: 0 0 0 1px #3f424d;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 18px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.qr-card { display: block; color: inherit; }
.qr-card:hover { background: #282a3a; }
.qr-title { font-weight: 500; font-size: 14px; margin-bottom: 8px; color: #e9e9ed; }
.qr-status { display: inline-block; font-size: 11px; padding: 3px 9px; border-radius: 6px; margin-bottom: 10px; letter-spacing: .2px; font-weight: 500; }
.qr-status.selecting { background: #423a6a; color: #f5f4ff; }
.qr-status.completed { background: #3f424d; color: #cfd3e5; }
.qr-status.open { background: transparent; color: #d2cefd; box-shadow: inset 0 0 0 1px rgba(210,206,253,0.35); }
.qr-meta { font-size: 12px; color: #9397ab; margin: 2px 0; }
.qr-total { margin-top: 10px; font-size: 15px; font-weight: 600; color: #e9e9ed; }
.qr-progress-bar { height: 5px; background: #3f424d; border-radius: 999px; overflow: hidden; margin: 8px 0; }
.qr-progress-fill { height: 100%; background: #9184d9; }

table { width: 100%; border-collapse: collapse; font-size: 14px; word-break: keep-all; overflow-wrap: break-word; }
th, td { padding: 10px 12px; border-bottom: 1px solid rgba(233,233,237,0.08); text-align: left; vertical-align: top; }
th { background: transparent; font-weight: 500; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #75798c; white-space: nowrap; border-bottom: 1px solid rgba(233,233,237,0.1); }
tbody tr:hover td { background: rgba(233,233,237,0.03); }
.table-scroll { overflow-x: auto; margin-bottom: 4px; }
.table-scroll table.table-wide { width: auto; min-width: 100%; }
.table-wide td, .table-wide th { white-space: nowrap; }
.table-wide td.wrap { white-space: normal; min-width: 130px; }
tr.row-substitute { background: rgba(145,132,217,0.05); }
tr.row-lowest { box-shadow: inset 0 0 0 1px #9184d9; }
tr.row-selected { background: rgba(145,132,217,0.1); }
.badge { display: inline-block; font-size: 11px; padding: 3px 9px; border-radius: 6px; font-weight: 500; letter-spacing: .2px; }
.badge.requested { background: transparent; color: #d2cefd; box-shadow: inset 0 0 0 1px rgba(210,206,253,0.35); }
.badge.substitute { background: #423a6a; color: #f5f4ff; }
.badge.lowest { background: #9184d9; color: #1c1e2c; margin-left: 6px; }
.badge.selected { background: #3f424d; color: #cfd3e5; }

form.inline { display: inline; }
label { display: block; font-size: 12px; color: #9397ab; margin: 12px 0 5px; letter-spacing: .2px; }
input[type=text], input[type=email], input[type=number], input[type=date], input[type=password], select, textarea {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid rgba(233,233,237,0.16);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: #232532;
  color: #e9e9ed;
  color-scheme: dark;
}
input:focus, select:focus, textarea:focus { outline: none; border-color: #9184d9; }
textarea { resize: vertical; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 12px; }
fieldset { border: 1px solid rgba(233,233,237,0.14); border-radius: 8px; margin: 14px 0; padding: 14px; }
legend { font-weight: 600; font-size: 13px; padding: 0 6px; color: #b2b6ca; }

button, .btn {
  display: inline-block;
  background: transparent;
  color: #9184d9;
  border: 1px solid #9184d9;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: .2px;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}
button:hover, .btn:hover { background: rgba(145,132,217,0.12); text-decoration: none; }
.btn.secondary { background: #423a6a; color: #e9e9ed; border-color: #423a6a; }
.btn.secondary:hover { background: #4d4478; }
.btn.small { padding: 5px 11px; font-size: 12px; }
.btn.danger { background: transparent; color: #e79488; border-color: #a4483a; }
.btn.danger:hover { background: rgba(164,72,58,0.16); }
.btn.ghost { background: transparent; border: 1px solid rgba(233,233,237,0.16); color: #b2b6ca; }
.btn.ghost:hover { background: rgba(233,233,237,0.06); }

.category-block { border: none; box-shadow: 0 0 0 1px #3f424d; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; background: #1c1e2c; }
.category-title { font-weight: 600; margin-bottom: 8px; color: #b2b6ca; }
.vendor-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 14px; color: #cfd3e5; }
.vendor-row .vname { flex: 1; }
.bulk-btns { margin-bottom: 8px; }
.bulk-btns button { margin-right: 6px; }

.login-screen { display: flex; min-height: 100vh; }
.login-photo-split { flex: 1.15; display: flex; flex-direction: column; min-height: 320px; }
.login-photo-half { flex: 1; position: relative; overflow: hidden; }
.login-photo-half::before { content: ''; position: absolute; inset: 0; background-image: var(--photo); background-size: cover; background-position: center; }
.login-photo-half + .login-photo-half { border-top: 1px solid rgba(0,0,0,0.3); }
.login-photo-overlay-half { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,11,18,0.05) 0%, rgba(10,11,18,0.2) 55%, rgba(8,9,15,0.74) 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 22px 28px; }
.login-photo-overlay-half .title { color: #f2f1fb; font-size: 19px; letter-spacing: .3px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.login-photo-overlay-half .sub { color: #d4d2ea; font-size: 11px; letter-spacing: .3px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.login-form-side { flex: 1; display: flex; align-items: center; justify-content: center; background: #161826; padding: 40px 24px; }
.login-wrap { max-width: 340px; width: 100%; }
.login-hero { text-align: center; margin-bottom: 28px; }
.login-hero .mark { font-weight: 600; font-size: 26px; color: #e9e9ed; letter-spacing: -.01em; white-space: nowrap; }
.login-hero .tagline { font-size: 11px; color: #75798c; letter-spacing: .5px; margin-top: 6px; white-space: nowrap; }
.login-tabs { display: inline-flex; gap: 0; margin: 0 auto 4px; border: 1px solid rgba(233,233,237,0.16); border-radius: 8px; overflow: hidden; }
.login-tabs a { padding: 7px 18px; color: #b2b6ca; font-weight: 500; font-size: 12.5px; letter-spacing: .2px; white-space: nowrap; border-left: 1px solid rgba(233,233,237,0.16); margin-bottom: 0; }
.login-tabs a:first-child { border-left: none; }
.login-tabs a.active { color: #d2cefd; background: rgba(145,132,217,0.12); box-shadow: inset 0 0 0 1px #9184d9; }
@media (max-width: 860px) {
  .login-screen { flex-direction: column; }
  .login-photo-split { flex-direction: row; min-height: 0; height: 190px; flex: none; }
  .login-photo-half + .login-photo-half { border-top: none; border-left: 1px solid rgba(0,0,0,0.3); }
  .login-photo-overlay-half { padding: 14px 16px; }
  .login-photo-overlay-half .title { font-size: 15px; }
  .login-form-side { padding: 32px 20px 48px; }
}
@media (max-width: 380px) {
  .login-photo-overlay-half .title { font-size: 13px; }
  .login-photo-overlay-half .sub { font-size: 10px; }
  .login-hero .mark { font-size: 22px; }
  .login-hero .tagline { font-size: 10px; letter-spacing: .3px; }
}

.total-box { background: #1c1e2c; color: #e9e9ed; padding: 18px 22px; border-radius: 8px; margin-top: 16px; box-shadow: 0 0 0 1px #3f424d; }
.total-box .label { font-size: 12px; color: #9397ab; letter-spacing: .3px; }
.total-box .value { font-size: 24px; font-weight: 600; color: #e9e9ed; }

.hint { font-size: 12px; color: #75798c; }
.section-actions { display: flex; justify-content: space-between; align-items: center; }
.dashboard-layout { display: flex; gap: 20px; align-items: flex-start; }
.dashboard-col-active, .dashboard-col-done { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.dashboard-col-title { font-size: 14px; margin: 0 0 2px; color: #b2b6ca; letter-spacing: .2px; }
.dashboard-manager-group { display: flex; flex-direction: column; gap: 12px; }
.dashboard-manager-group + .dashboard-manager-group { margin-top: 6px; padding-top: 14px; border-top: 1px dashed rgba(233,233,237,0.14); }
.dashboard-manager-title { font-size: 12px; font-weight: 600; color: #9397ab; letter-spacing: .3px; }
@media (max-width: 860px) {
  .dashboard-layout { flex-direction: column; }
  .app-shell.has-sidebar { flex-direction: column; }
  .app-shell.has-sidebar .sidebar { width: 100%; flex-direction: row; align-items: center; flex-wrap: wrap; padding: 10px 14px; }
  .app-shell.has-sidebar .sidebar nav { flex-direction: row; flex-wrap: wrap; }
  .app-shell.has-sidebar .sidebar .sidebar-account { margin: 0 0 0 auto; padding: 0; border: none; }
  .app-shell.has-sidebar .sidebar .brand-block { padding: 0 10px 0 0; margin: 0; }
}
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
CREATE TABLE IF NOT EXISTS manual_purchase_records (
id INTEGER PRIMARY KEY AUTOINCREMENT,
manager TEXT DEFAULT '',
year TEXT DEFAULT '',
site TEXT DEFAULT '',
dept TEXT DEFAULT '',
category1 TEXT DEFAULT '',
category2 TEXT DEFAULT '',
category3 TEXT DEFAULT '',
draft_no TEXT DEFAULT '',
title TEXT DEFAULT '',
vendor_name TEXT DEFAULT '',
order_date TEXT DEFAULT '',
received_date TEXT DEFAULT '',
item_type TEXT DEFAULT '',
item_name TEXT DEFAULT '',
spec TEXT DEFAULT '',
order_qty TEXT DEFAULT '',
unit_price TEXT DEFAULT '',
supply_price TEXT DEFAULT '',
received_qty TEXT DEFAULT '',
pack_unit TEXT DEFAULT '',
payment_date TEXT DEFAULT '',
payment_amount TEXT DEFAULT '',
payment_recipient TEXT DEFAULT '',
note TEXT DEFAULT '',
created_at TEXT DEFAULT ''
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

// 시트가 여러 개인 .xlsx Buffer 생성 (연도별 시트로 나눠 담는 구매실적보고서 원본데이터용).
// sheets: [{ name: '2026', rows: [[...행1...], [...행2...], ...] }] — rows[0]이 실제 1행이 된다.
function buildMultiSheetXlsx(sheets) {
  const entries = new Map();
  const contentTypesParts = [
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    ];
  const workbookSheetsXml = [];
  const workbookRelsParts = [];
  sheets.forEach((sheet, idx) => {
    const sheetNum = idx + 1;
    const rowsXml = sheet.rows.map((row, rIdx) => {
      const rn = rIdx + 1;
      return `<row r="${rn}">${row.map((v, i) => xlsxCellInline(`${xlsxColLetter(i)}${rn}`, v)).join('')}</row>`;
    }).join('');
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;
    entries.set(`xl/worksheets/sheet${sheetNum}.xml`, Buffer.from(sheetXml, 'utf8'));
    contentTypesParts.push(`<Override PartName="/xl/worksheets/sheet${sheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    // 엑셀 시트명은 31자 제한 및 일부 특수문자 금지 — 안전하게 다듬는다.
    const safeName = xmlEscape(String(sheet.name || `Sheet${sheetNum}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)) || `Sheet${sheetNum}`;
    workbookSheetsXml.push(`<sheet name="${safeName}" sheetId="${sheetNum}" r:id="rId${sheetNum}"/>`);
    workbookRelsParts.push(`<Relationship Id="rId${sheetNum}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNum}.xml"/>`);
  });
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${contentTypesParts.join('')}</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheetsXml.join('')}</sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelsParts.join('')}</Relationships>`;
  entries.set('[Content_Types].xml', Buffer.from(contentTypes, 'utf8'));
  entries.set('_rels/.rels', Buffer.from(rootRels, 'utf8'));
  entries.set('xl/workbook.xml', Buffer.from(workbookXml, 'utf8'));
  entries.set('xl/_rels/workbook.xml.rels', Buffer.from(workbookRels, 'utf8'));
  return writeZip(entries);
}

function sendMultiSheetXlsx(res, filename, sheets) {
  const buf = buildMultiSheetXlsx(sheets);
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

// 구매 실적 보고서 스킬(hillmaru-purchase-performance-report)이 읽는 원본 구매데이터 양식과
// 동일하게 맞춘 24개 컬럼. 견적요청 결과 다운로드와 수동 구매Data 입력 화면에서 함께 사용한다.
const PURCHASE_DATA_COLS = ['담당자', '연도', '사업장', '요청부서', '과목1', '과목2', '과목3', '품의번호', '제목', '업체명', '발주일', '입고일', '제품구분', '제품명', '규격', '발주수량', '단가', '공급가', '입고수량', '포장단위', '대금지급일', '대금지급', '지급처', '비고'];

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

// 관리자 사이드바 내비게이션 아이콘 (인라인 SVG, 도형 기반)
const NAV_ICONS = {
dashboard: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="6" height="6" rx="1.5"></rect><rect x="11.5" y="2.5" width="6" height="6" rx="1.5"></rect><rect x="2.5" y="11.5" width="6" height="6" rx="1.5"></rect><rect x="11.5" y="11.5" width="6" height="6" rx="1.5"></rect></svg>',
vendors: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="2.6"></circle><path d="M2 17c0-3 2.2-4.6 5-4.6s5 1.6 5 4.6"></path><circle cx="15" cy="8.4" r="2"></circle><path d="M13.3 17c.2-2 1.5-3.3 3.4-3.7"></path></svg>',
categories: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6.5l2-2.5h4l1.5 2h5.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8.5z"></path></svg>',
sites: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="6" height="14" rx="1"></rect><rect x="11" y="8" width="6" height="9" rx="1"></rect></svg>',
purchaseData: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 3h7l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M12 3v3h3"></path><line x1="6.5" y1="10.5" x2="12.5" y2="10.5"></line><line x1="6.5" y1="13.5" x2="10.5" y2="13.5"></line></svg>',
admins: '<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="7" r="3"></circle><path d="M2.5 17c0-3.5 2.5-5.5 5.5-5.5s5.5 2 5.5 5.5"></path><line x1="15" y1="6" x2="15" y2="11"></line><line x1="12.5" y1="8.5" x2="17.5" y2="8.5"></line></svg>',
};
function sidebarNavItem({ href, label, active, icon }) {
return `<a class="navitem${active ? ' active' : ''}" href="${href}">
<span class="ic">${icon}</span>
<span class="lbl">${escapeHtml(label)}</span>
<svg class="arrow" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="7,4 13,10 7,16"></polyline></svg>
</a>`;
}

function layout({ title, body, user, flash, active }) {
const isAdmin = !!(user && user.role === 'admin');
const sidebarHtml = isAdmin ? `
<div class="sidebar">
<div class="brand-block">
<div class="brand">힐마루</div>
<div class="brand-tagline">동훈그룹 · 견적관리시스템</div>
</div>
<nav>
${sidebarNavItem({ href: '/admin', label: '대시보드', active: active === 'dashboard', icon: NAV_ICONS.dashboard })}
${sidebarNavItem({ href: '/admin/vendors', label: '업체 관리', active: active === 'vendors', icon: NAV_ICONS.vendors })}
${sidebarNavItem({ href: '/admin/categories', label: '업체 카테고리 관리', active: active === 'categories', icon: NAV_ICONS.categories })}
${sidebarNavItem({ href: '/admin/sites', label: '사업장 관리', active: active === 'sites', icon: NAV_ICONS.sites })}
${sidebarNavItem({ href: '/admin/purchase-data', label: '구매Data', active: active === 'purchase-data', icon: NAV_ICONS.purchaseData })}
${sidebarNavItem({ href: '/admin/admins', label: '관리자 계정 관리', active: active === 'admins', icon: NAV_ICONS.admins })}
</nav>
<div class="sidebar-account">
<div class="who-label">로그인 계정</div>
<div class="who-name">${escapeHtml(user.displayName)} · <b>관리자</b></div>
<div class="account-links">
<a href="/admin/account">계정설정</a>
<a href="/logout">로그아웃</a>
</div>
</div>
</div>` : '';

const topbarHtml = !isAdmin ? `
<header class="topbar">
<div class="topbar-inner">
<div>
<a class="brand" href="${user ? '/vendor' : '/'}">힐마루</a>
<div class="brand-tagline">동훈그룹 · 견적관리시스템</div>
</div>
<nav>
${user ? `
<span class="who">${escapeHtml(user.displayName)} (업체)</span>
<a href="/vendor/account">계정설정</a>
<a href="/logout">로그아웃</a>
` : `<a href="/login">로그인</a>`}
</nav>
</div>
</header>` : '';

return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · 힐마루 견적관리</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/style.css">
</head>
<body>
<div class="app-shell${isAdmin ? ' has-sidebar' : ''}">
${sidebarHtml}
<div class="app-main">
${topbarHtml}
<main class="container">
${flash ? `<div class="flash ${flash.type || 'info'}">${escapeHtml(flash.message)}</div>` : ''}
${body}
</main>
<footer class="footer">힐마루 견적관리 시스템</footer>
</div>
</div>
</body>
</html>`;
}

// ===== lib/views.js =====
function optionTags(options, selected) {
return options.map((o) => `<option value="${escapeHtml(o)}" ${o === selected ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('');
}

// 실제 힐마루 포천/창녕 공식 홈페이지의 코스 사진을 로그인 화면에 사용한다(같은 회사 소유 이미지).
// 포천 클럽하우스 진입로 사진은 포천 공식 홈페이지(클럽안내 > 클럽소개)에 있는 원본을 그대로 사용한다.
const LOGIN_PHOTO_POCHEON = 'https://cdn.pocheon.hillmaru.com/images/club-images/pc/wo3.jpg';
const LOGIN_PHOTO_CHANGNYEONG = 'https://www.hillmaru.com/_Data/_PopUp/%EB%A9%94%EC%9D%B8_visual_1.jpg';

function loginPage({ role = 'admin', error } = {}) {
return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>로그인 · 힐마루 견적관리</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/style.css">
</head>
<body style="margin:0;background:#161826;">
<div class="login-screen">
<div class="login-photo-split">
<div class="login-photo-half" style="--photo:url('${LOGIN_PHOTO_POCHEON}');">
<div class="login-photo-overlay-half">
<div class="title">힐마루 포천</div>
<div class="sub">경기도 포천 · 45홀 퍼블릭</div>
</div>
</div>
<div class="login-photo-half" style="--photo:url('${LOGIN_PHOTO_CHANGNYEONG}');">
<div class="login-photo-overlay-half">
<div class="title">힐마루 창녕</div>
<div class="sub">경상남도 창녕 · 18홀 회원제 · 18홀 퍼블릭</div>
</div>
</div>
</div>
<div class="login-form-side">
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
</div>
</div>
</div>
</body>
</html>`;
}

function progressBar(selected, total) {
const pct = total > 0 ? Math.round((selected / total) * 100) : 0;
return `<div class="qr-progress-bar"><div class="qr-progress-fill" style="width:${pct}%"></div></div>`;
}
function adminDashboard({ user, requests, flash }) {
const cardFor = (r) => {
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
};
const activeRequests = requests.filter((r) => !(r.totalItems > 0 && r.selectedCount === r.totalItems));
const doneRequests = requests.filter((r) => r.totalItems > 0 && r.selectedCount === r.totalItems);

// 담당자별로 묶어서 보여준다 (일단 이 두 사람 고정 순서: 유환익 차장 위, 이관현 과장 아래)
const MANAGER_GROUPS = ['유환익 차장', '이관현 과장'];
function managerGroupOf(r) {
const name = (r.manager_name || '').trim();
if (name.includes('유환익')) return '유환익 차장';
return '이관현 과장';
}
function groupedByManager(list) {
if (list.length === 0) return '';
return MANAGER_GROUPS.map((mgr) => {
const items = list.filter((r) => managerGroupOf(r) === mgr);
if (items.length === 0) return '';
return `<div class="dashboard-manager-group">
<div class="dashboard-manager-title">${escapeHtml(mgr)}</div>
${items.map(cardFor).join('')}
</div>`;
}).join('');
}
const activeCards = groupedByManager(activeRequests);
const doneCards = groupedByManager(doneRequests);

const overallTotal = requests.length;
const overallDone = doneRequests.length;
const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;
const managerProgress = MANAGER_GROUPS.map((mgr) => {
const all = requests.filter((r) => managerGroupOf(r) === mgr);
const done = all.filter((r) => r.totalItems > 0 && r.selectedCount === r.totalItems);
return { mgr, total: all.length, done: done.length };
}).filter((m) => m.total > 0);

const body = `
<div class="section-actions">
<h1>관리자 대시보드</h1>
<a class="btn" href="/admin/quote-requests/new">+ 새 견적요청</a>
</div>
<div class="card">
<h3 style="margin:0 0 12px;">기간 내 진행 현황</h3>
<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px;">
<span style="font-weight:600;font-size:24px;">${overallDone}<span style="font-size:14px;color:#75798c;font-weight:400;">/${overallTotal}건 완료</span></span>
</div>
<div class="qr-progress-bar" style="margin-bottom:14px;"><div class="qr-progress-fill" style="width:${overallPct}%"></div></div>
<div style="display:flex;gap:10px;flex-wrap:wrap;">
${managerProgress.map((m) => `<div style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:8px;background:#1c1e2c;font-size:12.5px;"><span style="color:#b2b6ca;">${escapeHtml(m.mgr)}</span><span style="color:#d2cefd;font-weight:600;">${m.done}/${m.total}</span></div>`).join('')}
</div>
</div>
<div class="dashboard-layout">
<div class="dashboard-col dashboard-col-active">
<h2 class="dashboard-col-title">진행중인 견적요청</h2>
${activeRequests.length === 0 ? '<div class="card hint">진행중인 견적요청이 없습니다.</div>' : activeCards}
</div>
<div class="dashboard-col dashboard-col-done">
<h2 class="dashboard-col-title">완료된 견적요청</h2>
${doneRequests.length === 0 ? '<div class="card hint">완료된 견적요청이 없습니다.</div>' : doneCards}
</div>
</div>
`;
return layout({ title: '관리자 대시보드', body, user, flash, active: 'dashboard' });
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
<div class="table-scroll">
<table class="table-wide">
<thead><tr><th>업체명</th><th>카테고리</th><th>담당자</th><th>이메일</th><th>로그인ID</th><th>상태</th><th>사업자등록증</th><th>통장사본</th><th></th></tr></thead>
<tbody>${rows || '<tr><td colspan="9">등록된 업체가 없습니다.</td></tr>'}</tbody>
</table>
</div>
</div>
<h2>엑셀로 업체 일괄 등록</h2>
<div class="card">
<p><a class="btn secondary small" href="/admin/vendors/template">↓ 등록 양식 다운로드(.xlsx)</a></p>
<p class="hint">양식을 내려받아 작성한 뒤 업로드해주세요.</p>
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
return layout({ title: '업체 관리', body, user, flash, active: 'vendors' });
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
<p><a class="btn secondary small" href="/admin/categories/template">↓ 등록 양식 다운로드(.xlsx)</a></p>
<p class="hint">양식을 내려받아 작성한 뒤 업로드해주세요.</p>
<form method="POST" action="/admin/categories/import" enctype="multipart/form-data">
<label>카테고리 목록 엑셀(.xlsx)</label>
<input type="file" name="categories_excel" accept=".xlsx" required>
<p class="hint">1행은 머릿글로 건너뜁니다. 구분 칸에는 "카테고리1"/"카테고리2"/"카테고리3" 중 하나를 적어주세요.</p>
<button type="submit" class="btn secondary">일괄 추가</button>
</form>
</div>
<a href="/admin/vendors">← 업체 관리로 돌아가기</a>
`;
return layout({ title: '카테고리 관리', body, user, flash, active: 'categories' });
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
<p><a class="btn secondary small" href="/admin/sites/template">↓ 등록 양식 다운로드(.xlsx)</a></p>
<p class="hint">양식을 내려받아 작성한 뒤 업로드해주세요.</p>
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
return layout({ title: '사업장 관리', body, user, flash, active: 'sites' });
}

// 견적관리 시스템을 거치지 않고 진행된 구매건을 관리자가 엑셀로 직접 등록해두는 화면.
// 구매Data 다운로드 시 견적 기반 데이터와 합산되어 나간다.
function adminPurchaseDataPage({ user, records, flash }) {
const rows = records.map((m) => `
<tr>
<td class="wrap">${escapeHtml(m.manager)}</td>
<td>${escapeHtml(m.year)}</td>
<td class="wrap">${escapeHtml(m.site)}</td>
<td class="wrap">${escapeHtml(m.dept)}</td>
<td class="wrap">${escapeHtml(m.category1)}</td>
<td class="wrap">${escapeHtml(m.category2)}</td>
<td class="wrap">${escapeHtml(m.category3)}</td>
<td class="wrap">${escapeHtml(m.draft_no)}</td>
<td class="wrap">${escapeHtml(m.title)}</td>
<td class="wrap">${escapeHtml(m.vendor_name)}</td>
<td>${escapeHtml(m.order_date)}</td>
<td>${escapeHtml(m.received_date)}</td>
<td class="wrap">${escapeHtml(m.item_type)}</td>
<td class="wrap">${escapeHtml(m.item_name)}</td>
<td class="wrap">${escapeHtml(m.spec)}</td>
<td>${escapeHtml(String(m.order_qty ?? ''))}</td>
<td>${escapeHtml(String(m.unit_price ?? ''))}</td>
<td>${escapeHtml(String(m.supply_price ?? ''))}</td>
<td>${escapeHtml(String(m.received_qty ?? ''))}</td>
<td>${escapeHtml(m.pack_unit)}</td>
<td>${escapeHtml(m.payment_date)}</td>
<td>${escapeHtml(String(m.payment_amount ?? ''))}</td>
<td>${escapeHtml(m.payment_recipient)}</td>
<td class="wrap">${escapeHtml(m.note)}</td>
<td>
<form method="POST" action="/admin/purchase-data/${m.id}/delete" class="inline" onsubmit="return confirm('이 구매건을 삭제할까요?');">
<button type="submit" class="btn small danger">삭제</button>
</form>
</td>
</tr>`).join('');

const body = `
<div class="section-actions">
<h1>구매Data</h1>
</div>
<div class="card" style="margin-bottom:14px;">
<h3 style="margin:0 0 12px;">구매Data 다운로드</h3>
<form method="GET" action="/admin/quote-requests/export-results" style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;">
<div><label>발주일(선정일) 시작</label><input type="date" name="from"></div>
<div><label>발주일(선정일) 종료</label><input type="date" name="to"></div>
<div><button type="submit" class="btn secondary">↓ 구매Data 다운로드(.xlsx)</button></div>
<div class="hint" style="flex-basis:100%;">기간을 비워두면 전체 기간이 다운로드됩니다. 기준은 발주일(현재는 최종 선정일시로 대체)입니다.</div>
</form>
</div>
<div class="card" style="margin-bottom:14px;">
<h3 style="margin:0 0 4px;">구매 실적 보고서</h3>
<p class="hint" style="margin-top:0;margin-bottom:12px;">사업장·기간을 지정하면 hillmaru-purchase-performance-report 스킬과 같은 형식의 PPTX 보고서를 바로 생성해서 다운로드합니다.</p>
<form method="GET" action="/admin/purchase-data/performance-report" style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;">
<div><label>사업장</label><select name="site"><option value="포천">포천</option><option value="창녕">창녕</option></select></div>
<div><label>발주일(선정일) 시작</label><input type="date" name="from"></div>
<div><label>발주일(선정일) 종료</label><input type="date" name="to"></div>
<div><label>기준 연도(선택)</label><input type="text" name="period" placeholder="예) 2026" pattern="\d{4}" style="width:90px;"></div>
<div><button type="submit" class="btn">↓ 구매 실적 보고서 다운로드(.pptx)</button></div>
<div><button type="submit" formaction="/admin/purchase-data/report-export" class="btn secondary small">↓ 원본데이터 다운로드(.xlsx)</button></div>
<div class="hint" style="flex-basis:100%;">기준 연도를 비워두면 데이터상 가장 최근 연도를 기준으로 만듭니다. 기간을 비워두면 전체 기간의 데이터로 만듭니다. "원본데이터"는 PPTX 대신 스킬용 원본 엑셀만 필요할 때 쓰는 보조 다운로드입니다.</div>
</form>
</div>

<h2>견적시스템 미사용 구매건 수동입력</h2>
<p class="hint" style="margin-top:-8px;margin-bottom:16px;">견적관리 시스템을 거치지 않고 진행된 구매건을 여기에 엑셀로 등록해두면, 위 "구매Data 다운로드"에 견적 기반 데이터와 함께 합산되어 나갑니다.</p>
<div class="card bulk-btns">
<a class="btn secondary small" href="/admin/purchase-data/template">↓ 등록 양식 다운로드(.xlsx)</a>
<form method="POST" action="/admin/purchase-data/import" enctype="multipart/form-data" style="display:inline-flex;gap:8px;align-items:center;margin-left:10px;">
<input type="file" name="purchase_excel" accept=".xlsx" required>
<button type="submit" class="btn small">엑셀로 일괄 등록</button>
</form>
</div>
<div class="card">
${records.length === 0 ? '<p class="hint">수동으로 등록된 구매건이 없습니다.</p>' : `
<div class="table-scroll">
<table class="table-wide">
<thead><tr>${PURCHASE_DATA_COLS.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}<th></th></tr></thead>
<tbody>${rows}</tbody>
</table>
</div>`}
</div>
`;
return layout({ title: '구매Data', body, user, flash, active: 'purchase-data' });
}

// 관리자 계정을 여러 개 운영할 수 있도록, 로그인한 관리자가 새 관리자 계정을 추가/삭제하는 화면.
// 마지막 남은 관리자 계정과 본인 계정은 삭제할 수 없게 막아 잠금(lock-out)을 방지한다.
function adminAdminsPage({ user, admins, flash }) {
const rows = admins.map((a) => `
<tr>
<td>${escapeHtml(a.login_id)}</td>
<td>${escapeHtml(a.display_name)}</td>
<td>${a.id === user.userId ? '<span class="hint">현재 로그인 계정</span>' : (admins.length > 1 ? `
<form method="POST" action="/admin/admins/${a.id}/delete" class="inline" onsubmit="return confirm('${escapeHtml(a.display_name)}(${escapeHtml(a.login_id)}) 계정을 삭제할까요?');">
<button type="submit" class="btn small danger">삭제</button>
</form>` : '<span class="hint">-</span>')}</td>
</tr>`).join('');

const body = `
<div class="section-actions">
<h1>관리자 계정 관리</h1>
</div>
<p class="hint" style="margin-top:-10px;margin-bottom:16px;">여기서 추가한 계정은 관리자 로그인 화면에서 동일하게 로그인할 수 있습니다.</p>
<div class="card">
<div class="table-scroll">
<table class="table-wide">
<thead><tr><th>아이디</th><th>이름</th><th></th></tr></thead>
<tbody>${rows}</tbody>
</table>
</div>
</div>
<h2>새 관리자 계정 추가</h2>
<div class="card">
<form method="POST" action="/admin/admins">
<div class="form-row">
<div><label>아이디</label><input type="text" name="login_id" required></div>
<div><label>이름</label><input type="text" name="display_name" required></div>
<div><label>비밀번호</label><input type="password" name="password" required minlength="4"></div>
</div>
<div style="margin-top:14px;"><button type="submit" class="btn">계정 추가</button></div>
</form>
</div>
`;
return layout({ title: '관리자 계정 관리', body, user, flash, active: 'admins' });
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
<p><a class="btn secondary small" href="/admin/quote-requests/items-template">↓ 등록 양식 다운로드(.xlsx)</a></p>
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
return layout({ title: '새 견적요청', body, user, flash, active: 'dashboard' });
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
<p><a class="btn secondary small" href="/admin/quote-requests/items-template">↓ 등록 양식 다운로드(.xlsx)</a></p>
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
return layout({ title: `견적요청 수정 — ${qr.title}`, body, user, flash, active: 'dashboard' });
}

function submissionRow(s, { isLowest, isSelected }) {
const typeLabel = s.type === 'requested' ? '요청품' : '대체품';
const typeBadge = `<span class="badge ${s.type}">${typeLabel}</span>`;
const total = s.unit_price * s.qty;
return `
<tr class="${s.type === 'substitute' ? 'row-substitute' : ''} ${isLowest ? 'row-lowest' : ''} ${isSelected ? 'row-selected' : ''}">
<td>${typeBadge}${isLowest ? '<span class="badge lowest">최저가</span>' : ''}${isSelected ? '<span class="badge selected">선정됨</span>' : ''}</td>
<td class="wrap">${escapeHtml(s.vendor_name)}</td>
<td class="wrap">${escapeHtml(s.product_name)}</td>
<td class="wrap">${escapeHtml(s.spec)}</td>
<td>${s.qty}${escapeHtml(s.unit)}</td>
<td>${money(s.unit_price)}</td>
<td>${money(total)}</td>
<td>${escapeHtml(s.delivery_date || '-')}</td>
<td class="wrap">${escapeHtml(s.manufacturer || '-')}</td>
<td class="wrap">${s.substitute_reason ? escapeHtml(s.substitute_reason) : '-'}</td>
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
<div class="table-scroll">
<table class="table-wide">
<thead><tr><th>구분</th><th>업체</th><th>제안 품목</th><th>규격</th><th>수량</th><th>단가</th><th>총액</th><th>납기일자</th><th>제조사</th><th>대체 사유</th><th></th></tr></thead>
<tbody>${rows}</tbody>
</table>
</div>`}
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
<div class="table-scroll">
<table class="table-wide">
<thead><tr><th>기준 품목</th><th>선정 구분</th><th>선정 품목</th><th>선정 업체</th><th>수량</th><th>단가</th><th>품목 총금액</th><th>납기일자</th><th>선정 사유</th></tr></thead>
<tbody>
${items.filter((it) => selections[it.id]).map((it) => {
const s = selections[it.id];
const reasonLabel = s.isLowestPick ? '최저가' : (s.selectionReason || '-');
return `<tr>
<td class="wrap">${escapeHtml(it.item_name)}</td>
<td><span class="badge ${s.type}">${s.type === 'requested' ? '요청품' : '대체품'}</span></td>
<td class="wrap">${escapeHtml(s.product_name)}</td>
<td class="wrap">${escapeHtml(s.vendor_name)}</td>
<td>${s.qty}${escapeHtml(s.unit)}</td>
<td>${money(s.unit_price)}</td>
<td>${money(s.unit_price * s.qty)}</td>
<td>${escapeHtml(s.delivery_date || '-')}</td>
<td class="wrap">${s.isLowestPick ? `<span class="badge lowest" style="margin-left:0;">${escapeHtml(reasonLabel)}</span>` : escapeHtml(reasonLabel)}</td>
</tr>`;
}).join('')}
</tbody>
</table>
</div>
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
return layout({ title: qr.title, body, user, flash, active: 'dashboard' });
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
<p><a class="btn secondary small" href="/vendor/quote-requests/${qr.id}/submissions-template">↓ 이 견적요청의 제출 양식 다운로드(.xlsx)</a></p>
<p class="hint">요청 품목명이 미리 채워져 있습니다. 단가 등만 입력해서 올려주세요.</p>
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

const views = { loginPage, adminDashboard, adminVendorsPage, adminCategoriesPage, adminSitesPage, adminPurchaseDataPage, adminAdminsPage, quoteRequestNewPage, quoteRequestEditPage, quoteRequestDetailPage, vendorDashboard, vendorQuoteRequestPage, accountPage };

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
// 그대로 옮겨왔다. 우리 시스템이 만드는 구매Data는 이미 스키마가 깨끗해서(2023년식 원본 워크북의
// 스키마 보정용 스크립트였던 prep_data.py/finalize_data.py/mapping3.py는 옮길 필요가 없었다.
// 사업장(포천/창녕)과 연도는 파라미터로 받아 하드코딩을 제거했다.
const PPT_COL = {
  MANAGER: 0, YEAR: 1, SITE: 2, DEPT: 3, CAT1: 4, CAT2: 5, CAT3: 6, DRAFT_NO: 7, TITLE: 8, VENDOR: 9,
  ORDER_DATE: 10, RECEIVED_DATE: 11, ITEM_TYPE: 12, ITEM_NAME: 13, SPEC: 14, ORDER_QTY: 15, UNIT_PRICE: 16,
  SUPPLY_PRICE: 17, RECEIVED_QTY: 18, PACK_UNIT: 19, PAYMENT_DATE: 20, PAYMENT_AMOUNT: 21, PAYMENT_RECIPIENT: 22, NOTE: 23,
};
const PPT_C3N = 24; // pptNormalizeCategories가 덧붙이는 정규화된 과목3(과목3_norm) 인덱스

function pptNum(v) {
  const n = Number(String(v == null ? '' : v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function pptSiteBare(s) {
  return String(s || '').replace(/^힐마루\s*/, '').trim();
}
function pptMedian(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function pptSumBy(rows, keyFn, valFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) || 0) + valFn(r));
  }
  return m;
}
function pptSortedDesc(map) {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

// canon_merge.py 포팅: 표기(공백/쉼표/괄호)만 다른 같은 뜻의 과목3 값을 가장 빈도 높은 표기로 합친다.
function pptCanonKey(s) {
  return String(s == null ? '' : s).replace(/[\s,]+/g, '').replace(/\(/g, '/').replace(/\)/g, '');
}
const PPT_GROUP2_OVERRIDE = { '락카 소모품': '락카 소모품', '시설': '시설', '시설 소모품': '시설', '시설물': '시설' };
function pptNormalizeCategories(rows) {
  const counts = new Map();
  rows.forEach((r) => { const c3 = r[PPT_COL.CAT3]; if (c3) counts.set(c3, (counts.get(c3) || 0) + 1); });
  const groups = new Map();
  counts.forEach((cnt, cat) => {
    const k = pptCanonKey(cat);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push([cat, cnt]);
  });
  const canonMap = new Map();
  groups.forEach((variants) => {
    const canonical = variants.slice().sort((a, b) => b[1] - a[1])[0][0];
    variants.forEach(([cat]) => canonMap.set(cat, canonical));
  });
  return rows.map((r) => {
    const out = r.slice();
    let c3norm = out[PPT_COL.CAT3] ? (canonMap.get(out[PPT_COL.CAT3]) || out[PPT_COL.CAT3]) : '기타';
    const cat2 = out[PPT_COL.CAT2];
    if (cat2 && PPT_GROUP2_OVERRIDE[cat2]) c3norm = PPT_GROUP2_OVERRIDE[cat2];
    out[PPT_C3N] = c3norm;
    return out;
  });
}

// export_json.py(렌더링에 실제로 쓰이는 필드만) + export_yoy.py 포팅.
// site: '포천' 또는 '창녕'. mainPeriod: 기준 연도(비우면 데이터상 가장 최근 연도).
function buildPurchaseReportData({ rows, site, mainPeriod }) {
  const siteRowsRaw = rows.filter((r) => pptSiteBare(r[PPT_COL.SITE]) === site);
  const siteRows = pptNormalizeCategories(siteRowsRaw);
  const periods = Array.from(new Set(siteRows.map((r) => String(r[PPT_COL.YEAR] || '').trim()).filter(Boolean))).sort();
  if (periods.length === 0) return null;
  const finalMainPeriod = mainPeriod && periods.includes(mainPeriod) ? mainPeriod : periods[periods.length - 1];
  const main = siteRows.filter((r) => String(r[PPT_COL.YEAR] || '').trim() === finalMainPeriod);
  if (main.length === 0) return null;
  
  const TOTAL = main.reduce((s, r) => s + pptNum(r[PPT_COL.SUPPLY_PRICE]), 0);
  
  const catSums = pptSumBy(main, (r) => r[PPT_C3N] || '기타', (r) => pptNum(r[PPT_COL.SUPPLY_PRICE]));
  const catSorted = pptSortedDesc(catSums);
  const TOP_CAT_N = 4;
  const topCats = catSorted.slice(0, TOP_CAT_N);
  const restCatSum = catSorted.slice(TOP_CAT_N).reduce((s, [, v]) => s + v, 0);
  const catChart = [...topCats.map(([k, v]) => [k, Math.round(v)]), ['그 외', Math.round(restCatSum)]];
  const catTopNames = topCats.map(([k]) => k);
  
  const vendSums = pptSumBy(main, (r) => r[PPT_COL.VENDOR] || '', (r) => pptNum(r[PPT_COL.SUPPLY_PRICE]));
  const vendSorted = pptSortedDesc(vendSums);
  const TOP_VEND_N = 5;
  const topVend = vendSorted.slice(0, TOP_VEND_N);
  const restVendN = Math.max(0, vendSorted.length - TOP_VEND_N);
  const restVendSum = vendSorted.slice(TOP_VEND_N).reduce((s, [, v]) => s + v, 0);
  const vendChart = [...topVend.map(([k, v]) => [k, Math.round(v)]), [`그 외 ${restVendN}개 업체`, Math.round(restVendSum)]];
  const vendTopNames = topVend.map(([k]) => k);
  
  // 월별 세부: 실제로 데이터에 존재하는 월만 컬럼으로 쓴다(기존 스킬은 상반기 1~6월을 하드코딩했지만,
  // 우리는 이미 from~to 기간으로 걸러진 데이터를 받으므로 "실제 존재하는 월"이 곧 조회 기간이 된다).
  function monthKeyOf(row) {
    const d = String(row[PPT_COL.ORDER_DATE] || '');
    const m = d.match(/^(\d{4})-(\d{2})-\d{2}$/);
    if (!m || m[1] !== finalMainPeriod.slice(0, 4)) return '기타';
    return Number(m[2]);
  }
  const presentMonths = Array.from(new Set(main.map(monthKeyOf).filter((m) => m !== '기타'))).sort((a, b) => a - b);
  const hasOther = main.some((r) => monthKeyOf(r) === '기타');
  const monthCols = [...presentMonths, ...(hasOther ? ['기타'] : [])];
  const monthColLabels = [...presentMonths.map((m) => `${m}월`), ...(hasOther ? ['기타(범위외)'] : [])];
  
  const MONTHLY_N = 15;
  const mtopCats = catSorted.slice(0, MONTHLY_N).map(([k]) => k);
  const monthlyCat = {};
  [...mtopCats, '그 외'].forEach((c) => { monthlyCat[c] = monthCols.map(() => 0); });
  main.forEach((r) => {
    const c = r[PPT_C3N] || '기타';
    const bucket = mtopCats.includes(c) ? c : '그 외';
    const mi = monthCols.indexOf(monthKeyOf(r));
    if (mi >= 0) monthlyCat[bucket][mi] += pptNum(r[PPT_COL.SUPPLY_PRICE]);
  });
  const mtopVends = vendSorted.slice(0, MONTHLY_N).map(([k]) => k);
  const monthlyVend = {};
  [...mtopVends, '그 외'].forEach((v) => { monthlyVend[v] = monthCols.map(() => 0); });
  main.forEach((r) => {
    const v = r[PPT_COL.VENDOR] || '';
    const bucket = mtopVends.includes(v) ? v : '그 외';
    const mi = monthCols.indexOf(monthKeyOf(r));
    if (mi >= 0) monthlyVend[bucket][mi] += pptNum(r[PPT_COL.SUPPLY_PRICE]);
  });
  const monthlyCatTotal = monthCols.map((mk) => main.reduce((s, r) => (monthKeyOf(r) === mk ? s + pptNum(r[PPT_COL.SUPPLY_PRICE]) : s), 0)).map((v) => Math.round(v));
  
  function itemDetail(subRows, topN) {
    const amtG = pptSumBy(subRows, (r) => r[PPT_COL.ITEM_NAME] || '(품목명 없음)', (r) => pptNum(r[PPT_COL.SUPPLY_PRICE]));
    const qtyG = pptSumBy(subRows, (r) => r[PPT_COL.ITEM_NAME] || '(품목명 없음)', (r) => pptNum(r[PPT_COL.ORDER_QTY]));
    const sorted = pptSortedDesc(amtG);
    const top = sorted.slice(0, topN);
    const restN = Math.max(0, sorted.length - topN);
    const restAmt = sorted.slice(topN).reduce((s, [, v]) => s + v, 0);
    const items = top.map(([name, amt]) => {
      const qty = qtyG.get(name) || 0;
      const unitPrice = qty ? Math.round(amt / qty) : 0;
      return [name, qty || 0, unitPrice, Math.round(amt)];
    });
    if (restN > 0) items.push([`그 외 ${restN}개 품목`, null, null, Math.round(restAmt)]);
    return { total: Math.round(sorted.reduce((s, [, v]) => s + v, 0)), items };
  }
  const catItems = {};
  catTopNames.forEach((c) => { catItems[c] = itemDetail(main.filter((r) => (r[PPT_C3N] || '기타') === c), 18); });
  const vendItems = {};
  vendTopNames.forEach((v) => {
    const sub = main.filter((r) => (r[PPT_COL.VENDOR] || '') === v);
    const detail = itemDetail(sub, 20);
    const cat3Counts = pptSumBy(sub, (r) => r[PPT_C3N] || '기타', () => 1);
    const modeSorted = pptSortedDesc(cat3Counts);
    vendItems[v] = { ...detail, main_cat: modeSorted.length ? modeSorted[0][0] : '' };
  });
  
  // 매트릭스1: 지출액 x 발주빈도 (상위 10개 품목구분, 품의번호 unique count 기준)
  const orderSetByCat = new Map();
  main.forEach((r) => {
    const c = r[PPT_C3N] || '기타';
    if (!orderSetByCat.has(c)) orderSetByCat.set(c, new Set());
    orderSetByCat.get(c).add(String(r[PPT_COL.DRAFT_NO] || ''));
  });
  const cat10 = catSorted.slice(0, 10).map(([name, amt]) => ({ name, 금액: Math.round(amt), 건수: orderSetByCat.get(name) ? orderSetByCat.get(name).size : 0 }));
  const costMed = pptMedian(cat10.map((d) => d.금액));
  const freqMed = pptMedian(cat10.map((d) => d.건수));
  const matrix1 = cat10.map((d) => ({ ...d, quad: d.금액 >= costMed && d.건수 >= freqMed ? 'A' : d.금액 >= costMed ? 'B' : d.건수 >= freqMed ? 'C' : 'D' }));
  
  // ABC 분석 (파레토: 누적 70%=A, 90%=B, 100%=C)
  const catRankTotal = catSorted.reduce((s, [, v]) => s + v, 0) || 1;
  let cum = 0;
  const abcItems = { A: [], B: [], C: [] };
  catSorted.forEach(([name, amt]) => {
    cum += amt;
    const pct = cum / catRankTotal;
    const grade = pct <= 0.70 ? 'A' : pct <= 0.90 ? 'B' : 'C';
    abcItems[grade].push({ name, 금액: Math.round(amt), pct: Math.round((cum / catRankTotal) * 1000) / 10 });
  });
  const abcSummary = {};
  ['A', 'B', 'C'].forEach((g) => {
    const total = abcItems[g].reduce((s, x) => s + x.금액, 0);
    abcSummary[g] = { count: abcItems[g].length, total, pct_of_all: Math.round((total / catRankTotal) * 1000) / 10 };
  });
  
  // 정기계약 전환 후보: 발주건수(품의번호 unique) 5건 이상 업체
  const vendOrderSets = new Map();
  const vendCatCounts = new Map();
  main.forEach((r) => {
    const v = r[PPT_COL.VENDOR] || '';
    if (!vendOrderSets.has(v)) vendOrderSets.set(v, new Set());
    vendOrderSets.get(v).add(String(r[PPT_COL.DRAFT_NO] || ''));
    if (!vendCatCounts.has(v)) vendCatCounts.set(v, new Map());
    const cm = vendCatCounts.get(v);
    const c = r[PPT_C3N] || '기타';
    cm.set(c, (cm.get(c) || 0) + 1);
  });
  const blanketCandidates = Array.from(vendOrderSets.entries())
    .map(([v, set]) => ({ name: v, 건수: set.size, 금액: Math.round(vendSums.get(v) || 0), 주요품목: pptSortedDesc(vendCatCounts.get(v))[0] ? pptSortedDesc(vendCatCounts.get(v))[0][0] : '' }))
    .filter((x) => x.건수 >= 5)
    .sort((a, b) => b.건수 - a.건수)
    .slice(0, 6);
  
  // 계절성 (월별 발주 패턴, '기타' 제외하고 최다 지출월 탐색)
  const seasonLabels = monthColLabels.length ? monthColLabels : ['(데이터 없음)'];
  const seasonValues = monthlyCatTotal.length ? monthlyCatTotal : [0];
  let peakIdx = -1;
  presentMonths.forEach((_, i) => { if (peakIdx === -1 || seasonValues[i] > seasonValues[peakIdx]) peakIdx = i; });
  const peakMonth = peakIdx >= 0 ? `${presentMonths[peakIdx]}월` : '-';
  const peakAmt = peakIdx >= 0 ? (seasonValues[peakIdx] || 0) : 0;
  const peakDriversMap = pptSumBy(main.filter((r) => peakIdx >= 0 && monthKeyOf(r) === presentMonths[peakIdx]), (r) => r[PPT_C3N] || '기타', (r) => pptNum(r[PPT_COL.SUPPLY_PRICE]));
  const peakDrivers = pptSortedDesc(peakDriversMap).slice(0, 3).map(([name, amt]) => ({ name, 금액: Math.round(amt) }));
  
  // 연도별 신규/이탈 거래업체 (mainPeriod보다 이전 연도들 전체와 비교)
  const mainIdx = periods.indexOf(finalMainPeriod);
  const priorVendors = new Set(siteRows.filter((r) => periods.indexOf(String(r[PPT_COL.YEAR]).trim()) < mainIdx).map((r) => r[PPT_COL.VENDOR]).filter(Boolean));
  const mainVendors = new Set(main.map((r) => r[PPT_COL.VENDOR]).filter(Boolean));
  const newVendorSet = new Set(Array.from(mainVendors).filter((v) => !priorVendors.has(v)));
  const churnedSet = new Set(Array.from(priorVendors).filter((v) => !mainVendors.has(v)));
  const newVendorAmt = pptSumBy(main.filter((r) => newVendorSet.has(r[PPT_COL.VENDOR])), (r) => r[PPT_COL.VENDOR], (r) => pptNum(r[PPT_COL.SUPPLY_PRICE]));
  const newVendors = pptSortedDesc(newVendorAmt).slice(0, 8).map(([name, amt]) => ({ name, 금액: Math.round(amt) }));
  const priorRows = siteRows.filter((r) => churnedSet.has(r[PPT_COL.VENDOR]) && periods.indexOf(String(r[PPT_COL.YEAR]).trim()) < mainIdx);
  const churnAmt = pptSumBy(priorRows, (r) => r[PPT_COL.VENDOR], (r) => pptNum(r[PPT_COL.SUPPLY_PRICE]));
  const churnedVendors = pptSortedDesc(churnAmt).slice(0, 8).map(([name, amt]) => ({ name, 금액: Math.round(amt) }));
  
  // YoY: 사업장 전체 연도별 총액 + 상위 품목구분/업체별 연도별 금액
  const yoy = {};
  periods.forEach((p) => { yoy[p] = Math.round(siteRows.filter((r) => String(r[PPT_COL.YEAR]).trim() === p).reduce((s, r) => s + pptNum(r[PPT_COL.SUPPLY_PRICE]), 0)); });
  const catYoy = {};
  catTopNames.forEach((c) => {
    catYoy[c] = periods.map((p) => Math.round(siteRows.filter((r) => String(r[PPT_COL.YEAR]).trim() === p && (r[PPT_C3N] || '기타') === c).reduce((s, r) => s + pptNum(r[PPT_COL.SUPPLY_PRICE]), 0)));
  });
  const vendYoy = {};
  vendTopNames.forEach((v) => {
    vendYoy[v] = periods.map((p) => Math.round(siteRows.filter((r) => String(r[PPT_COL.YEAR]).trim() === p && (r[PPT_COL.VENDOR] || '') === v).reduce((s, r) => s + pptNum(r[PPT_COL.SUPPLY_PRICE]), 0)));
  });
  
  return {
    site, mainPeriod: finalMainPeriod, periods,
    total_amount: Math.round(TOTAL), total_cat_count: catSorted.length, total_vend_count: vendSorted.length,
    yoy, cat_chart: catChart, vend_chart: vendChart,
    cat_top_names: catTopNames, vend_top_names: vendTopNames, rest_vend_n: restVendN,
    month_cols: monthColLabels, monthly_cat: monthlyCat, monthly_vend: monthlyVend, monthly_cat_total: monthlyCatTotal,
    cat_items: catItems, vend_items: vendItems,
    matrix1, abc_summary: abcSummary, abc_items: abcItems, blanket_candidates: blanketCandidates,
    seasonality: { labels: seasonLabels, values: seasonValues, peak_month: peakMonth, peak_amt: Math.round(peakAmt), peak_drivers: peakDrivers },
    new_vendor_count: newVendorSet.size, new_vendors: newVendors,
    churned_vendor_count: churnedSet.size, churned_vendors: churnedVendors,
    cat_yoy: catYoy, vend_yoy: vendYoy,
  };
}

// generate2.js 포팅: pptxgenjs로 슬라이드를 그린다. 포천 하드코딩 텍스트/연도 배열을 모두 D(파라미터)
// 기반으로 바꾸고, 데이터 기반으로 계산 가능한 서술은 그렇게 바꾸고, 계산 불가능한 특정 카테고리명을
// 예시로 든 문장(예: "비료·장비 소모품비·농약·골재")은 실제 top 목록을 그대로 나열하도록 일반화했다.
function pptFmt(n) { if (n === null || n === undefined) return ''; return Math.round(n).toLocaleString('en-US'); }
function pptEok(n) { return (n / 100000000).toFixed(1) + '억'; }

async function buildPurchasePerformancePptxBuffer(D) {
  const NAVY = '1E2761', NAVY_D = '141B47', ICE = 'CADCFC', ICE_L = 'EAF0FC', WHITE = 'FFFFFF', GRAY = '6B7280', TXT = '232735', GOLD = 'C9A24B';
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  const PW = 13.33, PH = 7.5;
  let PAGE = 0;
  
  function footer(slide, pageNum) {
    slide.addText('㈜동훈 그룹 기획감사팀', { x: PW - 3.5, y: PH - 0.42, w: 3.3, h: 0.3, fontFace: 'Arial', fontSize: 9, color: GRAY, align: 'right' });
    slide.addText(String(pageNum), { x: 0.4, y: PH - 0.42, w: 0.6, h: 0.3, fontFace: 'Arial', fontSize: 9, color: GRAY, align: 'left' });
  }
  function contentSlide() {
    PAGE++;
    const slide = pres.addSlide();
    slide.background = { color: WHITE };
    footer(slide, PAGE);
    return slide;
  }
  function titleBlock(slide, tag, title) {
    slide.addText([{ text: tag + '  ', options: { color: NAVY, bold: true } }, { text: title, options: { color: TXT, bold: true } }],
                  { x: 0.5, y: 0.28, w: 11.5, h: 0.55, fontFace: 'Cambria', fontSize: 22 });
    slide.addShape(pres.ShapeType.line, { x: 0.5, y: 0.92, w: 12.33, h: 0, line: { color: ICE, width: 1.5 } });
  }
  function analysisCard(slide, x, y, w, text) {
    const maxBottom = 6.85;
    const h = Math.max(0.9, Math.min(1.5, maxBottom - y));
    slide.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.05, fill: { color: ICE_L }, line: { type: 'none' } });
    slide.addShape(pres.ShapeType.rect, { x, y, w: 0.06, h, fill: { color: GOLD }, line: { type: 'none' } });
    slide.addText(text, { x: x + 0.2, y: y + 0.12, w: w - 0.35, h: h - 0.24, fontFace: 'Calibri', fontSize: 8.5, color: TXT, valign: 'middle', lineSpacingMultiple: 1.15 });
  }
  function palette4(n) {
    const base = [NAVY, '3E5C9A', '7C93C7', '9DB3DE', 'C3D0EC', GOLD];
    const out = [];
    for (let i = 0; i < n; i++) out.push(i === n - 1 ? GOLD : base[i % (base.length - 1)]);
    return out;
  }
  
  const site = D.site;
  const periods = D.periods;
  const mainIdx = periods.indexOf(D.mainPeriod);
  const rangeLabel = periods.length > 1 ? `${periods[0]}~${D.mainPeriod} 연도별 추이 포함` : `${D.mainPeriod} 기준`;
  const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  
  // ---- 표지 ----
  {
    PAGE++;
    const slide = pres.addSlide();
    slide.background = { color: NAVY };
    slide.addShape(pres.ShapeType.ellipse, { x: 10.6, y: -1.6, w: 4.6, h: 4.6, fill: { color: NAVY_D }, line: { type: 'none' } });
    slide.addShape(pres.ShapeType.ellipse, { x: -1.4, y: 5.2, w: 3.6, h: 3.6, fill: { color: NAVY_D }, line: { type: 'none' } });
    slide.addText(`${site} 힐마루 – 구매 실적 보고`, { x: 0.9, y: 2.55, w: 11.5, h: 0.9, fontFace: 'Cambria', fontSize: 36, bold: true, color: WHITE });
    slide.addText(`${D.mainPeriod} 기준 (${rangeLabel})`, { x: 0.9, y: 3.35, w: 11.5, h: 0.5, fontFace: 'Calibri', fontSize: 18, color: ICE });
    slide.addShape(pres.ShapeType.line, { x: 0.95, y: 4.05, w: 3.2, h: 0, line: { color: GOLD, width: 2 } });
    slide.addText([
      { text: `총 집행 금액 : ₩ ${pptFmt(D.total_amount)}`, options: { bold: true, breakLine: true } },
      { text: `품목 구분별 비용 분석 (총 ${D.total_cat_count}개 품목구분 / 상위 ${D.cat_top_names.length}개 분석)`, options: { breakLine: true } },
      { text: `업체별 비용 분석 (총 ${D.total_vend_count}개 업체 / 상위 ${D.vend_top_names.length}개 업체 분석)` },
      ], { x: 0.95, y: 4.35, w: 10.5, h: 1.6, fontFace: 'Calibri', fontSize: 15, color: WHITE, lineSpacingMultiple: 1.35 });
    slide.addText(`${todayStr}  보고`, { x: 0.95, y: 6.55, w: 6, h: 0.4, fontFace: 'Calibri', fontSize: 12, color: ICE });
    slide.addText('㈜동훈 그룹 기획감사팀', { x: PW - 4.3, y: 6.9, w: 4, h: 0.35, fontFace: 'Arial', fontSize: 10, color: ICE, align: 'right' });
  }
  
  // ---- 목차 ----
  {
    const slide = contentSlide();
    slide.addText('목차', { x: 0.5, y: 0.5, w: 6, h: 0.7, fontFace: 'Cambria', fontSize: 30, bold: true, color: NAVY });
    const toc = [
      ['1', '연도별 비교', '3'],
      ['2', `${D.mainPeriod} 구매내역 (품목구분별 · 업체별, 연도별 총금액)`, '4'],
      ['3', '구매전략 수립 예시', '6'],
      ['4', '품목구분별 집행 금액', '9'],
      ['5', '업체별 집행 금액', String(9 + 1 + D.cat_top_names.length)],
      ['6', '추가 분석 (월별 계절성 · 신규·이탈 거래업체)', String(9 + 1 + D.cat_top_names.length + 1 + D.vend_top_names.length)],
      ];
    let y = 1.75;
    toc.forEach((row) => {
      slide.addText(row[0], { x: 0.9, y, w: 0.5, h: 0.5, fontFace: 'Cambria', fontSize: 19, bold: true, color: GOLD });
      slide.addText(row[1], { x: 1.5, y, w: 9, h: 0.5, fontFace: 'Calibri', fontSize: 16, color: TXT });
      slide.addText(row[2], { x: 11.3, y, w: 1.2, h: 0.5, fontFace: 'Calibri', fontSize: 13, color: GRAY, align: 'right' });
      slide.addShape(pres.ShapeType.line, { x: 0.9, y: y + 0.52, w: 11.6, h: 0, line: { color: ICE_L, width: 1 } });
      y += 0.78;
    });
  }
  
  // ---- 연도별 비교 ----
  {
    const slide = contentSlide();
    titleBlock(slide, '1)', `연도별 비교 (${site}, 총 집행금액)`);
    const vals = periods.map((p) => Math.round((D.yoy[p] / 1e8) * 10) / 10);
    slide.addChart(pres.ChartType.bar, [{ name: '총 집행금액', labels: periods, values: vals }], {
      x: 0.6, y: 1.2, w: 7.6, h: 4.6, barDir: 'col',
      chartColors: periods.map((p, i) => (i === mainIdx ? GOLD : NAVY)),
      valAxisLabelFormatCode: '0.0',
      showTitle: true, title: `연도별 총 집행금액 (${site}, 단위: 억원)`, titleFontFace: 'Calibri', titleFontSize: 13,
      showValue: true, dataLabelFormatCode: '0.0', dataLabelPosition: 'outEnd', dataLabelFontSize: 11, dataLabelColor: NAVY, dataLabelBold: true,
      catAxisLabelFontSize: 11, valAxisLabelFontSize: 9,
      valGridLine: { color: ICE_L, size: 1 }, catGridLine: { style: 'none' }, showLegend: false,
    });
    const colW = [0.85, ...periods.map(() => 3.5 / periods.length)];
    slide.addTable([
      ['연도', ...periods].map((h, i) => ({ text: h, options: { bold: true, fill: { color: NAVY }, color: WHITE, align: i === 0 ? 'left' : 'right' } })),
      ['총 공급가', ...periods.map((p) => ({ text: pptFmt(D.yoy[p]), options: { align: 'right' } }))],
      ], { x: 8.5, y: 1.3, w: 4.35, colW, fontSize: 8, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, margin: [2, 3, 2, 3] });
    slide.addText('※ 선택하신 기간 조건에 따라 연도별 집계 범위가 다를 수 있습니다. 정확한 증감률 비교보다는 추세 참고용으로 확인해 주세요.',
                  { x: 8.5, y: 2.35, w: 4.35, h: 1.0, fontFace: 'Calibri', fontSize: 9.5, italic: true, color: GRAY });
    const prevP = mainIdx > 0 ? periods[mainIdx - 1] : null;
    const trendTxt = prevP
      ? (() => { const cur = D.yoy[D.mainPeriod], prev = D.yoy[prevP]; const diffPct = prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0;
                return `분석: ${D.mainPeriod} 총 집행금액은 ₩${pptFmt(cur)}로, 직전 연도(${prevP}) 대비 ${diffPct >= 0 ? '+' : ''}${diffPct}% ${diffPct >= 0 ? '증가' : '감소'}했습니다.`; })()
      : `분석: ${D.mainPeriod} 총 집행금액은 ₩${pptFmt(D.yoy[D.mainPeriod])}입니다. 비교 가능한 이전 연도 데이터가 없습니다.`;
    analysisCard(slide, 8.5, 4.3, 4.35, trendTxt);
  }
  
  // ---- overviewSlide (품목구분/업체별 연도 추이) ----
  function overviewSlide(tag, title, names, yoyMap) {
    const slide = contentSlide();
    titleBlock(slide, tag, title);
    const palette = palette4(periods.length);
    const chartSeries = periods.map((p, i) => ({ name: p, labels: names, values: names.map((n) => yoyMap[n][i]) }));
    slide.addChart(pres.ChartType.bar, chartSeries, {
      x: 0.5, y: 1.15, w: 7.6, h: 5.15, barDir: 'col', barGrouping: 'clustered',
      chartColors: palette, showTitle: false, showValue: true,
      dataLabelFormatCode: '#,##0,,"억"', dataLabelPosition: 'outEnd', dataLabelFontSize: 7.5, dataLabelColor: TXT,
      catAxisLabelFontSize: 9.5, valAxisHidden: true,
      valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: true, legendPos: 'b', legendFontSize: 9,
    });
    const colW2 = [1.3, ...periods.map(() => 3.2 / periods.length)];
    const header = ['구분', ...periods].map((h, i) => ({ text: h, options: { bold: true, fill: { color: NAVY }, color: WHITE, align: i === 0 ? 'left' : 'right', fontSize: 8 } }));
    const rows = [header];
    names.forEach((n) => { rows.push([{ text: n, options: { align: 'left', fontSize: 8 } }, ...yoyMap[n].map((v) => ({ text: pptFmt(v), options: { align: 'right', fontSize: 8 } }))]); });
    slide.addTable(rows, { x: 8.3, y: 1.15, w: 4.5, colW: colW2, fontSize: 8, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: 0.34, margin: [2, 3, 2, 3] });
    const footnoteY = 1.15 + rows.length * 0.34 + 0.15;
    slide.addText('※ 연도별 집계 범위가 다를 수 있어 직접 비교보다는 추세 참고용으로 봐주세요. 0으로 표시된 구간은 해당 기간 신규 발주 기록이 없었던 경우입니다.',
                  { x: 8.3, y: footnoteY, w: 4.5, h: 1.0, fontFace: 'Calibri', fontSize: 8.5, italic: true, color: GRAY });
    slide.analysisY = footnoteY + 1.05;
    return slide;
  }
  
  {
    const slide = overviewSlide('2-1)', `주요 품목구분 연도별 총금액 (${site})`, D.cat_top_names, D.cat_yoy);
    const topPct = D.total_amount ? Math.round((D.cat_chart.slice(0, D.cat_top_names.length).reduce((s, d) => s + d[1], 0) / D.total_amount) * 100) : 0;
    analysisCard(slide, 8.3, slide.analysisY, 4.5,
                 `분석: 상위 ${D.cat_top_names.length}개 품목구분(${D.cat_top_names.join('·')})이 ${D.mainPeriod} 전체의 약 ${topPct}%를 차지. 연도별로도 꾸준히 지출 상위권을 유지하고 있다면 연간 계약/단가표 도입 검토 필요 (초안 — 담당자 확인 요망).`);
  }
  {
    const slide = overviewSlide('2-2)', `주요 업체 연도별 총금액 (${site})`, D.vend_top_names, D.vend_yoy);
    const topPct = D.total_amount ? Math.round((D.vend_chart.slice(0, D.vend_top_names.length).reduce((s, d) => s + d[1], 0) / D.total_amount) * 100) : 0;
    analysisCard(slide, 8.3, slide.analysisY, 4.5,
                 `분석: 총 ${D.total_vend_count}개 업체 중 상위 ${D.vend_top_names.length}개사가 ${D.mainPeriod} 전체의 약 ${topPct}%. 업체별로 연도에 따라 거래 규모 변동이 있다면 상위 업체 중심 연간 단가/납기 계약 체결 여지 검토 필요 (초안 — 담당자 확인 요망).`);
  }
  
  // ---- 매트릭스 (지출액 x 발주빈도) ----
  function matrixSlide(tag, title, axisXLabel, axisYLabel, axisXHint, axisYHint, data, quadMeta, fmtFn) {
    const slide = contentSlide();
    titleBlock(slide, tag, title);
    slide.addText('→ 데이터 기반 자동 배치(초안): X축은 실제 지출/단가 데이터, Y축은 ' + axisYLabel + ' 데이터를 대리 지표로 사용한 결과입니다. 실제 긴급성·관리우선순위 판단은 담당자 검토가 필요합니다.',
                  { x: 0.5, y: 1.0, w: 12.3, h: 0.38, fontFace: 'Calibri', fontSize: 10, italic: true, color: GRAY });
    const gridX = 0.5, gridY = 1.55, gridW = 12.3, gridH = 5.55, gap = 0.22;
    const cardW = (gridW - gap) / 2, cardH = (gridH - gap) / 2;
    const quads = [{ k: 'A', x: gridX, y: gridY }, { k: 'B', x: gridX + cardW + gap, y: gridY }, { k: 'C', x: gridX, y: gridY + cardH + gap }, { k: 'D', x: gridX + cardW + gap, y: gridY + cardH + gap }];
    quads.forEach((q) => {
      const meta = quadMeta[q.k];
      const items = data.filter((d) => d.quad === q.k);
      slide.addShape(pres.ShapeType.roundRect, { x: q.x, y: q.y, w: cardW, h: cardH, rectRadius: 0.06, fill: { color: ICE_L }, line: { color: ICE, width: 1 } });
      slide.addShape(pres.ShapeType.rect, { x: q.x, y: q.y, w: 0.08, h: cardH, fill: { color: NAVY }, line: { type: 'none' } });
      slide.addShape(pres.ShapeType.ellipse, { x: q.x + 0.22, y: q.y + 0.16, w: 0.36, h: 0.36, fill: { color: NAVY }, line: { type: 'none' } });
      slide.addText(q.k, { x: q.x + 0.22, y: q.y + 0.16, w: 0.36, h: 0.36, fontFace: 'Cambria', fontSize: 13, bold: true, color: WHITE, align: 'center', valign: 'middle' });
      slide.addText(meta.label, { x: q.x + 0.7, y: q.y + 0.16, w: cardW - 0.94, h: 0.36, fontFace: 'Calibri', fontSize: 11, bold: true, color: NAVY, valign: 'middle' });
      const stratH = 0.72;
      slide.addText(meta.strategy, { x: q.x + 0.22, y: q.y + 0.58, w: cardW - 0.44, h: stratH, fontFace: 'Calibri', fontSize: 8.5, color: TXT, lineSpacingMultiple: 1.12 });
      const dividerY = q.y + 0.58 + stratH + 0.06;
      slide.addShape(pres.ShapeType.line, { x: q.x + 0.22, y: dividerY, w: cardW - 0.44, h: 0, line: { color: ICE, width: 0.75 } });
      const listY = dividerY + 0.1;
      const listH = q.y + cardH - 0.1 - listY;
      const lineH = Math.min(0.32, listH / Math.max(items.length, 1));
      items.forEach((d, i) => {
        const iy = listY + i * lineH;
        slide.addShape(pres.ShapeType.ellipse, { x: q.x + 0.24, y: iy + lineH / 2 - 0.035, w: 0.07, h: 0.07, fill: { color: GOLD }, line: { type: 'none' } });
        slide.addText([{ text: d.name, options: { bold: true, color: NAVY } }, { text: `   ${fmtFn(d)}`, options: { color: GRAY } }],
                      { x: q.x + 0.4, y: iy, w: cardW - 0.6, h: lineH, fontFace: 'Calibri', fontSize: 9, valign: 'middle' });
      });
      if (items.length === 0) slide.addText('해당 없음', { x: q.x + 0.4, y: listY, w: cardW - 0.6, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: GRAY, italic: true });
    });
    slide.addText(`X축 지표: ${axisXLabel}${axisXHint ? ' (' + axisXHint + ')' : ''}`, { x: gridX, y: gridY + gridH + 0.12, w: gridW, h: 0.32, fontFace: 'Calibri', fontSize: 11.5, align: 'center', color: NAVY, bold: true });
    slide.addText(`Y축 지표: ${axisYLabel}${axisYHint ? ' (' + axisYHint + ')' : ''}`, { x: gridX, y: 1.18, w: gridW, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: NAVY, bold: true, align: 'right' });
  }
  const quadMeta1 = {
    A: { label: '지출액 ↑ · 발주빈도 ↑', strategy: '전략: 연간 계약·단가표 작성으로 구매 프로세스 간소화, 계획구매 강화(재고관리 → 사용계획 → 발주횟수/수량/단가 개선)' },
    B: { label: '지출액 ↑ · 발주빈도 ↓', strategy: '전략: 가격 적절성 검토 강화 — 스펙/대체품 검토 및 업체 경쟁 유도' },
    C: { label: '지출액 ↓ · 발주빈도 ↑', strategy: '전략: 사용계획 및 재고관리 강화 → 발주횟수 감소, 발주당 수량 증대' },
    D: { label: '지출액 ↓ · 발주빈도 ↓', strategy: '전략: 업무 효율 증가 방안 검토 (발주 횟수·관리 방식 등)' },
  };
  matrixSlide('3-1)', '구매전략 수립 예시 — 지출액 × 발주빈도', '총 지출액', '발주 빈도(건수)', `${D.mainPeriod} 공급가 합계`, `${D.mainPeriod} 발주 건수`, D.matrix1, quadMeta1, (d) => `${pptEok(d.금액)} · ${d.건수}건`);
  
  // ---- ABC 분석 ----
  {
    const slide = contentSlide();
    titleBlock(slide, '3-2)', '구매전략 수립 예시 ② — ABC 분석 (파레토)');
    slide.addText('→ 품목구분을 금액 누적 비중 기준으로 A(상위 70%) · B(70~90%) · C(90~100%) 등급으로 분류했습니다. 등급별로 관리 강도를 다르게 가져가는 것이 효율적입니다.',
                  { x: 0.5, y: 1.0, w: 12.3, h: 0.4, fontFace: 'Calibri', fontSize: 10, italic: true, color: GRAY });
    const gradeMeta = { A: { color: NAVY, desc: '핵심 관리 대상 — 개별 협상, 연간 계약, 정기 시장가 모니터링' }, B: { color: '3E5C9A', desc: '표준 프로세스 — 분기 단위 가격 점검, 복수 견적 유지' }, C: { color: ICE, desc: '간소화 대상 — 자동발주/카드결제 등 관리 비용 최소화' } };
    let cardX = 0.5;
    const cardW3 = 3.95, cardGap = 0.22;
    ['A', 'B', 'C'].forEach((g) => {
      const s = D.abc_summary[g];
      slide.addShape(pres.ShapeType.roundRect, { x: cardX, y: 1.55, w: cardW3, h: 1.5, rectRadius: 0.06, fill: { color: ICE_L }, line: { color: ICE, width: 1 } });
      slide.addShape(pres.ShapeType.rect, { x: cardX, y: 1.55, w: 0.08, h: 1.5, fill: { color: gradeMeta[g].color === ICE ? GOLD : gradeMeta[g].color }, line: { type: 'none' } });
      slide.addText(`${g} 등급`, { x: cardX + 0.22, y: 1.65, w: cardW3 - 0.4, h: 0.35, fontFace: 'Cambria', fontSize: 15, bold: true, color: NAVY });
      slide.addText(`${s.count}개 품목구분 · ${s.pct_of_all}%`, { x: cardX + 0.22, y: 2.0, w: cardW3 - 0.4, h: 0.3, fontFace: 'Calibri', fontSize: 11, bold: true, color: GRAY });
      slide.addText(`${pptFmt(s.total)}원`, { x: cardX + 0.22, y: 2.28, w: cardW3 - 0.4, h: 0.3, fontFace: 'Calibri', fontSize: 11, color: TXT });
      slide.addText(gradeMeta[g].desc, { x: cardX + 0.22, y: 2.58, w: cardW3 - 0.4, h: 0.45, fontFace: 'Calibri', fontSize: 8, color: GRAY, lineSpacingMultiple: 1.1 });
      cardX += cardW3 + cardGap;
    });
    const gradeCols = [{ g: 'A', x: 0.5, label: 'A등급 품목구분 (전체)' }, { g: 'B', x: 4.55, label: 'B등급 품목구분 (상위 5개)' }, { g: 'C', x: 8.6, label: 'C등급 품목구분 (상위 5개)' }];
    gradeCols.forEach((gc) => {
      slide.addText(gc.label, { x: gc.x, y: 3.3, w: 3.85, h: 0.28, fontFace: 'Calibri', fontSize: 10.5, bold: true, color: NAVY });
      const gRows = [[{ text: '품목구분', options: { bold: true, fill: { color: NAVY }, color: WHITE, fontSize: 8.5 } }, { text: '금액', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right', fontSize: 8.5 } }, { text: '누적%', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right', fontSize: 8.5 } }]];
      D.abc_items[gc.g].slice(0, 5).forEach((x) => { gRows.push([{ text: x.name, options: { align: 'left' } }, { text: pptFmt(x.금액), options: { align: 'right' } }, { text: `${x.pct}%`, options: { align: 'right', color: GRAY } }]); });
      slide.addTable(gRows, { x: gc.x, y: 3.62, w: 3.85, colW: [1.85, 1.3, 0.7], fontSize: 8.5, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: 0.3 });
      if (D.abc_items[gc.g].length > 5) slide.addText(`외 ${D.abc_items[gc.g].length - 5}개 품목구분`, { x: gc.x, y: 3.62 + gRows.length * 0.3 + 0.06, w: 3.85, h: 0.25, fontFace: 'Calibri', fontSize: 8, italic: true, color: GRAY });
    });
    analysisCard(slide, 0.5, 5.85, 12.3,
                 `분석: 상위 ${D.abc_summary.A.count}개 품목구분(A등급)이 전체 지출의 ${D.abc_summary.A.pct_of_all}%를 차지합니다. 이 품목들에 구매 담당자의 협상·모니터링 역량을 집중하고, C등급(${D.abc_summary.C.count}개, ${D.abc_summary.C.pct_of_all}%)은 발주 프로세스를 간소화해 행정 부담을 줄이는 것을 권장합니다 (초안 — 담당자 확인 요망).`);
  }
  
  // ---- 정기계약 전환 후보 ----
  {
    const slide = contentSlide();
    titleBlock(slide, '3-3)', '구매전략 수립 예시 ③ — 정기계약 전환 후보');
    slide.addText(`→ ${D.mainPeriod} 발주 건수가 많은(5건 이상) 업체입니다. 반복 발주가 잦은 업체는 건별 협상 대신 연간 단가계약(블랭킷 오더)으로 전환하면 행정 비용을 줄이고 단가도 안정시킬 수 있습니다.`,
                  { x: 0.5, y: 1.0, w: 12.3, h: 0.55, fontFace: 'Calibri', fontSize: 10.5, italic: true, color: GRAY });
    const rows = [[{ text: '업체명', options: { bold: true, fill: { color: NAVY }, color: WHITE } }, { text: '주요 품목구분', options: { bold: true, fill: { color: NAVY }, color: WHITE } }, { text: `${D.mainPeriod} 발주건수`, options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }, { text: `${D.mainPeriod} 금액`, options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }]];
    if (D.blanket_candidates.length === 0) {
      rows.push([{ text: '해당 없음 (5건 이상 발주 업체 없음)', options: { align: 'left', color: GRAY } }, { text: '' }, { text: '' }, { text: '' }]);
    } else {
      D.blanket_candidates.forEach((b) => { rows.push([{ text: b.name, options: { align: 'left', bold: true } }, { text: b.주요품목, options: { align: 'left', color: GRAY } }, { text: `${b.건수}건`, options: { align: 'right' } }, { text: pptFmt(b.금액), options: { align: 'right' } }]); });
    }
    slide.addTable(rows, { x: 0.5, y: 1.75, w: 9.2, colW: [2.1, 2.3, 1.8, 2.0], fontSize: 10, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: 0.42 });
    analysisCard(slide, 9.9, 1.75, 2.9,
                 '전략: 발주 건수가 많을수록 건당 행정 비용(품의·검수·정산)이 누적됩니다. 상위 업체부터 연간 단가계약을 맺어 발주는 자동화하고, 담당자는 예외 상황 관리에 집중하는 방향을 권장합니다 (초안 — 담당자 확인 요망).');
  }
  
  // ---- 품목구분별 집행금액 (월별 세부) ----
  function monthlyDetailSlide(tag, title, label, monthlyMap, monthlyTotalArr) {
    const slide = contentSlide();
    titleBlock(slide, tag, title);
    const months = D.month_cols;
    const labelW = 2.3, totalW = 1.5;
    const perMonthW = months.length ? (12.3 - labelW - totalW) / months.length : 0;
    const colW = [labelW, ...months.map(() => perMonthW), totalW];
    const header = ['구분', ...months, '총합계'].map((h) => ({ text: h, options: { bold: true, fill: { color: NAVY }, color: WHITE, align: h === '구분' ? 'left' : 'right', fontSize: months.length > 8 ? 7.5 : 9 } }));
    const rows = [header];
    rows.push([{ text: '총합계', options: { bold: true, align: 'left' } }, ...monthlyTotalArr.map((v) => ({ text: pptFmt(v), options: { bold: true, align: 'right' } })), { text: pptFmt(D.total_amount), options: { bold: true, align: 'right' } }]);
    Object.keys(monthlyMap).forEach((key) => {
      const vals = monthlyMap[key];
      const sum = vals.reduce((a, b) => a + b, 0);
      rows.push([{ text: key, options: { align: 'left', bold: key === '그 외' } }, ...vals.map((v) => ({ text: v ? pptFmt(v) : '', options: { align: 'right' } })), { text: pptFmt(sum), options: { align: 'right' } }]);
    });
    slide.addTable(rows, { x: 0.5, y: 1.15, w: 12.3, colW, fontSize: months.length > 8 ? 7.5 : 8.5, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: 0.29 });
    if (D.month_cols.some((m) => m.startsWith('기타'))) {
      slide.addText(`※ '기타'는 ${D.mainPeriod} 조회 기간 범위 밖 발주일자 건입니다.`, { x: 0.5, y: 1.15 + rows.length * 0.29 + 0.08, w: 6, h: 0.25, fontFace: 'Calibri', fontSize: 8, italic: true, color: GRAY });
    }
  }
  monthlyDetailSlide('4-1)', '품목구분별 집행 금액 (월별 세부)', '구분', D.monthly_cat, D.monthly_cat_total);
  
  // ---- 품목구분별 상세 (top N) ----
  D.cat_top_names.forEach((cat, i) => {
    const slide = contentSlide();
    titleBlock(slide, `4-${i + 2})`, `품목구분별 집행 금액 (${cat})`);
    const info = D.cat_items[cat];
    const rows = [[{ text: '품목', options: { bold: true, fill: { color: NAVY }, color: WHITE } }, { text: '수량', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }, { text: '단가', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }, { text: '금액', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }]];
    rows.push([{ text: '총합계', options: { bold: true } }, { text: '' }, { text: '' }, { text: pptFmt(info.total), options: { bold: true, align: 'right' } }]);
    info.items.forEach((it) => { rows.push([{ text: it[0], options: { align: 'left' } }, { text: it[1] !== null ? pptFmt(it[1]) : '', options: { align: 'right' } }, { text: it[2] !== null ? pptFmt(it[2]) : '', options: { align: 'right' } }, { text: pptFmt(it[3]), options: { align: 'right' } }]); });
    const catRowH = Math.min(0.3, 5.7 / rows.length);
    slide.addTable(rows, { x: 0.5, y: 1.05, w: 7.3, colW: [3.6, 1.2, 1.2, 1.3], fontSize: rows.length > 15 ? 8.5 : 9.5, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: catRowH });
    const yoyVals = D.cat_yoy[cat].map((v) => Math.round((v / 1e8) * 100) / 100);
    slide.addChart(pres.ChartType.bar, [{ name: cat, labels: D.periods, values: yoyVals }], { x: 8.1, y: 1.05, w: 4.7, h: 2.55, barDir: 'col', chartColors: periods.map((p, pi) => (pi === mainIdx ? GOLD : NAVY)), showTitle: true, title: `${cat} 연도별 추이 (억원)`, titleFontSize: 10, showValue: true, dataLabelFormatCode: '0.0', dataLabelFontSize: 8.5, dataLabelColor: NAVY, catAxisLabelFontSize: 8.5, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false });
    const mixColors = D.cat_chart.map((d) => (d[0] === cat ? GOLD : ICE));
    slide.addChart(pres.ChartType.bar, [{ name: '금액', labels: D.cat_chart.map((d) => d[0]), values: D.cat_chart.map((d) => Math.round((d[1] / 1e8) * 10) / 10) }], { x: 8.1, y: 3.75, w: 4.7, h: 3.0, barDir: 'bar', chartColors: mixColors, showTitle: true, title: `품목구분별 집행금액 (${D.mainPeriod} 전체 — 이 슬라이드: ${cat})`, titleFontSize: 9, showValue: false, catAxisLabelFontSize: 8, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false });
  });
  
  // ---- 업체별 집행금액 (월별 세부) ----
  {
    const vendMonthlyTotal = D.month_cols.map((_, mi) => Object.values(D.monthly_vend).reduce((s, arr) => s + arr[mi], 0));
    monthlyDetailSlide(`5-1)`, '업체별 집행 금액 (월별 세부)', '업체명', D.monthly_vend, vendMonthlyTotal);
  }
  
  // ---- 업체별 상세 (top N) ----
  D.vend_top_names.forEach((v, i) => {
    const slide = contentSlide();
    titleBlock(slide, `5-${i + 2})`, `업체별 집행 금액 (${v})`);
    const info = D.vend_items[v];
    slide.addText(`주요 품목구분: ${info.main_cat}`, { x: 0.5, y: 0.98, w: 7, h: 0.28, fontFace: 'Calibri', fontSize: 10, color: GRAY });
    const rows = [[{ text: '품목', options: { bold: true, fill: { color: NAVY }, color: WHITE } }, { text: '수량', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }, { text: '단가', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }, { text: '금액', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }]];
    rows.push([{ text: '총합계', options: { bold: true } }, { text: '' }, { text: '' }, { text: pptFmt(info.total), options: { bold: true, align: 'right' } }]);
    info.items.forEach((it) => { rows.push([{ text: it[0], options: { align: 'left' } }, { text: it[1] !== null ? pptFmt(it[1]) : '', options: { align: 'right' } }, { text: it[2] !== null ? pptFmt(it[2]) : '', options: { align: 'right' } }, { text: pptFmt(it[3]), options: { align: 'right' } }]); });
    const vendRowH = Math.min(0.3, 5.4 / rows.length);
    slide.addTable(rows, { x: 0.5, y: 1.35, w: 7.3, colW: [3.6, 1.2, 1.2, 1.3], fontSize: rows.length > 15 ? 8.5 : 9.5, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: vendRowH });
    const yoyVals = D.vend_yoy[v].map((x) => Math.round((x / 1e8) * 100) / 100);
    slide.addChart(pres.ChartType.bar, [{ name: v, labels: D.periods, values: yoyVals }], { x: 8.1, y: 1.05, w: 4.7, h: 2.55, barDir: 'col', chartColors: periods.map((p, pi) => (pi === mainIdx ? GOLD : NAVY)), showTitle: true, title: `${v} 연도별 추이 (억원)`, titleFontSize: 10, showValue: true, dataLabelFormatCode: '0.0', dataLabelFontSize: 8.5, dataLabelColor: NAVY, catAxisLabelFontSize: 8.5, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false });
    const mixColorsV = D.vend_chart.map((d) => (d[0] === v ? GOLD : ICE));
    slide.addChart(pres.ChartType.bar, [{ name: '금액', labels: D.vend_chart.map((d) => d[0]), values: D.vend_chart.map((d) => Math.round((d[1] / 1e8) * 10) / 10) }], { x: 8.1, y: 3.75, w: 4.7, h: 3.0, barDir: 'bar', chartColors: mixColorsV, showTitle: true, title: `업체별 집행금액 (${D.mainPeriod} 전체 — 이 슬라이드: ${v})`, titleFontSize: 9, showValue: false, catAxisLabelFontSize: 8, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false });
  });
  
  // ---- 계절성 ----
  {
    const slide = contentSlide();
    titleBlock(slide, '6-1)', '추가 분석 — 월별 발주 패턴 (계절성)');
    slide.addText(`→ ${D.mainPeriod} 기준 월별 총 집행금액입니다. 특정 월에 지출이 몰리는 패턴을 미리 파악해두면 예산·현금흐름 계획에 반영할 수 있습니다.`,
                  { x: 0.5, y: 1.0, w: 12.3, h: 0.4, fontFace: 'Calibri', fontSize: 10.5, italic: true, color: GRAY });
    const seasonScaled = D.seasonality.values.map((v) => Math.round((v / 1e8) * 100) / 100);
    slide.addChart(pres.ChartType.bar, [{ name: '금액', labels: D.seasonality.labels, values: seasonScaled }], {
      x: 0.5, y: 1.5, w: 7.6, h: 4.9, barDir: 'col',
      chartColors: D.seasonality.labels.map((l) => (l === D.seasonality.peak_month ? GOLD : NAVY)),
      showTitle: true, title: '월별 총 집행금액 (억원)', titleFontSize: 12,
      showValue: true, dataLabelFormatCode: '0.0', dataLabelFontSize: 10, dataLabelColor: NAVY, dataLabelBold: true,
      catAxisLabelFontSize: 10, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false,
    });
    slide.addShape(pres.ShapeType.roundRect, { x: 8.3, y: 1.5, w: 4.5, h: 1.5, rectRadius: 0.06, fill: { color: ICE_L }, line: { type: 'none' } });
    slide.addShape(pres.ShapeType.rect, { x: 8.3, y: 1.5, w: 0.08, h: 1.5, fill: { color: GOLD }, line: { type: 'none' } });
    slide.addText('최다 지출월', { x: 8.52, y: 1.62, w: 4.0, h: 0.3, fontFace: 'Calibri', fontSize: 10, color: GRAY });
    slide.addText(D.seasonality.peak_month, { x: 8.52, y: 1.9, w: 4.0, h: 0.4, fontFace: 'Cambria', fontSize: 20, bold: true, color: NAVY });
    slide.addText(`${pptFmt(D.seasonality.peak_amt)}원`, { x: 8.52, y: 2.35, w: 4.0, h: 0.3, fontFace: 'Calibri', fontSize: 11, color: TXT });
    slide.addText('주요 품목: ' + (D.seasonality.peak_drivers.map((d) => `${d.name}(${pptEok(d.금액)})`).join(', ') || '-'), { x: 8.52, y: 2.65, w: 4.0, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: GRAY });
    analysisCard(slide, 8.3, 3.2, 4.5,
                 `분석: ${D.seasonality.peak_month}에 지출이 집중되는 경향이 있어, 해당 시기 예산을 미리 확보하고 주요 품목(${D.seasonality.peak_drivers.map((d) => d.name).join('·') || '해당 월 주요 품목'} 등)의 발주를 앞당겨 검토하는 것을 권장합니다 (초안 — 담당자 확인 요망).`);
  }
  
  // ---- 신규/이탈 거래업체 ----
  {
    const slide = contentSlide();
    titleBlock(slide, '6-2)', '추가 분석 — 연도별 신규·이탈 거래업체');
    const prevRangeLabel = periods.slice(0, mainIdx).join('~') || '이전 연도';
    slide.addText(`→ 신규: ${D.mainPeriod}에 처음 등장한 업체. 이탈: ${prevRangeLabel}엔 거래했으나 ${D.mainPeriod}엔 거래 기록이 없는 업체(상위 금액 기준)입니다.`,
                  { x: 0.5, y: 1.0, w: 12.3, h: 0.4, fontFace: 'Calibri', fontSize: 10.5, italic: true, color: GRAY });
    slide.addText(`신규 거래업체 (총 ${D.new_vendor_count}곳 중 상위)`, { x: 0.5, y: 1.5, w: 6, h: 0.3, fontFace: 'Calibri', fontSize: 11, bold: true, color: NAVY });
    const newRows = [[{ text: '업체명', options: { bold: true, fill: { color: NAVY }, color: WHITE } }, { text: `${D.mainPeriod} 금액`, options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }]];
    D.new_vendors.forEach((v) => newRows.push([{ text: v.name, options: { align: 'left' } }, { text: pptFmt(v.금액), options: { align: 'right' } }]));
    if (D.new_vendors.length === 0) newRows.push([{ text: '해당 없음', options: { align: 'left', color: GRAY } }, { text: '' }]);
    slide.addTable(newRows, { x: 0.5, y: 1.82, w: 5.9, colW: [3.5, 2.4], fontSize: 9, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: 0.32 });
    slide.addText(`이탈 거래업체 (총 ${D.churned_vendor_count}곳 중 상위, ${prevRangeLabel} 거래액)`, { x: 6.7, y: 1.5, w: 6, h: 0.3, fontFace: 'Calibri', fontSize: 11, bold: true, color: NAVY });
    const churnRows = [[{ text: '업체명', options: { bold: true, fill: { color: NAVY }, color: WHITE } }, { text: '과거 거래액', options: { bold: true, fill: { color: NAVY }, color: WHITE, align: 'right' } }]];
    D.churned_vendors.forEach((v) => churnRows.push([{ text: v.name, options: { align: 'left' } }, { text: pptFmt(v.금액), options: { align: 'right' } }]));
    if (D.churned_vendors.length === 0) churnRows.push([{ text: '해당 없음', options: { align: 'left', color: GRAY } }, { text: '' }]);
    slide.addTable(churnRows, { x: 6.7, y: 1.82, w: 5.9, colW: [3.5, 2.4], fontSize: 9, fontFace: 'Calibri', border: { type: 'solid', color: ICE_L, pt: 0.75 }, autoPage: false, rowH: 0.32 });
    analysisCard(slide, 0.5, 5.65, 12.3,
                 '분석: 이탈 업체 중 금액 규모가 컸던 곳은 거래 중단 사유(가격/품질/계약 종료 등)를 확인해둘 필요가 있습니다. 신규 업체는 아직 거래 이력이 짧으므로 품질·납기 검증을 병행하는 것을 권장합니다 (초안 — 담당자 확인 요망).');
  }
  
  return pres.write({ outputType: 'nodebuffer' });
}

// ---- 구매 실적 보고서(PPTX) 자동 다운로드 ----
router.get('/admin/purchase-data/performance-report', async (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '';
  const toDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : '';
  const site = ['포천', '창녕'].includes(req.query.site) ? req.query.site : '포천';
  const period = /^\d{4}$/.test(req.query.period || '') ? req.query.period : '';
  try {
    const combinedRows = await getCombinedPurchaseDataRows({ fromDate, toDate });
    const D = buildPurchaseReportData({ rows: combinedRows, site, mainPeriod: period });
    if (!D) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(layout({
        title: '구매 실적 보고서',
        body: `<div class="card"><h2>보고서를 만들 수 없습니다</h2><p class="hint">선택한 기간(${escapeHtml(fromDate || '전체')}~${escapeHtml(toDate || '전체')}) 안에 "${escapeHtml(site)}" 사업장 구매 데이터가 없습니다. 기간이나 사업장을 다시 확인해 주세요.</p><p><a class="btn secondary" href="/admin/purchase-data">← 구매Data로 돌아가기</a></p></div>`,
        user: u, active: 'purchase-data',
      }));
      return;
    }
    const buf = await buildPurchasePerformancePptxBuffer(D);
    const fname = encodeURIComponent(`구매실적보고서_${site}_${D.mainPeriod}.pptx`);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="report.pptx"; filename*=UTF-8''${fname}`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  } catch (err) {
    console.error('performance-report error', err);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(layout({ title: '오류', body: `<div class="card"><h2>보고서 생성 중 오류가 발생했습니다</h2><p class="hint">${escapeHtml(String(err && err.message || err))}</p></div>`, user: u, active: 'purchase-data' }));
  }
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

// 기간(from~to)으로 필터링한 구매Data 행을 만든다 — 견적시스템에서 선정 완료된 건 + 관리자가 수동으로
// 등록한 건을 합쳐서 PURCHASE_DATA_COLS 순서의 2차원 배열로 반환한다. 다운로드용(단일 시트)과
// 구매실적보고서 원본데이터용(연도별 시트)이 이 함수를 공유해서 쓴다.
async function getCombinedPurchaseDataRows({ fromDate, toDate }) {
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
  // 품의번호/제목은 견적요청 완료 처리 화면에서 입력한 기안번호/기안제목을 사용한다(없으면 제목은 견적요청 제목으로 대체).
  // 입고일은 완료 처리에서 입력한 실제 입고일자를 우선 사용하고, 아직 완료 처리 전이면 업체가 제출한 납기일자로 대체한다.
  // 대금지급일/지급처도 완료 처리에서 입력한 값을 사용한다. 완료 처리 전이면 계속 빈 칸일 수 있다.
  // 견적 시스템에 아직 없는 항목(담당자/요청부서/대금지급)은 빈 칸으로 둔다.
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
  
  // 견적 시스템을 거치지 않고 관리자가 엑셀로 수동 등록한 구매건도 같은 기간 필터로 합산한다.
  const manualConditions = [];
  const manualArgs = [];
  if (fromDate) { manualConditions.push("order_date <> '' AND date(order_date) >= date(?)"); manualArgs.push(fromDate); }
  if (toDate) { manualConditions.push("order_date <> '' AND date(order_date) <= date(?)"); manualArgs.push(toDate); }
  const manualWhere = manualConditions.length ? `WHERE ${manualConditions.join(' AND ')}` : '';
  const manualRecords = await db.prepare(`SELECT * FROM manual_purchase_records ${manualWhere} ORDER BY id DESC`).all(...manualArgs);
  const manualDataRows = manualRecords.map((m) => [
    m.manager, m.year, m.site, m.dept, m.category1, m.category2, m.category3, m.draft_no, m.title, m.vendor_name,
    m.order_date, m.received_date, m.item_type, m.item_name, m.spec, m.order_qty, m.unit_price, m.supply_price,
    m.received_qty, m.pack_unit, m.payment_date, m.payment_amount, m.payment_recipient, m.note,
    ]);
  
  return [...dataRows, ...manualDataRows];
}

// ---- 전체 견적요청의 선정 결과(품목·업체·단가 등)를 한 엑셀로 통합 다운로드 ----
router.get('/admin/quote-requests/export-results', async (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  // 기간 필터 기준: 발주일(현재는 최종선정일시 fs.selected_at을 발주일 대용으로 씀).
  // 필요하면 나중에 실제 발주일 필드가 생기는 시점에 이 기준 컬럼만 바꾸면 된다.
  const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '';
  const toDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : '';
  const combinedRows = await getCombinedPurchaseDataRows({ fromDate, toDate });
  const rangeLabel = (fromDate || toDate) ? `${fromDate || '처음'}~${toDate || '오늘'}` : `전체_${new Date().toISOString().slice(0, 10)}`;
  sendXlsxTemplate(res, `구매Data_${rangeLabel}.xlsx`, ['구매Data'], [[], PURCHASE_DATA_COLS, ...combinedRows]);
});

// ---- 힐마루 구매 실적 보고서(hillmaru-purchase-performance-report 스킬) 원본데이터용 다운로드 ----
// 스킬은 "워크북 하나, 연도별로 시트 하나씩, 헤더는 3행"이라는 형식을 기대한다(SKILL.md 기준).
// 여기서는 지정한 기간의 구매Data를 발주일 기준 연도별로 나눠 시트를 만들어준다.
// 실제 슬라이드(PPTX) 생성은 이 파일을 다시 Claude/Cowork에 올려서 스킬로 진행한다(자동 생성 아님).
router.get('/admin/purchase-data/report-export', async (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '';
  const toDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : '';
  const combinedRows = await getCombinedPurchaseDataRows({ fromDate, toDate });
  
  const byYear = new Map();
  for (const row of combinedRows) {
    const year = (row[1] || '').toString().trim() || '연도미기재';
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(row);
  }
  const years = Array.from(byYear.keys()).sort();
  const sheets = years.map((year) => {
    const yearRows = byYear.get(year).slice().sort((a, b) => String(a[10] || '').localeCompare(String(b[10] || '')));
    return {
      name: year,
      rows: [[`구매Data ${year}`], [], PURCHASE_DATA_COLS, ...yearRows],
    };
  });
  if (sheets.length === 0) {
    sheets.push({ name: '구매Data', rows: [['구매Data'], [], PURCHASE_DATA_COLS] });
  }
  const rangeLabel = (fromDate || toDate) ? `${fromDate || '처음'}~${toDate || '오늘'}` : `전체_${new Date().toISOString().slice(0, 10)}`;
  sendMultiSheetXlsx(res, `구매실적보고서_원본데이터_${rangeLabel}.xlsx`, sheets);
});

// ---------- 관리자: 구매Data 수동입력 (견적시스템을 거치지 않은 구매건) ----------
router.get('/admin/purchase-data', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const records = await db.prepare('SELECT * FROM manual_purchase_records ORDER BY id DESC').all();
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.adminPurchaseDataPage({ user: u, records }));
});

router.get('/admin/purchase-data/template', (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
sendXlsxTemplate(res, '구매Data_수동입력_양식.xlsx', PURCHASE_DATA_COLS,
[['이관현 과장', '2026', '포천', '경기팀', '농자재', '', '', 'D-2026-001', '예시) 잔디용 비료 구매', '예시업체(주)', '2026-08-01', '2026-08-10', '요청품', '유기질 비료', '20kg', 10, 55000, 550000, 10, '포대', '2026-08-15', 550000, '포천', '견적시스템 미사용 건 예시']]
);
});

router.post('/admin/purchase-data/import', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
await parseBody(req);
const files = req.files || {};
if (!files.purchase_excel || !files.purchase_excel.data) return redirect(res, '/admin/purchase-data');
let rows;
try {
rows = readXlsxFirstSheet(files.purchase_excel.data);
} catch (e) {
console.error('[엑셀] 구매Data 수동입력 파싱 실패:', e.message);
return redirect(res, '/admin/purchase-data');
}
const insertRecord = db.prepare(`
INSERT INTO manual_purchase_records
(manager, year, site, dept, category1, category2, category3, draft_no, title, vendor_name, order_date, received_date, item_type, item_name, spec, order_qty, unit_price, supply_price, received_qty, pack_unit, payment_date, payment_amount, payment_recipient, note, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
let created = 0;
for (let i = 1; i < rows.length; i++) {
const r = rows[i];
if (xlsxRowIsEmpty(r)) continue;
const [manager, year, site, dept, category1, category2, category3, draftNo, title, vendorName, orderDateRaw, receivedDateRaw, itemType, itemName, spec, orderQty, unitPrice, supplyPrice, receivedQty, packUnit, paymentDateRaw, paymentAmount, paymentRecipient, note] = r;
if (!itemName && !title) continue;
const orderDate = excelSerialToDateStr(orderDateRaw);
const receivedDate = excelSerialToDateStr(receivedDateRaw);
const paymentDate = excelSerialToDateStr(paymentDateRaw);
await insertRecord.run(
manager || '', year || '', site || '', dept || '', category1 || '', category2 || '', category3 || '',
draftNo || '', title || '', vendorName || '', orderDate, receivedDate, itemType || '', itemName || '', spec || '',
orderQty ?? '', unitPrice ?? '', supplyPrice ?? '', receivedQty ?? '', packUnit || '', paymentDate, paymentAmount ?? '',
paymentRecipient || '', note || '', new Date().toISOString(),
);
created++;
}
console.log(`[엑셀] 구매Data 수동입력: 생성 ${created}건`);
redirect(res, '/admin/purchase-data');
});

router.post('/admin/purchase-data/:id/delete', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
await db.prepare('DELETE FROM manual_purchase_records WHERE id = ?').run(id);
redirect(res, '/admin/purchase-data');
});

// ---------- 관리자: 관리자 계정 관리 (여러 관리자 계정 운영) ----------
router.get('/admin/admins', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const admins = await db.prepare('SELECT id, login_id, display_name FROM admins ORDER BY id').all();
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.end(views.adminAdminsPage({ user: u, admins }));
});

router.post('/admin/admins', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const body = await parseBody(req);
const loginId = (body.login_id || '').trim();
const displayName = (body.display_name || '').trim();
const password = body.password || '';
if (!loginId || !displayName || !password) return redirect(res, '/admin/admins');
const existing = await db.prepare('SELECT id FROM admins WHERE login_id = ?').get(loginId);
if (existing) {
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
const admins = await db.prepare('SELECT id, login_id, display_name FROM admins ORDER BY id').all();
return res.end(views.adminAdminsPage({ user: u, admins, flash: { type: 'error', message: `이미 사용 중인 아이디입니다: ${loginId}` } }));
}
await db.prepare('INSERT INTO admins (login_id, password_hash, display_name) VALUES (?, ?, ?)')
.run(loginId, auth.hashPassword(password), displayName);
console.log(`[관리자 계정] 새 관리자 계정 생성: ${loginId} (${displayName}), 생성자: ${u.displayName}`);
redirect(res, '/admin/admins');
});

router.post('/admin/admins/:id/delete', async (req, res) => {
const u = requireLogin('admin')(req, res);
if (!u) return;
const id = Number(req.params.id);
if (id === u.userId) return redirect(res, '/admin/admins');
const count = (await db.prepare('SELECT COUNT(*) AS c FROM admins').get()).c;
if (count <= 1) return redirect(res, '/admin/admins');
await db.prepare('DELETE FROM admins WHERE id = ?').run(id);
redirect(res, '/admin/admins');
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
