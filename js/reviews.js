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

function limpiarFormularioResena() {
    const nombre = document.getElementById('resena-nombre');
    const puntaje = document.getElementById('resena-puntaje');
    const texto = document.getElementById('resena-texto');

    if (nombre) nombre.value = '';
    if (puntaje) puntaje.value = '5';
    if (texto) texto.value = '';
}

async function guardarResena() {
    const nombre = document.getElementById('resena-nombre')?.value.trim();
    const puntaje = Number(document.getElementById('resena-puntaje')?.value || 0);
    const texto = document.getElementById('resena-texto')?.value.trim();
    const boton = document.getElementById('btn-guardar-resena');

    if (!nombre || !texto || !puntaje) {
        mostrarMensaje('Completá nombre, puntaje y reseña.', 3000);
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
