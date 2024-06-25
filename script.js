const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gravity = 9.807; // gravidade da Terra em m/s²
const pixelsPerMeter = 100; // Escala para converter metros para pixels
const timeStep = 1 / 60; // 60 frames por segundo
const mergeThreshold = 5; // número de colisões antes da fusão

let mergeCount = {}; // objeto para contar as colisões entre pares de bolas
let mergeTimeout = null; // timeout para a explosão da bola mesclada

class Ball {
    constructor(x, y, radius, color, mass) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.mass = mass;
        this.vx = Math.random() * 4 - 2; // velocidade horizontal inicial
        this.vy = 0; // velocidade vertical inicial
        this.dragging = false;
        this.mergeCountdown = 0; // contador para fusão
        this.merged = false; // indica se a bola foi mesclada
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() {
        if (!this.dragging) {
            this.vy += gravity * timeStep; // Aplicando a gravidade

            this.x += this.vx;
            this.y += this.vy * pixelsPerMeter * timeStep;

            // Verificação de colisão com as bordas do canvas
            if (this.y + this.radius > canvas.height) {
                this.y = canvas.height - this.radius;
                this.vy = -this.vy * 0.8; // coeficiente de restituição
            }

            if (this.y - this.radius < 0) {
                this.y = this.radius;
                this.vy = -this.vy * 0.8;
            }

            if (this.x + this.radius > canvas.width) {
                this.x = canvas.width - this.radius;
                this.vx = -this.vx;
            }

            if (this.x - this.radius < 0) {
                this.x = this.radius;
                this.vx = -this.vx;
            }

            // Verificação de colisão com outras bolas
            balls.forEach(ball => {
                if (ball !== this && !ball.merged) {
                    const dist = Math.hypot(this.x - ball.x, this.y - ball.y);
                    if (dist <= this.radius + ball.radius) {
                        // Colisão elástica entre as bolas
                        const angle = Math.atan2(ball.y - this.y, ball.x - this.x);
                        const u1 = this.vx * Math.cos(angle) + this.vy * Math.sin(angle);
                        const u2 = ball.vx * Math.cos(angle) + ball.vy * Math.sin(angle);

                        const m1 = this.mass;
                        const m2 = ball.mass;
                        const v1 = (u1 * (m1 - m2) + 2 * m2 * u2) / (m1 + m2);
                        const v2 = (u2 * (m2 - m1) + 2 * m1 * u1) / (m1 + m2);

                        this.vx = v1 * Math.cos(angle);
                        this.vy = v1 * Math.sin(angle);
                        ball.vx = v2 * Math.cos(angle);
                        ball.vy = v2 * Math.sin(angle);

                        // Evita que as bolas fiquem presas uma na outra
                        const overlap = this.radius + ball.radius - dist;
                        this.x -= overlap * Math.cos(angle);
                        this.y -= overlap * Math.sin(angle);

                        // Contagem de colisões entre as bolas
                        const pairKey = `${balls.indexOf(this)}_${balls.indexOf(ball)}`;
                        if (!mergeCount[pairKey]) {
                            mergeCount[pairKey] = 1;
                        } else {
                            mergeCount[pairKey]++;
                            if (mergeCount[pairKey] >= mergeThreshold) {
                                this.mergeWith(ball);
                                delete mergeCount[pairKey];
                            }
                        }
                    }
                }
            });
        }

        this.draw();
    }

    mergeWith(otherBall) {
        // Fusão das bolas
        const newRadius = Math.sqrt(this.radius * this.radius + otherBall.radius * otherBall.radius);
        this.radius = newRadius;
        
        // Mistura de cores
        const mixedColor = mixColors(this.color, otherBall.color);

        // Atualização da bola
        this.color = mixedColor;
        this.mass += otherBall.mass;

        // Marcar a outra bola como mesclada e parar de atualizá-la
        otherBall.merged = true;

        // Iniciar a contagem regressiva para a explosão
        this.startMergeTimeout();
    }

    startMergeTimeout() {
        clearTimeout(mergeTimeout);
        mergeTimeout = setTimeout(() => {
            this.explode();
        }, 3000);
    }

    explode() {
        // Redefinir a bola mesclada para suas bolas originais
        balls.forEach(ball => {
            if (ball !== this && ball.merged) {
                ball.radius = ball.originalRadius;
                ball.color = ball.originalColor;
                ball.merged = false;
            }
        });

        // Redefinir variáveis de controle
        mergeCount = {};
        clearTimeout(mergeTimeout);
    }
}

// Função para misturar cores
function mixColors(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    const mixedColor = {
        r: Math.floor((rgb1.r + rgb2.r) / 2),
        g: Math.floor((rgb1.g + rgb2.g) / 2),
        b: Math.floor((rgb1.b + rgb2.b) / 2)
    };

    return rgbToHex(mixedColor);
}

// Funções auxiliares para conversão de cores
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function rgbToHex(rgb) {
    return `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1)}`;
}

const balls = [
    new Ball(100, 100, 30, '#1c3240', 0.2), // red
    new Ball(200, 150, 40, '#378c4b', 0.3), // blue
    new Ball(300, 200, 20, '#50bf61', 0.1), // green
    new Ball(400, 250, 50, '#f2ca50', 0.45), // yellow
    new Ball(500, 300, 35, '#f23839', 0.25) // purple
];

// Salvar os valores originais da bola para restaurar após a explosão
balls.forEach(ball => {
    ball.originalRadius = ball.radius;
    ball.originalColor = ball.color;
});

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    balls.forEach(ball => {
        ball.update();
    });
}

canvas.addEventListener('mousedown', (e) => {
    balls.forEach(ball => {
        const dist = Math.hypot(ball.x - e.clientX, ball.y - e.clientY);
        if (dist < ball.radius) {
            ball.dragging = true;
            canvas.addEventListener('mousemove', onMouseMove);
        }
    });
});

canvas.addEventListener('mouseup', () => {
    balls.forEach(ball => {
        ball.dragging = false;
    });
    canvas.removeEventListener('mousemove', onMouseMove);
});

function onMouseMove(e) {
    balls.forEach(ball => {
        if (ball.dragging) {
            ball.x = e.clientX;
            ball.y = e.clientY;
        }
    });
}

canvas.addEventListener('click', (e) => {
    balls.forEach(ball => {
        const dist = Math.hypot(ball.x - e.clientX, ball.y - e.clientY);
        if (dist < ball.radius && !ball.dragging) {
            ball.vy = -Math.sqrt(2 * gravity * pixelsPerMeter * ball.mass) / 2; // Make the ball bounce up with controlled force
        }
    });
});

animate();
