document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;
            const target = document.querySelector(targetId);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const chartCanvas = document.getElementById('ppgChart');
    const rhythmSelect = document.getElementById('rhythmSelect');
    const statusDot = document.getElementById('statusDot');

    if (!chartCanvas || !rhythmSelect || !statusDot) {
        return;
    }

    let currentRhythm = rhythmSelect.value;
    let phase = 0;
    let phaseStep = 0.15;
    let beatCount = 0;
    let ppgData = Array.from({ length: 160 }, (_, index) => 22 + Math.sin(index / 9) * 6);
    let chartInstance = null;

    function setStatusColor() {
        statusDot.className = 'status-indicator';
        if (currentRhythm === 'normal') statusDot.classList.add('status-normal');
        if (currentRhythm === 'afib') statusDot.classList.add('status-afib');
        if (currentRhythm === 'pvc') statusDot.classList.add('status-pvc');
    }

    function initChart() {
        if (typeof Chart !== 'undefined') {
            const ctx = chartCanvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, 0, chartCanvas.height || 300);
            gradient.addColorStop(0, 'rgba(2, 132, 199, 0.2)');
            gradient.addColorStop(1, 'rgba(2, 132, 199, 0)');

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array.from({ length: ppgData.length }, (_, i) => i),
                    datasets: [{
                        label: 'Filtered PPG Output',
                        data: ppgData,
                        borderColor: '#0284c7',
                        backgroundColor: gradient,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        fill: true,
                        tension: 0.4,
                        cubicInterpolationMode: 'monotone'
                    }]
                },
                options: {
                    responsive: true,
                    animation: false,
                    interaction: { intersect: false },
                    maintainAspectRatio: false,
                    scales: {
                        x: { display: false },
                        y: { min: 0, max: 100, border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8' } }
                    },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } }
                }
            });
            return true;
        }

        return false;
    }

    function drawFallbackChart() {
        const context = chartCanvas.getContext('2d');
        const width = chartCanvas.clientWidth || 800;
        const height = chartCanvas.clientHeight || 260;
        const ratio = window.devicePixelRatio || 1;

        chartCanvas.width = Math.floor(width * ratio);
        chartCanvas.height = Math.floor(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        context.strokeStyle = '#e2e8f0';
        context.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }

        context.beginPath();
        ppgData.forEach((value, index) => {
            const x = (index / (ppgData.length - 1)) * width;
            const y = height - ((value - 0) / 100) * (height - 12) - 6;
            if (index === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        });

        context.strokeStyle = '#0284c7';
        context.lineWidth = 2.5;
        context.shadowColor = 'rgba(2, 132, 199, 0.2)';
        context.shadowBlur = 10;
        context.stroke();
        context.shadowBlur = 0;
    }

    function refreshChart() {
        if (chartInstance && typeof Chart !== 'undefined') {
            chartInstance.data.labels = Array.from({ length: ppgData.length }, (_, i) => i);
            chartInstance.data.datasets[0].data = ppgData;
            chartInstance.update();
            return;
        }
        drawFallbackChart();
    }

    rhythmSelect.addEventListener('change', (e) => {
        currentRhythm = e.target.value;
        setStatusColor();
    });

    setStatusColor();
    const usesChartJs = initChart();

    function generateWaveformStep() {
        phase += phaseStep;

        if (phase >= Math.PI * 2) {
            phase -= Math.PI * 2;
            beatCount++;

            if (currentRhythm === 'normal') {
                phaseStep = 0.15;
            } else if (currentRhythm === 'afib') {
                phaseStep = 0.10 + Math.random() * 0.12;
            } else if (currentRhythm === 'pvc') {
                if (beatCount % 4 === 3) {
                    phaseStep = 0.25;
                } else if (beatCount % 4 === 0) {
                    phaseStep = 0.08;
                } else {
                    phaseStep = 0.15;
                }
            }
        }

        const isPVC = currentRhythm === 'pvc' && beatCount % 4 === 3;
        let pulse = 20;

        if (isPVC) {
            pulse += Math.exp(-Math.pow(phase - Math.PI, 2) * 4) * 65;
        } else {
            const ampMod = currentRhythm === 'afib' ? (0.7 + Math.random() * 0.4) : 1;
            const systolic = Math.exp(-Math.pow(phase - Math.PI / 1.5, 2) * 8) * 45 * ampMod;
            const dicrotic = Math.exp(-Math.pow(phase - Math.PI * 1.2, 2) * 6) * 15 * ampMod;
            pulse += systolic + dicrotic;
        }

        const noise = (Math.random() - 0.5) * 2.2;
        ppgData.push(pulse + noise);
        if (ppgData.length > 180) {
            ppgData.shift();
        }
    }

    setInterval(() => {
        generateWaveformStep();
        refreshChart();
    }, 45);

    window.addEventListener('resize', () => {
        if (!usesChartJs && chartInstance === null) {
            drawFallbackChart();
        }
    });
});