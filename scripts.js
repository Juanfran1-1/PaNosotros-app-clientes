// Inicializador principal. Las funciones viven en js/*.js para facilitar mantenimiento.
document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll(".video-fondo").forEach(video => {
        video.muted = true;
        video.playsInline = true;
        video.controls = false;
        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.setAttribute("preload", "auto");
        video.removeAttribute("controls");
        video.removeAttribute("poster");

        video.play().catch(() => {});
    });

    await cargarConfiguracion();
    await cargarProductosDesdeBD();
    await cargarPromosDesdeBD();
    
    const carritoGuardado = localStorage.getItem("carrito_panosotros");
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarBarra();
    }
    ultimoSnapshotMenu = crearSnapshotMenu();

    renderHomePromos();
    iniciarRealtimeMenu();
    iniciarPollingMenu();
    mostrarPantalla("inicio");
    toggleDir();
});
