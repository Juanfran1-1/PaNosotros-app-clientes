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
    if (subElem) {
        const precioExtra = productoSeleccionado && productoSeleccionado.tipo_item === 'promo' && extraPromoSeleccionado
            ? Number(extraPromoSeleccionado.precio)
            : 0;
        subElem.innerText = ((Number(productoSeleccionado.precio) + precioExtra) * cantidadEnDetalle);
    }
}

function agregarAlCarritoDesdeDetalle() {
    if (productoSeleccionado && productoSeleccionado.tipo_item === 'promo') {
        agregarPromoAlCarritoDesdeDetalle();
        return;
    }

    const quitados = Array.from(document.querySelectorAll('.check-quitar:checked')).map(el => el.value);
    
    // Agregamos el ID a la búsqueda para no duplicar items iguales
    const itemExistente = carrito.find(item => 
        item.tipo_item === 'hamburguesa' &&
        item.id === productoSeleccionado.id &&
        JSON.stringify([...(item.quitados || [])].sort()) === JSON.stringify([...quitados].sort())
    );

    if (itemExistente) {
        itemExistente.cantidad += cantidadEnDetalle;
    } else {
        carrito.push({
            id: productoSeleccionado.id, 
            tipo_item: 'hamburguesa',
            nombre: productoSeleccionado.nombre,
            precio: productoSeleccionado.precio,
            cantidad: cantidadEnDetalle,
            quitados: quitados
        });
    }

    mostrarMensaje("¡Agregado!", 1000);
    guardarCarritoEnLocalStorage()
    mostrarPantalla('menu');
}

function agregarPromoAlCarritoDesdeDetalle() {
    const promo = productoSeleccionado;
    const config = getPromoConfig(promo);
    const totalElegido = totalPromoSeleccionado();

    if (totalElegido !== config.cantidadTotal) {
        mostrarMensaje(`Tenés que elegir ${config.cantidadTotal} mini burgers`, 3000);
        return;
    }

    const variedadesElegidas = Object.entries(cantidadesPromo).map(([id, cant]) => {
        const producto = productos.find(p => String(p.id) === String(id));
        return {
            id: Number(id),
            nombre: producto ? producto.nombre : `Variedad ${id}`,
            cantidad: cant
        };
    }).filter(v => v.cantidad > 0);

    const extrasItem = extraPromoSeleccionado ? [{
        id: extraPromoSeleccionado.id,
        nombre: extraPromoSeleccionado.nombre,
        precio: Number(extraPromoSeleccionado.precio),
        cantidad: 1
    }] : [];
    const aclaracionPromo = (document.getElementById('aclaracion-promo')?.value || aclaracionPromoDetalle || '').trim();

    const detalleLineas = variedadesElegidas.map(v => `${v.cantidad} ${v.nombre}`);
    if ((promo.nombre || '').toUpperCase().includes('GORDITXS') && !(promo.nombre || '').toUpperCase().includes('LIGHT')) {
        detalleLineas.push('Incluye papas noisette');
    }
    extrasItem.forEach(extra => detalleLineas.push(`+ ${extra.nombre}`));
    if (aclaracionPromo) {
        detalleLineas.push(`Aclaración: ${aclaracionPromo}`);
    }

    const precioFinal = Number(promo.precio) + extrasItem.reduce((acc, extra) => acc + (extra.precio * extra.cantidad), 0);
    const firma = JSON.stringify({ promo_id: promo.id, variedades: variedadesElegidas, extras: extrasItem, aclaracion: aclaracionPromo });

    const itemExistente = carrito.find(item => item.tipo_item === 'promo' && item.firma === firma);
    if (itemExistente) {
        itemExistente.cantidad += cantidadEnDetalle;
    } else {
        carrito.push({
            id: promo.id,
            tipo_item: 'promo',
            nombre: promo.nombre,
            nombre_snapshot: `${promo.nombre} - ${detalleLineas.join(' | ')}`,
            precio: precioFinal,
            cantidad: cantidadEnDetalle,
            variedades: variedadesElegidas,
            extras: extrasItem,
            aclaracion: aclaracionPromo,
            detalleLineas,
            firma
        });
    }

    mostrarMensaje("Promo agregada", 1200);
    guardarCarritoEnLocalStorage();
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

    // Obtenemos el método de entrega (por defecto Delivery si no hay nada)
    const selectorEntrega = document.getElementById('metodo-entrega');
    const metodoEntrega = selectorEntrega ? selectorEntrega.value : "Delivery";
    
    contenedor.innerHTML = `
        <div class="checkout-summary-head">
            <span>Cantidad</span>
            <strong>${carrito.reduce((acc, item) => acc + item.cantidad, 0)}</strong>
        </div>
    `;
    
    // Calculamos subtotal base
    let subtotalProductos = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    carrito.forEach((item, index) => {
        let detalleQuitados = item.quitados && item.quitados.length > 0
            ? `<small>SIN: ${item.quitados.join(', ')}</small>`
            : "";
        if (item.detalleLineas && item.detalleLineas.length > 0) {
            detalleQuitados += `<small>${item.detalleLineas.join(' | ')}</small>`;
        }

        contenedor.innerHTML += `
            <div class="checkout-item">
                <button class="checkout-remove" onclick="eliminarDelCarrito(${index})" aria-label="Eliminar ${item.nombre}">✕</button>
                <div class="checkout-item-main">
                    <strong>${item.nombre}</strong>
                    ${detalleQuitados ? `<div class="checkout-item-detail">${detalleQuitados}</div>` : ''}
                </div>
                <div class="checkout-item-side">
                    <span>$${item.precio * item.cantidad}</span>
                    <div class="checkout-qty">
                        <button onclick="cambiarCantidadCarrito(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                        <button onclick="cambiarCantidadCarrito(${index}, 1)">+</button>
                    </div>
                </div>
            </div>`;
    });

    const totalCalculado = metodoEntrega === "Delivery"
        ? subtotalProductos + COSTO_ENVIO
        : subtotalProductos;
    const estaEnPasoPedido = document.getElementById('checkout-step-pedido')?.style.display !== 'none';
    total = totalCalculado; // Actualizamos la variable global
    contenedor.innerHTML += `
        <div class="checkout-totals">
            ${estaEnPasoPedido ? `
                <h3><span>Subtotal</span><strong>$${subtotalProductos}</strong></h3>
            ` : `
                <p><span>Subtotal</span><strong>$${subtotalProductos}</strong></p>
                ${metodoEntrega === "Delivery" ? `<p><span>Envío</span><strong>$${COSTO_ENVIO}</strong></p>` : ''}
                <h3><span>Total</span><strong>$${total}</strong></h3>
            `}
        </div>
    `;
}

// ESTA FUNCIÓN ES LA QUE HACE QUE LOS BOTONES FUNCIONEN
function cambiarCantidadCarrito(index, delta) {
    if (carrito[index].cantidad + delta > 0) {
        // Sumamos o restamos
        carrito[index].cantidad += delta;
    } else {
        // Si llega a cero, borramos el producto
        carrito.splice(index, 1);
    }
    
    // Recalcular el total global
    total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    // Actualizar visualmente y guardar
    actualizarResumenCheckout();
    guardarCarritoEnLocalStorage();
    actualizarBarra(); // Actualiza el circulito del carrito si existe

    // Si borró todo, lo mandamos al menú
    if (carrito.length === 0) {
        mostrarPantalla('menu');
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    guardarCarritoEnLocalStorage()
    actualizarResumenCheckout();
    actualizarBarra();
    if (carrito.length === 0) mostrarPantalla('menu');
}
