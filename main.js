/* =========================================
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ========================================= */
let allMaterials = [];
let shownCount = 0;
const step = 6;
let isLoading = false;       // Флаг защиты от двойной загрузки
let currentActiveItem = null; // Хранит текущую открытую новость (для возврата фокуса)

/* =========================================
   РЕАКЦИИ (КОНФИГ)
   ========================================= */
const REACTIONS_ENDPOINT = "https://functions.yandexcloud.net/d4eiscejofusm4s3jej0"; // TODO: подставь свой URL

// Кэш счётчиков: { [id]: { like: number, fire: number, mind: number } }
let reactionsData = {};
let reactionsLoaded = false;


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
   3. ЗАГРУЗКА МАТЕРИАЛОВ (С ПАГИНАЦИЕЙ)
   ========================================= */
async function loadMaterials(restoreCount) {
    if (isLoading) return; // Защита от повторного вызова
    isLoading = true;

    const container = document.getElementById('feed-container');
    if (!container) { isLoading = false; return; }

    // Добавляем кнопку "Показать еще"
    let loadMoreContainer = document.getElementById('loadMoreContainer');
    if (!loadMoreContainer) {
        loadMoreContainer = document.createElement('div');
        loadMoreContainer.id = 'loadMoreContainer';
        loadMoreContainer.className = 'text-center mt-4 mb-5 hidden';
        // Кнопка вызывает renderNextBatch() без аргументов -> подгрузка следующей порции
        loadMoreContainer.innerHTML = `
            <button onclick="renderNextBatch()" class="btn btn-outline-primary px-4 py-2 rounded-pill">
                Показать еще материалы
            </button>
        `;
        container.parentNode.insertBefore(loadMoreContainer, container.nextSibling);
    }

    try {
        // Если массив пуст (первая загрузка или обновление), качаем с сервера
        if (allMaterials.length === 0) {
            const timestamp = Date.now();
            const response = await fetch(`https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/data.json?t=${timestamp}`, {
                cache: "no-store"
            });
            if (!response.ok) throw new Error('Ошибка сети');
            allMaterials = await response.json();
            container.innerHTML = '';
        }

        // Логика отрисовки:
        if (typeof restoreCount === 'number') {
            renderNextBatch(restoreCount);
        } else {
            if (shownCount === 0) {
                renderNextBatch();
            }
        }

        // Загрузка реакций один раз после появления первых карточек
        if (!reactionsLoaded) {
            loadReactions();
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<p class="text-center text-danger">Не удалось загрузить материалы.</p>';
    } finally {
        isLoading = false; // Снимаем флаг
    }
}

function renderNextBatch(customCount) {
    const container = document.getElementById('feed-container');
    const btnContainer = document.getElementById('loadMoreContainer');
    
    if (!allMaterials || allMaterials.length === 0) return;

    // Определяем сколько карточек добавить
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
        // ВАЖНО: Метка заголовка для поиска при возврате
        card.dataset.title = item.title;
        
        card.className = `material-card glass-card filterDiv ${item.subject}`;
        card.style.cursor = 'pointer';

        if (is3DEnabled && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(card, {
                max: 5, speed: 500, glare: true, "max-glare": 0.3, scale: 1.02, gyroscope: true
            });
        }

        card.onclick = (e) => {
            if(e.target.tagName === 'A' || e.target.closest('a')) return;
            openModal(item);
        };

        let filePreview = item.file ? '<div class="text-muted small mt-2"><i class="bi bi-paperclip"></i> Прикреплен файл</div>' : '';

        // Важно: используем item.id для привязки реакций
        const newsIdAttr = (item.id !== undefined && item.id !== null) ? String(item.id) : '';

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
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div class="text-primary small fw-bold">Читать подробнее</div>
                    <div class="reaction-bar" data-news-id="${newsIdAttr}">
                        <button class="reaction-btn" type="button" data-reaction="like" title="Нравится">❤️</button>
                        <span class="reaction-count" data-reaction-count="like">0</span>

                        <button class="reaction-btn" type="button" data-reaction="fire" title="Круто">🔥</button>
                        <span class="reaction-count" data-reaction-count="fire">0</span>

                        <button class="reaction-btn" type="button" data-reaction="mind" title="Взорвало мозг">🤯</button>
                        <span class="reaction-count" data-reaction-count="mind">0</span>
                    </div>
                </div>
            </div>
        `;

        // Локальный обработчик кликов по реакциям, чтобы не триггерить открытие модалки
        const reactionBar = card.querySelector('.reaction-bar');
        if (reactionBar) {
            reactionBar.addEventListener('click', (ev) => {
                const btn = ev.target.closest('.reaction-btn');
                if (!btn) return;
                ev.stopPropagation();

                const newsId = reactionBar.getAttribute('data-news-id');
                const reaction = btn.getAttribute('data-reaction');
                if (!newsId || !reaction) return;

                sendReaction(newsId, reaction, reactionBar);
            });
        }

        container.appendChild(card);
    });

    shownCount += nextItems.length;

    // Управление видимостью кнопки "Показать еще"
    if (shownCount >= allMaterials.length) {
        if (btnContainer) btnContainer.classList.add('hidden');
    } else {
        if (btnContainer) btnContainer.classList.remove('hidden');
    }

    // Инициализация кода и формул для новых карточек
    initCodeBlocks(container);
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise([container]).catch(err => console.log('MathJax feed error:', err));
    }

    // Применяем уже загруженные реакции к только что созданным карточкам
    applyReactionsToUI();
}

if (document.getElementById('feed-container')) {
    document.addEventListener('DOMContentLoaded', () => loadMaterials());
}


/* =========================================
   4. МОДАЛЬНОЕ ОКНО
   ========================================= */
function openModal(item) {
    currentActiveItem = item; // Запоминаем текущую новость

    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalBody) return;
    
    // Генерируем контент
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

    // Инициализация кода и формул в модалке
    initCodeBlocks(modalBody);
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise([modalBody]).catch(err => console.log('MathJax modal error:', err));
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
}

async function closeModal(force) {
    const modal = document.getElementById('newsModal');
    
    // Если нажали крестик или фон
    if (force || (window.event && window.event.target === modal)) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; 
        
        // 1. Сохраняем данные для восстановления
        const targetTitle = currentActiveItem ? currentActiveItem.title : null;
        const countToRestore = shownCount > 0 ? shownCount : step;
        
        // 2. Сброс данных
        allMaterials = []; 
        shownCount = 0;
        
        const container = document.getElementById('feed-container');
        if (container) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
        }

        // 3. Перезагрузка данных (ждем завершения)
        await loadMaterials(countToRestore);

        // 4. Прокрутка к закрытой новости
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
   5. ЛОГИКА ДЗ (HOMEWORK)
   ========================================= */
let isHomeworkMode = false;
let _namesCache = null;

async function loadNamesMap() {
  if (_namesCache) return _namesCache;
  const ts = Date.now();
  const resp = await fetch(`https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/names.json?t=${ts}`, { cache: "no-store" });
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


/* =========================================
   5. ЛОГИКА ДЗ (ВХОД И ПЕРЕКЛЮЧЕНИЕ)
   ========================================= */

// 1. Главная функция-переключатель
async function toggleHomeworkView() {
    const btn = document.getElementById('hwBtn');
    const feed = document.getElementById('feed-container');
    const hwContainer = document.getElementById('homework-container');

    if (!isHomeworkMode) {
        // === ВКЛЮЧАЕМ РЕЖИМ ДЗ ===
        if (feed) feed.classList.add('hidden');
        if (hwContainer) hwContainer.classList.remove('hidden');
        if (btn) btn.innerHTML = '<i class="bi bi-newspaper me-2"></i>Лента новостей';

        const savedToken = localStorage.getItem('student_token');
        
        if (savedToken) {
            // Показываем загрузку проверки
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
        // === ВОЗВРАТ В ЛЕНТУ НОВОСТЕЙ ===
        if (feed) feed.classList.remove('hidden');
        if (hwContainer) hwContainer.classList.add('hidden');
        if (btn) btn.innerHTML = '<i class="bi bi-journal-text me-2"></i>Домашнее задание';
        isHomeworkMode = false;
    }
}

// 2. Функция отрисовки формы входа
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

// 3. Функция сохранения токена
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


// 4. Функция выхода
function logoutStudent() {
    localStorage.removeItem('student_token'); 
    renderLoginForm(); 
}



/* =========================================
   ЗАГРУЗКА ДЗ С ИМЕНАМИ ИЗ NAMES.JSON
   ========================================= */
async function loadHomework(token) {
    const container = document.getElementById('homework-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Вход в систему...</p></div>';

    try {
        const timestamp = Date.now();
        const [hwResponse, namesResponse] = await Promise.all([
            fetch(`https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/homework.json?t=${timestamp}`, { cache: "no-store" }),
            fetch(`https://mysitedatajson.hb.ru-msk.vkcloud-storage.ru/json/names.json?t=${timestamp}`, { cache: "no-store" })
        ]);

        if (!hwResponse.ok) throw new Error('Не удалось загрузить список заданий');
        const data = await hwResponse.json();
        
        let studentNames = {};
        if (namesResponse.ok) {
            try { studentNames = await namesResponse.json(); } catch (e) {}
        }

        const myTasks = data.filter(item => {
            if (!item.allowed_tokens || !Array.isArray(item.allowed_tokens) || item.allowed_tokens.length === 0) {
                return true; 
            }
            return item.allowed_tokens.includes(token);
        });

        const displayName = studentNames[token] || token;

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
                        <a href="${item.link || '#'}" target="_blank" class="btn btn-outline-danger w-100 mt-auto">Перейти к выполнению</a>
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
   7. ФУНКЦИЯ ДЛЯ БЛОКОВ КОДА (PRISM + COPY)
   ========================================= */
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
            const code = pre.innerText;
            navigator.clipboard.writeText(code);
            
            btn.innerHTML = '<i class="bi bi-check2"></i>';
            btn.classList.remove('btn-dark');
            btn.classList.add('btn-success');
            
            setTimeout(() => {
                btn.innerHTML = '<i class="bi bi-clipboard"></i>';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-dark');
            }, 2000);
        };
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        wrapper.appendChild(btn);
    });
    
    if (window.Prism) {
        Prism.highlightAllUnder(container);
    }
}


/* =========================================
   8. РЕАКЦИИ: ЗАГРУЗКА, ПРИМЕНЕНИЕ, ОТПРАВКА
   ========================================= */

// GET: загрузить все реакции из единого reactions.json
async function loadReactions() {
    if (!REACTIONS_ENDPOINT) return;
    try {
        const res = await fetch(REACTIONS_ENDPOINT, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        // Ожидаем, что backend вернёт просто объект вида { "1": { like: 3, fire: 1, mind: 0 }, ... }
        reactionsData = (data && typeof data === 'object') ? data : {};
        reactionsLoaded = true;
        applyReactionsToUI();
    } catch (e) {
        console.error('Ошибка загрузки реакций', e);
    }
}

// Применение имеющихся счётчиков к DOM
function applyReactionsToUI() {
    const bars = document.querySelectorAll('.reaction-bar');
    bars.forEach(bar => {
        const id = bar.getAttribute('data-news-id');
        if (!id) return;
        const stats = reactionsData[id] || {};
        updateReactionBarCounts(bar, stats);
    });
}

// Обновить конкретную панель реакций по counters
function updateReactionBarCounts(barEl, counters) {
    if (!barEl) return;
    const spans = barEl.querySelectorAll('.reaction-count');
    spans.forEach(span => {
        const type = span.getAttribute('data-reaction-count');
        const val = counters && counters[type] != null ? counters[type] : 0;
        span.textContent = val;
    });
}

// POST: отправка реакции и обновление локального состояния
async function sendReaction(newsId, reaction, barEl) {
    if (!REACTIONS_ENDPOINT) return;
    try {
        const res = await fetch(REACTIONS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: String(newsId), reaction })
        });
        if (!res.ok) {
            console.error('Bad response for reaction:', res.status);
            return;
        }
        const data = await res.json();
        // Ожидаем формат { ok: true, counters: { like: N, fire: M, mind: K } }
        if (data && data.counters) {
            reactionsData[String(newsId)] = data.counters;
            updateReactionBarCounts(barEl, data.counters);
        }
    } catch (e) {
        console.error('Ошибка при отправке реакции', e);
    }
}
