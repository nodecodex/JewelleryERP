
  // ── Auth ────────────────────────────────────────────────────────────
  let SESSION_TOKEN = sessionStorage.getItem('SPERP_admin_token') || null;
  let adminNotes = {};

  async function doLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    const errEl    = document.getElementById('login-error');
    if (!username || !password) { showLoginError('Please enter username and password.'); return; }
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errEl.style.display = 'none';
    try {
      const r = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await r.json();
      if (!r.ok || !data.success) {
        showLoginError(data.message || 'Invalid credentials. Access denied.');
      } else {
        SESSION_TOKEN = data.token;
        sessionStorage.setItem('SPERP_admin_token', SESSION_TOKEN);
        showApp(username);
      }
    } catch(e) {
      showLoginError('Cannot connect to licensing server. Is it running?');
    }
    btn.disabled = false;
    btn.textContent = 'Sign In to Portal';
  }

  function showLoginError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function showApp(username) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    document.getElementById('admin-name-display').textContent = username;
    document.getElementById('topbar-admin').textContent = username;
    loadAllData();
  }

  function doLogout() {
    sessionStorage.removeItem('SPERP_admin_token');
    SESSION_TOKEN = null;
    document.getElementById('app').classList.remove('visible');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').style.display = 'none';
  }

  // ── Restore session if already logged in ────────────────────────────
  if (SESSION_TOKEN) {
    // Verify token is still valid
    fetch('/api/v1/admin/dashboard-stats', { headers: { Authorization: 'Bearer ' + SESSION_TOKEN } })
      .then(r => {
        if (r.status === 401) { doLogout(); }
        else { showApp(sessionStorage.getItem('SPERP_admin_user') || 'Admin'); }
      }).catch(() => {});
  }

  // ── API helper (always includes auth token) ─────────────────────────
  async function api(url, method = 'GET', body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SESSION_TOKEN
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(url, opts);
    if (r.status === 401) { doLogout(); throw new Error('Session expired. Please log in again.'); }
    return r.json();
  }

  // ── Tab Switching ───────────────────────────────────────────────────
  function switchTab(name, btn) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    btn.classList.add('active');
    document.getElementById('topbar-label').textContent =
      btn.textContent.replace(/[▌⏰🔑🔘▶♻🔓🔒]/g, '').trim() + ' Panel';
  }

  // ── Data ────────────────────────────────────────────────────────────
  let allCustomers=[], allLicenses=[], allTransfers=[], allTrials=[], allAudits=[], stats={};

  async function loadAllData() {
    await Promise.all([fetchStats(),fetchCustomers(),fetchLicenses(),fetchTransfers(),fetchTrials(),fetchAudits()]);
    renderAll();
  }
  async function fetchStats()     { try { stats        = await api('/api/v1/admin/dashboard-stats'); } catch(e){} }
  async function fetchCustomers() { try { allCustomers = await api('/api/v1/admin/customers'); } catch(e){} }
  async function fetchLicenses()  { try { allLicenses  = await api('/api/v1/admin/licenses'); } catch(e){} }
  async function fetchTransfers() { try { allTransfers = await api('/api/v1/admin/transfers'); } catch(e){} }
  async function fetchTrials()    { try { allTrials    = await api('/api/v1/admin/trials'); } catch(e){} }
  async function fetchAudits()    { try { allAudits    = await api('/api/v1/admin/audit-logs'); } catch(e){} }

  function renderAll() { renderStats(); renderCustomers(); renderLicenses(); renderTransfers(); renderTrials(); renderAudits(); renderDashTransfers(); }

  function renderStats() {
    document.getElementById('stat-commercial').textContent = stats.totalCommercial ?? 0;
    document.getElementById('stat-active-sub').textContent = (stats.activeCommercial ?? 0) + ' Active Devices';
    document.getElementById('stat-trials').textContent = stats.trialUsers ?? 0;
    document.getElementById('stat-expired').textContent = stats.expiredTrials ?? 0;
    document.getElementById('stat-transfers').textContent = stats.pendingTransfers ?? 0;
    const p = stats.pendingTransfers ?? 0;
    const b = document.getElementById('transfer-badge');
    b.textContent = p; b.style.display = p > 0 ? 'inline' : 'none';
  }

  function renderCustomers() {
    const el = document.getElementById('customers-tbody');
    document.getElementById('cust-count').textContent = allCustomers.length;
    const sel = document.getElementById('gen-customer');
    sel.innerHTML = '<option value="">-- Choose Customer --</option>';
    allCustomers.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.name} (${c.mobile})</option>`);
    if (!allCustomers.length) { el.innerHTML = '<tr><td colspan="4" class="empty">No customers yet.</td></tr>'; return; }
    el.innerHTML = allCustomers.map(c => `<tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td class="mono">${esc(c.mobile)}</td>
      <td style="color:var(--muted)">${esc(c.email||'—')}</td>
      <td style="color:var(--muted)">${fmtDate(c.created_at)}</td></tr>`).join('');
  }

  function renderLicenses() {
    const el = document.getElementById('licenses-tbody');
    document.getElementById('lic-count').textContent = allLicenses.length;
    if (!allLicenses.length) { el.innerHTML = '<tr><td colspan="5" class="empty">No licenses yet.</td></tr>'; return; }
    el.innerHTML = allLicenses.map(l => `<tr>
      <td><div style="font-weight:700">${esc(l.customer_name||'—')}</div><div style="color:var(--muted);font-size:10px">${esc(l.customer_mobile||'')}</div></td>
      <td class="mono" style="color:var(--amber);user-select:all;font-size:11px">${esc(l.license_key)}</td>
      <td style="text-transform:uppercase;font-size:10px;color:var(--muted)">${l.license_type}</td>
      <td>${statusTag(l.status)}</td>
      <td>${l.status!=='suspended'?`<button class="btn btn-red" style="font-size:9px;padding:4px 10px" onclick="suspendLicense('${l.id}')">Suspend</button>`:'<span style="color:var(--muted);font-size:10px">Suspended</span>'}</td></tr>`).join('');
  }

  function renderTransfers() {
    const el = document.getElementById('transfers-list');
    if (!allTransfers.length) { el.innerHTML = '<div class="empty">No transfer requests.</div>'; return; }
    el.innerHTML = allTransfers.map(t => `
      <div class="transfer-row">
        <div class="transfer-meta">
          <span>Key: <span class="mono" style="color:var(--amber)">${esc(t.license_key)}</span></span>
          <span style="color:var(--muted)">|</span>
          <span style="color:var(--sub)">"${esc(t.reason)}"</span>
          <span style="margin-left:auto">${fmtDate(t.requested_at)}</span>
          <span>${statusTag(t.status)}</span>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:10px">
          Old HW: <span class="mono">${(t.old_device_hash||'').slice(0,20)}…</span> &rarr;
          New HW: <span class="mono">${(t.new_device_hash||'').slice(0,20)}…</span>
        </div>
        ${t.status==='pending'?`<div class="transfer-actions">
          <input class="transfer-note" type="text" placeholder="Admin review note..." oninput="adminNotes['${t.id}']=this.value">
          <button class="btn btn-green" onclick="approveTransfer('${t.id}')">&#10003; Approve</button>
          <button class="btn btn-red" onclick="rejectTransfer('${t.id}')">&#10007; Reject</button>
        </div>`:`<div style="font-size:10px;color:var(--muted)">${t.admin_note?'Note: '+esc(t.admin_note):''}</div>`}
      </div>`).join('');
  }

  function renderDashTransfers() {
    const el = document.getElementById('dash-transfers-list');
    const pending = allTransfers.filter(t => t.status==='pending');
    if (!pending.length) { el.innerHTML = '<div class="empty">No pending transfer requests.</div>'; return; }
    el.innerHTML = pending.map(t => `
      <div class="transfer-row">
        <div class="transfer-meta">
          <span>Key: <span class="mono" style="color:var(--amber)">${esc(t.license_key)}</span></span>
          <span style="color:var(--muted)">|</span>
          <span style="color:var(--sub)">"${esc(t.reason)}"</span>
          <span style="margin-left:auto">${fmtDate(t.requested_at)}</span>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:10px">
          Old: <span class="mono">${(t.old_device_hash||'').slice(0,20)}…</span> &rarr;
          New: <span class="mono">${(t.new_device_hash||'').slice(0,20)}…</span>
        </div>
        <div class="transfer-actions">
          <input class="transfer-note" type="text" placeholder="Admin note..." oninput="adminNotes['${t.id}']=this.value">
          <button class="btn btn-green" onclick="approveTransfer('${t.id}')">&#10003; Approve</button>
          <button class="btn btn-red" onclick="rejectTransfer('${t.id}')">&#10007; Reject</button>
        </div>
      </div>`).join('');
  }

  function renderTrials() {
    const el = document.getElementById('trials-tbody');
    document.getElementById('trial-count').textContent = allTrials.length;
    if (!allTrials.length) { el.innerHTML = '<tr><td colspan="5" class="empty">No trial records.</td></tr>'; return; }
    el.innerHTML = allTrials.map(t => {
      const expired = t.is_expired || (new Date() > new Date(t.expiry_date));
      return `<tr>
        <td class="mono" style="font-size:10px;user-select:all;color:var(--sub)">${esc(t.device_hash)}</td>
        <td style="text-transform:uppercase;color:var(--muted)">${esc(t.os_platform)}</td>
        <td style="color:var(--muted)">${fmtDate(t.installation_date)}</td>
        <td style="font-weight:700">${fmtDate(t.expiry_date)}</td>
        <td>${expired?'<span class="tag tag-red">Expired</span>':'<span class="tag tag-blue">Active</span>'}</td></tr>`;
    }).join('');
  }

  function renderAudits() {
    const el = document.getElementById('audit-list');
    if (!allAudits.length) { el.innerHTML = '<div class="empty">No audit events.</div>'; return; }
    el.innerHTML = allAudits.map(a => `
      <div class="audit-item">
        <div><span class="audit-tag">${esc(a.action_type)}</span><div class="audit-detail">${esc(a.details||'—')}</div></div>
        <div class="audit-time"><div style="font-weight:700;color:var(--sub)">${esc(a.performed_by)}</div><div>${fmtDate(a.created_at)}</div></div>
      </div>`).join('');
  }

  // ── Actions ─────────────────────────────────────────────────────────
  async function createCustomer() {
    const name=document.getElementById('cust-name').value.trim(), mobile=document.getElementById('cust-mobile').value.trim(), email=document.getElementById('cust-email').value.trim();
    const res=document.getElementById('cust-result');
    if (!name||!mobile){res.innerHTML='<div class="alert alert-error">Name and mobile are required.</div>';return;}
    try {
      const data=await api('/api/v1/admin/customers','POST',{name,mobile,email});
      if (data.id){res.innerHTML='<div class="alert alert-success">Customer saved!</div>';document.getElementById('cust-name').value='';document.getElementById('cust-mobile').value='';document.getElementById('cust-email').value='';await fetchCustomers();renderCustomers();}
      else res.innerHTML=`<div class="alert alert-error">${data.error||'Failed.'}</div>`;
    } catch(e){res.innerHTML=`<div class="alert alert-error">${e.message}</div>`;}
  }

  async function generateLicense() {
    const customerId=document.getElementById('gen-customer').value,licenseType=document.getElementById('gen-type').value,maxDevices=document.getElementById('gen-devices').value,expiryDays=document.getElementById('gen-expiry').value;
    const res=document.getElementById('gen-result');
    if (!customerId){res.innerHTML='<div class="alert alert-error">Please select a customer.</div>';return;}
    try {
      const data=await api('/api/v1/admin/licenses/generate','POST',{customerId,licenseType,maxDevices:parseInt(maxDevices),expiryDays});
      if (data.license_key){res.innerHTML=`<div class="alert alert-success">&#128273; Key:<br><strong style="font-family:monospace;color:var(--amber);user-select:all">${data.license_key}</strong></div>`;await fetchLicenses();renderLicenses();await fetchStats();renderStats();}
      else res.innerHTML=`<div class="alert alert-error">${data.error||'Failed.'}</div>`;
    } catch(e){res.innerHTML=`<div class="alert alert-error">${e.message}</div>`;}
  }

  async function suspendLicense(id) {
    if (!confirm('Suspend this license? Customer app will lock on next check.')) return;
    try {await api('/api/v1/admin/licenses/deactivate','POST',{licenseId:id});await fetchLicenses();renderLicenses();await fetchStats();renderStats();}
    catch(e){alert('Error: '+e.message);}
  }

  async function approveTransfer(id) {
    const note=adminNotes[id]||'Approved via Admin Portal';
    try {const data=await api('/api/v1/admin/transfers/approve','POST',{requestId:id,adminNote:note});if(data.success){await fetchTransfers();fetchStats();renderTransfers();renderDashTransfers();renderStats();}else alert(data.error||'Failed');}
    catch(e){alert('Error: '+e.message);}
  }

  async function rejectTransfer(id) {
    const note=adminNotes[id]||'Rejected via Admin Portal';
    try {const data=await api('/api/v1/admin/transfers/reject','POST',{requestId:id,adminNote:note});if(data.success){await fetchTransfers();fetchStats();renderTransfers();renderDashTransfers();renderStats();}else alert(data.error||'Failed');}
    catch(e){alert('Error: '+e.message);}
  }

  function toggleExpiry() {
    document.getElementById('expiry-group').style.display=document.getElementById('gen-type').value==='subscription'?'block':'none';
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function fmtDate(d){if(!d)return'—';try{return new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}catch(e){return d;}}
  function statusTag(s){const m={active:'tag-green',activated:'tag-green',approved:'tag-green',suspended:'tag-red',expired:'tag-red',rejected:'tag-red',issued:'tag-blue',pending:'tag-amber'};return`<span class="tag ${m[s]||'tag-blue'}">${s||'—'}</span>`;}

