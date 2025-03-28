"use strict";



const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// глобальные переменные (урон, хилл, хп)
let healAlly = 20; // хил от союзников
// глобальные переменные (спавн объектов),изменяются в меню настроек

let spawnMultiplier = 0.1;
let asteroidSpawnFrequency = 0.02;      // астероиды
let smallEnemySpawnFrequency = 0.005;     // маленькие враги
let mediumEnemySpawnFrequency = 0.005;    // средние враги
let largeEnemySpawnFrequency = 0.005;     // большие враги




/* проверка на мобильное устройство по userAgent.
если мобилка, то показываем джойстик и кнопки управления */
let isMobile = /Mobi|Android/i.test(navigator.userAgent);
const joystickContainer = document.getElementById('joystickContainer');
const joystickThumb = document.getElementById('joystickThumb');

if (isMobile) {
  joystickContainer.style.display = 'block'; // показываем джойстик
  document.getElementById('actionControls').style.display = 'block'; // показываем кнопки
}

/* переменные для управления джойстиком */
let joystickActive = false; // активен ли сейчас джойстик (сначала false)
let joystickTouchId = null; // id текущего касания пальцем
let joystickVector = { x: 0, y: 0 }; // направление джойстика (-1 до 1 по обеим осям)

/* обработка событий джойстика */

/* когда касаемся экрана, активируем джойстик и запоминаем касание */
joystickContainer.addEventListener('touchstart', (e) => {
  e.preventDefault(); // чтобы экран не прокручивался
  let touch = e.changedTouches[0];
  joystickActive = true;
  joystickTouchId = touch.identifier;
});

/* когда двигаем палец по джойстику, считаем куда и как далеко мы его сдвинули */
joystickContainer.addEventListener('touchmove', (e) => {
  e.preventDefault();
  // ищем нужное касание по сохранённому id
  let touch = Array.from(e.changedTouches).find(t => t.identifier === joystickTouchId);
  if (touch) {
    // получаем центр джойстика
    const rect = joystickContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // вычисляем смещение от центра джойстика
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const maxDistance = rect.width / 2; // максимальное расстояние от центра
    const distance = Math.sqrt(dx * dx + dy * dy);

    // если палец ушёл слишком далеко, ограничиваем движение джойстика
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    // считаем нормализованный вектор направления (-1 до 1)
    joystickVector.x = dx / maxDistance;
    joystickVector.y = dy / maxDistance;

    // сдвигаем кружок (thumb) за пальцем
    joystickThumb.style.left = (dx + rect.width / 2 - joystickThumb.offsetWidth / 2) + "px";
    joystickThumb.style.top = (dy + rect.height / 2 - joystickThumb.offsetHeight / 2) + "px";
  }
});

/* когда убираем палец, сбрасываем джойстик обратно в центр */
joystickContainer.addEventListener('touchend', (e) => {
  e.preventDefault();
  let touch = Array.from(e.changedTouches).find(t => t.identifier === joystickTouchId);
  if (touch) {
    joystickActive = false; // джойстик не используется
    joystickVector.x = 0;
    joystickVector.y = 0;
    // возвращаем thumb в центр
    joystickThumb.style.left = (joystickContainer.offsetWidth / 2 - joystickThumb.offsetWidth / 2) + "px";
    joystickThumb.style.top = (joystickContainer.offsetHeight / 2 - joystickThumb.offsetHeight / 2) + "px";
  }
});

/* использование джойстика:
если джойстик активен, то в главном цикле берём значения joystickVector и двигаем корабль в эту сторону.
чем сильнее от центра джойстик, тем быстрее движется корабль. угол движения вычисляется через Math.atan2 из joystickVector. */












// обработка ввода с клавиатуры для пк
// объект keys хранит состояние всех нажатых клавиш
const keys = {};
window.addEventListener('keydown', (e) => { 
  keys[e.code] = true; // при нажатии помечаем клавишу как нажатую
});
window.addEventListener('keyup', (e) => { 
  keys[e.code] = false; // при отпускании клавиши снимаем отметку
});

/* функция для обновления значений слайдеров в меню настроек
   берет элемент input и элемент span, чтобы отображать текущее значение слайдера */
function updateSliderDisplay(inputId, spanId) {
  const input = document.getElementById(inputId);
  const span = document.getElementById(spanId);
  input.addEventListener('input', () => {
    span.textContent = input.value; // обновляем текстовое отображение значения слайдера
  });
}
// обновляем значения для всех слайдеров настроек
updateSliderDisplay('asteroidFrequency', 'asteroidFreqVal');
updateSliderDisplay('smallEnemyFrequency', 'smallEnemyFreqVal');
updateSliderDisplay('mediumEnemyFrequency', 'mediumEnemyFreqVal');
updateSliderDisplay('largeEnemyFrequency', 'largeEnemyFreqVal');

/* обработка кнопок действий для мобильных устройств
   кнопки для лазера, ракеты и буста */
   
// кнопка лазера: при касании вызывается функция fireLaser
document.getElementById('btnLaser').addEventListener('touchstart', (e) => {
  e.preventDefault(); // предотвращаем дефолтное поведение браузера
  fireLaser();
});

// кнопка ракеты: при касании вызывается функция fireRocket
document.getElementById('btnRocket').addEventListener('touchstart', (e) => {
  e.preventDefault();
  fireRocket();
});

// кнопка буста: при касании вызывается функция activateBoost
document.getElementById('btnBoost').addEventListener('touchstart', (e) => {
  e.preventDefault();
  activateBoost();
});

/* функция, создающая лазерную пулю
   если кулдаун лазера равен нулю и есть боеприпасы, создается новый объект пули и уменьшается запас */
function fireLaser() {
  if (player.shootCooldown <= 0 && player.ammo > 0) {
    const bulletX = player.x + Math.sin(player.angle) * (player.height / 2);
    const bulletY = player.y - Math.cos(player.angle) * (player.height / 2);
    bullets.push(new Bullet(bulletX, bulletY, player.angle, "yellow"));
    player.shootCooldown = 15; // устанавливаем кулдаун после выстрела
    player.ammo--; // уменьшаем количество боеприпасов
  }
}

/* функция, запускающая ракету
   если кулдаун ракеты равен нулю и есть боеприпасы для ракеты, создается новый объект ракеты */
function fireRocket() {
  if (player.rocketShootCooldown <= 0 && player.rocketAmmo > 0) {
    const rocketX = player.x + Math.sin(player.angle) * (player.height / 2);
    const rocketY = player.y - Math.cos(player.angle) * (player.height / 2);
    rockets.push(new Rocket(rocketX, rocketY, player.angle));
    player.rocketShootCooldown = 60; // устанавливаем кулдаун для ракет
    player.rocketAmmo--; // уменьшаем запас ракет
  }
}

/* функция для активации ускорения (буст)
   увеличивает скорость игрока в 2 раза на 3 секунды */
function activateBoost() {
  player.speed *= 2; // увеличиваем скорость
  setTimeout(() => { 
    player.speed /= 2; // возвращаем скорость обратно через 3 секунды
  }, 3000);
}


// ==================================================================
// классы игровых объектов
// ==================================================================

// класс player – представляет корабль игрока
class Player {
    constructor() {
      // координата x – позиция по горизонтали (начинаем в центре холста)
      this.x = canvas.width / 2;
      // координата y – позиция по вертикали (начинаем в центре холста)
      this.y = canvas.height / 2;
      // ширина корабля
      this.width = 40;
      // высота корабля
      this.height = 40;
      // базовая скорость корабля
      this.speed = 5;
      // угол поворота корабля (в радианах, 0 -> вверх)
      this.angle = 0;
      // кулдаун стрельбы лазером (отсчет кадров)
      this.shootCooldown = 0;
      // текущее здоровье корабля
      this.hp = 100;
      // макс. здоровье
      this.maxHP = 100;
      // текущий щит
      this.shield = 100;
      // макс. щит
      this.maxShield = 100;
      // количество лазерных патронов
      this.ammo = 20;
      // макс. патронов
      this.maxAmmo = 20;
      // счетчик для регенерации патронов
      this.ammoRegenCounter = 0;
      // интервал, через который восстанавливается один патрон
      this.ammoRegenInterval = 60;
      // количество ракет
      this.rocketAmmo = 5;
      // макс. количество ракет
      this.maxRocketAmmo = 5;
      // кулдаун для стрельбы ракетой
      this.rocketShootCooldown = 0;
      // счетчик для регенерации ракет
      this.rocketRegenCounter = 0;
      // интервал для восстановления ракеты
      this.rocketRegenInterval = 300;
    }
    // метод draw – рисует корабль, двигатель и щит
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      // если нажаты клавиши движения или джойстик активен, рисуем "огонь" двигателя
      if ((keys['ArrowUp'] || keys['KeyW']) || joystickActive) {
        let flameLength = 10 + Math.random() * 20; // длина пламени
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
      // рисуем сам корабль как треугольник
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.closePath();
      ctx.fillStyle = "white";
      ctx.fill();
      // если щит есть, рисуем его радиальным градиентом вокруг корабля
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
    // метод update – обновляет позицию, кулдауны, щит и боеприпасы
    update() {
      // ограничиваем движение так, чтобы корабль не выходил за экран
      if (this.x < this.width / 2) this.x = this.width / 2;
      if (this.x > canvas.width - this.width / 2) this.x = canvas.width - this.width / 2;
      if (this.y < this.height / 2) this.y = this.height / 2;
      if (this.y > canvas.height - this.height / 2) this.y = canvas.height - this.height / 2;
      // уменьшаем кулдаун лазера
      if (this.shootCooldown > 0) this.shootCooldown--;
      // уменьшаем кулдаун ракеты
      if (this.rocketShootCooldown > 0) this.rocketShootCooldown--;
      // восстанавливаем щит, если он меньше максимума
      if (this.shield < this.maxShield) {
        this.shield += 0.02;
        if (this.shield > this.maxShield) this.shield = this.maxShield;
      }
      // восстанавливаем патроны
      if (this.ammo < this.maxAmmo) {
        this.ammoRegenCounter++;
        if (this.ammoRegenCounter >= this.ammoRegenInterval) {
          this.ammo++;
          this.ammoRegenCounter = 0;
        }
      }
      // восстанавливаем ракеты
      if (this.rocketAmmo < this.maxRocketAmmo) {
        this.rocketRegenCounter++;
        if (this.rocketRegenCounter >= this.rocketRegenInterval) {
          this.rocketAmmo++;
          this.rocketRegenCounter = 0;
        }
      }
    }
  }
  
  // класс asteroid –  астероид, движущийся по экрану
  class Asteroid {
    constructor() {
      // случайный радиус астероида 
      this.radius = getRandom(15, 40);
      // случайная позиция по x, учитывая радиус
      this.x = getRandom(this.radius, canvas.width - this.radius);
      // случайная позиция по y
      this.y = getRandom(this.radius, canvas.height - this.radius);
      // скорость астероида
      this.speed = getRandom(1, 7);
      // угол направления движения
      this.angle = getRandom(0, 2 * Math.PI);
    }
    // метод update – обновляет позицию астероида
    update() {
      this.x += this.speed * Math.cos(this.angle);
      this.y += this.speed * Math.sin(this.angle);
    }
    //  isOffScreen – проверяет, вышел ли астероид за пределы экрана
    isOffScreen() {
      return (this.x < -this.radius || this.x > canvas.width + this.radius ||
              this.y < -this.radius || this.y > canvas.height + this.radius);
    }
    //  draw – рисует астероид как круг
    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
      ctx.fillStyle = "gray";
      ctx.fill();
      ctx.restore();
    }
  }
  
  // класс bullet – лазенрная пуля
  class Bullet {
    constructor(x, y, angle, color = "yellow") {
      // координата x пули
      this.x = x;
      // координата y пули
      this.y = y;
      // угол полёта пули
      this.angle = angle;
      // скорость пули
      this.speed = 10;
      // радиус пули (для столкновений)
      this.radius = 5;
      // цвет пули
      this.color = color;
    }
    //  update – обновляет положение пули
    update() {
      this.x += this.speed * Math.sin(this.angle);
      this.y -= this.speed * Math.cos(this.angle);
    }
    //  draw – рисует пулю на экране
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
  
  class Rocket {
    constructor(x, y, angle) {
      // начальные координаты ракеты
      this.x = x;
      this.y = y;
      
      this.angle = angle; // начальный угол движения ракеты
      
      this.speed = 8; // скорость ракеты
      
      this.radius = 7;
      this.lifetime = 120;
      this.age = 0;
      this.explosionRadius = 50;
      this.explosionDamage = 50;
    }
    //  update – обновляет положение ракеты и выполняет самонаведение
    update() {
      this.x += this.speed * Math.sin(this.angle);
      this.y -= this.speed * Math.cos(this.angle);
      this.age++;
      // ищем ближайшего врага для самонаведения
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
      // если нашли врага палвно корректируем угол ракеты
      if (closest) {
        let targetAngle = Math.atan2(closest.x - this.x, -(closest.y - this.y));
        this.angle += 0.1 * (targetAngle - this.angle);
      }
    }
    //  draw – рисует ракету
    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
      ctx.fillStyle = "orange";
      ctx.fill();
      ctx.restore();
    }
    //  isOffScreen – проверяет, вышла ли ракета за экран
    isOffScreen() {
      return (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height);
    }
  }
  
  //  enemy –  враги (разных типов: small, medium, large)
  class Enemy {
    constructor(type) {
      // тип врага (строка: "small", "medium", "large")
      this.type = type;
      // в зависимости от типа задаем размеры, скорость, здоровье и другие параметры
      if (type === "small") {
        this.width = 20;       // ширина маленького врага
        this.height = 20;      // высота маленького врага
        this.speed = getRandom(4, 6); // скорость
        this.hp = 20;          // здоровье
        this.shootCooldown = 60; // кулдаун стрельбы
        this.bulletDamage = 5; // урон от пули
      } else if (type === "medium") {
        this.width = 30;       // ширина среднего врага
        this.height = 30;      // высота среднего врага
        this.speed = getRandom(2, 4);
        this.hp = 50;
        this.shootCooldown = 90;
        this.bulletDamage = 10;
      } else if (type === "large") {
        this.width = 50;       // ширина большого врага
        this.height = 50;      // высота большого врага
        this.speed = getRandom(1, 3);
        this.hp = 100;
        this.shield = 20;      // начальный щит
        this.maxShield = 20;   // максимальный щит
        this.shootCooldown = 120;
        this.bulletDamage = 20;
      }
      // случайное появление врага на краю экрана
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
      // начальный угол движения врага
      this.angle = 0;
      // счетчик кулдауна стрельбы, начинается с максимального значения
      this.currentShootCooldown = this.shootCooldown;
    }
    //  update – обновляет позицию врага, его угол и стрельбу
    update() {
      // вычисляем разницу между позицией игрока и врага
      let dx = player.x - this.x;
      let dy = player.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      // устанавливаем угол движения врага , чтобы он стремился к игроку
      this.angle = Math.atan2(dx, -dy);
      // двигаем врага в направлении к игроку
      this.x += this.speed * Math.sin(this.angle);
      this.y -= this.speed * Math.cos(this.angle);
      // если кулдаун стрельбы еще не завершился, уменьшаем его
      if (this.currentShootCooldown > 0) {
        this.currentShootCooldown--;
      } else {
        // если игрок близко, враг стреляет
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
      // для больших врагов, если щит ниже максимума, восстанавливаем его
      if (this.type === "large" && this.shield < this.maxShield) {
        this.shield += 0.05;
        if (this.shield > this.maxShield) this.shield = this.maxShield;
      }
    }
    // метод draw – рисует врага
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      // рисуем врага в зависимости от типа
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
        // для больших врагов рисуем щит с радиальным градиентом
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
    //  isOffScreen – возвращает true, если враг далеко за пределами экрана
    isOffScreen() {
      return (this.x < -100 || this.x > canvas.width + 100 ||
              this.y < -100 || this.y > canvas.height + 100);
    }
  }
  
  //  allybase – представляет базу союзников, которая пролетает через экран
  class AllyBase {
    constructor() {
      // ширина базы
      this.width = 60;
      // высота базы
      this.height = 40;
      // стартовая позиция по x – база появляется слева за экраном
      this.x = -this.width;
      // случайная позиция по y
      this.y = getRandom(50, canvas.height - 50);
      // скорость движения базы
      this.speed = 2;
      // кулдаун стрельбы базы
      this.shootCooldown = 60;
      // текущий кулдаун, начинаем со значения shootCooldown
      this.currentShootCooldown = this.shootCooldown;
    }
    // метод update – обновляет позицию базы и, если пора, выпускает пулю
    update() {
      // база движется вправо
      this.x += this.speed;
      if (this.currentShootCooldown > 0) {
        this.currentShootCooldown--;
      } else {
        // находим ближайшего врага, чтобы база могла по нему выстрелить
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
          // вычисляем угол выстрела к цели
          let angle = Math.atan2(target.x - this.x, -(target.y - this.y));
          allyBullets.push(new Bullet(
            this.x + this.width, // пуля появляется справа от базы
            this.y,
            angle,
            "green"
          ));
          // сбрасываем кулдаун
          this.currentShootCooldown = this.shootCooldown;
        }
      }
    }
    //  draw – рисует базу союзников как прямоугольник
    draw() {
      ctx.save();
      ctx.fillStyle = "lightblue";
      ctx.fillRect(this.x, this.y - this.height / 2, this.width, this.height);
      ctx.restore();
    }
    //  isOffScreen – возвращает true, если база вышла за правую границу экрана
    isOffScreen() {
      return this.x > canvas.width + this.width;
    }
  }
  
  //  explosion – отвечает за эффект взрыва
  class Explosion {
    constructor(x, y, radius) {
      // координаты центра взрыва
      this.x = x;
      this.y = y;
      // радиус взрыва
      this.radius = radius;
      // время жизни эффекта (в кадрах)
      this.lifetime = 30;
    }
    //  update – уменьшает время жизни эффекта
    update() {
      this.lifetime--;
    }
    //  draw – рисует взрыв с радиальным градиентом
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
  

// вспомогательные функции

//  getRandom – возвращает случайное число между min и max
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  //  checkCollision – проверяет столкновение двух кругов
  // x1, y1, r1 – координаты и радиус первого круга
  // x2, y2, r2 – координаты и радиус второго круга
  //  возвращает true, если расстояние между центрами меньше суммы радиусов
  function checkCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2; // разница по оси x
    const dy = y1 - y2; // разница по оси y
    const distance = Math.sqrt(dx * dx + dy * dy); // расстояние между центрами
    return distance < (r1 + r2); // если расстояние меньше суммы радиусов, значит столкновение
  }
  
  //  rocketExplosion – обрабатывает взрыв ракеты
  //принимает объект ракеты
  function rocketExplosion(rocket) {
    // создаем эффект взрыва, добавляя новый объект explosion в массив explosions
    explosions.push(new Explosion(rocket.x, rocket.y, rocket.explosionRadius));
    
    // проверяем, попал ли какой-нибудь астероид в зону взрыва
    for (let i = asteroids.length - 1; i >= 0; i--) {
      let asteroid = asteroids[i];
      let dx = rocket.x - asteroid.x; // разница по x между ракетой и астероидом
      let dy = rocket.y - asteroid.y; // разница по y
      let distance = Math.sqrt(dx * dx + dy * dy); // расстояние между ними
      // если расстояние меньше суммы радиуса взрыва ракеты и радиуса астероида, удаляем астероид
      if (distance < rocket.explosionRadius + asteroid.radius) {
        asteroids.splice(i, 1);
      }
    }
    
    //  проверяем врагов, находящихся в зоне взрыва
    for (let i = enemies.length - 1; i >= 0; i--) {
      let enemy = enemies[i];
      let dx = rocket.x - enemy.x;
      let dy = rocket.y - enemy.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      // если враг находится в зоне взрыва 
      if (distance < rocket.explosionRadius + enemy.width / 2) {
        let damage = rocket.explosionDamage; // урон от взрыва
        // если враг большой и у него еще есть щит, сначала щит поглощает урон
        if (enemy.type === "large" && enemy.shield > 0) {
          enemy.shield -= damage;
          if (enemy.shield < 0) {
            // если щит оказался меньше 0, уменьшаем здоровье врага на разницу
            enemy.hp += enemy.shield;
            enemy.shield = 0;
          }
        } else {
          // если щита нет или враг не большой, наносим прямой урон здоровью
          enemy.hp -= damage;
        }
        // если здоровье врага упало до 0 или меньше, удаляем его и создаем эффект взрыва
        if (enemy.hp <= 0) {
          explosions.push(new Explosion(enemy.x, enemy.y, enemy.width));
          enemies.splice(i, 1);
        }
      }
    }
  }
  


// глобальные массивы для хранения игровых объектов

const player = new Player(); // игрок (экземпляр класса player)

const asteroids = [];
const bullets = [];
const rockets = [];
const enemies = [];
const enemyBullets = [];
const explosions = [];
const allyBases = [];
const allyBullets = [];
let gameOver = false; // флаг, который указывает, закончилась ли игра (false - игра идет)


// начальная генерация астероидов
// добавляем их в массив asteroids
for (let i = 0; i < 5; i++) {
  asteroids.push(new Asteroid());
}


//  handleInput – обрабатывает ввод с клавиатуры (компы)

function handleInput() {
    
    let currentSpeed = player.speed;
    
    // буст
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      currentSpeed *= 2;
    }
    
    // вперед
    if (keys['ArrowUp'] || keys['KeyW']) {
      // смещаем x по синусу угла и y по косинусу угла (учитывая направление)
      player.x += currentSpeed * Math.sin(player.angle);
      player.y -= currentSpeed * Math.cos(player.angle);
    }
    
    //  назад
    if (keys['ArrowDown'] || keys['KeyS']) {
      player.x -= currentSpeed * Math.sin(player.angle);
      player.y += currentSpeed * Math.cos(player.angle);
    }
    
    // вращение влево
    if (keys['ArrowLeft'] || keys['KeyA']) {
      player.angle -= 0.1; // уменьшаем угол
    }
    
    // вращение вправо
    if (keys['ArrowRight'] || keys['KeyD']) {
      player.angle += 0.1; // увеличиваем угол
    }
    
    // обработка стрельбы лазером:
    if (keys['Space'] && player.shootCooldown <= 0 && player.ammo > 0) {     // если нажата клавиша пробела, кулдаун стрельбы равен 0 и есть патроны

      const bulletX = player.x + Math.sin(player.angle) * (player.height / 2);
      const bulletY = player.y - Math.cos(player.angle) * (player.height / 2);
      bullets.push(new Bullet(bulletX, bulletY, player.angle, "yellow"));
      player.shootCooldown = 15; // задаем кулдаун после выстрела
      player.ammo--; // уменьшаем количество патронов
    }
    
    // обработка стрельбы ракетой:
    if (keys['Enter'] && player.rocketShootCooldown <= 0 && player.rocketAmmo > 0) {    // если нажата клавиша enter, кулдаун ракеты равен 0 и есть ракеты,
      const rocketX = player.x + Math.sin(player.angle) * (player.height / 2);
      const rocketY = player.y - Math.cos(player.angle) * (player.height / 2);
      rockets.push(new Rocket(rocketX, rocketY, player.angle));
      player.rocketShootCooldown = 60; // задаем кулдаун для ракет
      player.rocketAmmo--; // уменьшаем количество ракет
    }
  }
  


// функции для отрисовки интерфейса (полосы здоровья, щита и боеприпасов)

//  drawHealthBar – рисует полосу здоровья
function drawHealthBar() {
    
    const barWidth = 200, barHeight = 20, x = 20, y = 20; // задаем ширину и высоту полосы, а также положение на экране
    // нет здоровья
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, barWidth, barHeight);
    // текущее хп
    const healthWidth = (player.hp / player.maxHP) * barWidth;
    
    ctx.fillStyle = "green";
    ctx.fillRect(x, y, healthWidth, barHeight);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, barWidth, barHeight);
  }
  
  //  drawShieldBar – рисует полосу щита
  function drawShieldBar() {
    const barWidth = 200, barHeight = 20, x = 20, y = 50;
    ctx.fillStyle = "black";
    ctx.fillRect(x, y, barWidth, barHeight);
    
    const shieldWidth = (player.shield / player.maxShield) * barWidth; // текущий щит
    ctx.fillStyle = "blue";
    ctx.fillRect(x, y, shieldWidth, barHeight);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, barWidth, barHeight);
  }
  
  //  drawAmmo –  текст с информацией о патронах и ракетах
  function drawAmmo() {
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    
    ctx.fillText("Ammo: " + player.ammo + "/" + player.maxAmmo, 20, 90); // количество лазерных патронов
    
    ctx.fillText("Rockets: " + player.rocketAmmo + "/" + player.maxRocketAmmo, 20, 120); //  количество ракет
  }
  

// главный игровой цикл gameLoop – обновляет и отрисовывает все объекты игры

function gameLoop() {
    
    ctx.clearRect(0, 0, canvas.width, canvas.height); // очищаем экран перед отрисовкой следующего кадра
  
    
    if (gameOver) {
      ctx.fillStyle = "white";
      ctx.font = "48px sans-serif";
      ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
      return; // если игра окончена, выводим сообщение "game over" и выходим из цикла
    }
    
    // если устройство мобильное и джойстик используется, берем данные с него
    if (isMobile && joystickActive) {
      // вычисляем угол движения по значениям джойстика (atan2 принимает x и y)
      const moveAngle = Math.atan2(joystickVector.x, -joystickVector.y);
      player.angle = moveAngle;
      // двигаем игрока по направлению, заданному джойстиком
      player.x += joystickVector.x * player.speed;
      player.y += joystickVector.y * player.speed;
    } else {
      // если не мобила, то обрабатываем ввод с клавиатуры
      handleInput();
    }
    
    // обновляем состояние игрока и рисуем его
    player.update();
    player.draw();
    
    // рисуем интерфейс
    drawHealthBar();
    drawShieldBar();
    drawAmmo();
    
    // проходим по всем астероидам, обновляем их положение и отрисовываем их
    for (let i = asteroids.length - 1; i >= 0; i--) {
      let asteroid = asteroids[i];
      asteroid.update();
      asteroid.draw();
      
      if (asteroid.isOffScreen()) {  // если астероид вышел за пределы экрана, удаляем его
        asteroids.splice(i, 1);
        continue;
      }
      
      if (checkCollision(asteroid.x, asteroid.y, asteroid.radius, player.x, player.y, player.width / 2)) { // проверяем столкновение астероида с игроком
        // если у игрока есть щит, он уменьшится, иначе уменьшается здоровье
        if (player.shield > 0) {
          player.shield -= 10;
          if (player.shield < 0) {
            player.hp += player.shield;
            player.shield = 0;
          }
        } else {
          player.hp -= 10;
        }
        
        asteroids.splice(i, 1); // удаляем астероид после столкновения
        
        if (player.hp <= 0) gameOver = true; // если здоровье <= 0 -> игра заканчивается
      }
    }
    
    // обновляем пули игрока и проверяем их столкновения с астероидами
    for (let i = bullets.length - 1; i >= 0; i--) {
      let bullet = bullets[i];
      bullet.update();
      bullet.draw();
      
      if (bullet.isOffScreen()) { // если пуля вышла за экран, удаляем ее
        bullets.splice(i, 1);
        continue;
      }
      
      // проверяем столкновение пули с каждым астероидом
      for (let j = asteroids.length - 1; j >= 0; j--) {
        let asteroid = asteroids[j];
        if (checkCollision(bullet.x, bullet.y, bullet.radius, asteroid.x, asteroid.y, asteroid.radius)) {
          bullets.splice(i, 1);
          asteroids.splice(j, 1);
          break;
        }
      }
    }
    
    // обновляем ракеты игрока и проверяем их столкновения
    for (let i = rockets.length - 1; i >= 0; i--) {
      let rocket = rockets[i];
      rocket.update();
      rocket.draw();
      //  ракета вышла за экран
      if (rocket.isOffScreen()) {
        rockets.splice(i, 1);
        continue;
      }
      let exploded = false;
      //  столкновение ракеты с астероидами
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
      //  столкновение ракеты с врагами
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
      // out of age
      if (rocket.age >= rocket.lifetime) {
        rocketExplosion(rocket);
        rockets.splice(i, 1);
        continue;
      }
    }
    
    // обновляем врагов, их столкновения с астероидами, игроком и пулями
    for (let i = enemies.length - 1; i >= 0; i--) {
      let enemy = enemies[i];
      enemy.update();
      enemy.draw();
      
      if (enemy.isOffScreen()) { // если враг вышел за пределы экрана, удаляем его
        enemies.splice(i, 1);
        continue;
      }
      
      for (let j = asteroids.length - 1; j >= 0; j--) { // проверяем столкновение врага с астероидами
        let asteroid = asteroids[j];
        if (checkCollision(enemy.x, enemy.y, enemy.width / 2, asteroid.x, asteroid.y, asteroid.radius)) { // если враг большой и у него есть щит, щит поглощает урон
          
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
          //
          if (enemy.hp <= 0) {
            explosions.push(new Explosion(enemy.x, enemy.y, enemy.width));
            enemies.splice(i, 1); // если здоровье врага закончилось, создаем взрыв и удаляем врага
            break;
          }
        }
      }
      
      if (checkCollision(enemy.x, enemy.y, enemy.width / 2, player.x, player.y, player.width / 2)) { //  столкновение врага с игроком
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
      //  столкновение врага с пулями игрока
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
    
    // обновляем пули врагов и проверяем столкновения
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      let eBullet = enemyBullets[i];
      eBullet.update();
      eBullet.draw();
      if (eBullet.isOffScreen()) {
        enemyBullets.splice(i, 1);
        continue;
      }
      //  столкновение пули врага с астероидом
      for (let j = asteroids.length - 1; j >= 0; j--) {
        let asteroid = asteroids[j];
        if (checkCollision(eBullet.x, eBullet.y, eBullet.radius, asteroid.x, asteroid.y, asteroid.radius)) {
          asteroids.splice(j, 1);
          enemyBullets.splice(i, 1);
          break;
        }
      }
      //  столкновение пули врага с игроком
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
    
    // обновляем пули баз союзников и проверяем столкновения 
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
    
    // обновляем ally
    for (let i = allyBases.length - 1; i >= 0; i--) {
      let base = allyBases[i];
      base.update();
      base.draw();
      // база вышла за экран
      if (base.isOffScreen()) {
        allyBases.splice(i, 1);
        continue;
      }
      //  игрок соприкасается с базой -> восстанавливаем здоровье
      if (checkCollision(base.x + base.width / 2, base.y, base.width / 2, player.x, player.y, player.width / 2)) {
        player.hp += healAlly; // healAlly – переменная, определяющая сколько хп дается
        if (player.hp > player.maxHP) player.hp = player.maxHP;
        allyBases.splice(i, 1);
      }
    }
    
    // обновляем взрывы: уменьшаем время жизни и удаляем завершившиеся
    for (let i = explosions.length - 1; i >= 0; i--) {
      let explosion = explosions[i];
      explosion.update();
      explosion.draw();
      if (explosion.lifetime <= 0) {
        explosions.splice(i, 1);
      }
    }
    
    // спавним новые объекты, используя настройки из меню
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
    
    // запрашиваем следующий кадр для анимации
    requestAnimationFrame(gameLoop);
  }
  
  // запуск игры и открытие настроек
  
  // обработчик кнопки "начать игру"
  // считываем настройки из слайдеров и запускаем игровой цикл
  document.getElementById('startButton').addEventListener('click', () => {
    asteroidSpawnFrequency = parseFloat(document.getElementById('asteroidFrequency').value);
    smallEnemySpawnFrequency = parseFloat(document.getElementById('smallEnemyFrequency').value);
    mediumEnemySpawnFrequency = parseFloat(document.getElementById('mediumEnemyFrequency').value);
    largeEnemySpawnFrequency = parseFloat(document.getElementById('largeEnemyFrequency').value);
    // скрываем меню настроек после старта игры
    document.getElementById('settingsMenu').style.display = 'none';
    // запускаем игровой цикл
    gameLoop();
  });
  
  // обработчик кнопки настроек, чтобы открыть меню во время игры
  document.getElementById('settingsButton').addEventListener('click', () => {
    document.getElementById('settingsMenu').style.display = 'block';
  });
  