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

    // --- ЛОГИКА ЗАГРУЗКИ ---
    try {
        if (allMaterials.length === 0) {
            // 1. Загружаем данные
            // (Замените URL на ваш бакет или локальный файл)
            const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json'); 
            
            if (!response.ok) throw new Error('Ошибка сети');
            allMaterials = await response.json();
            
            // 2. ВАЖНО: Очищаем контейнер от спиннера!
            container.innerHTML = ''; 
        }
        
        // 3. Рисуем карточки
        renderNextBatch();
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div class="text-danger text-center">Ошибка загрузки данных</div>';
    }
}


function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    
    // Проверка данных
    if (!allMaterials || allMaterials.length === 0) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        // Создаем карточку
        const card = document.createElement('div');
        // Упрощенные классы для теста
        card.className = `material-card glass-card p-4 mb-4 filterDiv ${item.subject || ''}`;
        
        // Формируем HTML (Без сложной обработки текста)
        card.innerHTML = `
            <h4 class="fw-bold mb-2 text-white">${item.title}</h4>
            <div class="text-light opacity-75 mb-3" style="max-height: 100px; overflow: hidden;">
                ${item.text || 'Нет текста'}
            </div>
            <button class="btn btn-outline-primary btn-sm w-100">Подробнее</button>
        `;

        card.onclick = () => openModal(item);
        container.appendChild(card);
    });

    shownCount += nextItems.length;
    
    // Управление кнопкой "Показать еще"
    // Если loadMoreBtn не существует в HTML, код не упадет
    if (loadMoreBtn) {
        loadMoreBtn.classList.remove('hidden');
        if (shownCount >= allMaterials.length) {
            loadMoreBtn.classList.add('hidden');
        }
    }
}



/* =========================================
   4. МОДАЛЬНОЕ ОКНО
   ========================================= */

function openModal(item) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    
    // --- 1. ГЕНЕРАЦИЯ КОНТЕНТА ---
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

    // --- 2. РЕНДЕРИНГ ФОРМУЛ (MathJax) ---
    // Важно: вызываем это для перерисовки формул в новом контенте
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([modalBody]).catch((err) => console.log('MathJax error:', err));
    }

    // --- 3. ПОДСВЕТКА КОДА (Prism.js) ---
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }

    // --- 4. КНОПКИ КОПИРОВАНИЯ ---
    const preBlocks = modalBody.querySelectorAll('pre');
    preBlocks.forEach(pre => {
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

    // --- 5. ПОКАЗ ОКНА ---
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
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
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');
    const filterContainer = document.getElementById('filterContainer');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    const btn = document.getElementById('hwBtn');

    if (!feed || !hwContainer || !btn) return;

    if (!isHomeworkMode) {
        feed.classList.add('hidden');
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        
        const buttonsRow = filterContainer.querySelector('.d-flex'); 
        if(buttonsRow) buttonsRow.classList.add('hidden');

        hwContainer.classList.remove('hidden');

        btn.innerHTML = '<i class="bi bi-arrow-left me-2"></i>Вернуться к материалам';
        btn.style.backgroundColor = '#64748b'; 

        if (hwContainer.children.length <= 1) await loadHomework();
        isHomeworkMode = true;

    } else {
        feed.classList.remove('hidden');
        if (loadMoreBtn && shownCount < allMaterials.length) loadMoreBtn.classList.remove('hidden');

        const buttonsRow = filterContainer.querySelector('.d-flex'); 
        if(buttonsRow) buttonsRow.classList.remove('hidden');

        hwContainer.classList.add('hidden');

        btn.innerHTML = '<i class="bi bi-pencil-fill me-2"></i>Домашнее Задание';
        btn.style.backgroundColor = ''; 
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
   ФУНКЦИЯ ДОБАВЛЕНИЯ КНОПОК КОПИРОВАНИЯ
   ========================================= */
function addCopyButtons(container) {
    // Находим все блоки pre внутри контейнера
    const preBlocks = container.querySelectorAll('pre');

    preBlocks.forEach(pre => {
        // Если кнопка уже есть, пропускаем
        if (pre.querySelector('.copy-btn')) return;

        // Создаем контейнер-обертку (чтобы позиционировать кнопку)
        // Но проще просто сделать pre relative
        pre.style.position = 'relative';

        // Создаем кнопку
        const btn = document.createElement('button');
        btn.className = 'copy-btn btn btn-sm btn-dark position-absolute top-0 end-0 m-2';
        btn.innerHTML = '<i class="bi bi-clipboard"></i>';
        btn.title = 'Копировать код';
        btn.style.zIndex = '10';
        btn.style.opacity = '0.7';

        // Логика клика
        btn.onclick = () => {
            const code = pre.querySelector('code');
            if (!code) return;

            // Копируем текст
            navigator.clipboard.writeText(code.innerText).then(() => {
                // Успех: меняем иконку
                btn.innerHTML = '<i class="bi bi-check-lg text-success"></i>';
                setTimeout(() => {
                    btn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
                btn.innerHTML = '<i class="bi bi-x-lg text-danger"></i>';
            });
        };

        // Добавляем кнопку в блок
        pre.appendChild(btn);
    });
}














