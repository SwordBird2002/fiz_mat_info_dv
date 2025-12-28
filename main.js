/* =========================================
   1. НАСТРОЙКИ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;
let isHomeworkMode = false;
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false';

// Ссылка на JSON
const HW_URL = "https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/homework.json";
  
/* =========================================
   2. СТАРТ
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init3DButton();
    
    // Логика фильтров
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.getAttribute('data-filter');
            document.querySelectorAll('.filterDiv').forEach(div => {
                if(cat === 'all' || div.classList.contains(cat)) div.classList.remove('hidden');
                else div.classList.add('hidden');
            });
        });
    });

    loadMaterials();
});

/* =========================================
   3. ЛЕНТА НОВОСТЕЙ
   ========================================= */
async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if(!container) return;
    
    try {
        if (allMaterials.length === 0) {
            const res = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json');
            if(!res.ok) throw new Error('Ошибка data.json');
            allMaterials = await res.json();
            container.innerHTML = '';
        }
        renderNextBatch();
    } catch(e) {
        container.innerHTML = '<p class="text-center text-danger">Ошибка загрузки новостей</p>';
    }
}

function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMore = document.getElementById('loadMoreContainer');
    if(!allMaterials.length) return;

    const items = allMaterials.slice(shownCount, shownCount + step);
    
    items.forEach(item => {
        // Сетка Bootstrap: col-md-6 (2 в ряд), col-lg-4 (3 в ряд)
        const wrapper = document.createElement('div');
        wrapper.className = `col-md-6 col-lg-4 mb-4 filterDiv ${item.subject}`;
        
        const card = document.createElement('div');
        card.className = 'material-card glass-card p-4 h-100 d-flex flex-column';
        card.style.cursor = 'pointer';

        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, { max: 5, speed: 400, glare: true, "max-glare": 0.2 });
        }
        
        let imgHtml = item.image ? `<div class="mb-3 rounded overflow-hidden" style="height:180px"><img src="${item.image}" style="width:100%;height:100%;object-fit:cover"></div>` : '';

        card.innerHTML = `
            <div class="d-flex justify-content-between mb-3">
                <span class="badge bg-secondary">${item.subject}</span>
                <small class="text-muted">${item.date}</small>
            </div>
            ${imgHtml}
            <h4 class="fw-bold mb-2">${item.title}</h4>
            <div class="text-muted opacity-75 mb-3 flex-grow-1" style="overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">${item.text}</div>
            <button class="btn btn-outline-primary btn-sm w-100 mt-auto">Подробнее</button>
        `;
        
        card.onclick = (e) => { if(!e.target.closest('a')) openModal(item); };
        wrapper.appendChild(card);
        container.appendChild(wrapper);
    });

    if(window.MathJax) MathJax.typesetPromise([container]).catch(()=>{});

    shownCount += items.length;
    if(loadMore) {
        if(shownCount >= allMaterials.length) loadMore.classList.add('hidden');
        else loadMore.classList.remove('hidden');
    }
}

/* =========================================
   4. ДОМАШНЕЕ ЗАДАНИЕ (С ССЫЛКИ)
   ========================================= */
async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const hwWrap = document.getElementById('homework-container');
    const loadMore = document.getElementById('loadMoreContainer');
    const filters = document.getElementById('filterContainer');

    // Проверка, чтобы не было ошибки "btn is null"
    if(!btn || !feed) return; 

    if (!isHomeworkMode) {
        // -> ВКЛЮЧАЕМ ДЗ
        feed.classList.add('hidden');
        if(loadMore) loadMore.classList.add('hidden');
        if(filters) filters.classList.add('hidden'); // Прячем фильтры
        hwWrap.classList.remove('hidden');
        
        btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';
        
        await loadRealHomework();
        isHomeworkMode = true;
    } else {
        // -> НАЗАД
        feed.classList.remove('hidden');
        if(loadMore && shownCount < allMaterials.length) loadMore.classList.remove('hidden');
        if(filters) filters.classList.remove('hidden');
        hwWrap.classList.add('hidden');
        
        btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        isHomeworkMode = false;
    }
}

async function loadRealHomework() {
    const container = document.getElementById('personal-homework-feed');
    if(!container) return;
    container.innerHTML = '<div class="spinner-border text-primary"></div>';
    
    try {
        // Попытка загрузить с вашей ссылки
        const res = await fetch(HW_URL);
        if(!res.ok) throw new Error('Ошибка сети');
        const data = await res.json();
        
        // Пытаемся достать массив. Либо это data, либо data.group1
        const tasks = Array.isArray(data) ? data : (data.group1 || []);
        
        container.innerHTML = '';
        if(!tasks.length) {
            container.innerHTML = '<p class="text-muted">Нет заданий</p>';
            return;
        }

        tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'glass-card p-4 mb-3 w-100';
            div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span class="badge bg-danger">${task.subject || 'ДЗ'}</span>
                    <small class="text-muted">${task.deadline || ''}</small>
                </div>
                <h5 class="fw-bold mt-2">${task.title}</h5>
                <p>${task.task}</p>
                <a href="${task.link}" target="_blank" class="btn btn-outline-primary btn-sm w-100">Выполнить</a>
            `;
            container.appendChild(div);
        });
    } catch(e) {
        // Если ссылка не сработала, пробуем локальный файл
        console.log('Пробую локальный файл...');
        try {
            const localRes = await fetch('homework.json');
            const localData = await localRes.json();
            const localTasks = localData.group1 || [];
            // Рендер локальных (тот же код)
            container.innerHTML = '';
             localTasks.forEach(task => {
                const div = document.createElement('div');
                div.className = 'glass-card p-4 mb-3 w-100';
                div.innerHTML = `
                    <div class="d-flex justify-content-between"><span class="badge bg-danger">${task.subject}</span></div>
                    <h5 class="fw-bold mt-2">${task.title}</h5>
                    <p>${task.task}</p>
                    <a href="${task.link}" class="btn btn-outline-primary btn-sm w-100">Выполнить</a>
                `;
                container.appendChild(div);
            });
        } catch(err2) {
            container.innerHTML = '<p class="text-danger">Не удалось загрузить задания.</p>';
        }
    }
}

/* =========================================
   5. УТИЛИТЫ
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const body = document.getElementById('modalBody');
    if(!modal || !body) return;
    
    let img = item.image ? `<img src="${item.image}" class="img-fluid rounded mb-3 w-100">` : '';
    body.innerHTML = `<h3>${item.title}</h3><p class="text-muted">${item.date}</p>${img}<div class="fs-5">${item.text}</div>`;
    
    if(window.MathJax) MathJax.typesetPromise([body]);
    if(window.Prism) Prism.highlightAll();
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    document.getElementById('newsModal').classList.remove('active');
    document.body.style.overflow = '';
}
function initTheme() {
    const s = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', s);
}
function toggleTheme() {
    const n = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', n);
    localStorage.setItem('theme', n);
}
function init3DButton() { if(!is3DEnabled) disableAllTilt(); }
function toggle3D() {
    is3DEnabled = !is3DEnabled;
    localStorage.setItem('3d_enabled', is3DEnabled);
    if(is3DEnabled) location.reload();
    else disableAllTilt();
}
function disableAllTilt() {
    document.querySelectorAll('.material-card').forEach(c => {
        if(c.vanillaTilt) c.vanillaTilt.destroy();
        c.style.transform = 'none';
    });
}

