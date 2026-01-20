// Game Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const game = {
    running: false,
    score: 0,
    highScore: parseInt(localStorage.getItem('pizzaRunnerHighScore')) || 0,
    lives: 3,
    frameCount: 0,
    cameraX: 0,
    worldWidth: 5000, // Extended world
    spawnTimer: 0,
    spawnInterval: 180
};

// Input State
const keys = {
    left: false,
    right: false,
    space: false,
    shift: false,
    f: false
};

// Player (Pizza) Class
class Pizza {
    constructor() {
        this.x = 300;
        this.y = canvas.height - 180;
        this.width = 40;
        this.height = 40;
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.6;
        this.jumpPower = -15;
        this.moveSpeed = 5;
        this.grounded = false;
        this.charging = false;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.pepperonis = 10; // Starting ammo
        this.maxPepperonis = 20;
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
        if (this.pepperonis > 0) {
            projectiles.push(new Pepperoni(this.x + this.width, this.y + this.height / 2));
            this.pepperonis--;
            updatePepperonis();
        }
    }

    addPepperonis(amount) {
        this.pepperonis = Math.min(this.pepperonis + amount, this.maxPepperonis);
        updatePepperonis();
    }

    update() {
        // Horizontal movement
        this.velocityX = 0;
        if (keys.left) {
            this.velocityX = -this.moveSpeed;
        }
        if (keys.right) {
            this.velocityX = this.moveSpeed;
        }

        // Apply charge speed boost
        if (this.charging && keys.right) {
            this.velocityX = this.moveSpeed * 1.8;
        }

        this.x += this.velocityX;

        // Keep player in world bounds
        if (this.x < 0) this.x = 0;
        if (this.x > game.worldWidth - this.width) {
            this.x = game.worldWidth - this.width;
        }

        // Apply gravity
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // Reset grounded state
        this.grounded = false;

        // Ground collision
        const groundY = canvas.height - 140;
        if (this.y >= groundY) {
            this.y = groundY;
            this.velocityY = 0;
            this.grounded = true;
        }

        // Platform collision
        platforms.forEach(platform => {
            if (this.velocityY >= 0 && // Falling down
                this.x + this.width > platform.x &&
                this.x < platform.x + platform.width &&
                this.y + this.height >= platform.y &&
                this.y + this.height <= platform.y + 15) {
                this.y = platform.y - this.height;
                this.velocityY = 0;
                this.grounded = true;
            }
        });

        // Keep player in vertical bounds
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

        // Update camera to follow player
        const cameraDeadZone = canvas.width / 3;
        const playerScreenX = this.x - game.cameraX;

        if (playerScreenX > canvas.width - cameraDeadZone) {
            game.cameraX = this.x - (canvas.width - cameraDeadZone);
        } else if (playerScreenX < cameraDeadZone) {
            game.cameraX = this.x - cameraDeadZone;
        }

        // Keep camera in bounds
        game.cameraX = Math.max(0, Math.min(game.cameraX, game.worldWidth - canvas.width));
    }

    takeDamage() {
        if (!this.invulnerable) {
            game.lives--;
            this.invulnerable = true;
            this.invulnerableTimer = 120;
            updateLives();

            if (game.lives <= 0) {
                gameOver();
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(-game.cameraX, 0);

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

// Platform Class
class Platform {
    constructor(x, y, width) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 20;
    }

    draw() {
        ctx.save();
        ctx.translate(-game.cameraX, 0);

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Grass on top
        ctx.fillStyle = '#228B22';
        ctx.fillRect(this.x, this.y - 5, this.width, 5);

        // Platform texture
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        for (let i = 0; i < this.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i, this.y + this.height);
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

        if (this.x > game.worldWidth) {
            this.active = false;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(-game.cameraX, 0);

        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(this.x + 2, this.y + 2, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Power-up Class
class PowerUp {
    constructor(x, y, type = 'pepperoni') {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.type = type;
        this.active = true;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update() {
        // Bob up and down
        this.bobOffset += 0.1;

        // Check collision with player
        if (this.checkCollision(player)) {
            this.collect();
        }

        // Remove if too far behind camera
        if (this.x < game.cameraX - 200) {
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

    collect() {
        this.active = false;
        if (this.type === 'pepperoni') {
            player.addPepperonis(5);
            game.score += 25;
            updateScore();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(-game.cameraX, 0);

        const bobY = this.y + Math.sin(this.bobOffset) * 5;

        if (this.type === 'pepperoni') {
            // Pepperoni box
            ctx.fillStyle = '#FF6347';
            ctx.fillRect(this.x, bobY, this.width, this.height);

            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, bobY, this.width, this.height);

            // Pepperoni icon
            ctx.fillStyle = '#8B0000';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, bobY + this.height / 2, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FF6347';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2 - 2, bobY + this.height / 2 - 2, 2, 0, Math.PI * 2);
            ctx.arc(this.x + this.width / 2 + 2, bobY + this.height / 2 + 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// Base Enemy Class
class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.width = 35;
        this.height = 35;
        this.x = x;
        this.y = y;
        this.speed = 1.5;
        this.active = true;
        this.direction = -1; // -1 for left, 1 for right
    }

    update() {
        this.x += this.speed * this.direction;

        // Remove if too far behind camera (left side only)
        // Keep enemies ahead of camera so they're there when player advances
        if (this.x < game.cameraX - 200) {
            this.active = false;
        }

        // Award points if enemy goes off left side of world
        if (this.x < -this.width && this.active) {
            this.active = false;
            game.score += 5;
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

    checkEdge() {
        // Turn around at world edges
        if (this.x <= 0 || this.x >= game.worldWidth - this.width) {
            this.direction *= -1;
        }
    }
}

// Turtle Enemy (defeated by charging)
class Turtle extends Enemy {
    constructor(x) {
        const y = canvas.height - 175; // Ground level
        super('turtle', x, y);
        this.color = '#228B22';
    }

    update() {
        super.update();
        this.checkEdge();
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
        ctx.save();
        ctx.translate(-game.cameraX, 0);

        // Shell
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        const headX = this.direction > 0 ? this.x + this.width - 10 : this.x + 10;
        ctx.arc(headX, this.y + this.height / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // Shell pattern
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

// Teenager Enemy (defeated by jumping on)
class Teenager extends Enemy {
    constructor(x, y = null) {
        if (y === null) {
            y = canvas.height - 175; // Default to ground
        }
        super('teenager', x, y);
        this.color = '#FF69B4';
        this.baseY = y;
        this.patrolStart = x - 100;
        this.patrolEnd = x + 100;
    }

    update() {
        super.update();

        // Patrol between points
        if (this.x <= this.patrolStart || this.x >= this.patrolEnd) {
            this.direction *= -1;
        }
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
        ctx.save();
        ctx.translate(-game.cameraX, 0);

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

        ctx.restore();
    }
}

// Mutant Enemy (erratic movement, avoid or shoot)
class Mutant extends Enemy {
    constructor(x, y = null) {
        if (y === null) {
            y = canvas.height - 200; // Slightly above ground
        }
        super('mutant', x, y);
        this.color = '#9370DB';
        this.baseY = y;
        this.amplitude = 40;
        this.frequency = 0.08;
        this.time = 0;
        this.patrolStart = x - 150;
        this.patrolEnd = x + 150;
    }

    update() {
        super.update();
        this.time += this.frequency;

        // Floating motion
        this.y = this.baseY + Math.sin(this.time * 3) * this.amplitude;

        // Keep within bounds
        const minY = 50;
        const maxY = canvas.height - 140;
        this.y = Math.max(minY, Math.min(maxY, this.y));

        // Patrol
        if (this.x <= this.patrolStart || this.x >= this.patrolEnd) {
            this.direction *= -1;
        }
    }

    handleCollision(player) {
        player.takeDamage();
    }

    draw() {
        ctx.save();
        ctx.translate(-game.cameraX, 0);

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

        ctx.restore();
    }
}

// Ninja Enemy (must be shot with pepperoni)
class Ninja extends Enemy {
    constructor(x, y) {
        super('ninja', x, y);
        this.color = '#000';
        this.shootTimer = Math.random() * 120 + 60;
        this.patrolStart = x - 80;
        this.patrolEnd = x + 80;
    }

    update() {
        super.update();

        // Patrol on platform
        if (this.x <= this.patrolStart || this.x >= this.patrolEnd) {
            this.direction *= -1;
        }

        this.shootTimer--;
        if (this.shootTimer <= 0) {
            const distToPlayer = Math.abs(this.x - player.x);
            if (distToPlayer < 400) {
                enemyProjectiles.push(new Shuriken(this.x, this.y + this.height / 2, this.direction));
                this.shootTimer = Math.random() * 180 + 120;
            } else {
                this.shootTimer = 60;
            }
        }
    }

    handleCollision(player) {
        player.takeDamage();
    }

    draw() {
        ctx.save();
        ctx.translate(-game.cameraX, 0);

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

        ctx.restore();
    }
}

// Shuriken Projectile
class Shuriken {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.speed = 4;
        this.direction = direction;
        this.active = true;
        this.rotation = 0;
    }

    update() {
        this.x += this.speed * this.direction;
        this.rotation += 0.2;

        if (this.x < game.cameraX - 100 || this.x > game.cameraX + canvas.width + 100) {
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
        ctx.translate(-game.cameraX, 0);
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
const platforms = [];
const enemies = [];
const projectiles = [];
const enemyProjectiles = [];
const powerUps = [];

// Level System
const levels = {
    1: {
        name: "Pizza Delivery Begins",
        platformCount: 15,
        platformSpacing: [250, 300],
        enemyDensity: 0.5, // Multiplier for enemy spawning
        powerUpDensity: 0.35,
        safeZone: 800,
        worldWidth: 5000
    },
    2: {
        name: "The Kitchen Gauntlet",
        platformCount: 20,
        platformSpacing: [200, 280],
        enemyDensity: 0.8,
        powerUpDensity: 0.3,
        safeZone: 600,
        worldWidth: 6000
    },
    3: {
        name: "Ninja Territory",
        platformCount: 25,
        platformSpacing: [180, 250],
        enemyDensity: 1.0,
        powerUpDensity: 0.25,
        safeZone: 400,
        worldWidth: 7000
    }
};

let currentLevel = 1;

// Get current level configuration
function getCurrentLevelConfig() {
    return levels[currentLevel] || levels[1];
}

// Load next level
function loadNextLevel() {
    currentLevel++;
    if (!levels[currentLevel]) {
        // No more levels, loop back or show victory
        currentLevel = 1;
    }
    generateLevel();
}

// Generate level
function generateLevel() {
    const levelConfig = getCurrentLevelConfig();
    platforms.length = 0;
    enemies.length = 0;
    powerUps.length = 0;

    // Update world width based on level
    game.worldWidth = levelConfig.worldWidth;

    // Create platforms - start after safe zone
    let x = levelConfig.safeZone;
    for (let i = 0; i < levelConfig.platformCount; i++) {
        const y = Math.random() * 180 + 120;
        const width = Math.random() * 150 + 120;
        platforms.push(new Platform(x, y, width));

        // Spawn enemies on platforms - scaled by difficulty
        if (i > 2) {
            if (Math.random() < 0.25 * levelConfig.enemyDensity) {
                // Ninja on platform
                enemies.push(new Ninja(x + width / 2, y - 35));
            }

            if (Math.random() < 0.15 * levelConfig.enemyDensity) {
                // Teenager on platform
                enemies.push(new Teenager(x + width / 2, y - 35));
            }

            if (Math.random() < 0.1 * levelConfig.enemyDensity) {
                // Mutant near platform
                enemies.push(new Mutant(x + width / 2, y - 60));
            }
        }

        // Power-ups on platforms
        if (Math.random() < levelConfig.powerUpDensity) {
            powerUps.push(new PowerUp(x + width / 2 - 12, y - 40, 'pepperoni'));
        }

        const minSpacing = levelConfig.platformSpacing[0];
        const maxSpacing = levelConfig.platformSpacing[1];
        x += Math.random() * (maxSpacing - minSpacing) + minSpacing;
    }

    // Ground enemies - spaced out, starting after initial safe zone
    // First 2 enemies just past safe zone
    const firstEnemyX = levelConfig.safeZone + 100;
    enemies.push(new Turtle(firstEnemyX));
    enemies.push(new Teenager(firstEnemyX + 200));

    // Then gradually add more enemies in sections scaled by density
    const groundEnemyCount = Math.floor(10 * levelConfig.enemyDensity);
    for (let i = 0; i < groundEnemyCount; i++) {
        const sectionStart = levelConfig.safeZone + 600 + (i * 350);
        const x = sectionStart + Math.random() * 300;
        const rand = Math.random();

        if (rand < 0.5) {
            enemies.push(new Turtle(x));
        } else if (rand < 0.8) {
            enemies.push(new Teenager(x));
        } else {
            enemies.push(new Mutant(x));
        }
    }

    // Ground power-ups - spaced throughout
    const powerUpCount = Math.floor(12 * levelConfig.powerUpDensity);
    for (let i = 0; i < powerUpCount; i++) {
        const x = levelConfig.safeZone - 100 + (i * 400) + Math.random() * 200;
        powerUps.push(new PowerUp(x, canvas.height - 180, 'pepperoni'));
    }

    console.log(`Level ${currentLevel} generated: ${levelConfig.name}`);
    console.log(`Platforms: ${platforms.length}, Enemies: ${enemies.length}, Power-ups: ${powerUps.length}`);
}

// Draw Ground
function drawGround() {
    ctx.save();
    ctx.translate(-game.cameraX, 0);

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - 100, game.worldWidth, 100);

    // Grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, canvas.height - 105, game.worldWidth, 5);

    ctx.restore();
}

// Draw Background
function drawBackground() {
    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - 100);

    // Clouds (parallax)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const cloudOffset = game.cameraX * 0.3;
    for (let i = 0; i < 10; i++) {
        const x = ((i * 400 - cloudOffset) % (game.worldWidth + 400));
        ctx.beginPath();
        ctx.arc(x, 50 + (i % 3) * 40, 20, 0, Math.PI * 2);
        ctx.arc(x + 20, 50 + (i % 3) * 40, 25, 0, Math.PI * 2);
        ctx.arc(x + 40, 50 + (i % 3) * 40, 20, 0, Math.PI * 2);
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

// Update Pepperonis Display
function updatePepperonis() {
    document.getElementById('pepperonis').textContent = player.pepperonis;
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
    game.frameCount = 0;
    game.cameraX = 0;

    enemies.length = 0;
    projectiles.length = 0;
    enemyProjectiles.length = 0;
    powerUps.length = 0;

    player.x = 300;
    player.y = canvas.height - 180;
    player.velocityX = 0;
    player.velocityY = 0;
    player.grounded = false;
    player.charging = false;
    player.invulnerable = false;
    player.pepperonis = 10;

    generateLevel();

    updateScore();
    updateLives();
    updatePepperonis();

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

    // Draw platforms
    platforms.forEach(platform => platform.draw());

    // Update and draw power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.update();
        powerUp.draw();

        if (!powerUp.active) {
            powerUps.splice(i, 1);
        }
    }

    // Update and draw player
    player.update();
    player.draw();

    // Update and draw enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
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

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        keys.left = true;
    }

    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        keys.right = true;
    }

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
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
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keys.left = false;
    }

    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keys.right = false;
    }

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
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
    shoot: null,
    left: null,
    right: null
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
    }, { passive: false });

    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (game.running && onRelease) onRelease();
    }, { passive: false });

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

// Setup touch controls - function to initialize buttons
function initializeTouchControls() {
    console.log('Initializing touch controls...');

    setupTouchButton('leftBtn', () => {
        console.log('Left button pressed');
        keys.left = true;
    }, () => {
        keys.left = false;
    });

    setupTouchButton('rightBtn', () => {
        console.log('Right button pressed');
        keys.right = true;
    }, () => {
        keys.right = false;
    });

    setupTouchButton('jumpBtn', () => {
        console.log('Jump button pressed');
        if (!keys.space) {
            keys.space = true;
            player.jump();
        }
    }, () => {
        keys.space = false;
    });

    setupTouchButton('chargeBtn', () => {
        console.log('Charge button pressed');
        if (!keys.shift) {
            keys.shift = true;
            player.charge();
        }
    }, () => {
        keys.shift = false;
        player.stopCharge();
    });

    setupTouchButton('shootBtn', () => {
        console.log('Shoot button pressed');
        if (!keys.f) {
            keys.f = true;
            player.shoot();
        }
    }, () => {
        keys.f = false;
    });

    console.log('Touch controls initialized');
}

// Initialize game
function initializeGame() {
    console.log('Initializing game...');

    // Setup restart button
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            resetGame();
            game.running = true;
            gameLoop();
        });
    }

    // Setup touch controls
    initializeTouchControls();

    // Initialize UI
    document.getElementById('highScore').textContent = game.highScore;
    updateScore();
    updateLives();
    updatePepperonis();

    // Generate level
    generateLevel();

    // Start game
    game.running = true;
    gameLoop();

    console.log('Game started!');
}

// Wait for DOM to be ready, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    // DOM is already loaded
    initializeGame();
}
