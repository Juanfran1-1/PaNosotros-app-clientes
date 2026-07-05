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

function obtenerImagenesFondoMenu() {
    const imagenes = productos
        .map(producto => producto.foto)
        .filter(foto => foto && !String(foto).toLowerCase().includes('logo.jpg'));

    return [...new Set(imagenes)].slice(0, 6);
}

function renderFondoDesktopMenu() {
    const imagenes = obtenerImagenesFondoMenu();

    if (imagenes.length === 0) {
        return '<div class="menu-bg-logo" aria-hidden="true"></div>';
    }

    return `
        <div class="menu-bg-carousel" aria-hidden="true">
            ${imagenes.map((foto, index) => `
                <span style="background-image: url('${foto}'); animation-delay: ${index * 6}s;"></span>
            `).join('')}
        </div>
    `;
}

function renderFooterDesktopMenu() {
    const whatsapp = normalizarNumeroWhatsapp(configTienda.whatsapp || "");
    const whatsappTexto = whatsapp ? `+${whatsapp}` : "WhatsApp no configurado";

    return `
        <footer class="menu-desktop-footer">
            <div class="menu-footer-brand">
                <img src="src/Logo.jpg" alt="Pa Nosotros">
                <div>
                    <strong>PA' NOSOTROS</strong>
                    <span>Mini burgers</span>
                </div>
            </div>
            <div class="menu-footer-links">
                ${whatsapp ? `<a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener">${whatsappTexto}</a>` : `<span>${whatsappTexto}</span>`}
                <a href="https://www.instagram.com/mminiburgers/" target="_blank" rel="noopener">@mminiburgers</a>
            </div>
            <p>Fundado por Juan Uceda. El que empuja la idea, banca el fuego y la hace crecer.</p>
        </footer>
    `;
}

function cargarMenu() {
    const contenedor = document.getElementById('contenedor-menu');
    if (!contenedor) return;

    document.querySelectorAll('#menu > .menu-bg-carousel, #menu > .menu-bg-logo').forEach(fondo => fondo.remove());
    const menu = document.getElementById('menu');
    if (menu) {
        menu.insertAdjacentHTML('afterbegin', renderFondoDesktopMenu());
        menu.insertAdjacentHTML('afterbegin', '<div class="menu-bg-logo" aria-hidden="true"></div>');
    }

    contenedor.innerHTML = "";

    // Verificar si el local está cerrado para el modo "solo lectura"
    const localCerrado = !configTienda.abierto ;
    const mostrarPromos = filtroMenu === 'todas' || filtroMenu === 'promos';
    const mostrarMinis = filtroMenu === 'todas' || filtroMenu === 'minis';
    const promosVisibles = promos.filter(promoTieneVariedadesDisponibles);

    contenedor.innerHTML += `
        <div class="menu-desktop-title">
            <img src="src/Logo.jpg" alt="Pa Nosotros">
            <div>
                <h2>Menú</h2>
                <p class="menu-subtitle">Elegí tus favoritos</p>
            </div>
        </div>
        <p class="menu-subtitle menu-subtitle-mobile">Elegí tus favoritos</p>
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
                        <img src="${promo.foto}" class="img-producto" loading="eager" decoding="async" onerror="usarImagenFallback(this, 'src/fondominis.jpeg')">
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

                    <img src="${p.foto}" class="img-producto" loading="eager" decoding="async" onerror="usarImagenFallback(this)"
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

    contenedor.innerHTML += renderFooterDesktopMenu();

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
    extraPromoSeleccionado = [];
    aclaracionPromoDetalle = '';
    renderDetallePromo();
    mostrarPantalla('detalle-producto');
}

function getPromoConfig(promo) {
    const nombre = (promo.nombre || '').toUpperCase();
    const esLight = nombre.includes('LIGHT');
    const cantidadesConfiguradas = (promo.promo_items || [])
        .map(item => Number(item.cantidad || 0))
        .filter(cantidad => cantidad > 0);
    const cantidadTotal = cantidadesConfiguradas.length > 0
        ? Math.max(...cantidadesConfiguradas)
        : (esLight ? 5 : 3);
    const maxVariedades = promo.permite_variedades
        ? Math.max(2, Number(promo.max_variedades || 2))
        : 1;

    return {
        cantidadTotal,
        maxVariedades,
        permiteExtraPapas: esLight
    };
}

function getVariedadesPromo(promo) {
    const idsPermitidos = (promo.promo_items || []).map(item => String(item.hamburguesa_id));
    return productos.filter(p => idsPermitidos.includes(String(p.id)));
}

function getExtrasPermitidosPromo(promo) {
    const extrasPermitidos = promo.extras_permitidos || [];
    return extrasPermitidos;
}

function promoTieneVariedadesDisponibles(promo) {
    return getVariedadesPromo(promo).some(p => p.disponible !== false);
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
    const extrasPermitidos = getExtrasPermitidosPromo(promo);
    const extrasElegidos = Array.isArray(extraPromoSeleccionado) ? extraPromoSeleccionado : (extraPromoSeleccionado ? [extraPromoSeleccionado] : []);
    const totalElegido = totalPromoSeleccionado();

    cont.innerHTML = `
        <div class="detalle-hero">
            <img src="${promo.foto}" loading="eager" decoding="async" onerror="usarImagenFallback(this, 'src/fondominis.jpeg')">
        </div>
        <div class="info-detalle">
            <h2>${promo.nombre}</h2>
            <p>${promo.descripcion || ''}</p>
            <div class="lista-quitar">
                <p class="detalle-section-title">
                    Elegí ${config.cantidadTotal} mini burgers ${config.maxVariedades === 1 ? 'del mismo tipo' : `combinando hasta ${config.maxVariedades} variedades`}
                </p>
                <p class="contador-promo">${totalElegido}/${config.cantidadTotal} seleccionadas</p>
                ${variedades.map(v => {
                    const cant = cantidadesPromo[v.id] || 0;
                    if (config.maxVariedades === 1) {
                        return `
                            <div class="item-check item-promo ${v.disponible === false ? 'promo-agotada' : ''}" ${v.disponible === false ? '' : `onclick="seleccionarVariedadUnicaPromo(${v.id})"`}>
                                <label>
                                    <span class="nombre-ing">${v.nombre}</span>
                                    <span class="desc-variedad-promo">${v.desc || ''}</span>
                                </label>
                                <span class="cantidad-promo">${v.disponible === false ? '-' : (cant ? config.cantidadTotal : '+')}</span>
                            </div>`;
                    }

                    return `
                        <div class="item-check item-promo ${v.disponible === false ? 'promo-agotada' : ''}">
                            <label>
                                <span class="nombre-ing">${v.nombre}</span>
                                <span class="desc-variedad-promo">${v.desc || ''}</span>
                            </label>
                            <div class="control-promo">
                                <button ${v.disponible === false ? 'disabled' : ''} onclick="ajustarCantidadPromo(${v.id}, -1)">-</button>
                                <span>${cant}</span>
                                <button ${v.disponible === false ? 'disabled' : ''} onclick="ajustarCantidadPromo(${v.id}, 1)">+</button>
                            </div>
                        </div>`;
                }).join('')}
            </div>
            ${extrasPermitidos.length > 0 ? `
                <div class="lista-quitar extra-promo-box">
                    <p class="detalle-section-title">Extras opcionales</p>
                    ${extrasPermitidos.map(extra => `
                        <label class="item-check item-extra-promo">
                            <img class="extra-promo-img" src="${extra.foto || 'src/fondominis.jpeg'}" loading="lazy" decoding="async" onerror="usarImagenFallback(this)" alt="${extra.nombre}">
                            <span class="extra-promo-info">
                                <span class="prefix">Extra</span>
                                <span class="nombre-ing">${extra.nombre}</span>
                                <span class="desc-variedad-promo">+$${extra.precio}</span>
                            </span>
                            <input type="checkbox" ${extrasElegidos.some(e => String(e.id) === String(extra.id)) ? 'checked' : ''} onchange="toggleExtraPromo(${extra.id}, this.checked)">
                        </label>
                    `).join('')}
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
    const extra = getExtrasPermitidosPromo(productoSeleccionado).find(e => String(e.id) === String(extraId));
    const seleccionados = Array.isArray(extraPromoSeleccionado) ? [...extraPromoSeleccionado] : (extraPromoSeleccionado ? [extraPromoSeleccionado] : []);

    if (checked && extra && !seleccionados.some(e => String(e.id) === String(extra.id))) {
        seleccionados.push(extra);
    }

    if (!checked) {
        extraPromoSeleccionado = seleccionados.filter(e => String(e.id) !== String(extraId));
    } else {
        extraPromoSeleccionado = seleccionados;
    }

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
                <img src="${productoSeleccionado.foto}" loading="eager" decoding="async" onerror="usarImagenFallback(this)">
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
