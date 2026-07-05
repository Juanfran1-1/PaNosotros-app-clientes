// 8. ENVÃO A WHATSAPP Y GUARDADO EN BD (CON VALIDACIÃ“N DE STOCK DINÃMICA)
function mostrarPasoCheckout(paso) {
    const checkout = document.getElementById('checkout');
    const pasos = {
        pedido: document.getElementById('checkout-step-pedido'),
        datos: document.getElementById('checkout-step-datos'),
        confirmando: document.getElementById('checkout-step-confirmando'),
        confirmado: document.getElementById('checkout-step-confirmado')
    };

    if (checkout) {
        checkout.classList.remove('checkout-paso-pedido', 'checkout-paso-datos', 'checkout-paso-confirmando', 'checkout-paso-confirmado');
        checkout.classList.add(`checkout-paso-${paso}`);
    }

    Object.values(pasos).forEach(step => {
        if (step) step.style.display = 'none';
    });

    if (pasos[paso]) pasos[paso].style.display = 'block';

    const back = document.querySelector('.checkout-back');
    if (back) {
        back.onclick = paso === 'datos'
            ? () => mostrarPasoCheckout('pedido')
            : () => mostrarPantalla('menu');
        back.style.display = (paso === 'confirmando' || paso === 'confirmado') ? 'none' : 'inline-flex';
    }

    if (paso === 'pedido') {
        actualizarResumenCheckout();
    }

    window.scrollTo(0, 0);
}

function limpiarCarritoConfirmado() {
    carrito = [];
    pedidoEnProceso = false;
    localStorage.removeItem('carrito_panosotros');
    if (typeof setEstadoBotonConfirmar === 'function') setEstadoBotonConfirmar(false);
    if (typeof actualizarBarra === 'function') actualizarBarra();
}

function abrirWhatsappConfirmado() {
    if (!whatsappPedidoUrl) return;
    limpiarCarritoConfirmado();
    window.location.href = whatsappPedidoUrl;
}

function volverMenuPedidoConfirmado() {
    limpiarCarritoConfirmado();
    mostrarPantalla('menu');
}

function previewPedidoConfirmado() {
    whatsappPedidoUrl = '#';
    const confirmadoNumero = document.getElementById('pedido-confirmado-numero');
    const confirmadoTotal = document.getElementById('pedido-confirmado-total');
    if (confirmadoNumero) confirmadoNumero.innerText = '366';
    if (confirmadoTotal) confirmadoTotal.innerText = total || 32000;
    mostrarPantalla('checkout');
    setTimeout(() => mostrarPasoCheckout('confirmado'), 350);
}

function setEstadoBotonConfirmar(bloqueado, texto = null) {
    const btnConfirmar = document.getElementById('btn-confirmar-pedido');
    if (!btnConfirmar) return;

    btnConfirmar.disabled = bloqueado;
    btnConfirmar.innerText = texto || (bloqueado ? "PROCESANDO..." : "CONFIRMAR PEDIDO");
    btnConfirmar.style.opacity = bloqueado ? "0.6" : "1";
    btnConfirmar.style.cursor = bloqueado ? "not-allowed" : "pointer";
}

function desbloquearConfirmacionPedido() {
    pedidoEnProceso = false;
    setEstadoBotonConfirmar(false);
}

function normalizarNumeroWhatsapp(numero) {
    return String(numero || '').replace(/\D/g, '');
}

async function enviarWhatsApp() {
    if (pedidoEnProceso) {
        mostrarMensaje("Ya estamos procesando tu pedido...", 2500);
        return;
    }

    pedidoEnProceso = true;
    setEstadoBotonConfirmar(true, "CREANDO PEDIDO...");

    // 1. Validar si el local estÃ¡ abierto
    try {
        const { data: nuevaConfig } = await _supabase.from('configuracion').select('abierto').single();
        if (nuevaConfig) configTienda.abierto = nuevaConfig.abierto;
    } catch (e) { console.log("Error al re-verificar cierre"); }

    if (!configTienda.abierto) {
        mostrarMensaje("Lo sentimos, el local ya se encuentra cerrado ðŸ˜´", 4000);
        desbloquearConfirmacionPedido();
        return;
    }

    // --- NUEVA VALIDACIÃ“N DE STOCK PRODUCTO POR PRODUCTO ---
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

        let promoExtrasFresh = [];
        try {
            const { data: promoExtrasData, error: errorPromoExtrasFresh } = await _supabase
                .from('promo_extras')
                .select('promo_id, extra_id');

            if (errorPromoExtrasFresh) throw errorPromoExtrasFresh;
            promoExtrasFresh = promoExtrasData || [];
        } catch (promoExtrasErr) {
            console.warn("No se pudo validar promo_extras:", promoExtrasErr);
        }

        // Verificamos cada item del carrito
        for (let item of carrito) {
            if (item.tipo_item === 'promo') {
                const promoBD = promosFresh.find(p => String(p.id) === String(item.id));
                if (!promoBD || promoBD.disponible === false) {
                    mostrarMensaje(`Lo sentimos, la promo "${item.nombre}" ya no estÃ¡ disponible.`, 5000);
                    desbloquearConfirmacionPedido();
                    return;
                }

                for (let variedad of (item.variedades || [])) {
                    const prodPromoBD = productosFresh.find(p => String(p.id) === String(variedad.id));
                    if (!prodPromoBD || prodPromoBD.disponible === false) {
                        mostrarMensaje(`Lo sentimos, "${variedad.nombre}" se acaba de agotar. EliminÃ¡ la promo para continuar.`, 5000);
                        desbloquearConfirmacionPedido();
                        return;
                    }
                }

                for (let extra of (item.extras || [])) {
                    const extraBD = extrasFresh.find(e => String(e.id) === String(extra.id));
                    if (!extraBD || extraBD.disponible === false) {
                        mostrarMensaje(`Lo sentimos, el extra "${extra.nombre}" ya no estÃ¡ disponible.`, 5000);
                        desbloquearConfirmacionPedido();
                        return;
                    }

                    if (promoExtrasFresh.length > 0) {
                        const extraPermitido = promoExtrasFresh.some(relacion =>
                            String(relacion.promo_id) === String(item.id) &&
                            String(relacion.extra_id) === String(extra.id)
                        );

                        if (!extraPermitido) {
                            mostrarMensaje(`El extra "${extra.nombre}" ya no estÃ¡ permitido en esta promo.`, 5000);
                            desbloquearConfirmacionPedido();
                            return;
                        }
                    }
                }
                continue;
            }

            const prodBD = productosFresh.find(p => String(p.id) === String(item.id));
            
            // Si el producto no existe o disponible es false
            if (!prodBD || prodBD.disponible === false) {
                mostrarMensaje(`âš ï¸ Lo sentimos \n\n El producto "${item.nombre}" se acaba de agotar. \n\n Por favor, eliminalo para continuar.`, 5000);
                desbloquearConfirmacionPedido();
                return; // Cortamos la ejecuciÃ³n aquÃ­
            }
        }
    } catch (e) {
        console.error("Error validando stock:", e);
        mostrarMensaje("âŒ Error al verificar stock. Reintenta.", 3000);
        desbloquearConfirmacionPedido();
        return;
    }
    // --- FIN VALIDACIÃ“N DE STOCK ---

    const nombre = document.getElementById('nombre-cliente').value.trim();
    const telefono = document.getElementById('telefono-cliente').value.trim(); 
    const entrega = document.getElementById('metodo-entrega').value;
    const dir = document.getElementById('dir-cliente').value.trim();
    const pago = document.getElementById('metodo-pago').value;

    if (!nombre || !telefono || (entrega === 'Delivery' && !dir)) {
        mostrarMensaje("CompletÃ¡ tus datos âœï¸", 3000);
        desbloquearConfirmacionPedido();
        return;
    }

    const whatsappDestino = normalizarNumeroWhatsapp(configTienda.whatsapp);
    if (!whatsappDestino) {
        mostrarMensaje("WhatsApp no configurado. ReintentÃ¡ mÃ¡s tarde.", 4000);
        desbloquearConfirmacionPedido();
        return;
    }

    mostrarPasoCheckout('confirmando');

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

        try {
            await enviarNotificacionPedidoEmail({
                pedido_id: idGenerado,
                cliente: nombre,
                telefono: telefono,
                detalle: detalleBD,
                monto: total,
                metodo_pago: pago,
                entrega: entrega,
                direccion: entrega === 'Delivery' ? dir : 'Retira en local',
                subtotal: entrega === "Delivery" ? total - COSTO_ENVIO : total,
                costo_envio: entrega === "Delivery" ? COSTO_ENVIO : 0,
                items: carrito.map(item => ({
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    subtotal: item.precio * item.cantidad,
                    detalle: item.detalleLineas || [],
                    quitados: item.quitados || []
                }))
            });
        } catch (emailErr) {
            console.warn("Pedido guardado, pero no se pudo enviar el email interno:", emailErr);
        }

        let msg = ` *PEDIDO #${idGenerado || 'N/A'}* \n\n`;
        msg += `*Tu nombre:* ${nombre}\n*Entrega:* ${entrega}\n`;
        if (entrega === 'Delivery') msg += `*DirecciÃ³n:* ${dir}\n`;
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
            msg += `EnvÃ­o: $${COSTO_ENVIO}\n`;
        
        }
        if(entrega === "Retiro") {
            msg += `Retirar por ${configTienda.direccion_local || '119 e/81 y 82'}\n`;
        
        }
        msg += `\n*TOTAL: $${total}*\n\n`;

        msg += `--------------------------\n`;
        if (pago === 'Transferencia') msg += `RecordÃ¡ preguntar por la disponibilidad del stock antes de enviar el comprobante \n`;
        if (pago === 'Transferencia') msg += `--------------------------\n`;
        msg += `PodÃ©s consultar el estado de tu pedido con el nÃºmero *#${idGenerado}* en nuestra web.`;

        whatsappPedidoUrl = `https://wa.me/${whatsappDestino}?text=${encodeURIComponent(msg)}`;
        const confirmadoNumero = document.getElementById('pedido-confirmado-numero');
        const confirmadoTotal = document.getElementById('pedido-confirmado-total');
        if (confirmadoNumero) confirmadoNumero.innerText = idGenerado || 'N/A';
        if (confirmadoTotal) confirmadoTotal.innerText = total;
        mostrarPasoCheckout('confirmado');

        setTimeout(() => {
            abrirWhatsappConfirmado();
            
            setTimeout(() => {
                desbloquearConfirmacionPedido();
                mostrarPantalla('inicio');
            }, 1000);
        }, 3800);

    } catch (err) {
        console.error(err);
        mostrarMensaje("âŒ Error de conexiÃ³n. Reintenta.", 3000);
        desbloquearConfirmacionPedido();
        mostrarPasoCheckout('datos');
    }
}
