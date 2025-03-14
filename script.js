// Open-Meteo API configuration
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// Oslo coordinates
const OSLO_LAT = 59.91;
const OSLO_LON = 10.75;

// DOM elements
const locationElement = document.getElementById('location');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const humidityElement = document.getElementById('humidity');
const windElement = document.getElementById('wind');

// Format hour from ISO string
function formatHour(isoString) {
    const date = new Date(isoString);
    return date.getHours().toString().padStart(2, '0') + ':00';
}

// Convert weather code to description
function getWeatherDescription(code) {
    const weatherCodes = {
        0: 'clear sky',
        1: 'mainly clear',
        2: 'partly cloudy',
        3: 'overcast',
        45: 'foggy',
        48: 'depositing rime fog',
        51: 'light drizzle',
        53: 'moderate drizzle',
        55: 'dense drizzle',
        61: 'slight rain',
        63: 'moderate rain',
        65: 'heavy rain',
        71: 'slight snow',
        73: 'moderate snow',
        75: 'heavy snow',
        77: 'snow grains',
        80: 'slight rain showers',
        81: 'moderate rain showers',
        82: 'violent rain showers',
        85: 'slight snow showers',
        86: 'heavy snow showers',
        95: 'thunderstorm',
        96: 'thunderstorm with slight hail',
        99: 'thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'unknown';
}

// Create hourly temperature display
function createHourlyDisplay(container, times, temperatures) {
    const hourlyHtml = times.map((time, index) => `
        <div class="hour-block">
            <div class="time">${formatHour(time)}</div>
            <div class="temp">${Math.round(temperatures[index])}°C</div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="hourly-container">
            <h3>Hourly Forecast</h3>
            <div class="hourly-scroll">
                ${hourlyHtml}
            </div>
        </div>
    `;
}

// Get location name using reverse geocoding
async function getLocationName(lat, lon) {
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const data = await response.json();
        return data.city || data.locality || 'Unknown Location';
    } catch (error) {
        console.error('Error getting location name:', error);
        return 'Unknown Location';
    }
}

// Fetch weather data
async function getWeatherForecast(lat, lon, locationName = null) {
    try {
        // Construct tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Fetch forecast with hourly data
        const response = await fetch(
            `${BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,relative_humidity_2m_max&timezone=auto&start_date=${tomorrowStr}&end_date=${tomorrowStr}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // Update daily UI with weather data
        const maxTemp = data.daily.temperature_2m_max[0];
        const minTemp = data.daily.temperature_2m_min[0];
        const avgTemp = (maxTemp + minTemp) / 2;
        
        temperatureElement.textContent = Math.round(avgTemp);
        descriptionElement.textContent = getWeatherDescription(data.daily.weathercode[0]);
        windElement.textContent = `${Math.round(data.daily.windspeed_10m_max[0])} km/h`;
        
        if (data.daily.relative_humidity_2m_max) {
            humidityElement.textContent = `${data.daily.relative_humidity_2m_max[0]}%`;
        } else {
            humidityElement.textContent = 'N/A';
        }

        // Set location name
        if (!locationName) {
            locationName = await getLocationName(lat, lon);
        }
        locationElement.textContent = locationName;

        // Create hourly display
        const weatherCard = document.querySelector('.weather-card');
        createHourlyDisplay(weatherCard, data.hourly.time, data.hourly.temperature_2m);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        locationElement.textContent = 'Error loading weather data';
        temperatureElement.textContent = '--';
        descriptionElement.textContent = 'Unable to load forecast';
        humidityElement.textContent = '--';
        windElement.textContent = '--';
    }
}

// Get user's location
function getUserLocation() {
    if (navigator.geolocation) {
        locationElement.textContent = 'Detecting location...';
        navigator.geolocation.getCurrentPosition(
            position => {
                getWeatherForecast(position.coords.latitude, position.coords.longitude);
                // Update button state
                document.getElementById('locationToggle').textContent = 'Show Oslo Weather';
            },
            error => {
                console.error('Error getting location:', error);
                // Fallback to Oslo
                getWeatherForecast(OSLO_LAT, OSLO_LON, 'Oslo, Norway');
                document.getElementById('locationToggle').textContent = 'Use My Location';
            }
        );
    } else {
        locationElement.textContent = 'Geolocation is not supported';
        // Fallback to Oslo
        getWeatherForecast(OSLO_LAT, OSLO_LON, 'Oslo, Norway');
    }
}

// Toggle between Oslo and user location
function toggleLocation() {
    const button = document.getElementById('locationToggle');
    if (button.textContent === 'Use My Location') {
        getUserLocation();
    } else {
        getWeatherForecast(OSLO_LAT, OSLO_LON, 'Oslo, Norway');
        button.textContent = 'Use My Location';
    }
}

// Create location toggle button
function createLocationToggle() {
    const container = document.querySelector('.container');
    const button = document.createElement('button');
    button.id = 'locationToggle';
    button.className = 'location-toggle';
    button.textContent = 'Use My Location';
    button.onclick = toggleLocation;
    container.insertBefore(button, container.firstChild);
}

// Initialize the app
createLocationToggle();
getWeatherForecast(OSLO_LAT, OSLO_LON, 'Oslo, Norway');

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

        return (
            birdRect.right > topPipeRect.left &&
            birdRect.left < topPipeRect.right &&
            (birdRect.top < topPipeRect.bottom ||
             birdRect.bottom > bottomPipeRect.top)
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