class FlappyBird {
    constructor() {
        this.game = document.getElementById('game');
        this.bird = document.getElementById('bird');
        this.scoreElement = document.getElementById('score');
        this.startMessage = document.getElementById('start-message');
        this.gameOverScreen = document.getElementById('game-over');
        this.finalScoreElement = document.getElementById('final-score');
        this.highScoreElement = document.getElementById('high-score');

        // Custom notification elements
        this.customNotification = document.getElementById('custom-notification');
        this.notificationContent = document.querySelector('.notification-content');
        this.notificationClose = document.querySelector('.notification-close');
        
        // Setup notification close button
        if (this.notificationClose) {
            this.notificationClose.addEventListener('click', () => {
                this.hideNotification();
            });
        }

        // Detect Samsung browser
        this.isSamsungBrowser = navigator.userAgent.match(/SamsungBrowser/i) !== null;

        this.gameWidth = this.game.offsetWidth;
        this.gameHeight = this.game.offsetHeight;
        this.birdY = this.gameHeight / 2;
        this.birdVelocity = 0;
        
        // Use consistent physics values regardless of device
        this.gravity = 0.5;
        this.jumpForce = -10;
        this.pipeGap = 180;
        this.pipeWidth = 60;
        this.pipeInterval = 1500;
        this.baseSpeed = 3;
        
        this.pipes = [];
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
        this.isGameRunning = false;
        this.gameLoop = null;
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.gameSpeed = this.baseSpeed;

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
            // Don't prevent default for all touches - only for game area touches
            
            // Check if the touch is on a button or UI element
            // More comprehensive check for UI elements
            const target = e.target;
            const isUIElement = 
                target.id === 'cameraButton' || 
                target.closest('#cameraButton') ||
                target.closest('.camera-ui') || 
                target.closest('.button-container') ||
                target.tagName === 'BUTTON';
            
            if (isUIElement) {
                // Allow default behavior for UI elements
                console.log('Touch on UI element detected, allowing default behavior');
                return;
            }
            
            // Only prevent default for game area touches
            e.preventDefault();
            handleStart(e);
        };

        // Add touch events with passive: false for better performance
        document.addEventListener('touchstart', touchHandler, { passive: false });
        
        // Only prevent scrolling on game area, not on UI elements
        document.addEventListener('touchmove', (e) => {
            // Don't prevent scrolling on UI elements
            if (e.target.closest('.camera-ui') || e.target.closest('.button-container')) {
                return;
            }
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
        // Modified to ensure more centered pipe openings
        // Limit the range of possible pipe heights to keep openings more centered
        const minHeight = this.gameHeight * 0.1; // Minimum 10% of screen height
        const maxHeight = this.gameHeight * 0.6; // Maximum 60% of screen height
        
        const pipeHeight = minHeight + Math.random() * (maxHeight - minHeight);
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

        // Calculate delta time for smooth animations
        const currentTime = performance.now();
        if (!this.lastFrameTime) this.lastFrameTime = currentTime;
        
        // Calculate actual time elapsed since last frame in milliseconds
        const elapsed = currentTime - this.lastFrameTime;
        
        // Normalize to a factor based on 60fps (16.67ms per frame)
        // This ensures consistent physics regardless of frame rate or device
        this.deltaTime = elapsed / 16.67;
        
        this.lastFrameTime = currentTime;

        // Update bird position with delta time
        this.birdVelocity += this.gravity * this.deltaTime;
        this.birdY += this.birdVelocity * this.deltaTime;
        this.bird.style.top = `${this.birdY}px`;
        this.bird.style.transform = `translateY(-50%) rotate(${this.birdVelocity * 2}deg)`;

        // Update pipes with delta time
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.gameSpeed * this.deltaTime;
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

        // Make collision box even smaller for more forgiving gameplay
        const collisionBox = {
            left: birdRect.left + 25,  // Increased from 20
            right: birdRect.right - 25, // Increased from 20
            top: birdRect.top + 20,    // Increased from 15
            bottom: birdRect.top + 40  // Reduced from 45
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
            console.log('Camera button clicked');
            this.startCamera();
        });
        
        // Add explicit touch event for mobile devices
        this.cameraButton.addEventListener('touchend', (e) => {
            console.log('Camera button touched');
            e.preventDefault(); // Prevent any default behavior
            e.stopPropagation(); // Stop event from bubbling up
            this.startCamera();
        }, { passive: false });

        // Snap photo button click handler
        this.snapButton.addEventListener('click', () => {
            console.log('Snap button clicked');
            this.takePhoto();
        });
        
        // Add touch event for snap button
        this.snapButton.addEventListener('touchend', (e) => {
            console.log('Snap button touched');
            e.preventDefault();
            e.stopPropagation();
            this.takePhoto();
        }, { passive: false });

        // Retake photo button click handler
        this.retakeButton.addEventListener('click', () => {
            this.retakePhoto();
        });
        
        // Add touch event for retake button
        this.retakeButton.addEventListener('touchend', (e) => {
            console.log('Retake button touched');
            e.preventDefault();
            e.stopPropagation();
            this.retakePhoto();
        }, { passive: false });

        // Use photo button click handler
        this.usePhotoButton.addEventListener('click', () => {
            this.usePhoto();
        });
        
        // Add touch event for use photo button
        this.usePhotoButton.addEventListener('touchend', (e) => {
            console.log('Use photo button touched');
            e.preventDefault();
            e.stopPropagation();
            this.usePhoto();
        }, { passive: false });

        // Cancel button click handler
        this.cancelButton.addEventListener('click', () => {
            this.stopCamera();
        });
        
        // Add touch event for cancel button
        this.cancelButton.addEventListener('touchend', (e) => {
            console.log('Cancel button touched');
            e.preventDefault();
            e.stopPropagation();
            this.stopCamera();
        }, { passive: false });
        
        // Check if we have a stored photo
        const storedPhoto = localStorage.getItem('birdPhoto');
        if (storedPhoto) {
            this.bird.style.backgroundImage = `url(${storedPhoto})`;
            this.bird.style.backgroundSize = 'contain';
            this.bird.style.backgroundPosition = 'center';
        }
    }

    async startCamera() {
        console.log('Starting camera...');
        
        // Pause the game if it's running
        if (this.isGameRunning) {
            this.pauseGame();
        }
        
        // Show camera UI with animation first
        console.log('Showing camera UI...');
        this.cameraUI.style.display = 'flex';
        // Force a reflow
        void this.cameraUI.offsetWidth;
        // Now remove the hidden class to trigger the transition
        this.cameraUI.classList.remove('hidden');
        this.cameraUI.classList.remove('visually-hidden');
        
        try {
            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported');
            }
            
            // Try to get the user-facing camera first for selfies
            try {
                // Simplified constraints for better mobile compatibility
                const constraints = {
                    video: { facingMode: 'user' }
                };
                
                this.stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Camera accessed successfully');
            } catch (err) {
                console.error('Error accessing camera:', err);
                
                // If first attempt fails, try with even simpler constraints
                console.log('Trying with simpler constraints...');
                
                try {
                    this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    console.log('Camera accessed with basic constraints');
                } catch (fallbackErr) {
                    console.error('Error accessing camera with fallback:', fallbackErr);
                    throw fallbackErr; // Re-throw to be caught by the outer catch
                }
            }

            console.log('Setting up video stream...');
            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', ''); 
            this.video.setAttribute('autoplay', '');
            this.video.muted = true;
            
            // Wait for video to be ready
            console.log('Waiting for video metadata...');
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    console.log('Video metadata loaded');
                    resolve();
                };
                
                // Add a timeout in case metadata event never fires
                setTimeout(resolve, 1000);
            });
            
            console.log('Playing video...');
            try {
                await this.video.play();
                console.log('Video playing');
                
                // Show camera UI elements
                this.canvas.classList.add('hidden');
                this.snapButton.classList.remove('hidden');
                this.retakeButton.classList.add('hidden');
                this.usePhotoButton.classList.add('hidden');
                this.video.classList.remove('hidden');
                
                // Add face guide animation
                const faceGuide = document.querySelector('.face-guide');
                if (faceGuide) {
                    faceGuide.style.animation = 'pulse 2s infinite';
                }
                
                // Add helper text
                const faceGuideText = document.querySelector('.face-guide-text');
                if (faceGuideText) {
                    faceGuideText.textContent = 'Position your face in the outline and smile!';
                }
            } catch (playErr) {
                console.error('Error playing video:', playErr);
                throw playErr;
            }
            
        } catch (err) {
            console.error('Camera access failed:', err);
            
            // If camera access fails, show a notification
            this.showNotification('Camera access failed. Please check your camera permissions and try again.');
            
            // Close the camera UI
            this.stopCamera();
        }
    }

    takePhoto() {
        const context = this.canvas.getContext('2d');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Draw the video frame
        context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Hide video and show canvas
        this.video.classList.add('hidden');
        this.canvas.classList.remove('hidden');
        
        // Update button visibility
        this.snapButton.classList.add('hidden');
        this.retakeButton.classList.remove('hidden');
        this.usePhotoButton.classList.remove('hidden');
        
        // Update guide text
        const faceGuideText = document.querySelector('.face-guide-text');
        faceGuideText.textContent = 'How does it look? Use this photo or take another one.';
    }

    retakePhoto() {
        // Show video and hide canvas
        this.video.classList.remove('hidden');
        this.canvas.classList.add('hidden');
        
        // Update button visibility
        this.snapButton.classList.remove('hidden');
        this.retakeButton.classList.add('hidden');
        this.usePhotoButton.classList.add('hidden');
        
        // Update guide text
        const faceGuideText = document.querySelector('.face-guide-text');
        faceGuideText.textContent = 'Position your face in the outline and smile!';
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
        
        // Draw a more natural face shape
        tempContext.moveTo(width * 0.5, 0); // Top middle
        
        // Right side curve
        tempContext.bezierCurveTo(
            width * 0.75, 0,      // Control point 1
            width, height * 0.25, // Control point 2
            width, height * 0.5   // End point (right middle)
        );
        
        // Bottom right curve
        tempContext.bezierCurveTo(
            width, height * 0.75,      // Control point 1
            width * 0.75, height,      // Control point 2
            width * 0.5, height        // End point (bottom middle)
        );
        
        // Bottom left curve
        tempContext.bezierCurveTo(
            width * 0.25, height,      // Control point 1
            0, height * 0.75,          // Control point 2
            0, height * 0.5            // End point (left middle)
        );
        
        // Top left curve
        tempContext.bezierCurveTo(
            0, height * 0.25,          // Control point 1
            width * 0.25, 0,           // Control point 2
            width * 0.5, 0             // Back to start (top middle)
        );
        
        tempContext.closePath();
        tempContext.fill();
        
        // Reset composite operation
        tempContext.globalCompositeOperation = 'source-over';
        
        // Create a new image from the cropped canvas
        const photoURL = tempCanvas.toDataURL('image/png');
        const birdImage = new Image();
        birdImage.src = photoURL;
        
        // Show a loading indicator
        this.bird.style.backgroundImage = 'none';
        this.bird.textContent = 'Loading...';
        
        // When the image loads, update the bird element's background
        birdImage.onload = () => {
            this.bird.textContent = '';
            this.bird.style.backgroundImage = `url(${photoURL})`;
            this.bird.style.backgroundSize = 'contain';
            this.bird.style.backgroundPosition = 'center';
            
            // Store the photo URL in localStorage for persistence
            localStorage.setItem('birdPhoto', photoURL);
            
            // No success message - just close the camera UI
        };
        
        // Close the camera UI
        this.stopCamera();
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // First add the visually-hidden class to trigger the transition
        this.cameraUI.classList.add('visually-hidden');
        
        // After the transition completes, add the hidden class
        setTimeout(() => {
            this.cameraUI.classList.add('hidden');
            this.cameraUI.style.display = 'none';
            this.video.srcObject = null;
        }, 300); // Match this to the transition duration in CSS
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
        
        // Adjust pipe gap based on screen height - increased minimum and percentage
        this.pipeGap = Math.min(180, this.gameHeight * 0.3);
        
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

        // Adjust game speed based on screen width but keep it consistent
        const speedScale = this.gameWidth / 500; // Base width reference
        this.gameSpeed = this.baseSpeed * Math.min(speedScale, 1.2);
        
        // Update mountain animation speed consistently
        document.querySelector('.mountain-range').style.animation = 
            `moveMountains ${60 / this.gameSpeed}s linear infinite`;
    }

    // Custom notification method to replace browser alerts
    showNotification(message) {
        if (!this.customNotification || !this.notificationContent) return;
        
        // Set notification content
        this.notificationContent.textContent = message;
        
        // Show notification with animation
        this.customNotification.style.display = 'block';
        // Force a reflow
        void this.customNotification.offsetWidth;
        // Remove hidden class to trigger transition
        this.customNotification.classList.remove('hidden');
        this.customNotification.classList.remove('visually-hidden');
    }
    
    hideNotification() {
        if (!this.customNotification) return;
        
        // Hide with animation
        this.customNotification.classList.add('visually-hidden');
        
        // After animation completes, add hidden class
        setTimeout(() => {
            this.customNotification.classList.add('hidden');
        }, 300);
    }
}

// Start the game
new FlappyBird(); 