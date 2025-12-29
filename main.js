/* =========================================
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;
let isLoading = false;       
let currentActiveItem = null; 

// S3 URL
const S3_BASE_URL = "https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json";
// Google Script для отправки отчетов
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyTpgws_8fcXbj_S3sejl-ANN4SIkKAFAn497MI86zgwiXwS_7FJG_cH-a6nLBevBuJqw/exec"; // Вставьте ID скрипта

// === НОВОЕ: API РЕАКЦИЙ ===
// ВСТАВЬТЕ СЮДА ССЫЛКУ НА ВАШ НОВЫЙ СКРИПТ (Apps Script)
const REACTIONS_API = "https://script.google.com/macros/s/AKfycbyTpgws_8fcXbj_S3sejl-ANN4SIkKAFAn497MI86zgwiXwS_7FJG_cH-a6nLBevBuJqw/exec";
let reactionsCache = {}; // Кэш для хранения счетчиков

/* =========================================
   1. УПРАВЛЕНИЕ ТЕМОЙ
   ========================================= */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Вставляем стили для реакций программно (чтобы не ломать старый CSS)
    const style = document.createElement('style');
    style.innerHTML = `
        .reaction-btn {
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 0.85rem;
            transition: all 0.2s;
            border: 1px solid rgba(0,0,0,0.1);
            background: rgba(255,255,255,0.7);
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        [data-theme="dark"] .reaction-btn {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
            color: #eee;
        }
        .reaction-btn:hover { transform: scale(1.05); }
        .reaction-btn:active { transform: scale(0.95); }
        
        .reaction-btn.active-like {
            background-color: #dc3545 !important; 
            color: white !important;
            border-color: #dc3545 !important;
        }
        .reaction-btn.active-fire { 
            background-color: #ffc107 !important; 
            border-color: #ffc107 !important;
            color: black !important;
        }
        .reactions-container.hidden-force { display: none !important; }
    `;
    document.head.appendChild(style);
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
   НОВОЕ: ЗАГРУЗКА РЕАКЦИЙ (С ЗАЩИТОЙ ОТ СБОЕВ)
   ========================================= */
async function loadReactionsMap() {
    try {
        // Создаем AbortController для таймаута (3 секунды)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(REACTIONS_API, { 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId); // Отменяем таймаут, если успели

        if (!res.ok) throw new Error("Google blocked or server error");
        
        reactionsCache = await res.json();
        updateReactionsUI(); // Обновляем цифры на странице

    } catch(e) { 
        console.warn("Система реакций временно недоступна (VPN/Блокировка):", e);
        // Скрываем блок с реакциями, чтобы не смущать нулями
        document.body.classList.add('reactions-unavailable');
        const bars = document.querySelectorAll('.reactions-container');
        bars.forEach(b => b.classList.add('hidden-force'));
    }
}

function updateReactionsUI() {
    // Пробегаемся по всем кнопкам и обновляем цифры из кэша
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        if (reactionsCache[id] && reactionsCache[id][type] !== undefined) {
            btn.querySelector('.count').innerText = reactionsCache[id][type];
        }
    });
}


/* =========================================
   3. ЗАГРУЗКА МАТЕРИАЛОВ (С ПАГИНАЦИЕЙ)
   ========================================= */
async function loadMaterials(restoreCount) {
    if (isLoading) return; 
    isLoading = true;

    const container = document.getElementById('feed-container');
    if (!container) { isLoading = false; return; }

    // Запускаем загрузку реакций параллельно (не блокируем интерфейс)
    loadReactionsMap();

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
            // ОПТИМИЗАЦИЯ: убран no-store
            const response = await fetch(`${S3_BASE_URL}/data.json`);
            if (!response.ok) throw new Error('Ошибка сети');
            allMaterials = await response.json();
            container.innerHTML = '';
        }

        if (typeof restoreCount === 'number') {
            renderNextBatch(restoreCount);
        } else {
            if (shownCount === 0) {
                renderNextBatch();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<p class="text-center text-danger">Не удалось загрузить материалы.</p>';
    } finally {
        isLoading = false; 
    }
}

function renderNextBatch(customCount) {
    const container = document.getElementById('feed-container');
    const btnContainer = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    let countToAdd = step;
    if (typeof customCount === 'number') {
        countToAdd = customCount; 
    }

    const nextItems = allMaterials.slice(shownCount, shownCount + countToAdd);

    nextItems.forEach(item => {
        let badgeClass = '', subjectName = '';
        if (item.subject === 'math') { badgeClass = 'badge-math'; subjectName = 'Математика'; }
        else if (item.subject === 'cs') { badgeClass = 'badge-cs'; subjectName = 'Информатика'; }
        else if (item.subject === 'phys') { badgeClass = 'badge-phys'; subjectName = 'Физика'; }

        const card = document.createElement('div');
        card.dataset.title = item.title;
        card.className = `material-card glass-card filterDiv ${item.subject}`;
        card.style.cursor = 'pointer';

        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, {
                max: 5, speed: 500, glare: true, "max-glare": 0.3, scale: 1.02, gyroscope: true
            });
        }

        card.onclick = (e) => {
            // Чтобы клик по кнопкам реакций не открывал модалку
            if(e.target.closest('button') || e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        let filePreview = item.file ? '<div class="text-muted small mt-2"><i class="bi bi-paperclip"></i> Прикреплен файл</div>' : '';

        // === ГЕНЕРАЦИЯ БЛОКА РЕАКЦИЙ ===
        const likesVal = (reactionsCache[item.id] && reactionsCache[item.id].likes) || 0;
        const fireVal = (reactionsCache[item.id] && reactionsCache[item.id].fire) || 0;
        
        // Проверяем, лайкал ли уже пользователь (localStorage)
        const isLiked = localStorage.getItem(`reacted_${item.id}_likes`) ? 'active-like' : '';
        const isFired = localStorage.getItem(`reacted_${item.id}_fire`) ? 'active-fire' : '';

        // Проверяем, не в режиме ли мы "без реакций" (если была ошибка)
        const hideClass = document.body.classList.contains('reactions-unavailable') ? 'hidden-force' : '';

        const reactionsHtml = `
        <div class="reactions-container mt-3 d-flex gap-2 ${hideClass}">
            <button class="btn reaction-btn ${isLiked}" 
                    data-id="${item.id}" data-type="likes"
                    onclick="toggleReaction('${item.id}', 'likes', this)">
                <i class="bi bi-heart${isLiked ? '-fill' : ''}"></i> 
                <span class="count">${likesVal}</span>
            </button>
            
            <button class="btn reaction-btn ${isFired}" 
                    data-id="${item.id}" data-type="fire"
                    onclick="toggleReaction('${item.id}', 'fire', this)">
                🔥 <span class="count">${fireVal}</span>
            </button>
        </div>`;
        // ================================

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
                ${reactionsHtml}
                <div class="text-primary small mt-2 fw-bold">Читать подробнее</div>
            </div>
        `;
        container.appendChild(card);
    });

    shownCount += nextItems.length;

    if (shownCount >= allMaterials.length) {
        if (btnContainer) btnContainer.classList.add('hidden');
    } else {
        if (btnContainer) btnContainer.classList.remove('hidden');
    }

    initCodeBlocks(container);
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise([container]).catch(err => console.log('MathJax feed error:', err));
    }
}

// === НОВОЕ: ОБРАБОТКА КЛИКА ПО РЕАКЦИИ ===
async function toggleReaction(newsId, type, btn) {
    // 1. Optimistic UI (меняем сразу)
    const countSpan = btn.querySelector('.count');
    let current = parseInt(countSpan.innerText) || 0;
    const storageKey = `reacted_${newsId}_${type}`;
    const hasReacted = localStorage.getItem(storageKey);
    
    let action = 'add';
    
    if (hasReacted) {
        // Убираем лайк
        current = Math.max(0, current - 1);
        action = 'remove';
        localStorage.removeItem(storageKey);
        
        if (type === 'likes') {
            btn.classList.remove('active-like');
            btn.querySelector('i').className = 'bi bi-heart';
        } else {
            btn.classList.remove('active-fire');
        }
    } else {
        // Ставим лайк
        current++;
        localStorage.setItem(storageKey, 'true');
        
        if (type === 'likes') {
            btn.classList.add('active-like');
            btn.querySelector('i').className = 'bi bi-heart-fill';
        } else {
            btn.classList.add('active-fire');
        }
    }
    
    countSpan.innerText = current;

    // 2. Отправляем на сервер (Google)
    try {
        await fetch(REACTIONS_API, {
            method: 'POST',
            mode: 'no-cors', // Важно для Google Apps Script
            body: JSON.stringify({ id: newsId, type: type, action: action })
        });
    } catch (e) {
        console.error("Ошибка отправки реакции:", e);
        // Можно не откатывать интерфейс, чтобы не бесить пользователя. 
        // При обновлении страницы цифра синхронизируется, если запрос не прошел.
    }
}


if (document.getElementById('feed-container')) {
    document.addEventListener('DOMContentLoaded', () => loadMaterials());
}


/* =========================================
   4. МОДАЛЬНОЕ ОКНО
   ========================================= */
function openModal(item) {
    currentActiveItem = item; 

    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    
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

    initCodeBlocks(modalBody);
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise([modalBody]).catch(err => console.log('MathJax modal error:', err));
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
}

async function closeModal(force) {
    const modal = document.getElementById('newsModal');
    
    if (force || (window.event && window.event.target === modal)) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; 
        
        const targetTitle = currentActiveItem ? currentActiveItem.title : null;
        const countToRestore = shownCount > 0 ? shownCount : step;
        
        allMaterials = []; 
        shownCount = 0;
        
        const container = document.getElementById('feed-container');
        if (container) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
        }

        await loadMaterials(countToRestore);

        if (targetTitle) {
            setTimeout(() => {
                const cards = document.querySelectorAll('.material-card');
                for (const card of cards) {
                    if (card.dataset.title === targetTitle) {
                        card.scrollIntoView({ behavior: 'auto', block: 'center' });
                        break;
                    }
                }
            }, 100);
        }
    }
}


/* =========================================
   5. ЛОГИКА ДЗ (ОПТИМИЗИРОВАННАЯ)
   ========================================= */
let isHomeworkMode = false;
let _namesCache = null; // ОПТИМИЗАЦИЯ: Кэш в памяти

async function loadNamesMap() {
  if (_namesCache) return _namesCache; // Если уже загружено - возвращаем из памяти
  
  // ОПТИМИЗАЦИЯ: Убрали timestamp, используем кэш браузера
  const resp = await fetch(`${S3_BASE_URL}/names.json`);
  if (!resp.ok) throw new Error("Не удалось загрузить names.json");
  
  const names = await resp.json();
  _namesCache = names;
  return names;
}

async function validateStudentToken(token) {
  try {
      const names = await loadNamesMap();
      return Boolean(names && Object.prototype.hasOwnProperty.call(names, token));
  } catch(e) { return false; }
}

async function toggleHomeworkView() {
    const btn = document.getElementById('hwBtn');
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');

    if (!isHomeworkMode) {
        // === ВХОД В ДЗ ===
        if (feed) feed.classList.add('hidden');
        if (hwContainer) hwContainer.classList.remove('hidden');
        if (btn) btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';

        const savedToken = localStorage.getItem('student_token');
        
        if (savedToken) {
            hwContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Проверка доступа...</p></div>';
            const isValid = await validateStudentToken(savedToken);
            if (isValid) {
                await loadHomework(savedToken);
            } else {
                localStorage.removeItem('student_token');
                renderLoginForm("Ваш токен устарел или был удален.");
            }
        } else {
            renderLoginForm();
        }
        isHomeworkMode = true;
    } else {
        // === ВЫХОД В НОВОСТИ ===
        if (feed) feed.classList.remove('hidden');
        if (hwContainer) hwContainer.classList.add('hidden');
        if (btn) btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        isHomeworkMode = false;
    }
}

function renderLoginForm(initialError = '') {
    const container = document.getElementById('homework-container');
    const errorHtml = initialError ? `<div class="alert alert-danger py-2 small fw-bold mb-3"><i class="bi bi-exclamation-triangle-fill me-2"></i>${initialError}</div>` : '';

    container.innerHTML = `
        <div class="row justify-content-center animate__animated animate__fadeIn">
            <div class="col-md-8 col-lg-6">
                <div class="glass-card p-5 text-center">
                    
                    <div class="mb-4 icon-container">
                        <div class="gradient-blob"></div>
                        <i class="bi bi-shield-lock-fill text-white position-relative" style="font-size: 3rem; z-index: 2; text-shadow: 0 2px 10px rgba(0,0,0,0.3);"></i>
                    </div>
                    
                    <h3 class="mb-2 fw-bold login-title">Вход в систему</h3>
                    <p class="mb-4 login-desc">Введите ваш персональный токен доступа</p>
                    
                    ${errorHtml}

                    <div class="row justify-content-center">
                        <div class="col-sm-10">
                            <div class="form-floating mb-3 text-dark">
                                <input type="text" class="form-control border-0 shadow-sm" id="tokenInput" placeholder="Ваш токен">
                                <label for="tokenInput">Ваш токен</label>
                            </div>
                            
                            <button onclick="saveTokenAndReload()" class="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-lg mt-2 transition-btn" style="background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%); border: none;">
                                Войти в личный кабинет
                            </button>
                            
                            <div id="loginError" class="text-danger mt-3 small fw-bold" style="min-height: 20px;"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const input = document.getElementById('tokenInput');
        if(input) {
            input.focus(); 
            input.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') saveTokenAndReload();
            });
        }
    }, 100);
}

async function saveTokenAndReload() {
  const input = document.getElementById("tokenInput");
  const errorDiv = document.getElementById("loginError");
  const token = (input?.value || "").trim();

  if (errorDiv) errorDiv.innerText = "";

  if (!token) {
    if (errorDiv) errorDiv.innerText = "Введите токен.";
    return;
  }

  try {
    const ok = await validateStudentToken(token);

    if (!ok) {
      localStorage.removeItem("student_token");
      if (errorDiv) errorDiv.innerText = "Неверный токен.";
      if (input) input.focus();
      return;
    }

    localStorage.setItem("student_token", token);
    await loadHomework(token);
  } catch (e) {
    console.error(e);
    if (errorDiv) errorDiv.innerText = "Ошибка проверки токена.";
  }
}

function logoutStudent() {
    localStorage.removeItem('student_token'); 
    renderLoginForm(); 
}

/* =========================================
   ЗАГРУЗКА ДЗ
   ========================================= */
async function loadHomework(token) {
    const container = document.getElementById('homework-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Вход в систему...</p></div>';

    try {
        // ОПТИМИЗАЦИЯ: Убрали timestamp
        const hwResponse = await fetch(`${S3_BASE_URL}/homework.json`);
        if (!hwResponse.ok) throw new Error('Не удалось загрузить список заданий');
        const data = await hwResponse.json();
        
        // ОПТИМИЗАЦИЯ: Берем имена из кэша (памяти), не качаем файл
        const studentNames = await loadNamesMap(); 

        const myTasks = data.filter(item => {
            if (!item.allowed_tokens || !Array.isArray(item.allowed_tokens) || item.allowed_tokens.length === 0) {
                return true; 
            }
            return item.allowed_tokens.includes(token);
        });

        const displayName = (studentNames && studentNames[token]) ? studentNames[token] : token;

        let htmlContent = `
            <div class="glass-card p-4 mb-5 d-flex flex-column flex-md-row justify-content-between align-items-center animate__animated animate__fadeInDown">
                <div class="d-flex align-items-center mb-3 mb-md-0">
                    <div class="bg-primary rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style="width: 60px; height: 60px; background: rgba(255,255,255,0.1) !important;">
                        <i class="bi bi-person-fill fs-2 text-white"></i>
                    </div>
                    <div>
                        <small class="text-muted d-block text-uppercase fw-bold" style="letter-spacing: 1px;">Ученик</small>
                        <span class="fs-3 gradient-text">${displayName}</span>
                    </div>
                </div>
                <button onclick="logoutStudent()" class="btn btn-outline-danger rounded-pill px-4">
                    <i class="bi bi-box-arrow-right me-2"></i>Выйти
                </button>
            </div>
            <h4 class="text-white mb-4 ps-2 border-start border-4 border-primary ps-3">Ваши задания</h4>
            <div class="row g-4">
        `;

        if (myTasks.length === 0) {
            htmlContent += `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-folder2-open text-white-50" style="font-size: 3rem;"></i>
                    <p class="fs-5 text-white mt-3">Для пользователя <b>${displayName}</b> новых заданий нет.</p>
                </div>`;
        } else {
            myTasks.forEach(item => {
                let badgeClass = 'bg-secondary';
                if (item.subject === 'math') badgeClass = 'badge-math';
                if (item.subject === 'cs') badgeClass = 'badge-cs';
                if (item.subject === 'phys') badgeClass = 'badge-phys';

                let personalBadge = '';
                if (item.allowed_tokens && item.allowed_tokens.length > 0) {
                    personalBadge = '<span class="badge bg-warning text-dark ms-2"><i class="bi bi-lock-fill"></i> Личное</span>';
                }

                let imageHtml = '';
                if (item.image) {
                     imageHtml = `<img src="${item.image}" class="img-fluid rounded mb-3 border" alt="Task Image" style="max-height: 300px; object-fit: cover; width: 100%;">`;
                }

                htmlContent += `
                <div class="col-md-6 col-lg-4">
                    <div class="material-card glass-card h-100 p-4 d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <span class="subject-badge ${badgeClass}">${item.subject ? item.subject.toUpperCase() : 'INFO'}</span>
                                ${personalBadge}
                            </div>
                            <span class="text-danger fw-bold small"><i class="bi bi-clock me-1"></i>${item.deadline}</span>
                        </div>
                        <h4 class="fw-bold mb-3">${item.title}</h4>
                        ${imageHtml}
                        <div class="mb-4 text-muted flex-grow-1" style="overflow-wrap: break-word;">${item.task}</div>
                        
                        <div class="mt-auto pt-3">
                            <a href="${item.link || '#'}" target="_blank" class="btn btn-outline-danger w-100 mb-2">Перейти к выполнению</a>
                            <button id="btn-done-${item.id}" onclick="markTaskAsDone('${item.id}', '${token}', this)" class="btn btn-success w-100 text-white">
                                <i class="bi bi-check-circle me-2"></i>Я сделал
                            </button>
                        </div>
                    </div>
                </div>`;
            });
        }
        
        htmlContent += '</div>';
        container.innerHTML = htmlContent;

        if (typeof MathJax !== 'undefined') {
            MathJax.typesetPromise([container]).catch(err => console.log('MathJax hw error:', err));
        }
        if (typeof initCodeBlocks === 'function') {
            initCodeBlocks(container);
        }

    } catch (error) {
        console.error(error);
        container.innerHTML = `
            <div class="text-center text-danger py-5">
                <h4>Ошибка загрузки</h4>
                <p>${error.message}</p>
                <button onclick="logoutStudent()" class="btn btn-outline-light mt-3">Назад</button>
            </div>`;
    }
}

// Отправка отчета в Google (no-cors)
async function markTaskAsDone(hwId, token, btnElement) {
    if(!confirm("Вы уверены, что выполнили это задание? Учитель увидит отметку.")) return;

    btnElement.disabled = true;
    btnElement.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Отправка...';

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token: token, hw_id: hwId })
        });

        btnElement.className = "btn btn-secondary w-100";
        btnElement.innerHTML = '<i class="bi bi-check2-all"></i> Отправлено на проверку';
        localStorage.setItem(`done_${token}_${hwId}`, 'true');

    } catch (e) {
        alert("Ошибка отправки. Проверьте интернет.");
        btnElement.disabled = false;
        btnElement.innerText = "Я сделал";
    }
}


/* =========================================
   6. УВЕДОМЛЕНИЯ (POLLING)
   ======================================== */
async function checkNotifications() {
    const token = localStorage.getItem('student_token');
    if (!token) return;

    try {
        const ts = Date.now();
        // Здесь оставляем no-store, так как уведомления нужны свежие
        const response = await fetch(`${S3_BASE_URL}/notifications.json?t=${ts}`, { cache: "no-store" });
        if(!response.ok) return;
        
        const alerts = await response.json();
        if (alerts[token]) {
            showToast(alerts[token]);
        }
    } catch (e) { console.error(e); }
}

function showToast(message) {
    if (document.getElementById('liveToast')) return; // Не показывать, если уже висит

    const toastHtml = `
    <div class="position-fixed top-0 end-0 p-3" style="z-index: 1100">
      <div id="liveToast" class="toast show bg-warning text-dark" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
          <strong class="me-auto">🔔 Напоминание</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body fw-bold">
          ${message}
        </div>
      </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
}

// ОПТИМИЗАЦИЯ: Проверка раз в 5 минут (300000 мс) вместо 1 минуты
setInterval(checkNotifications, 300000);
setTimeout(checkNotifications, 2000); // И один раз при старте


/* =========================================
   7. УТИЛИТЫ
   ======================================== */

// Фильтрация новостей
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
                if (category === 'all') card.classList.remove('hidden');
                else {
                    if (card.classList.contains(category)) card.classList.remove('hidden');
                    else card.classList.add('hidden');
                }
            });
        });
    });
});

// Подсветка кода
function initCodeBlocks(container) {
    if (!container) return;
    const blocks = container.querySelectorAll('pre');
    blocks.forEach(pre => {
        if (pre.parentNode.classList.contains('code-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper position-relative mb-3';
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-dark position-absolute top-0 end-0 m-2 opacity-75';
        btn.innerHTML = '<i class="bi bi-clipboard"></i>';
        btn.style.zIndex = '10';
        btn.onclick = () => {
            navigator.clipboard.writeText(pre.innerText);
            btn.innerHTML = '<i class="bi bi-check2"></i>';
            btn.classList.add('btn-success');
            setTimeout(() => {
                btn.innerHTML = '<i class="bi bi-clipboard"></i>';
                btn.classList.remove('btn-success');
            }, 2000);
        };
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(btn);
    });
    if (window.Prism) Prism.highlightAllUnder(container);
}
