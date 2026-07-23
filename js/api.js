// scripts.js
async function cargarConfiguracion() {
    try {
        const { data, error } = await _supabase.from('configuracion').select('*').single();
        if (error) throw error;
        if (data) {
            const estadoPrevioLocal = estadoLocalAnterior;
            const mantenimientoPrevio = modoCierreTemporal;
            configTienda = data;
            modoCierreTemporal = configTienda.mantenimiento === true;
            COSTO_ENVIO = data.COSTO_ENVIO || 0;
            const estaRealmenteAbierto = configTienda.abierto;

            if (modoCierreTemporal) {
                carrito = [];
                total = 0;
                localStorage.removeItem('carrito_panosotros');
                if (typeof aplicarModoCierreTemporal === 'function') aplicarModoCierreTemporal();
            } else if (mantenimientoPrevio && pantallaVisible('cierre-temporal')) {
                window.location.reload();
                return;
            }

            if (estadoPrevioLocal !== null && estadoPrevioLocal !== estaRealmenteAbierto) {
                if (estaRealmenteAbierto) {
                    mostrarMensaje("Local abierto", 3500);
                } else {
                    carrito = [];
                    total = 0;
                    localStorage.removeItem('carrito_panosotros');
                    if (typeof actualizarBarra === 'function') actualizarBarra();
                    if (typeof actualizarResumenCheckout === 'function') actualizarResumenCheckout();
                    mostrarMensaje("Local cerrado.", 4500);

                    if (pantallaVisible('checkout') || pantallaVisible('detalle-producto')) {
                        mostrarPantalla('menu');
                    }
                }
            }
            estadoLocalAnterior = estaRealmenteAbierto;

            if (document.getElementById('checkout').style.display === 'flex') {
                actualizarResumenCheckout();
            }
            console.log("Configuración cargada:", configTienda);
            
            // AGREGAR ESTO: Actualiza el alias en el HTML si ya existe el elemento
            const spanAlias = document.getElementById('alias-texto');
            if (spanAlias && configTienda.alias_mp) {
                spanAlias.innerText = configTienda.alias_mp;
            }
            
            const btnPedido = document.getElementById('btn-comenzar');
            const statusLocal = document.getElementById('status-local');

            if (!estaRealmenteAbierto) {
                // CAMBIO: En lugar de deshabilitar, permitimos entrar pero cambiamos el texto
                if (btnPedido) {
                    btnPedido.innerText = "VER MENÚ";
                    btnPedido.style.background = "#7f8c8d"; // Un gris elegante
                    btnPedido.disabled = false; 
                }
                if (statusLocal) {
                    statusLocal.style.display = 'block';
                    statusLocal.innerText = "El local se encuentra cerrado actualmente";
                }
            } else {
                if (btnPedido) {
                    btnPedido.innerText = "VER MENÚ";
                    btnPedido.style.background = "var(--naranja)";
                }
                if (statusLocal) statusLocal.style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

async function crearPedidoSeguro(datosPedido) {
    const { data, error } = await _supabase.functions.invoke('create-order', {
        body: datosPedido
    });

    if (error) {
        let mensaje = "No pudimos crear el pedido. Reintentá.";
        try {
            const detalle = await error.context?.json();
            if (detalle?.error) mensaje = detalle.error;
        } catch (_err) {
            // Conservamos el mensaje general si la respuesta no contiene JSON.
        }
        throw new Error(mensaje);
    }

    if (!data?.pedido_id) {
        throw new Error("No se recibió el número del pedido.");
    }

    return data;
}

async function cargarProductosDesdeBD() {
    try {
        const { data, error } = await _supabase.from('hamburguesas').select('*');
        if (error) throw error;
        
        // Actualizamos la variable global 'productos' con los datos más recientes
        productos = data
            .filter(p => p.mostrar_en_menu !== false)
            .map(p => ({
                ...p,
                foto: normalizarFotoProducto(p.foto),
                desc: p.desc || 'Combo de mini burgers.',
                ingredientes: p.ingredientes ? p.ingredientes.split(',').map(i => i.trim()) : []
            }));
        
    } catch (err) {
        console.error("Error cargando base de datos:", err);
        mostrarMensaje("Error al actualizar el menú ❌", 3000);
    }
}

function normalizarFotoProducto(foto) {
    if (!foto) return 'src/fondominis.jpeg';

    const nombreFoto = foto.trim();
    if (!nombreFoto || nombreFoto.toLowerCase() === 'logo.jpg' || nombreFoto.toLowerCase() === 'src/logo.jpg') {
        return 'src/fondominis.jpeg';
    }

    if (/^https?:\/\//i.test(nombreFoto)) {
        return nombreFoto;
    }

    if (nombreFoto.toLowerCase() === 'parri-llera.png') {
        return 'src/Parri-Llera.webp';
    }

    if (nombreFoto.toLowerCase() === 'veggie smalls.png') {
        return 'src/Veggie Smalls.webp';
    }

    if (nombreFoto.toLowerCase() === 'cheddy krueger.png') {
        return 'src/Cheddy Krueger.webp';
    }

    return `src/${nombreFoto}`;
}

function normalizarFotoPromo(foto, nombre) {
    const nombrePromo = (nombre || '').toUpperCase();
    const nombreFoto = foto ? foto.trim() : '';

    if (/^https?:\/\//i.test(nombreFoto)) {
        return nombreFoto;
    }

    if (nombrePromo.includes('GORDITXS LIGHT')) {
        return 'src/PROMO GORDITXS LIGHT.webp';
    }

    if (nombrePromo.includes('GORDITXS')) {
        return 'src/PROMO GORDITXS.webp';
    }

    if (!nombreFoto || nombreFoto.toLowerCase() === 'logo.jpg' || nombreFoto.toLowerCase() === 'src/logo.jpg') {
        return 'src/fondominis.jpeg';
    }

    return nombreFoto ? `src/${nombreFoto}` : 'src/fondominis.jpeg';
}

function normalizarFotoExtra(foto) {
    if (!foto) return 'src/fondominis.jpeg';

    const nombreFoto = foto.trim();
    if (!nombreFoto || nombreFoto.toLowerCase() === 'logo.jpg' || nombreFoto.toLowerCase() === 'src/logo.jpg') {
        return 'src/fondominis.jpeg';
    }

    if (/^https?:\/\//i.test(nombreFoto)) {
        return nombreFoto;
    }

    return `src/${nombreFoto}`;
}

async function cargarPromosDesdeBD() {
    try {
        const { data: promosData, error: errorPromos } = await _supabase
            .from('promos')
            .select(`
                *,
                promo_items (
                    id,
                    cantidad,
                    hamburguesa_id
                )
            `)
            .eq('disponible', true);

        if (errorPromos) throw errorPromos;

        const { data: extrasData, error: errorExtras } = await _supabase
            .from('extras')
            .select('*')
            .eq('disponible', true);

        if (errorExtras) throw errorExtras;
        extras = (extrasData || []).map(extra => ({
            ...extra,
            foto: normalizarFotoExtra(extra.foto)
        }));

        let promoExtras = [];
        try {
            const { data: promoExtrasData, error: errorPromoExtras } = await _supabase
                .from('promo_extras')
                .select('*');

            if (errorPromoExtras) throw errorPromoExtras;
            promoExtras = promoExtrasData || [];
        } catch (promoExtrasErr) {
            console.warn("No se pudieron cargar extras por promo:", promoExtrasErr);
        }

        promos = (promosData || []).map(promo => {
            const relacionesExtras = promoExtras.filter(item => String(item.promo_id) === String(promo.id));
            const extrasPermitidos = relacionesExtras
                .map(item => extras.find(extra => String(extra.id) === String(item.extra_id)))
                .filter(Boolean);

            return {
                ...promo,
                foto: normalizarFotoPromo(promo.foto, promo.nombre),
                promo_items: promo.promo_items || [],
                promo_extras: relacionesExtras,
                extras_permitidos: extrasPermitidos
            };
        });
    } catch (err) {
        console.error("Error cargando promos:", err);
        promos = [];
        extras = [];
    }
}

function pantallaVisible(idPantalla) {
    const pantalla = document.getElementById(idPantalla);
    return pantalla && pantalla.style.display !== 'none';
}

function crearSnapshotMenu() {
    return JSON.stringify({
        productos: productos.map(p => ({
            id: p.id,
            disponible: p.disponible,
            stock_actual: p.stock_actual,
            precio: p.precio,
            foto: p.foto
        })),
        promos: promos.map(p => ({
            id: p.id,
            disponible: p.disponible,
            precio: p.precio,
            foto: p.foto,
            descripcion: p.descripcion,
            permite_variedades: p.permite_variedades,
            max_variedades: p.max_variedades,
            promo_items: (p.promo_items || []).map(item => ({
                hamburguesa_id: item.hamburguesa_id,
                cantidad: item.cantidad
            })),
            promo_extras: (p.promo_extras || []).map(item => ({
                promo_id: item.promo_id,
                extra_id: item.extra_id
            }))
        })),
        extras: extras.map(e => ({
            id: e.id,
            disponible: e.disponible,
            precio: e.precio
        })),
        configuracion: {
            abierto: configTienda.abierto,
            mantenimiento: configTienda.mantenimiento,
            COSTO_ENVIO,
            promo_titulo: configTienda.promo_titulo
        }
    });
}

async function refrescarMenuDesdeBD({ forzarRender = true } = {}) {
    await cargarConfiguracion();
    await cargarProductosDesdeBD();
    await cargarPromosDesdeBD();

    const nuevoSnapshot = crearSnapshotMenu();
    const cambio = nuevoSnapshot !== ultimoSnapshotMenu;
    ultimoSnapshotMenu = nuevoSnapshot;

    if (!forzarRender && !cambio) return false;

    if (pantallaVisible('menu')) {
        cargarMenu();
    }

    if (pantallaVisible('inicio') && typeof renderHomePromos === 'function') {
        renderHomePromos();
    }

    if (pantallaVisible('detalle-producto') && productoSeleccionado?.tipo_item === 'promo') {
        productoSeleccionado = promos.find(promo => String(promo.id) === String(productoSeleccionado.id));
        if (productoSeleccionado) {
            productoSeleccionado.tipo_item = 'promo';
            renderDetallePromo();
        } else {
            mostrarPantalla('menu');
        }
    }

    if (typeof actualizarBarra === 'function') {
        actualizarBarra();
    }

    return cambio;
}

function programarRefreshMenuRealtime(payload) {
    if (payload) {
        console.log("Realtime menú recibió cambio:", payload.table, payload.eventType);
    }

    clearTimeout(menuRefreshTimer);
    menuRefreshTimer = setTimeout(async () => {
        try {
            await refrescarMenuDesdeBD({ forzarRender: true });
        } catch (err) {
            console.error("Error actualizando menú en tiempo real:", err);
        }
    }, 350);
}

function iniciarRealtimeMenu() {
    if (realtimeMenuChannel) return;
    clearTimeout(realtimeReconnectTimer);

    const tablasRealtime = [
        'hamburguesas',
        'promos',
        'promo_items',
        'promo_extras',
        'extras',
        'configuracion'
    ];

    realtimeMenuChannel = tablasRealtime.map(tabla => {
        return _supabase
            .channel(`menu-realtime-${tabla}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tabla },
                programarRefreshMenuRealtime
            )
            .subscribe((status) => {
                console.log(`Estado Realtime ${tabla}:`, status);

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    console.warn(`Realtime ${tabla} desconectado:`, status);
                    realtimeMenuChannel = null;
                    clearTimeout(realtimeReconnectTimer);
                    realtimeReconnectTimer = setTimeout(() => {
                        console.log("Reintentando Realtime menú...");
                        iniciarRealtimeMenu();
                    }, 3000);
                }
            });
    });

    console.log("Realtime menú escuchando tablas:", tablasRealtime.join(', '));
}

function iniciarPollingMenu() {
    if (menuPollingTimer) return;

    menuPollingTimer = setInterval(async () => {
        const necesitaPolling =
            pantallaVisible('menu') ||
            pantallaVisible('inicio') ||
            pantallaVisible('detalle-producto');

        if (!necesitaPolling) return;

        try {
            const cambio = await refrescarMenuDesdeBD({ forzarRender: false });
            if (cambio) {
                console.log("Menú actualizado por polling");
            }
        } catch (err) {
            console.error("Error en polling del menú:", err);
        }
    }, 10000);
}
