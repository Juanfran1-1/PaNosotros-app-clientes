// FUNCIONES AUXILIARES
function mostrarMensaje(texto, duracion = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = texto;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duracion);
}

function irAlCheckout() {
    // 1. Mostramos la pantalla
    mostrarPantalla('checkout');
    
    // 2. Ejecutamos la actualización del resumen
    // Envolvemos en un try/catch para que si falla, al menos sepa qué pasó
    try {
        actualizarResumenCheckout();
    } catch (error) {
        console.error("Error en el resumen:", error);
    }
}

function toggleDir() {
    const m = document.getElementById('metodo-entrega').value;
    const campo = document.getElementById('campo-dir');
    const textoEnvio = document.getElementById('texto-costo-envio');
    document.querySelectorAll('[data-envio-label]').forEach(el => {
        el.innerText = COSTO_ENVIO;
    });
    actualizarRevealCheckout(campo, m === 'Delivery');
    if (textoEnvio) {
        textoEnvio.innerText = m === 'Delivery'
            ? `Envío + $${COSTO_ENVIO}`
            : 'Retiro en local : 119 e/81 y 82';
    }
}

function seleccionarOpcionCheckout(boton) {
    const selectId = boton.dataset.select;
    const valor = boton.dataset.value;
    const select = document.getElementById(selectId);
    if (!select) return;

    select.value = valor;
    document.querySelectorAll(`[data-select="${selectId}"]`).forEach(opcion => {
        opcion.classList.toggle('active', opcion === boton);
    });

    if (selectId === 'metodo-entrega') {
        toggleDir();
        actualizarResumenCheckout();
    }

    if (selectId === 'metodo-pago') {
        togglePago();
    }
}

function sincronizarOpcionesCheckout() {
    ['metodo-entrega', 'metodo-pago'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        document.querySelectorAll(`[data-select="${selectId}"]`).forEach(opcion => {
            opcion.classList.toggle('active', opcion.dataset.value === select.value);
        });
    });

    document.querySelectorAll('[data-envio-label]').forEach(el => {
        el.innerText = COSTO_ENVIO;
    });
}
function togglePago() {
    const metodo = document.getElementById('metodo-pago').value;
    const infoTransf = document.getElementById('info-transferencia');
    actualizarRevealCheckout(infoTransf, metodo === 'Transferencia');
}

function actualizarRevealCheckout(elemento, visible) {
    if (!elemento) return;

    elemento.classList.add('checkout-reveal');
    if (visible) {
        elemento.style.display = 'block';
        requestAnimationFrame(() => elemento.classList.add('is-visible'));
    } else {
        elemento.classList.remove('is-visible');
        setTimeout(() => {
            if (!elemento.classList.contains('is-visible')) {
                elemento.style.display = 'none';
            }
        }, 220);
    }
}

function copiarAlias() {
    const alias = configTienda.alias_mp; // CAMBIO: Antes era fijo
    const btnCopiar = document.querySelector('.btn-copiar');
    navigator.clipboard.writeText(alias).then(() => {
        if (!btnCopiar) {
            mostrarMensaje("Alias copiado", 2000);
            return;
        }

        const textoOriginal = btnCopiar.innerText;
        btnCopiar.innerText = "✓ ALIAS COPIADO";
        btnCopiar.classList.add('copiado');

        setTimeout(() => {
            btnCopiar.innerText = textoOriginal;
            btnCopiar.classList.remove('copiado');
        }, 1700);
    });
}

// Agregá esta función al final de tu scripts.js
function guardarCarritoEnLocalStorage() {
    localStorage.setItem('carrito_panosotros', JSON.stringify(carrito));
}

let homePromoTimer = null;

function renderHomePromos() {
    const contenedor = document.getElementById('home-promo-carousel');
    if (!contenedor) return;

    if (homePromoTimer) {
        clearInterval(homePromoTimer);
        homePromoTimer = null;
    }

    const promosDisponibles = (promos || []).filter(promo => {
        const tieneVariedades = typeof promoTieneVariedadesDisponibles !== 'function'
            || promoTieneVariedadesDisponibles(promo);
        return promo.disponible !== false && tieneVariedades;
    });
    if (promosDisponibles.length === 0) {
        contenedor.innerHTML = "";
        contenedor.style.display = "none";
        return;
    }

    contenedor.style.display = "block";
    const titulo = configTienda.promo_titulo || configTienda.titulo_promos || "Día de la Mini Burger";
    let indiceActivo = 0;

    function pintarPromo() {
        const promo = promosDisponibles[indiceActivo];
        const descripcion = promo.descripcion || "Promo especial por tiempo limitado.";

        contenedor.innerHTML = `
            <div class="home-promo-card" onclick="mostrarPantalla('menu')">
                <div class="home-promo-header">
                    <span>${titulo}</span>
                    <small>${indiceActivo + 1}/${promosDisponibles.length}</small>
                </div>
                <h3>${promo.nombre}</h3>
                <p>${descripcion}</p>
                <strong>$${promo.precio}</strong>
            </div>
        `;
    }

    pintarPromo();

    if (promosDisponibles.length > 1) {
        homePromoTimer = setInterval(() => {
            indiceActivo = (indiceActivo + 1) % promosDisponibles.length;
            pintarPromo();
        }, 12000);
    }
}
