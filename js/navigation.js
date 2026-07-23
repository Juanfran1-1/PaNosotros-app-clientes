// 4. FUNCIONES DE NAVEGACIÓN
function mostrarPantalla(idPantalla) {
    if (modoCierreTemporal && idPantalla !== 'cierre-temporal') {
        aplicarModoCierreTemporal();
        return;
    }

    const pantallaMenu = document.getElementById('menu');
    const pantallaActualVisible = pantallaMenu && pantallaMenu.style.display === 'block';

    if (idPantalla === 'inicio' && pantallaActualVisible && carrito.length > 0) {
        pantallaDestinoTemporal = idPantalla;
        document.getElementById('modal-confirmacion').style.display = 'flex';
        return;
    }
    ejecutarCambioPantalla(idPantalla);
}

async function ejecutarCambioPantalla(idPantalla) { // Agregamos async aquí

    if (modoCierreTemporal) idPantalla = 'cierre-temporal';


    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';

    setTimeout(async () => { // Agregamos async aquí también
        document.querySelectorAll('section').forEach(s => s.style.display = 'none');
        
        const target = document.getElementById(idPantalla);
        if (target) {
            target.style.display = (idPantalla === 'inicio') ? 'flex' : 'block';
        }

        if (idPantalla === 'inicio' && typeof renderHomePromos === 'function') {
            renderHomePromos();
        }

        // --- CAMBIO CLAVE AQUÍ ---
        if (idPantalla === 'menu') {
            await cargarProductosDesdeBD(); // Trae los productos frescos de la base de datos
            await cargarPromosDesdeBD();
            cargarMenu(); // Dibuja el menú con esos productos nuevos
        }
        // -------------------------
        
        if (idPantalla === 'checkout') {
            if (typeof mostrarPasoCheckout === 'function') mostrarPasoCheckout('pedido');
            actualizarResumenCheckout();
            if (typeof sincronizarOpcionesCheckout === 'function') sincronizarOpcionesCheckout();
            toggleDir();
            togglePago(); 
        }

        if (loader) loader.style.display = 'none';
        window.scrollTo(0, 0);
    }, 300);
}

function aplicarModoCierreTemporal() {
    document.querySelectorAll('body > section').forEach(section => {
        section.style.display = section.id === 'cierre-temporal' ? 'flex' : 'none';
    });

    document.querySelectorAll('.modal-resena, #modal-confirmacion').forEach(modal => {
        modal.style.display = 'none';
    });

    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';

    const toast = document.getElementById('toast');
    if (toast) {
        toast.style.display = 'none';
        toast.textContent = '';
    }

    window.scrollTo(0, 0);
}

function cerrarConfirmacion(acepta) {
    document.getElementById('modal-confirmacion').style.display = 'none';
    if (acepta) {
        carrito = [];
        localStorage.removeItem('carrito_panosotros')
        actualizarBarra();
        ejecutarCambioPantalla(pantallaDestinoTemporal);
    }
    pantallaDestinoTemporal = null;
}
