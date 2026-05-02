// Header background change on scroll
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Scroll Reveal Animations
const sr = ScrollReveal({
    origin: 'bottom',
    distance: '60px',
    duration: 1000,
    delay: 200,
    reset: false // Animation only happens once
});

// Hero animations
sr.reveal('.hero-content h1', { delay: 300, origin: 'top' });
sr.reveal('.hero-content p', { delay: 500 });
sr.reveal('.hero-btns', { delay: 700 });
sr.reveal('.badge', { delay: 100, origin: 'left' });

// Section titles
sr.reveal('.section-title', { interval: 200 });

// About section
sr.reveal('.about-text', { origin: 'left' });
sr.reveal('.about-image', { origin: 'right', delay: 400 });

// Curriculum cards
sr.reveal('.step-card', { interval: 200 });

// Feature items
sr.reveal('.feature-item', { interval: 150 });

// Career stats and lists
sr.reveal('.stat-item', { interval: 200, scale: 0.8 });
sr.reveal('.career-column', { interval: 300, origin: 'bottom' });

// Smooth scroll for nav links (handled by CSS, but good to ensure)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
