const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de UI
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('final-score');
const powerStatusEl = document.getElementById('powerup-status');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Variáveis do Jogo
let gameActive = false;
let score = 0;
let lives = 3;
let frames = 0;

// Inputs
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, " ": false };

// Sistema de áudio (Sintetizador)
// Cria sons usando Web Audio API para não precisar de arquivos externos
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const SoundFX = {
    playShoot: () => {
        if (!gameActive) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    playExplosion: () => {
        if (!gameActive) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    },
    playPowerUp: () => {
        if (!gameActive) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
};

// Classes das Entidades do Jogo

class Player {
    constructor() {
        this.width = 40; this.height = 40;
        this.x = canvas.width / 2 - 20; this.y = canvas.height - 100;
        this.speed = 7;
        this.color = '#4ecca3';
        this.cooldown = 0;

        // Estados dos PowerUps
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.doubleShotActive = false;
        this.doubleShotTimer = 0;
    }

    draw() {
        // Escudo Visual
        if (this.shieldActive) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + 20, this.y + 20, 35, 0, Math.PI * 2);
            ctx.stroke();
            // Efeito piscante quando acaba
            if (this.shieldTimer < 100 && frames % 10 === 0) ctx.strokeStyle = 'transparent';
        }

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y);
        ctx.lineTo(this.x + 40, this.y + 40);
        ctx.lineTo(this.x + 20, this.y + 30);
        ctx.lineTo(this.x, this.y + 40);
        ctx.closePath();
        ctx.fill();
    }

    update() {
        // Movimento
        if (keys.ArrowRight && this.x + 40 < canvas.width) this.x += this.speed;
        if (keys.ArrowLeft && this.x > 0) this.x -= this.speed;
        if (keys.ArrowDown && this.y + 40 < canvas.height) this.y += this.speed;
        if (keys.ArrowUp && this.y > 0) this.y -= this.speed;

        // Atirar
        if (keys[" "]) {
            if (this.cooldown <= 0) {
                SoundFX.playShoot();
                if (this.doubleShotActive) {
                    projectiles.push(new Projectile(this.x + 5, this.y));
                    projectiles.push(new Projectile(this.x + 35, this.y));
                } else {
                    projectiles.push(new Projectile(this.x + 20, this.y));
                }
                this.cooldown = 15;
            }
        }
        if (this.cooldown > 0) this.cooldown--;

        // Timer dos PowerUps
        if (this.shieldActive) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) { 
                this.shieldActive = false; 
                updatePowerUpUI(); 
            }
        }
        if (this.doubleShotActive) {
            this.doubleShotTimer--;
            if (this.doubleShotTimer <= 0) { 
                this.doubleShotActive = false; 
                updatePowerUpUI();
            }
        }
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = 700; // Aprox 7 segundos
        updatePowerUpUI("ESCUDO ATIVO");
    }

    activateDoubleShot() {
        this.doubleShotActive = true;
        this.doubleShotTimer = 650; // Aprox 10 segundos
        updatePowerUpUI("TIRO DUPLO");
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 4; this.speed = 10;
        this.color = '#ffff00';
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
    }
    update() { this.y -= this.speed; }
}

class EnemyProjectile {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 5; this.speed = 6;
        this.color = '#ff00ff';
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
    }
    update() { this.y += this.speed; }
}

class Enemy {
    constructor(type = 'basic') {
        this.width = 40; this.height = 40;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.type = type;
        
        if (type === 'shooter') {
            this.speed = 2; // Mais lento
            this.color = '#9b59b6';
            this.shootTimer = 60; // Começa a atirar após 1s
        } else {
            this.speed = (Math.random() * 2 + 2) + (score * 0.02);
            this.color = '#e94560';
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        // Desenha diferente baseado no tipo
        if (this.type === 'shooter') {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#fff'; // Detalhe arma
            ctx.fillRect(this.x + 15, this.y + 30, 10, 10);
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Olhos
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 10, this.y + 20, 5, 5);
            ctx.fillRect(this.x + 25, this.y + 20, 5, 5);
        }
    }

    update() {
        this.y += this.speed;

        // Lógica de atirar (Shooter)
        if (this.type === 'shooter') {
            this.shootTimer--;
            if (this.shootTimer <= 0) {
                enemyProjectiles.push(new EnemyProjectile(this.x + 20, this.y + 40));
                this.shootTimer = 120; // Atira a cada 2 segundos
            }
        }
    }
}

class PowerUp {
    constructor() {
        this.size = 25;
        this.x = Math.random() * (canvas.width - this.size);
        this.y = -this.size;
        this.speed = 3;
        
        const types = ['health', 'shield', 'double'];
        this.type = types[Math.floor(Math.random() * types.length)];
    }

    draw() {
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        
        if (this.type === 'health') {
            ctx.fillText("💚", this.x, this.y);
        } else if (this.type === 'shield') {
            ctx.fillText("🛡️", this.x, this.y);
        } else if (this.type === 'double') {
            ctx.fillText("⚡", this.x, this.y);
        }
    }

    update() {
        this.y += this.speed;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 4 - 2; this.speedY = Math.random() * 4 - 2;
        this.color = color; this.life = 100;
    }
    update() { this.x += this.speedX; this.y += this.speedY; this.life -= 2; }
    draw() {
        ctx.globalAlpha = this.life / 100;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

// Variáveis globais do jogo

let player = new Player();
let projectiles = [];
let enemyProjectiles = [];
let enemies = [];
let powerUps = [];
let particles = [];

function initGame() {
    score = 0; lives = 3; frames = 0;
    projectiles = []; enemyProjectiles = []; enemies = []; powerUps = []; particles = [];
    player = new Player();
    
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    updatePowerUpUI("");
    
    // Inicia AudioContext se estiver suspenso
    if (audioCtx.state === 'suspended') audioCtx.resume();

    gameActive = true;
    animate();
}

function updatePowerUpUI(text = "") {
    powerStatusEl.innerText = text;
}

function spawnEntities() {
    // Inimigos
    let spawnRate = 60 - Math.floor(score / 10);
    if (spawnRate < 25) spawnRate = 25;

    if (frames % spawnRate === 0) {
        // 20% de chance de nascer um Shooter
        const type = Math.random() < 0.2 ? 'shooter' : 'basic';
        enemies.push(new Enemy(type));
    }

    // Power Ups (Raros - a cada ~10 segundos)
    if (frames % 600 === 0 && Math.random() > 0.3) {
        powerUps.push(new PowerUp());
    }
}

function checkCollisions() {
    // 1. Tiros do Player acertando Inimigos
    projectiles.forEach((proj, pIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (rectCollision(proj.x, proj.y, 4, 4, enemy.x, enemy.y, enemy.width, enemy.height)) {
                SoundFX.playExplosion();
                createExplosion(enemy.x, enemy.y, enemy.color);
                enemies.splice(eIndex, 1);
                projectiles.splice(pIndex, 1);
                score++;
                scoreEl.innerText = score;
            }
        });
    });

    // 2. Inimigos acertando Player
    enemies.forEach((enemy, index) => {
        if (rectCollision(player.x, player.y, player.width, player.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
            enemies.splice(index, 1);
            loseLife();
        }
    });

    // 3. Tiros Inimigos acertando Player
    enemyProjectiles.forEach((proj, index) => {
        if (rectCollision(proj.x, proj.y, 4, 4, player.x, player.y, player.width, player.height)) {
            enemyProjectiles.splice(index, 1);
            loseLife();
        }
    });

    // 4. Player pegando PowerUps
    powerUps.forEach((pup, index) => {
        // Distância simples para texto
        const dist = Math.hypot(player.x - pup.x, player.y - pup.y);
        if (dist < 40) {
            SoundFX.playPowerUp();
            applyPowerUp(pup.type);
            powerUps.splice(index, 1);
        }
    });
}

function rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x2 < x1 + w1 && x2 + w2 > x1 && y2 < y1 + h1 && y2 + h2 > y1;
}

function applyPowerUp(type) {
    if (type === 'health') {
        lives++;
        livesEl.innerText = lives;
        updatePowerUpUI("VIDA EXTRA!");
        setTimeout(() => updatePowerUpUI(""), 2000);
    } else if (type === 'shield') {
        player.activateShield();
    } else if (type === 'double') {
        player.activateDoubleShot();
    }
}

function loseLife() {
    if (player.shieldActive) return; // Escudo protege

    lives--;
    livesEl.innerText = lives;
    SoundFX.playExplosion();
    
    createExplosion(player.x, player.y, 'red');
    canvas.style.border = "2px solid red";
    setTimeout(() => canvas.style.border = "2px solid #4ecca3", 200);

    if (lives <= 0) endGame();
}

function createExplosion(x, y, color) {
    for(let i=0; i<8; i++) {
        particles.push(new Particle(x + 20, y + 20, color));
    }
}

function endGame() {
    gameActive = false;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');
}

function animate() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Atualiza e desenha todas as entidades
    player.update();
    player.draw();

    projectiles.forEach((p, i) => {
        p.update(); p.draw();
        if (p.y < 0) projectiles.splice(i, 1);
    });

    enemyProjectiles.forEach((p, i) => {
        p.update(); p.draw();
        if (p.y > canvas.height) enemyProjectiles.splice(i, 1);
    });

    enemies.forEach((e, i) => {
        e.update(); e.draw();
        if (e.y > canvas.height) enemies.splice(i, 1);
    });

    powerUps.forEach((p, i) => {
        p.update(); p.draw();
        if (p.y > canvas.height) powerUps.splice(i, 1);
    });

    particles.forEach((p, i) => {
        p.update(); p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    });

    spawnEntities();
    checkCollisions();
    
    frames++;
    requestAnimationFrame(animate);
}

// Controles
window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

document.getElementById('start-btn').addEventListener('click', () => {
    startScreen.classList.remove('active');
    initGame();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    initGame();
});