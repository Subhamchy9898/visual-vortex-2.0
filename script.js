// script.js - Complete exam prep app logic (from user)

// === STATE MANAGEMENT ===
class AppState {
    constructor() {
        this.isLoggedIn = false;
        this.user = null;
        this.chapterProgress = 0; // 0-100
        this.goals = [];
        this.contentItems = [
            { id: 1, title: 'Physics: Mechanics', type: 'video' },
            { id: 2, title: 'Chemistry: Organic', type: 'notes' },
            { id: 3, title: 'Math: Calculus I', type: 'video' },
            { id: 4, title: 'Biology: Genetics', type: 'quiz' },
            { id: 5, title: 'Physics: Thermodynamics', type: 'notes' },
            { id: 6, title: 'English: Grammar', type: 'practice' }
        ];
        this.savedContent = []; // array of content ids
        this.likedContent = []; // array of content ids
        this.visits = []; // array of 'YYYY-MM-DD' strings marking dashboard visits
    }

    load() {
        const saved = localStorage.getItem('examPrepApp');
        if (saved) {
            const data = JSON.parse(saved);
            this.isLoggedIn = data.isLoggedIn || false;
            this.user = data.user || null;
            this.chapterProgress = data.chapterProgress || 0;
            this.goals = data.goals || [];
            this.savedContent = data.savedContent || [];
            this.likedContent = data.likedContent || [];
            this.visits = data.visits || [];
        }
    }

    save() {
        localStorage.setItem('examPrepApp', JSON.stringify({
            isLoggedIn: this.isLoggedIn,
            user: this.user,
            chapterProgress: this.chapterProgress,
            goals: this.goals
            ,savedContent: this.savedContent
            ,likedContent: this.likedContent
            ,visits: this.visits
        }));
    }

    login(email, password) {
        // Fake authentication
        this.user = { email };
        this.isLoggedIn = true;
        this.save();
    }

    logout() {
        this.isLoggedIn = false;
        this.user = null;
        this.chapterProgress = 0;
        this.goals = [];
        this.savedContent = [];
        this.likedContent = [];
        this.visits = [];
        localStorage.removeItem('examPrepApp');
        localStorage.removeItem('examPrepMilestones');
        localStorage.removeItem('weeklyGoals');
        localStorage.removeItem('amaRequests');
        localStorage.removeItem('merchRequests');
    }

    addGoal(text) {
        this.goals.push({ id: Date.now(), text, completed: false });
        this.save();
        this.updateProgress();
    }

    toggleSave(id) {
        const idx = this.savedContent.indexOf(id);
        if (idx === -1) this.savedContent.push(id);
        else this.savedContent.splice(idx,1);
        this.save();
    }

    toggleLike(id) {
        const idx = this.likedContent.indexOf(id);
        if (idx === -1) this.likedContent.push(id);
        else this.likedContent.splice(idx,1);
        this.save();
    }

    toggleGoal(id) {
        const goal = this.goals.find(g => g.id === id);
        if (goal) {
            goal.completed = !goal.completed;
            this.save();
            this.updateProgress();
            this.checkMilestones();
        }
    }

    updateProgress() {
        // Progress based on completed goals (max 100%)
        const completed = this.goals.filter(g => g.completed).length;
        const total = this.goals.length;
        if (total > 0) {
            // scale progress to full 0-100% based on completed goals
            this.chapterProgress = Math.min(100, Math.max(this.chapterProgress, (completed / total) * 100));
        }
        this.save();
    }

    checkMilestones() {
        const allGoalsComplete = this.goals.length > 0 && this.goals.every(g => g.completed);
        const chapterComplete = this.chapterProgress >= 100;
        // update milestone unlocked states based on progress
        try { updateMilestonesState(); updateMilestoneButtonBadge(); } catch (e) { /* safe fallback */ }
        if (allGoalsComplete || chapterComplete) {
            showMilestoneModal();
        }
    }
}

// === DOM MANIPULATION ===
// Toggle this to true if you want the app to reset stored data on every page load.
const RESET_ON_LOAD = false;
if (RESET_ON_LOAD) {
    try {
        localStorage.removeItem('examPrepApp');
        localStorage.removeItem('examPrepMilestones');
        localStorage.removeItem('weeklyGoals');
    } catch (e) {
        // ignore storage errors
    }
}

const state = new AppState();
state.load();

// Page switching
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const el = document.getElementById(pageId);
    if (el) el.classList.add('active');
    // If user opens dashboard, mark today's visit and update UI
    if (pageId === 'dashboardPage') {
        markTodayVisit();
        updateDashboard();
        try { renderWeekCalendar(); } catch (e) {}
    }
}

// Update dashboard visuals
function updateDashboard() {
    // Chapter progress
    const progressFill = document.getElementById('chapterProgress');
    const progressText = document.getElementById('progressPercent');
    const motivationalMsg = document.getElementById('motivationalMsg');
    const topProgress = document.getElementById('topProgress');
    if(progressFill) progressFill.style.width = state.chapterProgress + '%';
    if(progressText) progressText.textContent = state.chapterProgress + '%';
    if(topProgress) topProgress.textContent = state.chapterProgress + '%';
    
    const messages = [
        "You're getting there!",
        `You're ${state.chapterProgress}% closer to your goal`,
        "Great progress! Keep momentum.",
        "Almost there! You're doing amazing.",
        "Incredible work! Finish strong."
    ];
    const msgIndex = Math.min(Math.floor(state.chapterProgress / 25), messages.length - 1);
    if(motivationalMsg) motivationalMsg.textContent = messages[msgIndex];

    // Update hero welcome with name and visit stats
    try{
        const heroTitle = document.querySelector('.hero-title');
        const heroSub = document.querySelector('.hero-sub');
        const name = getFirstName();
        const totalVisits = (state.visits || []).length;
        const streak = computeStreak();
        if(heroTitle) heroTitle.textContent = name ? `Welcome, ${name}` : 'Motivation Dashboard';
        if(heroSub) heroSub.textContent = name ? `You've visited ${totalVisits} day${totalVisits!==1?'s':''} — current streak ${streak} day${streak!==1?'s':''}` : heroSub.textContent;
    } catch(e){}
}

// Render content grid
function renderContentGrid() {
    const grid = document.getElementById('contentGrid');
    if(!grid) return;
    grid.innerHTML = state.contentItems.map(item => {
        const saved = state.savedContent.includes(item.id);
        const liked = state.likedContent.includes(item.id);
        return `
        <div class="content-item" data-id="${item.id}">
            <h3>${item.title}</h3>
            <p>${item.type.toUpperCase()}</p>
            <div class="content-actions">
                <button class="icon-btn saved" title="Save" onclick="toggleSaveContent(${item.id}, this)">${saved ? '💾 Saved' : '💾 Save'}</button>
                <button class="icon-btn liked ${liked ? 'glow' : ''}" title="Like" onclick="toggleLikeContent(${item.id}, this)">${liked ? '❤️ Liked' : '♡ Like'}</button>
            </div>
        </div>
        `;
    }).join('');
}

// Render saved/liked quick cards counts
function renderSavedLikedCards() {
    const savedCount = document.getElementById('savedCount');
    const likedCount = document.getElementById('likedCount');
    if (savedCount) savedCount.textContent = `${state.savedContent.length} item${state.savedContent.length!==1?'s':''}`;
    if (likedCount) likedCount.textContent = `${state.likedContent.length} item${state.likedContent.length!==1?'s':''}`;
}

// ---------- Visit tracking & weekly calendar ----------
function isoDate(d){
    // Return local YYYY-MM-DD (avoid UTC-derived toISOString shifts)
    const dt = d ? new Date(d) : new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function markTodayVisit(){
    const today = isoDate();
    if (!state.visits.includes(today)){
        state.visits.push(today);
        state.save();
    }
    renderWeekCalendar();
    // compute streak and show arrival celebration
    const streak = computeStreak();
    try { const name = getFirstName(); showArrivalToast(name, streak); } catch(e){}
}

function getFirstName(){
    if(!state.user || !state.user.email) return '';
    const local = state.user.email.split('@')[0];
    const parts = local.split(/[._\-]/).filter(Boolean);
    const first = parts.length? parts[0] : local;
    return first.charAt(0).toUpperCase()+first.slice(1);
}

function computeStreak(){
    const set = new Set(state.visits || []);
    let streak = 0;
    const today = new Date();
    let d = new Date(today);
    while(true){
        const iso = isoDate(d);
        if(set.has(iso)) { streak++; d.setDate(d.getDate()-1); }
        else break;
    }
    return streak;
}

function showArrivalToast(name, streak){
    const el = document.getElementById('arrivalToast');
    if(!el) return;
    const displayName = name || 'Learner';
    const emoji = streak >= 3 ? '🎉' : '😊';
    el.innerHTML = `<div class="toast-inner">${emoji} Welcome ${displayName}! Streak: <strong>${streak}</strong> day${streak!==1?'s':''}</div>`;
    el.classList.add('active');
    setTimeout(()=> el.classList.remove('active'), 3500);
}

function showActionToast(message){
    const el = document.getElementById('arrivalToast');
    if(!el) return;
    el.innerHTML = `<div class="toast-inner">✅ ${message}</div>`;
    el.classList.add('active');
    setTimeout(()=> el.classList.remove('active'), 2000);
}

function getWeekDates(ref){
    const now = ref ? new Date(ref) : new Date();
    // week starts Monday
    const day = (now.getDay()+6)%7; // 0..6 where 0=Mon
    const monday = new Date(now);
    monday.setDate(now.getDate()-day);
    const arr = [];
    for(let i=0;i<7;i++){
        const d = new Date(monday);
        d.setDate(monday.getDate()+i);
        arr.push(isoDate(d));
    }
    return arr;
}

function renderWeekCalendar(){
    const cont = document.getElementById('weekCalendar');
    if (!cont) return;
    const week = getWeekDates();
    const names = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    cont.innerHTML = week.map((ds,i)=>{
        // parse YYYY-MM-DD as local date (avoid Date string parsing which can be UTC)
        const parts = ds.split('-').map(x => parseInt(x,10));
        const d = new Date(parts[0], parts[1]-1, parts[2]);
        const dayNum = d.getDate();
        const visited = state.visits.includes(ds);
        const cls = visited ? 'week-day visited' : 'week-day missed';
        return `<div class="${cls}" data-date="${ds}" onclick="toggleVisit('${ds}')"><span class="day-name">${names[i]}</span><span class="day-num">${dayNum}</span></div>`;
    }).join('');
    // small legend under calendar
    const legend = document.createElement('div');
    legend.className = 'week-legend';
    legend.innerHTML = `<span><span class="legend-dot green"></span>Visited</span><span><span class="legend-dot red"></span>Missed</span>`;
    // replace existing legend if present
    const existing = cont.nextElementSibling;
    if (existing && existing.classList && existing.classList.contains('week-legend')) existing.remove();
    cont.parentNode.insertBefore(legend, cont.nextSibling);
}

// Toggle a visit for a specific date (click calendar day to mark/unmark)
function toggleVisit(dateStr){
    const idx = state.visits.indexOf(dateStr);
    if (idx === -1){
        state.visits.push(dateStr);
    } else {
        state.visits.splice(idx,1);
    }
    state.save();
    renderWeekCalendar();
    updateDashboard();
}

// Helpers called from inline onclicks
function toggleSaveContent(id, btnEl) {
    const wasSaved = state.savedContent.includes(id);
    state.toggleSave(id);
    renderSavedLikedCards(); // update counts
    showActionToast(wasSaved ? 'Removed from saved' : 'Content saved!');
}

function toggleLikeContent(id, btnEl) {
    const wasLiked = state.likedContent.includes(id);
    state.toggleLike(id);
    renderSavedLikedCards(); // update counts
    const isLiked = state.likedContent.includes(id);
    btnEl.innerHTML = isLiked ? '❤️ Liked' : '♡ Like';
    if (isLiked) {
        btnEl.classList.add('glow');
    } else {
        btnEl.classList.remove('glow');
    }
    showActionToast(wasLiked ? 'Removed from liked' : 'Content liked!');
}

// Show saved / liked lists
function openSavedList() {
    const listEl = document.getElementById('savedList');
    if (!listEl) return;
    if (state.savedContent.length === 0) listEl.innerHTML = '<p class="empty-state">No saved items yet.</p>';
    else {
        listEl.innerHTML = state.savedContent.map(id => {
            const item = state.contentItems.find(c => c.id === id);
            return `<div class="content-item" onclick="showContentModalById(${id})">${item.title} <small style="color:#777">(${item.type})</small></div>`;
        }).join('');
    }
    const modal = document.getElementById('savedModal'); if(modal) modal.classList.add('active');
}

function openLikedList() {
    const listEl = document.getElementById('likedList');
    if (!listEl) return;
    if (state.likedContent.length === 0) listEl.innerHTML = '<p class="empty-state">No liked items yet.</p>';
    else {
        listEl.innerHTML = state.likedContent.map(id => {
            const item = state.contentItems.find(c => c.id === id);
            return `<div class="content-item" onclick="showContentModalById(${id})">${item.title} <small style="color:#777">(${item.type})</small></div>`;
        }).join('');
    }
    const modal = document.getElementById('likedModal'); if(modal) modal.classList.add('active');
}

function showContentModalById(id) {
    const content = state.contentItems.find(c => c.id === id);
    showContentModal(content);
}

// Render goals list
function renderGoals() {
    const list = document.getElementById('goalsList');
    if(!list) return;
    if (state.goals.length === 0) {
        list.innerHTML = '<p class="empty-state">Add your first weekly goal!</p>';
        return;
    }
    
    list.innerHTML = state.goals.map(goal => `
        <div class="goal-item">
            <input type="checkbox" class="goal-checkbox" ${goal.completed ? 'checked' : ''} 
                   onchange="state.toggleGoal(${goal.id})">
            <span class="goal-text ${goal.completed ? 'completed' : ''}">${goal.text}</span>
        </div>
    `).join('');
}

// === EVENT LISTENERS ===
// Login
const loginForm = document.getElementById('loginForm');
if(loginForm) loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    state.login(email, password);
    showPage('dashboardPage');
    updateDashboard();
    renderContentGrid();
    renderSavedLikedCards();
});

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) logoutBtn.addEventListener('click', () => {
    state.logout();
    showPage('loginPage');
});

// Navigation
const goalsBtn = document.getElementById('goalsBtn');
if(goalsBtn) goalsBtn.addEventListener('click', () => {
    showPage('goalsPage');
    renderGoals();
    renderWeekCalendar();
});

const backToDashboard = document.getElementById('backToDashboard');
if(backToDashboard) backToDashboard.addEventListener('click', () => {
    showPage('dashboardPage');
    updateDashboard();
});

// Goals form
const goalForm = document.getElementById('goalForm');
if(goalForm) goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newGoal');
    const text = input.value.trim();
    if (text) {
        state.addGoal(text);
        input.value = '';
        renderGoals();
    }
});

// Content grid clicks
const contentGrid = document.getElementById('contentGrid');
if(contentGrid) contentGrid.addEventListener('click', (e) => {
    const item = e.target.closest('.content-item');
    if (item) {
        const id = parseInt(item.dataset.id);
        const content = state.contentItems.find(c => c.id === id);
        showContentModal(content);
    }
});

// wire saved & liked quick cards
const savedCard = document.getElementById('savedCard');
if (savedCard) savedCard.addEventListener('click', () => openSavedList());
const likedCard = document.getElementById('likedCard');
if (likedCard) likedCard.addEventListener('click', () => openLikedList());

// === MODALS ===
function showMilestoneModal() {
    const m = document.getElementById('milestoneModal');
    if(m) m.classList.add('active');
}

function showContentModal(content) {
    if(!content) return;
    const titleEl = document.getElementById('contentTitle');
    const bodyEl = document.getElementById('contentBody');
    if(titleEl) titleEl.textContent = content.title;
    if(bodyEl) bodyEl.innerHTML = `
        <p><strong>Type:</strong> ${content.type.toUpperCase()}</p>
        <p>This is a placeholder for the ${content.type} content. In a real app, this would load:</p>
        <ul>
            ${content.type === 'video' ? '<li>Embedded video player</li>' : ''}
            ${content.type === 'notes' ? '<li>Interactive notes with highlights</li>' : ''}
            ${content.type === 'quiz' ? '<li>Interactive quiz questions</li>' : ''}
            ${content.type === 'practice' ? '<li>Practice exercises</li>' : ''}
        </ul>
        <p>Click anywhere to return to dashboard.</p>
    `;
    const modal = document.getElementById('contentModal');
    if(modal) modal.classList.add('active');
}

// Close modals
const closeMilestone = document.getElementById('closeMilestone');
if(closeMilestone) closeMilestone.addEventListener('click', () => {
    const m = document.getElementById('milestoneModal'); if(m) m.classList.remove('active');
});

const closeContent = document.getElementById('closeContent');
if(closeContent) closeContent.addEventListener('click', () => {
    const m = document.getElementById('contentModal'); if(m) m.classList.remove('active');
});

const closeSaved = document.getElementById('closeSaved');
if (closeSaved) closeSaved.addEventListener('click', () => { const m = document.getElementById('savedModal'); if(m) m.classList.remove('active'); });

const closeLiked = document.getElementById('closeLiked');
if (closeLiked) closeLiked.addEventListener('click', () => { const m = document.getElementById('likedModal'); if(m) m.classList.remove('active'); });

const closeReward = document.getElementById('closeReward');
if (closeReward) closeReward.addEventListener('click', () => { const m = document.getElementById('rewardModal'); if(m) m.classList.remove('active'); });

// Close modals on backdrop click
document.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Initialize app
showPage('loginPage');
// if (state.isLoggedIn) {
//     showPage('dashboardPage');
//     updateDashboard();
//     renderContentGrid();
//     renderSavedLikedCards();
//     // ensure milestones state and badge are up to date on start
//     try { updateMilestonesState(); updateMilestoneButtonBadge(); } catch(e){}
//     // render calendar if visible
//     try { renderWeekCalendar(); } catch(e){}
// } else {
//     showPage('loginPage');
// }

// Local clock and sync actions
function updateLocalClock(){
    const el = document.getElementById('localClock');
    if(!el) return;
    const now = new Date();
    // format: Jan 18, 2026 14:23
    el.textContent = now.toLocaleString(undefined, { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function syncClearYesterday(){
    // (removed) syncClearYesterday is deprecated
}

function markTodayOnly(){
    const today = isoDate();
    if(!state.visits.includes(today)){
        state.visits.push(today);
        state.save();
    }
    renderWeekCalendar();
    updateDashboard();
    showArrivalToast(getFirstName(), computeStreak());
}

// start clock and wire buttons
setTimeout(()=>{
    updateLocalClock();
    setInterval(updateLocalClock, 30000);
    const markBtn = document.getElementById('markTodayBtn'); if(markBtn) markBtn.addEventListener('click', markTodayOnly);
}, 300);

/* -----------------------------
   Milestones: load / render / claim
   ----------------------------- */
const defaultMilestones = [
        { id: 'm1', title: 'First Victory', description: 'Reach 25% progress - Your first step to success!', requiredProgress: 25, unlocked: false, claimed: false,
            reward: { type: 'motivation', title: 'Victory Celebration', desc: 'Unlock personalized motivation messages and study tips to keep you going!', href: '#' }
        },
        { id: 'm2', title: 'Pre-Doubts Access', description: 'Reach 50% progress', requiredProgress: 50, unlocked: false, claimed: false,
            reward: { type: 'community', title: 'Pre-Doubts Telegram / AMA', desc: 'Join our pre-doubts Telegram group or request an Ask-Me-Anything session.' }
        },
        { id: 'm3', title: 'Champion Pack', description: 'Reach 100% progress', requiredProgress: 100, unlocked: false, claimed: false,
            reward: { type: 'merch', title: 'Brand Merchandise', desc: 'Request Physics Wallah T‑shirt + Diary pack (limited).'}
        }
];

function loadMilestones() {
    try {
        const raw = localStorage.getItem('examPrepMilestones');
        const list = raw ? JSON.parse(raw) : defaultMilestones.slice();
        return list.map(m => ({ requiredProgress: 0, unlocked: false, claimed: false, ...m }));
    } catch (e) {
        return defaultMilestones.slice();
    }
}

function saveMilestones(list) {
    localStorage.setItem('examPrepMilestones', JSON.stringify(list));
}

function renderMilestones() {
    const container = document.getElementById('milestonesList');
    if (!container) return;
    const list = loadMilestones();
    container.innerHTML = list.map(m => {
        const cls = m.unlocked ? 'milestone-unlocked' : 'milestone-locked';
        const button = m.claimed ? '<button class="btn-secondary" disabled>Claimed</button>'
                        : (m.unlocked ? `<button class="btn-primary" onclick="claimMilestone('${m.id}')">Claim</button>` : `<button class="btn-secondary" disabled>Locked</button>`);
        return `
        <div class="card ${cls}" data-id="${m.id}" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;margin-bottom:12px;">
            <div>
                <strong>${m.title}</strong>
                <div style="color:#666;font-size:0.95rem">${m.description}</div>
            </div>
            <div>
                ${button}
            </div>
        </div>`;
    }).join('');
}

function claimMilestone(id) {
    const list = loadMilestones();
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return;
    if (!list[idx].claimed && list[idx].unlocked) {
        list[idx].claimed = true;
        saveMilestones(list);
        renderMilestones();
        // show milestone celebration
        showMilestoneModal();
        // show reward details if available
        try { if (list[idx].reward) showRewardModal(list[idx].reward); } catch (e) {}
        updateMilestoneButtonBadge();
    }
}

// Reward modal: render actions based on reward type
function showRewardModal(reward) {
    const modal = document.getElementById('rewardModal');
    const title = document.getElementById('rewardTitle');
    const desc = document.getElementById('rewardDesc');
    const actions = document.getElementById('rewardActions');
    if (!modal || !title || !desc || !actions) return;
    // Clear previous content
    title.textContent = 'Reward Unlocked';
    desc.textContent = 'Congrats — you unlocked a reward.';
    actions.innerHTML = '';
    if (reward) {
        title.textContent = reward.title || 'Reward Unlocked';
        desc.textContent = reward.desc || '';
        if (reward.type === 'planner') {
            const a = document.createElement('button');
            a.className = 'btn-primary reward-btn';
            a.textContent = 'Open/Print Planner';
            a.onclick = () => window.open(reward.href || 'study_planner.html', '_blank');
            actions.appendChild(a);
        }
        if (reward.type === 'motivation') {
            const motivateBtn = document.createElement('button');
            motivateBtn.className = 'btn-primary reward-btn';
            motivateBtn.textContent = 'Get Motivated!';
            motivateBtn.onclick = () => showMotivationModal();
            actions.appendChild(motivateBtn);
        }
        if (reward.type === 'community') {
            const t = document.createElement('button');
            t.className = 'btn-primary reward-btn';
            t.textContent = 'Join Telegram (Preview)';
            t.onclick = () => window.open('https://t.me/your-telegram-placeholder', '_blank');
            actions.appendChild(t);
            const ask = document.createElement('button');
            ask.className = 'btn-secondary reward-btn';
            ask.textContent = 'Request AMA';
            ask.onclick = () => openAMAForm();
            actions.appendChild(ask);
        }
        if (reward.type === 'merch') {
            const formBtn = document.createElement('button');
            formBtn.className = 'btn-primary reward-btn';
            formBtn.textContent = 'Request Merchandise';
            formBtn.onclick = () => openMerchForm();
            actions.appendChild(formBtn);
        }
    }
    modal.classList.add('active');
}

function openAMAForm() {
    const actions = document.getElementById('rewardActions');
    actions.innerHTML = `
        <form id="amaForm" style="display:flex;flex-direction:column;gap:8px;min-width:260px">
            <input id="amaEmail" placeholder="Your email" required style="padding:8px;border-radius:8px;border:1px solid #ddd" />
            <textarea id="amaQ" placeholder="Type your question or topic" rows="4" style="padding:8px;border-radius:8px;border:1px solid #ddd"></textarea>
            <div style="display:flex;gap:8px;justify-content:center">
                <button type="button" class="btn-primary" onclick="submitAMA()">Submit</button>
            </div>
        </form>`;
}

function submitAMA(){
    const email = document.getElementById('amaEmail').value;
    const q = document.getElementById('amaQ').value;
    if(!email || !q) return alert('Please provide email and question.');
    const reqs = JSON.parse(localStorage.getItem('amaRequests') || '[]');
    reqs.push({id:Date.now(), email, q});
    localStorage.setItem('amaRequests', JSON.stringify(reqs));
    alert('Thanks! Your AMA request has been submitted.');
    const modal = document.getElementById('rewardModal'); if(modal) modal.classList.remove('active');
}

function openMerchForm() {
    const actions = document.getElementById('rewardActions');
    actions.innerHTML = `
        <form id="merchForm" style="display:flex;flex-direction:column;gap:8px;min-width:260px">
            <input id="mName" placeholder="Full name" required style="padding:8px;border-radius:8px;border:1px solid #ddd" />
            <input id="mAddr" placeholder="Shipping address" required style="padding:8px;border-radius:8px;border:1px solid #ddd" />
            <select id="mSize" style="padding:8px;border-radius:8px;border:1px solid #ddd">
                <option value="S">T‑shirt Size: S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
            </select>
            <div style="display:flex;gap:8px;justify-content:center">
                <button type="button" class="btn-primary" onclick="submitMerch()">Request</button>
            </div>
        </form>`;
}

function submitMerch(){
    const name = document.getElementById('mName').value;
    const addr = document.getElementById('mAddr').value;
    const size = document.getElementById('mSize').value;
    if(!name || !addr) return alert('Please provide name and address.');
    const orders = JSON.parse(localStorage.getItem('merchRequests') || '[]');
    orders.push({id:Date.now(), name, addr, size});
    localStorage.setItem('merchRequests', JSON.stringify(orders));
    alert('Request received — we will contact you for shipping details.');
    const modal = document.getElementById('rewardModal'); if(modal) modal.classList.remove('active');
}

function showMotivationModal() {
    const modal = document.getElementById('rewardModal');
    const title = document.getElementById('rewardTitle');
    const desc = document.getElementById('rewardDesc');
    const actions = document.getElementById('rewardActions');
    
    const motivations = [
        "🎉 You're unstoppable! Every small step counts toward your big dreams.",
        "💪 You've got this! Progress is progress, no matter how small.",
        "🌟 Your dedication is inspiring. Keep pushing forward!",
        "🚀 First victory unlocked! You're building momentum for success.",
        "✨ Remember: Every expert was once a beginner. You're on the right path!",
        "🎯 Focus on progress, not perfection. You're doing amazing!",
        "💡 Your effort today creates the success of tomorrow. Keep going!",
        "🏆 Celebrate this win! You've earned it with your hard work."
    ];
    
    const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
    
    title.textContent = 'Victory Celebration! 🎉';
    desc.textContent = randomMotivation;
    actions.innerHTML = `
        <button class="btn-primary reward-btn" onclick="showMotivationModal()">Another Boost!</button>
        <button class="btn-secondary reward-btn" onclick="closeRewardModal()">Continue Learning</button>
    `;
}

function closeRewardModal() {
    const modal = document.getElementById('rewardModal');
    if (modal) modal.classList.remove('active');
}

// update unlocked states according to progress
function updateMilestonesState() {
    const list = loadMilestones();
    let changed = false;
    list.forEach(m => {
        const req = m.requiredProgress || 0;
        if (!m.unlocked && state.chapterProgress >= req) {
            m.unlocked = true;
            changed = true;
        }
    });
    if (changed) saveMilestones(list);
}

function updateMilestoneButtonBadge() {
    const btn = document.getElementById('milestonesBtn');
    if (!btn) return;
    const list = loadMilestones();
    const available = list.filter(m => m.unlocked && !m.claimed).length;
    btn.textContent = available > 0 ? `Milestones (${available})` : 'Milestones';
}

// wire milestones button and back button if present
const milestonesBtn = document.getElementById('milestonesBtn');
if (milestonesBtn) milestonesBtn.addEventListener('click', () => {
    showPage('milestonesPage');
    renderMilestones();
});

const backFromMilestones = document.getElementById('backFromMilestones');
if (backFromMilestones) backFromMilestones.addEventListener('click', () => {
    showPage('dashboardPage');
    updateDashboard();
});