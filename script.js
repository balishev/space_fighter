// Настройка canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Дополнительный множитель для спавна (чтобы маленькие значения имели заметный эффект)
const spawnMultiplier = 0.1;
let asteroidSpawnFrequency = 0.02;
let smallEnemySpawnFrequency = 0.005;
let mediumEnemySpawnFrequency = 0.005;
let largeEnemySpawnFrequency = 0.005;
const allyBaseFrequency = 0.001;

// Обновление отображения значений ползунков
function updateSliderDisplay(id, displayId) {
  const slider = document.getElementById(id);
  const display = document.getElementById(displayId);
  slider.addEventListener('input', () => {
    display.textContent = parseFloat(slider.value).toFixed(3);
  });
}
updateSliderDisplay('asteroidFrequency', 'asteroidFreqVal');
updateSliderDisplay('smallEnemyFrequency', 'smallEnemyFreqVal');
updateSliderDisplay('mediumEnemyFrequency', 'mediumEnemyFreqVal');
updateSliderDisplay('largeEnemyFrequency', 'largeEnemyFreqVal');

// Запуск игры после нажатия кнопки "Начать игру"
document.getElementById('startButton').addEventListener('click', () => {
  asteroidSpawnFrequency = parseFloat(document.getElementById('asteroidFrequency').value);
  smallEnemySpawnFrequency = parseFloat(document.getElementById('smallEnemyFrequency').value);
  mediumEnemySpawnFrequency = parseFloat(document.getElementById('mediumEnemyFrequency').value);
  largeEnemySpawnFrequency = parseFloat(document.getElementById('largeEnemyFrequency').value);
  document.getElementById('settingsMenu').style.display = 'none';
  gameLoop();
});

// Отображать органы управления только на мобильных устройствах
if (/Mobi|Android/i.test(navigator.userAgent)) {
  document.getElementById('mobileControls').style.display = 'block';
  document.getElementById('actionControls').style.display = 'block';
}

// Вспомогательная функция для случайных чисел
function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

// Функция проверки столкновений (окружностей)
function checkCollision(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (r1 + r2);
}

// Отслеживание нажатых клавиш (для клавиатурного управления)
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Обработка нажатий на мобильные кнопки
function addMobileControl(buttonId, keyName) {
  const btn = document.getElementById(buttonId);
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
  btn.addEventListener('mousedown', () => { keys[keyName] = true; });
  btn.addEventListener('mouseup', () => { keys[keyName] = false; });
}
addMobileControl("btnUp", "ArrowUp");
addMobileControl("btnDown", "ArrowDown");
addMobileControl("btnLeft", "ArrowLeft");
addMobileControl("btnRight", "ArrowRight");

document.getElementById("btnShoot").addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (player.shootCooldown <= 0 && player.ammo > 0) {
    const bulletX = player.x + Math.sin(player.angle) * (player.height / 2);
    const bulletY = player.y - Math.cos(player.angle) * (player.height / 2);
    bullets.push(new Bullet(bulletX, bulletY, player.angle, "yellow"));
    player.shootCooldown = 15;
    player.ammo--;
  }
});
document.getElementById("btnRocket").addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (player.rocketShootCooldown <= 0 && player.rocketAmmo > 0) {
    const rocketX = player.x + Math.sin(player.angle) * (player.height / 2);
    const rocketY = player.y - Math.cos(player.angle) * (player.height / 2);
    rockets.push(new Rocket(rocketX, rocketY, player.angle));
    player.rocketShootCooldown = 60;
    player.rocketAmmo--;
  }
});
document.getElementById("btnBoost").addEventListener("touchstart", (e) => {
  e.preventDefault();
  player.speed *= 2;
  setTimeout(() => { player.speed /= 2; }, 3000);
});

// --- Классы игровых объектов ---

class Player {
  constructor() {
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
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (keys['ArrowUp'] || keys['KeyW']) {
      let flameLength = getRandom(10, 20);
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
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
    if (this.shield > 0) {
      ctx.beginPath();
      const shieldRadius = Math.max(this.width, this.height) * 1.2;
      ctx.arc(0, 0, shieldRadius, 0, 2 * Math.PI);
      const shieldGradient = ctx.createRadialGradient(0, 0, shieldRadius * 0.5, 0, 0, shieldRadius);
      shieldGradient.addColorStop(0, "rgba(0,150,255,0.3)");
      shieldGradient.addColorStop(1, "rgba(0,150,255,0)");
      ctx.fillStyle = shieldGradient;
      ctx.fill();
    }
    ctx.restore();
  }
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

class Asteroid {
  constructor() {
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

class Rocket {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 8;
    this.radius = 7;
    this.lifetime = 120;
    this.age = 0;
    this.explosionRadius = 50;
    this.explosionDamage = 50;
  }
  update() {
    this.x += this.speed * Math.sin(this.angle);
    this.y -= this.speed * Math.cos(this.angle);
    this.age++;
    // Самонаведение: корректируем угол в сторону ближайшего врага
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
      // Корректируем угол (плавно)
      let targetAngle = Math.atan2(closest.x - this.x, -(closest.y - this.y));
      // Немного изменяем текущий угол в сторону targetAngle
      this.angle = this.angle + 0.1 * (targetAngle - this.angle);
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

class Enemy {
  constructor(type) {
    this.type = type;
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
    let dx = player.x - this.x;
    let dy = player.y - this.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    this.angle = Math.atan2(dx, -dy);
    this.x += this.speed * Math.sin(this.angle);
    this.y -= this.speed * Math.cos(this.angle);
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
    if (this.type === "large" && this.shield < this.maxShield) {
      this.shield += 0.05;
      if (this.shield > this.maxShield) this.shield = this.maxShield;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
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
    return (this.x < -100 || this.x > canvas.width + 100 ||
            this.y < -100 || this.y > canvas.height + 100);
  }
}

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
    this.x += this.speed;
    if (this.currentShootCooldown > 0) {
      this.currentShootCooldown--;
    } else {
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

class Explosion {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.lifetime = 30;
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

function rocketExplosion(rocket) {
  explosions.push(new Explosion(rocket.x, rocket.y, rocket.explosionRadius));
  for (let i = asteroids.length - 1; i >= 0; i--) {
    let asteroid = asteroids[i];
    let dx = rocket.x - asteroid.x;
    let dy = rocket.y - asteroid.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < rocket.explosionRadius + asteroid.radius) {
      asteroids.splice(i, 1);
    }
  }
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

// Глобальные массивы игровых объектов
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

// Начальная генерация астероидов
const numAsteroids = 5;
for (let i = 0; i < numAsteroids; i++) {
  asteroids.push(new Asteroid());
}

function handleInput() {
  if (keys['ArrowUp'] || keys['KeyW']) {
    player.x += player.speed * Math.sin(player.angle);
    player.y -= player.speed * Math.cos(player.angle);
  }
  if (keys['ArrowDown'] || keys['KeyS']) {
    player.x -= player.speed * Math.sin(player.angle);
    player.y += player.speed * Math.cos(player.angle);
  }
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.angle -= 0.1;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.angle += 0.1;
  }
  if (keys['Space'] && player.shootCooldown <= 0 && player.ammo > 0) {
    const bulletX = player.x + Math.sin(player.angle) * (player.height / 2);
    const bulletY = player.y - Math.cos(player.angle) * (player.height / 2);
    bullets.push(new Bullet(bulletX, bulletY, player.angle, "yellow"));
    player.shootCooldown = 15;
    player.ammo--;
  }
  if (keys['Enter'] && player.rocketShootCooldown <= 0 && player.rocketAmmo > 0) {
    const rocketX = player.x + Math.sin(player.angle) * (player.height / 2);
    const rocketY = player.y - Math.cos(player.angle) * (player.height / 2);
    rockets.push(new Rocket(rocketX, rocketY, player.angle));
    player.rocketShootCooldown = 60;
    player.rocketAmmo--;
  }
}

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

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gameOver) {
    ctx.fillStyle = "white";
    ctx.font = "48px sans-serif";
    ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
    return;
  }
  handleInput();
  player.update();
  player.draw();
  drawHealthBar();
  drawShieldBar();
  drawAmmo();

  // Обновление астероидов
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

  // Обновление лазерных пуль игрока
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

  // Обновление ракет игрока
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

  // Обновление врагов
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

  // Обновление пуль врагов (также наносят урон астероидам)
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

  // Обновление пуль баз союзников
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

  // Обновление баз союзников
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

  // Обновление эффектов взрывов
  for (let i = explosions.length - 1; i >= 0; i--) {
    let explosion = explosions[i];
    explosion.update();
    explosion.draw();
    if (explosion.lifetime <= 0) {
      explosions.splice(i, 1);
    }
  }

  // Спавн новых объектов с учетом множителя
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
  if (Math.random() < allyBaseFrequency * spawnMultiplier) {
    allyBases.push(new AllyBase());
  }

  requestAnimationFrame(gameLoop);
}
