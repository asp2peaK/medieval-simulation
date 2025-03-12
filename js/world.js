// Простая реализация шума Перлина для генерации ландшафта
function noise(x, y) {
    // Это очень простая реализация, не настоящий шум Перлина
    return (Math.sin(x * 0.1) + Math.sin(y * 0.1) + Math.sin((x+y) * 0.1)) / 3 + 0.5;
}

class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.map = [];
        this.villages = [];
        this.time = {
            year: 1000,
            month: 1,
            day: 1,
            dayTime: 'morning', // morning, day, evening, night
            season: 'spring',
            weather: 'clear'
        };
        this.events = []; // Глобальные события
        this.archive = {}; // Архив исторических данных
    }

    generateMap() {
        console.log("Генерация карты...");
        // Генерация ландшафта с использованием шума
        for (let y = 0; y < this.height; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.width; x++) {
                // Использование шума для определения высоты
                const elevation = noise(x, y);
                const moisture = noise(x + 1000, y + 1000);
                
                let terrain;
                if (elevation < 0.3) terrain = 'water';
                else if (elevation < 0.6) {
                    if (moisture > 0.6) terrain = 'forest';
                    else terrain = 'plains';
                }
                else if (elevation < 0.8) terrain = 'hills';
                else terrain = 'mountains';
                
                this.map[y][x] = {
                    terrain,
                    resources: this.generateResources(terrain)
                };
            }
        }
        console.log("Карта сгенерирована.");
    }

    generateResources(terrain) {
        // Генерация ресурсов в зависимости от типа местности
        const resources = {
            food: 0,
            wood: 0,
            stone: 0,
            iron: 0
        };

        switch (terrain) {
            case 'forest':
                resources.food = Math.random() * 0.5;
                resources.wood = Math.random() * 0.8 + 0.2;
                break;
            case 'plains':
                resources.food = Math.random() * 0.8 + 0.2;
                resources.wood = Math.random() * 0.3;
                break;
            case 'hills':
                resources.stone = Math.random() * 0.6 + 0.2;
                resources.iron = Math.random() * 0.3;
                break;
            case 'mountains':
                resources.stone = Math.random() * 0.8 + 0.2;
                resources.iron = Math.random() * 0.6 + 0.1;
                break;
        }

        return resources;
    }

    placeVillages(count) {
        console.log(`Размещение ${count} деревень...`);
        // Размещение деревень на подходящей местности
        let placed = 0;
        let attempts = 0;
        const maxAttempts = 1000; // Предотвращение бесконечного цикла
        
        while (placed < count && attempts < maxAttempts) {
            attempts++;
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            // Проверка, подходит ли местность для деревни
            if (this.map[y][x].terrain !== 'water' && 
                this.map[y][x].terrain !== 'mountains') {
                
                // Проверка, нет ли поблизости другой деревни
                let tooClose = false;
                for (const village of this.villages) {
                    const distance = Math.sqrt(
                        Math.pow(village.x - x, 2) + 
                        Math.pow(village.y - y, 2)
                    );
                    if (distance < 5) { // Минимальное расстояние между деревнями
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    const village = new Village(
                        `Деревня ${placed + 1}`,
                        x,
                        y,
                        this.map[y][x].terrain
                    );
                    this.villages.push(village);
                    placed++;
                }
            }
        }
        
        console.log(`Размещено ${placed} деревень.`);
    }

    advanceTime() {
        // Обновление времени, погоды и сезонных циклов
        this.time.day++;
        if (this.time.day > 30) {
            this.time.day = 1;
            this.time.month++;
            if (this.time.month > 12) {
                this.time.month = 1;
                this.time.year++;
            }
        }
        
        // Обновление сезона
        if (this.time.month >= 3 && this.time.month <= 5) {
            this.time.season = 'spring';
        } else if (this.time.month >= 6 && this.time.month <= 8) {
            this.time.season = 'summer';
        } else if (this.time.month >= 9 && this.time.month <= 11) {
            this.time.season = 'autumn';
        } else {
            this.time.season = 'winter';
        }
        
        // Обновление погоды (упрощенно)
        const weatherTypes = ['clear', 'cloudy', 'rain', 'storm', 'snow'];
        const weatherChances = {
            spring: [0.4, 0.3, 0.2, 0.1, 0],
            summer: [0.6, 0.2, 0.1, 0.1, 0],
            autumn: [0.3, 0.3, 0.3, 0.1, 0],
            winter: [0.3, 0.2, 0, 0.1, 0.4]
        };
        
        const rand = Math.random();
        let cumulativeChance = 0;
        for (let i = 0; i < weatherTypes.length; i++) {
            cumulativeChance += weatherChances[this.time.season][i];
            if (rand <= cumulativeChance) {
                this.time.weather = weatherTypes[i];
                break;
            }
        }
        
        // Обновление времени суток
        const dayTimes = ['morning', 'day', 'evening', 'night'];
        const dayTimeIndex = Math.floor((this.time.day % 4));
        this.time.dayTime = dayTimes[dayTimeIndex];
        
        // Запись текущего состояния в архив
        this.updateArchive();
    }

    updateArchive() {
        // Сохранение текущего состояния в архиве
        const dateKey = `${this.time.year}-${this.time.month}-${this.time.day}`;
        this.archive[dateKey] = {
            time: {...this.time},
            events: [...this.events],
            villages: this.villages.map(v => v.getSnapshotForArchive())
        };
        
        // Ограничение размера архива
        const archiveKeys = Object.keys(this.archive);
        if (archiveKeys.length > 365) { // Хранение истории за год
            delete this.archive[archiveKeys[0]];
        }
    }

    generateGlobalEvents() {
        // Генерация случайных глобальных событий в зависимости от сезона, погоды и т.д.
        const events = [];
        
        // Шанс эпидемии увеличивается зимой
        if (this.time.season === 'winter' && Math.random() < 0.05) {
            events.push({
                type: 'epidemic',
                severity: Math.random() * 0.5 + 0.5, // от 0.5 до 1.0
                affectedVillages: this.selectRandomVillages(Math.floor(Math.random() * 3) + 1)
            });
        }
        
        // Миграция животных весной и осенью
        if ((this.time.season === 'spring' || this.time.season === 'autumn') && 
            Math.random() < 0.1) {
            events.push({
                type: 'animalMigration',
                animalType: ['deer', 'boar', 'wolves'][Math.floor(Math.random() * 3)],
                path: this.generateMigrationPath()
            });
        }
        
        // Бандиты чаще появляются летом
        if (this.time.season === 'summer' && Math.random() < 0.08) {
            events.push({
                type: 'bandits',
                targetVillage: this.villages[Math.floor(Math.random() * this.villages.length)],
                strength: Math.random() * 0.7 + 0.3 // от 0.3 до 1.0
            });
        }
        
        // События, связанные с погодой
        if (this.time.weather === 'storm' && Math.random() < 0.2) {
            events.push({
                type: 'storm',
                damage: Math.random() * 0.5 + 0.1, // от 0.1 до 0.6
                affectedVillages: this.selectRandomVillages(Math.floor(Math.random() * 2) + 1)
            });
        }
        
        // Добавление событий в общий список
        this.events.push(...events);
        
        // Ограничение размера списка событий
        if (this.events.length > 20) {
            this.events = this.events.slice(-20);
        }
        
        return events;
    }

    selectRandomVillages(count) {
        // Выбор случайных деревень для событий
        const selectedVillages = [];
        const availableVillages = [...this.villages];
        
        for (let i = 0; i < count && availableVillages.length > 0; i++) {
            const index = Math.floor(Math.random() * availableVillages.length);
            selectedVillages.push(availableVillages[index]);
            availableVillages.splice(index, 1);
        }
        
        return selectedVillages;
    }

    generateMigrationPath() {
        // Генерация пути для миграции животных
        const startX = Math.floor(Math.random() * this.width);
        const startY = Math.floor(Math.random() * this.height);
        const endX = Math.floor(Math.random() * this.width);
        const endY = Math.floor(Math.random() * this.height);
        
        return {
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            progress: 0
        };
    }

    update() {
        // Основной цикл обновления - вызывается через регулярные интервалы
        this.advanceTime();
        const events = this.generateGlobalEvents();
        
        // Обновление всех деревень
        for (const village of this.villages) {
            village.update(this.time, events);
        }
        
        // Обработка взаимодействий между деревнями
        this.processVillageInteractions();
        
        return {
            time: this.time,
            events: events,
            villages: this.villages.map(v => v.getSnapshot())
        };
    }

    processVillageInteractions() {
        // Обработка взаимодействий между деревнями
        for (const village of this.villages) {
            // У каждой деревни есть шанс инициировать торговлю или войну
            if (Math.random() < 0.05) { // 5% шанс при каждом обновлении
                const otherVillage = this.selectPotentialPartner(village);
                if (otherVillage) {
                    if (village.relations[otherVillage.name] >= 0) {
                        // Инициация торговли
                        this.processTrade(village, otherVillage);
                    } else if (village.military.troops > 5 && 
                               village.relations[otherVillage.name] < -50) {
                        // Инициация войны
                        this.processWar(village, otherVillage);
                    }
                }
            }
        }
    }

    selectPotentialPartner(village) {
        // Выбор потенциального партнера для торговли или войны
        const otherVillages = this.villages.filter(v => v !== village);
        if (otherVillages.length === 0) return null;
        
        // Сортировка по расстоянию
        otherVillages.sort((a, b) => {
            const distA = Math.sqrt(
                Math.pow(a.x - village.x, 2) + 
                Math.pow(a.y - village.y, 2)
            );
            const distB = Math.sqrt(
                Math.pow(b.x - village.x, 2) + 
                Math.pow(b.y - village.y, 2)
            );
            return distA - distB;
        });
        
        // Выбор близлежащей деревни
        return otherVillages[0];
    }

    processTrade(village1, village2) {
        // Обработка торговли между двумя деревнями
        const tradeGoods = {
            from: {
                village: village1.name,
                resource: village1.resources.food > 20 ? 'food' : 'goods',
                amount: Math.floor(Math.random() * 5) + 5
            },
            to: {
                village: village2.name,
                resource: village2.resources.wood > 20 ? 'wood' : 'stone',
                amount: Math.floor(Math.random() * 5) + 5
            }
        };
        
        // Выполнение торговли
        village1.resources[tradeGoods.from.resource] -= tradeGoods.from.amount;
        village2.resources[tradeGoods.from.resource] += tradeGoods.from.amount;
        village2.resources[tradeGoods.to.resource] -= tradeGoods.to.amount;
        village1.resources[tradeGoods.to.resource] += tradeGoods.to.amount;
        
        // Обновление отношений
        village1.relations[village2.name] = (village1.relations[village2.name] || 0) + 5;
        village2.relations[village1.name] = (village2.relations[village1.name] || 0) + 5;
        
// Добавление в историю торговли
village1.tradeHistory.push({
    partner: village2.name,
    sent: {
        resource: tradeGoods.from.resource,
        amount: tradeGoods.from.amount
    },
    received: {
        resource: tradeGoods.to.resource,
        amount: tradeGoods.to.amount
    },
    time: `${this.time.year}-${this.time.month}-${this.time.day}`
});

village2.tradeHistory.push({
    partner: village1.name,
    sent: {
        resource: tradeGoods.to.resource,
        amount: tradeGoods.to.amount
    },
    received: {
        resource: tradeGoods.from.resource,
        amount: tradeGoods.from.amount
    },
    time: `${this.time.year}-${this.time.month}-${this.time.day}`
});

// Добавление события торговли
this.events.push({
    type: 'trade',
    parties: [village1, village2],
    goods: tradeGoods,
    time: {...this.time}
});
}

processWar(attacker, defender) {
// Обработка войны между двумя деревнями

// Расчет сил
const attackerStrength = attacker.military.troops * (1 + attacker.military.training * 0.2);
const defenderStrength = defender.military.troops * (1 + defender.military.training * 0.2)
    + (defender.buildings.wall?.level || 0) * 5;  // Бонус от стен

const attackerRoll = attackerStrength * (Math.random() * 0.5 + 0.75);  // от 75% до 125% силы
const defenderRoll = defenderStrength * (Math.random() * 0.5 + 0.75);

// Определение победителя
let winner, loser;
if (attackerRoll > defenderRoll) {
    winner = attacker;
    loser = defender;
} else {
    winner = defender;
    loser = attacker;
}

// Расчет потерь
const winnerLosses = Math.floor(Math.random() * winner.military.troops * 0.3);
const loserLosses = Math.floor(Math.random() * loser.military.troops * 0.6 + loser.military.troops * 0.2);

winner.military.troops -= winnerLosses;
loser.military.troops -= loserLosses;

// Если атакующий победил, он забирает ресурсы
if (winner === attacker) {
    // Грабеж ресурсов (до 30% от имеющихся)
    for (const resource of ['food', 'wood', 'stone', 'goods']) {
        const lootAmount = Math.floor(loser.resources[resource] * (Math.random() * 0.3));
        loser.resources[resource] -= lootAmount;
        winner.resources[resource] += lootAmount;
    }
}

// Ухудшение отношений
attacker.relations[defender.name] = Math.max(-100, (attacker.relations[defender.name] || 0) - 30);
defender.relations[attacker.name] = Math.max(-100, (defender.relations[attacker.name] || 0) - 30);

// Добавление события войны
this.events.push({
    type: 'war',
    attacker: attacker,
    defender: defender,
    winner: winner,
    attackerLosses: winnerLosses,
    defenderLosses: loserLosses,
    time: {...this.time}
});

// Добавление в историю войн обеих деревень
attacker.warHistory.push({
    opponent: defender.name,
    isAttacker: true,
    victory: winner === attacker,
    losses: attacker === winner ? winnerLosses : loserLosses,
    loot: winner === attacker ? 'Добыча получена' : 'Нет',
    time: `${this.time.year}-${this.time.month}-${this.time.day}`
});

defender.warHistory.push({
    opponent: attacker.name,
    isAttacker: false,
    victory: winner === defender,
    losses: defender === winner ? winnerLosses : loserLosses,
    loot: winner === defender ? 'Нет' : 'Деревня разграблена',
    time: `${this.time.year}-${this.time.month}-${this.time.day}`
});

// Добавление событий в историю деревень
attacker.events.push({
    text: `Война с ${defender.name}: ${winner === attacker ? 'Победа' : 'Поражение'}, потери: ${attacker === winner ? winnerLosses : loserLosses} воинов`,
    time: {...this.time}
});

defender.events.push({
    text: `Нападение от ${attacker.name}: ${winner === defender ? 'Отбито' : 'Поражение'}, потери: ${defender === winner ? winnerLosses : loserLosses} воинов`,
    time: {...this.time}
});
}

getVillageByName(name) {
return this.villages.find(v => v.name === name);
}

getTerrainAt(x, y) {
if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
    return 'outOfBounds';
}
return this.map[y][x].terrain;
}
}