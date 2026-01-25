const targetDate = new Date("2026-02-25T23:08:00+05:30");

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

musicToggle?.addEventListener("click", toggleMusic);
updateCountdown();
setInterval(updateCountdown, 1000);
initReveal();
initParallax();
initAutoPlay();
