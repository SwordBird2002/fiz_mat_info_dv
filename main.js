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
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false'; 

function init3DButton() {
    update3DIcon();
    if (!is3DEnabled) disableAllTilt();
}

function toggle3D() {
    is3DEnabled = !is3DEnabled;
    localStorage.setItem('3d_enabled', is3DEnabled);
    update3DIcon();
    if (is3DEnabled) {
        location.reload(); 
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
   3. ЗАГРУЗКА МАТЕРИАЛОВ (ЛЕНТА)
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;

async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    let loadMoreContainer = document.getElementById('loadMoreContainer');
    if (!loadMoreContainer) {
        loadMoreContainer = document.createElement('div');
        loadMoreContainer.id = 'loadMoreContainer';
        loadMoreContainer.className = 'text-center mt-4 mb-5 hidden';
        loadMoreContainer.innerHTML = `<button class="btn btn-outline-primary px-4 rounded-pill" onclick="renderNextBatch()">Показать еще</button>`;
        container.parentNode.insertBefore(loadMoreContainer, container.nextSibling);
    }

    try {
        if (allMaterials.length === 0) {
            const response = await fetch('https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json');
            if (!response.ok) throw new Error('Ошибка сети');
            allMaterials = await response.json();
            container.innerHTML = '';
        }
        renderNextBatch();
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<div class="text-center text-danger py-5"><h4>Не удалось загрузить материалы</h4></div>`;
    }
}

function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const btnContainer = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        let badgeClass = '', subjectName = '';
        if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
        else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
        else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

        // ОБЕРТКА ДЛЯ ФИЛЬТРАЦИИ И СЕТКИ
        const wrapper = document.createElement('div');
        wrapper.className = `col-md-6 col-lg-4 mb-4 filterDiv ${item.subject}`; // Сетка Bootstrap

        const card = document.createElement('div');
        card.className = `material-card glass-card p-4 h-100 d-flex flex-column`; 
        card.style.cursor = 'pointer';

        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, { max: 5, speed: 500, glare: true, "max-glare": 0.3, scale: 1.02 });
        }

        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        let mediaHtml = item.image ? `<img src="${item.image}" class="img-fluid rounded mb-3" style="max-height: 200px; width: 100%; object-fit: cover;">` : '';
        let shortText = item.text ? item.text.substring(0, 100) + '...' : '';

        card.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span class="subject-badge ${badgeClass}">${subjectName}</span>
                <small class="text-muted opacity-75">${item.date}</small>
            </div>
            ${mediaHtml}
            <h5 class="fw-bold mb-2">${item.title}</h5>
            <div class="text-muted small mb-3 flex-grow-1">${shortText}</div>
            <button class="btn btn-outline-primary btn-sm w-100 mt-auto">Подробнее</button>
        `;
        
        wrapper.appendChild(card);
        container.appendChild(wrapper);
    });

    shownCount += nextItems.length;

    if (btnContainer) {
        if (shownCount >= allMaterials.length) btnContainer.classList.add('hidden');
        else btnContainer.classList.remove('hidden');
    }

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([container]).catch(err => console.log('MathJax error:', err));
    }
}

document.addEventListener('DOMContentLoaded', loadMaterials);


/* =========================================
   4. МОДАЛЬНОЕ ОКНО
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;

    let mediaHtml = item.image ? `<img src="${item.image}" class="img-fluid rounded mb-4 w-100">` : '';
    
    let fileHtml = '';
    if (item.file) {
        fileHtml = `
        <div class="p-3 mt-4 bg-light bg-opacity-50 rounded border d-flex align-items-center">
            <i class="bi bi-file-earmark-text fs-3 text-primary me-3"></i>
            <div>
                <div class="fw-bold">${item.file.name}</div>
                <div class="small text-muted">${item.file.size || ''}</div>
            </div>
            <a href="${item.file.url}" class="btn btn-sm btn-primary ms-auto" download>Скачать</a>
        </div>`;
    }

    let linkHtml = '';
    if (item.link) {
        linkHtml = `<a href="${item.link}" target="_blank" class="btn btn-outline-primary w-100 mt-3"><i class="bi bi-box-arrow-up-right me-2"></i>${item.linkText || 'Открыть ссылку'}</a>`;
    }

    modalBody.innerHTML = `
        <div class="mb-3">
            <span class="badge bg-secondary">${item.subject === 'math' ? 'Математика' : item.subject === 'cs' ? 'Информатика' : 'Физика'}</span>
            <span class="text-muted ms-2">${item.date}</span>
        </div>
        <h2 class="fw-bold mb-4">${item.title}</h2>
        ${mediaHtml}
        <div class="article-content fs-5" style="line-height: 1.7; text-align: justify;">
            ${item.text}
        </div>
        ${fileHtml}
        ${linkHtml}
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([modalBody]).catch(err => console.log(err));
    }
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    addCopyButtons(modalBody);
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
        btn.className = 'btn btn-sm btn-light position-absolute top-0 end-0 m-2 copy-btn opacity-50';
        btn.innerHTML = '<i class="bi bi-clipboard"></i>';
        btn.onclick = () => {
            const code = pre.querySelector('code');
            if(code) {
                navigator.clipboard.writeText(code.innerText);
                btn.innerHTML = '<i class="bi bi-check2"></i>';
                setTimeout(() => btn.innerHTML = '<i class="bi bi-clipboard"></i>', 2000);
            }
        };
        pre.appendChild(btn);
    });
}


/* =========================================
   5. ДОМАШНЕЕ ЗАДАНИЕ (ВОССТАНОВЛЕНО)
   ========================================= */
async function toggleHomeworkView() {
    const btn = document.getElementById('hw-toggle-btn');
    const feed = document.getElementById('feed-container');
    const btnMore = document.getElementById('loadMoreContainer');
    const filterDiv = document.getElementById('filterContainer');
    
    // Создаем контейнер ДЗ, если его нет
    let hwContainer = document.getElementById('homework-container');
    if (!hwContainer) {
        hwContainer = document.createElement('div');
        hwContainer.id = 'homework-container';
        hwContainer.className = 'hidden container mt-4';
        if(feed && feed.parentNode) feed.parentNode.insertBefore(hwContainer, feed.nextSibling);
    }

    if (!btn.classList.contains('active-hw')) {
        // -> ВКЛЮЧАЕМ РЕЖИМ ДЗ
        btn.classList.add('active-hw');
        btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';
        
        if(feed) feed.classList.add('hidden');
        if (btnMore) btnMore.classList.add('hidden');
        if (filterDiv) filterDiv.classList.add('hidden'); // Скрываем фильтры

        hwContainer.classList.remove('hidden');
        await loadPersonalHomework(hwContainer);

    } else {
        // -> ВОЗВРАТ В ЛЕНТУ
        btn.classList.remove('active-hw');
        btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        
        if(feed) feed.classList.remove('hidden');
        if (btnMore && shownCount < allMaterials.length) btnMore.classList.remove('hidden');
        if (filterDiv) filterDiv.classList.remove('hidden'); // Показываем фильтры
        
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
            card.className = 'glass-card p-4 mb-3';
            card.style.animation = 'fadeIn 0.5s ease';
            
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-danger">${task.subject}</span>
                    <small class="text-muted fw-bold">Дедлайн: ${task.deadline}</small>
                </div>
                <h5 class="fw-bold">${task.title}</h5>
                <p class="mb-3">${task.task}</p>
                <a href="${task.link}" target="_blank" class="btn btn-outline-primary btn-sm w-100">
                    <i class="bi bi-pencil-square me-2"></i>Перейти к выполнению
                </a>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="alert alert-danger text-center">
                Не удалось загрузить домашнее задание.<br>
                <small>${error.message}</small>
            </div>`;
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
            // Ищем элементы с классом filterDiv (это обертки карточек)
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
});
