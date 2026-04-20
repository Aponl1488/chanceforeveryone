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

// Масив для збереження діалогу чату
let chatHistory = [];

const dictionary = {
    ua: {
        nav_home: "Панель", nav_interview: "AI Інтерв'ю", nav_edu: "Освіта & Гранти", nav_jobs: "Пошук роботи",
        status_guest: "Гість", status_user: "Користувач: ", auth_title: "Реєстрація",
        auth_login_title: "Вхід", auth_btn: "Створити акаунт", auth_login_btn: "Увійти",
        prof_resume: "Резюме", prof_courses: "Мої курси", prof_completed: "Пройдено",
        prof_ongoing: "У процесі", logout_btn: "Вийти з акаунта", nav_resume: "AI конструктор резюме"
    },
    en: {
        nav_home: "Dashboard", nav_interview: "AI Interview", nav_edu: "Education", nav_jobs: "Jobs",
        status_guest: "Guest", status_user: "User: ", auth_title: "Registration",
        auth_login_title: "Login", auth_btn: "Sign Up", auth_login_btn: "Sign In",
        prof_resume: "Resume", prof_courses: "My Courses", prof_completed: "Completed",
        prof_ongoing: "Ongoing", logout_btn: "Log Out", nav_resume: "AI resume builder"
    }
};

const interviewQuestions = {
    ua: {
        q1: "Привіт! Давайте розпочнемо ваше інтерв'ю. Першим питанням: **Яку освіту ви здобуваєте?** (наприклад: Комп'ютерні науки, Іноземні мови, Бізнес тощо)",
        q2: "Спасибі! Наступне питання: **Які основні навички ви маєте?** (наприклад: програмування, спілкування, аналіз, креативність тощо)",
        q3: "Чудово! А тепер важливе питання: **Чи бажаєте ви працювати за своєю освітою, чи розглядаєте змінити галузь?** (відповідьте: 'Так' - працювати за освітою, чи 'Ні' - змінити галузь)",
        q4_continue: "Відмінно! Тоді далі зі мною...",
        q4_change: "Цікаво! Давайте знайдемо вам нову сферу.",
        q5: "**Яка галузь вас цікавить?** Напишіть її назву або скажіть 'не знаю', якщо ще невизначились",
        q5_guidance: "Я допоможу вам знайти правильний напрямок! Відповідь на кілька питань:",
        q5_1: "**1. Чи є якісь активності або хобі, які вам подобаються?** (наприклад: читання книг, спорт, малювання, конструювання тощо)",
        q5_2: "**2. Які предмети в школі або університеті найбільш імпонували?** (наприклад: математика, історія, фізика, мистецтво тощо)",
        q5_3: "**3. Більше подобається працювати у команді або поодинці?** (відповідьте: 'у команді' або 'поодинці')",
        q5_4: "**4. Обери сферу, яка тобі найближча:**\n\nТехнічна - люблю вирішувати логічні задачі, цікавлюсь новими гаджетами, механізмами\n\nСоціальна - люблю працювати з людьми, підтримувати, для мене важливе спілкування\n\nГуманітарна - маю креативне мислення, багато читаю або пишу тексти/вірші, цікавлюсь мистецтвом, історією\n\nСпортивна - регулярно займаюсь спортом, цікавлюсь харчуванням, будовою тіла\n\nМедична - хочу допомогати людям, цікавлюсь біологією, анатомією, маю дисципліну\n\n(Напишіть: Технічна, Соціальна, Гуманітарна, Спортивна або Медична)",
        categories_desc: {
            "Технічна": "Технолог, програміст, інженер, аналітик, архітектор систем, 3D дизайнер, робототехнік",
            "Соціальна": "HR менеджер, рекрутер, соціальний працівник, продавець, керівник команди, консультант, психолог",
            "Гуманітарна": "Письменник, редактор, маркетолог, дизайнер, журналіст, історик, філолог, художник",
            "Спортивна": "Тренер, фізіотерапевт, спортивний менеджер, нутріціолог, інструктор фітнесу, спортивний лікар",
            "Медична": "Лікар, медсестра, фармацевт, психолог, стоматолог, хірург, епідеміолог"
        }
    },
    en: {
        q1: "Hello! Let's start your interview. First question: **What education are you pursuing?** (e.g., Computer Science, Languages, Business, etc.)",
        q2: "Thanks! Next question: **What are your main skills?** (e.g., programming, communication, analysis, creativity, etc.)",
        q3: "Great! Important question: **Do you want to work in your field, or are you considering changing sectors?** (Answer: 'Yes' - work in your field, or 'No' - change sector)",
        q4_continue: "Perfect! Let's continue...",
        q4_change: "Interesting! Let's find a new field for you.",
        q5: "**What field interests you?** Write its name or say 'I don\\'t know' if you\\'re still deciding",
        q5_guidance: "I'll help you find the right direction!  Answer a few questions:",
        q5_1: "**1️⃣ Are there any activities or hobbies you enjoy?** (e.g., reading, sports, drawing, building, etc.)",
        q5_2: "**2️⃣ What subjects in school or university did you enjoy most?** (e.g., math, history, physics, art, etc.)",
        q5_3: "**3️⃣ Do you prefer working in a team or alone?** (Answer: 'in a team' or 'alone')",
        q5_4: "**4️⃣ Choose the field closest to you:**\n\n **Technical** - love solving logic tasks, interested in gadgets, mechanisms\n\n **Social** - love working with people, supporting, communication is important\n\n **Humanitarian** - creative thinking, read or write texts/poetry, interested in art, history\n\n **Sports** - regularly do sports, interested in nutrition, human body\n\n **Medical** - want to help people, interested in biology, anatomy, disciplined\n\n(Write: Technical, Social, Humanitarian, Sports or Medical)",
        categories_desc: {
            "Technical": "Technologist, programmer, engineer, analyst, system architect, 3D designer, roboticist",
            "Social": "HR manager, recruiter, social worker, salesman, team leader, consultant, psychologist",
            "Humanitarian": "Writer, editor, marketer, designer, journalist, historian, philologist, artist",
            "Sports": "Coach, physiotherapist, sports manager, nutritionist, fitness instructor, sports doctor",
            "Medical": "Doctor, nurse, pharmacist, psychologist, dentist, surgeon, epidemiologist"
        }
    }
};

// Завантаження стану інтерв'ю з локального сховища браузера
function loadInterviewState() {
    const saved = localStorage.getItem('interviewState');
    if (saved) {
        interviewState = JSON.parse(saved);
    }
    loadChatHistory();
}

// Збереження стану інтерв'ю до локального сховища браузера
function saveInterviewState() {
    localStorage.setItem('interviewState', JSON.stringify(interviewState));
    saveChatHistory();
}

// Завантаження історії чату
function loadChatHistory() {
    const saved = localStorage.getItem('interviewChatHistory');
    if (saved) {
        chatHistory = JSON.parse(saved);
    } else {
        chatHistory = [];
    }
}

// Збереження історії чату
function saveChatHistory() {
    localStorage.setItem('interviewChatHistory', JSON.stringify(chatHistory));
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
    if (userChoice) updateResults();
};

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

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const navItem = document.querySelector(`[onclick*="${id}"]`);
    if (navItem) navItem.classList.add('active');
    
    // Initialize interview when opening
    if (id === 'interview') {
        if (interviewState.stage === 0) {
            // First time - initialize
            const chatWindow = document.getElementById('chat-window');
            if (chatWindow) chatWindow.style.display = 'flex';
            const inputArea = document.querySelector('.chat-input-area');
            if (inputArea) inputArea.style.display = 'flex';
            chatHistory = [];
            setTimeout(() => initializeInterview(), 100);
        } else if (interviewState.stage === 6 && localStorage.getItem('userProfile')) {
            // Already completed - show results
            const profile = JSON.parse(localStorage.getItem('userProfile'));
            showResults(profile);
        } else {
            // Resume in progress - restore chat from history
            const chatWindow = document.getElementById('chat-window');
            if (chatWindow) chatWindow.style.display = 'flex';
            const inputArea = document.querySelector('.chat-input-area');
            if (inputArea) inputArea.style.display = 'flex';
            
            // Відновлюємо чат з історії
            loadChatHistory();
            if (chatHistory.length > 0) {
                chatWindow.innerHTML = '';
                chatHistory.forEach(msg => {
                    const msgEl = document.createElement('div');
                    msgEl.className = `msg ${msg.isUser ? 'user-msg' : 'ai-msg'}`;
                    msgEl.innerHTML = msg.text;
                    chatWindow.appendChild(msgEl);
                });
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }
        }
    }
}

function handleProtectedAction(id) {
    if (!isRegistered) showPage('auth');
    else showPage(id);
}

function changeLang(lang) {
    currentLang = lang;
    localStorage.setItem('cfe_lang', lang);
    document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (dictionary[lang][key]) el.innerText = dictionary[lang][key];
    });
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

// ===== ЛОГІКА AI ІНТЕРВ'Ю =====

function initializeInterview() {
    const chatWindow = document.getElementById('chat-window');
    
    // Якщо є збережений чат, відновлюємо його
    if (chatHistory.length > 0) {
        // Очищаємо весь чат
        chatWindow.innerHTML = '';
        
        // Відновлюємо весь чат з історії
        chatHistory.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = `msg ${msg.isUser ? 'user-msg' : 'ai-msg'}`;
            msgEl.innerHTML = msg.text;
            chatWindow.appendChild(msgEl);
        });
        chatWindow.scrollTop = chatWindow.scrollHeight;
    } else {
        // Перший раз - очищаємо лише повідомлення користувача, залишаємо перше питання
        const userMessages = chatWindow.querySelectorAll('.user-msg');
        userMessages.forEach(msg => msg.remove());
    }
    
    interviewState.stage = 1;
    saveInterviewState();
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Приховуємо початкове питання коли користувач починає писати
    const initialQuestion = document.getElementById('initial-question');
    if (initialQuestion) {
        initialQuestion.style.display = 'none';
    }
    
    addUserMessage(message);
    input.value = '';
    input.focus();
    
    processInterviewResponse(message);
    saveInterviewState();
}

function addMessage(text, isUser = false) {
    const chatWindow = document.getElementById('chat-window');
    const msgEl = document.createElement('div');
    msgEl.className = `msg ${isUser ? 'user-msg' : 'ai-msg'}`;
    msgEl.innerHTML = text;
    chatWindow.appendChild(msgEl);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    
    // Зберігаємо повідомлення в історію
    saveChatMessage(text, isUser);
}

function addUserMessage(text) {
    addMessage(text, true);
}

function addAIMessage(text) {
    // Конвертація markdown в HTML
    let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
    addMessage(html, false);
}

// Перевірка, чи відповідь користувача відповідає темі запитання
function isResponseValid(userInput, stage) {
    const input = userInput.toLowerCase().trim();
    
    // Мінімальна довжина відповіді
    if (input.length < 2) return false;
    
    switch(stage) {
        case 1: // Освіта - повинна містити слова про навчання, спеціальність
            const educationKeywords = ['освіт|навч|спеціаль|факультет|курс|програм|ступен|наук|гуманітар|технічн|комп|економ|скла|медицин|юрид|технолог|інформацій|мова|мистец|história|філософ|психолог|соціолог|маркетинг|менеджмен|дизайн|архітект'];
            return educationKeywords.some(keyword => {
                const regex = new RegExp(keyword, 'i');
                return regex.test(input);
            });
            
        case 2: // Навички - повинна містити слова про вміння, компетенції
            const skillsKeywords = ['умі|навич|вмію|знаю|програм|код|спілкування|аналіз|креативність|лідерство|командна|комунікація|усний|письмо|розв|логік|організа|планув|робот|навант|комп|мова|математик|дизайн|графік|відео|фото|написання|читання|розробка|тестування'];
            return skillsKeywords.some(keyword => {
                const regex = new RegExp(keyword, 'i');
                return regex.test(input);
            });
            
        case 3: // Робота за освітою - так/ні питання
            return input.includes('так') || input.includes('yes') || input.includes('да') ||
                   input.includes('ні') || input.includes('no') || input.includes('нет') ||
                   input.includes('так,') || input.includes('ні,');
            
        case 4: // Галузь - зазвичай одне слово або фраза
            return input.length > 2;
            
        case 5: // Хобі - активності
            const hobbiesKeywords = ['читання|спорт|малювання|конструювання|музика|танці|програмування|гра|путешествие|варіння|готування|рукоділля|йога|фітнес|ігор|активність|займаюс|люблю|цікавл|подобається|робота|навчання|фото|відео|книг|фільм|серіал|театр|кіно|опера|концерт|вишиванка|мода|мода|прогулянка|пісні|інтернет|блог|соціальні'];
            return hobbiesKeywords.some(keyword => {
                const regex = new RegExp(keyword, 'i');
                return regex.test(input);
            });
            
        case 5.1: // Предмети
            const subjectsKeywords = ['математик|фізик|хімі|біологі|історі|мова|англійськ|укра|суспільств|географі|економік|філософі|психолог|мистец|музик|корис|інформатик|програм|литер|геометрій'];
            return subjectsKeywords.some(keyword => {
                const regex = new RegExp(keyword, 'i');
                return regex.test(input);
            });
            
        case 5.2: // Команда чи поодинці
            return input.includes('команд') || input.includes('групі') || input.includes('team') || input.includes('together') ||
                   input.includes('поодинці') || input.includes('один') || input.includes('alone') || input.includes('myself');
            
        case 5.3: // Категорія сфери
            const categories = ['технічна|соціальна|гуманітарна|спортивна|медична|technical|social|humanitarian|sports|medical'];
            return categories.some(keyword => {
                const regex = new RegExp(keyword, 'i');
                return regex.test(input);
            });
            
        default:
            return input.length > 0;
    }
}

// Повідомлення про невірний формат відповіді
function getInvalidResponseMessage(stage) {
    const lang = currentLang;
    const messages = {
        ua: {
            1: "Будь ласка, напишіть вашу спеціальність або якої освіти ви навчаєтесь.",
            2: "Будь ласка, напишіть ваші навички та вміння.",
            3: "Будь ласка, відповідьте 'Так' або 'Ні'.",
            4: "Будь ласка, напишіть назву галузі, яка вас цікавить.",
            5: "Будь ласка, напишіть свої хобі та улюблені активності.",
            5.1: "Будь ласка, напишіть улюблені предмети з школи або університету.",
            5.2: "Будь ласка, відповідьте чи ви бажаєте працювати у команді чи поодинці.",
            5.3: "Будь ласка, обери одну зі запропонованих сфер: Технічна, Соціальна, Гуманітарна, Спортивна або Медична."
        },
        en: {
            1: "Please write your specialty or what education you are pursuing.",
            2: "Please write your skills and abilities.",
            3: "Please answer 'Yes' or 'No'.",
            4: "Please write the name of a field that interests you.",
            5: "Please write your hobbies and favorite activities.",
            5.1: "Please write your favorite subjects from school or university.",
            5.2: "Please answer if you prefer to work in a team or alone.",
            5.3: "Please choose one of the suggested fields: Technical, Social, Humanitarian, Sports or Medical."
        }
    };
    
    return messages[lang][stage] || (lang === 'ua' ? "Будь ласка, дайте правильну відповідь." : "Please provide a valid answer.");
}

function processInterviewResponse(userInput) {
    const input = userInput.toLowerCase().trim();
    
    // Перевірка валідності відповіді
    if (!isResponseValid(userInput, interviewState.stage)) {
        setTimeout(() => addAIMessage(getInvalidResponseMessage(interviewState.stage)), 500);
        return; // Не рухаємось далі, перепитуємо
    }
    
    switch(interviewState.stage) {
        case 1: // Освіта
            interviewState.education = userInput;
            interviewState.stage = 2;
            setTimeout(() => addAIMessage(interviewQuestions[currentLang].q2), 500);
            break;
            
        case 2: // Навички
            interviewState.skills = userInput;
            interviewState.stage = 3;
            setTimeout(() => addAIMessage(interviewQuestions[currentLang].q3), 500);
            break;
            
        case 3: // Вибір напрямку роботи
            if (input.includes('так') || input.includes('yes') || input.includes('да')) {
                interviewState.workChoice = 'yes';
                setTimeout(() => {
                    addAIMessage(interviewQuestions[currentLang].q4_continue);
                    setTimeout(() => generateRecommendations(), 1000);
                }, 500);
            } else if (input.includes('ні') || input.includes('no') || input.includes('нет')) {
                interviewState.workChoice = 'no';
                interviewState.stage = 4;
                setTimeout(() => {
                    addAIMessage(interviewQuestions[currentLang].q4_change);
                    setTimeout(() => addAIMessage(interviewQuestions[currentLang].q5), 500);
                }, 500);
            }
            break;
            
        case 4: // Цікава галузь
            interviewState.fieldInterest = userInput;
            if (input.includes('не знаю') || input.includes("don't know") || input.includes('не визнач')) {
                interviewState.stage = 5; // Assessment test
                setTimeout(() => {
                    addAIMessage(interviewQuestions[currentLang].q5_guidance);
                    setTimeout(() => addAIMessage(interviewQuestions[currentLang].q5_1), 1000);
                }, 500);
            } else {
                interviewState.stage = 6; // Results
                setTimeout(() => generateRecommendations(userInput), 500);
            }
            break;
            
        case 5: // Оцінка - хобі
            interviewState.hobbies = userInput;
            interviewState.stage = 5.1;
            setTimeout(() => addAIMessage(interviewQuestions[currentLang].q5_2), 500);
            break;
            
        case 5.1: // Оцінка - улюблені предмети
            interviewState.bestSubjects = userInput;
            interviewState.stage = 5.2;
            setTimeout(() => addAIMessage(interviewQuestions[currentLang].q5_3), 500);
            break;
            
        case 5.2: // Оцінка - тип роботи (команда або поодинці)
            interviewState.teamWork = userInput;
            interviewState.stage = 5.3;
            setTimeout(() => addAIMessage(interviewQuestions[currentLang].q5_4), 500);
            break;
            
        case 5.3: // Оцінка - категорія сфери
            const validCategories = currentLang === 'ua' ? 
                ['Технічна', 'Соціальна', 'Гуманітарна', 'Спортивна', 'Медична'] :
                ['Technical', 'Social', 'Humanitarian', 'Sports', 'Medical'];
            
            const matched = validCategories.find(cat => input.includes(cat.toLowerCase()));
            
            if (matched) {
                interviewState.categoryChoice = matched;
                interviewState.stage = 6;
                setTimeout(() => generateRecommendations(), 500);
            }
            break;
    }
}

function generateRecommendations(fieldName = null) {
    const lang = currentLang;
    let profile = {
        education: interviewState.education,
        skills: interviewState.skills,
        fieldInterest: fieldName || interviewState.fieldInterest,
        category: interviewState.categoryChoice || fieldName,
        hobbies: interviewState.hobbies,
        bestSubjects: interviewState.bestSubjects,
        teamWork: interviewState.teamWork
    };
    
    // Визначення сфери на основі відповідей якщо вона не встановлена
    if (!profile.category && !fieldName) {
        const categoryMap = {
            'програм|код|логі|задач|гаджет|техно|механізм': lang === 'ua' ? 'Технічна' : 'Technical',
            'люди|спілкування|команд|груп|груп': lang === 'ua' ? 'Соціальна' : 'Social',
            'креатив|ткани|вірш|мистец|історі|письмо': lang === 'ua' ? 'Гуманітарна' : 'Humanitarian',
            'спорт|фітнес|харч|тіло|трен': lang === 'ua' ? 'Спортивна' : 'Sports',
            'медиці|допом|біологі|анатомі|дисциплін': lang === 'ua' ? 'Медична' : 'Medical'
        };
        
        for (const [keywords, category] of Object.entries(categoryMap)) {
            const regex = new RegExp(keywords, 'i');
            if (regex.test(interviewState.hobbies + ' ' + interviewState.bestSubjects + ' ' + interviewState.skills)) {
                profile.category = category;
                break;
            }
        }
    }
    
    profile.category = profile.category || (lang === 'ua' ? 'Технічна' : 'Technical');
    
    // Генерація текстових рекомендацій
    const categoryDescriptions = interviewQuestions[lang].categories_desc;
    const recommendedJobs = categoryDescriptions[profile.category] || 
        (lang === 'ua' ? 'Спеціаліст в обраній галузі' : 'Specialist in chosen field');
    
    const resultText = lang === 'ua' ? `
**🎉 Ваш профіль**

**Освіта:** ${profile.education}
**Навички:** ${profile.skills}
**Вибрана сфера:** ${profile.category}
${profile.hobbies ? `**Hobbies:** ${profile.hobbies}` : ''}
${profile.bestSubjects ? `**Favorite subjects:** ${profile.bestSubjects}` : ''}
${profile.teamWork ? `**Work type:** ${profile.teamWork}` : ''}

**💼 Рекомендовані напрямки:**
${recommendedJobs}

Я допоміг вам визначити можливі напрямки розвитку! Тепер у вас є повний доступ до курсів, вакансій та грантів в хабі.
    ` : `
**Your Profile**

**Education:** ${profile.education}
**Skills:** ${profile.skills}
**Chosen field:** ${profile.category}
${profile.hobbies ? `**Hobbies:** ${profile.hobbies}` : ''}
${profile.bestSubjects ? `**Favorite subjects:** ${profile.bestSubjects}` : ''}
${profile.teamWork ? `**Work type:** ${profile.teamWork}` : ''}

**💼 Recommended directions:**
${recommendedJobs}

I've helped you identify possible career paths! You now have full access to courses, jobs, and grants in our hub.
    `;
    
    // Збереження результатів у локальне сховище
    userChoice = profile.category;
    localStorage.setItem('userChoice', userChoice);
    localStorage.setItem('userProfile', JSON.stringify(profile));
    
    // Показування результатів після затримки для кращого UX
    setTimeout(() => {
        addAIMessage(resultText);
        setTimeout(() => {
            showResults(profile);
        }, 2000);
    }, 1000);
}

function showResults(profile) {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.style.display = 'none';
    const inputArea = document.querySelector('.chat-input-area');
    if (inputArea) inputArea.style.display = 'none';
    
    const resultsDiv = document.getElementById('interview-results');
    resultsDiv.classList.remove('page-hidden');
    
    const profileResults = document.getElementById('profile-results');
    const lang = currentLang;
    
    profileResults.innerHTML = `
        <div class="result-section">
            <h3>${lang === 'ua' ? 'Освіта' : 'Education'}</h3>
            <p>${profile.education}</p>
        </div>
        <div class="result-section">
            <h3>${lang === 'ua' ? 'Навички' : 'Skills'}</h3>
            <p>${profile.skills}</p>
        </div>
        <div class="result-section" style="background: linear-gradient(135deg, var(--primary), rgba(0,0,0,0.8)); color: white;">
            <h3>${lang === 'ua' ? 'Рекомендована сфера' : 'Recommended field'}</h3>
            <p style="font-size: 24px; font-weight: bold; margin-top: 10px;">${profile.category}</p>
        </div>
        <div class="result-section">
            <h3>${lang === 'ua' ? 'Напрямки роботи' : 'Job directions'}</h3>
            <p>${interviewQuestions[lang].categories_desc[profile.category]}</p>
        </div>
        ${profile.hobbies ? `
        <div class="result-section">
            <h3>${lang === 'ua' ? 'Хобі' : 'Hobbies'}</h3>
            <p>${profile.hobbies}</p>
        </div>` : ''}
        ${profile.bestSubjects ? `
        <div class="result-section">
            <h3>${lang === 'ua' ? 'Улюблені предмети' : 'Favorite subjects'}</h3>
            <p>${profile.bestSubjects}</p>
        </div>` : ''}
    `;
}

function resetInterview() {
    interviewState = {
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
    chatHistory = []; // Очищаємо історію чату
    saveInterviewState();
    localStorage.removeItem('userChoice');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('interviewChatHistory'); // Очищаємо збережений чат
    
    // Очищаємо чат але зберігаємо/відновлюємо перше питання
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = `
        <div id="initial-question" class="msg ai-msg">
            <strong>Привіт! Давайте розпочнемо ваше інтерв'ю. Першим питанням:</strong><br><br>
            <strong>Яку освіту ви здобуваєте?</strong> (наприклад: Комп'ютерні науки, Іноземні мови, Бізнес тощо)
        </div>
    `;
    chatWindow.style.display = 'flex';
    document.querySelector('.chat-input-area').style.display = 'flex';
    document.getElementById('interview-results').classList.add('page-hidden');
    
    initializeInterview();
}

function updateResults() {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (Object.keys(profile).length > 0) {
        showResults(profile);
    }
}
