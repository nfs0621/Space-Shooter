const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');

const shootSound = document.getElementById('shootSound');
const explosionSound = document.getElementById('explosionSound');

// Game settings
const slowMotionToggle = document.getElementById('slowMotionEnabled');
const autoShootToggle = document.getElementById('autoShootEnabled');

let isSlowMotionEnabled = localStorage.getItem('slowMotionEnabled') !== 'false';
let isAutoShootEnabled = localStorage.getItem('autoShootEnabled') !== 'false';

slowMotionToggle.checked = isSlowMotionEnabled;
autoShootToggle.checked = isAutoShootEnabled;

// Save preferences when changed
slowMotionToggle.addEventListener('change', (e) => {
    isSlowMotionEnabled = e.target.checked;
    localStorage.setItem('slowMotionEnabled', isSlowMotionEnabled);
});

autoShootToggle.addEventListener('change', (e) => {
    isAutoShootEnabled = e.target.checked;
    localStorage.setItem('autoShootEnabled', isAutoShootEnabled);
});

const shieldTimerElement = document.getElementById('shieldTimer');
const tripleShotTimerElement = document.getElementById('tripleShotTimer');
const slowShotTimerElement = document.getElementById('slowShotTimer');
const fastShotTimerElement = document.getElementById('fastShotTimer');

const totalEnemiesElement = document.getElementById('totalEnemies');
const enemiesKilledElement = document.getElementById('enemiesKilled');
const enemiesMissedElement = document.getElementById('enemiesMissed');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 7;
        this.shielded = false;
        this.tripleShot = false;
        this.slowShot = false;
        this.lastShotTime = 0;
        this.shotInterval = 200; // Default shot interval
    }

     draw() {
        ctx.fillStyle = '#00ff00';
        // Triangle for player
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        if (this.shielded) {
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, 30, 0, 2* Math.PI);
            ctx.stroke();
        }
    }
}


class Bullet {
    constructor(x, y, angle = 0) {
        this.width = 5;
        this.height = 15;
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.angle = angle;
    }

    update() {
        this.x += this.speed * Math.sin(this.angle);
        this.y -= this.speed * Math.cos(this.angle);
    }

   draw() {
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = 0;
        this.speed = 3;
    }

    update() {
        this.y += this.speed * enemySpeedMultiplier;
    }

    draw() {
        ctx.fillStyle = '#ff0000';
        // Circle for enemy
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    }
}

const player = new Player();

let bullets = [];
let enemies = [];
let powerUps = [];
let score = 0;
let enemiesSpawned = 0;
let gameRunning = true;
let highScore = localStorage.getItem('highScore') || 0;
highScoreElement.textContent = `High Score: ${highScore}`;
let enemySpeedMultiplier = 0.1; //set to 0.1 to start at 10% speed

let totalEnemies = 0;
let enemiesKilled = 0;
let enemiesMissed = 0;

const POWERUP_TYPES = {
    SHIELD: 'shield',
    TRIPLE_SHOT: 'triple_shot',
    SLOW_SHOT: 'slow_shot',
    FAST_SHOT: 'fast_shot'
};

let powerUpEndTimes = {
    [POWERUP_TYPES.SHIELD]: 0,
    [POWERUP_TYPES.TRIPLE_SHOT]: 0,
    [POWERUP_TYPES.SLOW_SHOT]: 0,
    [POWERUP_TYPES.FAST_SHOT]: 0
};

class PowerUp {
    constructor() {
        this.width = 20;
        this.height = 20;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = 0;
        this.speed = 2;
        this.type = this.getRandomType();
    }
  getRandomType() {
    const types = Object.values(POWERUP_TYPES);
    let probabilities = [
      0.3, // SHIELD (30%)
      0.3, // TRIPLE_SHOT (30%)
      0.0, // SLOW_SHOT (0% when disabled)
      0.4, // FAST_SHOT (40% when slow shot disabled)
    ];

    // Adjust probabilities based on slow motion setting
    if (isSlowMotionEnabled) {
      probabilities = [
        0.3, // SHIELD (30%)
        0.3, // TRIPLE_SHOT (30%)
        0.1, // SLOW_SHOT (10%)
        0.3, // FAST_SHOT (30%)
      ];
    }

    let cumulativeProbability = 0;
    const randomNumber = Math.random();

    for (let i = 0; i < types.length; i++) {
      cumulativeProbability += probabilities[i];
      if (randomNumber <= cumulativeProbability) {
        return types[i];
      }
    }

    // Fallback in case probabilities don't add up to 1 (shouldn't happen)
    return types[0];
  }
    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = 'pink'; // Default color, will be overridden
        switch (this.type) {
            case POWERUP_TYPES.SHIELD:
                ctx.fillStyle = 'blue'; // Shield - Blue
                break;
            case POWERUP_TYPES.TRIPLE_SHOT:
                ctx.fillStyle = 'orange'; // Triple-shot - Orange
                break;
            case POWERUP_TYPES.SLOW_SHOT:
                ctx.fillStyle = 'gray'; // slow-shot - gray
                break;
        }

        // ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.beginPath();
        switch (this.type) {
            case POWERUP_TYPES.SHIELD:
                // Shield: Circle with a smaller filled circle inside
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 4, 0, 2 * Math.PI);
                ctx.fill();
                break;
            case POWERUP_TYPES.TRIPLE_SHOT:
                // Triple-shot: Three small, connected circles
                ctx.arc(this.x + this.width / 2 - 8, this.y + this.height / 2, 4, 0, 2 * Math.PI);
                ctx.fill();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 4, 0, 2 * Math.PI);
                ctx.fill();
                ctx.arc(this.x + this.width / 2 + 8, this.y + this.height / 2, 4, 0, 2 * Math.PI);
                ctx.fill();
                break;
            case POWERUP_TYPES.SLOW_SHOT:
                // Slow-shot: A clock icon (circle with two lines for hands)
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height / 4);
                ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 2 + this.width / 4, this.y + this.height / 2);
                ctx.stroke();
                break;
            case POWERUP_TYPES.FAST_SHOT:
                // Fast-shot: A lightning bolt
                ctx.fillStyle = 'yellow';
                ctx.beginPath();
                ctx.moveTo(this.x + this.width / 2, this.y);
                ctx.lineTo(this.x + this.width / 4, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.lineTo(this.x + this.width * 3 / 4, this.y + this.height / 2);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
                ctx.closePath();
                ctx.fill();
                break;

        }
        ctx.closePath();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw game objects
    player.draw();

    bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();

        // Collision detection with player
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            if (player.shielded) {
                // Destroy enemy on shield contact
                enemies.splice(index, 1);
                score += 10;
                enemiesKilled++;
                explosionSound.currentTime = 0;
                explosionSound.play();
            } else {
                gameOver();
            }
        }

                // Collision detection with bullets
                bullets.forEach((bullet, bulletIndex) => {
                        if (
                                bullet.x < enemy.x + enemy.width &&
                                bullet.x + bullet.width > enemy.x &&
                                bullet.y < enemy.y + enemy.height &&
                                bullet.y + bullet.height > enemy.y
                        ) {
                                enemies.splice(index, 1);
                                bullets.splice(bulletIndex, 1);
                                score += 10;
                                enemiesKilled++;
                                explosionSound.currentTime = 0; // Reset sound to start
                                explosionSound.play();
                        }
                });

                // Remove enemies if they go off-screen
                if (enemy.y > canvas.height) {
                        enemies.splice(index, 1);
                        score -= 5;
                        enemiesMissed++;
                        if (score < 0) {
                                gameOver();
                        }
                }
        });

        // Update UI elements
        scoreElement.textContent = `Score: ${score}`;
        if (score > highScore) {
                highScore = score;
                localStorage.setItem('highScore', highScore);
                highScoreElement.textContent = `High Score: ${highScore}`;
        }

        totalEnemiesElement.textContent = `Total: ${totalEnemies}`;
        enemiesKilledElement.textContent = `Killed: ${totalEnemies > 0 ? ((enemiesKilled / totalEnemies) * 100).toFixed(0) : 0}%`;
        enemiesMissedElement.textContent = `Missed: ${totalEnemies > 0 ? ((enemiesMissed / totalEnemies) * 100).toFixed(0) : 0}%`;

        // Update powerup timers and visibility
        const now = Date.now();
        shieldTimerElement.textContent = player.shielded ? Math.max(0, Math.ceil((powerUpEndTimes[POWERUP_TYPES.SHIELD] - now) / 1000)) : 0;
        tripleShotTimerElement.textContent = player.tripleShot ? Math.max(0, Math.ceil((powerUpEndTimes[POWERUP_TYPES.TRIPLE_SHOT] - now) / 1000)) : 0;
        
        // Only show slow shot timer if feature is enabled
        slowShotTimerElement.parentElement.style.display = isSlowMotionEnabled ? 'block' : 'none';
        if (isSlowMotionEnabled) {
            slowShotTimerElement.textContent = player.slowShot ? Math.max(0, Math.ceil((powerUpEndTimes[POWERUP_TYPES.SLOW_SHOT] - now) / 1000)) : 0;
        }
        
        fastShotTimerElement.textContent = player.fastShot ? Math.max(0, Math.ceil((powerUpEndTimes[POWERUP_TYPES.FAST_SHOT] - now) / 1000)) : 0;

        // Update and draw powerups
        powerUps.forEach((powerUp, index) => {
                powerUp.update();
                powerUp.draw();

                // PowerUp and Player Collision
                if (
                        player.x < powerUp.x + powerUp.width &&
                        player.x + player.width > powerUp.x &&
                        player.y < powerUp.y + powerUp.height &&
                        player.y + player.height > powerUp.y
                ) {
                        activatePowerUp(powerUp);
                        powerUps.splice(index, 1);
                }

                // Reset position if off-screen
                if (powerUp.y > canvas.height) {
                        powerUp.y = 0;
                        powerUp.x = Math.random() * (canvas.width - powerUp.width);
                }
        });

        if (gameRunning) {
                requestAnimationFrame(gameLoop);
        }
}

function activatePowerUp(powerUp) {
    const now = Date.now();

    // Helper function to set or accumulate power-up time
    const setPowerUp = (type, duration, property) => {
        const currentEndTime = powerUpEndTimes[type];
        const remainingTime = Math.max(0, currentEndTime - now);
        const newDuration = remainingTime + duration;
        
        // Clear any existing timeout
        if (player[property]) {
            clearTimeout(player[`${property}Timeout`]);
        }
        
        powerUpEndTimes[type] = now + newDuration;
        player[property] = true;
        
        // Store timeout ID to allow clearing it later
        player[`${property}Timeout`] = setTimeout(() => {
            player[property] = false;
        }, newDuration);
    };

    switch (powerUp.type) {
        case POWERUP_TYPES.SHIELD:
            setPowerUp(POWERUP_TYPES.SHIELD, 5000, 'shielded');
            break;
        case POWERUP_TYPES.TRIPLE_SHOT:
            setPowerUp(POWERUP_TYPES.TRIPLE_SHOT, 7000, 'tripleShot');
            break;
        case POWERUP_TYPES.SLOW_SHOT:
            if (isSlowMotionEnabled) {
                setPowerUp(POWERUP_TYPES.SLOW_SHOT, 10000, 'slowShot');
            }
            break;
        case POWERUP_TYPES.FAST_SHOT:
            // Override slow shot
            if (player.slowShot) {
                player.slowShot = false;
                powerUpEndTimes[POWERUP_TYPES.SLOW_SHOT] = 0;
            }
            setPowerUp(POWERUP_TYPES.FAST_SHOT, 5000, 'fastShot');
            break;
    }
}

function gameOver() {
        // Clear all active powerup timeouts
        for (const type of Object.values(POWERUP_TYPES)) {
            const property = type.replace('_', '') + 'Timeout';
            if (player[property]) {
                clearTimeout(player[property]);
                player[property] = null;
            }
        }
        
        // Reset powerup states
        player.shielded = false;
        player.tripleShot = false;
        player.slowShot = false;
        player.fastShot = false;

        ctx.fillStyle = "red";
        ctx.font = "50px Arial";
        ctx.fillText("Game Over", canvas.width / 2 - 150, canvas.height / 2);
        gameRunning = false;
}

// Event listeners
document.addEventListener('mousemove', (e) => {
    let rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left - player.width / 2;

    // Keep player within bounds
    if (player.x < 0) {
        player.x = 0;
    } else if (player.x > canvas.width - player.width) {
        player.x = canvas.width - player.width;
    }
});

let isShooting = false;

function attemptShoot() {
    const now = Date.now();
    let currentShotInterval = 200; // Default shot interval

    if (player.slowShot) {
        currentShotInterval = 1000;
    } else if (player.fastShot) {
        currentShotInterval = 0.05; // Twice as fast (0.05ms interval)
    }

    if (now - player.lastShotTime > currentShotInterval) {
        if (player.tripleShot) {
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y, -25 * Math.PI / 180)); // Left bullet
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)); // Center bullet
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y, 25 * Math.PI / 180)); // Right bullet
        } else {
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y));
        }
        player.lastShotTime = now;
        shootSound.currentTime = 0; // Reset sound to start
        shootSound.play();
    }
}

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left mouse button
       isShooting = true;
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        isShooting = false;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !gameRunning) {
        document.location.reload();
    }
});

// Spawn enemies and powerups
let powerupCooldown = 0;

setInterval(() => {
    // Call attemptShoot if auto-shoot is enabled or mouse button is down
    if (isAutoShootEnabled || isShooting) {
        attemptShoot();
    }

    // Update powerup cooldown and display
    powerupCooldown = Math.max(0, (20 - enemiesSpawned) * 2);

    if (enemiesSpawned >= 5 && Math.random() < 1/15) {
        let powerUp = new PowerUp();
        powerUps.push(powerUp);
        console.log("Spawned new powerup at:", powerUp.x, powerUp.y, "Type:", powerUp.type);
        enemiesSpawned = 0;
        powerupCooldown = 0;
    } else {
        enemies.push(new Enemy());
        enemiesSpawned++;
        totalEnemies++;
    }

}, 200);

// Cyclical enemy speed pattern
let speedPattern = [1.0, 1.5, 1.0, 0.1];
let speedPatternIndex = 0;
let speedIncreaseInterval;

function startCyclicalSpeedPattern() {
    clearInterval(speedIncreaseInterval);
    speedIncreaseInterval = setInterval(() => {
        speedPatternIndex = (speedPatternIndex + 1) % speedPattern.length;
        let targetSpeed = speedPattern[speedPatternIndex];

        let innerInterval = setInterval(() => {
            if (enemySpeedMultiplier < targetSpeed) {
                enemySpeedMultiplier += 0.01;
                if (enemySpeedMultiplier >= targetSpeed) {
                    enemySpeedMultiplier = targetSpeed;
                    clearInterval(innerInterval);
                }
            } else if (enemySpeedMultiplier > targetSpeed) {
                enemySpeedMultiplier -= 0.01;
                if (enemySpeedMultiplier <= targetSpeed) {
                    enemySpeedMultiplier = targetSpeed;
                    clearInterval(innerInterval);
                }
            }
        }, 1000);

    }, 60000); // Change target speed every 60 seconds
}

// Initialize enemy speed pattern
speedIncreaseInterval = setInterval(() => {
    if (enemySpeedMultiplier < 1.0) {
        enemySpeedMultiplier += 0.01;
        if (enemySpeedMultiplier >= 1.0) {
            enemySpeedMultiplier = 1.0;
            startCyclicalSpeedPattern();
        }
    }
}, 1000);

// Start game
gameLoop();