/* =========================================
   1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 5; // Чуть меньше шаг, раз карточки большие
let isHomeworkMode = false;
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false';

// Ссылка на ДЗ (VK Cloud)
const HOMEWORK_URL = "https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/homework.json";

/* =========================================
   2. ИНИЦИАЛИЗАЦИЯ
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init3DButton();
    
    // Инициализация фильтров
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) {
        const btns = filterContainer.querySelectorAll('.filter-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.getAttribute('data-filter');
                const wrappers = document.querySelectorAll('.filterDiv'); 
                
                wrappers.forEach(wrapper => {
                    if (category === 'all') {
                        wrapper.classList.remove('hidden');
                    } else {
                        if (wrapper.classList.contains(category)) {
                            wrapper.classList.remove('hidden');
                        } else {
                            wrapper.classList.add('hidden');
                        }
                    }
                });
            });
        });
    }

    loadMaterials();
});

/* =========================================
   3. ЗАГРУЗКА НОВОСТЕЙ
   ========================================= */
async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    // Убираем центровку, оставляем просто row
    container.classList.remove('justify-content-center'); 
    container.classList.add('row');

    try {
        if (allMaterials.length === 0) {
            const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json'); 
            if (!response.ok) throw new Error('Ошибка HTTP data.json');
            allMaterials = await response.json();
            container.innerHTML = '';
        }
        renderNextBatch();
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<p class="text-center text-danger">Не удалось загрузить ленту</p>`;
    }
}

/* =========================================
   4. ОТРИСОВКА (СТРОГО ДРУГ ПОД ДРУГОМ)
   ========================================= */
function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        // === ИЗМЕНЕНИЕ: col-12 ===
        // Это заставляет карточку занимать 100% ширины (друг под другом)
        const cardWrapper = document.createElement('div');
        cardWrapper.className = `col-12 mb-4 filterDiv ${item.subject}`;

        const card = document.createElement('div');
        card.className = `material-card glass-card p-4`; // Убрал h-100, тут не нужно
        card.style.cursor = 'pointer';

        // 3D эффект (чуть меньше наклон для широких карт)
        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, { max: 3, speed: 400, glare: true, "max-glare": 0.1, scale: 1.01 });
        }

        // Превью картинки (сделаем её широкой, но не слишком высокой)
        let mediaHtml = '';
        if (item.image) {
            mediaHtml = `<div class="mb-3 rounded overflow-hidden" style="height: 250px;">
                <img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>`;
        }

        let badgeClass = 'bg-secondary';
        let subjectName = item.subject || 'Общее';
        if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
        else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
        else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="subject-badge ${badgeClass}">${subjectName}</span>
                <small class="text-muted">${item.date || ''}</small>
            </div>
            
            ${mediaHtml}

            <h3 class="fw-bold mb-2">${item.title}</h3>
            
            <div class="text-muted opacity-75 mb-3 fs-5">
                ${item.text || ''}
            </div>

            <button class="btn btn-outline-primary w-100">Читать подробнее</button>
        `;

        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        cardWrapper.appendChild(card);
        container.appendChild(cardWrapper);
    });
    
    // Рендер формул
    if (window.MathJax && MathJax.typesetPromise) {
         MathJax.typesetPromise([container]).catch(err => console.log(err));
    }

    shownCount += nextItems.length;

    if (loadMoreBtn) {
        if (shownCount >= allMaterials.length) loadMoreBtn.classList.add('hidden');
        else loadMoreBtn.classList.remove('hidden');
    }
}

/* =========================================
   5. ДОМАШНЕЕ ЗАДАНИЕ (ПЕРЕКЛЮЧЕНИЕ)
   ========================================= */
async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');
    const loadMore = document.getElementById('loadMoreContainer');
    const filterContainer = document.getElementById('filterContainer'); 

    // Сброс фильтра на "Все" перед переключением
    const allFilterBtn = document.querySelector('[data-filter="all"]');
    if(allFilterBtn) allFilterBtn.click();

    if (!isHomeworkMode) {
        // --- ВКЛЮЧАЕМ ДЗ ---
        if(feed) feed.classList.add('hidden');
        if(loadMore) loadMore.classList.add('hidden');
        
        // Скрываем фильтры, так как в ДЗ они не нужны
        if(filterContainer) filterContainer.classList.add('hidden');
        
        if(hwContainer) {
            hwContainer.classList.remove('hidden');
            // Центрируем ДЗ
            hwContainer.className = 'container mt-4 d-flex flex-column align-items-center';
        }
        
        if(btn) btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';
        
        loadPersonalHomework(); 
        isHomeworkMode = true;
    } else {
        // --- ВОЗВРАТ В ЛЕНТУ ---
        if(feed) feed.classList.remove('hidden');
        if(loadMore && shownCount < allMaterials.length) loadMore.classList.remove('hidden');
        
        // Возвращаем фильтры
        if(filterContainer) filterContainer.classList.remove('hidden');
        
        if(hwContainer) hwContainer.classList.add('hidden');
        
        if(btn) btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        
        isHomeworkMode = false;
    }
}

async function loadPersonalHomework() {
    const container = document.getElementById('personal-homework-feed');
    if(!container) return;
    container.innerHTML = '<div class="spinner-border text-primary my-3"></div>';
    
    // Ограничиваем ширину ДЗ (оно красивее узким списком, чем на весь экран)
    container.style.width = '100%';
    container.style.maxWidth = '800px'; 
    
    let data = null;

    // 1. Попытка загрузить с БАКЕТА
    try {
        const response = await fetch(HOMEWORK_URL);
        if(response.ok) {
            data = await response.json();
        } else {
            throw new Error('Cloud fail');
        }
    } catch(e) {
        console.warn('Облако недоступно, пробую локально...');
        // 2. Локальный файл
        try {
            const local = await fetch('homework.json');
            if(local.ok) data = await local.json();
        } catch(err) { console.error(err); }
    }

    container.innerHTML = '';
    
    if (!data) {
        container.innerHTML = '<div class="alert alert-warning text-center">Не удалось загрузить задания</div>';
        return;
    }

    // Ищем массив задач
    let tasks = [];
    if (Array.isArray(data)) tasks = data;
    else if (data.group1) tasks = data.group1;
    else tasks = Object.values(data)[0] || [];

    if (tasks.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Нет активных заданий</p>';
        return;
    }

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'glass-card p-4 mb-3 w-100'; 
        
        card.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span class="badge bg-danger">${task.subject || 'ДЗ'}</span>
                <small class="text-muted">Дедлайн: ${task.deadline || ''}</small>
            </div>
            <h5 class="fw-bold mt-2">${task.title}</h5>
            <p class="opacity-75">${task.task}</p>
            <a href="${task.link}" target="_blank" class="btn btn-outline-primary btn-sm w-100">Выполнить</a>
        `;
        container.appendChild(card);
    });
}

/* =========================================
   6. УТИЛИТЫ
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    
    let mediaHtml = item.image ? `<img src="${item.image}" class="img-fluid rounded mb-4 w-100">` : '';
    let fileHtml = item.file ? `<div class="alert alert-secondary mt-3"><i class="bi bi-file-earmark-arrow-down me-2"></i>${item.file.name} <a href="${item.file.url}" class="float-end" download>Скачать</a></div>` : '';
    let linkHtml = item.link ? `<a href="${item.link}" target="_blank" class="btn btn-outline-primary w-100 mt-3">${item.linkText || 'Перейти'}</a>` : '';

    modalBody.innerHTML = `
        <span class="subject-badge badge-${item.subject} mb-3 d-inline-block">
            ${item.subject === 'math' ? 'Математика' : item.subject === 'cs' ? 'Информатика' : 'Физика'}
        </span>
        <h2 class="fw-bold mb-3">${item.title}</h2>
        <p class="text-muted mb-4">${item.date}</p>
        ${mediaHtml}
        <div class="fs-5" style="line-height: 1.6;">${item.text}</div>
        ${fileHtml}
        ${linkHtml}
    `;

    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([modalBody]);
    if (typeof Prism !== 'undefined') Prism.highlightAll();
    
    addCopyButtons(modalBody);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('newsModal');
    if(modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}
function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}
function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if(icon) icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}
function init3DButton() {
    update3DIcon();
    if (!is3DEnabled) disableAllTilt();
}
function toggle3D() {
    is3DEnabled = !is3DEnabled;
    localStorage.setItem('3d_enabled', is3DEnabled);
    if(is3DEnabled) location.reload();
    else { disableAllTilt(); update3DIcon(); }
}
function disableAllTilt() {
    document.querySelectorAll('.material-card').forEach(c => {
        if(c.vanillaTilt) c.vanillaTilt.destroy();
        c.style.transform = 'none';
    });
}
function update3DIcon() {
    const btn = document.getElementById('btn3D');
    const icon = document.getElementById('icon3D');
    if(!btn) return;
    if(is3DEnabled) {
        btn.classList.remove('btn-outline-secondary'); btn.classList.add('btn-outline-primary');
        icon.className = 'bi bi-box-fill';
    } else {
        btn.classList.remove('btn-outline-primary'); btn.classList.add('btn-outline-secondary');
        icon.className = 'bi bi-box';
    }
}
function addCopyButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
        pre.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-dark position-absolute top-0 end-0 m-2';
        btn.innerHTML = '<i class="bi bi-clipboard"></i>';
        btn.onclick = () => {
            const code = pre.querySelector('code');
            if(code) navigator.clipboard.writeText(code.innerText);
        };
        pre.appendChild(btn);
    });
}
