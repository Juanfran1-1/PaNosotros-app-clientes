// 5. CARGAR MENÚ
// En cargarMenu, hacemos que las tarjetas no abran el detalle si está cerrado
function cambiarFiltroMenu(filtro) {
    filtroMenu = filtro;
    cargarMenu();
}

function renderFiltroMenu(nombre, filtro) {
    return `
        <button type="button" class="${filtroMenu === filtro ? 'active' : ''}" onclick="cambiarFiltroMenu('${filtro}')">
            ${nombre}
        </button>`;
}

function cargarMenu() {
    const contenedor = document.getElementById('contenedor-menu');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    // Verificar si el local está cerrado para el modo "solo lectura"
    const localCerrado = !configTienda.abierto ;
    const mostrarPromos = filtroMenu === 'todas' || filtroMenu === 'promos';
    const mostrarMinis = filtroMenu === 'todas' || filtroMenu === 'minis';
    const promosVisibles = promos.filter(promoTieneVariedadesDisponibles);

    contenedor.innerHTML += `
        <p class="menu-subtitle">Elegí tus favoritos</p>
        <div class="menu-tabs" aria-label="Categorías del menú">
            ${renderFiltroMenu('Todas', 'todas')}
            ${renderFiltroMenu('Minis', 'minis')}
            ${renderFiltroMenu('Promos', 'promos')}
        </div>
    `;

    if (mostrarPromos && promosVisibles.length > 0) {
        contenedor.innerHTML += `
            <h3 class="titulo-promos">Promos destacadas</h3>
            ${promosVisibles.map(promo => {
                const accionPromo = localCerrado
                    ? "mostrarMensaje('El local está cerrado.', 3000)"
                    : `abrirDetallePromo(${promo.id})`;

                return `
                    <div class="card card-promo menu-card" onclick="${accionPromo}">
                        <img src="${promo.foto}" class="img-producto" onerror="this.src='src/Fondo.jpg'">
                        <div class="info">
                            <span class="menu-card-tag">Promo</span>
                            <h3>${promo.nombre}</h3>
                            <span class="desc-texto">${promo.descripcion || 'Promo especial.'}</span>
                            <p>$${promo.precio}</p>
                        </div>
                        <button class="btn-op">+</button>
                    </div>`;
            }).join('')}
        `;
    }

    if (mostrarMinis) {
        contenedor.innerHTML += `
            <h3 class="titulo-promos">${filtroMenu === 'minis' ? 'Mini burgers' : 'MINIS'}</h3>
        `;
        contenedor.innerHTML += `
            <div id="menu-combo-note" class="menu-combo-note">
                <p>
                    Cada combo contiene 5 mini burgers con papas noisette
                </p>
            </div>
        `;

        productos.forEach(p => {
            const estaAgotado = (p.disponible === false);

            // Lógica de click
            let accionClick = `abrirDetalle(${p.id})`;
            if (localCerrado) {
                // Si está cerrado, solo mostramos el mensaje pero no abrimos el detalle
                accionClick = "mostrarMensaje('El local está cerrado.', 3000)";
            } else if (estaAgotado) {
                accionClick = "mostrarMensaje('¡Sin stock por hoy! 🍔')";
            }

            contenedor.innerHTML += `
                <div class="card menu-card ${estaAgotado ? 'agotado' : ''}" onclick="${accionClick}">

                    <img src="${p.foto}" class="img-producto" onerror="this.src='src/Logo.jpg'"
                        style="${estaAgotado ? 'filter: grayscale(1); opacity: 0.5;' : ''}">

                    <div class="info">
                        <h3>
                            ${p.nombre} ${estaAgotado ? '<span class="tag-agotado">(AGOTADO)</span>' : ''}
                        </h3>
                        <span class="desc-texto">${p.desc}</span>
                        <p>${estaAgotado ? '---' : '$' + p.precio}</p>
                    </div>

                    <button class="btn-op" style="${estaAgotado ? 'background: #ccc; cursor: not-allowed;' : ''}">
                        ${localCerrado ? '-' : (estaAgotado ? '✕' : '+')}
                    </button>
                </div>`;
        });
    }

    if (filtroMenu === 'promos' && promosVisibles.length === 0) {
        contenedor.innerHTML += `
            <div class="menu-empty">
                <h3>No hay promos activas</h3>
            </div>
        `;
    }

    // Ocultar el botón flotante del carrito si el local está cerrado
    const btnCarrito = document.getElementById('btn-flotante-carrito');
    if (localCerrado) {
        if (btnCarrito) btnCarrito.style.display = 'none';
    } else {
        actualizarBarra();
    }
}

// 6. DETALLE DE PRODUCTO
function abrirDetallePromo(id) {
    productoSeleccionado = promos.find(p => p.id === id);
    if (!productoSeleccionado) return;

    productoSeleccionado.tipo_item = 'promo';
    cantidadEnDetalle = 1;
    cantidadesPromo = {};
    extraPromoSeleccionado = null;
    aclaracionPromoDetalle = '';
    renderDetallePromo();
    mostrarPantalla('detalle-producto');
}

function getPromoConfig(promo) {
    const nombre = (promo.nombre || '').toUpperCase();
    const esLight = nombre.includes('LIGHT');
    const cantidadTotal = esLight ? 5 : 3;
    return {
        cantidadTotal,
        maxVariedades: esLight ? 2 : 1,
        permiteExtraPapas: esLight
    };
}

function getVariedadesPromo(promo) {
    const idsPermitidos = (promo.promo_items || []).map(item => String(item.hamburguesa_id));
    return productos.filter(p => p.disponible !== false && idsPermitidos.includes(String(p.id)));
}

function promoTieneVariedadesDisponibles(promo) {
    return getVariedadesPromo(promo).length > 0;
}

function totalPromoSeleccionado() {
    return Object.values(cantidadesPromo).reduce((acc, cant) => acc + cant, 0);
}

function renderDetallePromo() {
    const cont = document.getElementById('contenido-detalle');
    if (!cont) return;

    const promo = productoSeleccionado;
    const config = getPromoConfig(promo);
    const variedades = getVariedadesPromo(promo);
    const papas = extras.find(e => (e.nombre || '').toLowerCase().includes('papa'));
    const totalElegido = totalPromoSeleccionado();

    cont.innerHTML = `
        <div class="detalle-hero">
            <img src="${promo.foto}" onerror="this.src='src/Fondo.jpg'">
        </div>
        <div class="info-detalle">
            <h2>${promo.nombre}</h2>
            <p>${promo.descripcion || ''}</p>
            <div class="lista-quitar">
                <p class="detalle-section-title">
                    Elegí ${config.cantidadTotal} mini burgers ${config.maxVariedades === 1 ? 'del mismo tipo' : 'combinando hasta 2 variedades'}
                </p>
                <p class="contador-promo">${totalElegido}/${config.cantidadTotal} seleccionadas</p>
                ${variedades.map(v => {
                    const cant = cantidadesPromo[v.id] || 0;
                    if (config.maxVariedades === 1) {
                        return `
                            <div class="item-check item-promo" onclick="seleccionarVariedadUnicaPromo(${v.id})">
                                <label>
                                    <span class="nombre-ing">${v.nombre}</span>
                                    <span class="desc-variedad-promo">${v.desc || ''}</span>
                                </label>
                                <span class="cantidad-promo">${cant ? config.cantidadTotal : '+'}</span>
                            </div>`;
                    }

                    return `
                        <div class="item-check item-promo">
                            <label>
                                <span class="nombre-ing">${v.nombre}</span>
                                <span class="desc-variedad-promo">${v.desc || ''}</span>
                            </label>
                            <div class="control-promo">
                                <button onclick="ajustarCantidadPromo(${v.id}, -1)">-</button>
                                <span>${cant}</span>
                                <button onclick="ajustarCantidadPromo(${v.id}, 1)">+</button>
                            </div>
                        </div>`;
                }).join('')}
            </div>
            ${config.permiteExtraPapas && papas ? `
                <div class="lista-quitar extra-promo-box">
                    <label class="item-check">
                        <span>
                            <span class="prefix">Extra</span>
                            <span class="nombre-ing">${papas.nombre} (+$${papas.precio})</span>
                        </span>
                        <input type="checkbox" ${extraPromoSeleccionado ? 'checked' : ''} onchange="toggleExtraPromo(${papas.id}, this.checked)">
                    </label>
                </div>
            ` : ''}
            <div class="lista-quitar promo-aclaracion-box">
                <label for="aclaracion-promo" class="detalle-section-title">Aclaración</label>
                <textarea id="aclaracion-promo" maxlength="180" placeholder="Ej: sin cebolla, sin salsa, una sin tomate..." oninput="actualizarAclaracionPromo(this.value)">${aclaracionPromoDetalle}</textarea>
            </div>
        </div>`;

    actualizarFooterDetalle();
}

function seleccionarVariedadUnicaPromo(id) {
    const config = getPromoConfig(productoSeleccionado);
    cantidadesPromo = { [id]: config.cantidadTotal };
    renderDetallePromo();
}

function ajustarCantidadPromo(id, delta) {
    const config = getPromoConfig(productoSeleccionado);
    const copia = { ...cantidadesPromo };
    const nuevaCantidad = Math.max(0, (copia[id] || 0) + delta);

    if (nuevaCantidad === 0) {
        delete copia[id];
    } else {
        copia[id] = nuevaCantidad;
    }

    const variedadesUsadas = Object.values(copia).filter(cant => cant > 0).length;
    const totalNuevo = Object.values(copia).reduce((acc, cant) => acc + cant, 0);

    if (variedadesUsadas > config.maxVariedades) {
        mostrarMensaje(`Solo podés combinar ${config.maxVariedades} variedades`, 2500);
        return;
    }

    if (totalNuevo > config.cantidadTotal) {
        mostrarMensaje(`La promo incluye ${config.cantidadTotal} mini burgers`, 2500);
        return;
    }

    cantidadesPromo = copia;
    renderDetallePromo();
}

function toggleExtraPromo(extraId, checked) {
    const extra = extras.find(e => e.id === extraId);
    extraPromoSeleccionado = checked && extra ? extra : null;
    actualizarFooterDetalle();
}

function actualizarAclaracionPromo(valor) {
    aclaracionPromoDetalle = valor;
}

function abrirDetalle(id) {
    productoSeleccionado = productos.find(p => p.id === id);
    if (!productoSeleccionado) return;
    cantidadEnDetalle = 1;
    const cont = document.getElementById('contenido-detalle');
    if (cont) {
        cont.innerHTML = `
            <div class="detalle-hero">
                <img src="${productoSeleccionado.foto}" onerror="this.src='src/Logo.jpg'">
            </div>
            <div class="info-detalle">
                <h2>${productoSeleccionado.nombre}</h2>
                <p>${productoSeleccionado.desc}</p>
                <div class="lista-quitar">
                    <p class="detalle-section-title">Personalizá tu burger</p>
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
