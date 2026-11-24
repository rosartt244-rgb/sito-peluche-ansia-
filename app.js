/**
 * RESPIRO CALMO - LOGICA DI INTERAZIONE E SINTESI AUDIO
 * Contiene la gestione del battito cardiaco 3D (Web Audio API),
 * del timer degli esercizi e delle transizioni degli stati d'ansia.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Riferimenti DOM principali
    const bpmSlider = document.getElementById('bpmSlider');
    const bpmNumber = document.getElementById('bpmNumber');
    const bpmStatusLabel = document.getElementById('bpmStatusLabel');
    const heartViewerContainer = document.getElementById('heartViewerContainer');
    const heartViewer = document.getElementById('heartViewer');
    const plushWrapper = document.getElementById('plushWrapper');
    const plushFloatingName = document.getElementById('plushFloatingName');
    
    // L'introduzione ora è in onboarding.js (scene in HTML/CSS/SVG, niente video).
    // Qui teniamo solo l'animale scelto, usato dall'immagine del peluche nell'hero.
    let selectedAnimal = 'peluche';

    let isIntroDone = false; // Flag per disabilitare la pulsazione visiva durante l'animazione d'ingresso
    let laskaName = "Miele";   // Laska è il Rifugio; il compagno ha il suo nome
    let laskaChar = "sognatore";
    let furColor = "grigio";

    // ==========================================
    // 1. MOTORE AUDIO BATTITO CARDIACO (Web Audio API)
    // ==========================================
    let audioCtx = null;
    let bpm = 120;
    let isAudioRunning = false;
    let nextBeatTime = 0.0;
    let audioSchedulerTimer = null;
    let isHeartMuted = false;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = (window.LaskaAudio && window.LaskaAudio.getContext()) || new (window.AudioContext || window.webkitAudioContext)(); // un solo AudioContext per tutto il sito
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Sintetizza un singolo battito "lub-dub"
    function playHeartbeatSound(time) {
        if (!audioCtx) return;
        if (isHeartMuted) return; // Se mutato, non riprodurre l'audio

        // 1. LUB (Primo colpo più basso e lungo)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(75, time); // Frequenza iniziale incrementata da 55Hz a 75Hz per udibilità su piccoli speaker
        osc1.frequency.exponentialRampToValueAtTime(25, time + 0.12);
        
        gain1.gain.setValueAtTime(0.001, time);
        gain1.gain.linearRampToValueAtTime(0.85, time + 0.015); // Guadagno elevato a 0.85 per maggiore impatto sonoro
        gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(time);
        osc1.stop(time + 0.12);

        // 2. DUB (Secondo colpo, poco dopo, frequenza leggermente diversa)
        const dubDelay = 0.15; // 150ms dopo
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(70, time + dubDelay); // Frequenza incrementata da 50Hz a 70Hz
        osc2.frequency.exponentialRampToValueAtTime(20, time + dubDelay + 0.14);
        
        gain2.gain.setValueAtTime(0.001, time + dubDelay);
        gain2.gain.linearRampToValueAtTime(0.65, time + dubDelay + 0.015);
        gain2.gain.exponentialRampToValueAtTime(0.001, time + dubDelay + 0.14);
        
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(time + dubDelay);
        osc2.stop(time + dubDelay + 0.14);
    }

    // Schedulatore ad alta precisione per l'audio e sincronizzazione visiva
    function scheduler() {
        while (nextBeatTime < audioCtx.currentTime + 0.1) {
            playHeartbeatSound(nextBeatTime);
            scheduleVisualPulse(nextBeatTime);
            nextBeatTime += 60.0 / bpm;
        }
        audioSchedulerTimer = setTimeout(scheduler, 25);
    }

    function startAudioEngine() {
        initAudio();
        if (isAudioRunning) return;
        isAudioRunning = true;
        nextBeatTime = audioCtx.currentTime + 0.05;
        scheduler();
    }

    // Audio Tachicardia (Battito veloce per il video cuore che batte)
    let tachycardiaInterval = null;
    let tachycardiaAudioRunning = false;

    function startTachycardiaSound() {
        // Il battito dell'hero ora segue il livello di calma (calm.js): niente più 145 BPM fissi
        if (window.LaskaCalm) { window.LaskaCalm.onHomeEnter(); return; }
        initAudio();
        if (tachycardiaAudioRunning) return;
        tachycardiaAudioRunning = true;

        const tachyBpm = 145; // 145 BPM - frequenza di tachicardia
        const intervalMs = (60 / tachyBpm) * 1000;

        function beat() {
            if (!tachycardiaAudioRunning) return;
            if (audioCtx) {
                playHeartbeatSound(audioCtx.currentTime + 0.02);
            }
            tachycardiaInterval = setTimeout(beat, intervalMs);
        }

        beat();
    }

    function stopTachycardiaSound() {
        if (window.LaskaCalm) window.LaskaCalm.onHomeLeave();
        tachycardiaAudioRunning = false;
        if (tachycardiaInterval) {
            clearTimeout(tachycardiaInterval);
            tachycardiaInterval = null;
        }
    }

    // Invia un impulso visivo al modello 3D esattamente a tempo di battito
    function scheduleVisualPulse(time) {
        if (!isIntroDone) return; // Non avviare la pulsazione visiva durante l'animazione d'ingresso
        const delay = (time - audioCtx.currentTime) * 1000;
        setTimeout(() => {
            if (heartViewer) {
                heartViewer.classList.remove('pulse-active');
                void heartViewer.offsetWidth; // Forza reflow
                heartViewer.classList.add('pulse-active');
            }
        }, Math.max(0, delay));
    }

    // ==========================================
    // 2. TRANSIZIONE INIZIALE (Ansia -> Calma)
    // ==========================================
    // ==========================================
    // 2. TRANSIZIONE INIZIALE INTERATTIVA (Respirazione guidata)
    // ==========================================
    function startIntroTransition() {
        document.body.classList.add('breathing-active');
        initInteractiveBreathing();
    }

    function initInteractiveBreathing() {
        const btnRespira = document.getElementById('btnRespira');
        const btnCalma = document.getElementById('btnCalma');
        const btnAccarezza = document.getElementById('btnAccarezza');
        const heartOrbWrapper = document.querySelector('.heart-orb-wrapper');
        const heartContainer = document.getElementById('heartViewerContainer');
        const activeRing = document.getElementById('breathingRingActive');
        const pelucheImg = document.getElementById('figmaPelucheImg');
        const statusLabel = document.getElementById('bpmStatusLabel');
        const speechText = document.getElementById('speechBubbleText');
        const yellowHeart = document.getElementById('yellowHeartImg');
        const auraGlow = document.getElementById('breathingAuraGlow');

        if (!heartContainer) return;

        let activeMode = "none"; // "respira", "calma", "accarezza"
        let isCalmAchieved = false;
        
        // Initial tachicardia setting
        bpm = 187; // Agitato (mockup)
        if (bpmNumber) bpmNumber.textContent = bpm.toString();
        if (bpmSlider) {
            bpmSlider.value = bpm;
        }

        // Speech bubble texts
        const defaultText = "Sto sognando delle stelle. Mi aiuti a trovarle?";
        if (speechText) speechText.textContent = defaultText;

        // Aura color gradients corresponding to BPM ranges
        const auraColors = [
            "radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 0) 70%)", // Agitato (red)
            "radial-gradient(circle, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0) 70%)", // Rests (orange)
            "radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(168, 85, 247, 0) 70%)", // Mid (purple)
            "radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(99, 102, 241, 0) 70%)"  // Calmo (lavender/blue)
        ];
        updateBpmVisuals(bpm); // spostata qui: prima veniva chiamata prima che auraColors esistesse

        // 1. Tab buttons click handlers
        function setActiveMode(mode) {
            if (isCalmAchieved) return;
            activeMode = mode;
            
            // Toggle active classes on buttons
            [btnRespira, btnCalma, btnAccarezza].forEach(btn => {
                if (btn) btn.classList.remove('active');
            });
            
            // Clean up old visual states
            if (heartOrbWrapper) heartOrbWrapper.classList.remove('breathing-active-ring');
            if (activeRing) activeRing.style.strokeDashoffset = 911;
            
            // Reset temp variables
            resetStrokingState();
            resetCalmaInterval();

            if (mode === "respira") {
                if (btnRespira) btnRespira.classList.add('active');
                if (heartOrbWrapper) heartOrbWrapper.classList.add('breathing-active-ring');
                if (speechText) speechText.textContent = "Tieni premuto mentre inspiri. Lascia andare quando espiri.";
            } else if (mode === "calma") {
                if (btnCalma) btnCalma.classList.add('active');
                if (speechText) speechText.textContent = "Sto sintonizzando il mio ritmo sul tuo. Respira a fondo...";
                triggerAutoCalming();
            } else if (mode === "accarezza") {
                if (btnAccarezza) btnAccarezza.classList.add('active');
                if (speechText) speechText.textContent = "Accarezzalo piano, col dito o col mouse. Più lento vai, più si calma.";
            }
        }

        if (btnRespira) btnRespira.addEventListener('click', () => setActiveMode("respira"));
        if (btnCalma) btnCalma.addEventListener('click', () => setActiveMode("calma"));
        if (btnAccarezza) btnAccarezza.addEventListener('click', () => setActiveMode("accarezza"));

        // ==========================================
        // METHOD 1: BREATHE INTERACTION (Press & Hold on Heart)
        // ==========================================
        let breathProgress = 0;
        let breathState = "idle"; // "idle", "inhaling", "exhaling"
        let lastFrameTime = 0;
        let breathCyclesCompleted = 0;
        let animationFrameId = null;

        function updateBreath(timestamp) {
            if (isCalmAchieved) return;
            if (!lastFrameTime) lastFrameTime = timestamp;
            let delta = timestamp - lastFrameTime;
            lastFrameTime = timestamp;

            if (delta > 100) delta = 16;

            if (activeMode === "respira") {
                if (breathState === "inhaling") {
                    breathProgress += delta / 4000; // 4s inhale
                    if (breathProgress >= 1) {
                        breathProgress = 1;
                        breathState = "holding";
                        if (speechText) speechText.textContent = "Ora rilascia per ESPIRARE lentamente...";
                        playFeedbackSound(440, 0.1);
                    }
                } else if (breathState === "exhaling") {
                    breathProgress -= delta / 4000; // 4s exhale
                    if (breathProgress <= 0) {
                        breathProgress = 0;
                        breathState = "idle";
                        breathCyclesCompleted++;
                        
                        let newBpm = Math.max(60, 187 - breathCyclesCompleted * 35);
                        updateBpmLevel(newBpm);

                        if (newBpm <= 60) {
                            achieveCalmState();
                            return;
                        } else {
                            if (speechText) speechText.textContent = "Tieni premuto mentre inspiri. Lascia andare quando espiri.";
                        }
                    }
                } else if (breathState === "idle" && breathProgress > 0) {
                    breathProgress -= delta / 1000;
                    if (breathProgress < 0) breathProgress = 0;
                }

                // Update active breathing ring
                if (activeRing) {
                    const offset = 911 - (breathProgress * 911);
                    activeRing.style.strokeDashoffset = offset;
                }

                // Inflate / deflate yellow heart
                if (yellowHeart) {
                    const scaleVal = 1 + (breathProgress * 0.25);
                    yellowHeart.style.transform = `scale(${scaleVal})`;
                }
            } else {
                // Decay if not in breathing mode
                if (breathProgress > 0) {
                    breathProgress -= delta / 1000;
                    if (breathProgress < 0) breathProgress = 0;
                    if (yellowHeart) {
                        const scaleVal = 1 + (breathProgress * 0.25);
                        yellowHeart.style.transform = `scale(${scaleVal})`;
                    }
                }
            }

            // fermo e sgonfio: il ciclo si riposa (prima girava a ogni fotogramma, anche col pannello nascosto)
            if (breathState === "idle" && breathProgress <= 0) { animationFrameId = null; return; }
            animationFrameId = requestAnimationFrame(updateBreath);
        }

        function handleBreatheStart(e) {
            if (isCalmAchieved || activeMode !== "respira") return;
            e.preventDefault();
            startAudioEngine();
            breathState = "inhaling";
            if (speechText) speechText.textContent = "Inspira... Senti l'espansione...";
            lastFrameTime = 0;
            if (!animationFrameId) animationFrameId = requestAnimationFrame(updateBreath);
        }

        function handleBreatheEnd() {
            if (isCalmAchieved || activeMode !== "respira") return;
            if (breathState === "inhaling") {
                breathState = "idle";
                if (speechText) speechText.textContent = "Tieni premuto mentre inspiri. Lascia andare quando espiri.";
            } else if (breathState === "holding") {
                breathState = "exhaling";
                if (speechText) speechText.textContent = "Espira lentamente... lascia andare l'ansia...";
                lastFrameTime = 0;
            }
        }

        if (heartContainer) {
            heartContainer.addEventListener('mousedown', handleBreatheStart);
            heartContainer.addEventListener('touchstart', handleBreatheStart, { passive: false });
        }
        window.addEventListener('mouseup', handleBreatheEnd);
        window.addEventListener('touchend', handleBreatheEnd);

        // ==========================================
        // METHOD 2: STROKE INTERACTION (MouseMove on Rabbit)
        // ==========================================
        let strokeProgress = 0;
        let lastX = null, lastY = null;
        let strokeCyclesCompleted = 0;

        function handleStrokeMove(e) {
            if (isCalmAchieved || activeMode !== "accarezza") return;
            startAudioEngine();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            if (lastX === null || lastY === null) {
                lastX = clientX;
                lastY = clientY;
                return;
            }

            const dx = clientX - lastX;
            const dy = clientY - lastY;
            const velocity = Math.sqrt(dx * dx + dy * dy);

            lastX = clientX;
            lastY = clientY;

            if (velocity > 0) {
                if (velocity < 35) {
                    strokeProgress += 1.2;
                    if (speechText) {
                        speechText.textContent = `Sì... così va bene, continua lentamente...`;
                    }
                    
                    if (Math.random() < 0.4) {
                        spawnStrokeSparkle(clientX, clientY);
                    }

                    if (strokeProgress >= 100) {
                        strokeProgress = 0;
                        strokeCyclesCompleted++;
                        playFeedbackSound(480, 0.1);

                        let newBpm = Math.max(60, 187 - strokeCyclesCompleted * 35);
                        updateBpmLevel(newBpm);

                        if (newBpm <= 60) {
                            achieveCalmState();
                        }
                    }
                } else {
                    // Too fast
                    strokeProgress = Math.max(0, strokeProgress - 2);
                    if (speechText) {
                        speechText.textContent = `Ahi, più piano... mi gira la testa!`;
                    }
                }
            }
        }

        function resetStrokingState() {
            strokeProgress = 0;
            lastX = null;
            lastY = null;
        }

        function spawnStrokeSparkle(cx, cy) {
            const container = document.getElementById('plushStarsContainer');
            if (!container || !pelucheImg) return;
            
            const rect = pelucheImg.getBoundingClientRect();
            const x = cx - rect.left;
            const y = cy - rect.top;

            const particle = document.createElement('span');
            particle.className = 'sparkle-particle';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.background = "#FFDF66";
            
            container.appendChild(particle);
            setTimeout(() => {
                particle.remove();
            }, 1200);
        }

        if (pelucheImg) {
            pelucheImg.addEventListener('mousemove', handleStrokeMove);
            pelucheImg.addEventListener('touchmove', handleStrokeMove, { passive: true });
            pelucheImg.addEventListener('mouseleave', resetStrokingState);
        }

        // ==========================================
        // METHOD 3: CALMA INTERACTION (Auto Deceleration)
        // ==========================================
        let calmingIntervalId = null;

        function triggerAutoCalming() {
            startAudioEngine();
            resetCalmaInterval();

            calmingIntervalId = setInterval(() => {
                if (isCalmAchieved || bpm <= 60) {
                    resetCalmaInterval();
                    if (bpm <= 60) achieveCalmState();
                    return;
                }

                let nextBpm = Math.max(60, bpm - 15);
                updateBpmLevel(nextBpm);
                playFeedbackSound(350 + (nextBpm * 0.8), 0.08);

                if (speechText) {
                    speechText.textContent = `Sto rallentando il mio battito... calmati insieme a me. (${bpm} BPM)`;
                }

                if (bpm <= 60) {
                    resetCalmaInterval();
                    achieveCalmState();
                }
            }, 1000);
        }

        function resetCalmaInterval() {
            if (calmingIntervalId) {
                clearInterval(calmingIntervalId);
                calmingIntervalId = null;
            }
        }

        // ==========================================
        // SHARED BPM UPDATES & COMPLETION
        // ==========================================
        function updateBpmLevel(newBpm) {
            bpm = newBpm;
            if (bpmNumber) bpmNumber.textContent = bpm.toString();
            if (bpmSlider) bpmSlider.value = bpm;
            updateBpmVisuals(bpm);
        }

        function updateBpmVisuals(bpmVal) {
            // Adjust CSS beat-duration variable
            const durationSec = 60.0 / bpmVal;
            if (heartContainer) {
                heartContainer.style.setProperty('--beat-duration', `${durationSec}s`);
            }
            updateBreathingSpeed(bpmVal);
            updatePlushState(bpmVal);

            // Background Aura colors
            const stepIndex = Math.min(3, Math.floor((187 - bpmVal) / 42));
            if (auraGlow) {
                auraGlow.style.background = auraColors[stepIndex];
            }

            if (statusLabel) {
                if (bpmVal > 150) {
                    statusLabel.textContent = `${laskaName} è ancora inquieto`;
                    statusLabel.style.color = "#EF4444";
                } else if (bpmVal > 100) {
                    statusLabel.textContent = "Il suo cuore sta rallentando";
                    statusLabel.style.color = "#F97316";
                } else if (bpmVal > 70) {
                    statusLabel.textContent = "Ci siete quasi";
                    statusLabel.style.color = "#A855F7";
                } else {
                    statusLabel.textContent = "Ora respira piano, come te";
                    statusLabel.style.color = "#10B981";
                }
            }
        }

        // Dragging slider manually
        if (bpmSlider) {
            bpmSlider.addEventListener('input', () => {
                startAudioEngine();
                let sliderVal = parseInt(bpmSlider.value);
                updateBpmLevel(sliderVal);

                if (sliderVal <= 70) {
                    achieveCalmState();
                } else if (isCalmAchieved) {
                    // If calm is already achieved, we just let them adjust it
                    updateBpmLevel(sliderVal);
                }
            });
        }

        function achieveCalmState() {
            if (isCalmAchieved) return;
            isCalmAchieved = true;

            // Remove loops and timers
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            resetCalmaInterval();

            // Set final BPM
            updateBpmLevel(60);
            playFeedbackSound(523.25, 0.45); // Procedural chime

            if (speechText) {
                speechText.textContent = `Grazie! Ora mi sento al sicuro con te. ✨`;
            }

            // Remove blur and lock states
            document.body.classList.remove('breathing-active');
            document.body.classList.remove('onboarding-active');

            if (plushFloatingName && laskaName) {
                plushFloatingName.textContent = laskaName;
                plushFloatingName.classList.add('visible');
            }

            // Set slider enabled
            if (bpmSlider) bpmSlider.disabled = false;
            isIntroDone = true;

            // Clear button selections
            [btnRespira, btnCalma, btnAccarezza].forEach(btn => {
                if (btn) btn.classList.remove('active');
            });
            if (heartOrbWrapper) heartOrbWrapper.classList.remove('breathing-active-ring');
        }

        function playFeedbackSound(freq, duration) {
            try {
                if (!audioCtx) return;
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) {
                console.log("Feedback sound error", e);
            }
        }

        // Start animation frame loop
        animationFrameId = requestAnimationFrame(updateBreath);
    }

    // Helper to dynamically update plush breathing speed based on BPM
    function updateBreathingSpeed(bpmVal) {
        const durationSec = 60.0 / bpmVal;
        if (plushWrapper) {
            plushWrapper.style.setProperty('--breath-duration', `${durationSec}s`);
            plushWrapper.classList.add('breathing');
        }
    }

    // Floating stars logic for Calm State (BPM 40-70)
    let starIntervalId = null;
    function startFloatingStars() {
        if (starIntervalId) return;
        const container = document.getElementById('plushStarsContainer');
        if (!container) return;
        
        starIntervalId = setInterval(() => {
            if (!plushWrapper || !plushWrapper.classList.contains('state-sleeps')) {
                clearInterval(starIntervalId);
                starIntervalId = null;
                return;
            }
            const star = document.createElement('span');
            star.className = 'floating-star-element';
            star.innerHTML = '✦';
            star.style.left = `${10 + Math.random() * 80}%`;
            star.style.top = `${10 + Math.random() * 60}%`;
            const scale = 0.5 + Math.random() * 0.7;
            star.style.transform = `scale(${scale})`;
            star.style.animationDuration = `${3 + Math.random() * 1.5}s`;
            
            container.appendChild(star);
            setTimeout(() => star.remove(), 4500);
        }, 1500);
    }

    // Helper to update plush state classes based on current BPM
    function updatePlushState(bpmVal) {
        if (!plushWrapper) return;
        
        // Remove old states
        plushWrapper.classList.remove('state-sleeps', 'state-rests', 'state-trembles', 'ears-lowered', 'trembling');
        
        if (bpmVal <= 70) {
            plushWrapper.classList.add('state-sleeps');
            startFloatingStars();
        } else if (bpmVal <= 110) {
            plushWrapper.classList.add('state-rests');
        } else {
            plushWrapper.classList.add('state-trembles', 'ears-lowered', 'trembling');
        }
    }

    // Gestione Slider BPM manuale
    bpmSlider.addEventListener('input', (e) => {
        bpm = parseInt(e.target.value, 10);
        bpmNumber.textContent = bpm;
        if (heartViewerContainer) {
            heartViewerContainer.style.setProperty('--beat-duration', `${60.0 / bpm}s`);
        }
        
        updateBreathingSpeed(bpm);
        updatePlushState(bpm);
        
        if (bpm <= 70) {
            bpmStatusLabel.textContent = "Battito di riposo profondo. Ottimo.";
            bpmStatusLabel.style.color = "var(--color-lavender)";
        } else if (bpm <= 110) {
            bpmStatusLabel.textContent = "Battito cardiaco moderato. Inspira con calma.";
            bpmStatusLabel.style.color = "var(--color-cream)";
        } else {
            bpmStatusLabel.textContent = "Stato di allerta/stress. Rallenta il ritmo.";
            bpmStatusLabel.style.color = "var(--color-pink)";
        }
    });

    // Gestione Silenziamento Battito
    const muteHeartBtn = document.getElementById('muteHeartBtn');
    muteHeartBtn.addEventListener('click', () => {
        isHeartMuted = !isHeartMuted;
        if (isHeartMuted) {
            muteHeartBtn.textContent = '🔇';
            muteHeartBtn.classList.add('muted');
        } else {
            muteHeartBtn.textContent = '🔊';
            muteHeartBtn.classList.remove('muted');
            initAudio(); // Assicura che l'audio sia ripristinato
        }
    });

    // ==========================================
    // INITIALIZATION & BIRTH RITUAL (Phase 1)
    // ==========================================
    // Set initial classes for onboarding
    document.body.classList.add('onboarding-active');
    if (plushWrapper) {
        plushWrapper.classList.add('asleep', 'enlarged');
    }

    // Web Audio Chime Synthesis
    function playChimeSound() {
        if (!audioCtx) {
            audioCtx = (window.LaskaAudio && window.LaskaAudio.getContext()) || new (window.AudioContext || window.webkitAudioContext)(); // un solo AudioContext per tutto il sito
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const now = audioCtx.currentTime;
        const playNote = (freq, time, delayVolume) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(delayVolume, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(time);
            osc.stop(time + 1.3);
        };
        playNote(659.25, now, 0.15); // E5
        playNote(783.99, now + 0.15, 0.12); // G5
        playNote(987.77, now + 0.3, 0.08); // B5
    }

    // Streak and last visit tracker
    function handleStreak(name) {
        const today = new Date().toDateString();
        const lastVisit = localStorage.getItem('laska_last_visit');
        let streak = parseInt(localStorage.getItem('laska_streak') || '0', 10);
        
        if (lastVisit) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toDateString();
            
            if (lastVisit === yesterdayString) {
                streak++;
            } else if (lastVisit !== today) {
                streak = 1;
            }
        } else {
            streak = 1;
        }
        
        localStorage.setItem('laska_last_visit', today);
        localStorage.setItem('laska_streak', streak.toString());
        
        const badge = document.getElementById('plushStreakBadge');
        if (badge) {
            if (streak > 1) {
                badge.textContent = `🌙 ${streak} notti insieme`;
                badge.classList.add('visible');
            } else {
                badge.classList.remove('visible');
                badge.textContent = '';
            }
        }
    }

    // Helper function for click particles
    function spawnClickParticles(button) {
        const rect = button.getBoundingClientRect();
        const particleCount = 14;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('span');
            particle.className = 'btn-particle';
            
            // Spawn from button center coordinates
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            
            // Spread outward in random angles
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 70 + 35; // displacement distance
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.setProperty('--dx', `${dx}px`);
            particle.style.setProperty('--dy', `${dy}px`);
            
            // Calming variation in particle sizes
            const size = Math.random() * 7 + 4;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            document.body.appendChild(particle);
            
            particle.addEventListener('animationend', () => {
                particle.remove();
            });
        }
    }

    // Il compagno scelto nell'onboarding (o quello predefinito)
    const savedCompanion = window.LaskaCompanion ? window.LaskaCompanion.current() : null;
    laskaName = (savedCompanion && savedCompanion.name) || "Miele";
    if (savedCompanion) {
        selectedAnimal = savedCompanion.animal;
        furColor = savedCompanion.color;
    }
    document.addEventListener('laska:companion', (e) => {
        const c = e.detail || {};
        laskaName = c.name || "Miele";
        selectedAnimal = c.animal || selectedAnimal;
        furColor = c.color || furColor;
        if (plushFloatingName) plushFloatingName.textContent = laskaName;
        nomeNellaChat();
        if (typeof initLaskaChat === 'function') initLaskaChat(laskaName, laskaChar);
    });
    if (plushFloatingName) {
        plushFloatingName.textContent = laskaName;
    }
    if (plushWrapper) {
        plushWrapper.classList.remove('asleep');
        plushWrapper.className = `plush-wrapper enlarged color-${furColor}`;
    }
    handleStreak(laskaName);
    // la chat parla con la voce del compagno: il suo nome e il suo animale (non sempre il coniglietto)
    const ICONA_ANIMALE = { peluche: '🐰', orso: '🐻', koala: '🐨' };
    function iconaCompagno() { return ICONA_ANIMALE[selectedAnimal] || '🐰'; }
    function nomeNellaChat() {
        const chatTitle = document.getElementById('chatDrawerTitle');
        if (chatTitle) chatTitle.textContent = `${laskaName} ti ascolta`;
        const avatar = document.querySelector('.chat-avatar');
        if (avatar) avatar.textContent = iconaCompagno();
        const apri = document.getElementById('chatFloatingBtn');
        if (apri) { apri.setAttribute('aria-label', `Parla con ${laskaName}`); apri.setAttribute('title', `Parla con ${laskaName}`); }
    }
    nomeNellaChat();
    // initLaskaChat viene chiamata in fondo al file: le variabili della chat
    // (es. chatDrawerMessages) sono dichiarate più avanti e chiamarla qui
    // bloccava l'esecuzione di tutto il resto dello script.

    // Avvia la transizione respiratoria interattiva
    startIntroTransition();

    // ==========================================
    // 3. ESERCIZIO 2: GUIDED 5-4-3-2-1 GROUNDING
    // ==========================================
    let groundingStep = 5;
    let groundingItems = [];
    const groundingContainer = document.getElementById('groundingContainer');
    const groundingIcon = document.getElementById('groundingIcon');
    const groundingInstruction = document.getElementById('groundingStepInstruction');
    const groundingInput = document.getElementById('groundingInput');
    const groundingAddBtn = document.getElementById('groundingAddBtn');
    const groundingTags = document.getElementById('groundingTags');
    const groundingCurrentCount = document.getElementById('groundingCurrentCount');
    const groundingTargetCount = document.getElementById('groundingTargetCount');
    const groundingNextBtn = document.getElementById('groundingNextBtn');

    const groundingDetails = {
        5: { text: "Nomina 5 cose che puoi VEDERE", icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`, bg: "rgba(200, 168, 233, 0.08)", target: 5 },
        4: { text: "Nomina 4 cose che puoi TOCCARE", icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0m-2 5V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v7m-2 0V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v9a7 7 0 0 0 7 7h3a8 8 0 0 0 8-8v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2"/></svg>`, bg: "rgba(242, 181, 212, 0.08)", target: 4 },
        3: { text: "Nomina 3 cose che puoi SENTIRE", icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`, bg: "rgba(59, 130, 246, 0.08)", target: 3 },
        2: { text: "Nomina 2 cose che puoi ANNUSARE", icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`, bg: "rgba(250, 248, 255, 0.06)", target: 2 },
        1: { text: "Nomina 1 cosa che puoi ASSAGGIARE", icon: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`, bg: "rgba(16, 185, 129, 0.08)", target: 1 }
    };

    function updateGroundingUI() {
        const stepData = groundingDetails[groundingStep];
        
        // il colore del passo tinge solo il cerchio dell'icona (niente riquadro colorato: l'esercizio è nel cielo)
        groundingIcon.style.backgroundColor = stepData.bg;
        
        // Aggiorna icone ed istruzioni
        groundingIcon.innerHTML = stepData.icon;
        groundingInstruction.textContent = stepData.text;
        groundingTargetCount.textContent = stepData.target;
        groundingCurrentCount.textContent = groundingItems.length;
        
        // Pulisci i tag precedenti
        groundingTags.innerHTML = '';
        groundingInput.value = '';
        
        // Mostra input e bottone di inserimento
        groundingInput.style.display = 'block';
        groundingInput.disabled = false;
        groundingAddBtn.style.display = 'block';
        
        // Mostra il progresso numerico
        document.querySelector('.grounding-progress').style.display = 'block';
        
        // Nascondi il pulsante di riavvio durante la compilazione
        groundingNextBtn.style.display = 'none';
        groundingNextBtn.disabled = true;
    }

    function addGroundingItem() {
        const value = groundingInput.value.trim();
        if (!value) return;

        const maxTarget = groundingDetails[groundingStep].target;
        if (groundingItems.length < maxTarget) {
            groundingItems.push(value);
            
            // Crea un pill tag animato
            const tag = document.createElement('span');
            tag.className = 'grounding-tag';
            tag.textContent = value;
            groundingTags.appendChild(tag);
            
            groundingCurrentCount.textContent = groundingItems.length;
            groundingInput.value = '';

            // Se abbiamo raggiunto la quota dello step, avanza AUTOMATICAMENTE dopo 1 secondo
            if (groundingItems.length === maxTarget) {
                groundingInput.blur();
                groundingInput.disabled = true; // Evita input extra durante la transizione
                
                setTimeout(() => {
                    if (groundingStep > 1) {
                        groundingStep--;
                        groundingItems = [];
                        updateGroundingUI();
                        groundingInput.focus();
                    } else if (groundingStep === 1) {
                        // Fine dell'esercizio - Schermata di successo
                        groundingStep = 0;
                        groundingIcon.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
                        groundingIcon.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; color: #10b981;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
                        groundingInstruction.textContent = "Sei nel presente. Stai bene.";
                        groundingTags.innerHTML = '';
                        
                        // Nascondi input e contatore
                        groundingInput.style.display = 'none';
                        groundingAddBtn.style.display = 'none';
                        document.querySelector('.grounding-progress').style.display = 'none';
                        
                        // Mostra e abilita il pulsante "Ricomincia"
                        groundingNextBtn.style.display = 'block';
                        groundingNextBtn.textContent = "Ricomincia";
                        groundingNextBtn.disabled = false;
                        fineEsercizio(true);
                    }
                }, 1000);
            }
        }
    }

    // Aggiungi elemento premendo il pulsante o Invio
    groundingAddBtn.addEventListener('click', addGroundingItem);
    groundingInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addGroundingItem();
        }
    });

    // Gestione evento pulsante "Ricomincia" (visibile solo alla fine dell'esercizio)
    groundingNextBtn.addEventListener('click', () => {
        if (groundingStep === 0) {
            groundingStep = 5;
            groundingItems = [];
            updateGroundingUI();
        }
    });

    // Inizializza l'Esercizio 2 al caricamento
    updateGroundingUI();


    // ==========================================
    // MANAGER DEI CONTROLLI DEGLI ESERCIZI (Mutua Esclusione)
    // ==========================================
    function stopAllExercises() {
        // 1. Ferma Box Breathing (Esercizio 3)
        if (boxIsRunning) {
            boxIsRunning = false;
            boxBreathingBtn.textContent = "Cominciamo";
            boxBreathingBtn.classList.remove('btn-secondary');
            boxBreathingBtn.classList.add('btn-primary');
            clearInterval(boxInterval);
            boxLine.style.transition = 'stroke-dashoffset 0.6s ease';
            boxLine.style.strokeDashoffset = '400';
            boxPhaseText.textContent = "Pronto";
            boxPhaseText.style.color = "var(--color-cream)";
            boxLine.style.stroke = "var(--color-pink)";
            boxTimer.textContent = "4s";
        }

        // 2. Ferma Muscle Relaxation (Esercizio 4)
        if (relaxationIsRunning) {
            relaxationIsRunning = false;
            relaxationBtn.textContent = "Cominciamo";
            relaxationBtn.classList.remove('btn-secondary');
            relaxationBtn.classList.add('btn-primary');
            
            clearTimeout(relaxationTimeout1);
            clearInterval(relaxationInterval);
            
            relaxationVisualContainer.className = "exercise-visual visual-relaxation";
            relaxationText.textContent = "Pronto";
            relaxationText.style.color = "var(--color-lavender)";
            handGlow.innerHTML = '';
        }

        // 3. Ferma Sound Therapy (Esercizio 5)
        if (isSoundPlaying) {
            stopSoundTherapy();
        }

        // 4. Ferma Deep Breathing (Esercizio 6)
        if (deepBreathIsRunning) {
            deepBreathIsRunning = false;
            deepBreathBtn.textContent = "Cominciamo";
            deepBreathBtn.classList.remove('btn-secondary');
            deepBreathBtn.classList.add('btn-primary');
            
            clearTimeout(deepBreathTimeout1);
            clearTimeout(deepBreathTimeout2);
            clearInterval(deepBreathInterval);
            clearInterval(deepBreathTimerInterval);
            
            deepBreathCircle.className = "deep-breath-circle";
            deepBreathCircle.style.transition = 'transform 0.6s ease';
            deepBreathCircle.style.transform = 'scale(1)';
            deepBreathPhase.textContent = "Pronto";
            deepBreathPhase.style.color = "var(--color-cream)";
            deepBreathTimer.textContent = "5s";
        }

        // 5. Ferma Audio Tachicardia
        stopTachycardiaSound();
    }

    // Fine di un esercizio (copione, Atto II): il compagno ringrazia, c'è una domanda facoltativa
    // e nel cielo si accende la stella di "Respira con me". Solo dopo un po' di pratica, non a ogni clic.
    const esercizioFine = document.getElementById('esercizioFine');
    let esercizioDa = 0;
    function nascondiFine() { if (esercizioFine) esercizioFine.hidden = true; }
    function inizioEsercizio() { esercizioDa = Date.now(); nascondiFine(); }
    function fineEsercizio(subito) {
        if (!esercizioFine || (!subito && (!esercizioDa || Date.now() - esercizioDa < 15000))) return;
        esercizioDa = 0;
        esercizioFine.querySelectorAll('[role="radio"]').forEach((b, i) => {
            b.setAttribute('aria-checked', 'false');
            b.tabIndex = i === 0 ? 0 : -1;
        });
        esercizioFine.hidden = false;
        const grazie = document.getElementById('esercizioGrazie');
        if (grazie) {
            grazie.textContent = '';
            setTimeout(() => { grazie.textContent = '«Grazie. Ora respiro meglio anch\'io.»'; }, 80);
        }
        if (window.LaskaPercorso && window.LaskaPercorso.markFinished) window.LaskaPercorso.markFinished('cameretta');   // gli esercizi a schermo intero contano come quelli della cameretta
        // avete respirato insieme: il suo cuore rallenta e si calma (in home la nuvoletta ringrazia, nel capitolo IV arriva l'alba)
        if (window.LaskaCalm && window.LaskaCalm.isCalm && !window.LaskaCalm.isCalm()) window.LaskaCalm.set(60);
    }
    if (esercizioFine) {
        const voti = Array.from(esercizioFine.querySelectorAll('[role="radio"]'));
        const scegli = (b, focus) => {
            voti.forEach(v => { const on = v === b; v.setAttribute('aria-checked', on ? 'true' : 'false'); v.tabIndex = on ? 0 : -1; });
            if (focus) b.focus();
        };
        voti.forEach((b, i) => {
            b.addEventListener('click', () => scegli(b));
            b.addEventListener('keydown', (e) => {
                const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                if (!d) return;
                e.preventDefault();
                scegli(voti[(i + d + voti.length) % voti.length], true);
            });
        });
    }


    // ==========================================
    // 4. ESERCIZIO 3: BOX BREATHING (Respirazione Quadrata)
    // ==========================================
    const boxBreathingBtn = document.getElementById('boxBreathingBtn');
    const boxLine = document.getElementById('boxLine');
    const boxPhaseText = document.getElementById('boxPhaseText');
    const boxTimer = document.getElementById('boxTimer');
    
    let boxIsRunning = false;
    let boxInterval = null;
    let boxPhase = 0; // 0: Inspira, 1: Tieni, 2: Espira, 3: Tieni
    let boxTimerVal = 4;

    const boxPhaseData = [
        { text: "Inspira...", color: "var(--color-pink)", offset: 300 },
        { text: "Trattieni...", color: "var(--color-lavender)", offset: 200 },
        { text: "Espira...", color: "var(--color-pink)", offset: 100 },
        { text: "Trattieni...", color: "var(--color-lavender)", offset: 0 }
    ];

    function updateBoxBreathingUI() {
        const currentData = boxPhaseData[boxPhase];
        boxPhaseText.textContent = currentData.text;
        boxPhaseText.style.color = currentData.color;
        boxLine.style.stroke = currentData.color;

        if (boxPhase === 0) {
            // Reset istantaneo della linea senza transizione
            boxLine.style.transition = 'none';
            boxLine.style.strokeDashoffset = '400';
            void boxLine.offsetWidth; // Forza reflow
            
            // Applica transizione e disegna il primo lato (top)
            boxLine.style.transition = 'stroke-dashoffset 4s linear, stroke 0.6s ease';
            boxLine.style.strokeDashoffset = '300';
        } else {
            boxLine.style.strokeDashoffset = currentData.offset.toString();
        }
    }

    function toggleBoxBreathing() {
        if (boxIsRunning) {
            stopAllExercises();
            fineEsercizio();
        } else {
            stopAllExercises();
            inizioEsercizio();
            boxIsRunning = true;
            boxBreathingBtn.textContent = "Ferma";
            boxBreathingBtn.classList.remove('btn-primary');
            boxBreathingBtn.classList.add('btn-secondary');
            
            boxPhase = 0;
            boxTimerVal = 4;
            boxTimer.textContent = "4s";
            
            updateBoxBreathingUI();
            
            boxInterval = setInterval(() => {
                boxTimerVal--;
                if (boxTimerVal <= 0) {
                    boxPhase = (boxPhase + 1) % 4;
                    boxTimerVal = 4;
                    updateBoxBreathingUI();
                }
                boxTimer.textContent = boxTimerVal + "s";
            }, 1000);
        }
    }

    boxBreathingBtn.addEventListener('click', toggleBoxBreathing);


    // ==========================================
    // 5. ESERCIZIO 4: PROGRESSIVE MUSCLE RELAXATION (Indipendente)
    // ==========================================
    const relaxationVisualContainer = document.getElementById('relaxationVisualContainer');
    const relaxationText = document.getElementById('relaxationText');
    const handGlow = document.getElementById('handGlow');
    const relaxationBtn = document.getElementById('relaxationBtn');
    
    let relaxationIsRunning = false;
    let relaxationInterval = null;
    let relaxationTimeout1 = null;

    function startMuscleRelaxationLoop() {
        function runCycle() {
            if (!relaxationIsRunning) return;
            // FASE 1: Tensione (Pugno chiuso - Glow Caldo)
            relaxationVisualContainer.className = "exercise-visual visual-relaxation state-tense";
            relaxationText.textContent = "Stringi il pugno con forza...";
            relaxationText.style.color = "var(--color-pink)";
            
            // Crea un cerchio di glow rosso/rosa caldo nell'SVG
            handGlow.innerHTML = `<circle cx="50" cy="50" r="30" fill="var(--color-pink)" opacity="0.15" filter="blur(5px)" style="transition: all 5s ease; transform: scale(1.3); transform-origin: center;"></circle>`;

            relaxationTimeout1 = setTimeout(() => {
                if (!relaxationIsRunning) return;
                // FASE 2: Rilascio (Mano aperta - Glow Freddo/Lavanda)
                relaxationVisualContainer.className = "exercise-visual visual-relaxation state-relaxed";
                relaxationText.textContent = "...e lascia andare tutto.";
                relaxationText.style.color = "var(--color-lavender)";
                
                // Cambia glow a lavanda/blu freddo
                handGlow.innerHTML = `<circle cx="50" cy="50" r="30" fill="var(--color-lavender)" opacity="0.2" filter="blur(8px)" style="transition: all 5s ease; transform: scale(1.6); transform-origin: center;"></circle>`;
            }, 5000);
        }

        runCycle();
        relaxationInterval = setInterval(() => {
            if (relaxationIsRunning) runCycle();
        }, 10000);
    }

    relaxationBtn.addEventListener('click', () => {
        if (relaxationIsRunning) {
            stopAllExercises();
            fineEsercizio();
        } else {
            stopAllExercises();
            inizioEsercizio();
            relaxationIsRunning = true;
            relaxationBtn.textContent = "Ferma";
            relaxationBtn.classList.remove('btn-primary');
            relaxationBtn.classList.add('btn-secondary');
            startMuscleRelaxationLoop();
        }
    });


    // ==========================================
    // 6. ESERCIZIO 1: GUIDA RESPIRATORIA TESTUALE
    // ==========================================
    function startRhythmBreathingGuide() {
        const rhythmText = document.getElementById('rhythmText');
        if (!rhythmText) return;
        
        let isInhaling = true;
        setInterval(() => {
            isInhaling = !isInhaling;
            rhythmText.textContent = isInhaling ? "Inspira..." : "Espira...";
        }, 4000); // 4 secondi Inspira, 4 secondi Espira (ciclo di 8s)
    }

    startRhythmBreathingGuide();


    // ==========================================
    // 7. ESERCIZIO 5: SUONI PER RILASSARSI (Web Audio Generators)
    // ==========================================
    const soundPlayBtn = document.getElementById('soundPlayBtn');
    const soundSelect = document.getElementById('soundSelect');
    const soundVisualizer = document.getElementById('soundVisualizer');

    let isSoundPlaying = false;
    let oceanNodes = [];
    let rainNodes = [];
    let binauralNodes = [];
    let bowlNodes = [];
    let forestNodes = [];
    let forestInterval = null;

    // 1b. Fruscio degli alberi e cinguettio degli uccellini (sintetizzati tramite LFO, bandpass e inviluppi sinusoidali rapidi)
    function playForestWindAndBirds() {
        if (!audioCtx) return;

        // --- RUSTLING LEAVES / WIND ---
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer(4);
        noiseSource.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, audioCtx.currentTime);
        filter.Q.setValueAtTime(1.2, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

        // LFO per folate di vento e fruscio foglie
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.07, audioCtx.currentTime); // ~14s periodo

        const lfoGainFreq = audioCtx.createGain();
        lfoGainFreq.gain.setValueAtTime(450, audioCtx.currentTime);

        lfo.connect(lfoGainFreq);
        lfoGainFreq.connect(filter.frequency);

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        lfo.start();
        noiseSource.start();

        forestNodes = [noiseSource, filter, gainNode, lfo, lfoGainFreq];

        // --- BIRDS CHIRPING (Generazione procedurale) ---
        function scheduleBirdSong() {
            if (!isSoundPlaying || !forestNodes.length) return;

            const now = audioCtx.currentTime;
            const numChirps = Math.floor(Math.random() * 3) + 2; // 2-4 cinguettii consecutivi
            let chirpTime = now;

            for (let i = 0; i < numChirps; i++) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'sine';
                const baseFreq = 2800 + Math.random() * 800; // Pitch casuale naturale

                osc.frequency.setValueAtTime(baseFreq, chirpTime);
                osc.frequency.exponentialRampToValueAtTime(baseFreq + 1300, chirpTime + 0.07);

                gain.gain.setValueAtTime(0.0001, chirpTime);
                gain.gain.linearRampToValueAtTime(0.012, chirpTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, chirpTime + 0.07);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(chirpTime);
                osc.stop(chirpTime + 0.09);

                chirpTime += 0.11 + Math.random() * 0.07; // intervallo cinguettio successivo
            }

            // Ripianifica il prossimo cinguettio tra 3 e 7 secondi
            const nextDelay = 3000 + Math.random() * 4000;
            forestInterval = setTimeout(scheduleBirdSong, nextDelay);
        }

        // Avvia la programmazione ricorsiva dei canti degli uccellini
        scheduleBirdSong();
    }

    // Helper per creare un buffer di rumore bianco statico
    function createNoiseBuffer(duration = 4) {
        if (!audioCtx) return null;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // 1. Onde dell'Oceano (Rumore modulato lentamente in frequenza e volume da un LFO)
    function playOceanWaves() {
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer(4);
        noiseSource.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

        // LFO per simulare il moto ondoso (~12s per ciclo)
        const lfo = audioCtx.createOscillator();
        lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime);

        // Guadagno dell'LFO per modulazione volume
        const lfoGainVol = audioCtx.createGain();
        lfoGainVol.gain.setValueAtTime(0.25, audioCtx.currentTime);

        // Guadagno dell'LFO per modulazione frequenza di taglio (apertura del filtro)
        const lfoGainFreq = audioCtx.createGain();
        lfoGainFreq.gain.setValueAtTime(120, audioCtx.currentTime);

        // Connessioni LFO
        lfo.connect(lfoGainVol);
        lfoGainVol.connect(gainNode.gain);

        lfo.connect(lfoGainFreq);
        lfoGainFreq.connect(filter.frequency);

        // Catena audio principale
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        lfo.start();
        noiseSource.start();

        oceanNodes = [noiseSource, filter, gainNode, lfo, lfoGainVol, lfoGainFreq];
    }

    // 2. Pioggia Rilassante (Rumore rosa/marrone costante filtrato passa-basso)
    function playRain() {
        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = createNoiseBuffer(3);
        noiseSource.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioCtx.currentTime);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.16, audioCtx.currentTime);

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        noiseSource.start();

        rainNodes = [noiseSource, filter, gainNode];
    }

    // 3. Frequenze Binaurali (Sinusoide 150Hz orecchio sinistro, 156Hz orecchio destro = 6Hz Theta)
    function playBinauralBeats() {
        const oscL = audioCtx.createOscillator();
        const oscR = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(150, audioCtx.currentTime);

        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(156, audioCtx.currentTime); // 6Hz di battito cerebrale (Stato Theta)

        // Creiamo un merger per mandare i due canali separati in cuffia (Stereo)
        const merger = audioCtx.createChannelMerger(2);

        oscL.connect(merger, 0, 0); // Canale Sinistro
        oscR.connect(merger, 0, 1); // Canale Destro

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

        merger.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscL.start();
        oscR.start();

        binauralNodes = [oscL, oscR, merger, gainNode];
    }

    // 4. Campana Tibetana (Sovrapposizione di armoniche con vibrato naturale)
    function playSingingBowl() {
        const frequencies = [180, 360, 540, 723]; // Fondamentale + armoniche detunate
        const gains = [0.45, 0.22, 0.15, 0.08];

        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);

        bowlNodes = [];

        frequencies.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            const oscGain = audioCtx.createGain();
            oscGain.gain.setValueAtTime(gains[idx], audioCtx.currentTime);

            // Modulatore tremolo/vibrato lento indipendente per ogni armonica
            const tremolo = audioCtx.createOscillator();
            tremolo.frequency.setValueAtTime(0.08 + (idx * 0.04), audioCtx.currentTime);

            const tremoloGain = audioCtx.createGain();
            tremoloGain.gain.setValueAtTime(gains[idx] * 0.35, audioCtx.currentTime);

            tremolo.connect(tremoloGain);
            tremoloGain.connect(oscGain.gain);

            osc.connect(oscGain);
            oscGain.connect(masterGain);

            tremolo.start();
            osc.start();

            bowlNodes.push(osc, oscGain, tremolo, tremoloGain);
        });

        bowlNodes.push(masterGain);
    }

    // Ferma qualsiasi suono attivo
    function stopSoundTherapy() {
        if (forestInterval) {
            clearTimeout(forestInterval);
            forestInterval = null;
        }
        oceanNodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
        rainNodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
        binauralNodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
        bowlNodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });
        forestNodes.forEach(n => { try { n.stop(); } catch(e){} try { n.disconnect(); } catch(e){} });

        oceanNodes = [];
        rainNodes = [];
        binauralNodes = [];
        bowlNodes = [];
        forestNodes = [];

        isSoundPlaying = false;
        soundPlayBtn.textContent = "Ascolta";
        soundPlayBtn.classList.remove('btn-secondary');
        soundPlayBtn.classList.add('btn-primary');
        soundVisualizer.classList.remove('playing');

        if (roomRainBtn) roomRainBtn.classList.remove('active');
        if (roomWavesBtn) roomWavesBtn.classList.remove('active');
        if (roomBowlBtn) roomBowlBtn.classList.remove('active');
        if (roomMountainBtn) roomMountainBtn.classList.remove('active');
    }

    // Avvia il suono selezionato
    function startSoundTherapy() {
        initAudio();
        stopSoundTherapy(); // Pulisce canali precedenti

        isSoundPlaying = true;
        soundPlayBtn.textContent = "Ferma";
        soundPlayBtn.classList.remove('btn-primary');
        soundPlayBtn.classList.add('btn-secondary');
        soundVisualizer.classList.add('playing');

        const selectedSound = soundSelect.value;
        if (selectedSound === 'ocean') {
            playOceanWaves();
        } else if (selectedSound === 'rain') {
            playRain();
        } else if (selectedSound === 'binaural') {
            playBinauralBeats();
        } else if (selectedSound === 'bowl') {
            playSingingBowl();
        }
    }

    // Gestione Eventi Sound Therapy
    soundPlayBtn.addEventListener('click', () => {
        if (isSoundPlaying) {
            stopAllExercises(); // Usa il manager centrale per fermare tutto
            fineEsercizio();
        } else {
            inizioEsercizio();
            startSoundTherapy();
        }
    });

    soundSelect.addEventListener('change', () => {
        if (isSoundPlaying) {
            startSoundTherapy(); // Riproduce il nuovo suono selezionato al volo
        }
    });


    // ==========================================
    // 8. ESERCIZIO 6: RESPIRO PROFONDO (Diaframmatico 5-2-5)
    // ==========================================
    const deepBreathBtn = document.getElementById('deepBreathBtn');
    const deepBreathCircle = document.getElementById('deepBreathCircle');
    const deepBreathPhase = document.getElementById('deepBreathPhase');
    const deepBreathTimer = document.getElementById('deepBreathTimer');
    
    let deepBreathIsRunning = false;
    let deepBreathInterval = null;
    let deepBreathTimerInterval = null;
    let deepBreathTimeout1 = null;
    let deepBreathTimeout2 = null;

    function startDeepBreathingLoop() {
        function runCycle() {
            if (!deepBreathIsRunning) return;
            
            // FASE 0: Inspira (5s) - Cerchio cresce
            deepBreathCircle.className = "deep-breath-circle";
            deepBreathCircle.style.transition = 'transform 5s linear';
            deepBreathCircle.style.transform = 'scale(2.2)';
            deepBreathPhase.textContent = "Inspira profondamente...";
            deepBreathPhase.style.color = "var(--color-pink)";
            
            let count = 5;
            deepBreathTimer.textContent = count + "s";
            
            clearInterval(deepBreathTimerInterval);
            deepBreathTimerInterval = setInterval(() => {
                count--;
                if (count > 0) {
                    deepBreathTimer.textContent = count + "s";
                } else {
                    clearInterval(deepBreathTimerInterval);
                }
            }, 1000);

            // FASE 1: Trattieni (2s) - Cerchio fermo e glow viola
            deepBreathTimeout1 = setTimeout(() => {
                if (!deepBreathIsRunning) return;
                deepBreathCircle.className = "deep-breath-circle hold";
                deepBreathCircle.style.transition = 'transform 2s linear';
                deepBreathCircle.style.transform = 'scale(2.3)'; // Lieve espansione
                deepBreathPhase.textContent = "Trattieni il respiro...";
                deepBreathPhase.style.color = "var(--color-lavender)";
                
                count = 2;
                deepBreathTimer.textContent = count + "s";
                
                clearInterval(deepBreathTimerInterval);
                deepBreathTimerInterval = setInterval(() => {
                    count--;
                    if (count > 0) {
                        deepBreathTimer.textContent = count + "s";
                    } else {
                        clearInterval(deepBreathTimerInterval);
                    }
                }, 1000);
            }, 5000);

            // FASE 2: Espira (5s) - Cerchio si restringe
            deepBreathTimeout2 = setTimeout(() => {
                if (!deepBreathIsRunning) return;
                deepBreathCircle.className = "deep-breath-circle";
                deepBreathCircle.style.transition = 'transform 5s linear';
                deepBreathCircle.style.transform = 'scale(1)';
                deepBreathPhase.textContent = "Espira lentamente...";
                deepBreathPhase.style.color = "var(--color-cream)";
                
                count = 5;
                deepBreathTimer.textContent = count + "s";
                
                clearInterval(deepBreathTimerInterval);
                deepBreathTimerInterval = setInterval(() => {
                    count--;
                    if (count > 0) {
                        deepBreathTimer.textContent = count + "s";
                    } else {
                        clearInterval(deepBreathTimerInterval);
                    }
                }, 1000);
            }, 7000);
        }

        runCycle();
        deepBreathInterval = setInterval(() => {
            if (deepBreathIsRunning) runCycle();
        }, 12000); // 5s + 2s + 5s = 12s per ciclo
    }

    deepBreathBtn.addEventListener('click', () => {
        if (deepBreathIsRunning) {
            stopAllExercises();
            fineEsercizio();
        } else {
            stopAllExercises();
            inizioEsercizio();
            deepBreathIsRunning = true;
            deepBreathBtn.textContent = "Ferma";
            deepBreathBtn.classList.remove('btn-primary');
            deepBreathBtn.classList.add('btn-secondary');
            startDeepBreathingLoop();
        }
    });

    // (9. il cambio di tema — lilla / azzurro — non c'è più: la notte di Laska è una sola)

    // ==========================================
    // 10. GESTIONE MENU HAMBURGER E VISTE SEPARATE
    // ==========================================
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const sideMenuOverlay = document.getElementById('sideMenuOverlay');
    const sideMenu = document.getElementById('sideMenu');
    
    const sideNavHomeBtn = document.getElementById('sideNavHomeBtn');
    const sideNavAnxietyBtn = document.getElementById('sideNavAnxietyBtn');
    const sideNavRoomBtn = document.getElementById('sideNavRoomBtn');
    const sideNavInfoBtn = document.getElementById('sideNavInfoBtn');
    const sideNavQuizBtn = document.getElementById('sideNavQuizBtn');
    const headerRoomBtn = document.getElementById('headerRoomBtn');
    const homeView = document.getElementById('home-view');
    const roomView = document.getElementById('room-view');
    const infoView = document.getElementById('info-view');
    const quizView = document.getElementById('quiz-view');
    const exerciseView = document.getElementById('exercise-view');
    const backToExercisesBtn = document.getElementById('backToExercisesBtn');
    const productDetailView = document.getElementById('product-detail-view');
    const successView = document.getElementById('success-view');
    const diarioView = document.getElementById('diario-view');   // Il mio diario (diario.js)
    const checkoutView = document.getElementById('checkout-view');

    // Elementi video della Stanza
    const roomVideo = document.getElementById('roomVideo');
    const videoPlayPauseBtn = document.getElementById('videoPlayPauseBtn');
    const videoMuteBtn = document.getElementById('videoMuteBtn');
    const roomRainBtn = document.getElementById('roomRainBtn');
    const roomWavesBtn = document.getElementById('roomWavesBtn');
    const roomBowlBtn = document.getElementById('roomBowlBtn');
    const roomMountainBtn = document.getElementById('roomMountainBtn');
    const roomToExercisesBtn = document.getElementById('roomToExercisesBtn');

    // Array di tutte le viste per una gestione scalabile
    // Capitoli del percorso (II Respira, IV Il compagno) e il Rifugio, fuori dal percorso
    // I quattro capitoli ora sono un'unica pagina che scorre (home-view); il Rifugio è a parte
    const rifugioView = document.getElementById('rifugio-view');
    const CHAPTER_VIEWS = [];

    const views = [homeView, rifugioView, roomView, quizView, exerciseView, productDetailView, checkoutView, successView, diarioView];

    // Funzioni di apertura/chiusura menu laterale
    // sul telefono il menu si apre dalla navigazione in basso: alla chiusura il focus torna a chi l'ha aperto
    const dockMenu = document.getElementById('lkDockMenu');
    let menuDa = null;
    function openSideMenu(da) {
        if (!sideMenu || !hamburgerBtn) return;
        menuDa = da || hamburgerBtn;
        sideMenu.classList.add('open');
        hamburgerBtn.classList.add('open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        if (dockMenu) dockMenu.setAttribute('aria-expanded', 'true');
        sideMenu.setAttribute('aria-hidden', 'false');
        
        // Mette a fuoco il pulsante di chiusura del menu per accessibilità
        setTimeout(() => {
            if (closeMenuBtn) closeMenuBtn.focus();
        }, 100);
    }

    function closeSideMenu() {
        if (!sideMenu || !hamburgerBtn) return;
        sideMenu.classList.remove('open');
        hamburgerBtn.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        sideMenu.setAttribute('aria-hidden', 'true');
        if (dockMenu) dockMenu.setAttribute('aria-expanded', 'false');

        // Riporta il focus su chi l'ha aperto (l'hamburger, o «Menu» in basso sul telefono)
        const torna = menuDa && menuDa.offsetParent !== null ? menuDa : (hamburgerBtn.offsetParent !== null ? hamburgerBtn : dockMenu);
        if (torna) torna.focus();
    }

    // Toggle al click sul pulsante hamburger
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = sideMenu && sideMenu.classList.contains('open');
            if (isOpen) {
                closeSideMenu();
            } else {
                openSideMenu();
            }
        });
    }

    if (dockMenu) dockMenu.addEventListener('click', () => {
        if (sideMenu && sideMenu.classList.contains('open')) closeSideMenu(); else openSideMenu(dockMenu);
    });

    // Chiusura al click sul pulsante di chiusura o sull'overlay esterno
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeSideMenu);
    if (sideMenuOverlay) sideMenuOverlay.addEventListener('click', closeSideMenu);

    // Chiusura con tasto ESC (Accessibilità)
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (typeof cartDrawer !== 'undefined' && cartDrawer && cartDrawer.classList.contains('open')) { closeCartDrawer(); return; }
        if (typeof chatDrawer !== 'undefined' && chatDrawer && chatDrawer.classList.contains('open')) { closeChatDrawer(); return; }
        if (sideMenu && sideMenu.classList.contains('open')) closeSideMenu();
    });

    // ==========================================
    // NAVIGAZIONE IMMERSIVA
    // - dissolvenza morbida con velo luminoso tra una pagina e l'altra
    // - cronologia: il tasto Indietro del browser/trackpad torna alla pagina precedente
    // - scroll dolce alla sezione richiesta (es. "Prevenzione" o "Esercizi")
    // ==========================================
    const NAV_FADE_MS = 420;
    let navFromHistory = false;
    let navTimer = null;
    const navVeil = document.getElementById('navVeil');

    const viewRoutes = {
        'home-view': 'home',
        'info-view': 'capire',
        'respira-view': 'respira',
        'compagno-view': 'compagno',
        'rifugio-view': 'rifugio',
        'room-view': 'stanza',
        'quiz-view': 'test-ansia',
        'exercise-view': 'esercizio',
        'product-detail-view': 'peluche',
        'checkout-view': 'cassa',
        'success-view': 'ordine',
        'diario-view': 'diario'
    };

    function routeHash(view, opts) {
        let name = viewRoutes[view.id] || 'home';
        if (opts.state && opts.state.exercise) name += '-' + opts.state.exercise;
        if (opts.state && opts.state.product) name += '-' + opts.state.product;
        if (view === infoView && opts.scrollTo === '.education-section') name = 'prevenzione';
        if (view === homeView && opts.scrollTo === '.exercises-section') name = 'esercizi';
        if (view === homeView && opts.scrollTo && opts.scrollTo.indexOf('#cap-') === 0) name = opts.scrollTo.slice(5);
        if (view === homeView && opts.scrollTo === '#feelSection') name = 'respira';
        if (view === homeView && opts.scrollTo === '#respiraTutti') name = 'esercizi';
        if (view === homeView && opts.scrollTo === '.products-section') name = 'peluche';
        return '#' + name;
    }

    function recordHistory(view, opts) {
        if (navFromHistory) return;
        const state = Object.assign({ view: view.id, scrollTo: opts.scrollTo || null }, opts.state || {});
        try {
            history.pushState(state, '', routeHash(view, opts));
        } catch (err) {
            try { history.pushState(state, ''); } catch (e) { /* cronologia non disponibile */ }
        }
    }

    let veilJumpTimer = null;
    function scrollToTarget(selector, smooth) {
        // home in orizzontale: ci pensa horizontal.js (sezione giusta + punto giusto al suo interno)
        if (selector && window.LaskaHScroll && window.LaskaHScroll.goTo(selector, smooth)) return;
        const target = selector ? document.querySelector(selector) : null;
        const destY = target ? target.getBoundingClientRect().top + window.scrollY - (selector && selector.indexOf('#cap-') === 0 ? 0 : 72) : 0;
        const distance = Math.abs(destY - window.scrollY);
        const reduce = document.documentElement.classList.contains('reduce-motion') ||
            (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        if (smooth && !reduce && navVeil && distance > window.innerHeight * 1.6) {
            // Salto lungo: la scena si dissolve nella notte e riappare nel punto giusto
            clearTimeout(veilJumpTimer);
            navVeil.classList.add('show');
            veilJumpTimer = setTimeout(() => {
                window.scrollTo({ top: Math.max(0, destY), behavior: 'auto' });
                navVeil.classList.remove('show');
            }, 450);
            return;
        }
        window.scrollTo({ top: Math.max(0, destY), behavior: smooth && !reduce ? 'smooth' : 'auto' });
    }

    function updateNavButtons(btnToActivate) {
        const btns = [sideNavHomeBtn, sideNavAnxietyBtn, sideNavRoomBtn, sideNavInfoBtn, sideNavQuizBtn, headerRoomBtn];
        btns.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (btnToActivate) {
            btnToActivate.classList.add('active');
            if (btnToActivate === headerRoomBtn && sideNavRoomBtn) sideNavRoomBtn.classList.add('active');
            if (btnToActivate === sideNavRoomBtn && headerRoomBtn) headerRoomBtn.classList.add('active');
        }
    }

    function showView(viewToShow, btnToActivate, opts) {
        opts = opts || {};
        if (!viewToShow) return;
        if (viewToShow === diarioView && window.LaskaDiario) window.LaskaDiario.mostra();   // si riparte da oggi

        // Chiude eventuali pannelli aperti
        if (sideMenu && sideMenu.classList.contains('open')) closeSideMenu();
        if (typeof closeCartDrawer === 'function' && cartDrawer && cartDrawer.classList.contains('open')) closeCartDrawer();
        if (typeof closeChatDrawer === 'function') closeChatDrawer();

        updateNavButtons(btnToActivate);

        // Stessa pagina: niente dissolvenza, solo uno scroll dolce verso il punto giusto
        if (viewToShow.classList.contains('active') && viewToShow.classList.contains('visible')) {
            recordHistory(viewToShow, opts);
            scrollToTarget(opts.scrollTo, true);
            return;
        }

        // 1. Fermiamo tutti gli esercizi in corso per evitare rumori o timer attivi
        stopAllExercises();

        // Avvia/ferma audio tachicardia in base alla vista
        if (viewToShow === homeView) {
            startTachycardiaSound();
        } else {
            stopTachycardiaSound();
        }

        // Gestione classe corpo per Stanza Virtuale
        if (viewToShow === roomView) {
            document.body.classList.add('in-room-view');
            if (roomVideo) {
                roomVideo.play().catch(e => console.log("Autoplay del video bloccato o non pronto:", e));
                if (videoPlayPauseBtn) {
                    videoPlayPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
                }
            }
        } else {
            document.body.classList.remove('in-room-view');
            if (roomVideo) {
                roomVideo.pause();
                if (videoPlayPauseBtn) {
                    videoPlayPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
                }
            }
        }

        recordHistory(viewToShow, opts);
        highlightMenu(viewToShow);

        // Tra un capitolo e l'altro la dissolvenza è lenta (circa 4 secondi in tutto)
        const fromView = views.find(v => v && v.classList.contains('active'));
        const reduceNav = document.documentElement.classList.contains('reduce-motion') ||
            (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const chapterMode = !reduceNav && CHAPTER_VIEWS.includes(viewToShow) && CHAPTER_VIEWS.includes(fromView);
        const fadeMs = chapterMode ? 2000 : NAV_FADE_MS;
        document.body.classList.toggle('nav-chapter', chapterMode);

        // 2. Dissolvenza in uscita + velo luminoso
        const otherViews = views.filter(v => v && v !== viewToShow);
        otherViews.forEach(v => v.classList.remove('visible'));
        document.body.classList.add('is-navigating');
        if (navVeil) navVeil.classList.add('show');

        clearTimeout(navTimer);
        navTimer = setTimeout(() => {
            // 3. Scambio delle viste mentre sono invisibili
            otherViews.forEach(v => v.classList.remove('active'));
            viewToShow.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'auto' });
            viewToShow.offsetHeight; // reflow

            // 4. Dissolvenza in entrata
            viewToShow.classList.add('visible');
            if (navVeil) navVeil.classList.remove('show');
            document.body.classList.remove('is-navigating');
            // se immagini o video della nuova vista non sono ancora arrivati, un segno piccolo lo dice (attesa.js)
            if (window.LaskaAttesa) window.LaskaAttesa.vista(viewToShow);

            // 5. Se richiesto, scivola dolcemente fino alla sezione
            if (opts.scrollTo) {
                setTimeout(() => scrollToTarget(opts.scrollTo, true), chapterMode ? 900 : 120);
            }
            if (chapterMode) setTimeout(() => document.body.classList.remove('nav-chapter'), 2300);
        }, fadeMs);
    }

    // Voci del menu (data-goto) evidenziate in base al luogo in cui sei
    // Dove porta ogni voce: un capitolo della pagina continua, oppure il Rifugio
    const GOTO_TARGETS = {
        battito: '#cap-battito', capire: '#cap-capire', compagno: '#nvStelle'
    };
    let currentChapter = 'battito';
    let traLeStelle = false;   // la home, ma scesi tra i compagni: per il menu e la navigazione in basso è «Compagni»
    function highlightMenu(view) {
        const id = view ? view.id : (document.querySelector('.page-view.active') || {}).id;
        let place;
        if (id === 'home-view') place = traLeStelle ? 'compagno' : currentChapter;
        else if (id === 'room-view' || id === 'rifugio-view') place = 'rifugio';
        else if (id === 'quiz-view') place = 'capire';
        else if (id === 'product-detail-view' || id === 'success-view') place = 'compagno';
        else if (id === 'exercise-view') place = 'respira';
        else if (id === 'diario-view') place = 'diario';
        document.querySelectorAll('.side-menu [data-goto], .lk-dock [data-goto]').forEach(b => {
            const on = b.getAttribute('data-goto') === place;
            b.classList.toggle('active', on);
            if (on) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current');
        });
        if (headerRoomBtn) headerRoomBtn.classList.toggle('active', place === 'rifugio');
        document.body.classList.toggle('on-path', id === 'home-view');
    }

    const cieloDeiCompagni = document.querySelector('#nvStelle .nv-stelle-sticky');
    if (cieloDeiCompagni && 'IntersectionObserver' in window) {
        new IntersectionObserver((voci) => {
            traLeStelle = voci.some(v => v.isIntersecting);
            if (homeView.classList.contains('active')) highlightMenu(homeView);
        }, { rootMargin: '-45% 0px -45% 0px' }).observe(cieloDeiCompagni);
    }
    // sul telefono i compagni sono un carosello: le tre stelline sotto dicono quale stai guardando,
    // e all'inizio al centro c'è il tuo compagno
    const listaCompagni = document.querySelector('#nvStelle .nv-compagni');
    const stelline = document.querySelectorAll('#nvStelle .nv-passi i');
    const carosello = () => listaCompagni && listaCompagni.scrollWidth > listaCompagni.clientWidth + 4;
    function stellinaAccesa() {
        if (!listaCompagni || !stelline.length) return;
        const box = listaCompagni.getBoundingClientRect(), centro = box.left + box.width / 2;
        let qui = 0, d = Infinity;
        Array.prototype.forEach.call(listaCompagni.children, (li, k) => {
            const r = li.getBoundingClientRect(), m = Math.abs(r.left + r.width / 2 - centro);
            if (m < d) { d = m; qui = k; }
        });
        stelline.forEach((p, k) => p.classList.toggle('is-qui', k === qui));
    }
    function alCentroIlTuo() {
        if (!carosello()) return;
        const tuo = listaCompagni.querySelector('.nv-card-tuo:not([hidden])');
        const li = tuo && tuo.closest('.nv-stella');
        if (li) listaCompagni.scrollLeft = li.offsetLeft - (listaCompagni.clientWidth - li.offsetWidth) / 2;   // la lista è position: relative (CSS)
        stellinaAccesa();
    }
    if (listaCompagni) {
        let rafStelline = 0;
        listaCompagni.addEventListener('scroll', () => { if (!rafStelline) rafStelline = requestAnimationFrame(() => { rafStelline = 0; stellinaAccesa(); }); }, { passive: true });
        requestAnimationFrame(alCentroIlTuo);
        document.addEventListener('laska:companion', () => requestAnimationFrame(alCentroIlTuo));
    }

    // Tasto Indietro / Avanti del browser
    try { history.replaceState({ view: 'home-view' }, ''); } catch (e) { /* ignora */ }

    function navButtonFor(viewId, state) {
        switch (viewId) {
            default: return null;   // l'evidenziazione del menu la fa highlightMenu()
        }
    }

    window.addEventListener('popstate', (e) => {
        const state = e.state || { view: 'home-view' };
        navFromHistory = true;
        try {
            if (state.view === 'checkout-view' && typeof cart !== 'undefined' && !cart.length) {
                showView(homeView, null);          // la cassa senza nessuno da portare a casa non ha senso
            } else if (state.product && typeof openProductDetail === 'function') {
                openProductDetail(state.product);
            } else if (state.exercise) {
                if (window.LaskaEsercizio) window.LaskaEsercizio.apri(state.exercise);
            } else {
                const view = document.getElementById(state.view) || homeView;
                showView(view, navButtonFor(view.id, state), { scrollTo: state.scrollTo });
            }
        } finally {
            navFromHistory = false;
        }
    });

    if (sideNavHomeBtn) {
        sideNavHomeBtn.addEventListener('click', () => {
            showView(homeView, sideNavHomeBtn);
        });
    }

    if (sideNavRoomBtn) {
        sideNavRoomBtn.addEventListener('click', () => {
            if (roomView && !roomView.classList.contains('active')) {
                showView(roomView, sideNavRoomBtn);
            } else {
                closeSideMenu();
            }
        });
    }

    // La cameretta è una stella della costellazione in home (cameretta.js, data-goto="cameretta"): niente porte
    // in alto. Il Rifugio si raggiunge solo dalla finestra della stanza

    if (sideNavInfoBtn) {
        sideNavInfoBtn.addEventListener('click', () => {
            showView(infoView, sideNavInfoBtn, { scrollTo: '.education-section' });
        });
    }

    if (sideNavQuizBtn) {
        sideNavQuizBtn.addEventListener('click', () => {
            if (quizView && !quizView.classList.contains('active')) {
                showView(quizView, sideNavQuizBtn);
                initQuiz(); // Resetta il quiz all'avvio
            } else {
                closeSideMenu();
            }
        });
    }

    // Routing per gli Esercizi Dedicati
    const teaserBtns = document.querySelectorAll('.exercise-teaser-btn');
    const focusPanels = document.querySelectorAll('.exercise-focus-panel');

    // Un esercizio a schermo intero (la vista «focus»). La lista degli esercizi in home non c'è più (si fanno
    // nella cameretta, cameretta.js): la vista resta per i suoni del Rifugio e per chi non ha il 3D
    function apriEsercizio(exerciseNum) {
        showView(exerciseView, null, { state: { exercise: exerciseNum } });
        focusPanels.forEach(panel => panel.classList.remove('active'));
        const activePanel = document.getElementById(`focus-panel-${exerciseNum}`);
        if (activePanel) activePanel.classList.add('active');
        nascondiFine();
    }
    window.LaskaEsercizio = { apri: (n) => apriEsercizio(String(n)) };
    teaserBtns.forEach(btn => btn.addEventListener('click', () => apriEsercizio(btn.getAttribute('data-exercise'))));

    // «Torna agli esercizi»: nella cameretta (senza 3D, in home)
    backToExercisesBtn.addEventListener('click', () => {
        if (window.LaskaCameretta && window.LaskaCameretta.puo && window.LaskaCameretta.puo()) openRespira();
        else showView(homeView, null);
    });

    // Navigazione alla sezione ansia (ora all'inizio delle Info)
    if (sideNavAnxietyBtn) {
        sideNavAnxietyBtn.addEventListener('click', () => {
            showView(infoView, sideNavAnxietyBtn, { scrollTo: '#anxiety-section' });
        });
    }

    // Gestione CTA della Sezione Esperienza Ansia
    const anxietyToExercisesBtn = document.getElementById('anxietyToExercisesBtn');
    const anxietyToQuizBtn = document.getElementById('anxietyToQuizBtn');

    if (anxietyToExercisesBtn) {
        anxietyToExercisesBtn.addEventListener('click', () => {
            openRespira('#respiraTutti');
        });
    }

    // il test per orientarsi (ansia o panico, non è una diagnosi): lo propone il compagno nella nuvoletta
    window.LaskaTest = { apri: () => { showView(quizView, null); initQuiz(); } };
    if (anxietyToQuizBtn) {
        anxietyToQuizBtn.addEventListener('click', () => {
            showView(quizView, sideNavQuizBtn);
            initQuiz();
        });
    }

    if (roomToExercisesBtn) {
        roomToExercisesBtn.addEventListener('click', () => {
            openRespira('#respiraTutti');
        });
    }

    // ==========================================
    // 11. LOGICA DEL TEST PER ORIENTARSI (Ansia vs Panico) — non è una diagnosi
    // ==========================================
    
    // Configurazione domande (A = sintomo d'ansia, B = sintomo di panico)
    const quizQuestions = [
        {
            question: "Come si è sviluppata questa sensazione fastidiosa o dolorosa?",
            optionA: "In modo graduale, accumulandosi nel corso di ore o giorni di preoccupazione.",
            optionB: "In modo improvviso e inaspettato, raggiungendo il picco massimo in pochissimi minuti."
        },
        {
            question: "Riesci a identificare una causa o preoccupazione specifica per questo stato?",
            optionA: "Sì, c'è un fattore scatenante chiaro (lavoro, salute, relazioni, esame imminente, ecc.).",
            optionB: "No, è scoppiato all'improvviso, apparentemente senza alcun motivo logico o minaccia reale."
        },
        {
            question: "Qual è l'intensità della paura o del disagio che stai provando?",
            optionA: "Agitazione costante, tensione, preoccupazione ricorrente e inquietudine moderata.",
            optionB: "Terrore travolgente, sensazione di perdere il controllo, impazzire o paura di morire."
        },
        {
            question: "Quali sintomi fisici stai riscontrando maggiormente in questo momento?",
            optionA: "Tensione muscolare, mal di testa, stanchezza generale o un nodo alla gola moderato.",
            optionB: "Dolore o oppressione al petto, iperventilazione, vertigini intense, brividi o forti tremori."
        },
        {
            question: "Quanto dura solitamente questo stato di crisi acuta?",
            optionA: "Dura a lungo (ore, giorni o settimane), presentandosi in modo costante con alti e bassi.",
            optionB: "È una crisi breve ma violenta, che solitamente si placa e scompare dopo 15-30 minuti."
        }
    ];

    let currentQuestionIndex = 0;
    let userAnswers = [];

    // Riferimenti DOM del Quiz
    const quizIntro = document.getElementById('quiz-intro');
    const quizQuestionWrapper = document.getElementById('quiz-question-wrapper');
    const quizResult = document.getElementById('quiz-result');
    
    const startQuizBtn = document.getElementById('startQuizBtn');
    const restartQuizBtn = document.getElementById('restartQuizBtn');
    const goToExercisesBtn = document.getElementById('goToExercisesBtn');
    
    const optionABtn = document.getElementById('optionABtn');
    const optionBBtn = document.getElementById('optionBBtn');
    const optionAText = document.getElementById('optionAText');
    const optionBText = document.getElementById('optionBText');
    
    const quizProgressBar = document.getElementById('quizProgressBar');
    const quizStepInfo = document.getElementById('quizStepInfo');
    const quizQuestionText = document.getElementById('quizQuestionText');
    
    const quizResultBadge = document.getElementById('quizResultBadge');
    const quizResultTitle = document.getElementById('quizResultTitle');
    const quizResultDesc = document.getElementById('quizResultDesc');
    const quizResultAdviceList = document.getElementById('quizResultAdviceList');

    function initQuiz() {
        currentQuestionIndex = 0;
        userAnswers = [];
        
        quizIntro.style.display = 'flex';
        quizQuestionWrapper.style.display = 'none';
        quizResult.style.display = 'none';
    }

    function startQuiz() {
        quizIntro.style.display = 'none';
        quizQuestionWrapper.style.display = 'flex';
        quizResult.style.display = 'none';
        
        showQuestion();
    }

    function showQuestion() {
        const currentQuestion = quizQuestions[currentQuestionIndex];
        
        // Popola i testi
        quizStepInfo.textContent = `Domanda ${currentQuestionIndex + 1} di ${quizQuestions.length}`;
        quizQuestionText.textContent = currentQuestion.question;
        optionAText.textContent = currentQuestion.optionA;
        optionBText.textContent = currentQuestion.optionB;
        
        // Aggiorna progress bar
        const progressPercent = (currentQuestionIndex / quizQuestions.length) * 100;
        quizProgressBar.style.width = `${progressPercent}%`;
    }

    function handleAnswer(answer) {
        userAnswers.push(answer);
        
        if (currentQuestionIndex < quizQuestions.length - 1) {
            currentQuestionIndex++;
            showQuestion();
        } else {
            // Fine del quiz, calcola ed esibisci i risultati
            quizProgressBar.style.width = '100%';
            setTimeout(showResult, 250); // Piccolo delay per mostrare il 100% sulla barra
        }
    }

    function showResult() {
        quizQuestionWrapper.style.display = 'none';
        quizResult.style.display = 'flex';
        
        // Conta le risposte A (sintomi d'ansia) e risposte B (sintomi di panico)
        const countA = userAnswers.filter(ans => ans === 'A').length;
        const countB = userAnswers.filter(ans => ans === 'B').length;
        
        quizResultAdviceList.innerHTML = ''; // Svuota lista consigli
        
        if (countA > countB) {
            // Caso Attacco d'Ansia
            quizResultBadge.textContent = "Compatibile con: Ansia";
            quizResultTitle.textContent = "Attacco d'Ansia";
            quizResultDesc.innerHTML = `Quello che hai descritto somiglia di più a un <strong>attacco d'ansia</strong> (uno stato d'ansia acuto). <br>L'ansia tende a svilupparsi gradualmente, è spesso legata a stress prolungato o a preoccupazioni specifiche identificabili (salute, lavoro, relazioni) e i sintomi fisici sono moderati ma persistenti.`;
            
            // Consigli ad hoc
            quizResultAdviceList.innerHTML = `
                <li class="prevention-item">
                    <span class="item-icon">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
                    </span>
                    <div class="item-content">
                        <strong>Il respiro lungo</strong>
                        <p>La respirazione diaframmatica lenta (5-2-5) ti aiuterà ad abbassare i livelli di cortisolo ed a calmare la mente.</p>
                    </div>
                </li>
                <li class="prevention-item">
                    <span class="item-icon">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </span>
                    <div class="item-content">
                        <strong>I suoni della notte</strong>
                        <p>Le onde dell'oceano o il battito binaurale stimoleranno le tue onde cerebrali alpha favorendo il rilassamento.</p>
                    </div>
                </li>
            `;
        } else {
            // Caso Attacco di Panico
            quizResultBadge.textContent = "Compatibile con: Panico";
            quizResultTitle.textContent = "Attacco di Panico";
            quizResultDesc.innerHTML = `Quello che hai descritto somiglia di più a un <strong>attacco di panico</strong>. <br>Gli attacchi di panico insorgono in modo estremamente rapido, raggiungendo il picco in circa 10 minuti, spesso senza una causa apparente. Generano paure fisiche ed esistenziali intense (sensazione di soffocamento, paura di morire o di impazzire). <br><strong>Se è la prima volta, o hai dolore al petto o fatica a respirare, chiama il 112 o un medico.</strong> <br><strong>Ricorda: è una reazione temporanea e passerà spontaneamente entro 15-30 minuti. Sei al sicuro.</strong>`;
            
            // Consigli ad hoc
            quizResultAdviceList.innerHTML = `
                <li class="prevention-item">
                    <span class="item-icon">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                    </span>
                    <div class="item-content">
                        <strong>Cinque cose vere</strong>
                        <p>Usa la tecnica di grounding 5-4-3-2-1 per staccare la mente dai pensieri di minaccia e riancorarti alla realtà fisica.</p>
                    </div>
                </li>
                <li class="prevention-item">
                    <span class="item-icon">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </span>
                    <div class="item-content">
                        <strong>Il quadrato di luce</strong>
                        <p>La tecnica del Box Breathing (4s per ogni fase) ti aiuterà a controllare l'iperventilazione e a segnalare calma al cervello.</p>
                    </div>
                </li>
            `;
        }
    }

    // Registrazione eventi per il Quiz
    startQuizBtn.addEventListener('click', startQuiz);
    restartQuizBtn.addEventListener('click', startQuiz);
    
    optionABtn.addEventListener('click', () => handleAnswer('A'));
    optionBBtn.addEventListener('click', () => handleAnswer('B'));
    
    // Bottone "Vai agli Esercizi" con scroll automatico alla sezione
    goToExercisesBtn.addEventListener('click', () => {
        // Mostra la Home view
        openRespira('#respiraTutti');
    });

    // Il vecchio test "Che Peluche sei?" ora vive solo nell'onboarding (onboarding.js):
    // si apre all'ingresso e dal menu con "Rifai il test / Ricrea il tuo Laska".

    // ==========================================
    // 12. GESTIONE CARRELLO E ACQUISTO PELUCHE
    // ==========================================
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartBtn = document.getElementById('cartBtn');
    const cartBadge = document.getElementById('cartBadge');
    
    // Riferimenti dettaglio prodotto
    const detailProductImg = document.getElementById('detailProductImg');
    const detailProductName = document.getElementById('detailProductName');
    const detailProductPrice = document.getElementById('detailProductPrice');
    const detailProductDesc = document.getElementById('detailProductDesc');
    const colorPickerDots = document.querySelectorAll('.color-picker-dot');
    const colorNameDisplay = document.getElementById('colorNameDisplay');
    const detailQty = document.getElementById('detailQty');
    const qtyMinusBtn = document.getElementById('qtyMinusBtn');
    const qtyPlusBtn = document.getElementById('qtyPlusBtn');
    const detailTotalPrice = document.getElementById('detailTotalPrice');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const backToPlushBtn = document.getElementById('backToPlushBtn');

    // Riferimenti checkout (la cassa è una pagina: #checkout-view)
    const checkoutForm = document.getElementById('checkoutForm');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cartSummaryBlock = document.getElementById('cartSummaryBlock');
    const cartItemsList = document.getElementById('cartItemsList');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const checkoutTotalVal = document.getElementById('checkoutTotalVal');
    
    // Riferimenti successo
    const successOrderItems = document.getElementById('successOrderItems');
    const successTotalPaid = document.getElementById('successTotalPaid');
    const successHomeBtn = document.getElementById('successHomeBtn');

    // Dati dei Prodotti
    const productsData = {
        1: {
            id: 1,
            name: "Orsetto Lavanda",
            price: 34.90,
            desc: "Un orsetto morbido da stringere quando la notte è lunga. Dentro, un cuore che batte piano: lo senti se lo tieni vicino.",
            img: "assets/compagni/orso-classico.webp",
            defaultColor: "lavanda"
        },
        2: {
            id: 2,
            name: "Coniglio Calmo",
            price: 34.90,
            desc: "Un coniglietto dalle orecchie lunghe, per le notti inquiete. Dentro, un cuore che batte piano: lo senti se lo tieni vicino.",
            img: "assets/compagni/peluche-classico.webp",
            defaultColor: "rosa"
        },
        3: {
            id: 3,
            name: "Koala Rilassante",
            price: 39.90,
            desc: "Un koala da abbracciare forte, per addormentarsi accanto a un battito lento.",
            img: "assets/compagni/koala-grigio.webp",
            defaultColor: "navy"
        }
    };

    const colorMeta = {
        "lavanda": { label: "Orsetto", img: "assets/compagni/orso-classico.webp" },
        "rosa": { label: "Peluche", img: "assets/compagni/peluche-classico.webp" },
        "navy": { label: "Koala", img: "assets/compagni/koala-grigio.webp" }
    };

    // ------------------------------------------------------------------
    // Prima dell'alba (copione, Atto IV): l'invito a portare a casa il compagno compare
    // solo dopo che il suo battito è sceso. Accanto, un'uscita con lo stesso peso.
    // ------------------------------------------------------------------
    const PRODOTTO_DEL_COMPAGNO = { orso: 1, peluche: 2, koala: 3 };
    const alba = document.getElementById('alba');
    const albaConosci = document.getElementById('albaConosci');
    const albaResto = document.getElementById('albaResto');
    const albaRisposta = document.getElementById('albaRisposta');
    function compagnoCorrente(c) {
        if (!c) {
            try { c = window.LaskaCompanion ? window.LaskaCompanion.current() : null; } catch (e) { c = null; }
        }
        return c || { animal: 'peluche', name: 'Miele' };
    }
    function aggiornaAlba(c) {
        c = compagnoCorrente(c);
        const id = PRODOTTO_DEL_COMPAGNO[c.animal] || 2;
        const nome = (c.name || '').trim() || 'Miele';
        document.querySelectorAll('[data-nome]').forEach(el => { el.textContent = nome; });
        if (!alba) return;
        if (albaConosci) albaConosci.setAttribute('data-product-id', id);
        const prezzo = document.getElementById('albaPrezzo');
        const p = productsData[id];
        // la spedizione non è ancora decisa: resta un segnaposto ben visibile
        if (prezzo && p) prezzo.textContent = `${p.price.toFixed(2).replace('.', ',')} € · Spedizione [DA CONFERMARE]`;
        if (albaRisposta && !albaRisposta.hidden) albaRisposta.textContent = `Va bene. ${nome} sarà qui la prossima notte.`;
    }
    aggiornaAlba();
    document.addEventListener('laska:companion', (e) => aggiornaAlba(e.detail));
    // tra le stelle, il tuo compagno si riconosce: ha il suo colore e un piccolo segno «Il tuo compagno»
    function segnaIlTuo(c) {
        c = compagnoCorrente(c);
        const id = PRODOTTO_DEL_COMPAGNO[c.animal];
        document.querySelectorAll('#nvStelle .nv-card').forEach(card => {
            const mio = +card.getAttribute('data-product-id') === id;
            let seg = card.querySelector('.nv-card-tuo');
            if (mio && !seg) { seg = document.createElement('span'); seg.className = 'nv-card-tuo'; seg.textContent = 'Il tuo compagno'; card.insertBefore(seg, card.firstChild); }
            if (seg) seg.hidden = !mio;
            const img = card.querySelector('.nv-card-img img');
            if (!img) return;
            if (!img.dataset.orig) img.dataset.orig = img.getAttribute('src');
            img.src = mio && window.LaskaCompanion && c.color ? window.LaskaCompanion.image(c.animal, c.color) : img.dataset.orig;
        });
    }
    segnaIlTuo();
    document.addEventListener('laska:companion', (e) => segnaIlTuo(e.detail));
    document.addEventListener('laska:calm', (e) => {
        if (!alba || !e.detail) return;
        if (e.detail.calm) alba.hidden = false;
        else if (e.detail.reset) {
            // un incontro nuovo: l'alba tornerà quando il nuovo compagno si sarà calmato
            alba.hidden = true;
            const azioni = document.getElementById('albaAzioni');
            if (azioni) azioni.hidden = false;
            if (albaRisposta) { albaRisposta.hidden = true; albaRisposta.textContent = ''; }
        }
    });
    if (albaConosci) {
        albaConosci.addEventListener('click', () => openProductDetail(albaConosci.getAttribute('data-product-id') || '2'));
    }
    if (albaResto) {
        albaResto.addEventListener('click', () => {
            const azioni = document.getElementById('albaAzioni');
            const nome = (compagnoCorrente().name || '').trim() || 'Miele';
            albaRisposta.textContent = `Va bene. ${nome} sarà qui la prossima notte.`;
            albaRisposta.hidden = false;
            if (azioni) azioni.hidden = true;
            albaRisposta.focus({ preventScroll: true });
        });
    }

    // Stato locale
    let currentProduct = null;
    let selectedColor = "lavanda";
    let selectedColorName = "";
    let selectedQty = 1;
    let cart = [];
    // il carrello resta nel browser (anche dopo una ricarica): nomi e prezzi si rileggono dal catalogo, non dal salvataggio
    const CHIAVE_CARRELLO = 'laska.carrello';
    function salvaCarrello() {
        try { localStorage.setItem(CHIAVE_CARRELLO, JSON.stringify(cart.map(i => ({ id: i.id, color: i.color, colorName: i.colorName, pers: i.pers, qty: i.qty, img: i.img })))); } catch (e) { }
    }
    function caricaCarrello() {
        try {
            const t = JSON.parse(localStorage.getItem(CHIAVE_CARRELLO) || '[]');
            if (!Array.isArray(t)) return;
            cart = t.filter(i => i && productsData[i.id]).map(i => {
                const p = i.pers || {};
                return {
                    id: productsData[i.id].id, name: productsData[i.id].name, basePrice: productsData[i.id].price,
                    color: String(i.color || ''), colorName: String(i.colorName || ''), img: String(i.img || productsData[i.id].img),
                    qty: Math.max(1, Math.min(10, Math.round(+i.qty) || 1)),
                    pers: { nome: String(p.nome || '').slice(0, 12), filo: FILI[p.filo] ? p.filo : 'lilla', dove: DOVE[p.dove] ? p.dove : 'cuore',
                            biglietto: String(p.biglietto || '').slice(0, 140), regalo: !!p.regalo }
                };
            });
        } catch (e) { cart = []; }
    }
    let ordineFatto = false;   // alla conferma il carrello si svuota, ma la cassa non deve «tornare indietro»

    // ------------------------------------------------------------------
    // Rendilo tuo: nome ricamato, colore del filo, dove cucirlo, bigliettino, regalo
    // ------------------------------------------------------------------
    const FILI = {
        lilla: { label: 'lilla', col: '#C3A2FF' },
        luna: { label: 'bianco luna', col: '#F4EEFF' },
        oro: { label: 'oro', col: '#E8C77A' },
        rosa: { label: 'rosa', col: '#F3A6CF' }
    };
    const DOVE = { cuore: 'sul cartellino del cuore', zampina: 'sulla zampina' };
    let pers = { nome: '', filo: 'lilla', dove: 'cuore', biglietto: '', regalo: false };
    const persNome = document.getElementById('persNome');
    const persNomeConta = document.getElementById('persNomeConta');
    const persBiglietto = document.getElementById('persBiglietto');
    const persBigliettoConta = document.getElementById('persBigliettoConta');
    const persRegalo = document.getElementById('persRegalo');
    const persAnteprima = document.getElementById('persAnteprima');
    const persAnteprimaNome = document.getElementById('persAnteprimaNome');
    const persAnteprimaDove = document.getElementById('persAnteprimaDove');
    const euro = (v) => `${v.toFixed(2).replace('.', ',')} €`;
    // spedizione, ricamo e bigliettino non hanno ancora un prezzo: il totale mostrato è sempre parziale, e lo diciamo
    function costiDaDefinire(voci) {
        const c = ['spedizione'];
        if (voci.some(p => p && p.nome)) c.push('ricamo');
        if (voci.some(p => p && p.biglietto)) c.push('bigliettino');
        return (c.length > 1 ? c.slice(0, -1).join(', ') + ' e ' + c[c.length - 1] : c[0]) + ' da definire';
    }
    const maiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    const detailParziale = document.getElementById('detailParziale');
    function aggiornaParziale() { if (detailParziale) detailParziale.textContent = maiuscola(costiDaDefinire([pers])) + '.'; }

    // un gruppo di scelte (role="radio"): clic, frecce, un solo elemento nel giro del Tab
    function legaScelte(gruppo, attributo, quando) {
        if (!gruppo) return;
        const voci = Array.from(gruppo.querySelectorAll('[role="radio"]'));
        const scegli = (v, conFocus) => {
            voci.forEach(b => {
                const si = b.getAttribute(attributo) === v;
                b.setAttribute('aria-checked', si ? 'true' : 'false');
                b.tabIndex = si ? 0 : -1;
                if (si && conFocus) b.focus();
            });
            quando(v);
        };
        voci.forEach((b, i) => {
            b.addEventListener('click', () => scegli(b.getAttribute(attributo)));
            b.addEventListener('keydown', (e) => {
                const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                if (!passo) return;
                e.preventDefault();
                scegli(voci[(i + passo + voci.length) % voci.length].getAttribute(attributo), true);
            });
        });
        gruppo.__scegli = scegli;
    }
    const gruppoFili = document.querySelector('#persBlocco .pers-fili');
    const gruppoDove = document.querySelector('.pers-dove');
    legaScelte(gruppoFili, 'data-filo', (v) => { pers.filo = v; aggiornaAnteprima(); });
    legaScelte(gruppoDove, 'data-dove', (v) => { pers.dove = v; aggiornaAnteprima(); });

    // «Rendilo tuo» resta chiuso: una riga dice cosa c'è già scelto, così non serve aprirlo per saperlo
    const persRiassunto = document.getElementById('persRiassunto');
    const persApri = document.getElementById('persApri');
    function aggiornaAnteprima() {
        aggiornaParziale();
        if (persRiassunto) {
            const r = [pers.nome ? `ricamo «${pers.nome}», filo ${FILI[pers.filo].label}` : '', pers.biglietto ? 'un bigliettino' : '', pers.regalo ? 'è un regalo' : ''].filter(Boolean);
            persRiassunto.textContent = r.length ? maiuscola(r.join(' · ')) : 'Un nome ricamato, un bigliettino · facoltativo';
        }
        if (persNomeConta) persNomeConta.textContent = `${pers.nome.length}/12`;
        if (persBigliettoConta) persBigliettoConta.textContent = `${pers.biglietto.length}/140`;
        if (!persAnteprima) return;
        persAnteprima.hidden = !pers.nome;
        persAnteprima.style.setProperty('--filo', FILI[pers.filo].col);
        persAnteprima.setAttribute('data-dove', pers.dove);
        persAnteprimaNome.textContent = pers.nome;
        persAnteprimaDove.textContent = DOVE[pers.dove];
    }
    if (persNome) {
        persNome.addEventListener('input', () => {
            // solo lettere (anche accentate), spazi, apostrofi e trattini: si possono cucire
            const pulito = persNome.value.replace(/[^\p{L}\s'’-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 12);
            if (pulito !== persNome.value) persNome.value = pulito;
            pers.nome = pulito.trim();
            aggiornaAnteprima();
        });
    }
    if (persBiglietto) persBiglietto.addEventListener('input', () => { pers.biglietto = persBiglietto.value.slice(0, 140); aggiornaAnteprima(); });
    if (persRegalo) persRegalo.addEventListener('change', () => { pers.regalo = persRegalo.checked; aggiornaAnteprima(); });

    function azzeraPers(nome) {
        pers = { nome: (nome || '').slice(0, 12), filo: 'lilla', dove: 'cuore', biglietto: '', regalo: false };
        if (persNome) persNome.value = pers.nome;
        if (persBiglietto) persBiglietto.value = '';
        if (persRegalo) persRegalo.checked = false;
        if (gruppoFili && gruppoFili.__scegli) gruppoFili.__scegli('lilla');
        if (gruppoDove && gruppoDove.__scegli) gruppoDove.__scegli('cuore');
        if (persApri) persApri.open = false;
        aggiornaAnteprima();
    }
    // la personalizzazione in parole (carrello, cassa, riepilogo)
    function descriviPers(p) {
        const righe = [];
        if (p && p.nome) righe.push(`Ricamo «${p.nome}», filo ${FILI[p.filo].label}, ${DOVE[p.dove]}`);
        if (p && p.biglietto) righe.push('Con un bigliettino');
        if (p && p.regalo) righe.push('È un regalo');
        return righe;
    }

    // Apertura Dettaglio Prodotto
    function openProductDetail(productId) {
        const product = productsData[productId];
        if (!product) return;
        
        currentProduct = product;
        segnaStelleViste();
        selectedColor = product.defaultColor;
        selectedQty = 1;
        
        // Imposta i testi e le immagini
        detailProductName.textContent = product.name;
        detailProductPrice.textContent = `${product.price.toFixed(2).replace('.', ',')} €`;
        detailProductDesc.textContent = product.desc;
        detailQty.value = 1;
        
        // Aggiorna colore attivo e immagine
        updateColorSelection(selectedColor);
        updateDetailTotalPrice();

        // Se è lo stesso animale del compagno creato all'inizio: suo colore, e il suo nome già pronto da ricamare
        const productAnimal = { 1: 'orso', 2: 'peluche', 3: 'koala' }[productId];
        const mine = window.LaskaCompanion ? window.LaskaCompanion.get() : null;
        const animali = window.LaskaCompanion ? window.LaskaCompanion.animals : null;
        const colori = animali && animali[productAnimal] ? animali[productAnimal].colors : [];
        const eIlTuo = !!(mine && mine.animal === productAnimal);
        const suo = eIlTuo ? colori.find(c => c.key === mine.color) : null;
        coloriScheda(productAnimal, colori, (suo || colori[0] || {}).key);
        azzeraPers(eIlTuo ? mine.name : '');
        if (detailTuo) {
            detailTuo.hidden = !eIlTuo;
            if (eIlTuo) detailTuo.textContent = `Ecco ${(mine.name || '').trim() || 'Miele'}, come l'hai scelto tu: ${suo ? suo.label.toLowerCase() : 'il suo colore'}, con il nome già pronto da ricamare. Puoi cambiare tutto.`;
        }
        
        // Passa alla vista dettaglio
        showView(productDetailView, null, { state: { product: productId } });
    }

    // i colori del peluche nella scheda (gli stessi della scelta del compagno): cambiano la foto e quello che va nel carrello
    const detailTuo = document.getElementById('detailTuo');
    const detailColori = document.getElementById('detailColori');
    const detailColoriLista = document.getElementById('detailColoriLista');
    const detailColoreNome = document.getElementById('detailColoreNome');
    function coloriScheda(animale, colori, scelto) {
        if (!detailColoriLista) return;
        detailColoriLista.innerHTML = '';
        if (detailColori) detailColori.hidden = colori.length < 2;
        colori.forEach(c => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'pers-filo'; b.setAttribute('role', 'radio');
            b.setAttribute('data-colore', c.key); b.style.setProperty('--filo', c.sw); b.textContent = c.label;
            detailColoriLista.appendChild(b);
        });
        legaScelte(detailColoriLista, 'data-colore', (k) => {
            const c = colori.find(x => x.key === k);
            if (!c) return;
            selectedColor = k; selectedColorName = c.label;
            if (detailColoreNome) detailColoreNome.textContent = '· ' + c.label;
            if (detailProductImg && window.LaskaCompanion) detailProductImg.src = window.LaskaCompanion.image(animale, k);
        });
        if (scelto && detailColoriLista.__scegli) detailColoriLista.__scegli(scelto);
    }
    function updateColorSelection(color) {
        selectedColor = color;
        if (colorNameDisplay) {
            colorNameDisplay.textContent = colorMeta[color].label;
        }
        if (detailProductImg) {
            detailProductImg.src = colorMeta[color].img;
        }
        
        // Attiva il pallino corretto
        if (colorPickerDots) {
            colorPickerDots.forEach(dot => {
                if (dot.getAttribute('data-color') === color) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }

    function updateDetailTotalPrice() {
        if (!currentProduct) return;
        const total = currentProduct.price * selectedQty;
        detailTotalPrice.textContent = `${total.toFixed(2).replace('.', ',')} €`;
        aggiornaParziale();
    }

    // Event listeners per click sui peluche
    const clickableProducts = document.querySelectorAll('.clickable-product');
    clickableProducts.forEach(prod => {
        prod.addEventListener('click', (e) => {
            const productId = prod.getAttribute('data-product-id');
            openProductDetail(productId);
        });
    });

    // Event listeners per i pallini di colore
    if (colorPickerDots) {
        colorPickerDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const color = dot.getAttribute('data-color');
                updateColorSelection(color);
            });
        });
    }

    // Event listeners per quantità
    qtyMinusBtn.addEventListener('click', () => {
        if (selectedQty > 1) {
            selectedQty--;
            detailQty.value = selectedQty;
            updateDetailTotalPrice();
        }
    });

    qtyPlusBtn.addEventListener('click', () => {
        if (selectedQty < 10) {
            selectedQty++;
            detailQty.value = selectedQty;
            updateDetailTotalPrice();
        }
    });

    // Aggiungi al carrello
    addToCartBtn.addEventListener('click', () => {
        if (!currentProduct) return;
        
        const cartItem = {
            id: currentProduct.id,
            name: currentProduct.name,
            basePrice: currentProduct.price,
            color: selectedColor,
            colorName: selectedColorName,
            pers: Object.assign({}, pers),
            qty: selectedQty,
            img: detailProductImg ? detailProductImg.getAttribute('src') : ''
        };
        
        // stesso peluche con la stessa personalizzazione: si somma; altrimenti è un compagno a sé
        const existingIndex = cart.findIndex(item => 
            item.id === cartItem.id && 
            item.color === cartItem.color && 
            JSON.stringify(item.pers) === JSON.stringify(cartItem.pers)
        );
        
        if (existingIndex > -1) {
            cart[existingIndex].qty += selectedQty;
        } else {
            cart.push(cartItem);
        }
        
        updateCartUI();
        openCartDrawer();
    });

    // Il carrello nell'intestazione: compare quando c'è qualcuno dentro, o dopo che hai visto i compagni
    // tra le stelle (o la scheda di uno di loro). Prima non serve, e un «0» non deve vedersi.
    const CHIAVE_STELLE = 'laska.stelleViste';
    let stelleViste = false;
    try { stelleViste = localStorage.getItem(CHIAVE_STELLE) === '1'; } catch (e) { }
    function mostraCarrello() { cartBtn.hidden = !(stelleViste || cart.length > 0); }
    function segnaStelleViste() {
        if (stelleViste) return;
        stelleViste = true;
        try { localStorage.setItem(CHIAVE_STELLE, '1'); } catch (e) { }
        mostraCarrello();
    }
    const cieloCompagni = document.querySelector('#nvStelle .nv-stelle-sticky');
    if (cieloCompagni && 'IntersectionObserver' in window && !stelleViste) {
        const guardaStelle = new IntersectionObserver((voci) => {
            if (voci.some(v => v.isIntersecting && v.intersectionRatio >= 0.6)) { segnaStelleViste(); guardaStelle.disconnect(); }
        }, { threshold: [0.6] });
        guardaStelle.observe(cieloCompagni);
    }

    // Gestione Drawer Carrello
    let cartDa = null;   // chi ha aperto il carrello: lì torna il focus
    function openCartDrawer() {
        if (!cartDrawer.classList.contains('open')) cartDa = document.activeElement;
        cartDrawer.classList.add('open');
        cartBtn.setAttribute('aria-expanded', 'true');
        cartDrawer.setAttribute('aria-hidden', 'false');
        // il focus entra nel carrello appena è visibile (durante la dissolvenza non si può)
        let prove = 0;
        (function entra() {
            if (!cartDrawer.classList.contains('open') || cartDrawer.contains(document.activeElement)) return;
            closeCartBtn.focus();
            if (document.activeElement !== closeCartBtn && ++prove < 20) setTimeout(entra, 50);
        })();
    }

    function closeCartDrawer() {
        const dentro = cartDrawer.contains(document.activeElement);
        cartDrawer.classList.remove('open');
        cartBtn.setAttribute('aria-expanded', 'false');
        cartDrawer.setAttribute('aria-hidden', 'true');
        if (dentro) { const t = cartDa && document.body.contains(cartDa) && cartDa.offsetParent !== null ? cartDa : cartBtn; t.focus(); }
    }
    // Tab resta dentro il carrello finché è aperto
    cartDrawer.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || !cartDrawer.classList.contains('open')) return;
        const f = Array.from(cartDrawer.querySelectorAll('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')).filter(x => x.offsetParent !== null && getComputedStyle(x).visibility !== 'hidden');
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    const cartContinua = document.getElementById('cartContinua');
    if (cartContinua) cartContinua.addEventListener('click', closeCartDrawer);
    const cartQuasi = document.getElementById('cartQuasi');

    cartBtn.addEventListener('click', () => {
        const isOpen = cartDrawer.classList.contains('open');
        if (isOpen) {
            closeCartDrawer();
        } else {
            openCartDrawer();
        }
    });

    closeCartBtn.addEventListener('click', closeCartDrawer);
    cartOverlay.addEventListener('click', closeCartDrawer);

    function updateCartUI() {
        salvaCarrello();
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        if (totalItems > 0) segnaStelleViste();
        mostraCarrello();
        cartBadge.textContent = totalItems;
        if (totalItems > 0) {
            cartBadge.classList.add('has-items');
        } else {
            cartBadge.classList.remove('has-items');
        }
        
        cartItemsList.innerHTML = "";
        
        if (cart.length === 0) {
            cartItemsList.innerHTML = '<div class="cart-empty-message">Per ora nessuno. I compagni ti aspettano tra le stelle, senza fretta.<br><button type="button" class="btn btn-secondary cart-vai-stelle">Conosci i compagni</button></div>';
            cartSummaryBlock.style.display = 'none';
            cartItemsList.querySelector('.cart-vai-stelle').addEventListener('click', () => {
                closeCartDrawer();
                showView(homeView, null, { scrollTo: '#nvStelle' });
            });
        } else {
            cartSummaryBlock.style.display = 'block';
            let subtotal = 0;
            
            cart.forEach((item, index) => {
                const itemTotal = item.basePrice * item.qty;
                subtotal += itemTotal;
                
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <div class="cart-item-img-container"><img alt=""></div>
                    <div class="cart-item-details">
                        <div class="cart-item-title"></div>
                        <div class="cart-item-meta"></div>
                        <div class="cart-item-price-qty"></div>
                    </div>
                    <button class="remove-cart-item-btn" data-index="${index}"><svg class="icon icon-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                `;
                itemEl.querySelector('img').src = item.img;
                itemEl.querySelector('.cart-item-title').textContent = item.name;
                const meta = itemEl.querySelector('.cart-item-meta');
                // una riga sola: colore e quello che hai aggiunto (i costi da definire li dice il fondo del carrello)
                const ip = item.pers || {};
                meta.textContent = [item.colorName, ip.nome ? `ricamo «${ip.nome}»` : '', ip.biglietto ? 'bigliettino' : '', ip.regalo ? 'regalo' : ''].filter(Boolean).join(' · ');
                // quanti: si cambia anche da qui, senza tornare alla scheda
                const pq = itemEl.querySelector('.cart-item-price-qty');
                pq.innerHTML = '<span class="cart-qty"><button type="button" class="qty-btn" data-d="-1">-</button><output></output><button type="button" class="qty-btn" data-d="1">+</button></span> <span class="cart-item-somma"></span>';
                pq.querySelector('output').textContent = item.qty;
                pq.querySelector('.cart-item-somma').textContent = euro(itemTotal);
                pq.querySelectorAll('.qty-btn').forEach(qb => {
                    const d = +qb.dataset.d;
                    qb.setAttribute('aria-label', (d > 0 ? 'Uno in più: ' : 'Uno in meno: ') + item.name + ', ora ' + item.qty);
                    qb.disabled = d > 0 ? item.qty >= 10 : item.qty <= 1;
                    qb.addEventListener('click', (e) => {
                        e.stopPropagation();
                        item.qty = Math.max(1, Math.min(10, item.qty + d));
                        updateCartUI();
                        const di = cartItemsList.querySelectorAll('.cart-item')[index];   // il focus resta sullo stesso bottone
                        const stesso = di && di.querySelector(`.qty-btn[data-d="${d}"]`);
                        if (stesso && !stesso.disabled) stesso.focus(); else if (di) { const altro = di.querySelector('.qty-btn:not(:disabled)'); if (altro) altro.focus(); }
                    });
                });
                itemEl.querySelector('.remove-cart-item-btn').setAttribute('aria-label', `Togli ${item.name} dal carrello`);
                cartItemsList.appendChild(itemEl);
            });
            
            if (cartSubtotal) cartSubtotal.textContent = euro(subtotal);
            const cartParziale = document.getElementById('cartParziale');
            if (cartParziale) cartParziale.textContent = maiuscola(costiDaDefinire(cart.map(i => i.pers))) + '.';
            // una frase sola, discreta: il nome del tuo compagno se è lui che viene a casa
            if (cartQuasi) {
                const c = compagnoCorrente(), suoId = PRODOTTO_DEL_COMPAGNO[c.animal];
                const nome = (c.name || '').trim() || 'Miele';
                cartQuasi.textContent = cart.some(i => i.id === suoId) ? `Ancora un passo, e ${nome} viene a casa con te.` : 'Ancora un passo, e si parte.';
            }
        }
        
        if (checkoutBtn) { checkoutBtn.disabled = cart.length === 0; checkoutBtn.style.visibility = cart.length ? '' : 'hidden'; }
        // se la cassa è aperta, il riepilogo segue il carrello (vuoto: si torna indietro)
        if (!ordineFatto && typeof checkoutView !== 'undefined' && checkoutView && checkoutView.classList.contains('active')) {
            if (cart.length) riempiCassa(); else showView(homeView, null, { scrollTo: '#nvStelle' });
        }

        const removeBtns = cartItemsList.querySelectorAll('.remove-cart-item-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'), 10);
                cart.splice(index, 1);
                updateCartUI();
            });
        });
    }

    // ------------------------------------------------------------------
    // LA CASSA — pagina #checkout-view. CHECKOUT SIMULATO, SOLO DIMOSTRAZIONE.
    // Nessun pagamento vero passa da qui e nessun dato viene inviato o salvato. La carta non si scrive
    // mai qui: alla conferma, in produzione, si va sulla pagina del fornitore (Stripe Checkout, creata
    // dal server con il carrello, oppure PayPal). Il sito NON raccoglie numero di carta e CVV (PCI-DSS).
    // ------------------------------------------------------------------
    const cassaArticoli = document.getElementById('cassaArticoli');
    const cassaSubtotale = document.getElementById('cassaSubtotale');
    const cassaRigaRicamo = document.getElementById('cassaRigaRicamo');
    const cassaPagaTotale = document.getElementById('cassaPagaTotale');
    const cassaPaga = document.getElementById('cassaPaga');
    const cassaErrore = document.getElementById('cassaErrore');
    const cassaStesso = document.getElementById('cassaStessoIndirizzo');
    const cassaFatturaBox = document.getElementById('cassaFatturaBox');
    const cassaFattura = document.getElementById('cassaFattura');
    const cassaProvincia = document.getElementById('cassaProvincia');
    const cassaIndietro = document.getElementById('cassaIndietro');
    let cassaDa = null;                // da dove sei arrivato alla cassa, per tornarci

    function totaleCarrello() { return cart.reduce((sum, item) => sum + (item.basePrice * item.qty), 0); }

    function riempiCassa() {
        const tot = totaleCarrello();
        cassaArticoli.innerHTML = '';
        cart.forEach(item => {
            const li = document.createElement('li');
            li.className = 'cassa-articolo';
            li.innerHTML = '<img alt=""><div class="cassa-art-testo"><strong></strong><span class="cassa-art-meta"></span></div><span class="cassa-art-prezzo"></span>';
            li.querySelector('img').src = item.img;
            li.querySelector('strong').textContent = `${item.qty}× ${item.name}`;
            li.querySelector('.cassa-art-meta').textContent = [item.colorName].concat(descriviPers(item.pers)).filter(Boolean).join(' · ');
            li.querySelector('.cassa-art-prezzo').textContent = euro(item.basePrice * item.qty);
            cassaArticoli.appendChild(li);
        });
        cassaSubtotale.textContent = euro(tot);
        checkoutTotalVal.textContent = euro(tot);
        cassaPagaTotale.textContent = euro(tot);
        const resto = document.getElementById('cassaPagaResto');
        if (resto) resto.textContent = '+ ' + costiDaDefinire(cart.map(i => i.pers));
        cassaRigaRicamo.hidden = !cart.some(item => item.pers && (item.pers.nome || item.pers.biglietto));
        // sul telefono il riepilogo è una riga sola (quanti e quanto), e si apre se vuoi; sul computer resta aperto
        const quanti = cart.reduce((n, item) => n + item.qty, 0);
        const breve = document.getElementById('cassaRiepBreve'), apri = document.getElementById('cassaRiepApri');
        if (breve) breve.textContent = `${quanti} ${quanti === 1 ? 'compagno' : 'compagni'} · ${euro(tot)}`;
        if (apri) apri.open = !(window.matchMedia && matchMedia('(max-width: 900px)').matches);
    }

    function openCheckout() {
        if (cart.length === 0) return;
        closeCartDrawer();
        cassaDa = views.find(v => v && v.classList.contains('active')) || homeView;
        riempiCassa();
        aggiornaMetodo();
        showView(checkoutView, null);
    }
    checkoutBtn.addEventListener('click', openCheckout);
    // il carrello di prima (se c'era) torna al suo posto
    caricaCarrello();
    updateCartUI();
    const diarioIndietro = document.getElementById('diarioIndietro');
    if (diarioIndietro) diarioIndietro.addEventListener('click', () => history.length > 1 ? history.back() : showView(homeView, null));
    if (cassaIndietro) cassaIndietro.addEventListener('click', () => history.length > 1 ? history.back() : showView(cassaDa || homeView, null));

    // carta (con Stripe) o PayPal: cambia solo dove si va a pagare
    const cassaFornitore = document.getElementById('cassaFornitore');
    function metodo() { const m = checkoutForm.querySelector('input[name="metodo"]:checked'); return m ? m.value : 'carta'; }
    function fornitore() { return metodo() === 'paypal' ? 'PayPal' : 'Stripe'; }
    function aggiornaMetodo() { if (cassaFornitore) cassaFornitore.textContent = fornitore(); }
    checkoutForm.querySelectorAll('input[name="metodo"]').forEach(r => r.addEventListener('change', aggiornaMetodo));
    cassaStesso.addEventListener('change', () => {
        cassaFatturaBox.hidden = cassaStesso.checked;
        cassaFattura.required = !cassaStesso.checked;
    });
    cassaProvincia.addEventListener('input', () => { cassaProvincia.value = cassaProvincia.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2); });

    // i controlli: messaggi gentili accanto al campo, e il primo da sistemare riceve il focus
    function controlla(inp) {
        if (!inp.required && !inp.value) return '';
        const v = inp.value.trim();
        if (inp.type === 'checkbox') return inp.checked ? '' : inp.dataset.msg;
        if (!v) return inp.dataset.msg || 'Manca questo dato.';
        if (inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return inp.dataset.msg;
        if (inp.pattern && !new RegExp('^(?:' + inp.pattern + ')$').test(v)) return inp.dataset.msg;
        return '';
    }
    function segnala(inp, msg) {
        const casa = inp.closest('.form-group') || inp.closest('label') || inp.parentElement;
        let p = casa.querySelector(':scope > .cassa-msg');
        if (msg) {
            if (!p) {
                p = document.createElement('p');
                p.className = 'cassa-msg';
                p.id = inp.id + 'Msg';
                casa.appendChild(p);
            }
            p.textContent = msg;
            inp.setAttribute('aria-invalid', 'true');
            const desc = (inp.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== p.id);
            inp.setAttribute('aria-describedby', desc.concat(p.id).join(' '));
        } else {
            if (p) p.remove();
            inp.removeAttribute('aria-invalid');
            const desc = (inp.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== inp.id + 'Msg');
            if (desc.length) inp.setAttribute('aria-describedby', desc.join(' ')); else inp.removeAttribute('aria-describedby');
        }
    }
    checkoutForm.querySelectorAll('input, select').forEach(inp => {
        inp.addEventListener('blur', () => { if (inp.getAttribute('aria-invalid') === 'true' || (inp.value && inp.type !== 'checkbox')) segnala(inp, controlla(inp)); });
        inp.addEventListener('change', () => { if (inp.type === 'checkbox' && inp.getAttribute('aria-invalid') === 'true') segnala(inp, controlla(inp)); });
    });

    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!cart.length || cassaPaga.disabled) return;
        const campi = Array.from(checkoutForm.querySelectorAll('input, select')).filter(inp => !inp.closest('[hidden]') && (inp.required || inp.value));
        let primo = null, quanti = 0;
        campi.forEach(inp => {
            if (inp.type === 'radio') return;
            const msg = controlla(inp);
            segnala(inp, msg);
            if (msg) { quanti++; if (!primo) primo = inp; }
        });
        if (primo) {
            cassaErrore.textContent = quanti === 1 ? 'Manca ancora una cosa: te l\'abbiamo segnata.' : `Mancano ancora ${quanti} cose: te le abbiamo segnate.`;
            cassaErrore.hidden = false;
            primo.focus();
            return;
        }
        cassaErrore.hidden = true;

        // "pagamento" simulato: un momento di attesa, poi la conferma
        const nome = (compagnoCorrente().name || '').trim() || 'Miele';
        const testo = cassaPaga.querySelector('.cassa-paga-testo');
        const prima = testo.innerHTML;
        cassaPaga.disabled = true;
        cassaPaga.setAttribute('aria-busy', 'true');
        // in produzione: qui si va sulla pagina del fornitore (Stripe Checkout o PayPal) e si torna alla conferma
        testo.textContent = `Ti portiamo su ${fornitore()}…`;

        setTimeout(() => {
            const totalPaid = totaleCarrello();
            successTotalPaid.textContent = euro(totalPaid);
            successOrderItems.innerHTML = "";
            cart.forEach(item => {
                const row = document.createElement('div');
                row.className = 'success-order-item-row';
                const what = document.createElement('span');
                what.textContent = [`${item.qty}× ${item.name}`, item.colorName].concat(descriviPers(item.pers)).filter(Boolean).join(' · ');
                const price = document.createElement('span');
                price.className = 'item-info';
                price.textContent = euro(item.basePrice * item.qty);
                row.append(what, price);
                successOrderItems.appendChild(row);
            });
            mostraQr(cart.slice());
            checkoutForm.reset();
            aggiornaMetodo();
            cassaFatturaBox.hidden = true;
            checkoutForm.querySelectorAll('[aria-invalid]').forEach(inp => segnala(inp, ''));
            testo.innerHTML = prima;
            cassaPaga.disabled = false;
            cassaPaga.removeAttribute('aria-busy');
            ordineFatto = true;
            cart = [];
            updateCartUI();
            ordineFatto = false;
            showView(successView, null);
        }, 1400);
    });

    // ------------------------------------------------------------------
    // Il QR del compagno, nella conferma d'ordine: per ogni peluche, un codice che apre il sito con
    // lui (#ciao=animale.colore.cuore.nome, lo legge onboarding.js). Il nome è quello ricamato, o quello
    // del tuo compagno se è lo stesso animale. La libreria (assets/qrcode.min.js, MIT) arriva solo qui.
    // ------------------------------------------------------------------
    const ANIMALE_DEL_PRODOTTO = { 1: 'orso', 2: 'peluche', 3: 'koala' };
    function identitaPeluche(item) {
        const a = ANIMALE_DEL_PRODOTTO[item.id] || 'peluche';
        const C = window.LaskaCompanion, mio = compagnoCorrente();
        const colori = C && C.animals && C.animals[a] ? C.animals[a].colors : [];
        const perNome = colori.find(o => o.label === item.colorName) || colori.find(o => o.key === item.color);
        const stesso = mio.animal === a;
        return {
            animal: a,
            color: perNome ? perNome.key : (stesso && mio.color) || (colori[0] ? colori[0].key : 'classico'),
            heart: stesso && mio.heart ? mio.heart : 'rosa',
            name: ((item.pers && item.pers.nome) || (stesso ? mio.name : '') || 'Miele').trim().slice(0, 20),
            colorName: perNome ? perNome.label : (item.colorName || '')
        };
    }
    function indirizzoCiao(id) {
        const base = location.href.split('#')[0];
        return base + '#ciao=' + [id.animal, id.color, id.heart, encodeURIComponent(id.name)].join('.');
    }
    let qrLib = null;
    function caricaQr(poi) {
        if (window.qrcode) { poi(); return; }
        if (!qrLib) {
            qrLib = new Promise((ok, no) => {
                const s = document.createElement('script');
                s.src = 'assets/qrcode.min.js?v=20261114a'; s.async = true;
                s.onload = ok; s.onerror = no;
                document.head.appendChild(s);
            });
        }
        qrLib.then(poi, () => { const box = document.getElementById('successQr'); if (box) box.hidden = true; });
    }
    function mostraQr(articoli) {
        const box = document.getElementById('successQr'), lista = document.getElementById('successQrLista'), nota = document.getElementById('successQrNota');
        if (!box || !lista) return;
        lista.textContent = '';
        box.hidden = !articoli.length;
        if (!articoli.length) return;
        if (nota) nota.hidden = /^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
        caricaQr(() => {
            articoli.forEach(item => {
                const id = identitaPeluche(item);
                const animale = window.LaskaCompanion && window.LaskaCompanion.animals[id.animal] ? window.LaskaCompanion.animals[id.animal].label : '';
                const q = window.qrcode(0, 'M');
                q.addData(indirizzoCiao(id));
                q.make();
                const fig = document.createElement('figure');
                fig.className = 'success-qr-codice';
                fig.innerHTML = q.createSvgTag({ cellSize: 4, margin: 3, scalable: true, alt: 'Codice QR per ritrovare ' + id.name + ' sul sito' }) + '<figcaption><strong></strong><span></span></figcaption>';
                fig.querySelector('strong').textContent = id.name;
                fig.querySelector('figcaption span').textContent = [animale, id.colorName].filter(Boolean).join(', ');
                lista.appendChild(fig);
            });
        });
    }

    // Pulsanti di ritorno e home successo
    backToPlushBtn.addEventListener('click', () => {
        showView(homeView, null, { scrollTo: '#nvStelle' });
    });

    successHomeBtn.addEventListener('click', () => {
        showView(homeView, sideNavHomeBtn);
    });

    // ==========================================
    // 10. EMOTIONAL CHAT DRAWER (Phase 3)
    // ==========================================
    const chatFloatingBtn = document.getElementById('chatFloatingBtn');
    const chatDrawer = document.getElementById('chatDrawer');
    const chatDrawerOverlay = document.getElementById('chatDrawerOverlay');
    const closeChatDrawerBtn = document.getElementById('closeChatDrawerBtn');
    const chatDrawerMessages = document.getElementById('chatDrawerMessages');
    const chatDrawerForm = document.getElementById('chatDrawerForm');
    const chatDrawerInput = document.getElementById('chatDrawerInput');

    function openChatDrawer() {
        if (chatDrawer) {
            chatDrawer.classList.add('open');
            chatDrawerMessages.scrollTop = chatDrawerMessages.scrollHeight;
            setTimeout(() => {
                if (chatDrawerInput) chatDrawerInput.focus();
            }, 100);
        }
    }

    function closeChatDrawer() {
        if (chatDrawer) {
            chatDrawer.classList.remove('open');
        }
    }

    if (chatFloatingBtn) {
        chatFloatingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openChatDrawer();
        });

        // La chat non chiede attenzione subito: compare dopo un po', o appena scendi nella pagina.
        // Con la tastiera la trovi comunque: si mostra appena riceve il focus.
        let chatTimer = null;
        const mostraChat = () => {
            document.body.classList.add('chat-pronta');
            clearTimeout(chatTimer);
            window.removeEventListener('scroll', chatSuScroll);
        };
        const chatSuScroll = () => { if (window.scrollY > window.innerHeight * 0.5) mostraChat(); };
        chatTimer = setTimeout(mostraChat, 30000);
        window.addEventListener('scroll', chatSuScroll, { passive: true });
        chatFloatingBtn.addEventListener('focus', mostraChat);
        document.addEventListener('laska:hchapter', mostraChat, { once: true });
    }

    if (closeChatDrawerBtn) {
        closeChatDrawerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeChatDrawer();
        });
    }

    if (chatDrawerOverlay) {
        chatDrawerOverlay.addEventListener('click', () => {
            closeChatDrawer();
        });
    }

    // Dynamic initial message based on character and name
    function initLaskaChat(name, character) {
        if (!chatDrawerMessages) return;
        chatDrawerMessages.innerHTML = '';
        
        const welcome = "Sei tornato. Com'è la notte, stanotte?";
        appendChatMessage(welcome, 'bot');
    }

    function appendChatMessage(text, sender) {
        if (!chatDrawerMessages) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}-msg`;
        
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        
        if (sender === 'bot') {
            bubble.textContent = `${iconaCompagno()} ${text}`;
        } else {
            bubble.textContent = text;
        }
        
        msgDiv.appendChild(bubble);
        chatDrawerMessages.appendChild(msgDiv);
        chatDrawerMessages.scrollTop = chatDrawerMessages.scrollHeight;
    }

    function spawnFloatingHeart() {
        const container = document.getElementById('heartViewerContainer');
        if (!container) return;
        
        const heart = document.createElement('span');
        heart.className = 'floating-heart-element';
        heart.innerHTML = '❤️';
        // Position it near the heart model-viewer
        heart.style.left = `${40 + Math.random() * 20}%`;
        heart.style.top = `60%`;
        
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 2500);
    }

    // Italian chatbot response generator based on personality
    // ------------------------------------------------------------------
    // SICUREZZA DELLA CHAT
    // Prima di qualsiasi risposta affettuosa si controlla se il messaggio parla di
    // farsi del male o di non voler più vivere. In quel caso la risposta è sempre la
    // stessa, seria e calda, per tutti i caratteri del compagno, con il 112 e
    // Telefono Amico Italia (02 2327 2327, verificato a novembre 2026).
    // Il testo viene normalizzato: minuscole, niente accenti, apostrofi uniformi.
    // ------------------------------------------------------------------
    // Le regole (crisi, panico, ansia, tristezza, sonno, positivo) stanno in chat-sicurezza.js,
    // provate con: node tests/chat-crisi.test.js
    // Se quel file mancasse, una rete minima tiene comunque fuori le parole più gravi.
    const SICUREZZA = window.LaskaChatSicurezza || null;
    function chatCategory(text) {
        if (SICUREZZA) return SICUREZZA.categoria(text);
        console.error('Laska: chat-sicurezza.js non caricato');
        const t = String(text || '').toLowerCase();
        return /suicid|uccid|ammazz|morire|morte|farla finita|togliermi la vita|farmi del male|mi faccio male|sparire|pillole|per sempre/.test(t) ? 'crisi' : 'neutro';
    }
    function isCrisisMessage(text) {
        return chatCategory(text) === 'crisi';
    }

    function generateLaskaReply(userMsg, name, char) {
        
        const replies = {
            sognatore: {
                anxiety: "Le nuvole dell'ansia corrono veloci, ma oltre c'è sempre un cielo stellato. Soffiamole via insieme.",
                sadness: "Se sei triste, immagina che stiamo volando su una soffice nuvola lilla. Io ti stringo forte.",
                sleep: "La notte è il momento in cui i sogni nascono. Chiudi gli occhi, ti guido io.",
                gratitude: "Il tuo sorriso brilla come una piccola stella. Grazie a te per essere qui.",
                default: "Sussurrami i tuoi pensieri. Io li trasformerò in sogni leggeri."
            },
            calmo: {
                anxiety: "Espira lentamente... Senti il mio cuoricino che batte piano. Sei al sicuro, qui con me.",
                sadness: "Va bene essere tristi. Le emozioni sono come onde, arrivano e poi se ne vanno. Io rimango qui.",
                sleep: "Rilassa le spalle e respira a ritmo con me. È tempo di riposare.",
                gratitude: "Questo momento di pace è prezioso. Sono felice che lo stiamo condividendo.",
                default: "Concentrati sul presente, un piccolo respiro alla volta. Tutto il resto può aspettare."
            },
            ansioso: {
                anxiety: "Oh, capisco perfettamente... fa paura, vero? Ma respira con me, un passo alla volta ce la facciamo.",
                sadness: "Anche a me capita di sentirmi giù. Vuoi che ci teniamo la zampa in silenzio?",
                sleep: "La notte fa fare tanti pensieri... ma stasera siamo in due ad affrontare il buio. Riposiamoci.",
                gratitude: "Grazie a te! Parlare con te mi fa sentire molto più tranquillo.",
                default: "A volte è dura, ma ci stiamo provando, e questo è già un successo enorme."
            },
            dolce: {
                anxiety: "Stringimi forte al petto! Senti quanto ti voglio bene. L'ansia non può battere il nostro abbraccio.",
                sadness: "Sei una persona meravigliosa. Ti regalo un pezzettino del mio cuore caldo per consolarti.",
                sleep: "Ti copro io con una copertina di sogni morbidi. Fai la nanna, ci sono io.",
                gratitude: "Sei dolcissimo! Le tue parole mi riscaldano il pancino.",
                default: "Sei già abbastanza così come sei. Non dimenticarlo mai."
            },
            dormiglione: {
                anxiety: "Yawn... l'ansia stanca un sacco. Sdraiati vicino a me e facciamo un pisolino per dimenticarla.",
                sadness: "Uff, la tristezza è pesante... Mettiamoci sotto le coperte a fare un letargo di coccole.",
                sleep: "Ronf... stavo già sognando dei prati soffici. Vieni anche tu?",
                gratitude: "Yawn... grazie. Mi fai sentire così al sicuro che quasi mi riaddormento.",
                default: "Niente da fare stasera, solo riposo profondo. Chiudi gli occhi..."
            }
        };
        
        const charReplies = replies[char] || replies['sognatore'];

        // l'ordine è deciso in chat-sicurezza.js: crisi e panico non arrivano mai qui
        const RISPOSTA_DI = { ansia: 'anxiety', tristezza: 'sadness', sonno: 'sleep', positivo: 'gratitude' };
        return charReplies[RISPOSTA_DI[chatCategory(userMsg)]] || charReplies.default;
    }

    // La risposta di crisi: niente emoji, niente giochi, due modi per chiamare subito
    function appendCrisisMessage() {
        if (!chatDrawerMessages) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg bot-msg is-crisis';
        msgDiv.setAttribute('role', 'alert');
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble crisis-bubble';
        [
            'Quello che mi hai scritto è importante. Grazie per avermelo detto.',
            'Io sono un peluche e non posso bastare, ma non devi affrontare questo momento senza nessuno.',
            'Se pensi di farti del male o sei in pericolo, chiama adesso il 112.',
            'Se vuoi parlare con una persona, Telefono Amico Italia ascolta allo 02 2327 2327, tutti i giorni fino a mezzanotte, anche su WhatsApp al 324 011 7252.',
            'Io resto qui con te mentre chiami.'
        ].forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            bubble.appendChild(p);
        });
        const actions = document.createElement('div');
        actions.className = 'crisis-actions';
        [
            { href: 'tel:112', label: 'Chiama il 112', primary: true },
            { href: 'tel:+390223272327', label: 'Chiama Telefono Amico' },
            { href: 'https://wa.me/393240117252', label: 'Scrivi su WhatsApp', external: true }
        ].forEach(a => {
            const link = document.createElement('a');
            link.className = 'crisis-call' + (a.primary ? ' is-primary' : '');
            link.href = a.href;
            link.textContent = a.label;
            if (a.external) { link.target = '_blank'; link.rel = 'noopener'; }
            actions.appendChild(link);
        });
        bubble.appendChild(actions);
        msgDiv.appendChild(bubble);
        chatDrawerMessages.appendChild(msgDiv);
        chatDrawerMessages.scrollTop = chatDrawerMessages.scrollHeight;
    }

    // La risposta al panico: prima quando chiamare il 112, poi il respiro insieme (cinque e cinque)
    function appendPanicMessage() {
        if (!chatDrawerMessages) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg bot-msg is-crisis is-panico';
        msgDiv.setAttribute('role', 'alert');
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble crisis-bubble';
        [
            'Quello che descrivi può essere un attacco di panico.',
            'Se hai dolore al petto, fai fatica a respirare o è la prima volta che ti succede, chiama subito il 112.',
            'Altrimenti respiriamo insieme: inspira piano contando fino a cinque, poi espira contando fino a cinque. Ancora, per qualche volta.',
            'Il panico sale, tocca il punto più alto e poi scende da solo, di solito nel giro di pochi minuti.'
        ].forEach(line => {
            const p = document.createElement('p');
            p.textContent = line;
            bubble.appendChild(p);
        });
        const actions = document.createElement('div');
        actions.className = 'crisis-actions';
        const link = document.createElement('a');
        link.className = 'crisis-call is-primary';
        link.href = 'tel:112';
        link.textContent = 'Chiama il 112';
        actions.appendChild(link);
        bubble.appendChild(actions);
        msgDiv.appendChild(bubble);
        chatDrawerMessages.appendChild(msgDiv);
        chatDrawerMessages.scrollTop = chatDrawerMessages.scrollHeight;
    }

    if (chatDrawerForm) {
        chatDrawerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatDrawerInput.value.trim();
            if (!text) return;
            
            appendChatMessage(text, 'user');
            chatDrawerInput.value = '';

            // Sicurezza: prima la crisi (farsi del male), poi il panico; solo dopo le risposte del compagno
            const categoriaMsg = chatCategory(text);
            if (categoriaMsg === 'crisi') {
                setTimeout(appendCrisisMessage, 400);
                return;
            }
            if (categoriaMsg === 'panico') {
                setTimeout(appendPanicMessage, 400);
                return;
            }
            
            // Plush reactions
            if (plushWrapper) {
                plushWrapper.classList.add('ears-perked');
                plushWrapper.classList.add('eyes-wide');
                setTimeout(() => {
                    plushWrapper.classList.remove('ears-perked');
                }, 1000);
                setTimeout(() => {
                    plushWrapper.classList.remove('eyes-wide');
                }, 1500);
            }
            
            // AI Response Delay
            setTimeout(() => {
                const reply = generateLaskaReply(text, laskaName, laskaChar);
                appendChatMessage(reply, 'bot');
                spawnFloatingHeart();
            }, 1000);
        });
    }


    // ==========================================
    // 12. AMBIENT SOUND CONTROLLER (Phase 2)
    // ==========================================
    const ambientBtns = document.querySelectorAll('.ambient-sound-btn');
    ambientBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            ambientBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const soundType = btn.getAttribute('data-sound');
            stopSoundTherapy();
            
            if (soundType !== 'off') {
                initAudio();
                isSoundPlaying = true;
                if (soundType === 'rain') {
                    playRain();
                } else if (soundType === 'forest') {
                    playForestWindAndBirds();
                } else if (soundType === 'ocean') {
                    playOceanWaves();
                }
            } else {
                isSoundPlaying = false;
            }
        });
    });

    // Regolazione materiale dei cuori 3D (heart_in_love.glb) per effetto emissivo rosso glow
    const setupHeartMaterialGlow = (viewerElement) => {
        if (!viewerElement) return;
        
        const applyGlow = () => {
            const materials = viewerElement.model.materials;
            if (materials && materials.length > 0) {
                const material = materials[0];
                // Imposta un fattore emissivo elevato per l'effetto glow rosso
                material.setEmissiveFactor([2.2, 0.05, 0.05]);
                if (material.pbrMetallicRoughness) {
                    material.pbrMetallicRoughness.setBaseColorFactor([1.0, 0.15, 0.15, 1.0]);
                    material.pbrMetallicRoughness.setRoughnessFactor(0.25);
                }
            }
        };

        if (viewerElement.loaded) {
            applyGlow();
        } else {
            viewerElement.addEventListener('load', applyGlow);
        }
    };

    setupHeartMaterialGlow(document.getElementById('heartViewer'));
    setupHeartMaterialGlow(document.getElementById('rhythmHeartViewer'));

    // ==========================================
    // 13. STANZA VIRTUALE (Parallax, Cursore, Musica Ambient & Peluche)
    // ==========================================

    // Parallax nella stanza virtuale
    const roomWalls = document.querySelector('.room-walls');
    if (roomWalls) {
        document.addEventListener('mousemove', (e) => {
            if (!roomView.classList.contains('active')) return;
            const mx = (e.clientX / window.innerWidth) - 0.5;
            const my = (e.clientY / window.innerHeight) - 0.5;
            roomWalls.style.setProperty('--mx', mx);
            roomWalls.style.setProperty('--my', my);
        });
    }

    // Effetto cursore magico con stelline pastello
    let lastTrailTime = 0;
    let isCursorOverPlush = false;
    let tiltRafId = null; // mancava: senza questa riga passare sopra un peluche dava errore
    let currentHoveredPlush = null;
    let sciaLuce = null; // la scia su canvas (initCustomCursorAndTrail): se c'è, le scintille si disegnano lì invece di creare elementi

    function isTouchDevice() {
        return window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    }

    // Hover delegation e rilevamento del cursore sopra i peluche
    document.addEventListener('mouseover', (e) => {
        const plush = e.target.closest('.interactive-plush, .product-img, .carousel-plush-img, #heroPelucheImg, #figmaPelucheImg, #plushQuizResultImg, #detailProductImg');
        if (plush) {
            isCursorOverPlush = true;
            currentHoveredPlush = plush;
            if (!plush.classList.contains('interactive-plush')) {
                plush.classList.add('interactive-plush');
            }
            plush.classList.add('plush-hover-active');
        }
    });

    document.addEventListener('mouseout', (e) => {
        const plush = e.target.closest('.interactive-plush, .product-img, .carousel-plush-img, #heroPelucheImg, #figmaPelucheImg, #plushQuizResultImg, #detailProductImg');
        if (plush) {
            // Rientro morbido: reset graduale delle variabili tilt, affidato alla transizione CSS 1.2s
            plush.style.setProperty('--tilt-r', '0deg');
            plush.style.setProperty('--tilt-y', '0px');
            plush.style.setProperty('--tilt-x', '0px');
            plush.classList.remove('plush-hover-active');

            if (currentHoveredPlush === plush) {
                isCursorOverPlush = false;
                currentHoveredPlush = null;
            }
        }
    });

    document.addEventListener('click', (e) => {
        const plush = e.target.closest('.interactive-plush, .product-img, .carousel-plush-img, #heroPelucheImg, #figmaPelucheImg, #plushQuizResultImg, #detailProductImg');
        if (plush) {
            triggerPlushClickWave(plush, e.clientX, e.clientY);
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (isCursorOverPlush && currentHoveredPlush) {
            // Micro-inclinazione dinamica verso il cursore (Tilt max ±1°, translateY 2-3px)
            if (!tiltRafId) {
                tiltRafId = requestAnimationFrame(() => {
                    if (currentHoveredPlush) {
                        const rect = currentHoveredPlush.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        const relX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
                        const relY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

                        const tiltR = (relX * 1.0).toFixed(2);
                        const tiltY = (relY * 2.5).toFixed(2);
                        const tiltX = (relX * 1.5).toFixed(2);

                        currentHoveredPlush.style.setProperty('--tilt-r', `${tiltR}deg`);
                        currentHoveredPlush.style.setProperty('--tilt-y', `${tiltY}px`);
                        currentHoveredPlush.style.setProperty('--tilt-x', `${tiltX}px`);
                    }
                    tiltRafId = null;
                });
            }

            // Generazione 2-4 particelle di luce soffusa sopra il peluche (trail rallentata a 130ms)
            if (now - lastTrailTime >= 130) {
                lastTrailTime = now;
                if (sciaLuce) sciaLuce.morbide(e.clientX, e.clientY);
                else spawnPlushHoverSparkles(e.clientX, e.clientY);
            }
        } else {
            // Normale cursor trail di sfondi/pagine
            if (now - lastTrailTime >= 45) {
                lastTrailTime = now;
                if (sciaLuce) sciaLuce.stelline(e.clientX, e.clientY);
                else spawnSparkle(e.clientX, e.clientY);
            }
        }
    });
    
    // Effetto scia del cursore con particelle luminose ed eteree
    const spawnSparkle = (x, y) => {
        // Alternanza tra stelline starlight e sfere eteree di luce
        const isStar = Math.random() > 0.4;
        
        if (isStar) {
            const star = document.createElement('span');
            star.className = 'cursor-star';
            
            const offsetDist = Math.random() * 12;
            const angle = Math.random() * Math.PI * 2;
            const px = x + window.scrollX + Math.cos(angle) * offsetDist;
            const py = y + window.scrollY + Math.sin(angle) * offsetDist;
            
            star.style.left = `${px}px`;
            star.style.top = `${py}px`;
            
            const scale = Math.random() * 0.65 + 0.35;
            star.style.transform = `scale(${scale})`;
            
            const colors = ['#CBB7F5', '#F5D2DF', '#FFF3CD', '#E3DBFA', '#B8E1FF', '#FFFFFF'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            star.style.color = color;
            star.style.textShadow = `0 0 10px ${color}, 0 0 18px ${color}`;
            
            const symbols = ['✦', '✧', '•', '✦', '✧'];
            star.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            
            const driftX = (Math.random() - 0.5) * 24;
            const driftY = - (Math.random() * 20 + 10);
            star.style.setProperty('--star-dx', `${driftX}px`);
            star.style.setProperty('--star-dy', `${driftY}px`);
            
            document.body.appendChild(star);
            
            requestAnimationFrame(() => {
                star.classList.add('fade-move');
            });
            
            setTimeout(() => {
                star.remove();
            }, 1600);
        } else {
            const particle = document.createElement('span');
            particle.className = 'cursor-ethereal-particle';
            
            const size = Math.random() * 5 + 3; // 3-8px
            const px = x + window.scrollX + (Math.random() - 0.5) * 14;
            const py = y + window.scrollY + (Math.random() - 0.5) * 14;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${px}px`;
            particle.style.top = `${py}px`;
            
            const dx = (Math.random() - 0.5) * 22;
            const dy = - (Math.random() * 25 + 10);
            particle.style.setProperty('--p-dx', `${dx}px`);
            particle.style.setProperty('--p-dy', `${dy}px`);
            
            const colors = ['#D2B9FF', '#B8E1FF', '#F8C3DC', '#FFF3CD', '#FFFFFF', '#E3DBFA'];
            const bg = colors[Math.floor(Math.random() * colors.length)];
            particle.style.background = bg;
            particle.style.boxShadow = `0 0 8px ${bg}, 0 0 14px ${bg}`;
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                particle.remove();
            }, 1600);
        }
    };

    // Particelle delicate per l'hover sui peluche (2-4 piccole particelle che fluttuano verso l'alto)
    const spawnPlushHoverSparkles = (x, y) => {
        const count = Math.floor(Math.random() * 3) + 2; // 2-4 particelle
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('span');
            particle.className = 'plush-sparkle-particle';

            const dx = (Math.random() - 0.5) * 16;
            const dy = - (Math.random() * 20 + 15); // Fluttuazione verso l'alto (15-35px)

            const size = Math.random() * 3 + 3; // 3-6px
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${x + window.scrollX + (Math.random() - 0.5) * 10}px`;
            particle.style.top = `${y + window.scrollY + (Math.random() - 0.5) * 10}px`;
            particle.style.setProperty('--p-dx', `${dx}px`);
            particle.style.setProperty('--p-dy', `${dy}px`);

            // Palette azzurro pastello / lavanda / bianco soffuso
            const colors = ['#D4E5FF', '#E5D9F2', '#FAF8FF', '#E8F1F5', '#C8D9F6'];
            const bg = colors[Math.floor(Math.random() * colors.length)];
            particle.style.background = bg;
            particle.style.boxShadow = `0 0 6px ${bg}`;

            document.body.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 1800);
        }
    };

    // Onda di particelle luminose e morbida espansione al click sul peluche (Onda di Calma)
    const triggerPlushClickWave = (plushEl, clientX, clientY) => {
        if (!plushEl) return;

        // Micro-animazione morbida al click: scale(1) -> scale(1.04) -> scale(1) in 700ms
        plushEl.classList.remove('plush-clicked');
        void plushEl.offsetWidth; // Trigger reflow
        plushEl.classList.add('plush-clicked');
        setTimeout(() => {
            plushEl.classList.remove('plush-clicked');
        }, 700);

        // Nascita onda di 3-5 particelle ultraleggere che si espandono all'esterno
        const particleCount = Math.floor(Math.random() * 3) + 3; // 3-5 particelle
        const rect = plushEl.getBoundingClientRect();
        const centerX = clientX || (rect.left + rect.width / 2);
        const centerY = clientY || (rect.top + rect.height / 2);

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('span');
            particle.className = 'plush-sparkle-particle';

            const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
            const distance = Math.random() * 25 + 15;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;

            const size = Math.random() * 4 + 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${centerX + window.scrollX}px`;
            particle.style.top = `${centerY + window.scrollY}px`;
            particle.style.setProperty('--p-dx', `${dx}px`);
            particle.style.setProperty('--p-dy', `${dy}px`);

            const colors = ['#D4E5FF', '#E5D9F2', '#F9F6FF', '#C5E0FB'];
            const bg = colors[Math.floor(Math.random() * colors.length)];
            particle.style.background = bg;
            particle.style.boxShadow = `0 0 8px ${bg}`;

            document.body.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 1600);
        }
    };




    // Logica custom video player per Stanza della Pioggia
    if (videoPlayPauseBtn && roomVideo) {
        videoPlayPauseBtn.addEventListener('click', () => {
            if (roomVideo.paused) {
                roomVideo.play().catch(e => console.log(e));
                videoPlayPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
            } else {
                roomVideo.pause();
                videoPlayPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
            }
        });
    }

    if (videoMuteBtn && roomVideo) {
        videoMuteBtn.addEventListener('click', () => {
            roomVideo.muted = !roomVideo.muted;
            if (roomVideo.muted) {
                videoMuteBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/></svg>`;
                videoMuteBtn.classList.add('muted');
                stopSoundTherapy(); // Ferma qualsiasi suono sintetizzato attivo nella stanza
            } else {
                videoMuteBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path class="volume-waves" d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
                videoMuteBtn.classList.remove('muted');
            }
        });
    }

    function changeRoomVideo(videoSrc) {
        if (!roomVideo) return;
        const currentSrc = roomVideo.src || '';
        if (!currentSrc.includes(videoSrc)) {
            roomVideo.src = videoSrc;
            roomVideo.load();
            roomVideo.play().then(() => {
                if (videoPlayPauseBtn) {
                    videoPlayPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
                }
            }).catch(e => console.log("Errore riproduzione video:", e));
        }
    }

    if (roomRainBtn) {
        roomRainBtn.addEventListener('click', () => {
            if (roomRainBtn.classList.contains('active')) {
                stopSoundTherapy();
            } else {
                stopSoundTherapy();
                initAudio();
                playRain();
                roomRainBtn.classList.add('active');
                if (roomWavesBtn) roomWavesBtn.classList.remove('active');
                if (roomBowlBtn) roomBowlBtn.classList.remove('active');
                if (roomMountainBtn) roomMountainBtn.classList.remove('active');
                isSoundPlaying = true;

                // Carica il video della pioggia
                changeRoomVideo('assets/camera pioggia.mp4');

                // Se il video era mutato, lo riattiviamo
                if (roomVideo && roomVideo.muted) {
                    roomVideo.muted = false;
                    if (videoMuteBtn) {
                        videoMuteBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path class="volume-waves" d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
                        videoMuteBtn.classList.remove('muted');
                    }
                }
            }
        });
    }

    if (roomWavesBtn) {
        roomWavesBtn.addEventListener('click', () => {
            if (roomWavesBtn.classList.contains('active')) {
                stopSoundTherapy();
            } else {
                stopSoundTherapy();
                initAudio();
                playOceanWaves();
                roomWavesBtn.classList.add('active');
                if (roomRainBtn) roomRainBtn.classList.remove('active');
                if (roomBowlBtn) roomBowlBtn.classList.remove('active');
                if (roomMountainBtn) roomMountainBtn.classList.remove('active');
                isSoundPlaying = true;

                // Carica il video delle onde
                changeRoomVideo('assets/camera onde.mp4');

                // Se il video era mutato, lo riattiviamo
                if (roomVideo && roomVideo.muted) {
                    roomVideo.muted = false;
                    if (videoMuteBtn) {
                        videoMuteBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path class="volume-waves" d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
                        videoMuteBtn.classList.remove('muted');
                    }
                }
            }
        });
    }

    if (roomBowlBtn) {
        roomBowlBtn.addEventListener('click', () => {
            if (roomBowlBtn.classList.contains('active')) {
                stopSoundTherapy();
            } else {
                stopSoundTherapy();
                initAudio();
                playSingingBowl();
                roomBowlBtn.classList.add('active');
                if (roomRainBtn) roomRainBtn.classList.remove('active');
                if (roomWavesBtn) roomWavesBtn.classList.remove('active');
                if (roomMountainBtn) roomMountainBtn.classList.remove('active');
                isSoundPlaying = true;

                // Cambia video in camera aurora.mp4
                changeRoomVideo('assets/camera aurora.mp4');

                // Se il video era mutato, lo riattiviamo
                if (roomVideo && roomVideo.muted) {
                    roomVideo.muted = false;
                    if (videoMuteBtn) {
                        videoMuteBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path class="volume-waves" d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
                        videoMuteBtn.classList.remove('muted');
                    }
                }
            }
        });
    }

    if (roomMountainBtn) {
        roomMountainBtn.addEventListener('click', () => {
            if (roomMountainBtn.classList.contains('active')) {
                stopSoundTherapy();
            } else {
                stopSoundTherapy();
                initAudio();
                playForestWindAndBirds(); // Riproduce il fruscio delle foglie ed il cinguettio degli uccellini
                roomMountainBtn.classList.add('active');
                if (roomRainBtn) roomRainBtn.classList.remove('active');
                if (roomWavesBtn) roomWavesBtn.classList.remove('active');
                if (roomBowlBtn) roomBowlBtn.classList.remove('active');
                isSoundPlaying = true;

                // Carica il video della montagna
                changeRoomVideo('assets/camera montagna.mp4');

                // Se il video era mutato, lo riattiviamo
                if (roomVideo && roomVideo.muted) {
                    roomVideo.muted = false;
                    if (videoMuteBtn) {
                        videoMuteBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path class="volume-waves" d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
                        videoMuteBtn.classList.remove('muted');
                    }
                }
            }
        });
    }
    // Gestione Pulsante Esci dalla Stanza
    // Dal Rifugio (i paesaggi) si torna nella cameretta, davanti alla finestra (cameretta.js)
    const roomBackBtn = document.getElementById('roomBackBtn');
    if (roomBackBtn) {
        roomBackBtn.addEventListener('click', () => {
            if (window.LaskaCameretta && window.LaskaCameretta.torna && window.LaskaCameretta.torna(roomBackBtn)) return;
            showView(homeView, sideNavHomeBtn);
        });
    }
    // L'unica porta del Rifugio: la finestra della cameretta la apre da qui
    window.LaskaRifugio = { apri: () => showView(roomView, headerRoomBtn) };

    // Gestione Scambio Playlist Spotify
    const spotifyShareForm = document.getElementById('spotifyShareForm');
    const spotifyPlaylistsGrid = document.getElementById('spotifyPlaylistsGrid');

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    function createPlaylistCard(title, url, genre) {
        const card = document.createElement('div');
        card.className = 'playlist-card dynamic-playlist';
        
        card.innerHTML = `
            <div class="playlist-icon">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #1DB954;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <div class="playlist-details">
                <h4>${escapeHTML(title)}</h4>
                <span class="playlist-genre">${escapeHTML(genre)}</span>
                <p>Playlist condivisa di recente dalla community per ritrovare il benessere.</p>
            </div>
            <a href="${escapeHTML(url)}" target="_blank" class="playlist-play-btn" aria-label="Ascolta su Spotify">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </a>
        `;
        return card;
    }

    function loadSavedPlaylists() {
        if (!spotifyPlaylistsGrid) return;
        const saved = localStorage.getItem('laska_spotify_playlists');
        if (saved) {
            try {
                const list = JSON.parse(saved);
                list.forEach(p => {
                    const card = createPlaylistCard(p.title, p.url, p.genre);
                    spotifyPlaylistsGrid.appendChild(card);
                });
            } catch(e) {
                console.error("Errore caricamento playlist salvate:", e);
            }
        }
    }

    if (spotifyShareForm && spotifyPlaylistsGrid) {
        spotifyShareForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('playlistTitle');
            const urlInput = document.getElementById('playlistUrl');
            const genreSelect = document.getElementById('playlistGenre');
            
            const title = titleInput.value.trim();
            let url = urlInput.value.trim();
            const genre = genreSelect.value;
            
            if (!title || !url) return;
            
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }

            const newCard = createPlaylistCard(title, url, genre);
            spotifyPlaylistsGrid.appendChild(newCard);
            
            const saved = localStorage.getItem('laska_spotify_playlists');
            let list = [];
            if (saved) {
                try { list = JSON.parse(saved); } catch(e) {}
            }
            list.push({ title, url, genre });
            localStorage.setItem('laska_spotify_playlists', JSON.stringify(list));
            
            spotifyShareForm.reset();
            alert("Grazie! Playlist condivisa con successo.");
        });
        
        loadSavedPlaylists();
    }

    // ==========================================
    // RETRO PIXEL STARS BACKGROUND EFFECT
    // ==========================================
    function initPixelStars() {
        const container = document.getElementById('pixelStarsBackground');
        if (!container) return;

        const starCount = 35;
        for (let i = 0; i < starCount; i++) {
            createPixelStar(container);
        }
    }

    function createPixelStar(container) {
        const star = document.createElement('div');
        star.className = 'retro-pixel-star';
        
        // Pixel sizes: 2px, 3px, or 4px
        const sizes = [2, 3, 4];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Random positions across the hero section
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 95}%`;
        
        const twinkleDuration = 1.2 + Math.random() * 2.5; // 1.2s to 3.7s
        const driftDuration = 30 + Math.random() * 40;     // 30s to 70s
        const animationDelay = Math.random() * -35;        // negative delay to make them start immediately
        
        star.style.setProperty('--twinkle-duration', `${twinkleDuration}s`);
        star.style.setProperty('--drift-duration', `${driftDuration}s`);
        star.style.setProperty('--animation-delay', `${animationDelay}s`);
        
        container.appendChild(star);
    }

    // ==========================================
    // PELUCHE 3D INTERATTIVO E ROTEABILE (HERO)
    // ==========================================
    function updateHeroPlushImage(animal = selectedAnimal, color = furColor) {
        const heroPelucheImg = document.getElementById('heroPelucheImg');
        if (!heroPelucheImg) return;
        
        let imgSrc = 'assets/compagni/peluche-classico.webp';
        if (animal === 'orso') imgSrc = 'assets/compagni/orso-classico.webp';
        else if (animal === 'koala') imgSrc = 'assets/compagni/koala-grigio.webp';
        else if (animal === 'peluche') imgSrc = 'assets/compagni/peluche-classico.webp';

        if (animal === 'peluche') {
            if (color === 'azzurro') imgSrc = 'assets/compagni/peluche-azzurro.webp';
            else if (color === 'beige' || color === 'crema') imgSrc = 'assets/compagni/peluche-crema.webp';
            else if (color === 'rosa') imgSrc = 'assets/compagni/peluche-rosa.webp';
            else if (color === 'verde') imgSrc = 'assets/compagni/peluche-verde.webp';
        } else if (animal === 'orso') {
            if (color === 'azzurro') imgSrc = 'assets/compagni/orso-azzurro.webp';
            else if (color === 'beige' || color === 'crema') imgSrc = 'assets/compagni/orso-crema.webp';
            else if (color === 'rosa') imgSrc = 'assets/compagni/orso-rosa.webp';
            else if (color === 'verde') imgSrc = 'assets/compagni/orso-verde.webp';
        }

        heroPelucheImg.src = imgSrc;
    }

    function init3dPlushRotation() {
        const plush3dStage = document.getElementById('plush3dStage');
        const plush3dCard = document.getElementById('plush3dCard');
        const plush3dGlare = document.getElementById('plush3dGlare');
        const plush3dShadow = document.getElementById('plush3dShadow');
        const toggleBtn = document.getElementById('toggle3dAutoRotateBtn');

        if (!plush3dStage || !plush3dCard) return;

        let rotX = 0;
        let rotY = 0;
        let targetRotX = 0;
        let targetRotY = 0;
        let velX = 0;
        let velY = 0;

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        let autoRotate = true;

        if (toggleBtn) {
            toggleBtn.classList.add('active');
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                autoRotate = !autoRotate;
                const badgeText = toggleBtn.querySelector('.badge-text');
                if (autoRotate) {
                    toggleBtn.classList.add('active');
                    if (badgeText) badgeText.textContent = '';
                } else {
                    toggleBtn.classList.remove('active');
                    if (badgeText) badgeText.textContent = '';
                }
            });
        }

        function onPointerDown(e) {
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            lastX = clientX;
            lastY = clientY;
            velX = 0;
            velY = 0;
            plush3dStage.classList.add('is-dragging');
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const deltaX = clientX - lastX;
            const deltaY = clientY - lastY;

            targetRotY += deltaX * 0.55;
            targetRotX -= deltaY * 0.4;

            // Limita la rotazione sull'asse X per un movimento 3D elegante
            targetRotX = Math.max(-45, Math.min(45, targetRotX));

            velY = deltaX * 0.25;
            velX = deltaY * 0.25;

            lastX = clientX;
            lastY = clientY;
        }

        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;
            plush3dStage.classList.remove('is-dragging');
        }

        plush3dStage.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        plush3dStage.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('touchend', onPointerUp);

        // il giro continuo gira solo mentre il peluche si vede (prima girava sempre, anche a pagina chiusa)
        let rafPeluche = null;
        let pelucheInVista = true;

        function renderLoop() {
            rafPeluche = null;
            if (autoRotate && !isDragging) {
                targetRotY += 0.35;
            } else if (!isDragging) {
                targetRotY += velY;
                targetRotX -= velX;
                velY *= 0.92;
                velX *= 0.92;
                targetRotX = Math.max(-45, Math.min(45, targetRotX));
            }

            // Lerp per morbidezza 3D
            rotX += (targetRotX - rotX) * 0.1;
            rotY += (targetRotY - rotY) * 0.1;

            if (rotY > 3600 || rotY < -3600) {
                rotY %= 360;
                targetRotY %= 360;
            }

            plush3dCard.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(10px)`;

            if (plush3dGlare) {
                const glareX = 50 + Math.sin(rotY * Math.PI / 180) * 35;
                const glareY = 50 - (rotX / 45) * 30;
                const opacity = Math.min(0.6, (Math.abs(Math.sin(rotY * Math.PI / 180)) * 0.4) + (Math.abs(rotX) / 90 * 0.2));
                plush3dGlare.style.setProperty('--glare-x', `${glareX}%`);
                plush3dGlare.style.setProperty('--glare-y', `${glareY}%`);
                plush3dGlare.style.setProperty('--glare-opacity', opacity.toFixed(2));
            }

            if (plush3dShadow) {
                const shadowOffsetX = Math.sin(rotY * Math.PI / 180) * 35;
                const shadowScaleX = 1 + Math.abs(Math.sin(rotY * Math.PI / 180)) * 0.25;
                const shadowScaleY = 1 - Math.abs(rotX / 90) * 0.35;
                plush3dShadow.style.setProperty('--shadow-offset-x', `${shadowOffsetX.toFixed(1)}px`);
                plush3dShadow.style.setProperty('--shadow-scale-x', shadowScaleX.toFixed(2));
                plush3dShadow.style.setProperty('--shadow-scale-y', shadowScaleY.toFixed(2));
            }

            if (pelucheInVista || isDragging) rafPeluche = requestAnimationFrame(renderLoop);
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                pelucheInVista = entries[entries.length - 1].isIntersecting;
                if (pelucheInVista && !rafPeluche) rafPeluche = requestAnimationFrame(renderLoop);
            }).observe(plush3dStage);
        }
        plush3dStage.addEventListener('mousedown', () => { if (!rafPeluche) rafPeluche = requestAnimationFrame(renderLoop); });
        plush3dStage.addEventListener('touchstart', () => { if (!rafPeluche) rafPeluche = requestAnimationFrame(renderLoop); }, { passive: true });
        rafPeluche = requestAnimationFrame(renderLoop);
    }

    // ==========================================
    // CUSTOM CURSOR & HIGH-PERFORMANCE CANVAS TRAIL ENGINE
    // ==========================================
    function initCustomCursorAndTrail() {
        const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReducedMotion) return;

        // Nascondi cursore di sistema se su desktop
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            document.body.classList.add('custom-cursor-active');
        }

        // Punto cursore custom
        let cursorDot = document.querySelector('.custom-cursor-dot');
        if (!cursorDot) {
            cursorDot = document.createElement('div');
            cursorDot.className = 'custom-cursor-dot';
            document.body.appendChild(cursorDot);
        }

        // Canvas 2D globale per la scia luminosa
        let canvas = document.getElementById('cursorTrailCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'cursorTrailCanvas';
            document.body.appendChild(canvas);
        }
        const ctx = canvas.getContext('2d', { alpha: true });

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        window.addEventListener('resize', () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            sporco = null;
        }, { passive: true });

        let mouseX = width / 2;
        let mouseY = height / 2;
        let dotX = mouseX;
        let dotY = mouseY;
        let lastMoveTime = 0;
        let targetElement = null;

        // Leggerezza: il disegno gira solo mentre serve (mouse che si muove o scintille ancora accese),
        // le scintille sono "timbri" già sfumati (niente shadowBlur a ogni fotogramma)
        // e si cancella solo il pezzetto di tela dove c'era qualcosa.
        let rafId = null;
        let sporco = null;            // rettangolo disegnato nel fotogramma prima
        let lastTime = performance.now();

        const updateCursorPos = (x, y, target) => {
            mouseX = x;
            mouseY = y;
            if (target) targetElement = target;
            lastMoveTime = performance.now();
            sveglia();
        };

        // sopra ciò che si può cliccare il punto si allarga e si illumina (è la "manina" di Laska)
        const CLICCABILE = 'a[href], button:not(:disabled), [role="button"], input, select, textarea, label, summary, .clickable-product, .laska-pensieri';
        let sopraCliccabile = false;
        window.addEventListener('mouseover', (e) => {
            const si = !!(e.target && e.target.closest && e.target.closest(CLICCABILE));
            if (si !== sopraCliccabile) {
                sopraCliccabile = si;
                if (cursorDot) cursorDot.classList.toggle('hovering', si);
            }
        }, { passive: true });

        window.addEventListener('mousemove', (e) => {
            updateCursorPos(e.clientX, e.clientY, e.target);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 0) {
                updateCursorPos(e.touches[0].clientX, e.touches[0].clientY, e.target);
            }
        }, { passive: true });

        // --- Timbri luminosi: disegnati una volta sola, poi solo ricopiati ---
        const TIMBRO = 96;            // lato del timbro in pixel
        const K = 14 / 6;             // scala del timbro rispetto a una scintilla di misura 4
        const MISURA_RIF = 4;
        const timbri = {};
        function timbro(forma, colore) {
            const chiave = forma + colore;
            if (timbri[chiave]) return timbri[chiave];
            const c = document.createElement('canvas');
            c.width = c.height = TIMBRO;
            const g = c.getContext('2d');
            g.translate(TIMBRO / 2, TIMBRO / 2);
            g.fillStyle = colore;
            g.shadowColor = colore;
            if (forma === 'star') {
                // stella eterea a 4 punte con bagliore (come prima: punte 1.5 × misura, vita 0.35 × misura, alone 8px)
                const rOuter = MISURA_RIF * 1.5 * K;
                const rInner = MISURA_RIF * 0.35 * K;
                g.beginPath();
                for (let i = 0; i < 4; i++) {
                    g.lineTo(Math.cos(i * Math.PI / 2) * rOuter, Math.sin(i * Math.PI / 2) * rOuter);
                    g.lineTo(Math.cos((i + 0.5) * Math.PI / 2) * rInner, Math.sin((i + 0.5) * Math.PI / 2) * rInner);
                }
                g.closePath();
                g.shadowBlur = 8 * K;
                g.fill();
            } else if (forma === 'alone') {
                // bagliore morbido intorno alle stelline più grandi (come l'ombra luminosa del testo ✦)
                const r = TIMBRO / 2;
                const grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, colore);
                grad.addColorStop(0.35, colore + '88');
                grad.addColorStop(1, colore + '00');
                g.fillStyle = grad;
                g.beginPath();
                g.arc(0, 0, r, 0, Math.PI * 2);
                g.fill();
            } else {
                // cerchio con bordi sfumati ed effetto bloom (raggio 1.8 × misura, alone 6px)
                const r = MISURA_RIF * 1.8 * K;
                const grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, colore);
                grad.addColorStop(0.5, colore);
                grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                g.fillStyle = grad;
                g.shadowBlur = 6 * K;
                g.beginPath();
                g.arc(0, 0, r, 0, Math.PI * 2);
                g.fill();
            }
            timbri[chiave] = c;
            return c;
        }

        // Palette eterea: bianco starlight, azzurro chiaro, lavanda, rosa pastello, oro morbido
        const PALETTE_SCIA = ['#FFFFFF', '#B8E1FF', '#D2B9FF', '#F0D2F5', '#FFF3CD'];
        const PALETTE_STELLE = ['#CBB7F5', '#F5D2DF', '#FFF3CD', '#E3DBFA', '#B8E1FF', '#FFFFFF'];
        const PALETTE_BOLLE = ['#D2B9FF', '#B8E1FF', '#F8C3DC', '#FFF3CD', '#FFFFFF', '#E3DBFA'];
        const PALETTE_PELUCHE = ['#D4E5FF', '#E5D9F2', '#FAF8FF', '#E8F1F5', '#C8D9F6'];
        const scegli = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);

        // Classe Particella con supporto ad Object Pooling
        // tipo: 'scia' (la scia del punto), 'burst' (click), 'stella' e 'bolla' (le scintille che lascia il mouse),
        //       'morbida' (le lucine sopra i peluche)
        class TrailParticle {
            constructor() {
                this.active = false;
            }

            spawn(x, y, tipo = 'scia') {
                this.active = true;
                this.tipo = tipo;
                this.rotation = Math.random() * Math.PI;
                this.rotSpeed = (Math.random() - 0.5) * 0.04;
                this.alone = null;

                if (tipo === 'burst' || tipo === 'scia') {
                    const isBurst = tipo === 'burst';
                    this.x = x + (Math.random() - 0.5) * (isBurst ? 8 : 4);
                    this.y = y + (Math.random() - 0.5) * (isBurst ? 8 : 4);
                    // Dimensione casuale (2-6px)
                    this.size = isBurst ? (Math.random() * 3.5 + 2.5) : (Math.random() * 3.5 + 2.0);
                    // Forme eteree: per calmare, più cerchi morbidi (65%) che stelle a 4 punte (35%)
                    this.shape = Math.random() > 0.65 ? 'star' : 'circle';
                    this.color = scegli(PALETTE_SCIA);
                    if (isBurst) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 1.4 + 0.6;
                        this.vx = Math.cos(angle) * speed;
                        this.vy = Math.sin(angle) * speed;
                        this.maxLife = Math.random() * 300 + 400; // 400-700ms
                    } else {
                        // Drift verso l'alto con leggera fluttuazione orizzontale
                        this.vx = (Math.random() - 0.5) * 0.7;
                        this.vy = - (Math.random() * 0.6 + 0.4);
                        this.maxLife = Math.random() * 400 + 600; // 0.6–1.0 sec
                    }
                    this.maxOpacity = isBurst ? (Math.random() * 0.3 + 0.4) : (Math.random() * 0.25 + 0.25);
                } else if (tipo === 'stella') {
                    // stellina ✦ che sale e svanisce ruotando (1.6 s)
                    const offsetDist = Math.random() * 12;
                    const angle = Math.random() * Math.PI * 2;
                    this.x = x + Math.cos(angle) * offsetDist;
                    this.y = y + Math.sin(angle) * offsetDist;
                    this.size = (Math.random() * 0.65 + 0.35) * 5.2;
                    this.shape = 'star';
                    this.color = scegli(PALETTE_STELLE);
                    this.alone = timbro('alone', this.color);
                    this.vx = ((Math.random() - 0.5) * 24) / 25;
                    this.vy = - (Math.random() * 20 + 10) / 25;
                    this.maxLife = 1600;
                    this.maxOpacity = 0.9;
                    this.rotation = 0;
                    this.rotSpeed = 0;
                } else {
                    // 'bolla' e 'morbida': lucine tonde che compaiono, salgono piano e si spengono
                    const morbida = tipo === 'morbida';
                    this.x = x + (Math.random() - 0.5) * (morbida ? 10 : 14);
                    this.y = y + (Math.random() - 0.5) * (morbida ? 10 : 14);
                    this.size = morbida ? (Math.random() * 3 + 3) / 3.6 : (Math.random() * 5 + 3) / 3.6;
                    this.shape = 'circle';
                    this.color = scegli(morbida ? PALETTE_PELUCHE : PALETTE_BOLLE);
                    this.vx = ((Math.random() - 0.5) * (morbida ? 16 : 22)) / 25;
                    this.vy = - (Math.random() * (morbida ? 20 : 25) + (morbida ? 15 : 10)) / 25;
                    this.maxLife = morbida ? 1800 : 1600;
                    this.maxOpacity = morbida ? 0.85 : 0.95;
                }

                this.sprite = timbro(this.shape, this.color);
                this.life = this.maxLife;
            }

            update(dt) {
                if (!this.active) return;
                const step = dt / 16.6;
                this.x += this.vx * step;
                this.y += this.vy * step;
                const attrito = Math.pow(0.96, step);
                this.vx *= attrito;
                this.vy *= attrito;
                this.rotation += this.rotSpeed * step;
                this.life -= dt;
                if (this.life <= 0) {
                    this.active = false;
                }
            }

            // disegna il timbro e restituisce il raggio occupato (per sapere cosa cancellare dopo)
            draw(ctx) {
                if (!this.active) return 0;
                const progress = Math.max(0, this.life / this.maxLife);   // 1 → 0
                const t = 1 - progress;                                    // 0 → 1
                let opacity, scala = this.size / MISURA_RIF, rot = this.rotation;
                if (this.tipo === 'stella') {
                    const e = easeOut(t);
                    opacity = this.maxOpacity * (1 - e);
                    scala *= 1 - 0.85 * e;
                    rot = e * 0.61;                                        // 35°
                } else if (this.tipo === 'bolla' || this.tipo === 'morbida') {
                    opacity = this.maxOpacity * (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8);
                    scala *= (this.tipo === 'morbida' ? 0.6 - 0.4 * easeOut(t) : 0.5 - 0.4 * easeOut(t)) * 1.8;
                } else {
                    opacity = this.maxOpacity * Math.pow(progress, 0.85);
                }
                if (opacity <= 0.01 || scala <= 0.01) return 0;

                const lato = (TIMBRO / K) * scala;
                const cos = Math.cos(rot), sin = Math.sin(rot);
                if (this.alone) {
                    const la = lato * 1.25;
                    ctx.globalAlpha = opacity * 0.35;
                    ctx.setTransform(1, 0, 0, 1, this.x, this.y);
                    ctx.drawImage(this.alone, -la / 2, -la / 2, la, la);
                }
                ctx.globalAlpha = opacity;
                ctx.setTransform(cos, sin, -sin, cos, this.x, this.y);
                ctx.drawImage(this.sprite, -lato / 2, -lato / 2, lato, lato);
                return lato * 0.72;
            }
        }

        // Object Pooling: pool fisso di particelle riciclabili
        const MAX_PARTICLES = 110;
        const pool = Array.from({ length: MAX_PARTICLES }, () => new TrailParticle());

        const spawnFromPool = (x, y, tipo = 'scia') => {
            for (let i = 0; i < MAX_PARTICLES; i++) {
                if (!pool[i].active) { pool[i].spawn(x, y, tipo); return; }
            }
        };

        // Le scintille che prima erano elementi della pagina ora passano da qui (stesso aspetto, zero elementi creati)
        // (per una home più calma: una lucina ogni tre passaggi, quasi sempre tonda)
        let contaStelline = 0;
        sciaLuce = {
            stelline(x, y) {
                if (++contaStelline % 3) return;
                spawnFromPool(x, y, Math.random() > 0.8 ? 'stella' : 'bolla');
                sveglia();
            },
            morbide(x, y) {
                const n = Math.random() < 0.5 ? 1 : 2;
                for (let i = 0; i < n; i++) spawnFromPool(x, y, 'morbida');
                sveglia();
            }
        };

        // Scoppio di scintille eteree al click
        window.addEventListener('pointerdown', (e) => {
            for (let i = 0; i < 5; i++) {
                spawnFromPool(e.clientX, e.clientY, 'burst');
            }
            sveglia();
        }, { passive: true });

        // sugli schermi solo touch la scia è nascosta dal CSS: inutile disegnarla
        const soloTouch = window.matchMedia('(pointer: coarse) and (hover: none)');

        function sveglia() {
            if (soloTouch.matches) return;
            if (!rafId) {
                lastTime = performance.now();
                rafId = requestAnimationFrame(renderLoop);
            }
        }

        function renderLoop() {
            rafId = null;
            const now = performance.now();
            const dt = Math.min(32, now - lastTime); // Cap delta-time a max 32ms
            lastTime = now;

            // cancella solo dove si era disegnato
            if (sporco) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(sporco.x0, sporco.y0, sporco.x1 - sporco.x0, sporco.y1 - sporco.y0);
                sporco = null;
            }

            // Il punto segue il mouse quasi subito (un filo di morbidezza, uguale a ogni frequenza dello schermo)
            const segui = 1 - Math.pow(1 - 0.6, dt / 16.6);
            dotX += (mouseX - dotX) * segui;
            dotY += (mouseY - dotY) * segui;
            if (Math.abs(mouseX - dotX) < 0.1) dotX = mouseX;
            if (Math.abs(mouseY - dotY) < 0.1) dotY = mouseY;
            if (cursorDot) {
                cursorDot.style.transform = `translate3d(${dotX.toFixed(1)}px, ${dotY.toFixed(1)}px, 0) translate(-50%, -50%)`;
            }

            // Controlla se il cursore si sta muovendo
            const distSq = (mouseX - dotX) ** 2 + (mouseY - dotY) ** 2;
            const isMoving = (now - lastMoveTime < 120) || distSq > 2;

            if (isMoving && Math.random() < 0.3) {
                spawnFromPool(dotX, dotY, 'scia');
            }

            // Aggiorna e disegna particelle attive
            let vive = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (let i = 0; i < MAX_PARTICLES; i++) {
                const p = pool[i];
                if (!p.active) continue;
                p.update(dt);
                const r = p.draw(ctx);
                if (p.active) vive++;
                if (r > 0) {
                    if (p.x - r < x0) x0 = p.x - r;
                    if (p.y - r < y0) y0 = p.y - r;
                    if (p.x + r > x1) x1 = p.x + r;
                    if (p.y + r > y1) y1 = p.y + r;
                }
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            if (x1 > x0) {
                sporco = {
                    x0: Math.max(0, Math.floor(x0) - 2), y0: Math.max(0, Math.floor(y0) - 2),
                    x1: Math.min(width, Math.ceil(x1) + 2), y1: Math.min(height, Math.ceil(y1) + 2)
                };
            }

            // ancora qualcosa da fare? altrimenti si riposa fino al prossimo movimento
            if (isMoving || vive > 0 || sporco) rafId = requestAnimationFrame(renderLoop);
        }

        sveglia();
    }

    initPixelStars();
    init3dPlushRotation();
    initCustomCursorAndTrail();

    // After 3 minutes, smoothly transition the background to deep blue night tones
    setTimeout(() => {
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.classList.add('night-deep-blue');
        }
    }, 180000); // 3 minutes = 180,000 ms

    // Inizializza la chat ora che tutte le sue variabili sono dichiarate
    initLaskaChat(laskaName, laskaChar);

    // ==========================================
    // NAVIGAZIONE A CAPITOLI
    // ==========================================
    // «Vai agli esercizi»: adesso gli esercizi si fanno nella cameretta, insieme al compagno (cameretta.js);
    // senza 3D si apre «Cinque cose vere» a schermo intero
    function openRespira() {
        const C = window.LaskaCameretta;
        if (C && C.entra && C.puo && C.puo()) {
            if (!homeView.classList.contains('active')) showView(homeView, null);
            C.entra(document.activeElement);
        } else if (window.LaskaEsercizio) window.LaskaEsercizio.apri('2');
    }

    // "Cosa senti adesso?" apre l'esercizio giusto a schermo intero
    let lastExerciseOrigin = 'list';
    document.querySelectorAll('.feel-card').forEach(card => {
        card.addEventListener('click', () => {
            lastExerciseOrigin = 'feel';
            const teaser = document.querySelector(`.exercise-teaser-btn[data-exercise="${card.getAttribute('data-exercise')}"]`);
            if (teaser) teaser.click();
            lastExerciseOrigin = 'feel';
        });
    });
    document.querySelectorAll('.exercise-teaser-btn').forEach(btn => {
        btn.addEventListener('click', () => { lastExerciseOrigin = 'list'; }, true);
    });

    // Tutti i collegamenti data-goto (menu, fine capitolo, freccia dell'hero)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-goto]');
        if (!link) return;
        const where = link.getAttribute('data-goto');
        e.preventDefault();
        if (where === 'rifugio') { showView(rifugioView, headerRoomBtn); return; }
        if (where === 'diario') { showView(diarioView, null); return; }
        // «Cosa ci succede» non è più un capitolo: lo racconta il compagno, nella nuvoletta in home (notte.js)
        if (where === 'capire') {
            showView(homeView, null, { scrollTo: '#cap-battito' });
            if (window.LaskaPensieri) window.LaskaPensieri.spiega();
            return;
        }
        if (GOTO_TARGETS[where]) showView(homeView, null, { scrollTo: GOTO_TARGETS[where] });
    });

    // In quale capitolo sei? Lo dice un'etichetta discreta in alto (e il menu)
    const chapterIndicator = document.getElementById('chapterIndicator');
    const chapterSections = document.querySelectorAll('#home-view .chapter');
    const CHAPTER_KEYS = { 'cap-battito': 'battito', 'cap-respira': 'respira', 'cap-capire': 'capire', 'cap-compagno': 'compagno' };
    function setChapter(sec) {
        if (!sec) return;
        currentChapter = CHAPTER_KEYS[sec.id] || currentChapter;
        if (chapterIndicator) {
            chapterIndicator.classList.remove('is-changing');
            void chapterIndicator.offsetWidth;
            chapterIndicator.innerHTML = `<span>${sec.getAttribute('data-chapter')}</span> ${sec.getAttribute('data-chapter-name')}`;
            chapterIndicator.setAttribute('data-cap', sec.id);   // sulla home il CSS la nasconde (meno cose da leggere)
            chapterIndicator.classList.add('is-changing');
        }
        if (homeView.classList.contains('active')) highlightMenu(homeView);
    }
    document.addEventListener('laska:hchapter', (e) => setChapter(e.detail && e.detail.section));
    if ('IntersectionObserver' in window && chapterSections.length) {
        const chapterObserver = new IntersectionObserver((entries) => {
            if (document.documentElement.classList.contains('hscroll-on')) return;   // in orizzontale lo dice horizontal.js
            entries.forEach(entry => { if (entry.isIntersecting) setChapter(entry.target); });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
        chapterSections.forEach(sec => chapterObserver.observe(sec));

        // le introduzioni dei capitoli si dissolvono dentro mentre ci arrivi
        const introObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('in-view'); });
        }, { threshold: 0.35 });
        document.querySelectorAll('#home-view .chapter-intro').forEach(el => introObserver.observe(el));
    } else {
        document.querySelectorAll('.chapter-intro').forEach(el => el.classList.add('in-view'));
    }

    // Il Rifugio: stanza, suoni, playlist
    const rifugioRoomBtn = document.getElementById('rifugioRoomBtn');
    const rifugioSoundBtn = document.getElementById('rifugioSoundBtn');
    const rifugioPlaylistBtn = document.getElementById('rifugioPlaylistBtn');
    if (rifugioRoomBtn) rifugioRoomBtn.addEventListener('click', () => showView(roomView, headerRoomBtn));
    if (rifugioSoundBtn) rifugioSoundBtn.addEventListener('click', () => {
        if (window.LaskaEsercizio) window.LaskaEsercizio.apri('5');
    });
    if (rifugioPlaylistBtn) rifugioPlaylistBtn.addEventListener('click', () => scrollToTarget('.spotify-exchange-section', true));

    // Capitolo III: le esperienze dell'ansia, una alla volta mentre scorri
    const storySteps = document.querySelectorAll('.story-steps > .experience-card, .story-step');
    if ('IntersectionObserver' in window && storySteps.length) {
        document.documentElement.classList.add('story-ready');
        const storyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => entry.target.classList.toggle('is-current', entry.isIntersecting));
        }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });
        storySteps.forEach(el => storyObserver.observe(el));
    }

    highlightMenu(homeView);

    // Freccia "Scorri" nella home: scende dolcemente agli esercizi
    const heroScrollCue = document.getElementById('heroScrollCue');
    if (heroScrollCue) {
        // va al capitolo II tramite data-goto="respira" (vedi navigazione a capitoli)
    }

    // Comparsa morbida dei contenuti mentre si scorre
    const revealTargets = document.querySelectorAll(
        '.section-header, .exercise-card, .product-card, .edu-card, .experience-card, .myth-card, ' +
        '.playlist-card, .spotify-form-card, .plush-quiz-banner-container, .quiz-container, .awareness-block, .experience-cta, .stat-box'
    );
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        document.documentElement.classList.add('reveal-ready');
        const siblingsIndex = el => Array.prototype.indexOf.call(el.parentElement.children, el);
        revealTargets.forEach(el => {
            el.classList.add('reveal');
            el.style.setProperty('--reveal-delay', (Math.min(siblingsIndex(el), 5) * 80) + 'ms');
        });
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealTargets.forEach(el => revealObserver.observe(el));
    }
});
