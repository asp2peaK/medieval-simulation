class Renderer {
    constructor(canvas, world) {
        this.canvas = canvas;
        this.world = world;
        this.ctx = canvas.getContext('2d');
        
        // Настройка размеров канваса
        this.resizeCanvas();
        
        // Смещение и масштаб для просмотра карты
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1;
        
        // Отслеживание состояния мыши
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Инициализация обработчиков событий
        this.initEventListeners();
        
        // Цветовая карта для различных типов местности
        this.terrainColors = {
            'water': '#4287f5',
            'plains': '#91e086',
            'forest': '#216e1a',
            'hills': '#ad965b',
            'mountains': '#857562'
        };
        
        // Информация о наведении мыши
        this.hoveredVillage = null;
        
        // Анимации
        this.animations = {