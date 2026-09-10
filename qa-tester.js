/**
 * <qa-tester> — estate manual-QA harness ("the /tester harness").
 *
 * A single self-contained, framework-free ES module. Zero dependencies, no
 * build step: vendor (copy) this file into any app and load it with
 * <script type="module" src=".../qa-tester.js">, then drop a <qa-tester>
 * element on a hidden /tester route.
 *
 * Attributes:
 *   app-id        (required)  App identifier, ^[a-z0-9][a-z0-9-]*$ — used for
 *                             localStorage keys and the collector API.
 *   registry-url  (optional)  Registry JSON URL. Default: ./qa/test-cases.json
 *   collector-url (optional)  QaCollector base URL, e.g. https://qa.seolith.com
 *
 * Auth gate: email + password, where the password is the current UTC hour
 * formatted yyyyMMddHH (±2h accepted client-side; the collector enforces the
 * same window server-side). Convenience gate only — not real security.
 *
 * Persistence: localStorage keys prefixed `qa_tester_{appId}_`. Observations
 * are stored locally first and synced to the collector on demand (Sync
 * button) or automatically when the browser comes back online.
 */

const HOUR_MS = 3600_000;
const SKEW_HOURS = 2;

function utcHourPassword(offsetHours = 0) {
  const d = new Date(Date.now() + offsetHours * HOUR_MS);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}`;
}

function validHourPasswords() {
  const out = [];
  for (let i = -SKEW_HOURS; i <= SKEW_HOURS; i++) out.push(utcHourPassword(i));
  return out;
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const VERDICTS = ['passed', 'failed', 'needs-work'];

const STYLES = `
  :host { display: block; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f2430; }
  * { box-sizing: border-box; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 16px; }
  h1 { font-size: 1.25rem; margin: 0 0 4px; }
  h2 { font-size: 1rem; margin: 16px 0 8px; }
  .sub { color: #5b6270; font-size: 0.85rem; margin-bottom: 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 12px 0; }
  select, input[type="text"], input[type="email"], input[type="password"], textarea {
    font: inherit; padding: 6px 8px; border: 1px solid #c8cdd6; border-radius: 6px; background: #fff;
  }
  button { font: inherit; padding: 6px 12px; border: 1px solid #c8cdd6; border-radius: 6px;
           background: #f4f6fa; cursor: pointer; }
  button:hover { background: #e7ebf3; }
  button.primary { background: #2b5ce6; border-color: #2b5ce6; color: #fff; }
  button.primary:hover { background: #1f49bd; }
  button:disabled { opacity: 0.5; cursor: default; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e3e6ec; vertical-align: top; }
  th { position: sticky; top: 0; background: #f4f6fa; z-index: 1; }
  tr.case-row { cursor: pointer; }
  tr.case-row:hover { background: #f7f9fd; }
  .detail td { background: #fbfcfe; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 0.75rem; }
  .pill.passed { background: #dcf5e3; color: #146c2e; }
  .pill.failed { background: #fde2e2; color: #a11d1d; }
  .pill.needs-work { background: #fff2cc; color: #8a5a00; }
  .pill.untested { background: #e8eaef; color: #4a5060; }
  .pill.blocked { background: #efe2fd; color: #5b2a86; }
  .pill.critical { background: #fde2e2; color: #a11d1d; }
  .pill.high { background: #ffe8d6; color: #9a4a00; }
  .pill.medium { background: #e3ecfd; color: #1f49bd; }
  .pill.low { background: #e8eaef; color: #4a5060; }
  .steps { margin: 4px 0 8px 18px; padding: 0; }
  .obs-form { border: 1px solid #e3e6ec; border-radius: 8px; padding: 10px; margin-top: 8px; background: #fff; }
  .obs-form textarea { width: 100%; min-height: 56px; margin-top: 6px; }
  .verdicts { display: flex; gap: 12px; flex-wrap: wrap; margin: 6px 0; }
  .toast { position: fixed; bottom: 16px; right: 16px; background: #1f2430; color: #fff;
           padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; max-width: 340px; z-index: 10; }
  .login { max-width: 360px; margin: 48px auto; border: 1px solid #e3e6ec; border-radius: 10px; padding: 20px; }
  .login label { display: block; font-size: 0.85rem; margin: 10px 0 4px; }
  .login input { width: 100%; }
  .muted { color: #5b6270; font-size: 0.8rem; }
  .history { font-size: 0.78rem; color: #5b6270; margin-top: 6px; }
  .history li { margin-bottom: 2px; }
  img.shot { max-width: 220px; border: 1px solid #e3e6ec; border-radius: 6px; margin-top: 6px; display: block; }
  .err { color: #a11d1d; font-size: 0.85rem; margin-top: 8px; }
  .obs-list { font-size: 0.8rem; margin-top: 8px; }
  .obs-list li { margin-bottom: 6px; }
`;

class QaTester extends HTMLElement {
  static get observedAttributes() { return ['app-id', 'registry-url', 'collector-url']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cases = [];
    this._observations = [];
    this._expanded = new Set();
    this._filters = { area: '', priority: '', status: '', observedBy: '' };
    this._syncing = false;
    this._onOnline = () => this._sync();
  }

  get appId() { return this.getAttribute('app-id') || ''; }
  get registryUrl() { return this.getAttribute('registry-url') || './qa/test-cases.json'; }
  get collectorUrl() { return (this.getAttribute('collector-url') || '').replace(/\/+$/, ''); }

  _lsKey(name) { return `qa_tester_${this.appId}_${name}`; }
  _ssKey(name) { return `qa_tester_${this.appId}_${name}`; }

  connectedCallback() {
    this._injectNoindex();
    window.addEventListener('online', this._onOnline);
    this._loadLocal();
    if (this._isUnlocked()) {
      this._renderApp();
      this._loadRegistry();
    } else {
      this._renderLogin();
    }
  }

  disconnectedCallback() {
    window.removeEventListener('online', this._onOnline);
  }

  /** The /tester route must never be indexed — belt and braces with robots.txt. */
  _injectNoindex() {
    if (!document.head.querySelector('meta[name="robots"]')) {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex,nofollow';
      document.head.appendChild(meta);
    }
  }

  // ---------- auth gate ----------

  _isUnlocked() {
    return sessionStorage.getItem(this._ssKey('unlocked')) === '1' &&
           !!sessionStorage.getItem(this._ssKey('creds'));
  }

  _renderLogin(error = '') {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="login">
        <h1>QA Tester sign-in</h1>
        <div class="muted">App: <strong>${escapeHtml(this.appId)}</strong></div>
        <label for="qa-email">Email</label>
        <input id="qa-email" type="email" autocomplete="username" placeholder="you@example.com">
        <label for="qa-pass">Password (current UTC hour, yyyyMMddHH)</label>
        <input id="qa-pass" type="password" autocomplete="off">
        ${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
        <div class="bar"><button class="primary" id="qa-login">Unlock</button></div>
        <div class="muted">Convenience gate, not real security. Unlocked for this tab session only.</div>
      </div>`;
    this.shadowRoot.getElementById('qa-login').addEventListener('click', () => {
      const email = this.shadowRoot.getElementById('qa-email').value.trim();
      const pass = this.shadowRoot.getElementById('qa-pass').value.trim();
      if (!email || !email.includes('@')) return this._renderLogin('Enter a valid email.');
      if (!validHourPasswords().includes(pass)) return this._renderLogin('Wrong password for the current UTC hour window.');
      sessionStorage.setItem(this._ssKey('unlocked'), '1');
      sessionStorage.setItem(this._ssKey('creds'), btoa(`${email}:${pass}`));
      sessionStorage.setItem(this._ssKey('email'), email);
      this._renderApp();
      this._loadRegistry();
    });
  }

  _authHeaders() {
    const creds = sessionStorage.getItem(this._ssKey('creds'));
    return creds ? { Authorization: `Basic ${creds}` } : {};
  }

  // ---------- persistence ----------

  _loadLocal() {
    try {
      const obs = localStorage.getItem(this._lsKey('observations'));
      this._observations = obs ? JSON.parse(obs) : [];
    } catch { this._observations = []; }
    try {
      const reg = localStorage.getItem(this._lsKey('registry'));
      if (reg) this._cases = JSON.parse(reg).cases || [];
    } catch { /* registry will load from network */ }
  }

  _saveObservations() {
    try {
      localStorage.setItem(this._lsKey('observations'), JSON.stringify(this._observations));
    } catch (e) {
      this._toast('localStorage full — sync and consider dropping screenshots from old notes.');
    }
  }

  _saveRegistryCache() {
    try {
      localStorage.setItem(this._lsKey('registry'), JSON.stringify({ cases: this._cases }));
    } catch { /* cache miss is fine */ }
  }

  // ---------- registry ----------

  async _loadRegistry() {
    try {
      const res = await fetch(this.registryUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.cases) && data.cases.length) {
          this._cases = this._mergeRegistry(this._cases, data.cases);
          this._saveRegistryCache();
        }
      }
    } catch { /* offline: localStorage cache already loaded */ }
    this._renderTable();
  }

  /**
   * Merge server cases into local: server fields win for known ids, local
   * cases unknown to the server are kept (flagged localOnly), and per-case
   * status derived from local observations is reapplied. Observation history
   * lives in its own storage key, so a registry refresh can never lose it.
   */
  _mergeRegistry(localCases, serverCases) {
    const byId = new Map(localCases.map((c) => [c.id, c]));
    const merged = serverCases.map((sc) => {
      const local = byId.get(sc.id);
      byId.delete(sc.id);
      return { ...local, ...sc, status: this._derivedStatus(sc.id) || sc.status || 'untested' };
    });
    for (const orphan of byId.values()) merged.push({ ...orphan, localOnly: true });
    return merged;
  }

  _derivedStatus(caseId) {
    const forCase = this._observations.filter((o) => o.caseId === caseId);
    return forCase.length ? forCase[forCase.length - 1].verdict : null;
  }

  // ---------- rendering ----------

  _renderApp() {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="wrap">
        <h1>/tester — manual QA harness</h1>
        <div class="sub">
          ${escapeHtml(this.appId)} · signed in as ${escapeHtml(sessionStorage.getItem(this._ssKey('email')) || '')}
          · <span id="qa-pending"></span>
        </div>
        <div class="bar">
          <select id="f-area"><option value="">All areas</option></select>
          <select id="f-priority"><option value="">All priorities</option></select>
          <select id="f-status"><option value="">All statuses</option></select>
          <select id="f-observed"><option value="">All first-observed-by</option></select>
          <button class="primary" id="qa-sync" ${this.collectorUrl ? '' : 'disabled'}>Sync</button>
          <span class="muted" id="qa-sync-state">${this.collectorUrl ? '' : 'no collector-url set'}</span>
        </div>
        <div id="qa-table"></div>
      </div>`;
    this.shadowRoot.getElementById('qa-sync').addEventListener('click', () => this._sync());
    for (const key of ['area', 'priority', 'status', 'observed']) {
      this.shadowRoot.getElementById(`f-${key}`).addEventListener('change', (e) => {
        this._filters[key] = e.target.value;
        this._renderTable();
      });
    }
    this._renderTable();
  }

  _fillFilter(id, values) {
    const sel = this.shadowRoot.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    const first = sel.options[0].outerHTML;
    sel.innerHTML = first + values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    sel.value = current;
  }

  _renderTable() {
    const uniq = (fn) => [...new Set(this._cases.map(fn).filter(Boolean))].sort();
    this._fillFilter('f-area', uniq((c) => c.area));
    this._fillFilter('f-priority', uniq((c) => c.priority));
    this._fillFilter('f-status', uniq((c) => c.status || 'untested'));
    this._fillFilter('f-observed', uniq((c) => c.firstObservedBy));

    const pending = this._observations.filter((o) => !o.synced).length;
    const pendingEl = this.shadowRoot.getElementById('qa-pending');
    if (pendingEl) pendingEl.textContent = pending ? `${pending} observation(s) pending sync` : 'all observations synced';

    const f = this._filters;
    const rows = this._cases.filter((c) =>
      (!f.area || c.area === f.area) &&
      (!f.priority || c.priority === f.priority) &&
      (!f.status || (c.status || 'untested') === f.status) &&
      (!f.observedBy || c.firstObservedBy === f.observedBy));

    const host = this.shadowRoot.getElementById('qa-table');
    if (!host) return;
    host.innerHTML = `
      <table>
        <thead><tr>
          <th>id</th><th>title</th><th>area</th><th>priority</th><th>status</th><th>version</th><th>first observed by</th>
        </tr></thead>
        <tbody>
          ${rows.map((c) => this._rowHtml(c)).join('') || '<tr><td colspan="7" class="muted">No test cases match the filters.</td></tr>'}
        </tbody>
      </table>`;

    host.querySelectorAll('tr.case-row').forEach((tr) => {
      tr.addEventListener('click', () => {
        const id = tr.dataset.id;
        if (this._expanded.has(id)) this._expanded.delete(id);
        else this._expanded.add(id);
        this._renderTable();
      });
    });

    host.querySelectorAll('form.obs-form').forEach((form) => {
      form.addEventListener('submit', (e) => { e.preventDefault(); this._submitObservation(form); });
    });
  }

  _rowHtml(c) {
    const status = c.status || 'untested';
    const open = this._expanded.has(c.id);
    const main = `
      <tr class="case-row" data-id="${escapeHtml(c.id)}">
        <td>${escapeHtml(c.id)}${c.localOnly ? ' <span class="pill untested">local</span>' : ''}</td>
        <td>${escapeHtml(c.title)}</td>
        <td>${escapeHtml(c.area || '')}</td>
        <td><span class="pill ${escapeHtml(c.priority || 'medium')}">${escapeHtml(c.priority || '')}</span></td>
        <td><span class="pill ${escapeHtml(status)}">${escapeHtml(status)}</span></td>
        <td>${escapeHtml(c.version ?? '')}</td>
        <td>${escapeHtml(c.firstObservedBy || '')}</td>
      </tr>`;
    if (!open) return main;
    return main + `
      <tr class="detail"><td colspan="7">
        <strong>Steps to reproduce</strong>
        <ol class="steps">${(c.stepsToReproduce || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('') || '<li class="muted">none recorded</li>'}</ol>
        <strong>Expected result</strong>
        <div>${escapeHtml(c.expectedResult || '—')}</div>
        ${(c.history || []).length ? `<ul class="history">${c.history.map((h) =>
          `<li>${escapeHtml(h.at || '')} — ${escapeHtml(h.by || '')}: ${escapeHtml(h.note || '')}</li>`).join('')}</ul>` : ''}
        ${this._observationListHtml(c.id)}
        ${this._observationFormHtml(c.id)}
      </td></tr>`;
  }

  _observationListHtml(caseId) {
    const list = this._observations.filter((o) => o.caseId === caseId);
    if (!list.length) return '';
    return `<ul class="obs-list">${list.map((o) => `
      <li><span class="pill ${escapeHtml(o.verdict)}">${escapeHtml(o.verdict)}</span>
        ${escapeHtml(o.notes || '')}
        <span class="muted">${escapeHtml(o.observedAt)} ${o.synced ? '· synced' : '· pending'}</span>
        ${o.screenshotDataUrl ? `<img class="shot" src="${o.screenshotDataUrl}" alt="screenshot">` : ''}
      </li>`).join('')}</ul>`;
  }

  _observationFormHtml(caseId) {
    return `
      <form class="obs-form" data-case="${escapeHtml(caseId)}">
        <strong>Record observation</strong>
        <div class="verdicts">
          ${VERDICTS.map((v, i) => `<label><input type="radio" name="verdict" value="${v}" ${i === 0 ? 'checked' : ''}> ${v}</label>`).join('')}
        </div>
        <textarea name="notes" placeholder="Notes: what happened, what you expected…"></textarea>
        <div class="bar">
          <label class="muted">Screenshot <input type="file" name="screenshot" accept="image/*"></label>
          <button type="submit" class="primary">Save observation</button>
        </div>
      </form>`;
  }

  // ---------- observation capture ----------

  async _submitObservation(form) {
    const caseId = form.dataset.case;
    const verdict = form.querySelector('input[name="verdict"]:checked')?.value || 'needs-work';
    const notes = form.querySelector('textarea[name="notes"]').value.trim();
    const file = form.querySelector('input[name="screenshot"]').files[0];
    const screenshotDataUrl = file ? await this._fileToDataUrl(file) : null;

    const observation = {
      id: `local_${uuid()}`,
      caseId,
      verdict,
      notes,
      screenshotDataUrl,
      environment: {
        url: location.href,
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        appVersion: window.__APP_VERSION__ || null,
      },
      testerEmail: sessionStorage.getItem(this._ssKey('email')),
      observedAt: new Date().toISOString(),
      synced: false,
    };

    this._observations.push(observation);
    this._saveObservations();

    const target = this._cases.find((c) => c.id === caseId);
    if (target) {
      target.status = verdict;
      target.history = [...(target.history || []),
        { at: observation.observedAt, by: observation.testerEmail, note: `${verdict}${notes ? ` — ${notes.slice(0, 80)}` : ''}` }];
      this._saveRegistryCache();
    }

    this._toast('Observation saved locally.');
    this._renderTable();
    if (navigator.onLine) this._sync();
  }

  /** Downscale screenshots so data URLs do not blow up localStorage. */
  _fileToDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 1280;
          const scale = Math.min(1, maxW / img.width);
          if (scale === 1 && file.type === 'image/jpeg') return resolve(reader.result);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = () => resolve(reader.result);
        img.src = reader.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  // ---------- collector sync ----------

  async _sync() {
    if (this._syncing || !this.collectorUrl || !navigator.onLine) return;
    this._syncing = true;
    this._setSyncState('syncing…');
    try {
      const pending = this._observations.filter((o) => !o.synced);
      if (pending.length) {
        const res = await fetch(`${this.collectorUrl}/api/observations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...this._authHeaders() },
          body: JSON.stringify({
            appId: this.appId,
            testerEmail: sessionStorage.getItem(this._ssKey('email')),
            observations: pending.map(({ synced, ...rest }) => rest),
          }),
        });
        if (res.status === 401) {
          sessionStorage.removeItem(this._ssKey('unlocked'));
          this._toast('Collector rejected credentials — sign in again.');
          this._renderLogin('Session expired.');
          return;
        }
        if (!res.ok) throw new Error(`ingest failed: HTTP ${res.status}`);
        pending.forEach((o) => { o.synced = true; });
        this._saveObservations();
      }

      // Pull canonical registry updates; merge without losing local history.
      const reg = await fetch(`${this.collectorUrl}/api/test-cases/${encodeURIComponent(this.appId)}`, { cache: 'no-store' });
      if (reg.ok) {
        const data = await reg.json();
        if (Array.isArray(data.cases) && data.cases.length) {
          this._cases = this._mergeRegistry(this._cases, data.cases);
          this._saveRegistryCache();
        }
      }
      this._setSyncState(`synced ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      this._setSyncState(`sync failed: ${e.message}`);
    } finally {
      this._syncing = false;
      this._renderTable();
    }
  }

  _setSyncState(text) {
    const el = this.shadowRoot.getElementById('qa-sync-state');
    if (el) el.textContent = text;
  }

  _toast(text) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    this.shadowRoot.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
}

customElements.define('qa-tester', QaTester);
