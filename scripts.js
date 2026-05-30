// Inicializador principal. Las funciones viven en js/*.js para facilitar mantenimiento.
document.addEventListener("DOMContentLoaded", async () => {
    await cargarConfiguracion();
    await cargarProductosDesdeBD();
    await cargarPromosDesdeBD();
    
    const carritoGuardado = localStorage.getItem("carrito_panosotros");
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarBarra();
    }

    renderHomePromos();
    mostrarPantalla("inicio");
    toggleDir();
});
