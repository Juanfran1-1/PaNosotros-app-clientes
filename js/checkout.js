// 8. ENVÍO A WHATSAPP Y GUARDADO EN BD (CON VALIDACIÓN DE STOCK DINÁMICA)
async function enviarWhatsApp() {
    // 1. Validar si el local está abierto
    try {
        const { data: nuevaConfig } = await _supabase.from('configuracion').select('abierto').single();
        if (nuevaConfig) configTienda.abierto = nuevaConfig.abierto;
    } catch (e) { console.log("Error al re-verificar cierre"); }

    if (!configTienda.abierto) {
        mostrarMensaje("Lo sentimos, el local ya se encuentra cerrado 😴", 4000);
        return;
    }

    // --- NUEVA VALIDACIÓN DE STOCK PRODUCTO POR PRODUCTO ---
    try {
        // Obtenemos los datos frescos de la tabla hamburguesas
        const { data: productosFresh, error: errorStock } = await _supabase
            .from('hamburguesas')
            .select('id, nombre, disponible');

        if (errorStock) throw errorStock;

        const { data: promosFresh, error: errorPromosFresh } = await _supabase
            .from('promos')
            .select('id, nombre, disponible');

        if (errorPromosFresh) throw errorPromosFresh;

        const { data: extrasFresh, error: errorExtrasFresh } = await _supabase
            .from('extras')
            .select('id, nombre, disponible');

        if (errorExtrasFresh) throw errorExtrasFresh;

        // Verificamos cada item del carrito
        for (let item of carrito) {
            if (item.tipo_item === 'promo') {
                const promoBD = promosFresh.find(p => String(p.id) === String(item.id));
                if (!promoBD || promoBD.disponible === false) {
                    mostrarMensaje(`Lo sentimos, la promo "${item.nombre}" ya no está disponible.`, 5000);
                    return;
                }

                for (let variedad of (item.variedades || [])) {
                    const prodPromoBD = productosFresh.find(p => String(p.id) === String(variedad.id));
                    if (!prodPromoBD || prodPromoBD.disponible === false) {
                        mostrarMensaje(`Lo sentimos, "${variedad.nombre}" se acaba de agotar. Eliminá la promo para continuar.`, 5000);
                        return;
                    }
                }

                for (let extra of (item.extras || [])) {
                    const extraBD = extrasFresh.find(e => String(e.id) === String(extra.id));
                    if (!extraBD || extraBD.disponible === false) {
                        mostrarMensaje(`Lo sentimos, el extra "${extra.nombre}" ya no está disponible.`, 5000);
                        return;
                    }
                }
                continue;
            }

            const prodBD = productosFresh.find(p => String(p.id) === String(item.id));
            
            // Si el producto no existe o disponible es false
            if (!prodBD || prodBD.disponible === false) {
                mostrarMensaje(`⚠️ Lo sentimos \n\n El producto "${item.nombre}" se acaba de agotar. \n\n Por favor, eliminalo para continuar.`, 5000);
                return; // Cortamos la ejecución aquí
            }
        }
    } catch (e) {
        console.error("Error validando stock:", e);
        mostrarMensaje("❌ Error al verificar stock. Reintenta.", 3000);
        return;
    }
    // --- FIN VALIDACIÓN DE STOCK ---

    const nombre = document.getElementById('nombre-cliente').value.trim();
    const telefono = document.getElementById('telefono-cliente').value.trim(); 
    const entrega = document.getElementById('metodo-entrega').value;
    const dir = document.getElementById('dir-cliente').value.trim();
    const pago = document.getElementById('metodo-pago').value;

    if (!nombre || (entrega === 'Delivery' && !dir)) {
        mostrarMensaje("Completá tus datos ✍️", 3000);
        return;
    }

    const btnConfirmar = document.querySelector('#checkout .btn-principal');
    
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerText = "⏳ PROCESANDO...";
        btnConfirmar.style.opacity = "0.6";
        btnConfirmar.style.cursor = "not-allowed";
    }

    const detalleBD = carrito.map(item => {
        let texto = `${item.cantidad}x ${item.nombre.trim()}`;
        if (item.detalleLineas && item.detalleLineas.length > 0) {
            texto += ` (${item.detalleLineas.join(' | ')})`;
        }
        if (item.quitados && item.quitados.length > 0) {
            texto += ` (SIN: ${item.quitados.join(', ').toUpperCase()})`;
        }
        return texto;
    }).join(' | ');

    try {
        const idGenerado = await guardarPedidoEnSupabase({
            cliente: nombre,
            telefono: telefono,
            detalle: detalleBD,
            monto: total,
            metodo_pago: pago,
            entrega: entrega,
            direccion: entrega === 'Delivery' ? dir : 'Retira en local'
        });

        if (idGenerado) {
            try {
                await guardarItemsPedidoEnSupabase(idGenerado);
            } catch (itemsErr) {
                console.error("Pedido guardado, pero fallo el detalle estructurado:", itemsErr);
            }
        }

        let msgconfir = "✅ ¡Pedido confirmado!";
        if (pago === 'Transferencia') {
            msgconfir = "✅ ¡Pedido registrado!\n\n⚠️ RECUERDA:\nConsultá disponibilidad de stock\nantes de transferir.";
        }
        mostrarMensaje(msgconfir, 5000);

        let msg = ` *PEDIDO #${idGenerado || 'N/A'}* \n\n`;
        msg += `*Tu nombre:* ${nombre}\n*Entrega:* ${entrega}\n`;
        if (entrega === 'Delivery') msg += `*Dirección:* ${dir}\n`;
        msg += `*Pago:* ${pago}\n\n`;

        msg += `--------------------------\n`;
        msg += `*PRODUCTOS:*\n`
        carrito.forEach(item => {
            msg += `- ${item.cantidad}x ${item.nombre}`;
            if (item.detalleLineas && item.detalleLineas.length > 0) msg += ` (${item.detalleLineas.join(' | ')})`;
            if (item.quitados && item.quitados.length > 0) msg += ` (SIN: ${item.quitados.join(', ').toUpperCase()})`;
            msg += `\n`;
        });
        msg += `--------------------------\n`;

        if(entrega === "Delivery") {
            msg += `Subtotal: $${total - COSTO_ENVIO}\n`;
            msg += `Envío: $${COSTO_ENVIO}\n`;
        
        }
        msg += `\n*TOTAL: $${total}*\n\n`;

        msg += `--------------------------\n`;
        if (pago === 'Transferencia') msg += `Recordá preguntar por la disponibilidad del stock antes de enviar el comprobante \n`;
        if (pago === 'Transferencia') msg += `--------------------------\n`;
        msg += `Podés consultar el estado de tu pedido con el número *#${idGenerado}* en nuestra web.`;

        setTimeout(() => {
            const wspUrl = `https://wa.me/${configTienda.whatsapp}?text=${encodeURIComponent(msg)}`;
            
            carrito = [];
            localStorage.removeItem('carrito_panosotros')
            if (typeof actualizarBarra === 'function') actualizarBarra();
            window.location.href = wspUrl;
            
            setTimeout(() => {
                if (btnConfirmar) {
                    btnConfirmar.disabled = false;
                    btnConfirmar.innerText = "CONFIRMAR POR WHATSAPP";
                    btnConfirmar.style.opacity = "1";
                    btnConfirmar.style.cursor = "pointer";
                }
                mostrarPantalla('inicio');
            }, 1000);
        }, 1500);

    } catch (err) {
        console.error(err);
        mostrarMensaje("❌ Error de conexión. Reintenta.", 3000);
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerText = "CONFIRMAR POR WHATSAPP";
            btnConfirmar.style.opacity = "1";
        }
    }
}
