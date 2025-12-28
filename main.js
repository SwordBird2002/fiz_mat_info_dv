/* =========================================
   1. УПРАВЛЕНИЕ ТЕМОЙ
   ========================================= */
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

document.addEventListener('DOMContentLoaded', initTheme);


/* =========================================
   2. УПРАВЛЕНИЕ 3D ЭФФЕКТОМ (TILT)
   ========================================= */
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false'; // По умолчанию true

function init3DButton() {
    update3DIcon();
    if (!is3DEnabled) disableAllTilt();
}

function toggle3D() {
    is3DEnabled = !is3DEnabled;
    localStorage.setItem('3d_enabled', is3DEnabled);
    update3DIcon();
    
    if (is3DEnabled) {
        location.reload(); // Перезагрузка для включения
    } else {
        disableAllTilt();
    }
}

function disableAllTilt() {
    const cards = document.querySelectorAll('.material-card');
    cards.forEach(card => {
        if (card.vanillaTilt) card.vanillaTilt.destroy();
        card.style.transform = 'none';
    });
}

function update3DIcon() {
    const btn = document.getElementById('btn3D');
    const icon = document.getElementById('icon3D');
    if (!btn || !icon) return;

    if (is3DEnabled) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-outline-primary');
        icon.className = 'bi bi-box-fill';
    } else {
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-outline-secondary');
        icon.className = 'bi bi-box';
    }
}

document.addEventListener('DOMContentLoaded', init3DButton);


/* =========================================
   3. ЗАГРУЗКА МАТЕРИАЛОВ (С ПАГИНАЦИЕЙ)
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;

async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return; 

    // Добавляем кнопку "Показать еще"
    let loadMoreContainer = document.getElementById('loadMoreContainer');
    if (!loadMoreContainer) {
        loadMoreContainer = document.createElement('div');
        loadMoreContainer.id = 'loadMoreContainer';
        loadMoreContainer.className = 'text-center mt-4 mb-5 hidden';
        loadMoreContainer.innerHTML = `
            <button onclick="renderNextBatch()" class="btn btn-outline-primary px-4 py-2 rounded-pill">
                Показать еще материалы
            </button>
        `;
        container.parentNode.insertBefore(loadMoreContainer, container.nextSibling);
    }

    try {
        if (allMaterials.length === 0) {
            const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json');
            allMaterials = await response.json();
            container.innerHTML = '';
        }
        renderNextBatch();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<p class="text-center text-danger">Не удалось загрузить материалы.</p>';
    }
}

function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const btnContainer = document.getElementById('loadMoreContainer');
    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        let badgeClass = '', subjectName = '';
        if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
        else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
        else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

        const card = document.createElement('div');
        card.className = `material-card glass-card filterDiv ${item.subject}`;
        card.style.cursor = 'pointer';

        // 3D эффект
        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, {
                max: 5, speed: 500, glare: true, "max-glare": 0.3, scale: 1.02, gyroscope: true
            });
        }

        // КЛИК ДЛЯ ОТКРЫТИЯ МОДАЛКИ
        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        let filePreview = item.file ? '<div class="text-muted small mt-2"><i class="bi bi-paperclip"></i> Прикреплен файл</div>' : '';

        card.innerHTML = `
            <div class="card-header-custom">
                <span class="subject-badge ${badgeClass}">${subjectName}</span>
                <small class="text-muted">${item.date}</small>
            </div>
            <div class="card-content">
                <h4>${item.title}</h4>
                <p class="mb-2" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${item.text} 
                </p>
                ${filePreview}
                <div class="text-primary small mt-2 fw-bold">Читать подробнее</div>
            </div>
        `;
        container.appendChild(card);
    });

    shownCount += nextItems.length;

    if (shownCount >= allMaterials.length) {
        btnContainer.classList.add('hidden');
    } else {
        btnContainer.classList.remove('hidden');
    }
}

if (document.getElementById('feed-container')) {
    document.addEventListener('DOMContentLoaded', loadMaterials);
}


/* =========================================
   4. МОДАЛЬНОЕ ОКНО
   ========================================= */
/* =========================================
   4. МОДАЛЬНОЕ ОКНО (ПОЛНАЯ ВЕРСИЯ)
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    
    // 1. Генерируем контент
    let mediaHtml = '';
    if (item.image) mediaHtml = `<img src="${item.image}" class="img-fluid rounded mb-4 w-100">`;
    
    let fileHtml = '';
    if (item.file) {
        fileHtml = `
        <div class="download-box mt-4">
            <i class="bi bi-file-earmark-pdf-fill download-icon"></i>
            <div>
                <div class="fw-bold">${item.file.name}</div>
                <div class="text-muted small">${item.file.size}</div>
            </div>
            <a href="${item.file.url}" class="btn btn-primary ms-auto" download>Скачать</a>
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

    // 2. Инициализируем блоки с кодом (если есть функция initCodeBlocks)
    if (typeof initCodeBlocks === 'function') {
        initCodeBlocks(modalBody);
    }

    // 3. Показываем окно
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Блокируем скролл фона
}

function closeModal(force) {
    const modal = document.getElementById('newsModal');
    
    // force - если нажали крестик
    // event.target === modal - если нажали на темный фон
    if (force || (event && event.target === modal)) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Возвращаем скролл
    }
}




/* =========================================
   5. ЛОГИКА ДЗ (HOMEWORK)
   ========================================= */
let isHomeworkMode = false;

async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');
    const tasksList = document.getElementById('tasksList'); // Контейнер списка задач

    if (!isHomeworkMode) {
        // === ВКЛЮЧАЕМ РЕЖИМ ДЗ ===

        // 1. Скрываем ленту новостей
        if (feed) feed.classList.add('hidden');
        
        // 2. Показываем контейнер ДЗ
        if (hwContainer) hwContainer.classList.remove('hidden');
        
        // 3. ОБЯЗАТЕЛЬНО: Показываем сам список (убираем hidden, если он был)
        if (tasksList) tasksList.classList.remove('hidden');

        // 4. Меняем кнопку
        if (btn) btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';
        
        // --- ЗАГЛУШКА ВМЕСТО ЛОГИНА ---
        // Так как логина нет, мы вручную создаем пользователя, 
        // чтобы скрипт знал, для кого искать задания.
        // Можете поменять "group1" на ту группу, для которой хотите видеть ДЗ.
        currentUser = {
            name: "Ученик",
            group: "group1" 
        };

        // 5. Загружаем задания
        // Оборачиваем в try-catch, чтобы если там ошибка, кнопка не сломалась
        try {
            await loadPersonalHomework();
        } catch (e) {
            console.error("Ошибка при загрузке заданий:", e);
        }

        isHomeworkMode = true;

    } else {
        // === ВОЗВРАТ В ЛЕНТУ НОВОСТЕЙ ===

        if (feed) feed.classList.remove('hidden');
        if (hwContainer) hwContainer.classList.add('hidden');
        
        if (btn) btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        
        isHomeworkMode = false;
    }
}





async function loadHomework() {
    const container = document.getElementById('homework-container');
    container.innerHTML = '<h3 class="text-center mb-4 text-white">Актуальные задания</h3>'; 

    try {
        const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/homework.json');
        const data = await response.json();

        data.forEach(item => {
            let badgeClass = 'bg-secondary text-white';
            if (item.subject === 'math') badgeClass = 'badge-math';
            if (item.subject === 'cs') badgeClass = 'badge-cs';
            if (item.subject === 'phys') badgeClass = 'badge-phys';

            const card = document.createElement('div');
            card.className = 'material-card glass-card p-4 mb-3';
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="subject-badge ${badgeClass}">${item.subject.toUpperCase()}</span>
                    <span class="text-danger fw-bold"><i class="bi bi-clock me-1"></i>До: ${item.deadline}</span>
                </div>
                <h4>${item.title}</h4>
                <p class="mb-4">${item.task}</p>
                <a href="${item.link}" target="_blank" class="btn btn-outline-danger w-100">Перейти к выполнению</a>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML += '<p class="text-center text-danger">Ошибка загрузки ДЗ</p>';
    }
}


/* =========================================
   6. ФИЛЬТРАЦИЯ (EVENT LISTENER)
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const filterContainer = document.getElementById('filterContainer');
    if (!filterContainer) return;

    const btns = filterContainer.querySelectorAll('.filter-btn');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-filter');
            const cards = document.querySelectorAll('.material-card');
            
            cards.forEach(card => {
                if (category === 'all') {
                    card.classList.remove('hidden');
                } else {
                    if (card.classList.contains(category)) {
                        card.classList.remove('hidden');
                    } else {
                        card.classList.add('hidden');
                    }
                }
            });
        });
    });
});



/* =========================================
   ФУНКЦИЯ ЗАГРУЗКИ ПЕРСОНАЛЬНОГО ДЗ
   ========================================= */
async function loadPersonalHomework() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) {
        console.error('Контейнер tasksList не найден!');
        return;
    }

    // Очищаем список перед загрузкой и показываем спиннер
    tasksList.innerHTML = '<div class="text-center text-white w-100"><div class="spinner-border" role="status"></div><p class="mt-2">Поиск заданий...</p></div>';

    try {
        // Загружаем специальный файл с ДЗ (или используем общий data.json, если ДЗ там)
        // В вашем коде была ссылка на homework.json — используем её
        const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/homework.json');
        
        if (!response.ok) throw new Error('Файл homework.json не найден');
        
        const allHomework = await response.json();

        // Фильтруем задания для группы пользователя (currentUser задается в toggleHomeworkView)
        // Если в JSON нет поля group, будут показаны все задания
        const myTasks = allHomework.filter(item => {
            return !item.group || (currentUser && item.group === currentUser.group);
        });

        tasksList.innerHTML = ''; // Убираем спиннер

        if (myTasks.length === 0) {
            tasksList.innerHTML = '<div class="col-12 text-center text-white"><p class="fs-5">🎉 Ура! Актуальных заданий нет.</p></div>';
            return;
        }

        // Генерируем карточки
        myTasks.forEach(item => {
            let badgeClass = 'bg-secondary';
            let subjectName = item.subject || 'Общее';
            
            if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
            else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
            else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4'; // Сетка Bootstrap

            const card = document.createElement('div');
            card.className = `material-card glass-card h-100 ${item.subject}`;
            // Добавляем 3D эффект, если он включен
            if (typeof is3DEnabled !== 'undefined' && is3DEnabled && typeof VanillaTilt !== 'undefined') {
                VanillaTilt.init(card, { max: 5, speed: 500, glare: true, "max-glare": 0.3 });
            }

            // HTML структуры карточки ДЗ
            card.innerHTML = `
                <div class="card-body p-4 d-flex flex-column h-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="subject-badge ${badgeClass}">${subjectName}</span>
                        <span class="text-warning fw-bold small">
                            <i class="bi bi-calendar-event me-1"></i>${item.deadline || 'Без срока'}
                        </span>
                    </div>
                    
                    <h4 class="fw-bold mb-3">${item.title}</h4>
                    <p class="text-muted mb-4 flex-grow-1">${item.task || item.text || 'Описание отсутствует'}</p>
                    
                    <div class="mt-auto">
                        <a href="${item.link || '#'}" target="_blank" class="btn btn-outline-primary w-100 rounded-pill">
                            <i class="bi bi-play-circle me-2"></i>Перейти к выполнению
                        </a>
                    </div>
                </div>
            `;
            
            col.appendChild(card);
            tasksList.appendChild(col);
        });

    } catch (error) {
        console.error(error);
        // Если homework.json нет, пробуем искать в обычных материалах (фоллбэк)
        tasksList.innerHTML = `
            <div class="col-12 text-center text-danger">
                <p>Не удалось загрузить домашние задания.</p>
                <small class="text-muted">${error.message}</small>
            </div>`;
    }
}





