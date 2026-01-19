// Game Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const game = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('pizzaRunnerHighScore')) || 0,
    lives: 3,
    gameSpeed: 2,
    frameCount: 0,
    spawnTimer: 0,
    spawnInterval: 120
};

// Input State
const keys = {
    space: false,
    shift: false,
    f: false
};

// Player (Pizza) Class
class Pizza {
    constructor() {
        this.x = 100;
        this.y = canvas.height - 80;
        this.width = 40;
        this.height = 40;
        this.velocityY = 0;
        this.gravity = 0.6;
        this.jumpPower = -12;
        this.grounded = true;
        this.charging = false;
        this.chargeSpeed = 8;
        this.normalSpeed = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
    }

    jump() {
        if (this.grounded) {
            this.velocityY = this.jumpPower;
            this.grounded = false;
        }
    }

    charge() {
        this.charging = true;
    }

    stopCharge() {
        this.charging = false;
    }

    shoot() {
        projectiles.push(new Pepperoni(this.x + this.width, this.y + this.height / 2));
    }

    update() {
        // Apply gravity
        if (!this.grounded) {
            this.velocityY += this.gravity;
        }

        this.y += this.velocityY;

        // Ground collision
        const groundY = canvas.height - 80;
        if (this.y >= groundY) {
            this.y = groundY;
            this.velocityY = 0;
            this.grounded = true;
        }

        // Keep player in bounds
        if (this.y < 0) {
            this.y = 0;
            this.velocityY = 0;
        }

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }

    takeDamage() {
        if (!this.invulnerable) {
            game.lives--;
            this.invulnerable = true;
            this.invulnerableTimer = 120; // 2 seconds at 60fps
            updateLives();

            if (game.lives <= 0) {
                gameOver();
            }
        }
    }

    draw() {
        ctx.save();

        // Flash when invulnerable
        if (this.invulnerable && Math.floor(this.invulnerableTimer / 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw pizza
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Pizza toppings
        ctx.fillStyle = '#FF6347';
        const toppingSize = 6;
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 15, toppingSize, 0, Math.PI * 2);
        ctx.arc(this.x + 25, this.y + 20, toppingSize, 0, Math.PI * 2);
        ctx.arc(this.x + 20, this.y + 28, toppingSize, 0, Math.PI * 2);
        ctx.fill();

        // Charge indicator
        if (this.charging) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// Pepperoni Projectile Class
class Pepperoni {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.speed = 8;
        this.active = true;
    }

    update() {
        this.x += this.speed;

        if (this.x > canvas.width) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 2, this.y + 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Base Enemy Class
class Enemy {
    constructor(type) {
        this.type = type;
        this.width = 35;
        this.height = 35;
        this.x = canvas.width;
        this.y = canvas.height - 80;
        this.speed = game.gameSpeed;
        this.active = true;
    }

    update() {
        this.x -= this.speed;

        if (this.x + this.width < 0) {
            this.active = false;
            game.score += 10;
            updateScore();
        }
    }

    checkCollision(player) {
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }
}

// Turtle Enemy (defeated by charging)
class Turtle extends Enemy {
    constructor() {
        super('turtle');
        this.color = '#228B22';
    }

    handleCollision(player) {
        if (player.charging) {
            this.active = false;
            game.score += 50;
            updateScore();
        } else {
            player.takeDamage();
        }
    }

    draw() {
        // Shell
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 10, this.y + this.height / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Shell pattern
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 4, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Teenager Enemy (defeated by jumping on)
class Teenager extends Enemy {
    constructor() {
        super('teenager');
        this.color = '#FF69B4';
        this.jumpable = true;
    }

    handleCollision(player) {
        // Check if player is jumping on top
        if (player.velocityY > 0 && player.y + player.height - 10 < this.y + this.height / 2) {
            this.active = false;
            game.score += 75;
            updateScore();
            player.velocityY = -8; // Bounce
        } else {
            player.takeDamage();
        }
    }

    draw() {
        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 10, this.y + 15, this.width - 20, this.height - 15);

        // Head
        ctx.fillStyle = '#FFDBAC';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();

        // Cool hair
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + this.width / 2 - 8, this.y, 16, 5);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + this.width / 2 - 4, this.y + 8, 2, 2);
        ctx.fillRect(this.x + this.width / 2 + 2, this.y + 8, 2, 2);
    }
}

// Mutant Enemy (erratic movement, avoid or shoot)
class Mutant extends Enemy {
    constructor() {
        super('mutant');
        this.color = '#9370DB';
        this.baseY = canvas.height - 120; // Move up a bit
        this.amplitude = 40; // Reduced from 60
        this.frequency = 0.08; // Slightly increased base frequency
        this.time = 0;
    }

    update() {
        super.update();
        this.time += this.frequency;
        // Slower sine wave (reduced from 10 to 3)
        this.y = this.baseY + Math.sin(this.time * 3) * this.amplitude;

        // Keep within bounds
        const minY = 50;
        const maxY = canvas.height - 80;
        this.y = Math.max(minY, Math.min(maxY, this.y));
    }

    handleCollision(player) {
        player.takeDamage();
    }

    draw() {
        // Body (blob-like)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 15, 5, 0, Math.PI * 2);
        ctx.arc(this.x + 25, this.y + 15, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 15, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 25, this.y + 15, 2, 0, Math.PI * 2);
        ctx.fill();

        // Spikes
        ctx.fillStyle = '#8B008B';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(this.x + 10 + i * 10, this.y);
            ctx.lineTo(this.x + 15 + i * 10, this.y - 8);
            ctx.lineTo(this.x + 20 + i * 10, this.y);
            ctx.fill();
        }
    }
}

// Ninja Enemy (must be shot with pepperoni)
class Ninja extends Enemy {
    constructor() {
        super('ninja');
        this.color = '#000';
        this.y = canvas.height - 120; // Slightly elevated
        this.shootTimer = Math.random() * 60 + 60;
    }

    update() {
        super.update();

        this.shootTimer--;
        if (this.shootTimer <= 0 && this.x < canvas.width - 100 && this.x > 100) {
            enemyProjectiles.push(new Shuriken(this.x, this.y + this.height / 2));
            this.shootTimer = Math.random() * 120 + 90;
        }
    }

    handleCollision(player) {
        player.takeDamage();
    }

    draw() {
        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 10, this.y + 15, this.width - 20, this.height - 15);

        // Head
        ctx.fillStyle = '#2C2C2C';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (only visible part)
        ctx.fillStyle = '#FFF';
        ctx.fillRect(this.x + this.width / 2 - 6, this.y + 8, 4, 3);
        ctx.fillRect(this.x + this.width / 2 + 2, this.y + 8, 4, 3);

        // Red headband
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x + this.width / 2 - 10, this.y + 5, 20, 3);
    }
}

// Shuriken Projectile
class Shuriken {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.speed = 5;
        this.active = true;
        this.rotation = 0;
    }

    update() {
        this.x -= this.speed;
        this.rotation += 0.2;

        if (this.x < -this.width) {
            this.active = false;
        }
    }

    checkCollision(player) {
        return (
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y
        );
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// Game Arrays
const player = new Pizza();
const enemies = [];
const projectiles = [];
const enemyProjectiles = [];

// Spawn Enemies
function spawnEnemy() {
    const rand = Math.random();
    let enemy;

    if (rand < 0.25) {
        enemy = new Turtle();
    } else if (rand < 0.5) {
        enemy = new Teenager();
    } else if (rand < 0.75) {
        enemy = new Mutant();
    } else {
        enemy = new Ninja();
    }

    enemies.push(enemy);
}

// Draw Ground
function drawGround() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    // Grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, canvas.height - 45, canvas.width, 5);
}

// Draw Background
function drawBackground() {
    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - 40);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const cloudOffset = (game.frameCount * 0.2) % canvas.width;
    for (let i = 0; i < 3; i++) {
        const x = (i * 300 - cloudOffset) % canvas.width;
        ctx.beginPath();
        ctx.arc(x, 50 + i * 40, 20, 0, Math.PI * 2);
        ctx.arc(x + 20, 50 + i * 40, 25, 0, Math.PI * 2);
        ctx.arc(x + 40, 50 + i * 40, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Update Score Display
function updateScore() {
    document.getElementById('score').textContent = game.score;

    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('pizzaRunnerHighScore', game.highScore);
        document.getElementById('highScore').textContent = game.highScore;
    }
}

// Update Lives Display
function updateLives() {
    document.getElementById('lives').textContent = game.lives;
}

// Game Over
function gameOver() {
    game.running = false;
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Reset Game
function resetGame() {
    game.score = 0;
    game.lives = 3;
    game.gameSpeed = 2;
    game.frameCount = 0;
    game.spawnTimer = 0;

    enemies.length = 0;
    projectiles.length = 0;
    enemyProjectiles.length = 0;

    player.x = 100;
    player.y = canvas.height - 80;
    player.velocityY = 0;
    player.grounded = true;
    player.charging = false;
    player.invulnerable = false;

    updateScore();
    updateLives();

    document.getElementById('gameOver').classList.add('hidden');
}

// Game Loop
function gameLoop() {
    if (!game.running) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();
    drawGround();

    // Update and draw player
    player.update();
    player.draw();

    // Spawn enemies
    game.spawnTimer++;
    if (game.spawnTimer >= game.spawnInterval) {
        spawnEnemy();
        game.spawnTimer = 0;

        // Gradually increase difficulty
        if (game.spawnInterval > 60) {
            game.spawnInterval -= 0.5;
        }
        if (game.gameSpeed < 5) {
            game.gameSpeed += 0.02;
        }
    }

    // Update and draw enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.speed = game.gameSpeed;
        enemy.update();
        enemy.draw();

        // Check collision with player
        if (enemy.checkCollision(player)) {
            enemy.handleCollision(player);
        }

        // Check collision with projectiles
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const projectile = projectiles[j];
            if (
                projectile.x < enemy.x + enemy.width &&
                projectile.x + projectile.width > enemy.x &&
                projectile.y < enemy.y + enemy.height &&
                projectile.y + projectile.height > enemy.y
            ) {
                enemy.active = false;
                projectile.active = false;
                game.score += 100;
                updateScore();
            }
        }

        if (!enemy.active) {
            enemies.splice(i, 1);
        }
    }

    // Update and draw projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.update();
        projectile.draw();

        if (!projectile.active) {
            projectiles.splice(i, 1);
        }
    }

    // Update and draw enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const projectile = enemyProjectiles[i];
        projectile.update();
        projectile.draw();

        if (projectile.checkCollision(player)) {
            player.takeDamage();
            projectile.active = false;
        }

        if (!projectile.active) {
            enemyProjectiles.splice(i, 1);
        }
    }

    game.frameCount++;
    requestAnimationFrame(gameLoop);
}

// Input Handling
document.addEventListener('keydown', (e) => {
    if (!game.running) return;

    if (e.code === 'Space') {
        e.preventDefault();
        if (!keys.space) {
            keys.space = true;
            player.jump();
        }
    }

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        if (!keys.shift) {
            keys.shift = true;
            player.charge();
        }
    }

    if (e.code === 'KeyF') {
        e.preventDefault();
        if (!keys.f) {
            keys.f = true;
            player.shoot();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        keys.space = false;
    }

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        keys.shift = false;
        player.stopCharge();
    }

    if (e.code === 'KeyF') {
        keys.f = false;
    }
});

// Mobile Touch Controls
let touchButtons = {
    jump: null,
    charge: null,
    shoot: null
};

// Helper function to handle touch button press
function setupTouchButton(buttonId, onPress, onRelease) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    touchButtons[buttonId] = button;

    // Touch events
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (game.running) onPress();
    });

    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (game.running && onRelease) onRelease();
    });

    // Mouse events for testing on desktop
    button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (game.running) onPress();
    });

    button.addEventListener('mouseup', (e) => {
        e.preventDefault();
        if (game.running && onRelease) onRelease();
    });
}

// Setup touch controls after DOM loads
window.addEventListener('DOMContentLoaded', () => {
    setupTouchButton('jumpBtn', () => {
        if (!keys.space) {
            keys.space = true;
            player.jump();
        }
    }, () => {
        keys.space = false;
    });

    setupTouchButton('chargeBtn', () => {
        if (!keys.shift) {
            keys.shift = true;
            player.charge();
        }
    }, () => {
        keys.shift = false;
        player.stopCharge();
    });

    setupTouchButton('shootBtn', () => {
        if (!keys.f) {
            keys.f = true;
            player.shoot();
        }
    }, () => {
        keys.f = false;
    });
});

// Restart Button
document.getElementById('restartBtn').addEventListener('click', () => {
    resetGame();
    game.running = true;
    gameLoop();
});

// Initialize
document.getElementById('highScore').textContent = game.highScore;
updateScore();
updateLives();

// Start game immediately
game.running = true;
gameLoop();
