// Inicializador principal. Las funciones viven en js/*.js para facilitar mantenimiento.
document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll(".video-fondo").forEach(video => {
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");

        video.play().catch(() => {});
    });

    await cargarConfiguracion();

    if (modoCierreTemporal) {
        aplicarModoCierreTemporal();
        iniciarRealtimeMenu();
        return;
    }

    await cargarProductosDesdeBD();
    await cargarPromosDesdeBD();
    
    const carritoGuardado = localStorage.getItem("carrito_panosotros");
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarBarra();
    }
    ultimoSnapshotMenu = crearSnapshotMenu();

    const esDesktop = window.matchMedia('(min-width: 900px)').matches;

    renderHomePromos();
    iniciarRealtimeMenu();
    iniciarPollingMenu();
    mostrarPantalla(esDesktop ? "menu" : "inicio");
    toggleDir();
});
