// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://xpvqjuqywlkrutuukrxc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdnFqdXF5d2xrcnV0dXVrcnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDQwNTMsImV4cCI6MjA4ODUyMDA1M30.6HikuOJDbY8Z-hCT-oJPau6XZJ4Bs0UErQvNRy9zDC4";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. VARIABLES GLOBALES
let carrito = []; 
let total = 0;
let productoSeleccionado = null;
let cantidadEnDetalle = 1;
let pantallaDestinoTemporal = null;
let productos = []; 

let configTienda = {
    whatsapp: "5492215383928",
    alias_mp: "juanfran11mp",
    abierto: true
};

async function cargarConfiguracion() {
    try {
        const { data, error } = await _supabase
            .from('configuracion')
            .select('*')
            .single();

        if (error) throw error;
        if (data) {
            configTienda = data;

            // --- ACTUALIZAR EL HTML DINÁMICAMENTE ---
            
            // 1. Actualizar Alias en el Checkout
            const aliasSpan = document.getElementById('alias-texto');
            if (aliasSpan) aliasSpan.innerText = configTienda.alias_mp;

            // 2. Controlar estado del local
            if (!configTienda.abierto) {
                const btnPedido = document.getElementById('btn-comenzar');
                const statusLocal = document.getElementById('status-local');
                
                if (btnPedido) {
                    btnPedido.innerText = "LOCAL CERRADO";
                    btnPedido.style.background = "#7f8c8d";
                    btnPedido.disabled = true; // Opcional: deshabilitar el botón
                }
                if (statusLocal) statusLocal.style.display = 'block';
            }

            console.log("Configuración cargada ✅");
        }
    } catch (err) {
        console.error("Error cargando configuración:", err);
    }
}

// --- NUEVA FUNCIÓN: GUARDAR PEDIDO EN TABLA Y DEVOLVER ID ---
async function guardarPedidoEnSupabase(datos) {
    try {
        const ahora = new Date();
        const fechaParaStreamlit = 
            ahora.getFullYear() + "-" + 
            String(ahora.getMonth() + 1).padStart(2, '0') + "-" + 
            String(ahora.getDate()).padStart(2, '0') + " " + 
            String(ahora.getHours()).padStart(2, '0') + ":" + 
            String(ahora.getMinutes()).padStart(2, '0') + ":" + 
            String(ahora.getSeconds()).padStart(2, '0');

        const estadoInicial = (datos.metodo_pago === 'Transferencia') ? "Pendiente de Pago" : "Cocinando";

        const { data, error } = await _supabase
            .from('pedidos')
            .insert([
                {
                    fecha: fechaParaStreamlit + "+00",
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
            .select('id, estado, fecha, metodo_pago') // Traemos tambien el metodo de pago
            .eq('id', nroPedido)
            .gt('fecha', limiteISO)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            resDiv.style.display = 'block';
            resId.innerText = data.id;

            // --- LÓGICA DE TRADUCCIÓN DE ESTADOS ---
            let estadoVisual = { txt: data.estado, color: "#95a5a6" };

            if (data.metodo_pago === "Transferencia") {
                // Flujo para Transferencia
                const estadosTransf = {
                    "Pendiente de Pago": { txt: "⏳ Esperando comprobante", color: "#e67e22" },
                    "Cocinando": { txt: "👨‍🍳 EN COCINA", color: "#3498db" },
                    "Terminado": { txt: "✅ ¡LISTO!", color: "#2ecc71" },
                    "Rechazado": { txt: "❌ CANCELADO", color: "#e74c3c" }
                };
                estadoVisual = estadosTransf[data.estado] || estadoVisual;
            } else {
                // Flujo para Efectivo (u otros)
                const estadosEfectivo = {
                    // Si en la base dice 'Pendiente de Pago' pero es Efectivo, el cliente ve 'En Cocina'
                    "Pendiente de Pago": { txt: "✅ ¡LISTO!", color: "#2ecc71" }, 
                    "Cocinando": { txt: "👨‍🍳 EN COCINA", color: "#3498db" },
                    "Terminado": { txt: "✅ ¡LISTO!", color: "#2ecc71" },
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

// 3. CARGA DE DATOS DESDE SUPABASE
async function cargarProductosDesdeBD() {
    try {
        const { data, error } = await _supabase.from('hamburguesas').select('*');
        if (error) throw error;
        
        productos = data.map(p => ({
            ...p,
            foto: p.foto ? `src/${p.foto}` : 'src/Logo.jpg', 
            desc: p.desc || 'Combo de 5 mini burgers + papas noisette.',
            ingredientes: p.ingredientes ? p.ingredientes.split(',').map(i => i.trim()) : ['Cheddar', 'Panceta', 'Pepinillos']
        }));

        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
        
    } catch (err) {
        console.error("Error cargando base de datos:", err);
        mostrarMensaje("Error al cargar el menú ❌", 5000);
    }
}

// 4. FUNCIONES DE NAVEGACIÓN
function mostrarPantalla(idPantalla) {
    const pantallaMenu = document.getElementById('menu');
    const pantallaActualVisible = pantallaMenu && pantallaMenu.style.display === 'block';

    if (idPantalla === 'inicio' && pantallaActualVisible && carrito.length > 0) {
        pantallaDestinoTemporal = idPantalla;
        document.getElementById('modal-confirmacion').style.display = 'flex';
        return;
    }
    ejecutarCambioPantalla(idPantalla);
}

function ejecutarCambioPantalla(idPantalla) {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';

    setTimeout(() => {
        document.querySelectorAll('section').forEach(s => s.style.display = 'none');
        const target = document.getElementById(idPantalla);
        if (target) {
            target.style.display = (idPantalla === 'inicio') ? 'flex' : 'block';
        }
        if (idPantalla === 'menu') cargarMenu();
        
        if (idPantalla === 'checkout') {
            actualizarResumenCheckout();
            toggleDir();
            togglePago(); 
        }

        if (loader) loader.style.display = 'none';
        window.scrollTo(0, 0);
    }, 300);
}

function cerrarConfirmacion(acepta) {
    document.getElementById('modal-confirmacion').style.display = 'none';
    if (acepta) {
        carrito = [];
        actualizarBarra();
        ejecutarCambioPantalla(pantallaDestinoTemporal);
    }
    pantallaDestinoTemporal = null;
}

// 5. CARGAR MENÚ
function cargarMenu() {
    const contenedor = document.getElementById('contenedor-menu');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    productos.forEach(p => {
        // Determinamos si está agotado
        const estaAgotado = (p.disponible === false);

        contenedor.innerHTML += `
            <div class="card ${estaAgotado ? 'agotado' : ''}" 
                onclick="${estaAgotado ? "mostrarMensaje('¡Sin stock por hoy! 🍔')" : `abrirDetalle(${p.id})`}">
                
                <img src="${p.foto}" class="img-producto" onerror="this.src='Logo.jpg'" 
                    style="${estaAgotado ? 'filter: grayscale(1); opacity: 0.5;' : ''}">
                
                <div class="info">
                    <h3 style="${estaAgotado ? 'color: #888;' : ''}">
                        ${p.nombre} ${estaAgotado ? '<span class="tag-agotado">(AGOTADO)</span>' : ''}
                    </h3>
                    <span class="desc-texto">${p.desc}</span>
                    <p>${estaAgotado ? '---' : '$' + p.precio}</p>
                </div>
                
                <button class="btn-op" style="${estaAgotado ? 'background: #ccc; cursor: not-allowed;' : ''}">
                    ${estaAgotado ? '✕' : '+'}
                </button>
            </div>`;
    });
    actualizarBarra();
}

// 6. DETALLE DE PRODUCTO
function abrirDetalle(id) {
    productoSeleccionado = productos.find(p => p.id === id);
    if (!productoSeleccionado) return;
    cantidadEnDetalle = 1;
    const cont = document.getElementById('contenido-detalle');
    if (cont) {
        cont.innerHTML = `
            <img src="${productoSeleccionado.foto}" onerror="this.src='Logo.jpg'">
            <div class="info-detalle">
                <h2>${productoSeleccionado.nombre}</h2>
                <p style="color: #666; font-size: 0.9rem;">${productoSeleccionado.desc}</p>
                <div class="lista-quitar">
                    <p style="font-weight: bold; margin-bottom: 10px; font-size: 0.85rem; color: #333;">¿QUITAR INGREDIENTES?</p>
                    ${productoSeleccionado.ingredientes.map(ing => `
                        <div class="item-check" onclick="toggleCheckbox(this)">
                            <label><span class="prefix">Sin</span><span class="nombre-ing">${ing}</span></label>
                            <input type="checkbox" class="check-quitar" value="${ing}" onclick="event.stopPropagation()">
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }
    actualizarFooterDetalle();
    mostrarPantalla('detalle-producto');
}

// 7. LÓGICA DE CARRITO
function toggleCheckbox(elemento) {
    const cb = elemento.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = !cb.checked;
}

function cambiarCantDetalle(delta) {
    cantidadEnDetalle = Math.max(1, cantidadEnDetalle + delta);
    actualizarFooterDetalle();
}

function actualizarFooterDetalle() {
    const cantElem = document.getElementById('cantidad-detalle');
    const subElem = document.getElementById('subtotal-detalle');
    if (cantElem) cantElem.innerText = cantidadEnDetalle;
    if (subElem) subElem.innerText = (productoSeleccionado.precio * cantidadEnDetalle);
}

function agregarAlCarritoDesdeDetalle() {
    const quitados = Array.from(document.querySelectorAll('.check-quitar:checked')).map(el => el.value);
    
    const itemExistente = carrito.find(item => 
        item.nombre === productoSeleccionado.nombre && 
        JSON.stringify(item.quitados.sort()) === JSON.stringify(quitados.sort())
    );

    if (itemExistente) {
        itemExistente.cantidad += cantidadEnDetalle;
    } else {
        carrito.push({
            nombre: productoSeleccionado.nombre,
            precio: productoSeleccionado.precio,
            cantidad: cantidadEnDetalle,
            quitados: quitados
        });
    }

    mostrarMensaje("¡Agregado!", 500);
    mostrarPantalla('menu');
}

function actualizarBarra() {
    let n = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const btnCarrito = document.getElementById('btn-flotante-carrito');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    if (n > 0) {
        if (btnCarrito) btnCarrito.style.display = 'flex';
        if (cartCount) cartCount.innerText = n;
        if (cartTotal) cartTotal.innerText = total;
    } else {
        if (btnCarrito) btnCarrito.style.display = 'none';
    }
}

function actualizarResumenCheckout() {
    const contenedor = document.getElementById('resumen-pedido');
    if (!contenedor) return;
    contenedor.innerHTML = "<strong>Resumen:</strong><br><br>";
    carrito.forEach((item, index) => {
        let detalleQuitados = item.quitados.length > 0 ? `<br><small style="color: #d35400;">SIN: ${item.quitados.join(', ')}</small>` : "";
        contenedor.innerHTML += `
            <div style="background: white; padding: 12px; border-radius: 12px; margin-bottom: 10px; border: 1px solid #eee; text-align: left; position: relative; color: #333;">
                <button onclick="eliminarDelCarrito(${index})" style="position:absolute; right:10px; top:10px; border:none; background:none; color:gray; font-size:1.2rem;">✕</button>
                <strong>${item.cantidad}x ${item.nombre}</strong> - $${item.precio * item.cantidad}
                ${detalleQuitados}
            </div>`;
    });
    contenedor.innerHTML += `<h3 style="color:#333">TOTAL: $${total}</h3>`;
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarResumenCheckout();
    actualizarBarra();
    if (carrito.length === 0) mostrarPantalla('menu');
}

// 8. ENVÍO A WHATSAPP Y GUARDADO EN BD
async function enviarWhatsApp() {
    // 1. Validar si el local está abierto (Dato de la nueva tabla)
    if (!configTienda.abierto) {
        mostrarMensaje("El local está cerrado en este momento 😴", 4000);
        return;
    }

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
        if (item.quitados && item.quitados.length > 0) {
            texto += ` (SIN: ${item.quitados.join(', ').toUpperCase()})`;
        }
        return texto;
    }).join(' | ');

    try {
        // Guardamos y obtenemos el ID
        const idGenerado = await guardarPedidoEnSupabase({
            cliente: nombre,
            telefono: telefono, // <-- NUEVO
            detalle: detalleBD,
            monto: total,
            metodo_pago: pago,
            entrega: entrega,
            direccion: entrega === 'Delivery' ? dir : 'Retira en local'
        });
        let msgconfir = "✅ ¡Pedido confirmado!";
        if (pago === 'Transferencia') {
            // Usamos saltos de línea para que no quede todo junto
            msgconfir = "✅ ¡Pedido registrado!\n\n⚠️ RECUERDA:\nConsultá disponibilidad de stock\nantes de transferir.";
        }
        mostrarMensaje(msgconfir, 5000);

        let msg = `🍔 *PEDIDO #${idGenerado || 'N/A'}* 🍔\n\n`;
        msg += `*Tu nombre:* ${nombre}\n*Entrega:* ${entrega}\n`;
        if (entrega === 'Delivery') msg += `*Dirección:* ${dir}\n`;
        msg += `*Pago:* ${pago}\n\n*PRODUCTOS:*\n`;

        carrito.forEach(item => {
            msg += `- ${item.cantidad}x ${item.nombre}`;
            if (item.quitados.length > 0) msg += ` (SIN: ${item.quitados.join(', ').toUpperCase()})`;
            msg += `\n`;
        });
        msg += `\n*TOTAL: $${total}*\n\n`;
        if (pago === 'Transferencia') msg += `Recorda preguntar por la disponibilidad del stock antes de enviar el comprobante \n`;
        msg += `Podes consultar el estado de tu pedido con el número *#${idGenerado}* en nuestra web.`;

        setTimeout(() => {
            // 2. Usar el número de WhatsApp dinámico de la tabla configuracion
            const wspUrl = `https://wa.me/${configTienda.whatsapp}?text=${encodeURIComponent(msg)}`;
            
            carrito = [];
            actualizarBarra();
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

// FUNCIONES AUXILIARES
function mostrarMensaje(texto, duracion = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = texto;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duracion);
}

function irAlCheckout() { mostrarPantalla('checkout'); }
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
        mostrarMensaje("✅ Alias copiado", 2000);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await cargarConfiguracion(); 
    cargarProductosDesdeBD();
    mostrarPantalla('inicio');
    toggleDir(); 
});