let desktopHeroController = null;

function iniciarHeroDesktop() {
    if (desktopHeroController || !window.matchMedia('(min-width: 900px)').matches) return;

    const products = [
        {
            name: 'Cheddy Krueger',
            video: 'src/hero-motion/cheddy-loop.mp4',
            poster: 'src/hero-motion/cheddy-poster.webp',
            accent: '#ffad3d',
            ingredients: ['Cheddar', 'Panceta', 'Pepinillos caseros']
        },
        {
            name: 'La Parri-Llera',
            video: 'src/hero-motion/parri-llera-loop.mp4',
            poster: 'src/hero-motion/parri-llera-poster.webp',
            accent: '#ff7d4a',
            ingredients: ['Cherrys', 'Lechuga', 'Cebolla asada', 'Chimichurri']
        },
        {
            name: 'Veggie Smalls',
            video: 'src/hero-motion/veggie-smalls-loop.mp4',
            poster: 'src/hero-motion/veggie-smalls-poster.webp',
            accent: '#b7d85d',
            ingredients: ['Cherrys confitados', 'Lechuga', 'Salsa Mo Glazed']
        },
        {
            name: 'La Bestia Pop',
            video: 'src/hero-motion/bestia-pop-loop.mp4',
            poster: 'src/hero-motion/bestia-pop-poster.webp',
            accent: '#ff5a8a',
            ingredients: ['Provoleta', 'Morrón asado', 'Chorizo crocante']
        }
    ];

    const root = document.getElementById('desktop-hero');
    const stage = document.getElementById('desktop-hero-stage');
    const title = document.getElementById('desktop-hero-title');
    const ingredients = document.getElementById('desktop-hero-ingredients');
    const previousButton = document.getElementById('desktop-hero-previous');
    const nextButton = document.getElementById('desktop-hero-next');
    if (!root || !stage || !title || !ingredients || !previousButton || !nextButton) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitionDuration = reduceMotion ? 0 : 900;
    const autoplayDelay = 7500;
    let activeIndex = 0;
    let isTransitioning = false;
    let isVisible = false;
    let autoplayTimer = null;

    const videos = products.map((product, index) => {
        const video = document.createElement('video');
        video.className = 'desktop-hero__media';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.poster = product.poster;
        video.preload = index < 2 ? (index === 0 ? 'auto' : 'metadata') : 'none';
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('aria-hidden', 'true');
        const source = document.createElement('source');
        source.src = product.video;
        source.type = 'video/mp4';
        video.appendChild(source);
        stage.appendChild(video);
        return video;
    });

    function renderProduct(index) {
        const product = products[index];
        title.textContent = product.name;
        ingredients.replaceChildren();
        product.ingredients.forEach((ingredient, ingredientIndex) => {
            const tag = document.createElement('span');
            tag.className = `desktop-hero__ingredient desktop-hero__ingredient--${ingredientIndex}`;
            tag.textContent = ingredient;
            ingredients.appendChild(tag);
        });
        root.style.setProperty('--hero-accent', product.accent);
        root.setAttribute('aria-label', `Presentación de ${product.name}`);
    }

    function stopAutoplay() {
        clearTimeout(autoplayTimer);
        autoplayTimer = null;
    }

    function playActiveVideo() {
        videos.forEach((video, index) => {
            if (isVisible && index === activeIndex && !reduceMotion) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }

    function scheduleAutoplay() {
        stopAutoplay();
        if (!isVisible || reduceMotion) return;
        autoplayTimer = setTimeout(() => changeProduct(1), autoplayDelay);
    }

    function prepareNextVideo() {
        const nextVideo = videos[(activeIndex + 1) % videos.length];
        if (nextVideo.preload === 'none') {
            nextVideo.preload = 'metadata';
            nextVideo.load();
        }
    }

    function finishTransition(outgoing, incoming) {
        outgoing.classList.remove('is-active', 'is-transitioning');
        incoming.classList.remove('is-transitioning');
        incoming.classList.add('is-active');
        isTransitioning = false;
        playActiveVideo();
        prepareNextVideo();
        scheduleAutoplay();
    }

    async function changeProduct(direction) {
        if (isTransitioning || !isVisible) return;
        const targetIndex = (activeIndex + direction + products.length) % products.length;
        isTransitioning = true;
        stopAutoplay();
        const outgoing = videos[activeIndex];
        const incoming = videos[targetIndex];
        const offset = direction > 0 ? 102 : -102;
        incoming.preload = 'auto';
        incoming.load();
        incoming.currentTime = 0;
        incoming.classList.add('is-transitioning');
        if (!reduceMotion) incoming.play().catch(() => {});
        root.classList.add('is-copy-changing');

        if (reduceMotion) {
            activeIndex = targetIndex;
            renderProduct(activeIndex);
            root.classList.remove('is-copy-changing');
            finishTransition(outgoing, incoming);
            return;
        }

        const options = {
            duration: transitionDuration,
            easing: 'cubic-bezier(0.76, 0, 0.24, 1)',
            fill: 'forwards'
        };
        const incomingAnimation = incoming.animate(
            [{ transform: `translate3d(${offset}%, 0, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
            options
        );
        const outgoingAnimation = outgoing.animate(
            [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${-offset}%, 0, 0)` }],
            options
        );
        await Promise.allSettled([incomingAnimation.finished, outgoingAnimation.finished]);
        incomingAnimation.cancel();
        outgoingAnimation.cancel();
        activeIndex = targetIndex;
        renderProduct(activeIndex);
        finishTransition(outgoing, incoming);
        requestAnimationFrame(() => root.classList.remove('is-copy-changing'));
    }

    previousButton.addEventListener('click', () => changeProduct(-1));
    nextButton.addEventListener('click', () => changeProduct(1));
    videos[0].classList.add('is-active');
    renderProduct(0);
    prepareNextVideo();

    desktopHeroController = {
        setVisible(visible) {
            isVisible = visible;
            if (visible) {
                playActiveVideo();
                scheduleAutoplay();
            } else {
                stopAutoplay();
                videos.forEach(video => video.pause());
            }
        }
    };
}

function gestionarHeroDesktopVisibilidad(visible) {
    if (desktopHeroController) desktopHeroController.setVisible(visible);
}
