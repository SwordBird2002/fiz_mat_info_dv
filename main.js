/* --- 1. УПРАВЛЕНИЕ ТЕМОЙ --- */
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

// Запускаем тему сразу при загрузке
document.addEventListener('DOMContentLoaded', initTheme);


/* --- 2. ЗАГРУЗКА МАТЕРИАЛОВ (ТОЛЬКО ДЛЯ materials.html) --- */
async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return; // Если мы не на странице материалов, выходим

    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        container.innerHTML = ''; // Очищаем контейнер

        data.forEach(item => {
            // Определяем цвет бейджа и название
            let badgeClass = '', subjectName = '';
            if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
            else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
            else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

            // Генерируем HTML для файла (если есть)
            let fileHtml = '';
            if (item.file) {
                fileHtml = `
                <div class="download-box">
                    <i class="bi bi-file-earmark-pdf-fill download-icon"></i>
                    <div>
                        <div class="fw-bold">${item.file.name}</div>
                        <div class="text-muted small">${item.file.size}</div>
                    </div>
                    <a href="${item.file.url}" class="btn btn-primary ms-auto btn-sm" download>Скачать</a>
                </div>`;
            }

            // Генерируем HTML для картинки/ссылки (если есть)
            let mediaHtml = '';
            if (item.image) {
                mediaHtml = `<img src="${item.image}" class="img-fluid rounded mt-2 mb-3">`;
            }
            if (item.link) {
                mediaHtml += `<a href="${item.link}" class="btn btn-outline-primary w-100">${item.linkText || 'Открыть'}</a>`;
            }

            // Собираем карточку
            const card = document.createElement('div');
            card.className = `material-card glass-card filterDiv ${item.subject}`;
            card.innerHTML = `
                <div class="card-header-custom">
                    <span class="subject-badge ${badgeClass}">${subjectName}</span>
                    <small class="text-muted">${item.date}</small>
                </div>
                <div class="card-content">
                    <h4>${item.title}</h4>
                    <p>${item.text}</p>
                    ${mediaHtml}
                    ${fileHtml}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<p class="text-center text-danger">Не удалось загрузить материалы.</p>';
    }
}

// Запускаем загрузку, если мы на странице материалов
if (document.getElementById('feed-container')) {
    document.addEventListener('DOMContentLoaded', loadMaterials);
}







/* --- 3. ЛОГИКА ДОМАШНЕГО ЗАДАНИЯ --- */
let isHomeworkMode = false;

async function toggleHomeworkView() {
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');
    const filterContainer = document.querySelector('.d-flex.justify-content-center'); // Блок с кнопками фильтров
    const btn = document.getElementById('hwBtn');

    if (!isHomeworkMode) {
        // ВКЛЮЧАЕМ РЕЖИМ ДЗ
        feed.classList.add('hidden');          // Прячем материалы
        filterContainer.classList.add('hidden'); // Прячем фильтры (если не нужны для ДЗ)
        hwContainer.classList.remove('hidden'); // Показываем контейнер ДЗ
        
        // Меняем кнопку на "Назад"
        btn.innerHTML = '<i class="bi bi-arrow-left me-2"></i>Вернуться к материалам';
        btn.style.backgroundColor = '#64748b'; // Делаем серой
        
        // Загружаем данные (если еще не загружали)
        if (hwContainer.children.length <= 1) { 
            await loadHomework();
        }
    } else {
        // ВЫКЛЮЧАЕМ РЕЖИМ ДЗ (Возврат назад)
        feed.classList.remove('hidden');
        filterContainer.classList.remove('hidden');
        hwContainer.classList.add('hidden');
        
        // Возвращаем кнопку как было
        btn.innerHTML = '<i class="bi bi-pencil-fill me-2"></i>Домашнее Задание';
        btn.style.backgroundColor = ''; // Сброс цвета (вернется оранжевый из CSS)
    }

    isHomeworkMode = !isHomeworkMode;
}

async function loadHomework() {
    const container = document.getElementById('homework-container');
    container.innerHTML = '<h3 class="text-center mb-4">Актуальные задания</h3>'; // Очистка + заголовок

    try {
        const response = await fetch('homework.json');
        const data = await response.json();

        data.forEach(item => {
            // Определяем цвет (как в материалах)
            let badgeClass = 'bg-secondary text-white';
            if (item.subject === 'math') badgeClass = 'badge-math';
            if (item.subject === 'cs') badgeClass = 'badge-cs';
            if (item.subject === 'phys') badgeClass = 'badge-phys';

            const card = document.createElement('div');
            // Карточка ДЗ может выглядеть немного иначе (например, с красной рамкой дедлайна)
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

