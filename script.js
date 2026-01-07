/* ================= CONFIGURAÇÃO INICIAL ================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da UI
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Estado do Jogo
let gameActive = false;
let score = 0;
let lives = 3;
let frames = 0; // Contador de frames para spawn de inimigos
let difficultyMultiplier = 1;

// Inputs
const keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, s: false, a: false, d: false,
    " ": false // Espaço
};

/* ================= CLASSES ================= */

// Classe da Nave do Jogador
class Player {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 100;
        this.speed = 7;
        this.color = '#4ecca3'; // Ciano
        this.cooldown = 0; // Tempo entre tiros
    }

    draw() {
        // Desenha a nave (triângulo estilizado)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y); // Ponta
        ctx.lineTo(this.x + this.width, this.y + this.height); // Direita
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 10); // Centro baixo (cavidade)
        ctx.lineTo(this.x, this.y + this.height); // Esquerda
        ctx.closePath();
        ctx.fill();

        // Efeito de propulsor (fogo)
        if (gameActive) {
            ctx.fillStyle = `rgba(255, 165, 0, ${Math.random()})`; // Laranja piscando
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2 - 5, this.y + this.height - 5);
            ctx.lineTo(this.x + this.width / 2 + 5, this.y + this.height - 5);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height + 15 + Math.random() * 10);
            ctx.fill();
        }
    }

    update() {
        // Movimento Horizontal
        if ((keys.ArrowRight || keys.d) && this.x + this.width < canvas.width) {
            this.x += this.speed;
        }
        if ((keys.ArrowLeft || keys.a) && this.x > 0) {
            this.x -= this.speed;
        }
        // Movimento Vertical
        if ((keys.ArrowDown || keys.s) && this.y + this.height < canvas.height) {
            this.y += this.speed;
        }
        if ((keys.ArrowUp || keys.w) && this.y > 0) {
            this.y -= this.speed;
        }

        // Atirar
        if (keys[" "]) {
            if (this.cooldown <= 0) {
                projectiles.push(new Projectile(this.x + this.width / 2, this.y));
                this.cooldown = 15; // Delay de 15 frames entre tiros
            }
        }
        if (this.cooldown > 0) this.cooldown--;
    }
}

// Classe do Tiro
class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.speed = 10;
        this.color = '#ffff00'; // Amarelo
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    update() {
        this.y -= this.speed;
    }
}

// Classe do Inimigo
class Enemy {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height; // Começa fora da tela (em cima)
        
        // Dificuldade: velocidade aumenta levemente com o score
        this.speed = (Math.random() * 2 + 2) + (score * 0.05); 
        
        // Cores aleatórias para variedade
        const colors = ['#e94560', '#ff6b6b', '#c70039'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    draw() {
        // Desenha inimigo (quadrado com detalhes)
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Olhos/Detalhes
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 10, this.y + 20, 5, 5);
        ctx.fillRect(this.x + 25, this.y + 20, 5, 5);
    }

    update() {
        this.y += this.speed;
    }
}

// Classe para Partículas (Explosões)
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.color = color;
        this.life = 100; // Vida útil da partícula
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 2; // Desaparece aos poucos
    }
    draw() {
        ctx.globalAlpha = this.life / 100;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

// Classe para Estrelas de Fundo
class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speed = Math.random() * 3 + 0.5;
    }
    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }
    draw() {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

/* ================= GERENCIAMENTO ================= */

let player = new Player();
let projectiles = [];
let enemies = [];
let particles = [];
let stars = [];

// Criar estrelas iniciais
for(let i=0; i<50; i++) stars.push(new Star());

function initGame() {
    score = 0;
    lives = 3;
    frames = 0;
    projectiles = [];
    enemies = [];
    particles = [];
    player = new Player(); // Reseta posição
    
    // Atualiza UI
    scoreEl.innerText = score;
    livesEl.innerText = lives;

    gameActive = true;
    animate();
}

function spawnEnemies() {
    // Taxa de spawn baseada na dificuldade. 
    // Começa a cada 60 frames (1 seg), diminui conforme ganha pontos (mínimo 20 frames)
    let spawnRate = 60 - Math.floor(score / 5);
    if (spawnRate < 20) spawnRate = 20;

    if (frames % spawnRate === 0) {
        enemies.push(new Enemy());
    }
}

function checkCollisions() {
    // Tiros acertando Inimigos
    projectiles.forEach((proj, pIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (
                proj.x > enemy.x && 
                proj.x < enemy.x + enemy.width &&
                proj.y > enemy.y && 
                proj.y < enemy.y + enemy.height
            ) {
                // Criar explosão
                for(let i=0; i<8; i++) {
                    particles.push(new Particle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color));
                }

                // Remover elementos e dar pontos
                enemies.splice(eIndex, 1);
                projectiles.splice(pIndex, 1);
                score++;
                scoreEl.innerText = score;
            }
        });
    });

    // Inimigos acertando Jogador
    enemies.forEach((enemy, index) => {
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            enemies.splice(index, 1);
            loseLife();
        }
    });
}

function loseLife() {
    lives--;
    livesEl.innerText = lives;
    
    // Efeito visual de dano na tela
    canvas.style.border = "2px solid red";
    setTimeout(() => canvas.style.border = "2px solid #4ecca3", 200);

    // Explosão no player
    for(let i=0; i<15; i++) {
        particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#4ecca3'));
    }

    if (lives <= 0) {
        endGame();
    }
}

function endGame() {
    gameActive = false;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.add('active');
}

/* ================= LOOP PRINCIPAL ================= */

function animate() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa tela

    // Atualiza Fundo
    stars.forEach(star => { star.update(); star.draw(); });

    // Atualiza Player
    player.update();
    player.draw();

    // Atualiza Projéteis
    projectiles.forEach((proj, index) => {
        proj.update();
        proj.draw();
        // Remove se sair da tela
        if (proj.y < 0) projectiles.splice(index, 1);
    });

    // Atualiza Inimigos
    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();
        // Se passar da tela, remove e perde vida (opcional, aqui só remove)
        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
        }
    });

    // Atualiza Partículas
    particles.forEach((part, index) => {
        part.update();
        part.draw();
        if (part.life <= 0) particles.splice(index, 1);
    });

    spawnEnemies();
    checkCollisions();
    
    frames++;
    requestAnimationFrame(animate);
}

/* ================= EVENT LISTENERS ================= */

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

startBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    initGame();
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('active');
    initGame();
});
