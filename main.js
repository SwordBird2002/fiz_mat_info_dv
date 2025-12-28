/* =========================================
   1. ИНИЦИАЛИЗАЦИЯ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;
let isHomeworkMode = false;
let currentUser = null;

// Темы и 3D (оставляем как было)
let is3DEnabled = localStorage.getItem('3d_enabled') !== 'false';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    init3DButton();
    // Фильтры
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.getAttribute('data-filter');
            document.querySelectorAll('.material-card').forEach(card => {
                if (cat === 'all' || card.classList.contains(cat)) card.classList.remove('hidden');
                else card.classList.add('hidden');
            });
        });
    });
    
    loadMaterials();
});

/* =========================================
   2. ЗАГРУЗКА И РЕНДЕР
   ========================================= */
async function loadMaterials() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    try {
        if (allMaterials.length === 0) {
            // ВАША ССЫЛКА
            const response = await fetch('data.json'); 
            if (!response.ok) throw new Error('Ошибка');
            allMaterials = await response.json();
            container.innerHTML = ''; // Убираем спиннер
        }
        renderNextBatch();
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-center text-white">Ошибка загрузки</p>';
    }
}

function renderNextBatch() {
    const container = document.getElementById('feed-container');
    const loadMoreBtn = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    const nextItems = allMaterials.slice(shownCount, shownCount + step);

    nextItems.forEach(item => {
        // Стили
        let badgeClass = '', subjectName = '';
        if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
        else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
        else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

        const card = document.createElement('div');
        // Ваш старый класс + col-md-6 для сетки
        card.className = `material-card glass-card p-4 mb-4 filterDiv ${item.subject} col-md-6`; 
        card.style.cursor = 'pointer';

        // 3D
        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, { max: 5, speed: 500, glare: true, "max-glare": 0.2, scale: 1.02 });
        }

        let mediaHtml = '';
        if (item.image) {
            mediaHtml = `<div class="mb-3" style="height: 180px; overflow: hidden; border-radius: 12px;">
                <img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>`;
        }

        // Вставляем текст КАК ЕСТЬ (без замен regex, чтобы не ломалось)
        // Формулы в превью будут выглядеть как $E=mc^2$ (текстом)
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="subject-badge ${badgeClass}">${subjectName}</span>
                <small class="text-muted">${item.date}</small>
            </div>
            ${mediaHtml}
            <h4 class="fw-bold mb-2 text-white">${item.title}</h4>
            
            <div class="text-light opacity-75 mb-3" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                ${item.text} 
            </div>

            <button class="btn btn-outline-primary btn-sm w-100 mt-auto">Подробнее</button>
        `;

        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        container.appendChild(card);
    });

    shownCount += nextItems.length;

    if (loadMoreBtn) {
        if (shownCount >= allMaterials.length) loadMoreBtn.classList.add('hidden');
        else loadMoreBtn.classList.remove('hidden');
    }
}

/* =========================================
   3. МОДАЛКА (С РАБОЧИМ MATHJAX)
   ========================================= */
function openModal(item) {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    
    let mediaHtml = '';
    if (item.image) mediaHtml = `<img src="${item.image}" class="img-fluid rounded mb-4 w-100">`;
    
    // Вставляем контент
    modalBody.innerHTML = `
        <span class="subject-badge badge-${item.subject} mb-3 d-inline-block">
            ${item.subject === 'math' ? 'Математика' : item.subject === 'cs' ? 'Информатика' : 'Физика'}
        </span>
        <h2 class="fw-bold mb-3">${item.title}</h2>
        <p class="text-muted mb-4">${item.date}</p>
        ${mediaHtml}
        <div class="fs-5" style="line-height: 1.6;">${item.text}</div>
    `;

    // 1. MathJax (ТОЛЬКО ЗДЕСЬ)
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([modalBody]).catch(err => console.log(err));
    }

    // 2. Prism
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    
    // 3. Копирование
    addCopyButtons(modalBody);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('newsModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ... (Функции темы и ДЗ оставляем как у вас были в оригинале) ...

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
