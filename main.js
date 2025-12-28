/* =========================================
   1. НАСТРОЙКИ И ИНИЦИАЛИЗАЦИЯ
   ========================================= */
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false';
let allMaterials = [];
let shownCount = 0;
const step = 6;
let isHomeworkMode = false;
let currentUser = null; // Будет создан автоматически

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init3DButton();
    initFilterLogic();
    loadMaterials(); // Запуск загрузки
});

/* =========================================
   2. ЗАГРУЗКА ДАННЫХ (НОВОСТИ)
   ========================================= */
async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    try {
        if (allMaterials.length === 0) {
            // ССЫЛКА НА ВАШ ФАЙЛ (Если локально - 'data.json')
            // Если из бакета - вставьте полную ссылку
            const response = await fetch('data.json'); 
            
            if (!response.ok) throw new Error('Ошибка сети или 404');
            allMaterials = await response.json();
            
            // Очищаем спиннер
            container.innerHTML = '';
        }
        renderNextBatch(); // Рисуем первые карточки
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = `<div class="text-center text-danger py-5">
            <h4>Не удалось загрузить материалы</h4>
            <p>${error.message}</p>
        </div>`;
    }
}

/* =========================================
   3. РЕНДЕРИНГ КАРТОЧЕК (ЛЕНТА)
   ========================================= */
function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        // Стили
        let badgeClass = 'bg-secondary';
        let subjectName = 'Общее';
        if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
        else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
        else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

        // Создаем элемент
        const card = document.createElement('div');
        // col-md-6 col-lg-4 - это сетка Bootstrap (чтобы было по 2-3 в ряд)
        card.className = `col-md-6 col-lg-4 mb-4 filterDiv ${item.subject}`; 
        
        // Внутри колонка - сама карточка
        // Обратите внимание на innerHTML карточки
        // Я делаю упрощенный вывод формул для превью
        
        let previewText = item.text || "";
        // Заменяем сложные формулы на значки для скорости
        previewText = previewText.replace(/\$\$[\s\S]*?\$\$/g, '[Формула]');
        previewText = previewText.replace(/\$[^$]*\$/g, 'ƒ(x)');

        let mediaHtml = '';
        if(item.image) {
            mediaHtml = `<div class="mb-3 rounded overflow-hidden" style="height:180px;">
                <img src="${item.image}" style="width:100%; height:100%; object-fit:cover;">
            </div>`;
        }

        card.innerHTML = `
            <div class="material-card glass-card p-4 h-100 d-flex flex-column">
                <div class="d-flex justify-content-between mb-3">
                    <span class="subject-badge ${badgeClass}">${subjectName}</span>
                    <small class="text-muted">${item.date || ''}</small>
                </div>
                ${mediaHtml}
                <h5 class="fw-bold mb-2">${item.title}</h5>
                <div class="text-muted small mb-3 flex-grow-1" style="max-height: 4.5em; overflow: hidden;">
                    ${previewText}
                </div>
                <button class="btn btn-outline-primary btn-sm w-100 mt-auto" onclick='openModalById(${item.id})'>Подробнее</button>
            </div>
        `;
        
        // 3D эффект (Tilt)
        const innerCard = card.querySelector('.material-card');
        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(innerCard, { max: 5, speed: 500, glare: true, "max-glare": 0.2, scale: 1.02 });
        }

        container.appendChild(card);
    });

    shownCount += nextItems.length;

    // Кнопка "Показать еще"
    if (loadMoreBtn) {
        loadMoreBtn.classList.remove('hidden');
        if (shownCount >= allMaterials.length) loadMoreBtn.classList.add('hidden');
    }
}

// Вспомогательная функция для открытия по ID (чтобы не передавать объект в HTML)
function openModalById(id) {
    const item = allMaterials.find(x => x.id === id);
    if(item) openModal(item);
}

/* =========================================
   4. МОДАЛЬНОЕ ОКНО (С MathJax и Prism)
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    let content = `
        <h2 class="fw-bold mb-3">${item.title}</h2>
        <div class="fs-5 mb-4">${item.text}</div>
    `;
    
    if(item.image) content += `<img src="${item.image}" class="img-fluid rounded mb-3">`;
    if(item.link) content += `<div class="mt-3"><a href="${item.link}" target="_blank" class="btn btn-primary">Перейти</a></div>`;

    modalBody.innerHTML = content;

    // 1. Рендерим формулы
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([modalBody]).catch(err => console.log(err));
    }

    // 2. Подсвечиваем код
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
   5. ПЕРЕКЛЮЧЕНИЕ ТЕМЫ И 3D
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

/* =========================================
   6. ФИЛЬТРЫ И ДЗ
   ========================================= */
function initFilterLogic() {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.getAttribute('data-filter');
            
            const cards = document.querySelectorAll('.filterDiv');
            cards.forEach(card => {
                if(cat === 'all' || card.classList.contains(cat)) card.classList.remove('hidden');
                else card.classList.add('hidden');
            });
        });
    });
}

async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');
    const loadMore = document.getElementById('loadMoreContainer');

    if (!isHomeworkMode) {
        // Включаем ДЗ
        feed.classList.add('hidden');
        if(loadMore) loadMore.classList.add('hidden');
        hwContainer.classList.remove('hidden');
        btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента';
        
        // Сброс фильтра
        document.querySelector('[data-filter="all"]')?.click();

        // Загрузка ДЗ (заглушка юзера)
        currentUser = { name: "Ученик", group: "group1" };
        loadPersonalHomework();

        isHomeworkMode = true;
    } else {
        // Выключаем ДЗ
        feed.classList.remove('hidden');
        if(loadMore) loadMore.classList.remove('hidden');
        hwContainer.classList.add('hidden');
        btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>ДЗ';
        isHomeworkMode = false;
    }
}

async function loadPersonalHomework() {
    const container = document.getElementById('personal-homework-feed');
    if(!container) return;
    container.innerHTML = '<div class="spinner-border text-primary"></div>';
    
    try {
        // ССЫЛКА НА ВАШ ФАЙЛ homework.json
        const response = await fetch('homework.json');
        if(!response.ok) throw new Error('Ошибка сети');
        const data = await response.json();
        
        const tasks = data[currentUser.group] || [];
        container.innerHTML = '';
        
        if(tasks.length === 0) {
            container.innerHTML = '<p>Нет активных заданий</p>';
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'material-card glass-card p-4 mb-3';
            card.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span class="badge bg-danger">${task.subject}</span>
                    <small>Дедлайн: ${task.deadline}</small>
                </div>
                <h5 class="mt-2">${task.title}</h5>
                <p>${task.task}</p>
                <a href="${task.link}" class="btn btn-sm btn-outline-light w-100">Выполнить</a>
            `;
            container.appendChild(card);
        });

    } catch(e) {
        console.error(e);
        container.innerHTML = '<p class="text-danger">Ошибка загрузки заданий</p>';
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
