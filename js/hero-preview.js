document.addEventListener("DOMContentLoaded", () => {
    const products = [
        {
            name: "Cheddy Krueger",
            video: "src/hero-motion/cheddy-loop.mp4",
            poster: "src/hero-motion/cheddy-poster.webp",
            accent: "#ffad3d",
            ingredients: ["Cheddar", "Panceta", "Pepinillos caseros"]
        },
        {
            name: "La Parri-Llera",
            video: "src/hero-motion/parri-llera-loop.mp4",
            poster: "src/hero-motion/parri-llera-poster.webp",
            accent: "#ff7d4a",
            ingredients: ["Cherrys", "Lechuga", "Cebolla asada", "Chimichurri"]
        },
        {
            name: "Veggie Smalls",
            video: "src/hero-motion/veggie-smalls-loop.mp4",
            poster: "src/hero-motion/veggie-smalls-poster.webp",
            accent: "#b7d85d",
            ingredients: ["Cherrys confitados", "Lechuga", "Salsa Mo Glazed"]
        },
        {
            name: "La Bestia Pop",
            video: "src/hero-motion/bestia-pop-loop.mp4",
            poster: "src/hero-motion/bestia-pop-poster.webp",
            accent: "#ff5a8a",
            ingredients: ["Provoleta", "Morrón asado", "Chorizo crocante"]
        }
    ];

    const root = document.getElementById("hero-preview");
    const stage = document.getElementById("hero-media-stage");
    const title = document.getElementById("hero-product-name");
    const ingredients = document.getElementById("hero-ingredients");
    const previousButton = document.getElementById("hero-previous");
    const nextButton = document.getElementById("hero-next");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDuration = reduceMotion ? 0 : 900;
    const autoplayDelay = 7500;

    if (!root || !stage || !title || !ingredients || !previousButton || !nextButton) {
        return;
    }

    let activeIndex = 0;
    let isPaused = reduceMotion;
    let isTransitioning = false;
    let autoplayTimer = null;

    const videos = products.map((product, index) => {
        const video = document.createElement("video");
        video.className = "hero-preview__media";
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.poster = product.poster;
        video.preload = index < 2 ? (index === 0 ? "auto" : "metadata") : "none";
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("aria-hidden", "true");

        const source = document.createElement("source");
        source.src = product.video;
        source.type = "video/mp4";
        video.appendChild(source);
        stage.appendChild(video);
        return video;
    });

    const renderIngredients = product => {
        ingredients.replaceChildren();

        product.ingredients.forEach((ingredient, index) => {
            const tag = document.createElement("span");
            tag.className = `hero-preview__ingredient hero-preview__ingredient--${index}`;
            tag.textContent = ingredient;
            ingredients.appendChild(tag);
        });
    };

    const updateContent = index => {
        const product = products[index];
        title.textContent = product.name;
        renderIngredients(product);
        root.style.setProperty("--hero-accent", product.accent);
        root.setAttribute("aria-label", `Presentación de ${product.name}`);
        document.title = `${product.name} — Hero Preview`;
    };

    const stopAutoplay = () => {
        window.clearTimeout(autoplayTimer);
        autoplayTimer = null;
    };

    const scheduleAutoplay = () => {
        stopAutoplay();
        if (isPaused || reduceMotion) return;

        autoplayTimer = window.setTimeout(() => {
            changeProduct(1, false);
        }, autoplayDelay);
    };

    const prepareNextVideo = () => {
        const nextIndex = (activeIndex + 1) % products.length;
        const nextVideo = videos[nextIndex];

        if (nextVideo.preload === "none") {
            nextVideo.preload = "metadata";
            nextVideo.load();
        }
    };

    const playActiveVideo = () => {
        videos.forEach((video, index) => {
            if (index === activeIndex && !isPaused && !reduceMotion) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    };

    const finishTransition = (outgoing, incoming) => {
        outgoing.classList.remove("is-active", "is-transitioning");
        incoming.classList.remove("is-transitioning");
        incoming.classList.add("is-active");
        isTransitioning = false;
        playActiveVideo();
        prepareNextVideo();
        scheduleAutoplay();
    };

    const changeProduct = async direction => {
        if (isTransitioning) return;

        const targetIndex = (activeIndex + direction + products.length) % products.length;
        if (targetIndex === activeIndex) return;

        isTransitioning = true;
        stopAutoplay();

        const outgoing = videos[activeIndex];
        const incoming = videos[targetIndex];
        const offset = direction > 0 ? 102 : -102;

        incoming.preload = "auto";
        incoming.load();
        incoming.currentTime = 0;
        incoming.classList.add("is-transitioning");

        if (!isPaused && !reduceMotion) {
            incoming.play().catch(() => {});
        }

        root.classList.add("is-copy-changing");

        if (reduceMotion) {
            activeIndex = targetIndex;
            updateContent(activeIndex);
            root.classList.remove("is-copy-changing");
            finishTransition(outgoing, incoming);
            return;
        }

        const options = {
            duration: transitionDuration,
            easing: "cubic-bezier(0.76, 0, 0.24, 1)",
            fill: "forwards"
        };
        const incomingAnimation = incoming.animate(
            [
                { transform: `translate3d(${offset}%, 0, 0)` },
                { transform: "translate3d(0, 0, 0)" }
            ],
            options
        );
        const outgoingAnimation = outgoing.animate(
            [
                { transform: "translate3d(0, 0, 0)" },
                { transform: `translate3d(${-offset}%, 0, 0)` }
            ],
            options
        );

        await Promise.allSettled([incomingAnimation.finished, outgoingAnimation.finished]);
        incomingAnimation.cancel();
        outgoingAnimation.cancel();
        activeIndex = targetIndex;
        updateContent(activeIndex);
        finishTransition(outgoing, incoming);
        requestAnimationFrame(() => root.classList.remove("is-copy-changing"));
    };

    previousButton.addEventListener("click", () => changeProduct(-1));
    nextButton.addEventListener("click", () => changeProduct(1));

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopAutoplay();
            videos.forEach(video => video.pause());
        } else if (!isPaused) {
            playActiveVideo();
            scheduleAutoplay();
        }
    });

    videos[0].classList.add("is-active");
    updateContent(0);
    playActiveVideo();
    prepareNextVideo();
    scheduleAutoplay();
});
