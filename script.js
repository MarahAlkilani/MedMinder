function toggleSidebar() {
    const sb = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sb.classList.toggle('active');
    overlay.classList.toggle('active');
}

function initTheme() {
    const savedTheme = localStorage.getItem('mm_theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('mm_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    const loginIcon = document.getElementById('login-theme-icon');
    if(theme === 'dark') {
        if(icon) icon.className = 'fa-solid fa-sun';
        if(text) text.innerText = 'Light Mode';
        if(loginIcon) loginIcon.className = 'fa-solid fa-sun';
    } else {
        if(icon) icon.className = 'fa-solid fa-moon';
        if(text) text.innerText = 'Dark Mode';
        if(loginIcon) loginIcon.className = 'fa-solid fa-moon';
    }
}
const DB = {
    users: JSON.parse(localStorage.getItem('mm_users')) || [],
    relations: JSON.parse(localStorage.getItem('mm_rels')) || [], 
    messages: JSON.parse(localStorage.getItem('mm_msgs')) || [],
    notifications: JSON.parse(localStorage.getItem('mm_notifs')) || [] 
};
let session = JSON.parse(localStorage.getItem('mm_sess')) || null;
let activeChat = null;
let historyChart = null; 
let patientTrendChart = null;
let patientAdherenceChart = null;
let supervisorPrimaryChart = null;
let supervisorSecondaryChart = null;
function showCustomAlert(title, msg) {
    document.getElementById('custom-alert-title').innerText = title;
    document.getElementById('custom-alert-msg').innerText = msg;
    document.getElementById('custom-alert').classList.remove('hidden');
}
function closeCustomAlert() { document.getElementById('custom-alert').classList.add('hidden'); }
function triggerForgot() {
    const u = document.getElementById('auth-user').value;
    let msg = u ? `Email sent to address associated with: ${u}.` : "Email sent to registered address.";
    showCustomAlert('Password Reset', msg);
}
function switchAuth(mode) {
    const isReg = mode === 'register';
    document.getElementById('register-fields').className = isReg ? '' : 'hidden';
    const forgotLink = document.getElementById('forgot-link');
    if(forgotLink) forgotLink.style.display = isReg ? 'none' : 'block';
    const tabReg = document.getElementById('tab-register');
    const tabLog = document.getElementById('tab-login');
    if(isReg) {
        tabReg.style.background = 'var(--card-bg)'; tabReg.style.boxShadow = 'var(--shadow)'; tabReg.style.color = 'var(--primary)';
        tabLog.style.background = 'transparent'; tabLog.style.boxShadow = 'none'; tabLog.style.color = 'var(--text-muted)';
    } else {
        tabLog.style.background = 'var(--card-bg)'; tabLog.style.boxShadow = 'var(--shadow)'; tabLog.style.color = 'var(--primary)';
        tabReg.style.background = 'transparent'; tabReg.style.boxShadow = 'none'; tabReg.style.color = 'var(--text-muted)';
    }
}

function handleAuth(e) {
    e.preventDefault();
    const u = document.getElementById('auth-user').value;
    const p = document.getElementById('auth-pass').value;
    const isReg = !document.getElementById('register-fields').classList.contains('hidden');

    if(isReg) {
        const name = document.getElementById('reg-name').value;
        const role = document.getElementById('reg-role').value;
        if(DB.users.find(x => x.username === u)) return showCustomAlert('Error', 'Username exists');
        const newUser = {
            username: u, password: p, name: name, role: role,
            profile: { dob:'', blood:'', height:'', weight:'', allergies:'', conditions:'', ecName:'', ecPhone:'' },
            vitals: [],
            medications: [] 
        };
        DB.users.push(newUser);
        save();
        login(newUser);
    } else {
        const found = DB.users.find(x => x.username === u && x.password === p);
        if(found) login(found); else showCustomAlert('Access Denied', 'Invalid credentials');
    }
}

function login(user) {
    session = user;
    localStorage.setItem('mm_sess', JSON.stringify(user));
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('app-sidebar').classList.remove('hidden');
    document.getElementById('app-main').classList.remove('hidden');
    initApp();
}
function logout() { localStorage.removeItem('mm_sess'); location.reload(); }
function initApp() {
    document.getElementById('sb-name').innerText = session.name;
    document.getElementById('sb-role').innerText = session.role;
    
    document.getElementById('nav-directory').classList.add('hidden');
    document.getElementById('nav-profile').classList.add('hidden');
    document.getElementById('dash-patient').classList.add('hidden');
    document.getElementById('dash-supervisor').classList.add('hidden');
    document.getElementById('caregiver-alerts-section').classList.add('hidden');
    document.getElementById('sos-btn').classList.add('hidden');

    const badge = document.getElementById('portal-badge');

    if(session.role === 'patient') {
        badge.innerText = 'PATIENT PORTAL';
        badge.style.background = 'var(--primary-light)'; badge.style.color = 'var(--primary)';
        document.getElementById('sos-btn').classList.remove('hidden');
        document.getElementById('dash-patient').classList.remove('hidden');
        document.getElementById('nav-profile').classList.remove('hidden');
        loadPatientDash();
    } else {
        if(session.role === 'caregiver') {
            badge.innerText = 'CAREGIVER ACCESS';
            badge.style.background = 'var(--caregiver-bg)'; badge.style.color = 'var(--caregiver)';
            document.getElementById('caregiver-alerts-section').classList.remove('hidden');
            loadAlerts();
        } else {
            badge.innerText = 'DOCTOR PORTAL';
            badge.style.background = 'var(--primary-light)'; badge.style.color = 'var(--primary)';
            document.getElementById('nav-directory').classList.remove('hidden');
        }
        document.getElementById('dash-supervisor').classList.remove('hidden');
        loadSupervisorDash();
    }
    nav('dashboard');
}

function nav(view) {
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navId = view === 'dashboard' ? 'nav-dash' : (view === 'directory' ? 'nav-directory' : (view === 'profile' ? 'nav-profile' : ''));
    if(navId) document.getElementById(navId).classList.add('active');
    
    if(view === 'profile' && session.role === 'patient') loadProfile();
    if(view === 'directory' && session.role === 'doctor') loadDirectory();
    if(view === 'messages') loadChatList();
    
    if(window.innerWidth <= 768) {
        document.getElementById('app-sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }
}
const themeColors = {
    primary: '#0284c7',
    primaryLight: '#e0f2fe',
    danger: '#e11d48',
    success: '#0d9488',
    caregiver: '#8b5cf6',
    neutral: '#cbd5e1'
};

function renderPatientCharts() {
    const ctxTrend = document.getElementById('patientTrendChart');
    const ctxTrendContext = ctxTrend.getContext('2d');
    const gradient = ctxTrendContext.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(2, 132, 199, 0.5)'); 
    gradient.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

    if (patientTrendChart) patientTrendChart.destroy();

    const vitals = session.vitals.sort((a,b) => new Date(a.date) - new Date(b.date)); 
    const labels = vitals.map(v => v.date.split(',')[0]); 
    const datasetValues = vitals.map(v => parseFloat(v.val) || 0);

    patientTrendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: labels.slice(-10), 
            datasets: [{
                label: 'Recent Vital Readings',
                data: datasetValues.slice(-10),
                borderColor: themeColors.primary,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
    const ctxAdhere = document.getElementById('patientAdherenceChart');
    if (patientAdherenceChart) patientAdherenceChart.destroy();
    
    const meds = session.medications || [];
    const taken = meds.filter(m => m.taken).length;
    const pending = meds.length - taken;

    patientAdherenceChart = new Chart(ctxAdhere, {
        type: 'doughnut',
        data: {
            labels: ['Taken', 'Pending'],
            datasets: [{
                data: meds.length ? [taken, pending] : [0, 1], 
                backgroundColor: meds.length ? [themeColors.success, themeColors.neutral] : [themeColors.neutral, themeColors.neutral],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position:'bottom' } } }
    });
}

function renderSupervisorCharts() {
    const isDoctor = session.role === 'doctor';
    const ctx1 = document.getElementById('supervisorPrimaryChart');
    const ctx2 = document.getElementById('supervisorSecondaryChart');
    
    if (supervisorPrimaryChart) supervisorPrimaryChart.destroy();
    if (supervisorSecondaryChart) supervisorSecondaryChart.destroy();

    const myRelations = DB.relations.filter(r => r.doc === session.username && (r.status === 'active' || isDoctor));
    const myPatientIds = myRelations.map(r => r.pat);
    const myPatients = DB.users.filter(u => myPatientIds.includes(u.username));

    if(isDoctor) {
        const patNames = myPatients.map(p => p.name);
        const rxCounts = myPatients.map(p => (p.medications ? p.medications.length : 0));

        supervisorPrimaryChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: patNames,
                datasets: [{
                    label: 'Prescriptions Count',
                    data: rxCounts,
                    backgroundColor: themeColors.primary,
                    borderRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Prescription Rate per Patient' } } }
        });
        let critical = 0, normal = 0;
        myPatients.forEach(p => {
            const lastVital = p.vitals[0];
            if(lastVital && lastVital.status === 'Critical') critical++; else normal++;
        });

        supervisorSecondaryChart = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: ['Critical', 'Stable'],
                datasets: [{
                    data: [critical, normal],
                    backgroundColor: [themeColors.danger, themeColors.success] // Rose vs Teal
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Patient Status Distribution' } } }
        });

    } else {
        const myAlerts = DB.notifications.filter(n => n.to === session.username);
        const dateCounts = {};
        myAlerts.forEach(a => {
            const d = a.date.split(',')[0];
            dateCounts[d] = (dateCounts[d] || 0) + 1;
        });

        supervisorPrimaryChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: Object.keys(dateCounts),
                datasets: [{
                    label: 'Alert Frequency',
                    data: Object.values(dateCounts),
                    backgroundColor: themeColors.danger
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Alerts Received' } } }
        });

        let totalTasks = 0, completedTasks = 0;
        myPatients.forEach(p => {
            if(p.medications) {
                totalTasks += p.medications.length;
                completedTasks += p.medications.filter(m => m.taken).length;
            }
        });

        supervisorSecondaryChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Meds Taken', 'Pending'],
                datasets: [{
                    data: [completedTasks, totalTasks - completedTasks],
                    backgroundColor: [themeColors.caregiver, themeColors.neutral] 
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Overall Patient Adherence' } } }
        });
    }
}

function loadPatientDash() {
    const requests = DB.relations.filter(r => r.pat === session.username && r.status === 'pending');
    const reqArea = document.getElementById('patient-requests-area');
    if(requests.length > 0) {
        reqArea.innerHTML = requests.map(r => {
            const requester = DB.users.find(u => u.username === r.doc);
            return `<div class="req-badge"><div><strong><i class="fa-solid fa-user-plus"></i> Connection Request</strong><br><small><strong>${requester.name}</strong> (${requester.role}) wants to monitor you.</small></div><div style="display:flex; gap:10px;"><button class="btn btn-primary btn-sm" onclick="handleRequest('${r.doc}', 'accept')">Accept</button><button class="btn btn-danger btn-sm" onclick="handleRequest('${r.doc}', 'reject')">Reject</button></div></div>`;
        }).join('');
    } else { reqArea.innerHTML = ''; }

    const myRelations = DB.relations.filter(r => r.pat === session.username && (r.status === 'active' || r.status === undefined)); 
    const docArea = document.getElementById('assigned-doc-area');
    if(myRelations.length > 0) {
        docArea.innerHTML = myRelations.map(rel => {
            const su = DB.users.find(u => u.username === rel.doc);
            const icon = su.role === 'doctor' ? 'fa-user-doctor' : 'fa-hand-holding-heart';
            const color = su.role === 'doctor' ? 'var(--primary)' : 'var(--caregiver)';
            const bg = su.role === 'doctor' ? 'var(--primary-light)' : 'var(--caregiver-bg)';
            return `<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid var(--border);"><div style="background:${bg}; padding:10px; border-radius:50%; color:${color};"><i class="fa-solid ${icon}"></i></div><div><strong>${su.name}</strong> <span style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted);">(${su.role})</span><br><small onclick="openChat('${su.username}')" style="cursor:pointer; color:var(--primary); font-weight:bold;">Message</small></div></div>`;
        }).join('');
    } else { docArea.innerHTML = 'No care team connected yet.'; }
    renderLogs(session.vitals, 'patient-logs');
    renderMedsPatient(session.medications);
    renderPatientCharts();
}

function handleRequest(docId, action) {
    const relIdx = DB.relations.findIndex(r => r.pat === session.username && r.doc === docId);
    if(relIdx > -1) {
        if(action === 'accept') { DB.relations[relIdx].status = 'active'; showCustomAlert('Success', 'Request Accepted'); }
        else { DB.relations.splice(relIdx, 1); showCustomAlert('Rejected', 'Request Rejected'); }
        save(); loadPatientDash();
    }
}

function toggleMedStatus(targetPatId, medName) {
    const patIdx = DB.users.findIndex(u => u.username === targetPatId);
    if(patIdx > -1) {
        const med = DB.users[patIdx].medications.find(m => m.name === medName);
        if(med) {
            med.taken = !med.taken;
            if(session.username === targetPatId) session.medications = DB.users[patIdx].medications;
            save();
            if(session.role === 'patient') loadPatientDash(); else loadSupervisorDash();
        }
    }
}

function renderMedsPatient(meds) {
    const el = document.getElementById('med-list');
    if(!meds || meds.length === 0) { el.innerHTML = `<p style="color:var(--text-muted); font-style:italic;">No medications assigned.</p>`; return; }
    el.innerHTML = meds.map(m => `
        <div class="med-row">
            <div class="med-details"><strong style="text-decoration: ${m.taken ? 'line-through' : 'none'}; color: ${m.taken ? 'var(--text-muted)' : 'var(--text-main)'}">${m.name}</strong><span class="med-dose">${m.dose}</span></div>
            <div style="display:flex; align-items:center; gap:10px;"><span style="font-size:0.8rem; color:${m.taken ? 'var(--success)' : 'var(--danger)'}">${m.taken ? 'Taken' : 'Pending'}</span><input type="checkbox" class="med-checkbox" ${m.taken ? 'checked' : ''} onchange="toggleMedStatus('${session.username}', '${m.name}')"></div>
        </div>
    `).join('');
}

function addVital() {
    const type = document.getElementById('vital-type').value;
    const val = document.getElementById('vital-val').value;
    const note = document.getElementById('vital-note').value;
    if(!val) return;
    let status = 'Normal'; const numVal = parseFloat(val);
    if (type.includes('Heart Rate') && (numVal > 100 || numVal < 50)) status = 'Critical';
    else if (type.includes('Oxygen') && numVal < 95) status = 'Critical';
    else if (type.includes('Temperature') && (numVal > 37.5 || numVal < 35)) status = 'Critical';
    else if (type.includes('Glucose') && (numVal > 180 || numVal < 70)) status = 'Critical';
    else if (type.includes('Blood Pressure') && val.includes('/')) {
        const [sys, dia] = val.split('/').map(x => parseInt(x));
        if(sys > 140 || dia > 90 || sys < 90 || dia < 60) status = 'Critical';
    }
    if(status === 'Critical') {
        showCustomAlert('Critical Alert', '⚠️ Critical Vitals detected! Alert sent to Care Team.');
        createNotification(session.username, 'Critical Vitals Recorded: ' + type + ' - ' + val);
    }
    const entry = { type, val, note, status, date: new Date().toLocaleString() };
    session.vitals.unshift(entry);
    const idx = DB.users.findIndex(u => u.username === session.username);
    DB.users[idx] = session;
    save();
    renderLogs(session.vitals, 'patient-logs');
    renderPatientCharts();
    document.getElementById('vital-val').value = '';
}

function createNotification(patientId, msg) {
    const sups = DB.relations.filter(r => r.pat === patientId && (r.status === 'active' || r.status === undefined));
    sups.forEach(rel => { DB.notifications.push({ to: rel.doc, from: patientId, msg: msg, date: new Date().toLocaleString() }); });
    save();
}

function renderLogs(logs, containerId) {
    const el = document.getElementById(containerId);
    const recent = logs.slice(0, 3);
    el.innerHTML = recent.map(l => `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border);"><div><div style="font-weight:600;">${l.type}</div><div style="font-size:0.8rem; color:var(--text-muted);">${l.date} ${l.note ? `• ${l.note}` : ''}</div></div><div style="text-align:right;"><div style="font-weight:700; font-size:1.1rem;">${l.val}</div><span class="vital-badge ${l.status === 'Critical' ? 'status-critical' : 'status-normal'}">${l.status}</span></div></div>`).join('');
}
function triggerSOS() { showCustomAlert('SOS Triggered', '🚨 EMERGENCY ALERT SENT!\nGPS Location and Profile shared with Emergency Contacts.'); createNotification(session.username, '🚨 SOS EMERGENCY ALERT TRIGGERED'); }

function loadProfile() {
    const p = session.profile;
    document.getElementById('prof-dob').value = p.dob;
    document.getElementById('prof-blood').value = p.blood;
    document.getElementById('prof-height').value = p.height;
    document.getElementById('prof-weight').value = p.weight;
    document.getElementById('prof-allergies').value = p.allergies;
    document.getElementById('prof-conditions').value = p.conditions;
    document.getElementById('prof-ec-name').value = p.ecName;
    document.getElementById('prof-ec-phone').value = p.ecPhone;
}
function saveProfile() {
    session.profile = {
        dob: document.getElementById('prof-dob').value,
        blood: document.getElementById('prof-blood').value,
        height: document.getElementById('prof-height').value,
        weight: document.getElementById('prof-weight').value,
        allergies: document.getElementById('prof-allergies').value,
        conditions: document.getElementById('prof-conditions').value,
        ecName: document.getElementById('prof-ec-name').value,
        ecPhone: document.getElementById('prof-ec-phone').value,
    };
    const idx = DB.users.findIndex(u => u.username === session.username);
    if (idx > -1) DB.users[idx] = session;
    save();
    showCustomAlert('Success', 'Profile Saved Successfully');
}

function loadAlerts() {
    const alerts = DB.notifications.filter(n => n.to === session.username);
    const el = document.getElementById('alerts-list');
    if(alerts.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);">No active alerts.</p>'; } 
    else {
        el.innerHTML = alerts.slice(-3).reverse().map(a => {
            const pat = DB.users.find(u => u.username === a.from);
            return `<div class="alert-item"><div style="font-size:1.5rem; color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="alert-content"><strong>${a.msg}</strong><br><small>Patient: ${pat ? pat.name : 'Unknown'} • ${a.date}</small></div></div>`;
        }).join('');
    }
}

function loadSupervisorDash() {
    const isDoctor = session.role === 'doctor';
    const container = document.getElementById('supervised-list');
    
    renderSupervisorCharts();

    if(!isDoctor) {
        const myRel = DB.relations.find(r => r.doc === session.username);
        if(!myRel) {
            container.innerHTML = `<div style="background:var(--input-bg); padding:30px; border-radius:12px; text-align:center;"><h3><i class="fa-solid fa-link"></i> Connect to a Patient</h3><p style="color:var(--text-muted); margin-bottom:20px;">You are not monitoring anyone. Enter a patient's username to send a request.</p><div style="display:flex; gap:10px; max-width:400px; margin:0 auto; flex-wrap:wrap;"><input type="text" id="req-pat-username" class="input-field" placeholder="Patient Username"><button class="btn btn-caregiver" onclick="sendConnectionRequest()">Request</button></div></div>`;
            return;
        }
        if(myRel.status === 'pending') {
            const pat = DB.users.find(u => u.username === myRel.pat);
            container.innerHTML = `<div style="background:var(--input-bg); padding:30px; border-radius:12px; text-align:center;"><h3 style="color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Request Pending...</h3><p>Waiting for <strong>${pat ? pat.name : myRel.pat}</strong> to accept your request.</p></div>`;
            return;
        }
    }

    const myPats = DB.relations.filter(r => r.doc === session.username && (r.status === 'active' || isDoctor || r.status === undefined));
    if(myPats.length === 0 && isDoctor) { container.innerHTML = '<p>No patients. Go to Directory to add one.</p>'; return; }

    container.innerHTML = myPats.map(rel => {
        const p = DB.users.find(u => u.username === rel.pat);
        if (!p.medications) p.medications = []; 
        const last = p.vitals[0] || {type:'N/A', val:'-'};
        let medListHTML = '';
        if (isDoctor) {
            medListHTML = p.medications.map(m => `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><span style="text-decoration: ${m.taken ? 'line-through' : 'none'}; color: ${m.taken ? 'var(--text-muted)' : 'var(--text-main)'}">${m.name} (${m.dose})</span><span style="font-size:0.7rem; padding:2px 6px; border-radius:4px; background:${m.taken ? 'var(--success-bg)' : '#fef3c7'}; color:${m.taken ? 'var(--success)' : '#d97706'}">${m.taken ? 'Taken' : 'Pending'}</span></li>`).join('') || '<small>No meds.</small>';
        } else {
            medListHTML = p.medications.map(m => `<li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;"><span style="text-decoration: ${m.taken ? 'line-through' : 'none'}; color: ${m.taken ? 'var(--text-muted)' : 'var(--text-main)'}">${m.name} (${m.dose})</span><div style="display:flex; align-items:center; gap:5px;"><span style="font-size:0.7rem; color:${m.taken ? 'var(--success)' : '#d97706'}">${m.taken ? 'Taken' : 'Pending'}</span><input type="checkbox" class="med-checkbox" style="width:16px; height:16px;" ${m.taken ? 'checked' : ''} onchange="toggleMedStatus('${p.username}', '${m.name}')"></div></li>`).join('') || '<small>No meds.</small>';
        }
        const addMedSection = isDoctor ? `<div style="background:var(--card-bg); padding:10px; border-radius:8px; margin-bottom:15px;"><small>Add Medication:</small><div style="display:flex; gap:5px; margin-top:5px;"><input type="text" id="new-med-name-${p.username}" placeholder="Name" class="input-field" style="padding:5px;"><input type="text" id="new-med-dose-${p.username}" placeholder="Dose" class="input-field" style="padding:5px;"></div><button class="btn btn-primary btn-sm" style="width:100%; margin-top:5px;" onclick="addPrescription('${p.username}')">Add Med</button></div>` : ``; 
        return `<div style="background:var(--input-bg); border:1px solid var(--border); border-radius:12px; padding:20px;"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><strong>${p.name}</strong><span style="font-size:0.8rem; background:var(--card-bg); padding:2px 8px; border:1px solid var(--border); border-radius:10px;">Age: ${getAge(p.profile.dob)}</span></div><div style="margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:10px;"><small style="color:var(--text-muted);">Health Summary (Meds):</small><ul style="margin:5px 0 0 15px; padding:0; font-size:0.85rem;">${medListHTML}</ul></div>${addMedSection}<div style="background:var(--card-bg); padding:10px; border-radius:8px; margin-bottom:15px;"><small>Latest Vital:</small><br><strong>${last.type}: ${last.val}</strong><br><span style="font-size:0.8rem; color:${last.status === 'Critical' ? 'var(--danger)' : 'var(--success)'}">${last.status || ''}</span></div><div style="display:flex; gap:10px;"><button class="btn btn-outline" style="flex:1; font-size:0.8rem;" onclick="openChat('${p.username}')">Message</button><button class="btn btn-primary" style="flex:1; font-size:0.8rem;" onclick="viewHistory('${p.username}')">View Full History</button></div></div>`;
    }).join('');
}

function sendConnectionRequest() {
    const patUsername = document.getElementById('req-pat-username').value.trim();
    if(!patUsername) return showCustomAlert('Error', 'Please enter a username');
    const targetPat = DB.users.find(u => u.username === patUsername && u.role === 'patient');
    if(!targetPat) return showCustomAlert('Error', 'Patient not found with this username.');
    DB.relations.push({ doc: session.username, pat: patUsername, status: 'pending' });
    save(); showCustomAlert('Success', 'Request sent!'); loadSupervisorDash();
}

function viewHistory(patUsername) {
    const p = DB.users.find(u => u.username === patUsername);
    const notifications = DB.notifications.filter(n => n.from === patUsername);
    const historyDiv = document.getElementById('history-content');
    
    const chartData = {};
    if(p.vitals && p.vitals.length > 0) {
        const sortedVitals = [...p.vitals].sort((a,b) => new Date(a.date) - new Date(b.date));
        sortedVitals.forEach(v => {
            if(!chartData[v.type]) chartData[v.type] = { dates: [], values: [] };
            chartData[v.type].dates.push(v.date);
            const val = parseFloat(v.val); 
            chartData[v.type].values.push(isNaN(val) ? 0 : val);
        });
    }

    let html = `<h3>History: ${p.name}</h3><div style="background:var(--card-bg); border:1px solid var(--border); padding:15px; border-radius:12px; margin-bottom:20px;"><h4 style="margin-top:0;"><i class="fa-solid fa-chart-line"></i> Visual Trends</h4><div style="position: relative; height:300px; width:100%;"><canvas id="vitalChart"></canvas></div></div><h4>Vitals Logs</h4>`;
    if(p.vitals && p.vitals.length > 0) {
        html += `<table class="history-table"><thead><tr><th>Date</th><th>Type</th><th>Value</th><th>Status</th></tr></thead><tbody>${p.vitals.map(v => `<tr><td>${v.date}</td><td>${v.type}</td><td>${v.val}</td><td style="color:${v.status==='Critical'?'red':'green'}">${v.status}</td></tr>`).join('')}</tbody></table>`;
    } else { html += `<p>No records.</p>`; }
    html += `<h4 style="margin-top:20px;">Alerts</h4>`;
    if(notifications.length > 0) {
        html += `<table class="history-table"><thead><tr><th>Date</th><th>Message</th></tr></thead><tbody>${notifications.map(n => `<tr><td>${n.date}</td><td>${n.msg}</td></tr>`).join('')}</tbody></table>`;
    } else { html += `<p>No alerts.</p>`; }

    historyDiv.innerHTML = html;
    document.getElementById('history-overlay').classList.remove('hidden');

    if(historyChart) { historyChart.destroy(); }
    const ctx = document.getElementById('vitalChart');
    if(ctx && Object.keys(chartData).length > 0) {
        const datasets = Object.keys(chartData).map((key, index) => {
            const colors = [themeColors.primary, themeColors.danger, themeColors.success, themeColors.caregiver];
            return { label: key, data: chartData[key].values, borderColor: colors[index % colors.length], backgroundColor: colors[index % colors.length], tension: 0.3, borderWidth: 2 };
        });
        const labels = chartData[Object.keys(chartData)[0]].dates.map(d => d.split(',')[0]); 
        historyChart = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: false } } } });
    }
}

function closeHistory() { document.getElementById('history-overlay').classList.add('hidden'); }
function addPrescription(patUsername) {
    const nameInput = document.getElementById(`new-med-name-${patUsername}`);
    const doseInput = document.getElementById(`new-med-dose-${patUsername}`);
    
    // Check if fields are empty
    if(!nameInput.value || !doseInput.value) return showCustomAlert('Error', "Fill both fields");

    const doseValue = parseFloat(doseInput.value);

    // If it's not a number (NaN) or less than or equal to 0
    if (isNaN(doseValue) || doseValue <= 0) {
        return showCustomAlert('Invalid Input', 'Dose must be a number greater than 0.');
    }

    const pIdx = DB.users.findIndex(u => u.username === patUsername);
    if(pIdx > -1) {
        if(!DB.users[pIdx].medications) DB.users[pIdx].medications = [];
        DB.users[pIdx].medications.push({ name: nameInput.value, dose: doseInput.value, taken: false, date: new Date().toLocaleDateString() });
        save(); loadSupervisorDash(); showCustomAlert('Success', "Added");
    }
}

function loadDirectory() {
    const list = document.getElementById('directory-list');
    const allPats = DB.users.filter(u => u.role === 'patient');
    list.innerHTML = allPats.map(p => {
        const amISupervising = DB.relations.find(r => r.pat === p.username && r.doc === session.username);
        let actionBtn = amISupervising ? '<span style="color:var(--success); font-weight:bold;"><i class="fa-solid fa-check"></i> Connected</span>' : `<button class="btn btn-primary btn-sm" onclick="supervise('${p.username}')">Supervise</button>`;
        return `<tr style="border-bottom:1px solid var(--border);"><td style="padding:10px;"><strong>${p.name}</strong><br><small style="color:var(--text-muted);">@${p.username}</small></td><td style="padding:10px;">${getAge(p.profile.dob)}</td><td style="padding:10px;">${p.profile.conditions || '-'}</td><td style="padding:10px;">${actionBtn}</td></tr>`;
    }).join('');
}

function supervise(patId) {
    const exists = DB.relations.find(r => r.pat === patId && r.doc === session.username);
    if(exists) return showCustomAlert('Error', "Already connected.");
    DB.relations.push({ doc: session.username, pat: patId, status: 'active' });
    save(); showCustomAlert('Success', 'Added'); loadDirectory();
}

function loadChatList() {
    const list = document.getElementById('chat-users');
    let peopleSet = new Set();
    const myUsername = session.username;

    // 1. Direct Connections (Patient <-> Doctor/Caregiver)
    if(session.role === 'patient') { 
        DB.relations.filter(r => r.pat === myUsername && r.status === 'active').forEach(r => peopleSet.add(r.doc)); 
    } else { 
        // If I am Doctor or Caregiver, add my patients
        DB.relations.filter(r => r.doc === myUsername && r.status === 'active').forEach(r => peopleSet.add(r.pat)); 
        
        // 2. INDIRECT CONNECTIONS (Doctor <-> Caregiver via common Patients)
        // First, find all my patients
        const myPatients = DB.relations
            .filter(r => r.doc === myUsername && r.status === 'active')
            .map(r => r.pat);
            
        // Now, find who else is monitoring these patients
        myPatients.forEach(patId => {
            // Find relations where pat is my patient, but doc is NOT me
            const colleagues = DB.relations
                .filter(r => r.pat === patId && r.doc !== myUsername && r.status === 'active')
                .map(r => r.doc);
            
            colleagues.forEach(colleagueId => peopleSet.add(colleagueId));
        });
    }

    const people = Array.from(peopleSet);
    
    if(people.length === 0) { 
        list.innerHTML = '<div style="padding:20px; color:var(--text-muted); text-align:center; font-style:italic;">No contacts yet.</div>'; 
        return; 
    }
    
    list.innerHTML = people.map(uid => { 
        const u = DB.users.find(x => x.username === uid); 
        if(!u) return ''; 
        
        // Set icon based on role
        let iconClass = 'fa-user';
        if(u.role === 'doctor') iconClass = 'fa-user-doctor';
        if(u.role === 'caregiver') iconClass = 'fa-hand-holding-heart';
        
        const isActive = activeChat === uid ? 'active' : '';

        // ** NEW LOGIC: SHOW PATIENT NAME IF USER IS CAREGIVER AND I AM DOCTOR **
        let roleDisplay = u.role;
        if(session.role === 'doctor' && u.role === 'caregiver') {
            // Find relations where this caregiver is monitoring a patient
            const linkedPatients = DB.relations
                .filter(r => r.doc === u.username && r.status === 'active')
                .map(r => DB.users.find(user => user.username === r.pat)) // Get patient object
                .filter(p => p !== undefined)
                .map(p => p.name); // Get just the name
            
            if(linkedPatients.length > 0) {
                roleDisplay = `Caregiver for: ${linkedPatients.join(', ')}`;
            }
        }

        return `
        <div class="chat-user-item ${isActive}" onclick="openChat('${uid}')">
            <div class="chat-avatar"><i class="fa-solid ${iconClass}"></i></div>
            <div class="chat-info">
                <div class="chat-name">${u.name}</div>
                <div class="chat-role">${roleDisplay}</div>
            </div>
        </div>`; 
    }).join('');
}

function openChat(targetId) { 
    activeChat = targetId; 
    const u = DB.users.find(x => x.username === targetId); 
    
    // Update Chat Title Header
    let iconClass = 'fa-user';
    if(u.role === 'doctor') iconClass = 'fa-user-doctor';
    if(u.role === 'caregiver') iconClass = 'fa-hand-holding-heart';
    
    document.getElementById('chat-title').innerHTML = `
        <div style="width:35px; height:35px; background:var(--primary); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center;">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <div>
            <div>${u.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:400; text-transform:uppercase;">${u.role}</div>
        </div>
    `; 
    
    nav('messages'); // Switch view if not already there
    loadChatList(); // Refresh list to update active class
    renderChat(); 
}

function renderChat() { 
    if(!activeChat) return; 
    const msgs = DB.messages.filter(m => (m.from === session.username && m.to === activeChat) || (m.from === activeChat && m.to === session.username)); 
    const box = document.getElementById('chat-box'); 
    box.innerHTML = msgs.map(m => `
        <div class="chat-bubble" style="align-self:${m.from === session.username ? 'flex-end' : 'flex-start'}; background:${m.from === session.username ? 'var(--primary)' : 'var(--input-bg)'}; color:${m.from === session.username ? '#fff' : 'var(--text-main)'}; padding:10px 14px; border-radius:12px;">
            ${m.txt}
        </div>
    `).join(''); 
    box.scrollTop = box.scrollHeight; 
}

function sendMsg() { 
    const txt = document.getElementById('msg-input').value; 
    if(!txt || !activeChat) return; 
    DB.messages.push({ from: session.username, to: activeChat, txt: txt, ts: Date.now() }); 
    save(); 
    document.getElementById('msg-input').value = ''; 
    renderChat(); 
}
function save() { localStorage.setItem('mm_users', JSON.stringify(DB.users)); localStorage.setItem('mm_rels', JSON.stringify(DB.relations)); localStorage.setItem('mm_msgs', JSON.stringify(DB.messages)); localStorage.setItem('mm_notifs', JSON.stringify(DB.notifications)); }
function getAge(dob) { if(!dob) return 'N/A'; const birthDate = new Date(dob); if(isNaN(birthDate.getTime())) return 'N/A'; const diff = Date.now() - birthDate.getTime(); const ageDate = new Date(diff); return Math.abs(ageDate.getUTCFullYear() - 1970); }

initTheme();
if(session) initApp();