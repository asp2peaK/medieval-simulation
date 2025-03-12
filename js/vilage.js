class Village {
    constructor(name, x, y, terrain) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.terrain = terrain;
        
        // Население
        this.population = Math.floor(Math.random() * 50) + 50; // 50-100 начальное население
        
        // Ресурсы
        this.resources = {
            food: Math.floor(Math.random() * 100) + 200, // 200-300 начальной еды
            wood: Math.floor(Math.random() * 50) + 50, // 50-100 дерева
            stone: Math.floor(Math.random() * 30) + 10, // 10-40 камня
            goods: Math.floor(Math.random() * 20) + 5 // 5-25 товаров
        };
        
        // Здания
        this.buildings = {
            farm: { level: 1, underConstruction: false, constructionProgress: 0 },
            storage: { level: 1, underConstruction: false, constructionProgress: 0 }
        };
        
        // Военные параметры
        this.military = {
            troops: Math.floor(Math.random() * 5) + 1, // 1-5 войска
            training: 0.1, // базовая тренировка
            scouts: [] // список разведчиков
        };
        
        // Технологии
        this.techs = [];
        
        // Отношения с другими деревнями (имя деревни -> значение от -100 до 100)
        this.relations = {};
        
        // Истории
        this.tradeHistory = [];
        this.warHistory = [];
        this.events = []; // События деревни
        
        // Очередь строительства
        this.buildQueue = [];
    }
    
    update(worldTime, globalEvents) {
        // Обновление деревни при каждом тике игры
        
        // Обработка глобальных событий, влияющих на деревню
        this.processGlobalEvents(globalEvents);
        
        // Обновление ресурсов
        this.updateResources(worldTime);
        
        // Обновление населения
        this.updatePopulation(worldTime);
        
        // Обработка строительства
        this.processBuildQueue();
        
        // Обновление разведчиков
        this.updateScouts();
        
        // Обновление технологий
        this.updateTechs();
        
        // Принятие решений ИИ
        this.makeDecisions(worldTime);
    }
    
    processGlobalEvents(events) {
        for (const event of events) {
            switch (event.type) {
                case 'epidemic':
                    if (event.affectedVillages.includes(this)) {
                        // Потеря населения от эпидемии
                        const lossPercentage = Math.min(0.3, event.severity * 0.4); // До 30% потерь
                        const populationLoss = Math.floor(this.population * lossPercentage);
                        this.population -= populationLoss;
                        
                        this.events.push({
                            text: `Эпидемия: потеряно ${populationLoss} жителей`,
                            time: new Date()
                        });
                    }
                    break;
                
                case 'storm':
                    if (event.affectedVillages.includes(this)) {
                        // Повреждение зданий от шторма
                        const resourceLoss = Math.floor(this.resources.wood * event.damage) + 
                                           Math.floor(this.resources.food * event.damage * 0.5);
                        
                        this.resources.wood -= Math.floor(this.resources.wood * event.damage);
                        this.resources.food -= Math.floor(this.resources.food * event.damage * 0.5);
                        
                        this.events.push({
                            text: `Шторм: потеряно ${resourceLoss} ресурсов`,
                            time: new Date()
                        });
                    }
                    break;
                
                case 'bandits':
                    if (event.targetVillage === this) {
                        // Нападение бандитов
                        const defenseStrength = this.military.troops * (1 + this.military.training * 0.2);
                        
                        if (defenseStrength < event.strength * 10) {
                            // Деревня не смогла защититься
                            const resourceLoss = {
                                food: Math.floor(this.resources.food * 0.2),
                                goods: Math.floor(this.resources.goods * 0.3)
                            };
                            
                            this.resources.food -= resourceLoss.food;
                            this.resources.goods -= resourceLoss.goods;
                            
                            this.events.push({
                                text: `Нападение бандитов: украдено ${resourceLoss.food} еды и ${resourceLoss.goods} товаров`,
                                time: new Date()
                            });
                        } else {
                            // Деревня отбилась
                            const troopsLost = Math.floor(Math.random() * 3);
                            this.military.troops -= troopsLost;
                            
                            this.events.push({
                                text: `Бандиты отбиты: потери ${troopsLost} воинов`,
                                time: new Date()
                            });
                        }
                    }
                    break;
            }
        }
    }
    
    updateResources(worldTime) {
        // Базовый прирост еды от ферм
        const farmLevel = this.buildings.farm?.level || 0;
        const baseFood = 0.5 + farmLevel * 0.5;
        
        // Модификаторы сезона
        const seasonModifiers = {
            spring: { food: 1.2, wood: 1.0 },
            summer: { food: 1.5, wood: 1.0 },
            autumn: { food: 1.0, wood: 1.2 },
            winter: { food: 0.3, wood: 0.7 }
        };
        
        // Модификаторы погоды
        const weatherModifiers = {
            clear: { food: 1.2, wood: 1.1 },
            cloudy: { food: 1.0, wood: 1.0 },
            rain: { food: 0.8, wood: 0.7 },
            storm: { food: 0.5, wood: 0.4 },
            snow: { food: 0.3, wood: 0.2 }
        };
        
        // Расчет прироста еды
        const foodProduction = baseFood * 
                             seasonModifiers[worldTime.season].food * 
                             weatherModifiers[worldTime.weather].food;
        
        // Расчет прироста дерева
        const woodLevel = this.terrain === 'forest' ? 2 : (this.terrain === 'plains' ? 1 : 0.5);
        const woodProduction = woodLevel * 
                             seasonModifiers[worldTime.season].wood * 
                             weatherModifiers[worldTime.weather].wood;
        
        // Расчет потребления еды населением
        const foodConsumption = this.population * 0.2;
        
        // Обновление ресурсов
        this.resources.food += (foodProduction - foodConsumption);
        this.resources.wood += woodProduction;
        this.resources.stone += 0.1; // Очень медленный прирост камня
        this.resources.goods += 0.05 * this.population / 50; // Производство товаров зависит от населения
        
        // Предотвращение отрицательных значений
        for (const resource in this.resources) {
            this.resources[resource] = Math.max(0, this.resources[resource]);
        }
    }
    
    updatePopulation(worldTime) {
        // Базовый прирост населения
        const foodPerPerson = this.resources.food / this.population;
        
        // Прирост населения зависит от запасов еды
        let growthRate = 0;
        
        if (foodPerPerson >= 2) {
            // Изобилие еды - быстрый рост
            growthRate = 0.03;
        } else if (foodPerPerson >= 1) {
            // Достаточно еды - умеренный рост
            growthRate = 0.01;
        } else if (foodPerPerson >= 0.5) {
            // Мало еды - очень медленный рост
            growthRate = 0.002;
        } else {
            // Голод - смертность
            growthRate = -0.05;
            
            // Событие голода
            if (foodPerPerson < 0.2) {
                const starvingPeople = Math.floor(this.population * 0.1);
                this.events.push({
                    text: `Голод! ${starvingPeople} человек умерло от недоедания`,
                    time: {...time}
                });
                
                // Уменьшение населения из-за голода
                this.population -= starvingPeople;
                
                // Если слишком серьезный голод, возможна миграция
                if (foodPerPerson < 0.1 && this.population > 30) {
                    const migrants = Math.floor(this.population * 0.2);
                    this.population -= migrants;
                    this.events.push({
                        text: `${migrants} человек покинуло деревню в поисках пищи`,
                        time: {...time}
                    });
                }
            }
            
            // Рост населения при благоприятных условиях
            if (foodPerPerson > 1.5 && this.resources.food > this.population * 2) {
                const newPeople = Math.floor(this.population * 0.02); // 2% рост населения
                this.population += newPeople;
                
                if (newPeople > 0) {
                    this.events.push({
                        text: `Население увеличилось на ${newPeople} человек`,
                        time: {...time}
                    });
                }
            }
        }
        
        // Обновление строительства зданий
        for (const [buildingType, building] of Object.entries(this.buildings)) {
            if (building.underConstruction) {
                // Прогресс строительства зависит от населения и доступных ресурсов
                const progressRate = Math.min(0.1, (this.population / 200) * 0.1);
                building.constructionProgress += progressRate;
                
                // Завершение строительства
                if (building.constructionProgress >= 1) {
                    building.underConstruction = false;
                    building.constructionProgress = 0;
                    building.level += 1;
                    
                    this.events.push({
                        text: `Строительство ${this.getBuildingName(buildingType)} завершено (уровень ${building.level})`,
                        time: {...time}
                    });
                }
            }
        }
        
        // Проверка влияния глобальных событий
        this.processGlobalEvents(globalEvents, time);
        
        // Ограничение истории событий
        if (this.events.length > 20) {
            this.events = this.events.slice(-20);
        }
    }
    
    getBuildingName(buildingType) {
        const buildingNames = {
            'farm': 'Ферма',
            'barracks': 'Казармы',
            'storage': 'Склад',
            'temple': 'Храм',
            'wall': 'Стены',
            'castle': 'Замок'
        };
        
        return buildingNames[buildingType] || buildingType;
    }
    
    processGlobalEvents(globalEvents, time) {
        for (const event of globalEvents) {
            // Проверка, затрагивает ли событие эту деревню
            if (event.type === 'epidemic' && event.affectedVillages.includes(this)) {
                // Эпидемия убивает часть населения
                const casualties = Math.floor(this.population * (0.05 + event.severity * 0.1));
                this.population -= casualties;
                
                this.events.push({
                    text: `Эпидемия унесла жизни ${casualties} человек`,
                    time: {...time}
                });
            }
            
            if (event.type === 'storm' && event.affectedVillages.includes(this)) {
                // Шторм наносит урон зданиям и запасам еды
                this.resources.food *= (1 - event.damage * 0.2);
                this.resources.wood *= (1 - event.damage * 0.1);
                
                // Возможное повреждение зданий
                for (const building of Object.values(this.buildings)) {
                    if (Math.random() < event.damage * 0.5 && building.level > 0) {
                        building.level -= 1;
                        
                        this.events.push({
                            text: `Шторм повредил здание`,
                            time: {...time}
                        });
                        break; // Повреждает только одно здание
                    }
                }
                
                this.events.push({
                    text: `Шторм нанес урон запасам деревни`,
                    time: {...time}
                });
            }
            
            if (event.type === 'bandits' && event.targetVillage === this) {
                // Бандиты атакуют деревню
                const defenseStrength = (this.military.troops * (1 + this.military.training * 0.2)) 
                                    + ((this.buildings.wall?.level || 0) * 5);
                
                const banditStrength = this.population * event.strength * 0.2;
                
                if (defenseStrength > banditStrength) {
                    // Деревня отбила атаку
                    const losses = Math.floor(this.military.troops * 0.2);
                    this.military.troops -= losses;
                    
                    this.events.push({
                        text: `Нападение бандитов отбито. Потери: ${losses} воинов`,
                        time: {...time}
                    });
                } else {
                    // Бандиты побеждают
                    const casualties = Math.floor(this.population * 0.05);
                    this.population -= casualties;
                    
                    // Потеря ресурсов
                    for (const resource of ['food', 'wood', 'stone', 'goods']) {
                        this.resources[resource] *= 0.7; // Потеря 30% ресурсов
                    }
                    
                    this.events.push({
                        text: `Бандиты разграбили деревню! Погибло ${casualties} жителей`,
                        time: {...time}
                    });
                }
            }
        }
    }
    
    startBuilding(buildingType) {
        // Проверка, существует ли уже это здание
        if (!this.buildings[buildingType]) {
            this.buildings[buildingType] = {
                level: 0,
                underConstruction: true,
                constructionProgress: 0
            };
            
            // Расход ресурсов на строительство
            const resourceCost = this.getBuildingCost(buildingType, 1);
            
            for (const [resource, amount] of Object.entries(resourceCost)) {
                this.resources[resource] -= amount;
            }
            
            return true;
        } else if (!this.buildings[buildingType].underConstruction) {
            // Улучшение существующего здания
            const nextLevel = this.buildings[buildingType].level + 1;
            
            // Максимальный уровень зданий
            if (nextLevel > 5) {
                return false;
            }
            
            const resourceCost = this.getBuildingCost(buildingType, nextLevel);
            
            // Проверка наличия достаточного количества ресурсов
            for (const [resource, amount] of Object.entries(resourceCost)) {
                if (this.resources[resource] < amount) {
                    return false;
                }
            }
            
            // Расход ресурсов
            for (const [resource, amount] of Object.entries(resourceCost)) {
                this.resources[resource] -= amount;
            }
            
            this.buildings[buildingType].underConstruction = true;
            this.buildings[buildingType].constructionProgress = 0;
            
            return true;
        }
        
        return false;
    }
    
    getBuildingCost(buildingType, level) {
        // Базовая стоимость зданий
        const baseCosts = {
            'farm': { wood: 10, stone: 5 },
            'barracks': { wood: 20, stone: 15 },
            'storage': { wood: 30, stone: 10 },
            'temple': { wood: 20, stone: 30, goods: 10 },
            'wall': { wood: 10, stone: 40 },
            'castle': { wood: 50, stone: 100, goods: 20 }
        };
        
        // Множитель стоимости в зависимости от уровня
        const multiplier = Math.pow(1.5, level - 1);
        
        const result = {};
        for (const [resource, amount] of Object.entries(baseCosts[buildingType] || {})) {
            result[resource] = Math.floor(amount * multiplier);
        }
        
        return result;
    }
    
    trainTroops(count) {
        // Проверка наличия казарм
        if (!this.buildings.barracks || this.buildings.barracks.level === 0) {
            return false;
        }
        
        // Проверка достаточного населения
        if (this.population < count) {
            return false;
        }
        
        // Проверка достаточного количества ресурсов
        const foodNeeded = count * 10;
        const woodNeeded = count * 5;
        
        if (this.resources.food < foodNeeded || this.resources.wood < woodNeeded) {
            return false;
        }
        
        // Расход ресурсов и обучение войск
        this.resources.food -= foodNeeded;
        this.resources.wood -= woodNeeded;
        this.population -= count;
        this.military.troops += count;
        
        return true;
    }
    
    sendScouts(targetX, targetY) {
        // Проверка наличия людей для отправки разведчиков
        if (this.population < 2) {
            return false;
        }
        
        const scout = {
            id: Date.now(), // Уникальный идентификатор
            sourceVillage: this.name,
            targetX: targetX,
            targetY: targetY,
            x: this.x,
            y: this.y,
            progress: 0,
            returning: false,
            discoveredInfo: null
        };
        
        this.scouts.push(scout);
        this.population -= 1; // Один человек становится разведчиком
        
        return scout;
    }
    
    getTradeRoutes() {
        // Получение информации о торговых путях
        const tradePartners = {};
        
        for (const trade of this.tradeHistory) {
            if (!tradePartners[trade.partner]) {
                tradePartners[trade.partner] = 0;
            }
            tradePartners[trade.partner]++;
        }
        
        // Возвращает массив партнеров с количеством сделок >= 2
        return Object.entries(tradePartners)
            .filter(([_, count]) => count >= 2)
            .map(([partner, _]) => partner);
    }
    
    proposeAlliance(targetVillage) {
        // Проверка текущих отношений
        const currentRelations = this.relations[targetVillage.name] || 0;
        
        if (currentRelations < 20) {
            return false; // Недостаточно хорошие отношения для союза
        }
        
        // Шанс принятия союза зависит от отношений
        const acceptChance = (currentRelations - 20) / 80; // 0% при 20, 100% при 100
        
        if (Math.random() < acceptChance) {
            // Союз принят
            this.relations[targetVillage.name] = Math.min(100, currentRelations + 20);
            targetVillage.relations[this.name] = Math.min(100, (targetVillage.relations[this.name] || 0) + 20);
            
            return true;
        }
        
        // Союз отклонен
        return false;
    }
    
    declareWar(targetVillage) {
        // Установка враждебных отношений
        this.relations[targetVillage.name] = -100;
        targetVillage.relations[this.name] = Math.min(-50, (targetVillage.relations[this.name] || 0) - 30);
        
        return true;
    }
    
    getSnapshot() {
        // Получение снимка состояния деревни для отрисовки
        return {
            name: this.name,
            x: this.x,
            y: this.y,
            population: this.population,
            resources: {...this.resources},
            buildings: {...this.buildings},
            military: {...this.military},
            status: {
                foodShortage: this.resources.food / this.population < 0.5,
                foodSurplus: this.resources.food / this.population > 2,
                recentWar: this.warHistory.length > 0 && 
                           this.warHistory[this.warHistory.length - 1].time.split('-')[2] > Date.now() - 7 * 24 * 60 * 60 * 1000
            }
        };
    }
    
    getSnapshotForArchive() {
        // Упрощенный снимок для архива
        return {
            name: this.name,
            population: this.population,
            resources: {...this.resources},
            buildingCount: Object.keys(this.buildings).length,
            militaryStrength: this.military.troops * (1 + this.military.training * 0.2)
        };
    }
}