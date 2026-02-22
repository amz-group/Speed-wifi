const startBtn = document.getElementById('start-btn');
const liveSpeed = document.getElementById('live-speed');
const statusText = document.getElementById('status-text');
const needleGroup = document.getElementById('needle-group');
const trackFill = document.getElementById('track-fill');
const cardDl = document.getElementById('card-dl');
const cardUl = document.getElementById('card-ul');
const finalDl = document.getElementById('final-dl');
const finalUl = document.getElementById('final-ul');

const dlUrl = "https://speed.cloudflare.com/__down?bytes=25000000";
const ulUrl = "https://speed.cloudflare.com/__up";

const ARC_LENGTH = 330;

let totalBytes = 0;
let intervalId = null;

function startTest() {
    startBtn.disabled = true;
    resetUI();
    runPhase('download');
}

function resetUI() {
    finalDl.innerText = "--";
    finalUl.innerText = "--";
    liveSpeed.innerText = "0";
    updateGauge(0);
    cardDl.classList.remove('active-dl');
    cardUl.classList.remove('active-ul');
    statusText.style.color = "var(--text-muted)";
    statusText.innerText = "Initializing...";
}

function updateGauge(speed) {
    let percent = speed / 100;
    if (percent > 1) percent = 1;

    const deg = percent * 270;
    needleGroup.style.transform = `rotate(${deg}deg)`;

    const offset = ARC_LENGTH - (percent * ARC_LENGTH);
    trackFill.style.strokeDashoffset = offset;
}

function setPhase(type) {
    const isDL = type === 'download';
    const color = isDL ? 'var(--cyan)' : 'var(--purple)';
    const grad = isDL ? 'url(#gradient-dl)' : 'url(#gradient-ul)';

    statusText.innerText = isDL ? "Downloading..." : "Uploading...";
    statusText.style.color = color;
    trackFill.style.stroke = grad;
    trackFill.style.filter = `drop-shadow(0 0 10px ${color})`;

    if (isDL) cardDl.classList.add('active-dl');
    else cardUl.classList.add('active-ul');
}

function runPhase(type) {
    const isDownload = type === 'download';
    setPhase(type);

    totalBytes = 0;
    const startTime = performance.now();

    // Safety timeout
    const safety = setTimeout(() => {
        if (totalBytes === 0) {
            clearInterval(intervalId);
            statusText.innerText = "Connection Failed";
            startBtn.disabled = false;
        }
    }, 6000);

    // Threads
    for (let i = 0; i < 4; i++) {
        if (isDownload) downloadStream();
        else uploadStream();
    }

    intervalId = setInterval(() => {
        const duration = (performance.now() - startTime) / 1000;
        if (duration > 0.1 && totalBytes > 0) {
            clearTimeout(safety);
            const speed = (totalBytes * 8 / duration / 1000000);
            liveSpeed.innerText = speed.toFixed(0);
            updateGauge(speed);
        }
    }, 100);

    setTimeout(() => {
        clearInterval(intervalId);
        const duration = (performance.now() - startTime) / 1000;
        const finalSpeed = (totalBytes * 8 / duration / 1000000).toFixed(1);

        if (isDownload) {
            finalDl.innerText = finalSpeed;
            cardDl.classList.remove('active-dl');
            updateGauge(0);
            setTimeout(() => runPhase('upload'), 800);
        } else {
            finalUl.innerText = finalSpeed;
            cardUl.classList.remove('active-ul');
            finishTest();
        }
    }, isDownload ? 6000 : 8000);
}

async function downloadStream() {
    try {
        const response = await fetch(dlUrl + "&r=" + Math.random());
        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.length;
        }
    } catch (e) { }
}

function uploadStream() {
    const data = "a".repeat(1024 * 1024);
    const loop = () => {
        fetch(ulUrl, { method: 'POST', mode: 'no-cors', body: data })
            .then(() => { totalBytes += data.length; loop(); })
            .catch(() => loop());
    };
    loop();
}

function finishTest() {
    statusText.innerText = "Completed";
    statusText.style.color = "#fff";
    trackFill.style.filter = "none";
    liveSpeed.innerText = "0";
    updateGauge(0);
    startBtn.disabled = false;
    startBtn.innerText = "Run Again";
}