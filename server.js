'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');
const { URL } = require('url');
const { DatabaseSync } = require('node:sqlite');

// ===== embedded CSS =====
const STYLE_CSS = "* { box-sizing: border-box; }\nbody {\n  margin: 0;\n  font-family: -apple-system, \"Apple SD Gothic Neo\", \"Malgun Gothic\", \"Segoe UI\", sans-serif;\n  background: #f4f6f8;\n  color: #1f2937;\n  line-height: 1.5;\n}\na { color: #2563eb; text-decoration: none; }\na:hover { text-decoration: underline; }\n\n.topbar {\n  background: #111827;\n  color: #fff;\n}\n.topbar-inner {\n  max-width: 1100px;\n  margin: 0 auto;\n  padding: 14px 20px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.brand { color: #fff; font-weight: 700; font-size: 18px; }\n.topbar nav a { color: #d1d5db; margin-left: 14px; }\n.topbar nav a:hover { color: #fff; }\n.who { color: #9ca3af; font-size: 14px; }\n\n.container {\n  max-width: 1100px;\n  margin: 0 auto;\n  padding: 28px 20px 60px;\n}\n\n.footer {\n  text-align: center;\n  color: #9ca3af;\n  font-size: 13px;\n  padding: 20px;\n}\n\nh1 { font-size: 22px; margin: 0 0 18px; }\nh2 { font-size: 18px; margin: 28px 0 12px; }\nh3 { font-size: 15px; margin: 18px 0 8px; }\n\n.flash { padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 14px; }\n.flash.info { background: #dbeafe; color: #1e40af; }\n.flash.error { background: #fee2e2; color: #991b1b; }\n.flash.success { background: #dcfce7; color: #166534; }\n\n.card {\n  background: #fff;\n  border: 1px solid #e5e7eb;\n  border-radius: 10px;\n  padding: 20px;\n  margin-bottom: 18px;\n}\n\n.card-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 16px;\n}\n\n.qr-card { display: block; color: inherit; }\n.qr-card:hover { text-decoration: none; border-color: #93c5fd; }\n.qr-title { font-weight: 700; font-size: 15px; margin-bottom: 6px; }\n.qr-status { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 999px; margin-bottom: 10px; }\n.qr-status.selecting { background: #fef3c7; color: #92400e; }\n.qr-status.completed { background: #dcfce7; color: #166534; }\n.qr-status.open { background: #e0e7ff; color: #3730a3; }\n.qr-meta { font-size: 13px; color: #6b7280; margin: 2px 0; }\n.qr-total { margin-top: 10px; font-size: 15px; font-weight: 700; color: #111827; }\n.qr-progress-bar { height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin: 8px 0; }\n.qr-progress-fill { height: 100%; background: #2563eb; }\n\ntable { width: 100%; border-collapse: collapse; font-size: 14px; }\nth, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }\nth { background: #f9fafb; font-weight: 600; color: #374151; }\ntr.row-substitute { background: #fffbeb; }\ntr.row-lowest { outline: 2px solid #2563eb; outline-offset: -2px; }\ntr.row-selected { background: #ecfdf5; }\n.badge { display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 999px; font-weight: 600; }\n.badge.requested { background: #e0e7ff; color: #3730a3; }\n.badge.substitute { background: #fef3c7; color: #92400e; }\n.badge.lowest { background: #2563eb; color: #fff; margin-left: 6px; }\n.badge.selected { background: #059669; color: #fff; }\n\nform.inline { display: inline; }\nlabel { display: block; font-size: 13px; color: #4b5563; margin: 10px 0 4px; }\ninput[type=text], input[type=email], input[type=number], input[type=date], input[type=password], select, textarea {\n  width: 100%;\n  padding: 8px 10px;\n  border: 1px solid #d1d5db;\n  border-radius: 6px;\n  font-size: 14px;\n  font-family: inherit;\n}\ntextarea { resize: vertical; }\n.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 12px; }\nfieldset { border: 1px solid #e5e7eb; border-radius: 8px; margin: 14px 0; padding: 14px; }\nlegend { font-weight: 700; font-size: 13px; padding: 0 6px; color: #374151; }\n\nbutton, .btn {\n  display: inline-block;\n  background: #2563eb;\n  color: #fff;\n  border: none;\n  padding: 8px 14px;\n  border-radius: 6px;\n  font-size: 14px;\n  cursor: pointer;\n  text-decoration: none;\n}\nbutton:hover, .btn:hover { background: #1d4ed8; text-decoration: none; }\n.btn.secondary { background: #6b7280; }\n.btn.secondary:hover { background: #4b5563; }\n.btn.small { padding: 4px 10px; font-size: 12px; }\n.btn.danger { background: #dc2626; }\n.btn.danger:hover { background: #b91c1c; }\n.btn.ghost { background: transparent; border: 1px solid #d1d5db; color: #374151; }\n.btn.ghost:hover { background: #f3f4f6; }\n\n.category-block { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; background: #fafafa; }\n.category-title { font-weight: 700; margin-bottom: 8px; }\n.vendor-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 14px; }\n.vendor-row .vname { flex: 1; }\n.bulk-btns { margin-bottom: 8px; }\n.bulk-btns button { margin-right: 6px; }\n\n.login-wrap { max-width: 380px; margin: 60px auto; }\n.login-tabs { display: flex; gap: 8px; margin-bottom: 16px; }\n.login-tabs a { flex: 1; text-align: center; padding: 10px; border-radius: 8px; background: #e5e7eb; color: #374151; font-weight: 600; }\n.login-tabs a.active { background: #2563eb; color: #fff; }\n\n.total-box { background: #111827; color: #fff; padding: 16px 20px; border-radius: 10px; margin-top: 16px; }\n.total-box .label { font-size: 13px; color: #9ca3af; }\n.total-box .value { font-size: 24px; font-weight: 800; }\n\n.hint { font-size: 12px; color: #9ca3af; }\n.section-actions { display: flex; justify-content: space-between; align-items: center; }\n";

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
      fields[name] = partBody.toString('utf8');
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

function createSession(data) {
  const id = crypto.randomBytes(24).toString('hex');
  sessions.set(id, { ...data, createdAt: Date.now() });
  return id;
}

function getSession(id) {
  return sessions.get(id) || null;
}

function destroySession(id) {
  sessions.delete(id);
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

function setSessionCookie(res, sid) {
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}
const auth = { hashPassword, verifyPassword, createSession, getSession, destroySession, parseCookies, getCurrentSession, setSessionCookie, clearSessionCookie };

// ===== lib/db.js =====
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'app.db');

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
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

CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  submission_deadline TEXT,
  requested_delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_request_id INTEGER NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  spec TEXT DEFAULT '',
  qty INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT ''
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
  selected_at TEXT NOT NULL
);
`);

// ---- 마이그레이션: 기존 vendors 테이블에 category(단일) 컬럼만 있던 경우 대응 ----
const vendorCols = db.prepare("PRAGMA table_info(vendors)").all().map((c) => c.name);
function addColumnIfMissing(col, ddl) {
  if (!vendorCols.includes(col)) {
    db.exec(`ALTER TABLE vendors ADD COLUMN ${ddl}`);
    vendorCols.push(col);
  }
}
addColumnIfMissing('category1', "category1 TEXT DEFAULT ''");
addColumnIfMissing('category2', "category2 TEXT DEFAULT ''");
addColumnIfMissing('category3', "category3 TEXT DEFAULT ''");
addColumnIfMissing('bank_name', "bank_name TEXT DEFAULT ''");
addColumnIfMissing('account_number', "account_number TEXT DEFAULT ''");
addColumnIfMissing('account_holder', "account_holder TEXT DEFAULT ''");
addColumnIfMissing('biz_reg_file', "biz_reg_file TEXT DEFAULT ''");
addColumnIfMissing('bankbook_file', "bankbook_file TEXT DEFAULT ''");
if (vendorCols.includes('category') && vendorCols.includes('category1')) {
  // 예전 단일 category 값을 category1로 옮겨준다 (비어있는 경우에만)
  db.exec("UPDATE vendors SET category1 = category WHERE (category1 IS NULL OR category1 = '') AND category IS NOT NULL AND category <> ''");
}

// 기본 관리자 계정 시딩 (없을 때만)
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminCount === 0) {
  db.prepare('INSERT INTO admins (login_id, password_hash, display_name) VALUES (?, ?, ?)')
    .run('admin', hashPassword('admin1234'), '관리자');
  console.log('[초기화] 기본 관리자 계정 생성: admin / admin1234 (로그인 후 반드시 변경하세요)');
}

// 카테고리 옵션 기본값 시딩 (해당 그룹에 아무 옵션도 없을 때만)
function seedCategoryGroup(groupKey, labels) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM category_options WHERE group_key = ?').get(groupKey).c;
  if (count === 0 && labels.length > 0) {
    const insert = db.prepare('INSERT INTO category_options (group_key, label, sort_order) VALUES (?, ?, ?)');
    labels.forEach((label, i) => insert.run(groupKey, label, i));
  }
}
seedCategoryGroup('cat1', ['코스', '일반관리', '시설']);
seedCategoryGroup('cat2', ['저장품', '소모품', '코스 관리비']);
seedCategoryGroup('cat3', []);

function getCategoryOptions(groupKey) {
  return db.prepare('SELECT * FROM category_options WHERE group_key = ? ORDER BY sort_order, id').all(groupKey);
}

module.exports.UPLOAD_DIR = UPLOAD_DIR;
module.exports.getCategoryOptions = getCategoryOptions;

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
<link rel="stylesheet" href="/static/style.css">
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="${user ? (user.role === 'admin' ? '/admin' : '/vendor') : '/'}">힐마루 견적관리</a>
    <nav>
      ${user ? `
        <span class="who">${escapeHtml(user.displayName)}${user.role === 'admin' ? ' (관리자)' : ' (업체)'}</span>
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
    <h1>로그인</h1>
    <div class="login-tabs">
      <a href="/login?role=admin" class="${role === 'admin' ? 'active' : ''}">관리자</a>
      <a href="/login?role=vendor" class="${role === 'vendor' ? 'active' : ''}">업체</a>
    </div>
    <div class="card">
      ${error ? `<div class="flash error">${escapeHtml(error)}</div>` : ''}
      <form method="POST" action="/login">
        <input type="hidden" name="role" value="${role}">
        <label>아이디</label>
        <input type="text" name="login_id" required autofocus>
        <label>비밀번호</label>
        <input type="password" name="password" required>
        <div style="margin-top:16px;"><button type="submit">로그인</button></div>
      </form>
      ${role === 'admin' ? '<p class="hint">기본 관리자 계정: admin / admin1234</p>' : ''}
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
  <div class="section-actions" style="margin-bottom:14px;">
    <div><a href="/admin/vendors">업체 관리 →</a></div>
    <div><a href="/admin/categories">업체 카테고리 관리 →</a></div>
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
  <h1>업체 관리</h1>
  <div class="card">
    <table>
      <thead><tr><th>업체명</th><th>카테고리</th><th>담당자</th><th>이메일</th><th>로그인ID</th><th>상태</th><th>사업자등록증</th><th>통장사본</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9">등록된 업체가 없습니다.</td></tr>'}</tbody>
    </table>
  </div>

  <h2>${editVendor ? `업체 정보 수정 — ${escapeHtml(editVendor.name)}` : '업체 신규 등록'}</h2>
  <div class="card">
    <form method="POST" action="${editVendor ? `/admin/vendors/${editVendor.id}` : '/admin/vendors'}" enctype="multipart/form-data">
      <div class="form-row">
        <div><label>업체명</label><input type="text" name="name" required value="${editVendor ? escapeHtml(editVendor.name) : ''}"></div>
        <div><label>사업자번호</label><input type="text" name="biz_reg_no" value="${editVendor ? escapeHtml(editVendor.biz_reg_no) : ''}"></div>
      </div>

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
  <a href="/admin/vendors">← 업체 관리로 돌아가기</a>
  `;
  return layout({ title: '카테고리 관리', body, user, flash });
}

function quoteRequestNewPage({ user, vendorsByCategory, cat1Options, flash }) {
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

  const body = `
  <h1>새 견적요청</h1>
  <form method="POST" action="/admin/quote-requests">
    <div class="card">
      <label>견적요청 제목</label>
      <input type="text" name="title" required placeholder="예) 2026년 9월 코스관리 자재 견적">
      <div class="form-row">
        <div><label>견적 제출 마감일</label><input type="date" name="submission_deadline"></div>
        <div><label>요청 납기일자</label><input type="date" name="requested_delivery_date"></div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">품목 목록</h3>
      <div id="items-wrap">
        <div class="form-row item-row">
          <div><label>품목명</label><input type="text" name="item_name[]" required></div>
          <div><label>규격</label><input type="text" name="item_spec[]"></div>
          <div><label>수량</label><input type="number" name="item_qty[]" value="1" min="1"></div>
          <div><label>단위</label><input type="text" name="item_unit[]" placeholder="예) 포, 톤, EA"></div>
        </div>
      </div>
      <button type="button" class="btn secondary small" onclick="addItemRow()">+ 품목 추가</button>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">카테고리별(카테고리1 기준) 업체 배정</h3>
      <p class="hint">체크한 업체에게 이 견적요청이 노출됩니다. '견적입력'은 견적 제출 가능, '조회'만 체크하면 열람만 가능합니다.</p>
      ${catBlocks || '<p class="hint">등록된 업체가 없습니다. 먼저 업체를 등록하세요.</p>'}
    </div>

    <button type="submit">견적요청 생성</button>
  </form>

  <script>
    function addItemRow() {
      const wrap = document.getElementById('items-wrap');
      const row = wrap.firstElementChild.cloneNode(true);
      row.querySelectorAll('input').forEach(i => { if (i.name === 'item_qty[]') i.value = 1; else i.value = ''; });
      wrap.appendChild(row);
    }
  </script>
  `;
  return layout({ title: '새 견적요청', body, user, flash });
}

function quoteRequestEditPage({ user, qr, items, vendorsByCategory, assignments, cat1Options, flash }) {
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
      <div style="align-self:end;"><label>&nbsp;</label><label style="display:inline;margin:0;"><input type="checkbox" name="item_remove[]" value="${it.id}"> 이 품목 삭제</label></div>
    </div>`).join('');

  const blankRow = `
    <div class="form-row item-row">
      <input type="hidden" name="item_id[]" value="">
      <div><label>품목명</label><input type="text" name="item_name[]"></div>
      <div><label>규격</label><input type="text" name="item_spec[]"></div>
      <div><label>수량</label><input type="number" name="item_qty[]" value="1" min="1"></div>
      <div><label>단위</label><input type="text" name="item_unit[]"></div>
      <div style="align-self:end;"><label>&nbsp;</label><span class="hint">신규 품목</span></div>
    </div>`;

  const body = `
  <h1>견적요청 수정 — ${escapeHtml(qr.title)}</h1>
  <p class="hint">이미 제출된 견적이 있는 품목을 삭제하면 해당 견적·선정 내역도 함께 삭제됩니다.</p>
  <form method="POST" action="/admin/quote-requests/${qr.id}/edit">
    <div class="card">
      <label>견적요청 제목</label>
      <input type="text" name="title" required value="${escapeHtml(qr.title)}">
      <div class="form-row">
        <div><label>견적 제출 마감일</label><input type="date" name="submission_deadline" value="${escapeHtml(qr.submission_deadline || '')}"></div>
        <div><label>요청 납기일자</label><input type="date" name="requested_delivery_date" value="${escapeHtml(qr.requested_delivery_date || '')}"></div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">품목 목록</h3>
      <div id="items-wrap">
        ${itemRows}
      </div>
      <button type="button" class="btn secondary small" onclick="addItemRow()">+ 품목 추가</button>
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
        ${isLowest && !isSelected ? `
        <form method="POST" action="/admin/quote-requests/select" class="inline">
          <input type="hidden" name="quote_item_id" value="${s.quote_item_id}">
          <input type="hidden" name="submission_id" value="${s.id}">
          <button type="submit" class="btn small">이 후보로 선정</button>
        </form>` : (isSelected ? '<span class="hint">선정됨</span>' : '<span class="hint">최저가 아님</span>')}
      </td>
    </tr>`;
}

function quoteRequestDetailPage({ user, qr, items, assignments, vendorsByCategory, submissionsByItem, selections, flash }) {
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
        <h3 style="margin:0;">${escapeHtml(it.item_name)} <span class="hint">(${escapeHtml(it.spec || '')} · ${it.qty}${escapeHtml(it.unit || '')})</span></h3>
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
      <thead><tr><th>기준 품목</th><th>선정 구분</th><th>선정 품목</th><th>선정 업체</th><th>수량</th><th>단가</th><th>품목 총금액</th><th>납기일자</th></tr></thead>
      <tbody>
        ${items.filter((it) => selections[it.id]).map((it) => {
          const s = selections[it.id];
          return `<tr>
            <td>${escapeHtml(it.item_name)}</td>
            <td><span class="badge ${s.type}">${s.type === 'requested' ? '요청품' : '대체품'}</span></td>
            <td>${escapeHtml(s.product_name)}</td>
            <td>${escapeHtml(s.vendor_name)}</td>
            <td>${s.qty}${escapeHtml(s.unit)}</td>
            <td>${money(s.unit_price)}</td>
            <td>${money(s.unit_price * s.qty)}</td>
            <td>${escapeHtml(s.delivery_date || '-')}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div class="total-box">
      <div class="label">${selectedCount === totalItems ? '완전 총금액' : '현재 선정금액'}</div>
      <div class="value">${money(selectedAmount)}</div>
    </div>
  </div>` : ''}

  <h2>배정된 업체</h2>
  <div class="card">${catBlocks || '<p class="hint">배정된 업체가 없습니다.</p>'}</div>
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
    const subRows = subsMine.map((s) => `
      <tr><td><span class="badge substitute">대체품</span></td><td>${escapeHtml(s.product_name)}</td><td>${escapeHtml(s.spec)}</td><td>${s.qty}${escapeHtml(s.unit)}</td><td>${money(s.unit_price)}</td><td>${escapeHtml(s.delivery_date || '-')}</td><td>${escapeHtml(s.substitute_reason)}</td></tr>
    `).join('');

    return `
    <div class="card">
      <h3 style="margin-top:0;">${escapeHtml(it.item_name)} <span class="hint">(${escapeHtml(it.spec || '')} · 요청수량 ${it.qty}${escapeHtml(it.unit || '')})</span></h3>

      ${requestedMine.length > 0 ? `
      <p class="hint">제출한 요청품 견적: ${escapeHtml(requestedMine[0].product_name)} / ${money(requestedMine[0].unit_price)} / 납기 ${escapeHtml(requestedMine[0].delivery_date || '-')}</p>
      ` : (canSubmit ? `
      <form method="POST" action="/vendor/quote-requests/${qr.id}/submissions">
        <input type="hidden" name="quote_item_id" value="${it.id}">
        <input type="hidden" name="type" value="requested">
        <div class="form-row">
          <div><label>제안 품목명</label><input type="text" name="product_name" value="${escapeHtml(it.item_name)}" required></div>
          <div><label>규격</label><input type="text" name="spec" value="${escapeHtml(it.spec || '')}"></div>
          <div><label>수량</label><input type="number" name="qty" value="${it.qty}" min="1" required></div>
          <div><label>단위</label><input type="text" name="unit" value="${escapeHtml(it.unit || '')}"></div>
        </div>
        <div class="form-row">
          <div><label>단가(원)</label><input type="number" name="unit_price" min="0" required></div>
          <div><label>납기일자</label><input type="date" name="delivery_date"></div>
          <div><label>제조사</label><input type="text" name="manufacturer"></div>
        </div>
        <label>비고</label><textarea name="note" rows="2"></textarea>
        <div style="margin-top:10px;"><button type="submit">요청품 견적 제출</button></div>
      </form>` : '<p class="hint">열람 권한만 있어 견적을 제출할 수 없습니다.</p>')}

      ${subsMine.length > 0 ? `
      <h4 style="margin-bottom:4px;">제출한 대체품</h4>
      <table><thead><tr><th>구분</th><th>제안 품목</th><th>규격</th><th>수량</th><th>단가</th><th>납기</th><th>제안 사유</th></tr></thead><tbody>${subRows}</tbody></table>
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
  ${itemBlocks}
  `;
  return layout({ title: qr.title, body, user, flash });
}
const views = { loginPage, adminDashboard, adminVendorsPage, adminCategoriesPage, quoteRequestNewPage, quoteRequestEditPage, quoteRequestDetailPage, vendorDashboard, vendorQuoteRequestPage };

// ===== server.js =====

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

  let ok = false, userData = null;
  if (role === 'admin') {
    const admin = db.prepare('SELECT * FROM admins WHERE login_id = ?').get(loginId);
    if (admin && auth.verifyPassword(password, admin.password_hash)) {
      ok = true;
      userData = { role: 'admin', userId: admin.id, displayName: admin.display_name };
    }
  } else {
    const vendor = db.prepare('SELECT * FROM vendors WHERE login_id = ?').get(loginId);
    if (vendor && vendor.active && auth.verifyPassword(password, vendor.password_hash)) {
      ok = true;
      userData = { role: 'vendor', userId: vendor.id, displayName: vendor.display_name || vendor.name };
    }
  }

  if (!ok) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(views.loginPage({ role, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }));
  }

  const sid = auth.createSession(userData);
  auth.setSessionCookie(res, sid);
  redirect(res, role === 'admin' ? '/admin' : '/vendor');
});

router.get('/logout', (req, res) => {
  const s = auth.getCurrentSession(req);
  if (s) auth.destroySession(s.sid);
  auth.clearSessionCookie(res);
  redirect(res, '/login');
});

// ---------- 관리자: 대시보드 ----------
function computeSelectionForItem(itemId) {
  const submissions = db.prepare(`
    SELECT s.*, v.name AS vendor_name FROM submissions s
    JOIN vendors v ON v.id = s.vendor_id
    WHERE s.quote_item_id = ?
  `).all(itemId);
  let minPrice = null;
  if (submissions.length > 0) minPrice = Math.min(...submissions.map((s) => s.unit_price));
  const candidates = submissions.filter((s) => s.unit_price === minPrice);
  const selectedRow = db.prepare('SELECT * FROM final_selections WHERE quote_item_id = ?').get(itemId);
  let selected = null;
  if (selectedRow) {
    selected = submissions.find((s) => s.id === selectedRow.submission_id) || null;
  }
  return { submissions, minPrice, candidates, selected };
}

router.get('/admin', (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const qrs = db.prepare('SELECT * FROM quote_requests ORDER BY id DESC').all();
  const requests = qrs.map((qr) => {
    const items = db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(qr.id);
    let selectedCount = 0, selectedAmount = 0;
    for (const it of items) {
      const { selected } = computeSelectionForItem(it.id);
      if (selected) { selectedCount += 1; selectedAmount += selected.unit_price * selected.qty; }
    }
    const assignments = db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ?').all(qr.id);
    const vendorCount = assignments.length;
    const submittedVendorIds = new Set(
      db.prepare(`
        SELECT DISTINCT s.vendor_id FROM submissions s
        JOIN quote_items qi ON qi.id = s.quote_item_id
        WHERE qi.quote_request_id = ?
      `).all(qr.id).map((r) => r.vendor_id)
    );
    return {
      ...qr,
      totalItems: items.length,
      selectedCount,
      selectedAmount,
      vendorCount,
      submittedVendorCount: submittedVendorIds.size,
    };
  });
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(views.adminDashboard({ user: u, requests }));
});

// ---------- 관리자: 카테고리 관리 ----------
router.get('/admin/categories', (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const groups = { cat1: getCategoryOptions('cat1'), cat2: getCategoryOptions('cat2'), cat3: getCategoryOptions('cat3') };
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
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM category_options WHERE group_key = ?').get(groupKey).m;
    try {
      db.prepare('INSERT INTO category_options (group_key, label, sort_order) VALUES (?, ?, ?)').run(groupKey, label, maxOrder + 1);
    } catch (e) { /* 중복이면 무시 */ }
  }
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
      db.prepare('UPDATE category_options SET label = ? WHERE id = ?').run(label, id);
    } catch (e) { /* 중복 라벨이면 무시 */ }
  }
  redirect(res, '/admin/categories');
});

router.post('/admin/categories/:id/delete', async (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const id = Number(req.params.id);
  db.prepare('DELETE FROM category_options WHERE id = ?').run(id);
  redirect(res, '/admin/categories');
});

// ---------- 관리자: 업체 관리 ----------
router.get('/admin/vendors', (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const vendors = db.prepare('SELECT * FROM vendors ORDER BY category1, name').all();
  let editVendor = null;
  if (req.query.edit) {
    editVendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(Number(req.query.edit));
  }
  const cat1Options = getCategoryOptions('cat1').map((o) => o.label);
  const cat2Options = getCategoryOptions('cat2').map((o) => o.label);
  const cat3Options = getCategoryOptions('cat3').map((o) => o.label);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(views.adminVendorsPage({ user: u, vendors, editVendor, cat1Options, cat2Options, cat3Options }));
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
  } = body;
  if (!name || !login_id || !password) return redirect(res, '/admin/vendors');
  const exists = db.prepare('SELECT id FROM vendors WHERE login_id = ?').get(login_id);
  if (exists) return redirect(res, '/admin/vendors');

  const bizRegFile = saveUploadedFile(files.biz_reg_file, 'biz');
  const bankbookFile = saveUploadedFile(files.bankbook_file, 'bankbook');

  db.prepare(`
    INSERT INTO vendors (
      name, category1, category2, category3, biz_reg_no, contact_name, contact_email,
      login_id, password_hash, display_name, bank_name, account_number, account_holder,
      biz_reg_file, bankbook_file, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, category1 || '', category2 || '', category3 || '', biz_reg_no || '',
    contact_name || '', contact_email || '', login_id, auth.hashPassword(password),
    display_name || contact_name || '', bank_name || '', account_number || '', account_holder || '',
    bizRegFile || '', bankbookFile || '', active === '0' ? 0 : 1, new Date().toISOString()
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
  } = body;
  const current = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
  if (!current) return redirect(res, '/admin/vendors');
  const passwordHash = password && password.trim() ? auth.hashPassword(password) : current.password_hash;

  const bizRegFile = saveUploadedFile(files.biz_reg_file, `biz_${id}`) || current.biz_reg_file;
  const bankbookFile = saveUploadedFile(files.bankbook_file, `bankbook_${id}`) || current.bankbook_file;

  db.prepare(`
    UPDATE vendors SET
      name=?, category1=?, category2=?, category3=?, biz_reg_no=?, contact_name=?, contact_email=?,
      login_id=?, password_hash=?, display_name=?, bank_name=?, account_number=?, account_holder=?,
      biz_reg_file=?, bankbook_file=?, active=?
    WHERE id=?
  `).run(
    name, category1 || '', category2 || '', category3 || '', biz_reg_no || '',
    contact_name || '', contact_email || '', login_id, passwordHash,
    display_name || contact_name || '', bank_name || '', account_number || '', account_holder || '',
    bizRegFile || '', bankbookFile || '', active === '0' ? 0 : 1, id
  );
  redirect(res, '/admin/vendors');
});

// 사업자등록증 / 통장사본 다운로드 (관리자 전용)
router.get('/admin/vendors/file/:id/:type', (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const id = Number(req.params.id);
  const type = req.params.type;
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
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
router.get('/admin/quote-requests/new', (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const vendors = db.prepare('SELECT * FROM vendors WHERE active = 1 ORDER BY category1, name').all();
  const vendorsByCategory = {};
  for (const v of vendors) {
    const key = v.category1 || '미분류';
    if (!vendorsByCategory[key]) vendorsByCategory[key] = [];
    vendorsByCategory[key].push(v);
  }
  const cat1Options = getCategoryOptions('cat1').map((o) => o.label);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(views.quoteRequestNewPage({ user: u, vendorsByCategory, cat1Options }));
});

function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

router.post('/admin/quote-requests', async (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const body = await parseBody(req);
  const title = (body.title || '').trim();
  if (!title) return redirect(res, '/admin/quote-requests/new');

  const insertQr = db.prepare(`
    INSERT INTO quote_requests (title, submission_deadline, requested_delivery_date, status, created_at)
    VALUES (?, ?, ?, 'open', ?)
  `);
  const info = insertQr.run(title, body.submission_deadline || null, body.requested_delivery_date || null, new Date().toISOString());
  const qrId = info.lastInsertRowid;

  const names = toArray(body['item_name[]']);
  const specs = toArray(body['item_spec[]']);
  const qtys = toArray(body['item_qty[]']);
  const units = toArray(body['item_unit[]']);
  const insertItem = db.prepare('INSERT INTO quote_items (quote_request_id, item_name, spec, qty, unit) VALUES (?, ?, ?, ?, ?)');
  for (let i = 0; i < names.length; i++) {
    if (!names[i] || !names[i].trim()) continue;
    insertItem.run(qrId, names[i].trim(), specs[i] || '', Number(qtys[i]) || 1, units[i] || '');
  }

  const viewIds = new Set(toArray(body.assign_view).map(Number));
  const submitIds = new Set(toArray(body.assign_submit).map(Number));
  const insertAssign = db.prepare('INSERT OR REPLACE INTO vendor_assignments (quote_request_id, vendor_id, permission) VALUES (?, ?, ?)');
  const allIds = new Set([...viewIds, ...submitIds]);
  for (const vid of allIds) {
    const perm = submitIds.has(vid) ? 'submit' : 'view';
    insertAssign.run(qrId, vid, perm);
  }

  redirect(res, `/admin/quote-requests/${qrId}`);
});

// ---------- 관리자: 견적요청 상세 ----------
router.get('/admin/quote-requests/:id', (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const id = Number(req.params.id);
  const qr = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }
  const items = db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
  const assignments = db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ?').all(id);
  const vendors = db.prepare('SELECT * FROM vendors ORDER BY category1, name').all();
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
    const { submissions, selected } = computeSelectionForItem(it.id);
    submissionsByItem[it.id] = submissions;
    if (selected) selections[it.id] = selected;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(views.quoteRequestDetailPage({ user: u, qr, items, assignments, vendorsByCategory, submissionsByItem, selections }));
});

// ---------- 관리자: 견적요청 수정 ----------
router.get('/admin/quote-requests/:id/edit', (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const id = Number(req.params.id);
  const qr = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }
  const items = db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
  const assignments = db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ?').all(id);
  const vendors = db.prepare('SELECT * FROM vendors WHERE active = 1 ORDER BY category1, name').all();
  const vendorsByCategory = {};
  for (const v of vendors) {
    const key = v.category1 || '미분류';
    if (!vendorsByCategory[key]) vendorsByCategory[key] = [];
    vendorsByCategory[key].push(v);
  }
  const cat1Options = getCategoryOptions('cat1').map((o) => o.label);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(views.quoteRequestEditPage({ user: u, qr, items, vendorsByCategory, assignments, cat1Options }));
});

router.post('/admin/quote-requests/:id/edit', async (req, res) => {
  const u = requireLogin('admin')(req, res);
  if (!u) return;
  const id = Number(req.params.id);
  const qr = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  if (!qr) { res.writeHead(404); return res.end('견적요청을 찾을 수 없습니다.'); }

  const body = await parseBody(req);
  const title = (body.title || '').trim();
  if (!title) return redirect(res, `/admin/quote-requests/${id}/edit`);

  db.prepare(`
    UPDATE quote_requests SET title = ?, submission_deadline = ?, requested_delivery_date = ? WHERE id = ?
  `).run(title, body.submission_deadline || null, body.requested_delivery_date || null, id);

  // ---- 품목 동기화 ----
  const itemIds = toArray(body['item_id[]']);
  const names = toArray(body['item_name[]']);
  const specs = toArray(body['item_spec[]']);
  const qtys = toArray(body['item_qty[]']);
  const units = toArray(body['item_unit[]']);
  const removeIds = new Set(toArray(body['item_remove[]']).map(Number));

  const updateItem = db.prepare('UPDATE quote_items SET item_name=?, spec=?, qty=?, unit=? WHERE id=? AND quote_request_id=?');
  const insertItem = db.prepare('INSERT INTO quote_items (quote_request_id, item_name, spec, qty, unit) VALUES (?, ?, ?, ?, ?)');
  const deleteItem = db.prepare('DELETE FROM quote_items WHERE id=? AND quote_request_id=?');

  for (let i = 0; i < names.length; i++) {
    const itemId = itemIds[i] ? Number(itemIds[i]) : null;
    if (itemId && removeIds.has(itemId)) {
      deleteItem.run(itemId, id);
      continue;
    }
    if (!names[i] || !names[i].trim()) continue;
    if (itemId) {
      updateItem.run(names[i].trim(), specs[i] || '', Number(qtys[i]) || 1, units[i] || '', itemId, id);
    } else {
      insertItem.run(id, names[i].trim(), specs[i] || '', Number(qtys[i]) || 1, units[i] || '');
    }
  }

  // ---- 업체 배정 동기화 (기존 배정을 지우고 다시 반영) ----
  const viewIds = new Set(toArray(body.assign_view).map(Number));
  const submitIds = new Set(toArray(body.assign_submit).map(Number));
  const allIds = new Set([...viewIds, ...submitIds]);
  db.prepare('DELETE FROM vendor_assignments WHERE quote_request_id = ?').run(id);
  const insertAssign = db.prepare('INSERT OR REPLACE INTO vendor_assignments (quote_request_id, vendor_id, permission) VALUES (?, ?, ?)');
  for (const vid of allIds) {
    const perm = submitIds.has(vid) ? 'submit' : 'view';
    insertAssign.run(id, vid, perm);
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
  const item = db.prepare('SELECT * FROM quote_items WHERE id = ?').get(itemId);
  if (!item) { res.writeHead(404); return res.end('품목을 찾을 수 없습니다.'); }

  const { candidates } = computeSelectionForItem(itemId);
  const isCandidate = candidates.some((c) => c.id === submissionId);
  if (!isCandidate) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('최저가 후보만 최종 선정할 수 있습니다.');
  }
  db.prepare(`
    INSERT INTO final_selections (quote_item_id, submission_id, selected_at) VALUES (?, ?, ?)
    ON CONFLICT(quote_item_id) DO UPDATE SET submission_id = excluded.submission_id, selected_at = excluded.selected_at
  `).run(itemId, submissionId, new Date().toISOString());

  redirect(res, `/admin/quote-requests/${item.quote_request_id}`);
});

// ---------- 업체: 대시보드 ----------
router.get('/vendor', (req, res) => {
  const u = requireLogin('vendor')(req, res);
  if (!u) return;
  const rows = db.prepare(`
    SELECT qr.*, va.permission FROM vendor_assignments va
    JOIN quote_requests qr ON qr.id = va.quote_request_id
    WHERE va.vendor_id = ?
    ORDER BY qr.id DESC
  `).all(u.userId);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(views.vendorDashboard({ user: u, requests: rows }));
});

router.get('/vendor/quote-requests/:id', (req, res) => {
  const u = requireLogin('vendor')(req, res);
  if (!u) return;
  const id = Number(req.params.id);
  const assign = db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ? AND vendor_id = ?').get(id, u.userId);
  if (!assign) { res.writeHead(403); return res.end('접근 권한이 없습니다.'); }
  const qr = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  const items = db.prepare('SELECT * FROM quote_items WHERE quote_request_id = ?').all(id);
  const mySubmissions = db.prepare(`
    SELECT s.* FROM submissions s
    JOIN quote_items qi ON qi.id = s.quote_item_id
    WHERE qi.quote_request_id = ? AND s.vendor_id = ?
  `).all(id, u.userId);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(views.vendorQuoteRequestPage({ user: u, qr, items, permission: assign.permission, mySubmissions }));
});

router.post('/vendor/quote-requests/:id/submissions', async (req, res) => {
  const u = requireLogin('vendor')(req, res);
  if (!u) return;
  const id = Number(req.params.id);
  const assign = db.prepare('SELECT * FROM vendor_assignments WHERE quote_request_id = ? AND vendor_id = ?').get(id, u.userId);
  if (!assign || assign.permission !== 'submit') { res.writeHead(403); return res.end('견적입력 권한이 없습니다.'); }

  const body = await parseBody(req);
  const itemId = Number(body.quote_item_id);
  const item = db.prepare('SELECT * FROM quote_items WHERE id = ? AND quote_request_id = ?').get(itemId, id);
  if (!item) { res.writeHead(404); return res.end('품목을 찾을 수 없습니다.'); }
  const type = body.type === 'substitute' ? 'substitute' : 'requested';

  if (type === 'requested') {
    const existing = db.prepare("SELECT id FROM submissions WHERE quote_item_id=? AND vendor_id=? AND type='requested'").get(itemId, u.userId);
    if (existing) return redirect(res, `/vendor/quote-requests/${id}`);
  }

  db.prepare(`
    INSERT INTO submissions (quote_item_id, vendor_id, type, product_name, spec, qty, unit, unit_price, delivery_date, manufacturer, substitute_reason, note, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    itemId, u.userId, type,
    body.product_name || '', body.spec || '', Number(body.qty) || 1, body.unit || '',
    Number(body.unit_price) || 0, body.delivery_date || null, body.manufacturer || '',
    body.substitute_reason || '', body.note || '', new Date().toISOString()
  );

  redirect(res, `/vendor/quote-requests/${id}`);
});

// ---------- 서버 시작 ----------
const server = http.createServer(async (req, res) => {
  const handled = await router.handle(req, res);
  if (!handled) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('페이지를 찾을 수 없습니다.');
  }
});

server.listen(PORT, () => {
  console.log(`힐마루 견적관리 서버 실행 중: http://localhost:${PORT}`);
});
