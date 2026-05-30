// scripts.js
async function cargarConfiguracion() {
    try {
        const { data, error } = await _supabase.from('configuracion').select('*').single();
        if (error) throw error;
        if (data) {
            configTienda = data;
            COSTO_ENVIO = data.COSTO_ENVIO || 0;
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
            
            const estaRealmenteAbierto = configTienda.abierto ;

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

// --- NUEVA FUNCIÓN: GUARDAR PEDIDO EN TABLA Y DEVOLVER ID ---
async function guardarPedidoEnSupabase(datos) {
    try {

        const estadoInicial = (datos.metodo_pago === 'Transferencia') ? "Pendiente de Pago" : "Esperando Confirmacion";

        const { data, error } = await _supabase
            .from('pedidos')
            .insert([
                {
                    fecha: new Date().toISOString(),
                    detalle: datos.detalle,
                    cliente: datos.cliente,
                    numero: datos.telefono, // <-- AGREGAR ESTO (asegurate que la columna en Supabase se llame así)
                    monto: parseInt(datos.monto),
                    metodo_pago: datos.metodo_pago,
                    entrega: datos.entrega,
                    direccion: datos.direccion,
                    estado: estadoInicial 
                }
            ]).select();

        if (error) throw error;
        return data[0].id;
    } catch (err) {
        console.error("Error al guardar pedido:", err);
        return null;
    }
}

async function guardarItemsPedidoEnSupabase(pedidoId) {
    if (!pedidoId) return;

    for (const item of carrito) {
        const esPromo = item.tipo_item === 'promo';
        const subtotal = item.precio * item.cantidad;

        const { data: itemGuardado, error: errorItem } = await _supabase
            .from('pedido_items')
            .insert([{
                pedido_id: pedidoId,
                hamburguesa_id: esPromo ? null : item.id,
                promo_id: esPromo ? item.id : null,
                tipo_item: esPromo ? 'promo' : 'hamburguesa',
                nombre_snapshot: item.nombre_snapshot || item.nombre,
                precio_unitario: item.precio,
                cantidad: item.cantidad,
                subtotal: subtotal
            }])
            .select()
            .single();

        if (errorItem) throw errorItem;

        if (item.extras && item.extras.length > 0) {
            const extrasPayload = item.extras.map(extra => ({
                pedido_item_id: itemGuardado.id,
                extra_id: extra.id || null,
                nombre_snapshot: extra.nombre,
                precio_unitario: extra.precio,
                cantidad: (extra.cantidad || 1) * item.cantidad
            }));

            const { error: errorExtras } = await _supabase
                .from('pedido_item_extras')
                .insert(extrasPayload);

            if (errorExtras) throw errorExtras;
        }
    }
}

async function cargarProductosDesdeBD() {
    try {
        const { data, error } = await _supabase.from('hamburguesas').select('*');
        if (error) throw error;
        
        // Actualizamos la variable global 'productos' con los datos más recientes
        productos = data.map(p => ({
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
    if (!foto) return 'src/Logo.jpg';

    const nombreFoto = foto.trim();
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

    if (nombrePromo.includes('GORDITXS LIGHT')) {
        return 'src/PROMO GORDITXS LIGHT.webp';
    }

    if (nombrePromo.includes('GORDITXS')) {
        return 'src/PROMO GORDITXS.webp';
    }

    return nombreFoto ? `src/${nombreFoto}` : 'src/Fondo.jpg';
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

        promos = (promosData || []).map(promo => ({
            ...promo,
            foto: normalizarFotoPromo(promo.foto, promo.nombre),
            promo_items: promo.promo_items || []
        }));

        const { data: extrasData, error: errorExtras } = await _supabase
            .from('extras')
            .select('*')
            .eq('disponible', true);

        if (errorExtras) throw errorExtras;
        extras = extrasData || [];
    } catch (err) {
        console.error("Error cargando promos:", err);
        promos = [];
        extras = [];
    }
}
