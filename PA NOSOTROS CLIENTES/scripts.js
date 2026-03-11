let carrito = []; 
let total = 0;
let productoSeleccionado = null;
let cantidadEnDetalle = 1;
let pantallaDestinoTemporal = null;

const productos = [
    { id: 1, nombre: 'Cheddy Krueger', precio: 12500, foto: 'Cheddy Krueger.png', desc: 'Minis brioche, carne, panceta crocante, cheddar y pepinillos.', ingredientes: ['Panceta', 'Cheddar', 'Pepinillos'] },
    { id: 2, nombre: 'La Parri-llera', precio: 12500, foto: 'Parri-Llera.png', desc: 'Carne, cherrys, lechuga, cebolla asada y chimichurri de la casa.', ingredientes: ['Cherrys', 'Lechuga', 'Cebolla asada', 'Chimichurri'] },
    { id: 3, nombre: 'Veggie Smalls', precio: 12500, foto: 'Veggie Smalls.png', desc: 'Seitán empanado, cherrys confitados, lechuga y salsa Mo´ Glazed', ingredientes: ['Cherrys confitados', 'Lechuga', 'Salsa Mo Glazed'] }
];

function mostrarPantalla(idPantalla) {
    const pantallaActual = document.getElementById('menu').style.display;
    
    // Si intenta volver al inicio desde el menú con items
    if (idPantalla === 'inicio' && pantallaActual === 'block' && carrito.length > 0) {
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
        if (idPantalla === 'checkout') actualizarResumenCheckout();
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

function cargarMenu() {
    const contenedor = document.getElementById('contenedor-menu');
    if (!contenedor) return;
    contenedor.innerHTML = "";
    productos.forEach(p => {
        contenedor.innerHTML += `
            <div class="card" onclick="abrirDetalle(${p.id})">
                <img src="${p.foto}" class="img-producto" onerror="this.src='https://via.placeholder.com/150'">
                <div class="info">
                    <h3>${p.nombre}</h3>
                    <span class="desc-texto">${p.desc}</span>
                    <p>$${p.precio}</p>
                </div>
                <button class="btn-op">+</button>
            </div>`;
    });
    actualizarBarra();
}

function abrirDetalle(id) {
    productoSeleccionado = productos.find(p => p.id === id);
    if (!productoSeleccionado) return;
    cantidadEnDetalle = 1;
    const cont = document.getElementById('contenido-detalle');
    if (cont) {
        cont.innerHTML = `
            <img src="${productoSeleccionado.foto}" onerror="this.src='https://via.placeholder.com/150'">
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

function toggleCheckbox(elemento) {
    const cb = elemento.querySelector('input[type="checkbox"]');
    cb.checked = !cb.checked;
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
    
    // SUMA INTELIGENTE: Busca si ya existe el mismo item con mismos ingredientes quitados
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

    mostrarMensaje("¡Agregado!", 2000);
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

function enviarWhatsApp() {
    const nombre = document.getElementById('nombre-cliente').value.trim();
    const entrega = document.getElementById('metodo-entrega').value;
    const dir = document.getElementById('dir-cliente').value.trim();
    const pago = document.getElementById('metodo-pago').value;

    if (!nombre || (entrega === 'Delivery' && !dir)) {
        mostrarMensaje("Completá tus datos ✍️", 3000);
        return;
    }

    mostrarMensaje("✅ ¡Pedido confirmado! Serás redirigido al chat...", 4000);

    let msg = `TU PEDIDO \n\n*Tu nombre:* ${nombre}\n*Entrega:* ${entrega}\n`;
    if (entrega === 'Delivery') msg += `*Dirección:* ${dir}\n`;
    msg += `*Pago:* ${pago}\n\n*PRODUCTOS:*\n`;

    carrito.forEach(item => {
        msg += `- ${item.cantidad}x ${item.nombre}`;
        if (item.quitados.length > 0) msg += ` (SIN: ${item.quitados.join(', ').toUpperCase()})`;
        msg += `\n`;
    });
    msg += `\n*TOTAL: $${total}*\n`;

    setTimeout(() => {
        window.open(`https://wa.me/5492215383928?text=${encodeURIComponent(msg)}`);
        carrito = [];
        actualizarBarra();
        mostrarPantalla('inicio');
    }, 2500);
}

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
    const alias = "juanfran11mp";
    navigator.clipboard.writeText(alias).then(() => {
        mostrarMensaje("✅ Alias copiado", 2000);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    mostrarPantalla('inicio');
});