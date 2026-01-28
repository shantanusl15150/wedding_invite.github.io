const targetDate = new Date("2026-02-12T23:30:00+05:30");

const timeEls = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

const musicToggle = document.getElementById("music-toggle");
const musicLabel = document.getElementById("music-label");
const audio = document.getElementById("wedding-audio");
const hero = document.querySelector(".hero");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pad = (value) => String(value).padStart(2, "0");

const updateCountdown = () => {
  const now = new Date();
  const diff = Math.max(targetDate - now, 0);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  timeEls.days.textContent = pad(days);
  timeEls.hours.textContent = pad(hours);
  timeEls.minutes.textContent = pad(minutes);
  timeEls.seconds.textContent = pad(seconds);
};

const initReveal = () => {
  const revealItems = document.querySelectorAll(".reveal");
  if (!revealItems.length) return;
  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => observer.observe(item));
};

const initParallax = () => {
  if (!hero || prefersReducedMotion) return;

  let ticking = false;
  const base = 32;

  const updatePosition = () => {
    const offset = Math.min(window.scrollY * 0.02, 14);
    hero.style.backgroundPosition = `center ${base + offset}%`;
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updatePosition);
      ticking = true;
    }
  });

  updatePosition();
};


const toggleMusic = async () => {
  if (!audio) return;

  try {
    if (audio.paused) {
      await audio.play();
      musicToggle.classList.add("is-playing");
      musicLabel.textContent = "Pause";
      musicToggle.setAttribute("aria-label", "Pause wedding music");
    } else {
      audio.pause();
      musicToggle.classList.remove("is-playing");
      musicLabel.textContent = "Play";
      musicToggle.setAttribute("aria-label", "Play wedding music");
    }
  } catch (err) {
    musicLabel.textContent = "Tap to play";
  }
};

const attemptAutoPlay = async () => {
  if (!audio) return;

  try {
    await audio.play();
    musicToggle.classList.add("is-playing");
    musicLabel.textContent = "Pause";
    musicToggle.setAttribute("aria-label", "Pause wedding music");
  } catch (err) {
    musicLabel.textContent = "Tap to play";
  }
};

const initAutoPlay = () => {
  attemptAutoPlay();
  window.addEventListener("load", attemptAutoPlay, { once: true });

  const unlockAudio = () => {
    attemptAutoPlay();
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };

  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
};

const initScratchCard = () => {
  const card = document.getElementById("scratch-card");
  const canvas = document.getElementById("scratch-canvas");
  if (!card || !canvas) return;

  const reveal = card.querySelector(".scratch-reveal");
  const text = card.querySelector(".scratch-text");
  let textScale = 1;
  let textScaleRaf = null;
  const context = canvas.getContext("2d");
  if (!context) return;

  const coverImage = new Image();

  let isDrawing = false;
  let isCleared = false;
  let lastPoint = null;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let brushRadius = 18;
  let lastCheck = 0;
  const confettiThreshold = 0.3;
  const clearThreshold = 0.4;
  let scratchedArea = 0;
  let confettiFired = false;

  const fitScratchCard = () => {
    if (!reveal || !text) return;
    const prevHeight = card.style.height;
    if (prevHeight) {
      card.style.height = "";
    }
    const baseHeight = card.getBoundingClientRect().height;
    const baseWidth = card.getBoundingClientRect().width;
    if (prevHeight) {
      card.style.height = prevHeight;
    }
    if (!baseHeight || !baseWidth) return;

    const contentHeight = text.scrollHeight;
    const contentWidth = text.scrollWidth;
    if (!contentHeight || !contentWidth) return;

    let scale = 1;
    if (contentWidth > baseWidth) {
      scale = Math.min(scale, baseWidth / contentWidth);
    }
    textScale = Math.max(0.01, Math.min(1, scale));
    text.style.setProperty("--scratch-scale", textScale.toFixed(3));

    const scaledHeight = contentHeight * textScale;
    const buffer = 12;
    const desiredHeight = Math.max(baseHeight, scaledHeight + buffer);
    if (desiredHeight > baseHeight + 1) {
      card.style.height = `${Math.ceil(desiredHeight)}px`;
    } else {
      card.style.height = "";
    }
  };

  const scheduleScratchLayout = () => {
    if (textScaleRaf) return;
    textScaleRaf = window.requestAnimationFrame(() => {
      textScaleRaf = null;
      fitScratchCard();
      if (!isCleared) {
        resizeCanvas();
      }
    });
  };

  const drawCover = () => {
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    const gradient = context.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, "#d8a247");
    gradient.addColorStop(0.5, "#b85a2b");
    gradient.addColorStop(1, "#d4af37");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    if (coverImage.complete && coverImage.naturalWidth > 0) {
      context.drawImage(coverImage, 0, 0, canvasWidth, canvasHeight);
    }
  };

  const resizeCanvas = () => {
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ratio = window.devicePixelRatio || 1;
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    brushRadius = Math.max(14, Math.min(canvasWidth, canvasHeight) * 0.06);
    scratchedArea = 0;
    drawCover();
  };

  const getPoint = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const scratchTo = (point) => {
    context.globalCompositeOperation = "destination-out";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = brushRadius * 2;
    if (!lastPoint) {
      context.beginPath();
      context.arc(point.x, point.y, brushRadius, 0, Math.PI * 2);
      context.fill();
      scratchedArea += Math.PI * brushRadius * brushRadius;
      lastPoint = point;
      return;
    }

    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    scratchedArea += distance * brushRadius * 2;
    lastPoint = point;
  };

  const getScratchedPercent = () => {
    try {
      const width = canvas.width;
      const height = canvas.height;
      const pixels = context.getImageData(0, 0, width, height).data;
      const gap = 10;
      let cleared = 0;
      let total = 0;

      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          const alpha = pixels[(y * width + x) * 4 + 3];
          total += 1;
          if (alpha < 32) {
            cleared += 1;
          }
        }
      }

      return total ? cleared / total : 0;
    } catch (err) {
      const totalArea = canvasWidth * canvasHeight || 1;
      return Math.min(scratchedArea / totalArea, 1);
    }
  };

  let rainInterval = null;
  let rainTimeout = null;

  const stopFlowerRain = () => {
    if (rainInterval) {
      window.clearInterval(rainInterval);
      rainInterval = null;
    }
    if (rainTimeout) {
      window.clearTimeout(rainTimeout);
      rainTimeout = null;
    }
  };

  const startFlowerRain = () => {
    if (typeof window.confetti !== "function") return;
    if (rainInterval) return;

    const marigoldPalette = ["#f2a900", "#f5b031", "#e18a00", "#d77b00"];
    const getPetalScalar = () => {
      const minDim = Math.min(window.innerWidth || 0, window.innerHeight || 0);
      const scaled = (minDim / 360) * 1.6;
      return Math.min(2.6, Math.max(1.2, scaled));
    };
    const petalShape =
      typeof window.confetti.shapeFromPath === "function"
        ? window.confetti.shapeFromPath({
            path: "M12 2C17 6 20 12 12 22C4 12 7 6 12 2Z",
          })
        : "circle";

    const emitPetals = () => {
      const bursts = 7;
      const petalScalar = getPetalScalar();
      for (let i = 0; i < bursts; i += 1) {
        window.confetti({
          particleCount: 18,
          angle: 90,
          spread: 60,
          startVelocity: 6,
          gravity: 0.8,
          ticks: 720,
          colors: marigoldPalette,
          shapes: [petalShape],
          scalar: petalScalar,
          origin: { x: Math.random(), y: -0.1 },
        });
      }
    };

    emitPetals();
    rainInterval = window.setInterval(emitPetals, 200);
    rainTimeout = window.setTimeout(stopFlowerRain, 5000);
  };

  const checkScratchProgress = (force = false) => {
    if (isCleared) return;
    const now = Date.now();
    if (!force && now - lastCheck < 250) return;
    lastCheck = now;
    const percent = getScratchedPercent();
    if (!confettiFired && percent >= confettiThreshold) {
      confettiFired = true;
      startFlowerRain();
    }
    if (percent >= clearThreshold) {
      isCleared = true;
      card.classList.add("is-cleared");
      if (!confettiFired) {
        confettiFired = true;
        startFlowerRain();
      }
    }
  };

  const handleStart = (point) => {
    if (isCleared) return;
    card.classList.add("is-scratching");
    isDrawing = true;
    lastPoint = null;
    scratchTo(point);
    checkScratchProgress();
  };

  const handleMove = (point) => {
    if (!isDrawing || isCleared) return;
    scratchTo(point);
    checkScratchProgress();
  };

  const handleEnd = () => {
    if (isCleared) return;
    isDrawing = false;
    lastPoint = null;
    checkScratchProgress(true);
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    handleStart(getPoint(event.clientX, event.clientY));
  };

  const handlePointerMove = (event) => {
    event.preventDefault();
    handleMove(getPoint(event.clientX, event.clientY));
  };

  const handlePointerUp = () => {
    handleEnd();
  };

  const handleMouseDown = (event) => {
    handleStart(getPoint(event.clientX, event.clientY));
  };

  const handleMouseMove = (event) => {
    handleMove(getPoint(event.clientX, event.clientY));
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleTouchStart = (event) => {
    if ("PointerEvent" in window) return;
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    handleStart(getPoint(touch.clientX, touch.clientY));
  };

  const handleTouchMove = (event) => {
    if ("PointerEvent" in window) return;
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    handleMove(getPoint(touch.clientX, touch.clientY));
  };

  const handleTouchEnd = () => {
    if ("PointerEvent" in window) return;
    handleEnd();
  };

  const handleResize = () => {
    scheduleScratchLayout();
  };

  coverImage.addEventListener("load", drawCover);
  coverImage.addEventListener("error", drawCover);
  coverImage.src = "assets/scratch_layer.png";
  scheduleScratchLayout();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleScratchLayout);
  }
  window.addEventListener("load", scheduleScratchLayout);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleScratchLayout);
    observer.observe(card);
  }

  if ("PointerEvent" in window) {
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
  } else {
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd);
  window.addEventListener("touchcancel", handleTouchEnd);
  window.addEventListener("resize", handleResize);
};

musicToggle?.addEventListener("click", toggleMusic);
updateCountdown();
setInterval(updateCountdown, 1000);
initReveal();
initParallax();
initAutoPlay();
initScratchCard();
