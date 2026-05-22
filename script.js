/* ============================
   AmtocSoft Landing Page — script.js
   Scroll engine, particles, counters, interactions
   ============================ */

// --- Mobile Menu ---
const menuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    menuBtn.textContent = navLinks.classList.contains('open') ? '\u2715' : '\u2630';
  });
}

// --- Smooth Scroll ---
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const t = document.querySelector(a.getAttribute('href'));
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    navLinks?.classList.remove('open');
  });
});

// --- Sticky Nav ---
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 50);
});

// --- Particle System ---
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const isMobile = window.innerWidth < 768;
  const count = isMobile ? 15 : window.innerWidth < 1024 ? 20 : 30;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4 + 0.1,
      color: ['#ec4899', '#8b5cf6', '#f97316'][Math.floor(Math.random() * 3)]
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();

// --- Scroll Stage Engine ---
(function initScrollEngine() {
  const stages = document.querySelectorAll('.stage[data-stage]');
  const pipeNodes = document.querySelectorAll('.pipeline-progress .pipe-node');
  const pipeFill = document.querySelector('.pipeline-progress .pipe-fill');
  let highestActive = -1;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const stage = entry.target;
        stage.classList.add('stage-active');
        const idx = parseInt(stage.dataset.stage, 10);
        if (idx > highestActive) {
          highestActive = idx;
          // Update pipeline progress
          if (pipeFill) {
            const pct = Math.min(100, (highestActive / 4) * 100);
            pipeFill.style.height = pct + '%';
          }
          pipeNodes.forEach((n, i) => {
            n.classList.toggle('active', i <= highestActive);
          });
        }
      }
    });
  }, { threshold: 0.3 });

  stages.forEach(s => observer.observe(s));
})();

// --- Data Reveal (generic scroll reveal) ---
(function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
})();

// --- Animated Counter ---
function animateCounter(el, target, duration) {
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Auto-start counters when hero is visible — fetches live stats from amtocbot.com API
(function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;
  let fired = false;

  // Pre-fetch live stats so they're ready when hero scrolls into view
  const liveStats = {};
  fetch('https://amtocbot.com/api/content-stats', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      // Map API fields to data-stat attributes
      if (data.blogs)    liveStats.blogs    = data.blogs;
      if (data.videos)   liveStats.videos   = data.videos;
      if (data.podcasts) liveStats.podcasts = data.podcasts;
    })
    .catch(() => {}); // silently fall back to data-counter values

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !fired) {
        fired = true;
        counters.forEach(c => {
          // Use live value if available for this stat, else fall back to hardcoded data-counter
          const stat = c.dataset.stat;
          const target = (stat && liveStats[stat]) ? liveStats[stat] : parseInt(c.dataset.counter, 10);
          animateCounter(c, target, 2500);
        });
        // Show subtitle after counters
        setTimeout(() => {
          const sub = document.querySelector('.hero-subtitle-reveal');
          if (sub) sub.style.opacity = '1';
        }, 2600);
      }
    });
  }, { threshold: 0.5 });
  const heroEl = document.querySelector('.hero');
  if (heroEl) obs.observe(heroEl);
})();

// --- Terminal Typewriter (Beta variant) ---
(function initTypewriter() {
  const el = document.getElementById('typewriter-target');
  if (!el) return;
  const lines = JSON.parse(el.dataset.lines || '[]');
  let lineIdx = 0, charIdx = 0;
  const speed = 30;

  function type() {
    if (lineIdx >= lines.length) {
      // Show counters + CTAs after typing
      const reveal = document.querySelector('.terminal-reveal');
      if (reveal) reveal.style.opacity = '1';
      return;
    }
    const line = lines[lineIdx];
    if (charIdx <= line.text.length) {
      el.innerHTML = lines.slice(0, lineIdx).map(l =>
        `<span class="${l.cls}">${l.text}</span>`
      ).join('\n') + '\n' +
        `<span class="${line.cls}">${line.text.slice(0, charIdx)}</span>` +
        '<span class="cursor-blink">_</span>';
      charIdx++;
      setTimeout(type, line.cls === 'prompt' ? speed * 2 : speed);
    } else {
      lineIdx++;
      charIdx = 0;
      setTimeout(type, 300);
    }
  }
  setTimeout(type, 800);
})();

// --- Living Pipeline Hero (Gamma variant) ---
(function initLivingPipeline() {
  const nodes = document.querySelectorAll('.pipeline-hero .pipeline-node');
  const connectors = document.querySelectorAll('.pipeline-hero .pipeline-connector');
  if (!nodes.length) return;

  nodes.forEach((node, i) => {
    setTimeout(() => {
      node.classList.add('active');
      if (connectors[i]) connectors[i].classList.add('active');
    }, 800 + i * 600);
  });
})();

// --- FAQ Accordion ---
document.querySelectorAll('.faq-question').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    const wasOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// --- Stripe Checkout (server-side session) ---

let appliedReferralCode = sessionStorage.getItem('referral_code') || null;

document.querySelectorAll('[data-module]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const mod = btn.dataset.module;
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;
    try {
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: mod, referral_code: appliedReferralCode || undefined })
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout error. Please try again.');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch {
      alert('Network error. Please try again.');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});

// --- Referral Code UI ---

(function initReferral() {
  const toggle = document.getElementById('referral-toggle');
  const row = document.getElementById('referral-input-row');
  const input = document.getElementById('referral-code-input');
  const applyBtn = document.getElementById('referral-apply');
  const status = document.getElementById('referral-status');
  if (!toggle) return;

  // Auto-fill from URL param
  const urlCode = new URLSearchParams(window.location.search).get('ref');
  if (urlCode) {
    input.value = urlCode;
    row.classList.add('visible');
    applyReferral(urlCode);
  }

  // Restore from session
  if (appliedReferralCode) {
    input.value = appliedReferralCode;
    row.classList.add('visible');
    showReferralValid();
  }

  toggle.addEventListener('click', () => row.classList.toggle('visible'));
  applyBtn.addEventListener('click', () => applyReferral(input.value.trim().toUpperCase()));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') applyReferral(input.value.trim().toUpperCase()); });

  async function applyReferral(code) {
    if (!code) return;
    status.textContent = 'Checking\u2026';
    status.className = 'referral-status';
    try {
      const resp = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
      const data = await resp.json();
      if (data.valid) {
        appliedReferralCode = code;
        sessionStorage.setItem('referral_code', code);
        sessionStorage.setItem('referral_discount_cents', data.discount_cents);
        showReferralValid(data.discount_cents);
      } else {
        appliedReferralCode = null;
        sessionStorage.removeItem('referral_code');
        status.textContent = 'Invalid or already used.';
        status.className = 'referral-status invalid';
      }
    } catch {
      status.textContent = 'Could not verify. Try again.';
      status.className = 'referral-status invalid';
    }
  }

  function showReferralValid(discountCents) {
    const cents = discountCents || parseInt(sessionStorage.getItem('referral_discount_cents') || '500');
    const label = cents >= 1000 ? '$10 off bundle' : '$5 off';
    status.textContent = `\u2713 Code applied \u2014 ${label}`;
    status.className = 'referral-status valid';
  }
})();

// --- Reviews Fetch & Render ---

(function initReviews() {
  const section = document.getElementById('reviews-section');
  const grid = document.getElementById('reviews-grid');
  if (!section || !grid) return;

  fetch('/api/reviews')
    .then(r => r.json())
    .then(data => {
      const reviews = data.reviews || [];
      if (!reviews.length) { section.classList.add('hidden'); return; }
      section.classList.remove('hidden');
      grid.innerHTML = reviews.map(r => `
        <div class="review-card glass-card">
          <div class="review-stars">${'\u2605'.repeat(r.rating)}${'\u2606'.repeat(5 - r.rating)}</div>
          <div class="review-title">${escHtml(r.title)}</div>
          <div class="review-body">${escHtml(r.body)}</div>
          <div class="review-meta">${escHtml(r.name)}${r.module ? ' \u00b7 ' + escHtml(r.module) : ''}</div>
          ${r.verified ? '<div class="review-verified">\u2713 Verified Purchase</div>' : ''}
        </div>
      `).join('');
    })
    .catch(() => { if (section) section.classList.add('hidden'); });

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();

// --- Inline Review Form (landing page) ---

(function initInlineReviewForm() {
  const formSection = document.getElementById('review-form-section');
  const leaveBtn = document.getElementById('review-leave-btn');
  if (!formSection || !leaveBtn) return;

  leaveBtn.addEventListener('click', () => formSection.classList.toggle('hidden'));

  let selectedRating = 0;
  const stars = formSection.querySelectorAll('.star-rating span');
  stars.forEach((star, i) => {
    star.addEventListener('click', () => {
      selectedRating = i + 1;
      stars.forEach((s, j) => s.classList.toggle('active', j < selectedRating));
    });
  });

  const form = formSection.querySelector('.review-form');
  const submitBtn = formSection.querySelector('.review-form-submit');
  const statusEl = formSection.querySelector('.review-form-status');

  submitBtn.addEventListener('click', async () => {
    const title = form.querySelector('[name="title"]').value.trim();
    const body = form.querySelector('[name="body"]').value.trim();
    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const mod = form.querySelector('[name="module"]')?.value || '';

    if (!selectedRating) { statusEl.textContent = 'Please select a star rating.'; statusEl.className = 'review-form-status error'; return; }
    if (!title || !body || !name || !email) { statusEl.textContent = 'Please fill in all fields.'; statusEl.className = 'review-form-status error'; return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting\u2026';

    try {
      const resp = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, rating: selectedRating, title, body, module: mod })
      });
      const data = await resp.json();
      if (resp.ok) {
        statusEl.textContent = 'Thank you for your review!';
        statusEl.className = 'review-form-status success';
        form.reset(); selectedRating = 0;
        stars.forEach(s => s.classList.remove('active'));
      } else {
        statusEl.textContent = data.error || 'Submission failed.';
        statusEl.className = 'review-form-status error';
      }
    } catch {
      statusEl.textContent = 'Network error. Please try again.';
      statusEl.className = 'review-form-status error';
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Review';
  });
})();
