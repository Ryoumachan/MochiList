// Loader fade out
window.addEventListener('load', () => {
    const loader = document.querySelector('.loader-wrapper');
    setTimeout(() => {
        loader.classList.add('fade-out');
    }, 500);
});

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Scroll Reveal
const sr = ScrollReveal({
    origin: 'bottom',
    distance: '60px',
    duration: 1000,
    delay: 200,
    reset: false
});

sr.reveal('.hero-text .sub-title');
sr.reveal('.hero-text h1', { delay: 400 });
sr.reveal('.catchphrase', { delay: 600 });
sr.reveal('.hero-cta', { delay: 800 });
sr.reveal('.hero-image', { origin: 'right', delay: 1000, distance: '100px' });

sr.reveal('.concept h3', { delay: 300 });
sr.reveal('.concept p', { delay: 500, interval: 200 });
sr.reveal('.poster-frame', { scale: 0.9, delay: 400 });

sr.reveal('.menu-item', { interval: 200 });
sr.reveal('.shop-content', { origin: 'left' });
sr.reveal('.map-placeholder', { origin: 'right', delay: 400 });

// Add parallax or subtle movement to person image on mouse move
document.addEventListener('mousemove', (e) => {
    const person = document.querySelector('.person-img');
    if (!person) return;

    const x = (window.innerWidth / 2 - e.pageX) / 50;
    const y = (window.innerHeight / 2 - e.pageY) / 50;

    person.style.transform = `translate(${x}px, ${y}px)`;
});
