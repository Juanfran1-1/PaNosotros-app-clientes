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
    if (campo) campo.style.display = (m === 'Delivery') ? 'block' : 'none';
}
function togglePago() {
    const metodo = document.getElementById('metodo-pago').value;
    const infoTransf = document.getElementById('info-transferencia');
    if (infoTransf) infoTransf.style.display = (metodo === 'Transferencia') ? 'block' : 'none';
}

function copiarAlias() {
    const alias = configTienda.alias_mp; // CAMBIO: Antes era fijo
    navigator.clipboard.writeText(alias).then(() => {
        mostrarMensaje("Alias copiado", 2000);
    });
}

// Agregá esta función al final de tu scripts.js
function guardarCarritoEnLocalStorage() {
    localStorage.setItem('carrito_panosotros', JSON.stringify(carrito));
}
