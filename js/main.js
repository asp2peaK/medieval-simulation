// Глобальные переменные
let world = null;
let renderer = null;
let gameSpeed = 1;
let isPaused = false;
let gameLoop = null;
let selectedVillage = null;

// Инициализация игры
function initGame() {
    console.log("Инициализация игры...");
    
    // Создание мира
    world = new World(100, 100); // Размер мира 100x100
    world.generateMap();
    world.placeVillages(10); // 10 деревень
    
    // Создание рендерера
    const canvas = document.getElementById('world-map');
    renderer = new Renderer(canvas, world);
    
    // Инициализация событий
    initEvents();
    
    // Запуск игрового цикла
    startGameLoop();
    
    console.log("Игра инициализирована!");
}

// Игровой цикл
function startGameLoop() {
    const baseInterval = 5000; // 5 секунд для скорости x1
    
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    
    if (!isPaused) {
        gameLoop = setInterval(() => {
            updateGame();
        }, baseInterval / gameSpeed);
    }
}

// Обновление игры
function updateGame() {
    const updateData = world.update();
    
    // Обновление UI
    updateTimeDisplay(updateData.time);
    updateEventsDisplay(updateData.events);
    
    // Перерисовка мира
    renderer.render();
    
    // Обновление модального окна, если открыто
    if (selectedVillage) {
        updateVillageModal(selectedVillage);
    }
}

// Обновление отображения времени
function updateTimeDisplay(time) {
    document.getElementById('year').textContent = time.year;
    document.getElementById('month').textContent = String(time.month).padStart(2, '0');
    document.getElementById('day').textContent = String(time.day).padStart(2, '0');
    
    const dayTimeText = {
        'morning': 'Утро',
        'day': 'День',
        'evening': 'Вечер',
        'night': 'Ночь'
    };
    
    const seasonText = {
        'spring': 'Весна',
        'summer': 'Лето',
        'autumn': 'Осень',
        'winter': 'Зима'
    };
    
    const weatherText = {
        'clear': 'Ясно',
        'cloudy': 'Облачно',
        'rain': 'Дождь',
        'storm': 'Шторм',
        'snow': 'Снег'
    };
    
    document.getElementById('day-time').textContent = dayTimeText[time.dayTime];
    document.getElementById('season').textContent = seasonText[time.season];
    document.getElementById('weather').textContent = weatherText[time.weather];
}

// Обновление отображения событий
function updateEventsDisplay(events) {
    const eventsContainer = document.getElementById('global-events');
    
    // Добавление новых событий
    events.forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event-item');
        
        // Определение типа события
        switch (event.type) {
            case 'epidemic':
                eventElement.classList.add('event-epidemic');
                eventElement.textContent = `Эпидемия в ${event.affectedVillages.map(v => v.name).join(', ')}`;
                break;
            case 'animalMigration':
                eventElement.classList.add('event-migration');
                eventElement.textContent = `Миграция ${event.animalType === 'deer' ? 'оленей' : 
                                           event.animalType === 'boar' ? 'кабанов' : 'волков'}`;
                break;
            case 'bandits':
                eventElement.classList.add('event-war');
                eventElement.textContent = `Нападение бандитов на ${event.targetVillage.name}`;
                break;
            case 'storm':
                eventElement.classList.add('event-migration');  // Используем тот же стиль для простоты
                eventElement.textContent = `Шторм повредил ${event.affectedVillages.map(v => v.name).join(', ')}`;
                break;
            default:
                eventElement.textContent = `Событие: ${event.type}`;
        }
        
        eventsContainer.prepend(eventElement);
        
        // Анимация исчезновения
        setTimeout(() => {
            eventElement.classList.add('fade-out');
        }, 5000);
        
        // Удаление элемента после анимации
        setTimeout(() => {
            eventsContainer.removeChild(eventElement);
        }, 7000);
    });
    
    // Ограничение количества событий в контейнере
    while (eventsContainer.children.length > 10) {
        eventsContainer.removeChild(eventsContainer.lastChild);
    }
}

// Открытие модального окна деревни
function openVillageModal(village) {
    selectedVillage = village;
    
    const modal = document.getElementById('village-modal');
    modal.classList.remove('hidden');
    modal.classList.add('visible');
    
    updateVillageModal(village);
}

// Обновление содержимого модального окна
function updateVillageModal(village) {
    document.getElementById('village-name').textContent = village.name;
    document.getElementById('village-population').textContent = village.population;
    document.getElementById('village-food').textContent = Math.floor(village.resources.food);
    document.getElementById('village-wood').textContent = Math.floor(village.resources.wood);
    document.getElementById('village-stone').textContent = Math.floor(village.resources.stone);
    document.getElementById('village-goods').textContent = Math.floor(village.resources.goods);
    
    // Здания
    const buildingsContainer = document.getElementById('buildings-list');
    buildingsContainer.innerHTML = '';
    
    for (const [buildingType, building] of Object.entries(village.buildings)) {
        const buildingElement = document.createElement('div');
        buildingElement.classList.add('building-item');
        
        const buildingNames = {
            'farm': 'Ферма',
            'barracks': 'Казармы',
            'storage': 'Склад',
            'temple': 'Храм',
            'wall': 'Стены',
            'castle': 'Замок'
        };
        
        buildingElement.innerHTML = `
            <span>${buildingNames[buildingType]}</span>
            <span>Уровень: ${building.level}</span>
            ${building.underConstruction ? 
                `<span>Строительство: ${Math.floor(building.constructionProgress * 100)}%</span>` : ''}
        `;
        
        buildingsContainer.appendChild(buildingElement);
    }
    
    // Отношения
    updateRelationsList('allies-list', village.relations, 50, 100);  // Союзники (50-100)
    updateRelationsList('enemies-list', village.relations, -100, -10);  // Враги (-100 to -10)
    updateRelationsList('neutral-list', village.relations, -9, 49);  // Нейтральные (-9 to 49)
    
    // События деревни
    const villageEventsContainer = document.getElementById('village-events');
    villageEventsContainer.innerHTML = '';
    
    village.events.slice(0, 5).forEach(event => {
        const eventElement = document.createElement('div');
        eventElement.classList.add('village-event');
        eventElement.textContent = event.text;
        villageEventsContainer.appendChild(eventElement);
    });
}

// Обновление списка отношений
function updateRelationsList(containerId, relations, minValue, maxValue) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    for (const [villageName, value] of Object.entries(relations)) {
        if (value >= minValue && value <= maxValue) {
            const relationElement = document.createElement('div');
            relationElement.textContent = `${villageName}: ${value}`;
            container.appendChild(relationElement);
        }
    }
    
    if (container.children.length === 0) {
        container.textContent = 'Нет';
    }
}

// Инициализация обработчиков событий
function initEvents() {
    // Кнопки скорости
    document.getElementById('speed-1').addEventListener('click', () => {
        gameSpeed = 1;
        startGameLoop();
    });
    
    document.getElementById('speed-2').addEventListener('click', () => {
        gameSpeed = 2;
        startGameLoop();
    });
    
    document.getElementById('speed-3').addEventListener('click', () => {
        gameSpeed = 5;
        startGameLoop();
    });
    
    document.getElementById('pause').addEventListener('click', () => {
        isPaused = !isPaused;
        
        if (isPaused) {
            clearInterval(gameLoop);
            document.getElementById('pause').textContent = 'Продолжить';
        } else {
            startGameLoop();
            document.getElementById('pause').textContent = 'Пауза';
        }
    });
    
    // Закрытие модального окна
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('village-modal').classList.remove('visible');
        document.getElementById('village-modal').classList.add('hidden');
        selectedVillage = null;
    });
    
    // Обработчик для архива
    document.getElementById('view-archive').addEventListener('click', viewArchive);
    
    // Обработчики для карты мира находятся в renderer.js
}

// Просмотр архива
function viewArchive() {
    const year = document.getElementById('archive-year').value;
    const month = document.getElementById('archive-month').value;
    const day = document.getElementById('archive-day').value;
    
    const dateKey = `${year}-${month}-${day}`;
    const archiveData = world.archive[dateKey];
    
    const archiveContent = document.getElementById('archive-content');
    
    if (archiveData) {
        archiveContent.innerHTML = `
            <h4>События на ${day}.${month}.${year}</h4>
            <div class="archive-events">
                ${archiveData.events.map(e => `<div>${e.type}: ${e.description || JSON.stringify(e)}</div>`).join('')}
            </div>
            <h4>Состояние деревень</h4>
            <div class="archive-villages">
                ${archiveData.villages.map(v => `
                    <div>
                        <strong>${v.name}</strong>: 
                        Население: ${v.population}, 
                        Еда: ${Math.floor(v.resources.food)}, 
                        Дерево: ${Math.floor(v.resources.wood)}, 
                        Камень: ${Math.floor(v.resources.stone)}
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        archiveContent.innerHTML = `<div>Нет данных для выбранной даты</div>`;
    }
    
    // Показать архив
    document.getElementById('archive-section').classList.remove('hidden');
}

// Заполнение выпадающих списков для архива
function populateArchiveDropdowns() {
    const yearSelect = document.getElementById('archive-year');
    yearSelect.innerHTML = '';
    
    for (let year = 1000; year <= 1200; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    const monthSelect = document.getElementById('archive-month');
    monthSelect.innerHTML = '';
    
    for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    }
    
    const daySelect = document.getElementById('archive-day');
    daySelect.innerHTML = '';
    
    for (let day = 1; day <= 30; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = day;
        daySelect.appendChild(option);
    }
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    populateArchiveDropdowns();
    initGame();
});