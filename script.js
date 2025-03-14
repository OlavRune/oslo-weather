class FlappyBird {
    constructor() {
        this.game = document.getElementById('game');
        this.bird = document.getElementById('bird');
        this.scoreElement = document.getElementById('score');
        this.startMessage = document.getElementById('start-message');
        this.gameOverScreen = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.highScoreElement = document.getElementById('high-score');

        this.gameWidth = this.game.offsetWidth;
        this.gameHeight = this.game.offsetHeight;
        this.birdY = this.gameHeight / 2;
        this.birdVelocity = 0;
        this.gravity = 0.5;
        this.jumpForce = -10;
        this.pipeGap = 150;
        this.pipeWidth = 60;
        this.pipeInterval = 1500;
        this.pipes = [];
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
        this.isGameRunning = false;
        this.gameLoop = null;

        this.init();
    }

    init() {
        this.bird.style.top = `${this.birdY}px`;
        this.highScoreElement.textContent = `High Score: ${this.highScore}`;
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!this.isGameRunning) {
                    this.startGame();
                }
                this.jump();
            }
        });

        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.isGameRunning) {
                this.startGame();
            }
            this.jump();
        });
    }

    startGame() {
        this.isGameRunning = true;
        this.score = 0;
        this.birdY = this.gameHeight / 2;
        this.birdVelocity = 0;
        this.pipes = [];
        this.scoreElement.textContent = '0';
        this.startMessage.classList.add('hidden');
        this.gameOverScreen.classList.remove('visible');
        
        // Clear existing pipes
        Array.from(document.getElementsByClassName('pipe')).forEach(pipe => pipe.remove());
        
        // Start game loops
        this.gameLoop = requestAnimationFrame(() => this.update());
        this.createPipeInterval = setInterval(() => this.createPipe(), this.pipeInterval);
    }

    jump() {
        this.birdVelocity = this.jumpForce;
    }

    createPipe() {
        const pipeHeight = Math.random() * (this.gameHeight - this.pipeGap - 100) + 50;
        const topPipe = document.createElement('div');
        const bottomPipe = document.createElement('div');

        topPipe.className = 'pipe pipe-top';
        bottomPipe.className = 'pipe pipe-bottom';

        topPipe.style.height = `${pipeHeight}px`;
        topPipe.style.left = `${this.gameWidth}px`;
        
        bottomPipe.style.height = `${this.gameHeight - pipeHeight - this.pipeGap}px`;
        bottomPipe.style.left = `${this.gameWidth}px`;
        bottomPipe.style.bottom = '0';

        this.game.appendChild(topPipe);
        this.game.appendChild(bottomPipe);

        this.pipes.push({
            top: topPipe,
            bottom: bottomPipe,
            x: this.gameWidth,
            counted: false
        });
    }

    update() {
        if (!this.isGameRunning) return;

        // Update bird position
        this.birdVelocity += this.gravity;
        this.birdY += this.birdVelocity;
        this.bird.style.top = `${this.birdY}px`;
        this.bird.style.transform = `translateY(-50%) rotate(${this.birdVelocity * 2}deg)`;

        // Update pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= 3;
            pipe.top.style.left = `${pipe.x}px`;
            pipe.bottom.style.left = `${pipe.x}px`;

            // Score counting
            if (!pipe.counted && pipe.x < 50 - this.pipeWidth) {
                this.score++;
                this.scoreElement.textContent = this.score;
                pipe.counted = true;
            }

            // Remove pipes that are off screen
            if (pipe.x < -this.pipeWidth) {
                this.game.removeChild(pipe.top);
                this.game.removeChild(pipe.bottom);
                this.pipes.splice(i, 1);
            }

            // Collision detection
            if (this.checkCollision(pipe)) {
                this.gameOver();
                return;
            }
        }

        // Check if bird hits boundaries
        if (this.birdY < 0 || this.birdY > this.gameHeight) {
            this.gameOver();
            return;
        }

        this.gameLoop = requestAnimationFrame(() => this.update());
    }

    checkCollision(pipe) {
        const birdRect = this.bird.getBoundingClientRect();
        const topPipeRect = pipe.top.getBoundingClientRect();
        const bottomPipeRect = pipe.bottom.getBoundingClientRect();

        // Make collision box much smaller, focused on the upper body
        const collisionBox = {
            left: birdRect.left + 20,
            right: birdRect.right - 20,
            top: birdRect.top + 15,
            bottom: birdRect.top + 45  // Only check upper body area
        };

        return (
            // Check collision with top pipe
            (collisionBox.right > topPipeRect.left &&
             collisionBox.left < topPipeRect.right &&
             collisionBox.top < topPipeRect.bottom) ||
            // Check collision with bottom pipe
            (collisionBox.right > bottomPipeRect.left &&
             collisionBox.left < bottomPipeRect.right &&
             collisionBox.bottom > bottomPipeRect.top)
        );
    }

    gameOver() {
        this.isGameRunning = false;
        clearInterval(this.createPipeInterval);
        cancelAnimationFrame(this.gameLoop);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('flappyHighScore', this.highScore);
        }

        this.finalScoreElement.textContent = `Score: ${this.score}`;
        this.highScoreElement.textContent = `High Score: ${this.highScore}`;
        this.gameOverScreen.classList.add('visible');
    }
}

// Start the game
new FlappyBird(); 