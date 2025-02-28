const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');

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
let enemySpeedMultiplier = 0.5;

const POWERUP_TYPES = {
    SHIELD: 'shield',
    TRIPLE_SHOT: 'triple_shot',
    SLOW_SHOT: 'slow_shot'
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
        return types[Math.floor(Math.random() * types.length)];
    }
    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = 'purple'; // Default color, will be overridden
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
            if (!player.shielded){
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
                scoreElement.textContent = `Score: ${score}`;
            }
        });

        // Remove enemies if they go off-screen
        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
            score -= 5;
            scoreElement.textContent = `Score: ${score}`;
            if (score < 0){
                gameOver();
            }

        }
    });

     // Update high score display and check for new high score
     /*
    // Update powerup timer display
    const powerupTimerElement = document.getElementById('powerupTimer');
    if (powerupTimerElement){
        powerupTimerElement.textContent = `Next Power-Up: ${powerupCooldown <= 0 ? 'Ready!' : powerupCooldown.toFixed(0) + 's'}`;
    }
    */
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = `High Score: ${highScore}`;
    }


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
        if(powerUp.y > canvas.height) {
            powerUp.y = 0;
            powerUp.x = Math.random() * (canvas.width - powerUp.width);
        }
    });

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function activatePowerUp(powerUp) {
    switch (powerUp.type) {
        case POWERUP_TYPES.SHIELD:
            player.shielded = true;
            setTimeout(() => { player.shielded = false; }, 5000); // 5 seconds
            break;
        case POWERUP_TYPES.TRIPLE_SHOT:
            player.tripleShot = true;
            setTimeout(() => { player.tripleShot = false; }, 7000); // 7 seconds
            break;
        case POWERUP_TYPES.SLOW_SHOT:
            player.slowShot = true;
            setTimeout(()=> { player.slowShot = false; }, 10000); //10 sec
            break;
    }
}

function gameOver() {
    // alert(`Game Over! Score: ${score}`);
    // document.location.reload();
    ctx.fillStyle = "red";
    ctx.font = "50px Arial";
    ctx.fillText("Game Over", canvas.width / 2 - 150, canvas.height / 2);
    gameRunning = false;
    document.getElementById('restartButton').style.display = 'block';

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
    if (player.slowShot){
        player.shotInterval = 1000;
    }
    else {
        player.shotInterval = 200;
    }
    if (now - player.lastShotTime > player.shotInterval) {
        if (player.tripleShot) {
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y, -25 * Math.PI / 180)); // Left bullet
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)); // Center bullet
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y, 25 * Math.PI / 180)); // Right bullet
        } else {
            bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y));
        }
        player.lastShotTime = now;
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
    // Call attemptShoot on interval if mouse is down
    if (isShooting) {
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
    }

}, 200);

// Start game
gameLoop();

// Gradually increase enemy speed over 60 seconds
let speedIncreaseInterval = setInterval(() => {
    enemySpeedMultiplier += 0.01;
    if (enemySpeedMultiplier >= 1) {
        enemySpeedMultiplier = 1;
        clearInterval(speedIncreaseInterval);
    }
}, 1000); // Every second increase by 0.016666 to reach 1 in 60 seconds