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
