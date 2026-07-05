function abrirModalResena() {
    const modal = document.getElementById('modal-resena');
    if (!modal) return;
    modal.style.display = 'flex';
}

function cerrarModalResena() {
    const modal = document.getElementById('modal-resena');
    if (!modal) return;
    modal.style.display = 'none';
}

function inicializarBurgerRating() {
    const rating = document.getElementById('burger-rating');
    const input = document.getElementById('resena-puntaje');

    if (!rating || !input) return;

    const botones = rating.querySelectorAll('button');

    function pintar(valor) {
        botones.forEach((boton) => {
            const botonValor = Number(boton.dataset.value);
            boton.classList.toggle('active', botonValor <= valor);
        });

        rating.dataset.value = valor;
        input.value = valor;
    }

    botones.forEach((boton) => {
        boton.addEventListener('click', () => {
            pintar(Number(boton.dataset.value));
        });

        boton.addEventListener('mouseenter', () => {
            pintar(Number(boton.dataset.value));
        });
    });

    rating.addEventListener('mouseleave', () => {
        pintar(Number(input.value || 5));
    });

    pintar(Number(input.value || 5));
}

document.addEventListener('DOMContentLoaded', inicializarBurgerRating);

function limpiarFormularioResena() {
    const nombre = document.getElementById('resena-nombre');
    const puntaje = document.getElementById('resena-puntaje');
    const texto = document.getElementById('resena-texto');

    if (nombre) nombre.value = '';
    if (puntaje) puntaje.value = '5';
    if (texto) texto.value = '';

    const rating = document.getElementById('burger-rating');
    if (rating) {
        rating.querySelectorAll('button').forEach((boton) => {
            boton.classList.toggle('active', Number(boton.dataset.value) <= 5);
        });
        rating.dataset.value = '5';
    }

    const tags = document.getElementById('review-tags');
    if (tags) {
        tags.querySelectorAll('button').forEach((boton) => {
            boton.classList.remove('active');
        });
    }

    const tagsInput = document.getElementById('resena-tags');
    if (tagsInput) tagsInput.value = '';
}

function inicializarReviewTags() {
    const contenedor = document.getElementById('review-tags');
    const input = document.getElementById('resena-tags');

    if (!contenedor || !input) return;

    contenedor.querySelectorAll('button').forEach((boton) => {
        boton.addEventListener('click', () => {
            boton.classList.toggle('active');

            const tags = [...contenedor.querySelectorAll('button.active')]
                .map((btn) => btn.dataset.tag);

            input.value = tags.join(',');
        });
    });
}

document.addEventListener('DOMContentLoaded', inicializarReviewTags);

async function guardarResena() {
    const inputNombre = document.getElementById('resena-nombre');
    const nombre = inputNombre?.value.trim();
    const puntaje = Number(document.getElementById('resena-puntaje')?.value || 0);
    const texto = document.getElementById('resena-texto')?.value.trim();
    const boton = document.getElementById('btn-guardar-resena');
    const tags = document.getElementById('resena-tags')?.value || '';

    if (!nombre || nombre.length < 2) {
        mostrarMensaje('Poné tu nombre para dejar la reseña.', 3000);
        inputNombre?.focus();
        return;
    }

    if (!texto || !puntaje) {
        mostrarMensaje('Completá puntaje y reseña.', 3000);
        return;
    }

    try {
        if (boton) {
            boton.disabled = true;
            boton.innerText = 'GUARDANDO...';
        }

        const { error } = await _supabase
            .from('resenas')
            .insert([{
                nombre,
                puntaje,
                texto,
                tags,
                visible: true
            }]);

        if (error) throw error;

        limpiarFormularioResena();
        cerrarModalResena();
        mostrarMensaje('Gracias por dejarnos tu reseña.', 3000);
    } catch (err) {
        console.error('Error guardando reseña:', err);
        mostrarMensaje('No pudimos guardar la reseña. Reintentá.', 3000);
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.innerText = 'GUARDAR RESEÑA';
        }
    }
}
