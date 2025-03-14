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

        // Camera UI elements
        this.cameraButton = document.getElementById('cameraButton');
        this.cameraUI = document.getElementById('cameraUI');
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.snapButton = document.getElementById('snapButton');
        this.retakeButton = document.getElementById('retakeButton');
        this.usePhotoButton = document.getElementById('usePhotoButton');
        this.cancelButton = document.getElementById('cancelButton');
        
        // Camera stream
        this.stream = null;
        
        // Initialize camera functionality
        this.initializeCamera();
        
        // Handle resize and orientation changes
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('orientationchange', this.handleResize);
        
        // Initial size setup
        this.handleResize();
        
        this.init();
    }

    init() {
        this.bird.style.top = `${this.birdY}px`;
        this.highScoreElement.textContent = `High Score: ${this.highScore}`;
        
        // Improved touch and keyboard controls
        const handleStart = (e) => {
            e.preventDefault();
            if (!this.isGameRunning) {
                this.startGame();
            }
            this.jump();
        };

        // Space key for desktop
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                handleStart(e);
            }
        });

        // Improved touch event handling for Samsung devices
        const touchHandler = (e) => {
            e.preventDefault();
            // Ignore touches on UI elements
            if (e.target.closest('.camera-button') || e.target.closest('.camera-ui')) {
                return;
            }
            handleStart(e);
        };

        // Add touch events with passive: false for better performance
        document.addEventListener('touchstart', touchHandler, { passive: false });
        
        // Prevent scrolling and bouncing on Samsung browsers
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Handle visibility change (when app goes to background)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isGameRunning) {
                this.pauseGame();
            }
        });

        // Check for saved photo
        const savedPhoto = localStorage.getItem('birdPhoto');
        if (savedPhoto) {
            this.bird.style.backgroundImage = `url(${savedPhoto})`;
            this.bird.style.backgroundSize = 'cover';
            this.bird.style.backgroundPosition = 'center';
        }
    }

    startGame() {
        // Fix for Samsung browser fullscreen
        if (window.innerWidth <= 480 || window.innerHeight <= 480) {
            const gameContainer = document.querySelector('.game-container');
            
            // Try different fullscreen methods
            const requestFullscreen = () => {
                if (gameContainer.requestFullscreen) {
                    gameContainer.requestFullscreen().catch(() => {});
                } else if (gameContainer.webkitRequestFullscreen) {
                    gameContainer.webkitRequestFullscreen().catch(() => {});
                } else if (gameContainer.mozRequestFullScreen) {
                    gameContainer.mozRequestFullScreen().catch(() => {});
                }
            };

            // Request fullscreen on user interaction
            requestFullscreen();
        }

        // Force a resize event to ensure correct dimensions
        window.dispatchEvent(new Event('resize'));

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

    pauseGame() {
        if (this.isGameRunning) {
            this.isGameRunning = false;
            clearInterval(this.createPipeInterval);
            cancelAnimationFrame(this.gameLoop);
        }
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
            pipe.x -= this.gameSpeed;
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

    initializeCamera() {
        // Camera button click handler
        this.cameraButton.addEventListener('click', () => {
            this.startCamera();
        });

        // Snap photo button click handler
        this.snapButton.addEventListener('click', () => {
            this.takePhoto();
        });

        // Retake photo button click handler
        this.retakeButton.addEventListener('click', () => {
            this.retakePhoto();
        });

        // Use photo button click handler
        this.usePhotoButton.addEventListener('click', () => {
            this.usePhoto();
        });

        // Cancel button click handler
        this.cancelButton.addEventListener('click', () => {
            this.stopCamera();
        });
    }

    async startCamera() {
        try {
            // Try to get the environment-facing camera first on mobile
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
            } catch (err) {
                // If environment camera fails, fall back to user-facing camera
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
            }

            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', ''); // Prevent fullscreen on iOS
            this.video.setAttribute('autoplay', '');
            await this.video.play(); // Explicitly start playing

            this.cameraUI.classList.remove('hidden');
            this.canvas.classList.add('hidden');
            this.snapButton.classList.remove('hidden');
            this.retakeButton.classList.add('hidden');
            this.usePhotoButton.classList.add('hidden');
            this.video.classList.remove('hidden');
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Unable to access camera. Please make sure you have granted camera permissions and are using a supported browser.');
        }
    }

    takePhoto() {
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Flip the context horizontally to counter the preview mirror
        context.scale(-1, 1);
        context.translate(-this.canvas.width, 0);
        
        // Draw the video frame
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Reset the transformation
        context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Hide video and show canvas
        this.video.classList.add('hidden');
        this.canvas.classList.remove('hidden');
        
        // Update button visibility
        this.snapButton.classList.add('hidden');
        this.retakeButton.classList.remove('hidden');
        this.usePhotoButton.classList.remove('hidden');
    }

    retakePhoto() {
        // Show video and hide canvas
        this.video.classList.remove('hidden');
        this.canvas.classList.add('hidden');
        
        // Update button visibility
        this.snapButton.classList.remove('hidden');
        this.retakeButton.classList.add('hidden');
        this.usePhotoButton.classList.add('hidden');
    }

    usePhoto() {
        const context = this.canvas.getContext('2d');
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        
        // Set dimensions to match the face guide
        tempCanvas.width = 200;
        tempCanvas.height = 260;
        
        // Calculate the source coordinates to center the face
        const sourceX = (this.canvas.width - tempCanvas.width) / 2;
        const sourceY = (this.canvas.height - tempCanvas.height) / 2;
        
        // Draw the original photo onto the temporary canvas
        tempContext.drawImage(this.canvas, 
            sourceX, sourceY, tempCanvas.width, tempCanvas.height,
            0, 0, tempCanvas.width, tempCanvas.height
        );
        
        // Create a path for the face shape
        tempContext.globalCompositeOperation = 'destination-in';
        tempContext.beginPath();
        
        // Draw the face shape (matching the guide shape)
        const width = tempCanvas.width;
        const height = tempCanvas.height;
        
        tempContext.moveTo(0, height * 0.4); // Start at left middle
        
        // Left side curve
        tempContext.bezierCurveTo(
            0, height * 0.1,  // Control point 1
            width * 0.2, 0,   // Control point 2
            width * 0.5, 0    // End point (top middle)
        );
        
        // Right side curve
        tempContext.bezierCurveTo(
            width * 0.8, 0,   // Control point 1
            width, height * 0.1,   // Control point 2
            width, height * 0.4    // End point (right middle)
        );
        
        // Bottom curve
        tempContext.bezierCurveTo(
            width, height * 0.7,   // Control point 1
            width * 0.8, height,   // Control point 2
            width * 0.5, height    // End point (bottom middle)
        );
        
        // Complete the shape
        tempContext.bezierCurveTo(
            width * 0.2, height,   // Control point 1
            0, height * 0.7,   // Control point 2
            0, height * 0.4    // Back to start
        );
        
        tempContext.closePath();
        tempContext.fill();
        
        // Reset composite operation
        tempContext.globalCompositeOperation = 'source-over';
        
        // Create a new image from the cropped canvas
        const photoURL = tempCanvas.toDataURL('image/png');
        const birdImage = new Image();
        birdImage.src = photoURL;
        
        // When the image loads, update the bird element's background
        birdImage.onload = () => {
            this.bird.style.backgroundImage = `url(${photoURL})`;
            this.bird.style.backgroundSize = 'contain';
            this.bird.style.backgroundPosition = 'center';
            
            // Store the photo URL in localStorage for persistence
            localStorage.setItem('birdPhoto', photoURL);
        };
        
        // Close the camera UI
        this.stopCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.cameraUI.classList.add('hidden');
        this.video.srcObject = null;
    }

    handleResize() {
        // Update game dimensions
        this.gameWidth = this.game.offsetWidth;
        this.gameHeight = this.game.offsetHeight;
        
        // Calculate scale factor to maintain game proportions
        const scale = Math.min(
            window.innerWidth / this.gameWidth,
            window.innerHeight / this.gameHeight
        );
        
        // Adjust pipe gap based on screen height
        this.pipeGap = Math.min(150, this.gameHeight * 0.25);
        
        // Adjust bird position
        if (!this.isGameRunning) {
            this.birdY = this.gameHeight / 2;
            this.bird.style.top = `${this.birdY}px`;
        }
        
        // Update pipe positions and heights
        this.pipes.forEach(pipe => {
            const topHeight = parseInt(pipe.top.style.height);
            pipe.bottom.style.height = `${this.gameHeight - topHeight - this.pipeGap}px`;
        });

        // Adjust game speed based on screen width
        const baseSpeed = 3;
        const speedScale = this.gameWidth / 500; // Base width reference
        this.gameSpeed = baseSpeed * Math.min(speedScale, 1.5);

        // Update mountain animation speed
        document.querySelector('.mountain-range').style.animation = 
            `moveMountains ${60 / this.gameSpeed}s linear infinite`;
    }
}

// Start the game
new FlappyBird(); 