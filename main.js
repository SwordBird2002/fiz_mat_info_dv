/* =========================================
   1. ИНИЦИАЛИЗАЦИЯ И ТЕМЫ
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init3DButton();
    loadMaterials();
    initFilters();
    
    // ПРИНУДИТЕЛЬНО ВЕШАЕМ ОБРАБОТЧИК НА КНОПКУ ДЗ
    const hwBtn = document.getElementById('hw-toggle-btn');
    if(hwBtn) {
        hwBtn.onclick = toggleHomeworkView; // Прямая привязка
    }
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
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
    if (!icon) return;
    if (theme === 'dark') {
        icon.classList.remove('bi-moon-stars-fill');
        icon.classList.add('bi-sun-fill');
    } else {
        icon.classList.remove('bi-sun-fill');
        icon.classList.add('bi-moon-stars-fill');
    }
}

/* =========================================
   2. 3D ЭФФЕКТ
   ========================================= */
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false';

function init3DButton() {
    update3DIcon();
    if (!is3DEnabled) disableAllTilt();
}

function toggle3D() {
    is3DEnabled = !is3DEnabled;
    localStorage.setItem('3d_enabled', is3DEnabled);
    update3DIcon();
    if (is3DEnabled) location.reload();
    else disableAllTilt();
}

function disableAllTilt() {
    document.querySelectorAll('.material-card').forEach(c => {
        if (c.vanillaTilt) c.vanillaTilt.destroy();
        c.style.transform = 'none';
    });
}

function update3DIcon() {
    const btn = document.getElementById('btn3D');
    const icon = document.getElementById('icon3D');
    if (!btn || !icon) return;
    if (is3DEnabled) {
        btn.classList.replace('btn-secondary', 'btn-outline-primary');
        icon.className = 'bi bi-box-fill';
    } else {
        btn.classList.replace('btn-outline-primary', 'btn-secondary');
        icon.className = 'bi bi-box';
    }
}

/* =========================================
   3. ЗАГРУЗКА ЛЕНТЫ НОВОСТЕЙ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;

async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    // Кнопка "Показать еще"
    let loadMore = document.getElementById('loadMoreContainer');
    if (!loadMore) {
        loadMore = document.createElement('div');
        loadMore.id = 'loadMoreContainer';
        loadMore.className = 'text-center mt-5 mb-5 hidden';
        loadMore.innerHTML = `<button class="btn btn-outline-primary px-5 py-2 rounded-pill fw-bold" onclick="renderNextBatch()">Показать еще</button>`;
        container.parentNode.insertBefore(loadMore, container.nextSibling);
    }

    try {
        if (allMaterials.length === 0) {
            const res = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json');
            if (!res.ok) throw new Error('Ошибка сети');
            allMaterials = await res.json();
            container.innerHTML = '';
        }
        renderNextBatch();
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="text-center text-danger py-5"><h4>Не удалось загрузить новости</h4></div>`;
    }
}

function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMore = document.getElementById('loadMoreContainer');
    
    if (!allMaterials.length) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        let badgeClass = 'bg-secondary';
        if (item.subject === 'math') badgeClass = 'bg-danger';
        else if (item.subject === 'cs') badgeClass = 'bg-success';
        else if (item.subject === 'phys') badgeClass = 'bg-info text-dark';

        const wrapper = document.createElement('div');
        wrapper.className = `col-md-6 col-lg-4 mb-4 filterDiv ${item.subject}`;

        const card = document.createElement('div');
        // Улучшенные стили карточки: тень, скругление, отступы
        card.className = `material-card glass-card h-100 d-flex flex-column`;
        card.style.padding = '1.5rem';
        card.style.borderRadius = '16px';
        card.style.border = '1px solid rgba(0,0,0,0.05)';
        card.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.1)';
        card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        card.style.cursor = 'pointer';

        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, { max: 4, speed: 400, glare: true, "max-glare": 0.1, scale: 1.02 });
        }

        card.onclick = (e) => { if(!e.target.closest('a')) openModal(item); };

        let imgHtml = item.image ? `<div class="mb-3 rounded-3 overflow-hidden shadow-sm" style="height: 180px;"><img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : '';
        
        // Красивое обрезание текста
        let shortText = item.text ? item.text.replace(/<[^>]*>?/gm, '').substring(0, 110) + '...' : '';

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge ${badgeClass} rounded-pill px-3 py-2">${item.subject.toUpperCase()}</span>
                <small class="text-muted fw-bold" style="font-size: 0.85rem;">${item.date}</small>
            </div>
            ${imgHtml}
            <h4 class="fw-bold mb-2" style="font-family: 'Segoe UI', sans-serif;">${item.title}</h4>
            <p class="text-muted mb-4 flex-grow-1" style="line-height: 1.6; font-size: 0.95rem;">${shortText}</p>
            <button class="btn btn-primary w-100 rounded-pill py-2 fw-bold" style="margin-top: auto;">Читать подробнее</button>
        `;
        
        wrapper.appendChild(card);
        container.appendChild(wrapper);
    });

    shownCount += nextItems.length;

    if (loadMore) {
        if (shownCount >= allMaterials.length) loadMore.classList.add('hidden');
        else loadMore.classList.remove('hidden');
    }

    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([container]);
}


/* =========================================
   4. МОДАЛЬНОЕ ОКНО
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    let imgHtml = item.image ? `<img src="${item.image}" class="img-fluid rounded-4 shadow-sm mb-4 w-100">` : '';
    let fileHtml = item.file ? `<div class="p-3 mt-4 bg-light rounded-3 border d-flex align-items-center"><i class="bi bi-file-earmark-pdf fs-3 text-danger me-3"></i><div><div class="fw-bold">${item.file.name}</div></div><a href="${item.file.url}" class="btn btn-sm btn-dark ms-auto rounded-pill px-3" download>Скачать</a></div>` : '';
    
    // Красивый текст статьи
    body.innerHTML = `
        <div class="mb-2 text-uppercase text-muted fw-bold small tracking-wide">${item.subject} &bull; ${item.date}</div>
        <h1 class="fw-bold mb-4 display-6">${item.title}</h1>
        ${imgHtml}
        <div class="article-text fs-5" style="line-height: 1.8; color: var(--bs-body-color);">
            ${item.text}
        </div>
        ${fileHtml}
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (window.MathJax) MathJax.typesetPromise([body]);
    if (typeof Prism !== 'undefined') Prism.highlightAll();
    addCopyButtons(body);
}

function closeModal() {
    document.getElementById('newsModal').classList.remove('active');
    document.body.style.overflow = '';
}

function addCopyButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.parentNode.querySelector('.copy-btn')) return;
        pre.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-dark position-absolute top-0 end-0 m-2 copy-btn opacity-75';
        btn.innerHTML = '<i class="bi bi-clipboard"></i>';
        btn.onclick = () => {
            const code = pre.querySelector('code');
            navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
            btn.innerHTML = '<i class="bi bi-check-lg"></i>';
            setTimeout(() => btn.innerHTML = '<i class="bi bi-clipboard"></i>', 2000);
        };
        pre.appendChild(btn);
    });
}


/* =========================================
   5. ДОМАШНЕЕ ЗАДАНИЕ (ПЕРЕКЛЮЧЕНИЕ)
   ========================================= */
let isHomeworkMode = false;

async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const loadMore = document.getElementById('loadMoreContainer');
    const filters = document.getElementById('filterContainer');
    
    // Ищем или создаем контейнер
    let hwContainer = document.getElementById('homework-container');
    if (!hwContainer) {
        hwContainer = document.createElement('div');
        hwContainer.id = 'homework-container';
        hwContainer.className = 'hidden container mt-4';
        if(feed && feed.parentNode) feed.parentNode.insertBefore(hwContainer, feed.nextSibling);
    }

    if (!isHomeworkMode) {
        // --> ВКЛЮЧАЕМ ДЗ
        isHomeworkMode = true;
        btn.classList.add('active'); // Стиль активной кнопки
        btn.innerHTML = '<i class="bi bi-arrow-left me-2"></i>Вернуться к новостям';
        btn.classList.replace('btn-primary', 'btn-outline-dark'); // Меняем стиль кнопки на серый
        
        feed.classList.add('hidden');
        if (loadMore) loadMore.classList.add('hidden');
        if (filters) filters.classList.add('hidden'); // Скрываем фильтры

        hwContainer.classList.remove('hidden');
        await loadPersonalHomework(hwContainer);

    } else {
        // --> ВОЗВРАТ
        isHomeworkMode = false;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        btn.classList.replace('btn-outline-dark', 'btn-primary'); // Возвращаем синий цвет
        
        feed.classList.remove('hidden');
        if (loadMore && shownCount < allMaterials.length) loadMore.classList.remove('hidden');
        if (filters) filters.classList.remove('hidden');
        
        hwContainer.classList.add('hidden');
    }
}

async function loadPersonalHomework(container) {
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/homework.json');
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data = await response.json();
        
        const tasks = data['group1'] || (Array.isArray(data) ? data : []);
        container.innerHTML = '';
        
        if (tasks.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-5"><h4>Нет активных заданий</h4></div>';
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'glass-card p-4 mb-3 shadow-sm';
            card.style.borderRadius = '12px';
            card.style.borderLeft = '5px solid #0d6efd'; // Синяя полоска слева для красоты
            
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="text-uppercase fw-bold text-primary small tracking-wide">${task.subject}</span>
                    <span class="badge bg-light text-dark border">Дедлайн: ${task.deadline}</span>
                </div>
                <h5 class="fw-bold mb-3">${task.title}</h5>
                <p class="mb-4 text-muted">${task.task}</p>
                <a href="${task.link}" target="_blank" class="btn btn-primary px-4 rounded-pill btn-sm">
                    Выполнить задание <i class="bi bi-arrow-right ms-2"></i>
                </a>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger text-center">Не удалось загрузить задания</div>`;
    }
}


/* =========================================
   6. ФИЛЬТРАЦИЯ
   ========================================= */
function initFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.getAttribute('data-filter');
            const wrappers = document.querySelectorAll('.filterDiv');
            
            wrappers.forEach(div => {
                if (category === 'all' || div.classList.contains(category)) {
                    div.classList.remove('hidden');
                } else {
                    div.classList.add('hidden');
                }
            });
        });
    });
}
