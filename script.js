"use strict";

// ==================================================================
// Инициализация холста и глобальных переменных
// ==================================================================

// Получаем элемент canvas и его контекст для отрисовки
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// Размер холста подгоняем под размер окна браузера
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Глобальные переменные для настройки спавна объектов
// Эти значения можно изменить через меню настроек перед запуском игры
let spawnMultiplier = 0.1;
let asteroidSpawnFrequency = 0.02;      // Астероиды
let smallEnemySpawnFrequency = 0.005;     // Маленькие враги
let mediumEnemySpawnFrequency = 0.005;    // Средние враги
let largeEnemySpawnFrequency = 0.005;     // Большие враги

// Определяем, является ли устройство мобильным, используя userAgent
let isMobile = /Mobi|Android/i.test(navigator.userAgent);
const joystickContainer = document.getElementById('joystickContainer');
const joystickThumb = document.getElementById('joystickThumb');
// Если устройство мобильное – показываем джойстик и кнопки действий
if (isMobile) {
  joystickContainer.style.display = 'block';
  document.getElementById('actionControls').style.display = 'block';
}

// Переменные для управления виртуальным джойстиком
let joystickActive = false;    // Флаг, что джойстик сейчас используется
let joystickTouchId = null;    // Сохраняем идентификатор касания для отслеживания
let joystickVector = { x: 0, y: 0 }; // Вектор направления (значения от -1 до 1)

// ==================================================================
// Обработчики событий для виртуального джойстика
// ==================================================================

// При начале касания на джойстике
joystickContainer.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Предотвращаем дефолтное поведение (например, прокрутку)
  let touch = e.changedTouches[0];
  joystickActive = true;
  joystickTouchId = touch.identifier;
});

// При перемещении касания по джойстику
joystickContainer.addEventListener('touchmove', (e) => {
  e.preventDefault();
  // Ищем касание, соответствующее нашему джойстику
  let touch = Array.from(e.changedTouches).find(t => t.identifier === joystickTouchId);
  if (touch) {
    // Определяем центр контейнера
    const rect = joystickContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Вычисляем смещение касания относительно центра
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const maxDistance = rect.width / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Если касание выходит за пределы джойстика, ограничиваем смещение
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }
    // Нормализуем смещение в диапазоне [-1, 1]
    joystickVector.x = dx / maxDistance;
    joystickVector.y = dy / maxDistance;
    // Обновляем положение "thumb", чтобы оно двигалось за пальцем
    joystickThumb.style.left = (dx + rect.width / 2 - joystickThumb.offsetWidth / 2) + "px";
    joystickThumb.style.top = (dy + rect.height / 2 - joystickThumb.offsetHeight / 2) + "px";
  }
});

// При завершении касания на джойстике
joystickContainer.addEventListener('touchend', (e) => {
  e.preventDefault();
  let touch = Array.from(e.changedTouches).find(t => t.identifier === joystickTouchId);
  if (touch) {
    // Сбрасываем флаг и вектор, возвращаем "thumb" в центр
    joystickActive = false;
    joystickVector.x = 0;
    joystickVector.y = 0;
    joystickThumb.style.left = (joystickContainer.offsetWidth / 2 - joystickThumb.offsetWidth / 2) + "px";
    joystickThumb.style.top = (joystickContainer.offsetHeight / 2 - joystickThumb.offsetHeight / 2) + "px";
  }
});

// ==================================================================
// Обработка ввода с клавиатуры для ПК
// ==================================================================

// Объект keys хранит состояние нажатых клавиш
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ==================================================================
// Функция для обновления значений слайдеров в меню настроек
// ==================================================================
function updateSliderDisplay(inputId, spanId) {
  const input = document.getElementById(inputId);
  const span = document.getElementById(spanId);
  input.addEventListener('input', () => {
    span.textContent = input.value;
  });
}
updateSliderDisplay('asteroidFrequency', 'asteroidFreqVal');
updateSliderDisplay('smallEnemyFrequency', 'smallEnemyFreqVal');
updateSliderDisplay('mediumEnemyFrequency', 'mediumEnemyFreqVal');
updateSliderDisplay('largeEnemyFrequency', 'largeEnemyFreqVal');

// ==================================================================
// Обработка кнопок действий для мобильных устройств
// ==================================================================

// Кнопка лазера
document.getElementById('btnLaser').addEventListener('touchstart', (e) => {
  e.preventDefault();
  fireLaser();
});
// Кнопка ракеты
document.getElementById('btnRocket').addEventListener('touchstart', (e) => {
  e.preventDefault();
  fireRocket();
});
// Кнопка буста
document.getElementById('btnBoost').addEventListener('touchstart', (e) => {
  e.preventDefault();
  activateBoost();
});

// Функция, создающая лазерную пулю
function fireLaser() {
  if (player.shootCooldown <= 0 && player.ammo > 0) {
    const bulletX = player.x + Math.sin(player.angle) * (player.height / 2);
    const bulletY = player.y - Math.cos(player.angle) * (player.height / 2);
    bullets.push(new Bullet(bulletX, bulletY, player.angle, "yellow"));
    player.shootCooldown = 15;
    player.ammo--;
  }
}

// Функция, запускающая ракету
function fireRocket() {
  if (player.rocketShootCooldown <= 0 && player.rocketAmmo > 0) {
    const rocketX = player.x + Math.sin(player.angle) * (player.height / 2);
    const rocketY = player.y - Math.cos(player.angle) * (player.height / 2);
    rockets.push(new Rocket(rocketX, rocketY, player.angle));
    player.rocketShootCooldown = 60;
    player.rocketAmmo--;
  }
}

// Функция для активации ускорения (буст)
function activateBoost() {
  // Увеличиваем скорость игрока в 2 раза на 3 секунды
  player.speed *= 2;
  setTimeout(() => { player.speed /= 2; }, 3000);
}

// ==================================================================
// Классы игровых объектов
// ==================================================================

// Класс Player представляет корабль игрока
class Player {
  constructor() {
    // Инициализируем позицию в центре экрана и задаем базовые параметры
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.width = 40;
    this.height = 40;
    this.speed = 5;
    this.angle = 0;
    this.shootCooldown = 0;
    this.hp = 100;
    this.maxHP = 100;
    this.shield = 100;
    this.maxShield = 100;
    this.ammo = 20;
    this.maxAmmo = 20;
    this.ammoRegenCounter = 0;
    this.ammoRegenInterval = 60;
    this.rocketAmmo = 3;
    this.maxRocketAmmo = 3;
    this.rocketShootCooldown = 0;
    this.rocketRegenCounter = 0;
    this.rocketRegenInterval = 300;
  }
  // Метод draw отрисовывает корабль, включая эффект двигателя и щита
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // Если включены клавиши или активен джойстик – рисуем "огонь" двигателя
    if ((keys['ArrowUp'] || keys['KeyW']) || joystickActive) {
      let flameLength = 10 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(-this.width / 4, this.height / 2);
      ctx.lineTo(0, this.height / 2 + flameLength);
      ctx.lineTo(this.width / 4, this.height / 2);
      let grad = ctx.createLinearGradient(0, this.height / 2, 0, this.height / 2 + flameLength);
      grad.addColorStop(0, "orange");
      grad.addColorStop(1, "red");
      ctx.fillStyle = grad;
      ctx.fill();
    }
    // Отрисовка самого корабля (треугольник)
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
    // Если щит активен, рисуем его с градиентом
    if (this.shield > 0) {
      ctx.beginPath();
      const shieldRadius = Math.max(this.width, this.height) * 1.2;
      ctx.arc(0, 0, shieldRadius, 0, 2 * Math.PI);
      const shieldGrad = ctx.createRadialGradient(0, 0, shieldRadius * 0.5, 0, 0, shieldRadius);
      shieldGrad.addColorStop(0, "rgba(0,150,255,0.3)");
      shieldGrad.addColorStop(1, "rgba(0,150,255,0)");
      ctx.fillStyle = shieldGrad;
      ctx.fill();
    }
    ctx.restore();
  }
  // Метод update обновляет позицию, проверяет границы, снижает кулдауны и восстанавливает щит/боеприпасы
  update() {
    if (this.x < this.width / 2) this.x = this.width / 2;
    if (this.x > canvas.width - this.width / 2) this.x = canvas.width - this.width / 2;
    if (this.y < this.height / 2) this.y = this.height / 2;
    if (this.y > canvas.height - this.height / 2) this.y = canvas.height - this.height / 2;
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.rocketShootCooldown > 0) this.rocketShootCooldown--;
    if (this.shield < this.maxShield) {
      this.shield += 0.1;
      if (this.shield > this.maxShield) this.shield = this.maxShield;
    }
    if (this.ammo < this.maxAmmo) {
      this.ammoRegenCounter++;
      if (this.ammoRegenCounter >= this.ammoRegenInterval) {
        this.ammo++;
        this.ammoRegenCounter = 0;
      }
    }
    if (this.rocketAmmo < this.maxRocketAmmo) {
      this.rocketRegenCounter++;
      if (this.rocketRegenCounter >= this.rocketRegenInterval) {
        this.rocketAmmo++;
        this.rocketRegenCounter = 0;
      }
    }
  }
}

// Класс Asteroid представляет астероид, движущийся по экрану
class Asteroid {
  constructor() {
    // Случайный радиус, положение и скорость для разнообразия
    this.radius = getRandom(15, 40);
    this.x = getRandom(this.radius, canvas.width - this.radius);
    this.y = getRandom(this.radius, canvas.height - this.radius);
    this.speed = getRandom(1, 3);
    this.angle = getRandom(0, 2 * Math.PI);
  }
  update() {
    this.x += this.speed * Math.cos(this.angle);
    this.y += this.speed * Math.sin(this.angle);
  }
  isOffScreen() {
    // Возвращает true, если астероид вышел за пределы экрана
    return (this.x < -this.radius || this.x > canvas.width + this.radius ||
            this.y < -this.radius || this.y > canvas.height + this.radius);
  }
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = "gray";
    ctx.fill();
    ctx.restore();
  }
}

// Класс Bullet представляет лазерную пулю
class Bullet {
  constructor(x, y, angle, color = "yellow") {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 10;
    this.radius = 5;
    this.color = color;
  }
  update() {
    this.x += this.speed * Math.sin(this.angle);
    this.y -= this.speed * Math.cos(this.angle);
  }
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
  isOffScreen() {
    return (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height);
  }
}

// Класс Rocket представляет ракету с самонаведением
class Rocket {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 8;
    this.radius = 7;
    this.lifetime = 120; // Количество кадров, после которого ракета взрывается
    this.age = 0;
    this.explosionRadius = 50;
    this.explosionDamage = 50;
  }
  update() {
    this.x += this.speed * Math.sin(this.angle);
    this.y -= this.speed * Math.cos(this.angle);
    this.age++;
    // Самонаведение: ищем ближайшего врага и плавно корректируем угол
    let closest = null;
    let closestDist = Infinity;
    for (let enemy of enemies) {
      let dx = enemy.x - this.x;
      let dy = enemy.y - this.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }
    if (closest) {
      let targetAngle = Math.atan2(closest.x - this.x, -(closest.y - this.y));
      this.angle += 0.1 * (targetAngle - this.angle);
    }
  }
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = "orange";
    ctx.fill();
    ctx.restore();
  }
  isOffScreen() {
    return (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height);
  }
}

// Класс Enemy представляет врагов (различных типов: small, medium, large)
class Enemy {
  constructor(type) {
    this.type = type;
    // Задаем характеристики в зависимости от типа врага
    if (type === "small") {
      this.width = 20;
      this.height = 20;
      this.speed = getRandom(4, 6);
      this.hp = 20;
      this.shootCooldown = 60;
      this.bulletDamage = 5;
    } else if (type === "medium") {
      this.width = 30;
      this.height = 30;
      this.speed = getRandom(2, 4);
      this.hp = 50;
      this.shootCooldown = 90;
      this.bulletDamage = 10;
    } else if (type === "large") {
      this.width = 50;
      this.height = 50;
      this.speed = getRandom(1, 3);
      this.hp = 100;
      this.shield = 50;
      this.maxShield = 50;
      this.shootCooldown = 120;
      this.bulletDamage = 20;
    }
    // Определяем случайное появление врага на краю экрана
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      this.x = getRandom(0, canvas.width);
      this.y = -50;
    } else if (edge === 1) {
      this.x = canvas.width + 50;
      this.y = getRandom(0, canvas.height);
    } else if (edge === 2) {
      this.x = getRandom(0, canvas.width);
      this.y = canvas.height + 50;
    } else {
      this.x = -50;
      this.y = getRandom(0, canvas.height);
    }
    this.angle = 0;
    this.currentShootCooldown = this.shootCooldown;
  }
  update() {
    // Рассчитываем направление движения врага к игроку
    let dx = player.x - this.x;
    let dy = player.y - this.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    this.angle = Math.atan2(dx, -dy);
    this.x += this.speed * Math.sin(this.angle);
    this.y -= this.speed * Math.cos(this.angle);
    // Обработка стрельбы врага
    if (this.currentShootCooldown > 0) {
      this.currentShootCooldown--;
    } else {
      if (distance < 500) {
        enemyBullets.push(new Bullet(
          this.x + Math.sin(this.angle) * (this.height / 2),
          this.y - Math.cos(this.angle) * (this.height / 2),
          this.angle,
          "red"
        ));
        this.currentShootCooldown = this.shootCooldown;
      }
    }
    // Для больших врагов реализована регенерация щита
    if (this.type === "large" && this.shield < this.maxShield) {
      this.shield += 0.05;
      if (this.shield > this.maxShield) this.shield = this.maxShield;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // Отрисовываем врага в зависимости от его типа
    if (this.type === "small") {
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.closePath();
      ctx.fillStyle = "pink";
      ctx.fill();
    } else if (this.type === "medium") {
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.closePath();
      ctx.fillStyle = "orange";
      ctx.fill();
    } else if (this.type === "large") {
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.closePath();
      ctx.fillStyle = "red";
      ctx.fill();
      // Рисуем щит для больших врагов с радиальным градиентом
      ctx.beginPath();
      let shieldRadius = Math.max(this.width, this.height) * 1.5;
      ctx.arc(0, 0, shieldRadius, 0, 2 * Math.PI);
      let grad = ctx.createRadialGradient(0, 0, shieldRadius * 0.5, 0, 0, shieldRadius);
      grad.addColorStop(0, "rgba(0,255,255,0.3)");
      grad.addColorStop(1, "rgba(0,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }
  isOffScreen() {
    // Если враг вышел далеко за пределы экрана, возвращаем true
    return (this.x < -100 || this.x > canvas.width + 100 ||
            this.y < -100 || this.y > canvas.height + 100);
  }
}

// Класс AllyBase представляет космическую базу союзников, которая пролетает через экран
class AllyBase {
  constructor() {
    this.width = 60;
    this.height = 40;
    this.x = -this.width;
    this.y = getRandom(50, canvas.height - 50);
    this.speed = 2;
    this.shootCooldown = 120;
    this.currentShootCooldown = this.shootCooldown;
  }
  update() {
    // База движется горизонтально
    this.x += this.speed;
    if (this.currentShootCooldown > 0) {
      this.currentShootCooldown--;
    } else {
      // Находим ближайшего врага, чтобы произвести выстрел
      let target = null;
      let minDist = Infinity;
      for (let enemy of enemies) {
        let dx = enemy.x - this.x;
        let dy = enemy.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          target = enemy;
        }
      }
      if (target) {
        let angle = Math.atan2(target.x - this.x, -(target.y - this.y));
        allyBullets.push(new Bullet(
          this.x + this.width,
          this.y,
          angle,
          "green"
        ));
        this.currentShootCooldown = this.shootCooldown;
      }
    }
  }
  draw() {
    ctx.save();
    ctx.fillStyle = "lightblue";
    ctx.fillRect(this.x, this.y - this.height / 2, this.width, this.height);
    ctx.restore();
  }
  isOffScreen() {
    return this.x > canvas.width + this.width;
  }
}

// Класс Explosion отвечает за визуальный эффект взрыва
class Explosion {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.lifetime = 30; // Количество кадров, в течение которых эффект виден
  }
  update() {
    this.lifetime--;
  }
  draw() {
    ctx.save();
    let grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.3, this.x, this.y, this.radius);
    grad.addColorStop(0, "rgba(255,165,0,0.8)");
    grad.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
}

// ==================================================================
// Вспомогательные функции
// ==================================================================

// Функция getRandom возвращает случайное число между min и max
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

// Функция checkCollision проверяет столкновение двух кругов по их центрам и радиусам
function checkCollision(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (r1 + r2);
}

// ==================================================================
// Функция rocketExplosion – обрабатывает взрыв ракеты
// ==================================================================
function rocketExplosion(rocket) {
  // Создаем визуальный эффект взрыва
  explosions.push(new Explosion(rocket.x, rocket.y, rocket.explosionRadius));
  // Проверяем, попали ли астероиды в радиус взрыва
  for (let i = asteroids.length - 1; i >= 0; i--) {
    let asteroid = asteroids[i];
    let dx = rocket.x - asteroid.x;
    let dy = rocket.y - asteroid.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < rocket.explosionRadius + asteroid.radius) {
      asteroids.splice(i, 1);
    }
  }
  // Аналогично, наносим урон врагам, находящимся в зоне взрыва
  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    let dx = rocket.x - enemy.x;
    let dy = rocket.y - enemy.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < rocket.explosionRadius + enemy.width / 2) {
      let damage = rocket.explosionDamage;
      if (enemy.type === "large" && enemy.shield > 0) {
        enemy.shield -= damage;
        if (enemy.shield < 0) {
          enemy.hp += enemy.shield;
          enemy.shield = 0;
        }
      } else {
        enemy.hp -= damage;
      }
      if (enemy.hp <= 0) {
        explosions.push(new Explosion(enemy.x, enemy.y, enemy.width));
        enemies.splice(i, 1);
      }
    }
  }
}

// ==================================================================
// Глобальные массивы для хранения игровых объектов
// ==================================================================
const player = new Player();
const asteroids = [];
const bullets = [];
const rockets = [];
const enemies = [];
const enemyBullets = [];
const explosions = [];
const allyBases = [];
const allyBullets = [];
let gameOver = false;

// Начальная генерация астероидов (создаем 5 случайных астероидов)
for (let i = 0; i < 5; i++) {
  asteroids.push(new Asteroid());
}

// ==================================================================
// Функция handleInput – обрабатывает ввод с клавиатуры (ПК)
// ==================================================================
function handleInput() {
  let currentSpeed = player.speed;
  // Если нажата клавиша Shift, увеличиваем скорость в 2 раза
  if (keys['ShiftLeft'] || keys['ShiftRight']) {
    currentSpeed *= 2;
  }
  if (keys['ArrowUp'] || keys['KeyW']) {
    player.x += currentSpeed * Math.sin(player.angle);
    player.y -= currentSpeed * Math.cos(player.angle);
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    player.x -= currentSpeed * Math.sin(player.angle);
    player.y += currentSpeed * Math.cos(player.angle);
  }
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.angle -= 0.1;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.angle += 0.1;
  }
  // Стрельба лазером
  if (keys['Space'] && player.shootCooldown <= 0 && player.ammo > 0) {
    const bulletX = player.x + Math.sin(player.angle) * (player.height / 2);
    const bulletY = player.y - Math.cos(player.angle) * (player.height / 2);
    bullets.push(new Bullet(bulletX, bulletY, player.angle, "yellow"));
    player.shootCooldown = 15;
    player.ammo--;
  }
  // Стрельба ракетой
  if (keys['Enter'] && player.rocketShootCooldown <= 0 && player.rocketAmmo > 0) {
    const rocketX = player.x + Math.sin(player.angle) * (player.height / 2);
    const rocketY = player.y - Math.cos(player.angle) * (player.height / 2);
    rockets.push(new Rocket(rocketX, rocketY, player.angle));
    player.rocketShootCooldown = 60;
    player.rocketAmmo--;
  }
}

// ==================================================================
// Функции для отрисовки интерфейса (полосы здоровья, щита и боеприпасов)
// ==================================================================
function drawHealthBar() {
  const barWidth = 200, barHeight = 20, x = 20, y = 20;
  ctx.fillStyle = "red";
  ctx.fillRect(x, y, barWidth, barHeight);
  const healthWidth = (player.hp / player.maxHP) * barWidth;
  ctx.fillStyle = "green";
  ctx.fillRect(x, y, healthWidth, barHeight);
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, barWidth, barHeight);
}
function drawShieldBar() {
  const barWidth = 200, barHeight = 20, x = 20, y = 50;
  ctx.fillStyle = "black";
  ctx.fillRect(x, y, barWidth, barHeight);
  const shieldWidth = (player.shield / player.maxShield) * barWidth;
  ctx.fillStyle = "blue";
  ctx.fillRect(x, y, shieldWidth, barHeight);
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, barWidth, barHeight);
}
function drawAmmo() {
  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.fillText("Ammo: " + player.ammo + "/" + player.maxAmmo, 20, 90);
  ctx.fillText("Rockets: " + player.rocketAmmo + "/" + player.maxRocketAmmo, 20, 120);
}

// ==================================================================
// Главный игровой цикл gameLoop – обновляет и отрисовывает все объекты игры
// ==================================================================
function gameLoop() {
  // Очищаем экран перед отрисовкой следующего кадра
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gameOver) {
    ctx.fillStyle = "white";
    ctx.font = "48px sans-serif";
    ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
    return;
  }
  
  // Если устройство мобильное и джойстик активен, используем его данные для управления
  if (isMobile && joystickActive) {
    const moveAngle = Math.atan2(joystickVector.x, -joystickVector.y);
    player.angle = moveAngle;
    player.x += joystickVector.x * player.speed;
    player.y += joystickVector.y * player.speed;
  } else {
    // Иначе обрабатываем ввод с клавиатуры (ПК)
    handleInput();
  }
  
  // Обновляем и отрисовываем игрока и интерфейс
  player.update();
  player.draw();
  drawHealthBar();
  drawShieldBar();
  drawAmmo();
  
  // Обновляем астероиды и проверяем столкновения с игроком
  for (let i = asteroids.length - 1; i >= 0; i--) {
    let asteroid = asteroids[i];
    asteroid.update();
    asteroid.draw();
    if (asteroid.isOffScreen()) {
      asteroids.splice(i, 1);
      continue;
    }
    if (checkCollision(asteroid.x, asteroid.y, asteroid.radius, player.x, player.y, player.width / 2)) {
      if (player.shield > 0) {
        player.shield -= 10;
        if (player.shield < 0) {
          player.hp += player.shield;
          player.shield = 0;
        }
      } else {
        player.hp -= 10;
      }
      asteroids.splice(i, 1);
      if (player.hp <= 0) gameOver = true;
    }
  }
  
  // Обновляем пули игрока и проверяем их столкновения с астероидами
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    bullet.update();
    bullet.draw();
    if (bullet.isOffScreen()) {
      bullets.splice(i, 1);
      continue;
    }
    for (let j = asteroids.length - 1; j >= 0; j--) {
      let asteroid = asteroids[j];
      if (checkCollision(bullet.x, bullet.y, bullet.radius, asteroid.x, asteroid.y, asteroid.radius)) {
        bullets.splice(i, 1);
        asteroids.splice(j, 1);
        break;
      }
    }
  }
  
  // Обновляем ракеты игрока и проверяем столкновения с астероидами и врагами
  for (let i = rockets.length - 1; i >= 0; i--) {
    let rocket = rockets[i];
    rocket.update();
    rocket.draw();
    if (rocket.isOffScreen()) {
      rockets.splice(i, 1);
      continue;
    }
    let exploded = false;
    for (let j = asteroids.length - 1; j >= 0; j--) {
      let asteroid = asteroids[j];
      if (checkCollision(rocket.x, rocket.y, rocket.radius, asteroid.x, asteroid.y, asteroid.radius)) {
        rocketExplosion(rocket);
        rockets.splice(i, 1);
        exploded = true;
        break;
      }
    }
    if (exploded) continue;
    for (let j = enemies.length - 1; j >= 0; j--) {
      let enemy = enemies[j];
      if (checkCollision(rocket.x, rocket.y, rocket.radius, enemy.x, enemy.y, enemy.width / 2)) {
        rocketExplosion(rocket);
        rockets.splice(i, 1);
        exploded = true;
        break;
      }
    }
    if (exploded) continue;
    if (rocket.age >= rocket.lifetime) {
      rocketExplosion(rocket);
      rockets.splice(i, 1);
      continue;
    }
  }
  
  // Обновляем врагов, проверяем их столкновения с астероидами, игроком и пулями
  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    enemy.update();
    enemy.draw();
    if (enemy.isOffScreen()) {
      enemies.splice(i, 1);
      continue;
    }
    for (let j = asteroids.length - 1; j >= 0; j--) {
      let asteroid = asteroids[j];
      if (checkCollision(enemy.x, enemy.y, enemy.width / 2, asteroid.x, asteroid.y, asteroid.radius)) {
        if (enemy.type === "large" && enemy.shield > 0) {
          enemy.shield -= 10;
          if (enemy.shield < 0) {
            enemy.hp += enemy.shield;
            enemy.shield = 0;
          }
        } else {
          enemy.hp -= 10;
        }
        asteroids.splice(j, 1);
        if (enemy.hp <= 0) {
          explosions.push(new Explosion(enemy.x, enemy.y, enemy.width));
          enemies.splice(i, 1);
          break;
        }
      }
    }
    if (checkCollision(enemy.x, enemy.y, enemy.width / 2, player.x, player.y, player.width / 2)) {
      if (player.shield > 0) {
        player.shield -= 10;
        if (player.shield < 0) {
          player.hp += player.shield;
          player.shield = 0;
        }
      } else {
        player.hp -= 10;
      }
      explosions.push(new Explosion(enemy.x, enemy.y, enemy.width));
      enemies.splice(i, 1);
      if (player.hp <= 0) gameOver = true;
      continue;
    }
    for (let j = bullets.length - 1; j >= 0; j--) {
      let bullet = bullets[j];
      if (checkCollision(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.width / 2)) {
        let laserDamage = 10;
        if (enemy.type === "large" && enemy.shield > 0) {
          enemy.shield -= laserDamage;
          if (enemy.shield < 0) {
            enemy.hp += enemy.shield;
            enemy.shield = 0;
          }
        } else {
          enemy.hp -= laserDamage;
        }
        bullets.splice(j, 1);
        if (enemy.hp <= 0) {
          explosions.push(new Explosion(enemy.x, enemy.y, enemy.width));
          enemies.splice(i, 1);
        }
        break;
      }
    }
  }
  
  // Обновляем пули врагов и проверяем их столкновения с астероидами и игроком
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let eBullet = enemyBullets[i];
    eBullet.update();
    eBullet.draw();
    if (eBullet.isOffScreen()) {
      enemyBullets.splice(i, 1);
      continue;
    }
    for (let j = asteroids.length - 1; j >= 0; j--) {
      let asteroid = asteroids[j];
      if (checkCollision(eBullet.x, eBullet.y, eBullet.radius, asteroid.x, asteroid.y, asteroid.radius)) {
        asteroids.splice(j, 1);
        enemyBullets.splice(i, 1);
        break;
      }
    }
    if (checkCollision(eBullet.x, eBullet.y, eBullet.radius, player.x, player.y, player.width / 2)) {
      if (player.shield > 0) {
        player.shield -= 10;
        if (player.shield < 0) {
          player.hp += player.shield;
          player.shield = 0;
        }
      } else {
        player.hp -= 10;
      }
      enemyBullets.splice(i, 1);
      if (player.hp <= 0) gameOver = true;
    }
  }
  
  // Обновляем пули баз союзников
  for (let i = allyBullets.length - 1; i >= 0; i--) {
    let aBullet = allyBullets[i];
    aBullet.update();
    aBullet.draw();
    if (aBullet.isOffScreen()) {
      allyBullets.splice(i, 1);
      continue;
    }
    for (let j = enemies.length - 1; j >= 0; j--) {
      let enemy = enemies[j];
      if (checkCollision(aBullet.x, aBullet.y, aBullet.radius, enemy.x, enemy.y, enemy.width / 2)) {
        let damage = 15;
        if (enemy.type === "large" && enemy.shield > 0) {
          enemy.shield -= damage;
          if (enemy.shield < 0) {
            enemy.hp += enemy.shield;
            enemy.shield = 0;
          }
        } else {
          enemy.hp -= damage;
        }
        allyBullets.splice(i, 1);
        if (enemy.hp <= 0) {
          explosions.push(new Explosion(enemy.x, enemy.y, enemy.width));
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }
  
  // Обновляем базы союзников: если игрок сталкивается с базой, восстанавливаем его здоровье
  for (let i = allyBases.length - 1; i >= 0; i--) {
    let base = allyBases[i];
    base.update();
    base.draw();
    if (base.isOffScreen()) {
      allyBases.splice(i, 1);
      continue;
    }
    if (checkCollision(base.x + base.width / 2, base.y, base.width / 2, player.x, player.y, player.width / 2)) {
      player.hp += 20;
      if (player.hp > player.maxHP) player.hp = player.maxHP;
      allyBases.splice(i, 1);
    }
  }
  
  // Обновляем эффекты взрывов и удаляем завершившиеся
  for (let i = explosions.length - 1; i >= 0; i--) {
    let explosion = explosions[i];
    explosion.update();
    explosion.draw();
    if (explosion.lifetime <= 0) {
      explosions.splice(i, 1);
    }
  }
  
  // Спавним новые объекты, используя настройки, заданные через меню
  if (Math.random() < asteroidSpawnFrequency * spawnMultiplier) {
    asteroids.push(new Asteroid());
  }
  if (Math.random() < smallEnemySpawnFrequency * spawnMultiplier) {
    enemies.push(new Enemy("small"));
  }
  if (Math.random() < mediumEnemySpawnFrequency * spawnMultiplier) {
    enemies.push(new Enemy("medium"));
  }
  if (Math.random() < largeEnemySpawnFrequency * spawnMultiplier) {
    enemies.push(new Enemy("large"));
  }
  
  // Запрашиваем следующий кадр анимации
  requestAnimationFrame(gameLoop);
}

// ==================================================================
// Обработчики событий для запуска игры и открытия настроек
// ==================================================================

//  "Начать игру" -> считываnm настройки ->  игра
document.getElementById('startButton').addEventListener('click', () => {
  asteroidSpawnFrequency = parseFloat(document.getElementById('asteroidFrequency').value);
  smallEnemySpawnFrequency = parseFloat(document.getElementById('smallEnemyFrequency').value);
  mediumEnemySpawnFrequency = parseFloat(document.getElementById('mediumEnemyFrequency').value);
  largeEnemySpawnFrequency = parseFloat(document.getElementById('largeEnemyFrequency').value);
  // скрыть меню настроек
  document.getElementById('settingsMenu').style.display = 'none';
  // показать кнопку настроек
  //document.getElementById('settingsButton').style.display = 'block';
  gameLoop();
});

// Кнопка настроек – открывает меню настроек во время игры
document.getElementById('settingsButton').addEventListener('click', () => {
  document.getElementById('settingsMenu').style.display = 'block';
});
