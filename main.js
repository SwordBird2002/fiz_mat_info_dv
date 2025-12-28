/* =========================================
   1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;
let isHomeworkMode = false;
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false';

// Ссылки (Ваш бакет для домашки)
const HOMEWORK_URL = "https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/homework.json";

/* =========================================
   2. ИНИЦИАЛИЗАЦИЯ
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init3DButton();
    
    // Фильтры
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
                    // Логика фильтрации: показываем или скрываем КОЛОНКУ (wrapper)
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

    // Загрузка новостей при старте
    loadMaterials();
});

/* =========================================
   3. ЗАГРУЗКА И ОТРИСОВКА НОВОСТЕЙ (СЕТКА)
   ========================================= */
async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    // Очистка классов центровки, чтобы вернуть сетку слева-направо
    container.classList.remove('justify-content-center'); 
    container.classList.add('row'); // Гарантируем класс row

    try {
        if (allMaterials.length === 0) {
            // Загружаем локальный data.json (новости)
            const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json'); 
            if (!response.ok) throw new Error('Ошибка HTTP data.json');
            allMaterials = await response.json();
            container.innerHTML = '';
        }
        renderNextBatch();
    } catch (error) {
        console.error('Ошибка loadMaterials:', error);
        container.innerHTML = `<div class="col-12 text-center text-danger py-5">
            <h4>Не удалось загрузить новости</h4>
            <p>${error.message}</p>
        </div>`;
    }
}

function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        // === СТРУКТУРА СЕТКИ (КАК БЫЛО РАНЬШЕ) ===
        // col-md-6 (2 колонки), col-lg-4 (3 колонки).
        const cardWrapper = document.createElement('div');
        cardWrapper.className = `col-md-6 col-lg-4 mb-4 filterDiv ${item.subject}`;

        const card = document.createElement('div');
        card.className = `material-card glass-card p-4 h-100 d-flex flex-column`;
        card.style.cursor = 'pointer';

        // 3D
        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, { max: 5, speed: 500, glare: true, "max-glare": 0.2, scale: 1.02 });
        }

        // Превью
        let mediaHtml = '';
        if (item.image) {
            mediaHtml = `<div class="mb-3 rounded overflow-hidden" style="height: 180px;">
                <img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>`;
        }

        // Бейджи
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
            <h4 class="fw-bold mb-2">${item.title}</h4>
            <div class="text-muted opacity-75 mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                ${item.text || ''}
            </div>
            <button class="btn btn-outline-primary btn-sm w-100 mt-auto">Подробнее</button>
        `;

        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        cardWrapper.appendChild(card);
        container.appendChild(cardWrapper);
    });

    // MathJax
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
   4. ДОМАШНЕЕ ЗАДАНИЕ (ГИБРИДНАЯ ЗАГРУЗКА)
   ========================================= */
async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');
    const loadMore = document.getElementById('loadMoreContainer');
    const filterContainer = document.getElementById('filterContainer');

    // Сброс фильтра
    const allFilterBtn = document.querySelector('[data-filter="all"]');
    if(allFilterBtn) allFilterBtn.click();

    if (!isHomeworkMode) {
        // --- ВКЛЮЧАЕМ РЕЖИМ ДЗ ---
        if(feed) feed.classList.add('hidden');
        if(loadMore) loadMore.classList.add('hidden');
        if(filterContainer) filterContainer.classList.add('hidden'); // Прячем фильтры
        
        if(hwContainer) {
            hwContainer.classList.remove('hidden');
            // Центрируем колонку ДЗ
            hwContainer.className = 'd-flex flex-column align-items-center mt-4';
        }
        
        if(btn) btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';
        
        loadPersonalHomework(); // Грузим данные
        isHomeworkMode = true;
    } else {
        // --- ВОЗВРАТ В ЛЕНТУ ---
        if(feed) feed.classList.remove('hidden');
        if(loadMore && shownCount < allMaterials.length) loadMore.classList.remove('hidden');
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
    container.style.width = '100%';
    container.style.maxWidth = '800px'; // Ограничиваем ширину для красоты
    
    let data = null;

    // 1. Попытка загрузить с БАКЕТА (удаленно)
    try {
        const response = await fetch(HOMEWORK_URL);
        if (response.ok) {
            data = await response.json();
            console.log("Загружено с облака");
        } else {
            throw new Error('Cloud fail');
        }
    } catch (cloudErr) {
        console.warn("Облако недоступно (CORS?), пробую локальный файл...");
        // 2. Если облако не отдало (CORS), пробуем ЛОКАЛЬНЫЙ файл
        try {
            const localRes = await fetch('homework.json');
            if (localRes.ok) {
                data = await localRes.json();
                console.log("Загружено локально");
            }
        } catch (localErr) {
            console.error("Везде ошибка");
        }
    }

    // Рендер
    container.innerHTML = '';
    
    if (!data) {
        container.innerHTML = '<div class="alert alert-danger">Не удалось загрузить домашнее задание.</div>';
        return;
    }

    // Разбор структуры: ищем массив
    let tasks = [];
    if (Array.isArray(data)) {
        tasks = data;
    } else if (data.group1) {
        tasks = data.group1;
    } else {
        // Если структура неизвестна, пробуем взять первое значение
        tasks = Object.values(data)[0]; 
    }

    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Нет заданий</p>';
        return;
    }

    // Рисуем карточки
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'glass-card p-4 mb-3 w-100';
        
        card.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span class="badge bg-danger">${task.subject || 'ДЗ'}</span>
                <small class="text-muted">Дедлайн: ${task.deadline || 'Нет'}</small>
            </div>
            <h5 class="fw-bold mt-2">${task.title}</h5>
            <p class="opacity-75">${task.task}</p>
            <a href="${task.link}" target="_blank" class="btn btn-outline-primary btn-sm w-100">Выполнить</a>
        `;
        container.appendChild(card);
    });
}

/* =========================================
   5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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
