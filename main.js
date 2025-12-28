/* =========================================
   1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;
let isHomeworkMode = false;
let currentUser = null; // Будет заполнен при входе в ДЗ
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false';

/* =========================================
   2. ИНИЦИАЛИЗАЦИЯ (При загрузке страницы)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Тема
    initTheme();
    
    // 2. 3D кнопка
    init3DButton();
    
    // 3. Фильтры (Вешаем обработчики)
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) {
        const btns = filterContainer.querySelectorAll('.filter-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const category = btn.getAttribute('data-filter');
                const cards = document.querySelectorAll('.material-card');
                
                cards.forEach(card => {
                    // Ищем родительский col-элемент, если он есть, или саму карточку
                    const wrapper = card.closest('.filterDiv') || card;
                    
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

    // 4. Загрузка новостей
    loadMaterials();
});

/* =========================================
   3. ЗАГРУЗКА МАТЕРИАЛОВ (JSON)
   ========================================= */
async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    try {
        if (allMaterials.length === 0) {
            // Убедитесь, что файл доступен по этому пути
            const response = await fetch('data.json'); 
            if (!response.ok) throw new Error('Ошибка HTTP: ' + response.status);
            
            allMaterials = await response.json();
            
            // ВАЖНО: Очищаем спиннер перед рисованием
            container.innerHTML = '';
        }
        renderNextBatch();
    } catch (error) {
        console.error('Ошибка loadMaterials:', error);
        container.innerHTML = `<div class="text-center text-danger py-5">
            <h4>Не удалось загрузить ленту</h4>
            <p>${error.message}</p>
        </div>`;
    }
}

/* =========================================
   4. ОТРИСОВКА КАРТОЧЕК (LENTA)
   ========================================= */
function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        // Стили бейджей
        let badgeClass = 'bg-secondary';
        let subjectName = 'Общее';
        if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
        else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
        else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

        // Создаем обертку (для сетки Bootstrap, если используется)
        // Если у вас flex-container, классы col-md-6 можно убрать
        const cardWrapper = document.createElement('div');
        cardWrapper.className = `col-md-6 col-lg-4 mb-4 filterDiv ${item.subject}`; // Классы для фильтра

        // Создаем саму карточку
        const card = document.createElement('div');
        card.className = `material-card glass-card p-4 h-100 d-flex flex-column`;
        card.style.cursor = 'pointer';

        // 3D Эффект
        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, { max: 5, speed: 500, glare: true, "max-glare": 0.2, scale: 1.02 });
        }

        // Превью медиа
        let mediaHtml = '';
        if (item.image) {
            mediaHtml = `<div class="mb-3 rounded overflow-hidden" style="height: 180px;">
                <img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>`;
        }

        // Подготовка текста превью (простая, без regex, чтобы не ломать)
        // Формулы будут показаны как текст (безопасно)
        
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

        // Клик по карточке
        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        cardWrapper.appendChild(card);
        container.appendChild(cardWrapper);
    });

    shownCount += nextItems.length;

    // Кнопка "Показать еще"
    if (loadMoreBtn) {
        if (shownCount >= allMaterials.length) loadMoreBtn.classList.add('hidden');
        else loadMoreBtn.classList.remove('hidden');
    }
}

/* =========================================
   5. МОДАЛЬНОЕ ОКНО (С MATHJAX И PRISM)
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    
    let mediaHtml = '';
    if (item.image) mediaHtml = `<img src="${item.image}" class="img-fluid rounded mb-4 w-100">`;
    
    let fileHtml = '';
    if (item.file) {
        fileHtml = `
        <div class="alert alert-secondary d-flex align-items-center mt-3">
            <i class="bi bi-file-earmark-arrow-down fs-4 me-3"></i>
            <div>
                <div class="fw-bold">${item.file.name || 'Файл'}</div>
                <small>${item.file.size || ''}</small>
            </div>
            <a href="${item.file.url}" class="btn btn-primary btn-sm ms-auto" download>Скачать</a>
        </div>`;
    }

    let linkHtml = '';
    if (item.link) {
        linkHtml = `<a href="${item.link}" target="_blank" class="btn btn-outline-primary w-100 mt-3">${item.linkText || 'Перейти'}</a>`;
    }

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

    // 1. MathJax: Рендерим формулы в модалке
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([modalBody]).catch(err => console.log('MathJax error:', err));
    }

    // 2. Prism: Подсвечиваем код
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    
    // 3. Добавляем кнопки копирования
    addCopyButtons(modalBody);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('newsModal').classList.remove('active');
    document.body.style.overflow = '';
}

/* =========================================
   6. ДОМАШНЕЕ ЗАДАНИЕ
   ========================================= */
async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');
    const loadMore = document.getElementById('loadMoreContainer');
    
    // Сброс фильтра на "Все", чтобы не скрывать ДЗ
    const allFilterBtn = document.querySelector('[data-filter="all"]');
    if(allFilterBtn) allFilterBtn.click();

    if (!isHomeworkMode) {
        // Включаем ДЗ
        feed.classList.add('hidden');
        if(loadMore) loadMore.classList.add('hidden');
        hwContainer.classList.remove('hidden');
        btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';
        
        // Авто-вход (заглушка)
        currentUser = { name: "Ученик", group: "group1" };
        loadPersonalHomework();

        isHomeworkMode = true;
    } else {
        // Возврат в ленту
        feed.classList.remove('hidden');
        if(loadMore && shownCount < allMaterials.length) loadMore.classList.remove('hidden');
        hwContainer.classList.add('hidden');
        btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        
        isHomeworkMode = false;
    }
}

async function loadPersonalHomework() {
    const container = document.getElementById('personal-homework-feed');
    if(!container) return;
    container.innerHTML = '<div class="spinner-border text-primary"></div>';
    
    try {
        const response = await fetch('homework.json');
        if(!response.ok) throw new Error('Ошибка загрузки HW');
        const data = await response.json();
        
        const tasks = data[currentUser.group] || [];
        container.innerHTML = '';
        
        if(tasks.length === 0) {
            container.innerHTML = '<p class="text-white text-center">Нет активных заданий</p>';
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'material-card glass-card p-4 mb-3';
            card.innerHTML = `
                <div class="d-flex justify-content-between mb-2">
                    <span class="badge bg-danger">${task.subject}</span>
                    <small class="text-white opacity-75">Дедлайн: ${task.deadline}</small>
                </div>
                <h5 class="text-white mt-2">${task.title}</h5>
                <p class="text-white opacity-75">${task.task}</p>
                <a href="${task.link}" target="_blank" class="btn btn-outline-light w-100">Выполнить</a>
            `;
            container.appendChild(card);
        });

    } catch(e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger text-center">Не удалось загрузить задания</p>';
    }
}

/* =========================================
   7. УТИЛИТЫ (Темы, 3D, Копирование)
   ========================================= */
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
    else disableAllTilt();
    update3DIcon();
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
