// Змінні для перевірки реєстрації та режиму входу
let isRegistered = false;
let isLoginMode = false;
let currentUser = null;
let currentLang = localStorage.getItem('cfe_lang') || 'ua';
let userChoice = localStorage.getItem('userChoice') || "";

// Стан інтерв'ю: збереження відповідей користувача
let interviewState = {
    stage: 0,
    education: "",
    skills: "",
    workChoice: "",
    fieldInterest: "",
    fieldKnowledge: "",
    hobbies: "",
    bestSubjects: "",
    teamWork: "",
    categoryChoice: "",
    testAnswers: {}
};

// Конфігурація AI інтерв'ю
// Видалено всі Google API залежності та AI промпти

// Масив для збереження діалогу чату
let chatHistory = [];

const dictionary = {
    ua: {
        nav_home: "Панель", nav_interview: "AI Інтерв'ю", nav_edu: "Освіта & Гранти", nav_jobs: "Пошук роботи",
        status_guest: "Гість", status_user: "Користувач: ", auth_title: "Реєстрація",
        auth_login_title: "Вхід", auth_btn: "Створити акаунт", auth_login_btn: "Увійти",
        prof_resume: "Резюме", prof_courses: "Мої курси", prof_completed: "Пройдено",
        prof_ongoing: "У процесі", logout_btn: "Вийти з акаунта", nav_resume: "AI конструктор резюме", nav_courses: "Курси",
        reset_btn: "Почати спочатку" 
    },
    en: {
        nav_home: "Dashboard", nav_interview: "AI Interview", nav_edu: "Education", nav_jobs: "Jobs",
        status_guest: "Guest", status_user: "User: ", auth_title: "Registration",
        auth_login_title: "Login", auth_btn: "Sign Up", auth_login_btn: "Sign In",
        prof_resume: "Resume", prof_courses: "My Courses", prof_completed: "Completed",
        prof_ongoing: "Ongoing", logout_btn: "Log Out", nav_resume: "AI resume builder", nav_courses: "Courses",
        reset_btn: "Restart Interview" 
    }
};

// Helper: convert simple markdown (bold + newlines + links) to HTML
function markdownToHtml(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

// Helper: validate URL accessibility
async function validateUrl(url) {
    try {
        // For YouTube videos, check if they're accessible
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = extractYouTubeId(url);
            if (!videoId) return false;
            
            // Try to fetch video info
            const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            return response.ok;
        }
        
        // For regular websites, try a HEAD request first, then GET if needed
        try {
            const headResponse = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors' // Allow cross-origin requests
            });
            if (headResponse.ok || headResponse.type === 'opaque') {
                return true;
            }
        } catch (e) {
            // HEAD failed, try GET
        }
        
        // Try GET request with no-cors
        const response = await fetch(url, { 
            method: 'GET',
            mode: 'no-cors'
        });
        return response.ok || response.type === 'opaque';
        
    } catch (error) {
        console.warn(`URL validation failed for ${url}:`, error);
        return false;
    }
}

// Helper: extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Helper: validate and clean links in text
async function validateAndCleanLinks(text) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    // Extract all links
    while ((match = linkRegex.exec(text)) !== null) {
        links.push({
            full: match[0],
            text: match[1],
            url: match[2]
        });
    }
    
    if (links.length === 0) return text;
    
    // Validate each link
    const validLinks = [];
    const invalidLinks = [];
    
    for (const link of links) {
        const isValid = await validateUrl(link.url);
        if (isValid) {
            validLinks.push(link);
        } else {
            invalidLinks.push(link);
        }
    }
    
    // If all links are invalid, return null to trigger regeneration
    if (invalidLinks.length === links.length) {
        return null;
    }
    
    // Replace invalid links with text only, keep valid links
    let result = text;
    for (const invalid of invalidLinks) {
        result = result.replace(invalid.full, invalid.text);
    }
    
    return result;
}

// Conversational AI interviewer — no static MCQ needed anymore
const interviewQuestions = {};

// Helper function to get user-specific storage keys
function getUserStorageKey(key) {
    if (!currentUser || !currentUser.email) return key;
    return `${key}_${currentUser.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// Завантаження стану інтерв'ю з локального сховища браузера
function loadInterviewState() {
    const saved = localStorage.getItem(getUserStorageKey('interviewState'));
    if (saved) {
        interviewState = JSON.parse(saved);
    }
    loadChatHistory();
}

// Збереження стану інтерв'ю до локального сховища браузера
function saveInterviewState() {
    localStorage.setItem(getUserStorageKey('interviewState'), JSON.stringify(interviewState));
    saveChatHistory();
}

// Збереження стану інтерв'ю
function saveInterviewState() {
    const key = getUserStorageKey('interviewState');
    localStorage.setItem(key, JSON.stringify(interviewState));
}

// Функція ПОВНОГО скидання (Почати спочатку)
function resetInterview() {
    // 1. Очищуємо об'єкти в пам'яті
    interviewState = {
        stage: 0,
        testAnswers: {}
    };
    chatHistory = [];

    // 2. Очищуємо локальне сховище для конкретного користувача
    const emailKey = currentUser ? currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest';
    localStorage.removeItem(`interviewState_${emailKey}`);
    localStorage.removeItem(`interviewChatHistory_${emailKey}`);
    localStorage.removeItem('userChoice');
    localStorage.removeItem('userProfile');

    // 3. Очищуємо інтерфейс
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) chatWindow.innerHTML = '';
    
    // 4. Запускаємо спочатку
    initializeInterview();
}


// `webSearch()` removed — web-analyzer UI deleted per user request.

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Завантаження історії чату
function loadChatHistory() {
    const saved = localStorage.getItem(getUserStorageKey('interviewChatHistory'));
    if (saved) {
        chatHistory = JSON.parse(saved);
    } else {
        chatHistory = [];
    }
}

// Збереження історії чату
function saveChatHistory() {
    localStorage.setItem(getUserStorageKey('interviewChatHistory'), JSON.stringify(chatHistory));
}

// Додавання повідомлення в історію з затримкою
function saveChatMessage(text, isUser) {
    chatHistory.push({
        text: text,
        isUser: isUser,
        timestamp: Date.now()
    });
    saveChatHistory();
}

window.onload = () => {
    checkAuth();
    changeLang(currentLang); 
    loadInterviewState();
    initResumePreview();
    
    // Видалено логіку перевірки pre-interview форми
    
    if (userChoice) updateResults();
};

function initResumePreview() {
    const inputs = [
        'res-name', 'res-phone', 'res-email', 'res-location', 
        'res-edu-school', 'res-edu-degree', 'resume-text'
    ];

    const updateUI = () => {
        // Персональні дані
        document.getElementById('p-name').innerText = document.getElementById('res-name').value || "Ваше Ім'я";
        
        const phone = document.getElementById('res-phone').value;
        const email = document.getElementById('res-email').value;
        const loc = document.getElementById('res-location').value;
        document.getElementById('p-contact').innerText = `${phone} | ${email} | ${loc}`;

        // Освіта
        const school = document.getElementById('res-edu-school').value;
        const degree = document.getElementById('res-edu-degree').value;
        document.getElementById('p-education').innerText = school || degree ? `${school} (${degree})` : "Інформація про освіту";

        // Досвід
        document.getElementById('p-experience').innerText = document.getElementById('resume-text').value || "Ваш професійний опис...";
    };

    // Додаємо слухач на кожен інпут
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateUI);
    });
}

function checkAuth() {
    const saved = localStorage.getItem('cfe_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        isRegistered = true;
        updateUI();
    }
}

// Перемикання Вхід/Реєстрація
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const nameField = document.getElementById('user-name');
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleLink = document.getElementById('toggle-link');

    if (isLoginMode) {
        title.innerText = dictionary[currentLang].auth_login_title;
        submitBtn.innerText = dictionary[currentLang].auth_login_btn;
        nameField.classList.add('hidden');
        toggleLink.innerText = currentLang === 'ua' ? "Зареєструватися" : "Register";
    } else {
        title.innerText = dictionary[currentLang].auth_title;
        submitBtn.innerText = dictionary[currentLang].auth_btn;
        nameField.classList.remove('hidden');
        toggleLink.innerText = currentLang === 'ua' ? "Увійти" : "Login";
    }
}

function handleAuth() {
    const nameInput = document.getElementById('user-name').value;
    const emailInput = document.getElementById('user-email').value;
    const passInput = document.getElementById('user-pass').value;

    if (isLoginMode) {
        const savedUser = localStorage.getItem('cfe_user');
        const savedPass = localStorage.getItem('cfe_pass');
        if (savedUser && savedPass === passInput) {
            currentUser = JSON.parse(savedUser);
            isRegistered = true;
            updateUI();
            showPage('dashboard');
        } else {
            alert(currentLang === 'ua' ? "Невірні дані!" : "Wrong credentials!");
        }
    } else {
        if (nameInput && emailInput && passInput) {
            currentUser = { name: nameInput, email: emailInput };
            localStorage.setItem('cfe_user', JSON.stringify(currentUser));
            localStorage.setItem('cfe_pass', passInput);
            isRegistered = true;
            updateUI();
            showPage('dashboard');
        }
    }
}

function logout() {
    localStorage.removeItem('cfe_user');
    localStorage.removeItem('userChoice');
    // Clear user-specific data
    if (currentUser && currentUser.email) {
        const emailKey = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
        localStorage.removeItem(`interviewState_${emailKey}`);
        localStorage.removeItem(`interviewChatHistory_${emailKey}`);
    }
    location.reload();
}

function updateUI() {
    const status = document.getElementById('auth-status');
    if (isRegistered && currentUser) {
        status.innerHTML = `<div style="display:flex; align-items:center; gap:8px;">
            <img src="${localStorage.getItem('userAvatar') || 'https://via.placeholder.com/30'}" style="width:25px;height:25px;border-radius:50%;object-fit:cover;">
            <span>${currentUser.name}</span>
        </div>`;
        
        if(document.getElementById('profile-name-display')) {
            document.getElementById('profile-name-display').innerText = currentUser.name;
            document.getElementById('profile-email-display').innerText = currentUser.email;
            document.getElementById('resume-text').value = localStorage.getItem('userResume') || "";
            document.getElementById('profile-img').src = localStorage.getItem('userAvatar') || 'https://via.placeholder.com/150';
            updateProfileStats();
        }
    }
}

// Оновлена функція показу сторінок
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    
    const targetPage = document.getElementById(id);
    if (targetPage) targetPage.classList.add('active');
    
    const navItem = document.querySelector(`[data-target="${id}"]`) || document.querySelector(`[onclick*="${id}"]`);
    if (navItem) navItem.classList.add('active');

    if (id === 'interview') {
        renderInterviewSection();
    }
}

// Логіка відображення секції інтерв'ю (відновлення або старт)
function renderInterviewSection() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = ''; // Очищуємо перед рендером історії
    
    loadInterviewState(); // Завантажуємо стан (stage)
    loadChatHistory();    // Завантажуємо повідомлення

    if (chatHistory.length > 0) {
        // Якщо історія є — відтворюємо її
        chatHistory.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = `msg ${msg.isUser ? 'user-msg' : 'ai-msg'}`;
            msgEl.innerHTML = msg.text;
            chatWindow.appendChild(msgEl);
        });
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Якщо інтерв'ю було в процесі (не завершене), але останнє повідомлення було від користувача, 
        // або потрібно вивести наступне питання:
        if (interviewState.stage > 0 && interviewState.stage < 99) {
            // Перевіряємо, чи останнє повідомлення було відповіддю. 
            // Якщо так — можливо треба додати питання (якщо воно не було додане раніше)
        }
    } else {
        // Якщо історії немає — починаємо з нуля
        initializeInterview();
    }
}

function handleProtectedAction(id) {
    if (!isRegistered) showPage('auth');
    else showPage(id);
}

function changeLang(lang) {
    currentLang = lang;
    localStorage.setItem('cfe_lang', lang);

    // 1. Обновляем визуальное состояние переключателя
    const switcher = document.querySelector('.lang-switcher');
    if (switcher) {
        switcher.setAttribute('data-lang', lang);
        
        // Переключаем активные классы для текста
        document.getElementById('btn-ua').classList.toggle('active', lang === 'ua');
        document.getElementById('btn-en').classList.toggle('active', lang === 'en');
    }

    // 2. Обновляем тексты на странице (ваш существующий код)
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (dictionary[lang][key]) el.innerText = dictionary[lang][key];
    });

        // 3. Update interview / AI container texts and placeholders
    try {
        const qEl = document.getElementById('initial-question');
        if (qEl && interviewQuestions[lang] && interviewQuestions[lang].q1) {
            qEl.innerHTML = markdownToHtml(interviewQuestions[lang].q1);
        }

        const chatInput = document.getElementById('chat-input');
        if (chatInput && dictionary[lang].chat_input_placeholder) {
            chatInput.placeholder = dictionary[lang].chat_input_placeholder;
        }

        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn && dictionary[lang].send_btn) sendBtn.innerText = dictionary[lang].send_btn;

    } catch (e) {
        // ignore if elements missing
    }

    const activePage = document.querySelector('.page.active');
    if (interviewState.stage > 0 && activePage && activePage.id === 'interview') {
        // Don't reset interview on language change, just update texts
        // Keep chat history and state intact
        // Update placeholders and button texts
        const chatInput = document.getElementById('chat-input');
        if (chatInput && dictionary[lang].chat_input_placeholder) {
            chatInput.placeholder = dictionary[lang].chat_input_placeholder;
        }

        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn && dictionary[lang].send_btn) sendBtn.innerText = dictionary[lang].send_btn;

    }
}

// Обробка завантаження аватара користувача
document.getElementById('image-input')?.addEventListener('change', function() {
    const reader = new FileReader();
    reader.onload = () => {
        localStorage.setItem('userAvatar', reader.result);
        updateUI();
    };
    reader.readAsDataURL(this.files[0]);
});

function saveResume() {
    localStorage.setItem('userResume', document.getElementById('resume-text').value);
    alert("Збережено!");
}

function updateProfileStats() {
    const comp = document.getElementById('completed-count');
    if (comp) comp.innerText = userChoice ? "1" : "0";
}

// ===== CONVERSATIONAL AI INTERVIEWER =====

// STAGES:
// 0   = not started
// 1   = greeting shown, waiting for "ready"
// 2+  = ongoing AI-driven conversation (no fixed ceiling — AI decides when done)
// 99  = generating results (locked)

// Zero-shot examples — injected into every API call so the AI learns tone, depth, flow
const ZERO_SHOT_EXAMPLES = `
=== ZERO-SHOT ПРИКЛАДИ (еталон стилю, глибини та результату) ===

--- Сценарій 1: Студентка IT-коледжу ---
ІІ: Чи маєте ви робочий досвід? Поясніть як дитині.
Юзер: Офіційно — ні. Але я була старостою гуртка з комп\'ютерної графіки. Я вчила їх малювати на комп\'ютері гарні картинки та стежила, щоб у кожного в щоденнику був порядок.
ІІ: Чудово! А на кого ви навчаєтесь? І чи воліли б ви працювати в офісі за столом, чи готові до відряджень?
Юзер: Навчаюсь на прикладній математиці. Вмію C++, Python, SQL. Краще сидяча, мені важливо мати потужний ПК. Проти переїздів нічого не маю, якщо це перспективно.
ІІ: Яку мету ви ставите перед собою? Які навички хотіли б опанувати?
Юзер: Хочу створювати складні системи або ігри. Мені цікаво архітектура ПЗ та алгоритми Machine Learning.
ІІ: Я готовий проаналізувати наше інтерв\'ю. Чи є ще якісь коментарі? [READY_TO_ANALYZE]
Юзер: Можемо починати.
→ Результат: Back-end Developer або Data Analyst. Junior Python Developer. Підтягнути: Django або Flask.

--- Сценарій 2: Фрілансер-геймдев ---
ІІ: Розкажіть про свій робочий досвід.
Юзер: Я фрілансив — малював піксель-арт для інді-ігор.
ІІ: Цікаво! Що спонукало вас обрати саме це? Які плюси та мінуси?
Юзер: Люблю створювати світи. Плюс — свобода. Мінус — нестабільний дохід і самотність. Хочеться в команду.
ІІ: Які вимоги до наступної роботи? Готові до активного руху?
Юзер: Тільки сидяча. Готовий до релокейту якщо буде крута творча атмосфера.
ІІ: Які навички хочете здобути? Яка ваша фінальна мета?
Юзер: Хочу навчитися Unity. Мрія — випустити власний проект.
ІІ: Чудово, мені здається картина вже складається! Готовий аналізувати — є ще щось важливе? [READY_TO_ANALYZE]
→ Результат: Technical Artist або 2D Animator. Unity C# scripting.

--- Сценарій 3: Колишній бариста ---
ІІ: Чи маєте досвід? Поясніть як дитині.
Юзер: Я варив каву. Робив людям смачні напої щоб вони посміхалися, і стежив щоб завжди було молоко.
ІІ: Звучить затишно! Що спонукало вас обрати це? Плюси та мінуси?
Юзер: Люблю спілкуватися. Плюси — знайомства. Мінуси — весь день на ногах, пахнеш кавою, зарплата мала.
ІІ: На кого вчилися? Чи хочете сидячу роботу? Як до відряджень?
Юзер: Менеджер готельно-ресторанного бізнесу. Хочу більше сидіти. До відряджень позитивно.
ІІ: Яку мету ставите? Які навички хочете здобути?
Юзер: Хочу керувати процесами. Навчитися аналітиці та таблицям.
ІІ: Я готовий проаналізувати наше інтерв\'ю. Чи є фінальні коментарі? [READY_TO_ANALYZE]
Юзер: Хочу щоб робота була в команді де підтримують.
→ Результат: Project Coordinator або Office Manager. Excel, Trello, Jira.

--- Сценарій 4: Спортивний аніматор ---
ІІ: Розкажіть про досвід.
Юзер: Аніматор у таборах та інструктор з плавання. Вчив людей не боятися води.
ІІ: Енергійно! На кого навчалися? Розглядаєте сидячу роботу?
Юзер: Фізичне виховання. Сидяча? Боже збав! Мені треба рух, драйв, спілкування.
ІІ: Як до переїздів?
Юзер: Тільки "за"! Їду куди завгодно аби було цікаво.
ІІ: Які навички хочете розвинути? Яка мрія?
Юзер: Хочу навчитися психології. Мрія — власна школа екстремального спорту.
ІІ: Відмінно, у мене вже є чітке бачення! Починаю аналіз — є щось додати? [READY_TO_ANALYZE]
→ Результат: Sport Recruiter або Team Building Lead. Психологія конфліктів, маркетинг.
`;

const INTERVIEWER_SYSTEM_UA = `Ти — Bridge, теплий і уважний кар\'єрний інтерв\'юер на платформі Bridge AI Career Platform.

ТВОЯ РОЛЬ:
Веди живу, природну розмову щоб зрозуміти кар\'єрний шлях людини і дати точні рекомендації.
Говори від першої особи. Будь людяним, коротким і щирим. Не перераховуй факти. Реагуй як жива людина.

СТИЛЬ ДІАЛОГУ:
- Реагуй на кожну відповідь емоційно та конкретно (1-2 речення)
- Питай тільки ОДНЕ питання за раз
- Якщо відповідь неповна або цікава — задай уточнювальне питання замість наступної теми
- Не повторюй вже задані питання
- Можеш задавати від 3 до 7 питань залежно від глибини відповідей

ТЕМИ ДЛЯ ОХОПЛЕННЯ (обирай порядок органічно):
1. Робочий досвід (будь-який: гуртки, волонтерство, фріланс, підробіток)
2. Освіта та спеціалізація
3. Формат роботи: офіс / дистанційно / відрядження / фізична активність
4. Цілі та навички, які хочуть опанувати
5. Мотивація, особисті якості, командна чи самостійна робота

КОЛИ ЗАВЕРШУВАТИ:
- Ти сам вирішуєш, коли в тебе достатньо даних для якісного аналізу
- Зазвичай достатньо після 3-5 змістовних відповідей
- Якщо відповіді короткі або розмиті — задавай уточнювальні питання
- Коли готовий — напиши природне завершення і ОБОВ\'ЯЗКОВО додай токен [READY_TO_ANALYZE] в кінці свого повідомлення

${ZERO_SHOT_EXAMPLES}`;

const INTERVIEWER_SYSTEM_EN = `You are Bridge, a warm and attentive career interviewer at the Bridge AI Career Platform.

YOUR ROLE:
Lead a natural, engaging conversation to understand the person\'s career path and give precise recommendations.
Speak in first person. Be human, brief, and sincere. Don\'t list facts. React like a real person.

DIALOGUE STYLE:
- React to each answer emotionally and specifically (1-2 sentences)
- Ask only ONE question at a time
- If an answer is incomplete or interesting — ask a follow-up instead of moving to a new topic
- Don\'t repeat questions already asked
- You can ask 3-7 questions depending on answer depth

TOPICS TO COVER (choose order organically):
1. Work experience (any: clubs, volunteering, freelance, part-time)
2. Education and specialization
3. Work format: office / remote / travel / physical activity
4. Goals and skills they want to master
5. Motivation, personal traits, team vs solo work

WHEN TO WRAP UP:
- You decide when you have enough data for quality analysis
- Usually enough after 3-5 meaningful answers
- If answers are short or vague — ask follow-ups
- When ready — write a natural closing and MUST end with token [READY_TO_ANALYZE]

${ZERO_SHOT_EXAMPLES}`;

function initializeInterview() {
    interviewState.stage = 1;
    interviewState.testAnswers = {};
    saveInterviewState();

    const greeting = currentLang === 'ua'
        ? "Вітаю! Я ваш персональний інтерв\'юер, який допоможе вам у пошуках себе. Ви готові?"
        : "Welcome! I\'m your personal career interviewer — here to help you find your path. Are you ready?";

    addAIMessage(greeting);
    enableInput();
}



// ===== SHARED GEMINI API HELPER =====
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=AIzaSyB0UbfdM7Cg1BvMc0hbpOIMVLXYhQShWr0";

// Converts Anthropic-style messages + system prompt into a Gemini API call
const GEMINI_MAX_TOKENS = 3072; // Global cap for all Gemini responses

async function callGemini(systemPrompt, messages, maxTokens) {
    maxTokens = Math.min(maxTokens || 800, GEMINI_MAX_TOKENS);
    const geminiContents = messages.map(function(m) {
        return {
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
        };
    });

    const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiContents,
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.9
        }
    };

    const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    }
    throw new Error("Gemini no candidates: " + JSON.stringify(data).substring(0, 200));
}

// Single-turn convenience wrapper
async function callGeminiSingle(prompt, maxTokens) {
    return await callGemini("You are a helpful assistant.", [{ role: "user", content: prompt }], maxTokens || GEMINI_MAX_TOKENS);
}

// Допоміжна функція для відображення історії
function renderChatHistory() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';
    chatHistory.forEach(msg => {
        const msgEl = document.createElement('div');
        msgEl.className = `msg ${msg.isUser ? 'user-msg' : 'ai-msg'}`;
        msgEl.innerHTML = msg.text;
        chatWindow.appendChild(msgEl);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Виправлена функція sendMessage та логіка обробки
function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    
    input.value = '';
    input.placeholder = currentLang === 'ua' ? "Введіть відповідь..." : "Type your answer...";
    
    // stage 99 = analysis in progress / done; everything else = interview active
    if (interviewState.stage < 99) {
        processInterviewResponse(message);
    } else {
        setTimeout(() => {
            addAIMessage(currentLang === 'ua'
                ? "Дякую за відповідь! Ваші результати вже готові вище 👆"
                : "Thank you! Your results are already shown above 👆");
        }, 600);
    }
}

// focusOnInput kept as utility for manual typing hint
function focusOnInput() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.placeholder = currentLang === 'ua' ? "Напишіть вашу відповідь тут..." : "Type your answer here...";
    input.focus();
    input.style.borderColor = "#0066ff";
    setTimeout(() => { input.style.borderColor = ""; }, 2000);
}

// --- ОНОВЛЕНА ЛОГІКА ЗБЕРЕЖЕННЯ ---

// Модифікована функція додавання повідомлень, яка гарантовано зберігає історію
function addMessage(text, isUser = false) {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;

    const msgEl = document.createElement('div');
    msgEl.className = `msg ${isUser ? 'user-msg' : 'ai-msg'}`;
    msgEl.innerHTML = text;
    chatWindow.appendChild(msgEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Зберігаємо в масив історії
    chatHistory.push({
        text: text,
        isUser: isUser,
        timestamp: Date.now()
    });
    
    // Негайно зберігаємо в локальне сховище
    saveChatHistory();
}

function addUserMessage(text) {
    addMessage(text, true);
}

function addAIMessage(text) {
    // Конвертація markdown в HTML
    let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    addMessage(html, false);
}

// Перевірка, чи відповідь користувача відповідає темі запитання
function isResponseValid(userInput, stage) {
    // Завжди повертаємо true - дозволяємо будь-які відповіді
    return true;
}


// Enable / disable chat input
function enableInput() {
    const inp = document.getElementById('chat-input');
    const btn = document.getElementById('chat-send-btn');
    if (inp) inp.disabled = false;
    if (btn) btn.disabled = false;
}

function disableInput() {
    const inp = document.getElementById('chat-input');
    const btn = document.getElementById('chat-send-btn');
    if (inp) inp.disabled = true;
    if (btn) btn.disabled = true;
}

// Conversational response processor — fully AI-driven loop
function processInterviewResponse(userInput) {
    interviewState.testAnswers[`q${interviewState.stage}`] = userInput;
    interviewState.stage++;
    saveInterviewState();
    disableInput();

    setTimeout(async () => {
        await runInterviewerTurn();
    }, 700);
}

// Core AI loop: sends full conversation to Claude, gets next message
// Claude decides: ask next question OR append [READY_TO_ANALYZE] to wrap up
async function runInterviewerTurn() {
    const lang = currentLang;
    const systemPrompt = lang === 'ua' ? INTERVIEWER_SYSTEM_UA : INTERVIEWER_SYSTEM_EN;

    // Build messages array from chatHistory (alternating assistant/user)
    const messages = buildMessagesForAPI();

    try {
        const aiText = await callGemini(systemPrompt, messages, 500);

        // Check if AI decided it has enough info
        if (aiText.includes('[READY_TO_ANALYZE]')) {
            // Strip the token from displayed message
            const cleanMsg = aiText.replace('[READY_TO_ANALYZE]', '').trim();
            addAIMessage(cleanMsg);
            // Lock input, then start analysis
            interviewState.stage = 99;
            saveInterviewState();
            disableInput();
            setTimeout(async () => {
                await generateRecommendations();
            }, 1200);
        } else {
            // AI wants to ask another question
            addAIMessage(aiText);
            enableInput();
        }

    } catch (e) {
        console.error("runInterviewerTurn error:", e);
        // Fallback: just ask a generic follow-up
        const fallback = lang === 'ua'
            ? "Цікаво! Розкажіть ще — яка у вас головна мета на найближчий рік?"
            : "Interesting! Tell me more — what is your main goal for the next year?";
        addAIMessage(fallback);
        enableInput();
    }
}

// Builds the messages array for the Anthropic API from chatHistory
// chatHistory stores both AI and user messages in order
function buildMessagesForAPI() {
    const messages = [];

    for (const msg of chatHistory) {
        const role = msg.isUser ? "user" : "assistant";
        // Strip HTML tags from stored AI messages before sending to API
        const text = msg.isUser ? msg.text : msg.text.replace(/<[^>]+>/g, '');
        if (text.trim()) {
            messages.push({ role, content: text });
        }
    }

    // Anthropic requires messages to start with "user"
    // The greeting is from assistant, user replies "ready" — that's our first pair
    // If for some reason first message is assistant with no user yet, add a placeholder
    if (messages.length > 0 && messages[0].role === "assistant" && messages.length === 1) {
        // Only greeting so far, user hasn't replied yet — shouldn't happen in normal flow
        return messages;
    }

    return messages;
}


// Оновлена функція валідації посилань
async function validateAndCleanLinks(text, allowedDomains) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    // Знаходимо всі посилання
    while ((match = linkRegex.exec(text)) !== null) {
        links.push({
            full: match[0],
            text: match[1],
            url: match[2]
        });
    }
    
    if (links.length === 0) {
        // Якщо немає посилань, повертаємо текст з попередженням
        return text + (currentLang === 'ua' ? 
            "\n\n⚠️ На жаль, не вдалося знайти конкретні курси. Спробуйте пошукати самостійно на вказаних платформах." : 
            "\n\n⚠️ Sorry, couldn't find specific courses. Try searching on the mentioned platforms.");
    }
    
    // Валідуємо кожне посилання
    const validLinks = [];
    const invalidLinks = [];
    
    for (const link of links) {
        // Перевіряємо чи домен дозволений
        const isDomainAllowed = allowedDomains.some(domain => link.url.includes(domain));
        if (!isDomainAllowed) {
            invalidLinks.push(link);
            continue;
        }
        
        // Перевіряємо чи це не головна сторінка
        const isMainPage = allowedDomains.some(domain => {
            const mainPagePatterns = [
                `https://${domain}/$`,
                `https://www.${domain}/$`,
                `http://${domain}/$`,
                `http://www.${domain}/$`
            ];
            return mainPagePatterns.some(pattern => new RegExp(pattern).test(link.url));
        });
        
        if (isMainPage) {
            invalidLinks.push(link);
            continue;
        }
        
        // Перевіряємо доступність URL
        const isValid = await validateUrl(link.url);
        if (isValid) {
            validLinks.push(link);
        } else {
            invalidLinks.push(link);
        }
    }
    
    // Якщо всі посилання невалідні, повертаємо null для повторної генерації
    if (invalidLinks.length === links.length) {
        return null;
    }
    
    // Замінюємо невалідні посилання на звичайний текст
    let result = text;
    for (const invalid of invalidLinks) {
        result = result.replace(invalid.full, invalid.text);
    }
    
    return result;
}


// Функція для додавання повідомлення з "сирим" HTML
function addRawHTMLMessage(html) {
    const chatWindow = document.getElementById('chat-window');
    const msgEl = document.createElement('div');
    msgEl.className = 'msg ai-msg';
    msgEl.innerHTML = html;
    chatWindow.appendChild(msgEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Зберігаємо в історію
    saveChatMessage(html, false);
}




// Функція для відправки даних до ШІ
async function generateRecommendations() {
    const loadingMsg = currentLang === 'ua' 
        ? "✨ Аналізую наше інтерв'ю та складаю персональну дорожню карту..." 
        : "✨ Analyzing our interview and creating your personalized roadmap...";
    addAIMessage(loadingMsg);

    const lang = currentLang;

    // Format all conversation answers
    const answersText = Object.entries(interviewState.testAnswers)
        .map(([k, v], i) => `Репліка ${i + 1}: ${v}`)
        .join('\n');

    // === PROMPT 1: Profile analysis ===
    const prompt1 = lang === 'ua' ? `
Ти — досвідчений кар'єрний інтерв'юер на платформі Bridge. Ти щойно провів живе розмовне інтерв'ю з користувачем.

Ось що сказав користувач під час інтерв'ю (у хронологічному порядку):
${answersText}

Питання інтерв'ю були такими (у тому ж порядку):
1. Чи готові ви почати?
2. Який у вас робочий досвід (поясни як дитині)?
3. На кого навчаєтесь / яку освіту маєте? І офіс чи відрядження?
4. Яка ваша мета? Які навички хочете опанувати?
5. Чи є фінальні коментарі?

Проаналізуй відповіді та створи профіль кандидата. Визнач:
- Психографічний портрет (сильні сторони, стиль мислення, мотивацію)
- Рекомендований напрямок кар'єри (конкретна роль/посада)
- Оптимальний формат та тривалість навчання
- Конкретні поради (платформи, фреймворки, інструменти)
- Перший конкретний крок

Відповідай ВИКЛЮЧНО у форматі JSON, без жодного додаткового тексту:
{
  "analisys": "Психографічний аналіз профілю — 2-3 речення про людину та її потенціал",
  "direction": "Конкретна роль або напрямок (наприклад: Junior Python Developer, UX Designer, Project Coordinator)",
  "education_path": "Опис оптимального шляху навчання з часовими рамками",
  "recommendation": "Конкретні інструменти, фреймворки або платформи для старту",
  "next_step": "Перша конкретна дія, яку людина може зробити вже сьогодні",
  "weakness": "Що варто підтягнути або вивчити додатково (1-2 речення)",
  "course_hint": "Коротка назва або тема курсу, який найбільше підходить"
}` : `
You are an experienced career interviewer at the Bridge platform. You just conducted a live conversational interview with a user.

Here is what the user said during the interview (in chronological order):
${answersText}

The interview questions were (in the same order):
1. Are you ready to begin?
2. What work experience do you have (explain it like to a child)?
3. What are you studying / what education do you have? And office or travel?
4. What is your goal? What skills do you want to master?
5. Any final comments?

Analyze the answers and create a candidate profile. Identify:
- Psychographic portrait (strengths, thinking style, motivation)
- Recommended career direction (specific role/position)
- Optimal learning format and duration
- Specific advice (platforms, frameworks, tools)
- First concrete step

Respond ONLY in JSON format, no extra text:
{
  "analisys": "Psychographic profile analysis — 2-3 sentences about the person and their potential",
  "direction": "Specific role or direction (e.g.: Junior Python Developer, UX Designer, Project Coordinator)",
  "education_path": "Optimal learning path description with timeframes",
  "recommendation": "Specific tools, frameworks or platforms to start with",
  "next_step": "First concrete action the person can take today",
  "weakness": "What to improve or learn additionally (1-2 sentences)",
  "course_hint": "Short name or topic of the most fitting course"
}`;

    try {
        let aiText1 = await callGeminiSingle(prompt1, 1000);

        // Strip possible markdown fences
        aiText1 = aiText1.replace(/```json\s*|\s*```/g, '').trim();
        const jsonStart = aiText1.indexOf('{');
        const jsonEnd = aiText1.lastIndexOf('}') + 1;
        const result1 = JSON.parse(aiText1.substring(jsonStart, jsonEnd));

        localStorage.setItem('userProfile', JSON.stringify(result1));
        localStorage.setItem('userChoice', result1.direction);
        displayFinalResults(result1);

        // === PROMPT 2: Course recommendations ===
        addAIMessage(lang === 'ua' ? "🔍 Шукаю найкращі ресурси для вашого напрямку..." : "🔍 Finding the best resources for your direction...");

        const allowedDomains = [
            'coursera.org', 'prometheus.org.ua', 'ed-era.com', 'osvita.diia.gov.ua',
            'campus.epam.ua', 'mooc-list.com', 'alison.com', 'uniathena.com',
            'life-global.org', 'elearningcollege.com', 'classcentral.com', 'open.edu',
            'futurelearn.com', 'youtube.com', 'youtu.be', 'udemy.com', 'skillshare.com',
            'linkedin.com/learning', 'edx.org', 'khanacademy.org', 'codecademy.com',
            'freecodecamp.org', 'theodinproject.com', 'w3schools.com', 'developer.mozilla.org'
        ];

        const prompt2 = lang === 'ua' ? `
Ти — провідний кар'єрний стратег та EdTech-експерт. На основі профілю кандидата склади "Hybrid Learning Path".

**Профіль кандидата:**
- Рекомендований напрямок: ${result1.direction}
- Аналіз: ${result1.analisys}
- Що варто підтягнути: ${result1.weakness}
- Підказка по курсу: ${result1.course_hint}

**Розповідь кандидата під час інтерв'ю:**
${answersText}

**Джерела (використовуй ТІЛЬКИ ці домени, посилання мають вести на КОНКРЕТНІ курси, не головні сторінки):**
${allowedDomains.slice(0, 12).map(d => `- https://${d}`).join('\n')}

**Формат відповіді:**

**Крок 1: Аналіз та фокус**
[2-3 речення про те, що найважливіше для цього кандидата]

**Крок 2: Навчальний маршрут**

- **Варіант А: "[Назва]"**
  Ресурс: [Конкретна назва курсу](конкретне-посилання)
  Чому: [1 речення пояснення]

- **Варіант Б: "[Назва]"**
  Ресурс: [Конкретна назва курсу](конкретне-посилання)
  Чому: [1 речення пояснення]

- **Варіант В: "[Назва]"**
  Ресурс: [Конкретна назва курсу](конкретне-посилання)
  Чому: [1 речення пояснення]

**Крок 3: Прогноз**
[Персональний висновок з прогнозом на 6-12 місяців]

Мова: Українська.` : `
You are a leading career strategist and EdTech expert. Based on the candidate profile, create a "Hybrid Learning Path".

**Candidate Profile:**
- Recommended direction: ${result1.direction}
- Analysis: ${result1.analisys}
- What to improve: ${result1.weakness}
- Course hint: ${result1.course_hint}

**Candidate's interview responses:**
${answersText}

**Sources (use ONLY these domains, links must point to SPECIFIC courses, not homepages):**
${allowedDomains.slice(0, 12).map(d => `- https://${d}`).join('\n')}

**Response format:**

**Step 1: Analysis & Focus**
[2-3 sentences about what matters most for this candidate]

**Step 2: Learning Route**

- **Option A: "[Name]"**
  Resource: [Specific Course Name](specific-link)
  Why: [1 sentence explanation]

- **Option B: "[Name]"**
  Resource: [Specific Course Name](specific-link)
  Why: [1 sentence explanation]

- **Option C: "[Name]"**
  Resource: [Specific Course Name](specific-link)
  Why: [1 sentence explanation]

**Step 3: Forecast**
[Personal conclusion with 6-12 month forecast]

Language: English.`;

        const aiText2 = await callGeminiSingle(prompt2, 1200);

        displayHybridPath(aiText2);

    } catch (error) {
        console.error('Помилка:', error);
        addAIMessage(currentLang === 'ua' 
            ? "⚠️ Помилка генерації результатів. Спробуйте ще раз або оновіть сторінку." 
            : "⚠️ Error generating results. Please try again or refresh the page.");
        enableInput();
    }
}


// Функція для відображення другого промпту (трохи оновлена для кращого форматування)
function displayHybridPath(text) {
    const lang = currentLang;
    // Конвертуємо markdown посилання в HTML та форматуємо текст
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #0066ff; text-decoration: underline;">$1</a>');

    const html = `
        <div class="result-card hybrid-path-card" style="border-top: 4px solid #8b5cf6; background-color: #D0E3FF; margin-top: 15px;">
            <div class="res-item">${formattedText}</div>
        </div>
    `;
    addRawHTMLMessage(html);
}

// Функція для гарного відображення JSON-результату в чаті
function displayFinalResults(res) {
    const lang = currentLang;
    const labels = {
        analisys: lang === 'ua' ? "🧠 Аналіз вашого профілю" : "🧠 Profile Analysis",
        direction: lang === 'ua' ? "🎯 Рекомендований напрямок" : "🎯 Recommended Direction",
        path: lang === 'ua' ? "🛤️ Освітній шлях" : "🛤️ Education Path",
        tip: lang === 'ua' ? "💡 Порада" : "💡 Recommendation",
        weakness: lang === 'ua' ? "📌 Що варто підтягнути" : "📌 What to Improve",
        next: lang === 'ua' ? "🚀 Перший крок" : "🚀 First Step"
    };

    const resultHtml = `
        <div class="result-card">
            <h3 style="color:var(--primary); margin-bottom:15px;">🏁 ${lang === 'ua' ? 'Ваш результат інтерв\'ю' : 'Your Interview Result'}</h3>
            
            <div class="res-item"><strong>${labels.analisys}:</strong><br>${res.analisys}</div>
            <div class="res-item" style="background:#f0f7ff; padding:10px; border-radius:8px; border-left:4px solid #0066ff;">
                <strong>${labels.direction}:</strong><br><span style="font-size:18px; font-weight:bold;">${res.direction}</span>
            </div>
            <div class="res-item"><strong>${labels.path}:</strong><br>${res.education_path}</div>
            <div class="res-item"><strong>${labels.tip}:</strong><br>${res.recommendation}</div>
            ${res.weakness ? `<div class="res-item" style="background:#fff7ed; padding:10px; border-radius:8px; border-left:4px solid #f59e0b;"><strong>${labels.weakness}:</strong><br>${res.weakness}</div>` : ''}
            <div class="res-item" style="color:#059669; font-weight:600;"><strong>${labels.next}:</strong><br>${res.next_step}</div>
            
            <button class="btn-main" style="margin-top:15px;" onclick="showPage('dashboard')">
                ${lang === 'ua' ? 'Перейти до дорожньої карти' : 'Go to Roadmap'}
            </button>
        </div>
    `;

    addRawHTMLMessage(resultHtml);
    updateDashboardProgress();
}

function updateDashboardProgress() {
    // Можна додати логіку оновлення прогрес-бару на головній
    const bar = document.querySelector('.progress-bar');
    if (bar) bar.style.width = "33%";
    const txt = document.querySelector('.roadmap-title p');
    if (txt) txt.innerText = currentLang === 'ua' ? "1 з 3 кроків виконано" : "1 of 3 steps completed";
}


function showResults(profile) {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.style.display = 'flex';
    const inputArea = document.querySelector('.chat-input-area');
    if (inputArea) inputArea.style.display = 'flex';
    
    const resultsDiv = document.getElementById('interview-results');
    resultsDiv.classList.add('page-hidden');
    
    const lang = currentLang;
    
    // Create a comprehensive summary message following the prompt example format
    let summaryMessage = `
        <strong>${lang === 'ua' ? 'Результати інтерв\'ю:' : 'Interview Results:'}</strong><br><br>
        
        1. Відповіді користувача на ваші питання:<br>
        ${profile.testAnswers ? Object.entries(profile.testAnswers).map(([q, ans], idx) => `   ${idx + 1}. ${ans}`).join('<br>') : '   (відповідей немає)'}<br><br>
        
        2. Перевірка питань у нашій системі:<br>
        - ${interviewQuestions[lang].q1}: ${profile.testAnswers?.q1 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q2}: ${profile.testAnswers?.q2 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q3}: ${profile.testAnswers?.q3 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q4}: ${profile.testAnswers?.q4 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q5}: ${profile.testAnswers?.q5 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q6}: ${profile.testAnswers?.q6 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q7}: ${profile.testAnswers?.q7 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q8}: ${profile.testAnswers?.q8 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q9}: ${profile.testAnswers?.q9 || 'не вказано'}<br>
        - ${interviewQuestions[lang].q10}: ${profile.testAnswers?.q10 || 'не вказано'}<br><br>
        
        3. Рекомендована сфера:<br>
        <span style="font-size: 24px; font-weight: bold; color: #fff; background: #000; padding: 5px 10px; border-radius: 4px;">${profile.category}</span><br><br>
        
        4. Напрямки роботи:<br>
        ${profile.jobDirections || interviewQuestions[lang].categories_desc[profile.category] || 'не вказано'}
    `;
    
    // Add optional fields if they exist
    if (profile.fieldInterest && profile.fieldInterest !== profile.category) {
        summaryMessage += `<br><br>5. Обрана галузь:<br>${profile.fieldInterest}`;
    }
    
    if (profile.fieldKnowledge) {
        summaryMessage += `<br><br>6. Базові знання:<br>${profile.fieldKnowledge}`;
    }
    
    addAIMessage(summaryMessage);
    
    // Scroll to bottom
    setTimeout(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 100);
}

// Функція підтвердження (щоб не скинути випадково)
function confirmReset() {
    const text = currentLang === 'ua' 
        ? "Ви впевнені, що хочете видалити прогрес і почати інтерв'ю спочатку?" 
        : "Are you sure you want to delete your progress and restart the interview?";
    
    if (confirm(text)) {
        resetInterview();
    }
}

function resetInterview() {
    // 1. Очищуємо стан
    interviewState = {
        stage: 0,
        testAnswers: {}
    };

    // 2. Очищуємо історію
    chatHistory = [];
    const emailKey = currentUser ? currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest';
    localStorage.removeItem(`interviewState_${emailKey}`);
    localStorage.removeItem(`interviewChatHistory_${emailKey}`);
    localStorage.removeItem('userChoice');
    localStorage.removeItem('userProfile');

    // 3. Очищуємо UI
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) chatWindow.innerHTML = '';
    
    const resultsDiv = document.getElementById('interview-results');
    if (resultsDiv) resultsDiv.classList.add('page-hidden');

    // 4. Запускаємо заново
    initializeInterview();
}

// Оновлення функції додавання повідомлень (щоб уникнути дублів при перезапуску)
function addMessage(text, isUser = false) {
    const chatWindow = document.getElementById('chat-window');
    const msgEl = document.createElement('div');
    msgEl.className = `msg ${isUser ? 'user-msg' : 'ai-msg'}`;
    msgEl.innerHTML = text;
    chatWindow.appendChild(msgEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Важливо: зберігаємо повідомлення ТІЛЬКИ в історію
    saveChatMessage(text, isUser);
}

function updateResults() {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (Object.keys(profile).length > 0) {
        showResults(profile);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const navigateToTab = (targetId) => {
        // Ищем li в списке .nav-links по атрибуту data-target
        const sidebarLink = document.querySelector(`.nav-links li[data-target="${targetId}"]`);
        
        if (sidebarLink) {
            // Кликаем по элементу меню, чтобы сработала логика handleProtectedAction
            sidebarLink.click();
            window.scrollTo(0, 0);
        } else {
            // Если data-target не найден, пробуем переключить страницу напрямую
            showPage(targetId);
        }
    };

    // Слушатель для всех кнопок действий на панели
    const actionButtons = document.querySelectorAll('.step-link-btn, .btn-primary-dark');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const target = button.getAttribute('data-target');
            if (target) {
                navigateToTab(target);
            }
        });
    });
});

function toggleRoleDropdown() {
    const dropdown = document.getElementById('role-dropdown');
    dropdown.classList.toggle('active');
}

function selectRole(role) {
    const roleText = document.getElementById('current-role-text');
    const sidebarNav = document.querySelector('.nav-links');
    const mainContent = document.querySelector('body'); // Або ваш основний контейнер контенту

    // Закриваємо список
    document.getElementById('role-dropdown').classList.remove('active');

    if (role === 'student') {
        roleText.innerText = 'Студенту';
        // Показуємо вашу стандартну навігацію
        sidebarNav.style.display = 'block';
        showPage('dashboard'); // Повертаємо на головну студента
    } else {
        // Логіка для "Роботодавця" та "Навчальних закладів"
        roleText.innerText = role === 'employer' ? 'Роботодавцю' : 'Навчальним закладам';
        
        // Тимчасово приховуємо навігацію студента
        sidebarNav.style.display = 'none';
        
        // Очищуємо робочу область або показуємо заглушку
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        alert("Цей розділ знаходиться у розробці");
    }
}

// Закриття випадаючого списку при кліку поза ним
window.onclick = function(event) {
    if (!event.target.matches('.role-selected') && !event.target.matches('#current-role-text')) {
        const dropdown = document.getElementById('role-dropdown');
        if (dropdown && dropdown.classList.contains('active')) {
            dropdown.classList.remove('active');
        }
    }
}
// Конфігурація меню для різних ролей
const menuConfigs = {
    student: [
        { id: 'l-home', target: 'dashboard', key: 'nav_home', text: 'Панель' },
        { id: 'l-interview', target: 'ai-interview', key: 'nav_interview', text: 'AI Інтерв\'ю' },
        { id: 'l-edu', target: 'education', key: 'nav_edu', text: 'Освіта & Гранти' },
        { id: 'l-jobs', target: 'jobs', key: 'nav_jobs', text: 'Пошук роботи' },
        { id: 'l-resume', target: 'resume', key: 'nav_resume', text: 'AI Конструктор резюме' },
        { id: 'l-courses', target: 'courses', key: 'nav_courses', text: 'Курси' }
    ],
    employer: [
        { id: 'emp-home', target: 'emp-dashboard', key: 'nav_emp_home', text: 'Головна' },
        { id: 'emp-vacancies', target: 'vacancies', key: 'nav_vacancies', text: 'Розмістити вакансію' },
        { id: 'emp-search', target: 'search-talents', key: 'nav_search', text: 'Пошук талантів' }
    ],
    institution: [
        { id: 'inst-home', target: 'inst-dashboard', key: 'nav_inst_home', text: 'Головна' },
        { id: 'inst-students', target: 'students-list', key: 'nav_students', text: 'Мої туденти' }
    ]
};

// Функція для оновлення меню в сайдбарі
function renderSidebar(role) {
    const navContainer = document.getElementById('main-nav-links');
    const menuItems = menuConfigs[role];
    
    // Очищуємо поточне меню
    navContainer.innerHTML = '';

    // Створюємо нові пункти
    menuItems.forEach((item, index) => {
        const li = document.createElement('li');
        li.id = item.id;
        li.setAttribute('data-target', item.target);
        li.setAttribute('data-key', item.key);
        li.innerText = item.text;
        
        // Робимо перший пункт активним за замовчуванням
        if (index === 0) li.classList.add('active');

        // Додаємо обробник кліку (використовуємо вашу існуючу функцію showPage або handleProtectedAction)
        li.onclick = () => {
            // Видаляємо active у всіх і додаємо поточному
            document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            
            // Якщо це студентська роль — використовуємо вашу логіку перевірок, 
            // якщо інша — поки просто показуємо порожню сторінку
            if (role === 'student') {
                handleProtectedAction(item.target.replace('ai-', '')); 
            } else {
                showPage(item.target);
            }
        };

        navContainer.appendChild(li);
    });
}

// Оновлюємо вашу функцію selectRole (з попереднього кроку)
function selectRole(role) {
    const roleText = document.getElementById('current-role-text');
    document.getElementById('role-dropdown').classList.remove('active');

    // Оновлюємо текст у кнопці
    const labels = { student: 'Студенту', employer: 'Роботодавцю', institution: 'Навчальним закладам' };
    roleText.innerText = labels[role];

    // Перемальовуємо сайдбар
    renderSidebar(role);

    // Показуємо відповідну стартову сторінку
    const startPage = menuConfigs[role][0].target;
    showPage(startPage);
}

// Ініціалізація при завантаженні (щоб меню студента з'явилося одразу)
document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('student');
});

// Функції для Преміум модального вікна
function openPremiumModal() {
    const modal = document.getElementById('premium-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closePremiumModal() {
    const modal = document.getElementById('premium-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Закриття при кліку поза вікном
window.onclick = function(event) {
    const modal = document.getElementById('premium-modal');
    if (event.target == modal) {
        closePremiumModal();
    }
}

function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('photo-preview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Аватар">`;
            preview.style.borderStyle = 'solid';
            preview.style.borderColor = 'var(--primary)';
        };
        reader.readAsDataURL(file);
    }
}