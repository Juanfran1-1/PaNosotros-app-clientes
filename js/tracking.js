// --- FUNCIÓN PARA CONSULTAR ESTADO DEL PEDIDO ---
async function consultarEstado() {
    const input = document.getElementById('input-tracking');
    const nroPedido = parseInt(input.value);

    if (!nroPedido) {
        mostrarMensaje("Ingresá un número válido 🔢");
        return;
    }

    const limite = new Date();
    limite.setHours(limite.getHours() - 24);
    const limiteISO = limite.toISOString();

    const resDiv = document.getElementById('resultado-tracking');
    const resBadge = document.getElementById('res-badge');
    const resId = document.getElementById('res-id');

    try {
        const { data, error } = await _supabase
            .from('pedidos')
            .select('id, estado, fecha, metodo_pago')
            .eq('id', nroPedido)
            .gt('fecha', limiteISO)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            resDiv.style.display = 'block';
            resId.innerText = data.id;

            let estadoVisual = { txt: data.estado, color: "#95a5a6" };

            if (data.metodo_pago === "Transferencia") {
                const estadosTransf = {
                    "Pendiente de Pago": { txt: "⏳ Esperando comprobante", color: "#e4e73b" },
                    "Cocinando": { txt: "👨‍🍳 EN COCINA", color: "#df8723" },
                    "Terminado": { txt: "✅ ¡LISTO!", color: "#2ecc71" },
                    "Rechazado": { txt: "❌ CANCELADO", color: "#e74c3c" }
                };
                estadoVisual = estadosTransf[data.estado] || estadoVisual;
            } else {
                const estadosEfectivo = {
                    "Esperando Confirmacion": { txt: "⏳ Pedido recibido", color: "#e4e73b" },
                    "Cocinando": { txt: "👨‍🍳 EN COCINA", color: "#df8723" },
                    "Terminado": { txt: "✅ ¡LISTO!", color: "#2ecc71" },
                    "Pendiente de Pago": { txt: "✅ ¡LISTO!", color: "#2ecc71" },
                    "Rechazado": { txt: "❌ CANCELADO", color: "#e74c3c" }
                };
                estadoVisual = estadosEfectivo[data.estado] || estadoVisual;
            }

            resBadge.innerText = estadoVisual.txt;
            resBadge.style.backgroundColor = estadoVisual.color;
        } else {
            resDiv.style.display = 'none';
            mostrarMensaje("Pedido no encontrado o expirado ❌");
        }
    } catch (err) {
        console.error("Error en tracking:", err);
        mostrarMensaje("Error al conectar ❌");
    }
}
