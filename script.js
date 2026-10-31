
// =====================================
// MY ENGLISH JOURNAL
// Полная исправленная версия
// =====================================

const STORAGE_KEY = "my-english-journal-v1";

// Загрузка сохранённых данных
function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (
            saved &&
            Array.isArray(saved.students) &&
            Array.isArray(saved.lessons)
        ) {
            saved.lessons.forEach(lesson => {
                if (!lesson.attendance) {
                    lesson.attendance = {};
                }
            });

            return saved;
        }
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
    }

    return {
        students: [],
        lessons: []
    };
}

let data = loadData();

let currentLessonId = null;
let editingLessonId = null;

// Элементы страницы
const dateInput = document.getElementById("lessonDate");
const topicInput = document.getElementById("lessonTopic");
const saveLessonBtn = document.getElementById("saveLesson");
const addStudentBtn = document.getElementById("addStudentBtn");
const studentsTable = document.getElementById("studentsTable");
const historyList = document.getElementById("historyList");

// Сохранение данных
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        alert("Не удалось сохранить данные. Проверьте память браузера.");
        console.error(error);
    }
}

// Уникальный ID
function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// Защита текста
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Получение текущего урока
function getCurrentLesson() {
    return data.lessons.find(
        lesson => lesson.id === currentLessonId
    );
}

// Сегодняшняя дата
function setToday() {
    const today = new Date();

    const localDate = new Date(
        today.getTime() -
        today.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    dateInput.value = localDate;
}

// =====================================
// СОХРАНЕНИЕ И РЕДАКТИРОВАНИЕ УРОКА
// =====================================

saveLessonBtn.addEventListener("click", () => {

    const date = dateInput.value;
    const topic = topicInput.value.trim();

    if (!date || !topic) {
        alert("Укажите дату и тему урока!");
        return;
    }

    let lesson;

    // Редактирование существующего урока
    if (editingLessonId) {

        lesson = data.lessons.find(
            item => item.id === editingLessonId
        );

        if (!lesson) {
            editingLessonId = null;
            currentLessonId = null;

            alert("Урок не найден!");
            renderAll();
            return;
        }

        // Проверяем одинаковые даты
        const duplicate = data.lessons.find(
            item =>
                item.date === date &&
                item.id !== editingLessonId
        );

        if (duplicate) {
            alert("На эту дату уже существует другой урок!");
            return;
        }

        lesson.date = date;
        lesson.topic = topic;

    } else {

        // Проверяем, существует ли урок на эту дату
        lesson = data.lessons.find(
            item => item.date === date
        );

        if (lesson) {

            lesson.topic = topic;

        } else {

            lesson = {
                id: createId(),
                date: date,
                topic: topic,
                attendance: {}
            };

            data.lessons.push(lesson);
        }
    }

    currentLessonId = lesson.id;
    editingLessonId = null;

    saveData();
    renderAll();

    alert("Урок сохранён!");
});

// =====================================
// ВЫБОР ДАТЫ
// =====================================

dateInput.addEventListener("change", () => {

    if (editingLessonId) {
        return;
    }

    const lesson = data.lessons.find(
        item => item.date === dateInput.value
    );

    currentLessonId = lesson ? lesson.id : null;

    topicInput.value = lesson ? lesson.topic : "";

    renderAll();
});

// =====================================
// ДОБАВЛЕНИЕ УЧЕНИКА
// =====================================

addStudentBtn.addEventListener("click", () => {

    const name = prompt(
        "Введите имя и фамилию ученика:"
    );

    if (!name || !name.trim()) {
        return;
    }

    data.students.push({
        id: createId(),
        name: name.trim()
    });

    saveData();
    renderAll();
});

// =====================================
// ОТМЕТКИ ПОСЕЩАЕМОСТИ
// =====================================

studentsTable.addEventListener("click", event => {

    const button = event.target.closest("button");

    if (!button) return;

    const studentId = button.dataset.student;
    const action = button.dataset.action;

    // ПРИСУТСТВИЕ ИЛИ ОТСУТСТВИЕ
    if (
        action === "present" ||
        action === "absent"
    ) {

        const lesson = getCurrentLesson();

        if (!lesson) {
            alert(
                "Сначала укажите дату и тему урока и сохраните его!"
            );
            return;
        }

        lesson.attendance[studentId] = action;

        saveData();
        renderAll();
    }

    // РЕДАКТИРОВАНИЕ УЧЕНИКА
    if (action === "edit") {

        const student = data.students.find(
            s => s.id === studentId
        );

        if (!student) return;

        const newName = prompt(
            "Изменить имя и фамилию:",
            student.name
        );

        if (newName && newName.trim()) {

            student.name = newName.trim();

            saveData();
            renderAll();
        }
    }

    // УДАЛЕНИЕ УЧЕНИКА
    if (action === "delete") {

        const student = data.students.find(
            s => s.id === studentId
        );

        if (!student) return;

        if (!confirm(
            `Удалить ученика ${student.name} и всю его историю посещений?`
        )) {
            return;
        }

        data.students = data.students.filter(
            s => s.id !== studentId
        );

        data.lessons.forEach(lesson => {
            delete lesson.attendance[studentId];
        });

        saveData();
        renderAll();
    }

    // ИСТОРИЯ УЧЕНИКА
    if (action === "history") {
        showStudentHistory(studentId);
    }
});

// =====================================
// СТАТИСТИКА УЧЕНИКА
// =====================================

function getStudentStats(studentId) {

    let present = 0;
    let absent = 0;

    data.lessons.forEach(lesson => {

        const status = lesson.attendance[studentId];

        if (status === "present") present++;
        if (status === "absent") absent++;
    });

    return {
        present,
        absent
    };
}

// =====================================
// ОТОБРАЖЕНИЕ УЧЕНИКОВ
// =====================================

function renderStudents() {

    const lesson = getCurrentLesson();

    studentsTable.innerHTML = "";

    data.students.forEach(student => {

        const status =
            lesson?.attendance[student.id] || "";

        const stats = getStudentStats(student.id);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeHTML(student.name)}</strong>
            </td>

            <td>
                <button
                    class="mark-btn present ${status === "present" ? "selected" : ""}"
                    data-action="present"
                    data-student="${student.id}">
                    +
                </button>
            </td>

            <td>
                <button
                    class="mark-btn absent ${status === "absent" ? "selected" : ""}"
                    data-action="absent"
                    data-student="${student.id}">
                    −
                </button>
            </td>

            <td>
                <button
                    class="history-btn"
                    data-action="history"
                    data-student="${student.id}">
                    ${stats.absent} пропусков
                </button>
            </td>

            <td>
                <button
                    class="small-btn"
                    data-action="edit"
                    data-student="${student.id}"
                    title="Изменить ученика">
                    ✏️
                </button>

                <button
                    class="small-btn delete-btn"
                    data-action="delete"
                    data-student="${student.id}"
                    title="Удалить ученика">
                    🗑️
                </button>
            </td>
        `;

        studentsTable.appendChild(row);
    });
}

// =====================================
// СТАТИСТИКА ТЕКУЩЕГО УРОКА
// =====================================

function renderStatistics() {

    const lesson = getCurrentLesson();

    let present = 0;
    let absent = 0;

    data.students.forEach(student => {

        const status =
            lesson?.attendance[student.id];

        if (status === "present") present++;
        if (status === "absent") absent++;
    });

    document.getElementById(
        "presentCount"
    ).textContent = present;

    document.getElementById(
        "absentCount"
    ).textContent = absent;

    document.getElementById(
        "totalCount"
    ).textContent = data.students.length;

    document.getElementById(
        "studentCount"
    ).textContent = `Всего: ${data.students.length}`;
}

// =====================================
// ИСТОРИЯ ПРОПУСКОВ УЧЕНИКА
// =====================================

function showStudentHistory(studentId) {

    const student = data.students.find(
        s => s.id === studentId
    );

    if (!student) return;

    const history = data.lessons
        .filter(
            lesson =>
                lesson.attendance[studentId] === "absent"
        )
        .sort(
            (a, b) => b.date.localeCompare(a.date)
        );

    let message =
        `Пропуски ученика: ${student.name}\n\n`;

    if (history.length === 0) {

        message += "Пропусков пока нет.";

    } else {

        history.forEach((lesson, index) => {

            message += `${index + 1}. ${lesson.date}\n`;
            message += `Тема: ${lesson.topic}\n\n`;

        });
    }

    alert(message);
}

// =====================================
// ИСТОРИЯ УРОКОВ
// =====================================

historyList.addEventListener("click", event => {

    const button = event.target.closest("button");

    if (!button) return;

    const lessonId = button.dataset.lesson;
    const action = button.dataset.action;

    const lesson = data.lessons.find(
        item => item.id === lessonId
    );

    if (!lesson) return;

    // РЕДАКТИРОВАНИЕ УРОКА
    if (action === "edit-lesson") {

        currentLessonId = lesson.id;
        editingLessonId = lesson.id;

        dateInput.value = lesson.date;
        topicInput.value = lesson.topic;

        renderAll();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    // УДАЛЕНИЕ УРОКА
    if (action === "delete-lesson") {

        if (!confirm(
            "Удалить этот урок и все его отметки?"
        )) {
            return;
        }

        data.lessons = data.lessons.filter(
            item => item.id !== lessonId
        );

        if (currentLessonId === lessonId) {

            currentLessonId = null;
            topicInput.value = "";
        }

        if (editingLessonId === lessonId) {
            editingLessonId = null;
        }

        saveData();
        renderAll();
    }
});

// =====================================
// ОТОБРАЖЕНИЕ ИСТОРИИ УРОКОВ
// =====================================

function renderHistory() {

    const lessons = [...data.lessons].sort(
        (a, b) => b.date.localeCompare(a.date)
    );

    if (lessons.length === 0) {

        historyList.innerHTML =
            '<p class="empty">Пока уроков нет</p>';

        return;
    }

    historyList.innerHTML = lessons.map(lesson => {

        const present = Object.values(
            lesson.attendance
        ).filter(
            value => value === "present"
        ).length;

        const absent = Object.values(
            lesson.attendance
        ).filter(
            value => value === "absent"
        ).length;

        return `
            <div class="history-item">

                <div>
                    <strong>
                        ${escapeHTML(lesson.date)}
                    </strong>

                    <p>
                        ${escapeHTML(lesson.topic)}
                    </p>

                    <small>
                        Пришли: ${present} ·
                        Отсутствуют: ${absent}
                    </small>
                </div>

                <div class="history-actions">

                    <button
                        class="small-btn"
                        data-action="edit-lesson"
                        data-lesson="${lesson.id}"
                        title="Изменить урок">
                        ✏️
                    </button>

                    <button
                        class="small-btn delete-btn"
                        data-action="delete-lesson"
                        data-lesson="${lesson.id}"
                        title="Удалить урок">
                        🗑️
                    </button>

                </div>
            </div>
        `;

    }).join("");
}

// =====================================
// ОБНОВЛЕНИЕ ВСЕГО ЖУРНАЛА
// =====================================

function renderAll() {

    renderStudents();

    renderStatistics();

    renderHistory();
}

// =====================================
// ЗАПУСК ПРИ ОТКРЫТИИ САЙТА
// =====================================

setToday();

const savedLesson = data.lessons.find(
    lesson => lesson.date === dateInput.value
);

if (savedLesson) {

    currentLessonId = savedLesson.id;

    topicInput.value = savedLesson.topic;
}

renderAll();
// Скачать резервную копию
document.getElementById("exportBackup").addEventListener("click", () => {
    const backup = {
        version: 1,
        date: new Date().toISOString(),
        data: data
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `English-Journal-Backup-${new Date().toISOString().slice(0, 10)}.json`;

    link.click();

    URL.revokeObjectURL(url);
});

// Открыть выбор файла
document.getElementById("importBackupBtn").addEventListener("click", () => {
    document.getElementById("importBackup").click();
});

// Восстановить резервную копию
document.getElementById("importBackup").addEventListener("change", async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (
            backup.version !== 1 ||
            !backup.data ||
            !Array.isArray(backup.data.students) ||
            !Array.isArray(backup.data.lessons)
        ) {
            throw new Error("Неверный формат резервной копии");
        }

        const confirmed = confirm(
            "Восстановить данные из копии? Текущие данные будут заменены."
        );

        if (!confirmed) return;

        data = backup.data;
        currentLessonId = null;
        editingLessonId = null;

        saveData();

        setToday();
        renderAll();

        alert("Резервная копия успешно восстановлена!");

    } catch (error) {
        alert("Не удалось восстановить копию. Проверьте файл.");
    }

    event.target.value = "";
});
