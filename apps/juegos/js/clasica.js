// ===== CRUD DE JUEGOS =====

async function guardarJuego() {
    const tipoPosesionRadio = document.querySelector('input[name="tipoPosesion"]:checked');
        
    const juego = {
        id: editandoId !== null ? editandoId : Date.now(),
        nombre: nombre.value.trim(),
        plataforma: plataforma.value,
        imagenData: imagenTemporal || null,
        precio: precio.value ? parseFloat(precio.value) : null,
        rutaPersonalizada: document.getElementById('rutaPersonalizada')?.value?.trim() || null
    };

    if (esAdmin) {
        try {
            const esEdicion = editandoId !== null;
            if (esEdicion) {
                const juegoAnterior = juegosCompartidos.find(j => j.id === editandoId);
                if (juegoAnterior && !imagenTemporal) {
                    juego.imagenData = juegoAnterior.imagenData;
                }
            }
            
            const datos = await apiGuardarJuego(juego, esEdicion);
            
            if (datos.ok) {
                juegosCompartidos = datos.juegos;
                const index = juegosCompartidos.findIndex(j => j.id === juego.id);
                if (index !== -1) {
                    juegosCompartidos[index] = juego;
                }
            }

            // Guardar logros (admin)
            const logrosInputs = document.querySelectorAll('.logro-item');
            const logros = [];
            logrosInputs.forEach(item => {
                const nombreLogro = item.querySelector('.logro-nombre').value.trim();
                const descripcionLogro = item.querySelector('.logro-descripcion').value.trim();
                if (nombreLogro) {
                    logros.push({ 
                        id: Date.now() + Math.random(), 
                        nombre: nombreLogro,
                        descripcion: descripcionLogro || ''
                    });
                }
            });
            if (logros.length > 0) {
                logrosJuegos[juego.id] = logros;
                await guardarLogrosServidor(juego.id);
            }
        } catch (error) {
            alert('Error al guardar juego en el servidor');
            return;
        }
        editandoId = null;
    }

    const nuevosLogrosConseguidos = estadoUsuario[juego.id]?.logrosConseguidos || [];
    
    estadoUsuario[juego.id] = {
        dificultad: dificultad.value,
        progreso: progreso.value,
        loTengo: loTengo.checked,
        tipoPosesion: loTengo.checked && tipoPosesionRadio ? tipoPosesionRadio.value : null,
        logrosConseguidos: nuevosLogrosConseguidos
    };

    await guardarEstadoServidor();
    window.dispatchEvent(new Event('actualizarContadores'));

    cambiarPestanaClasica('biblioteca');
    formJuego.reset();
    imagenTemporal = null;

    // Resetear elementos de forma segura
    const tipoPosesion = document.getElementById('tipoPosesionDiv');
    if (tipoPosesion) tipoPosesion.style.display = 'none';

    const precioDiv = document.getElementById('precioDiv');
    if (precioDiv) precioDiv.style.display = 'none';

    const seccionLogros = document.getElementById('seccionLogrosAdmin');
    if (seccionLogros) seccionLogros.style.display = 'none';

    const listaLogros = document.getElementById('listaLogrosAdmin');
    if (listaLogros) listaLogros.innerHTML = '';

    mostrarJuegos();
}

async function eliminarJuego(id) {
    if (!esAdmin) {
        alert('Solo los administradores pueden eliminar juegos');
        return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este juego? Se eliminará para todos los usuarios.')) {
        try {
            await apiEliminarJuego(id);
            juegosCompartidos = juegosCompartidos.filter(j => j.id !== id);
            delete estadoUsuario[id];
            delete logrosJuegos[id];
            await guardarEstadoServidor();
            window.dispatchEvent(new Event('actualizarContadores'));
            mostrarJuegos();
        } catch (error) {
            alert('Error al eliminar juego');
        }
    }
}

function editarJuego(id) {
    const juego = juegosCompartidos.find(j => j.id === id);
    if (!juego) return;

    cambiarPestanaClasica('agregar');
    
    setTimeout(() => {
        editandoId = juego.id;
        imagenTemporal = juego.imagenData || null;
        
        document.getElementById('juegoId').value = juego.id;
        document.getElementById('nombre').value = juego.nombre;
        document.getElementById('plataforma').value = juego.plataforma;
        
        const estado = estadoUsuario[juego.id] || {};
        document.getElementById('dificultad').value = estado.dificultad || 'Normal';
        document.getElementById('progreso').value = estado.progreso || 'Pendiente';
        document.getElementById('loTengo').checked = estado.loTengo || false;
        document.getElementById('precio').value = juego.precio || '';
        document.getElementById('rutaPersonalizada').value = juego.rutaPersonalizada || '';
        
        if (juego.imagenData) {
            document.getElementById('previewImagen').innerHTML = `<img src="${juego.imagenData}" style="max-width:200px;">`;
        }
        
        if (estado.loTengo) {
            document.getElementById('tipoPosesionDiv').style.display = 'block';
            const radio = document.querySelector(`input[name="tipoPosesion"][value="${estado.tipoPosesion}"]`);
            if (radio) radio.checked = true;
        } else {
            document.getElementById('precioDiv').style.display = 'block';
        }
        
        // Logros del admin
        if (esAdmin) {
            document.getElementById('seccionLogrosAdmin').style.display = 'block';
            const listaLogrosAdmin = document.getElementById('listaLogrosAdmin');
            listaLogrosAdmin.innerHTML = '';
            const logros = logrosJuegos[juego.id] || [];
            logros.forEach(logro => {
                const div = document.createElement('div');
                div.className = 'logro-item';
                div.style.cssText = 'display:flex;gap:8px;margin-top:8px;align-items:flex-start;flex-wrap:wrap;padding:10px;background:#0d0d1a;border-radius:8px;';
                div.innerHTML = `
                    <div style="flex:1;min-width:150px;">
                        <input type="text" class="logro-nombre" value="${logro.nombre}" style="width:100%;padding:8px;border:1px solid #333;border-radius:6px;background:#1a1a2e;color:#eee;margin-bottom:4px;">
                        <input type="text" class="logro-descripcion" value="${logro.descripcion||''}" placeholder="Descripción (opcional)" style="width:100%;padding:8px;border:1px solid #333;border-radius:6px;background:#1a1a2e;color:#aaa;font-size:13px;">
                    </div>
                    <button type="button" class="btn-quitar-logro" style="background:#e94560;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">✕</button>
                `;
                div.querySelector('.btn-quitar-logro').addEventListener('click', () => div.remove());
                listaLogrosAdmin.appendChild(div);
            });
        }
    }, 300);
}

// ===== INTERFAZ DE USUARIO =====

function crearBannerPlataforma(plataformaJuego, colorTexto, juegoId, opcionesPosesion) {
    return `
        <span class="bannerPlataformaText tag-clickeable" 
              style="color:${colorTexto || '#fff'};cursor:pointer;font-weight:bold;font-size:11px;text-transform:uppercase;"
              onclick="event.stopPropagation();toggleMiniMenu(event, ${juegoId}, ${JSON.stringify(opcionesPosesion).replace(/"/g, '&quot;')}, 'loTengo')">
            ${plataformaJuego}
        </span>`;
}

function crearImagenJuego(juego, colorTexto, juegoId, opcionesPosesion) {
    const nombreArchivo = obtenerNombreArchivo(juego.nombre);
    const tieneLogros = logrosJuegos[juego.id] && logrosJuegos[juego.id].length > 0;
    const cursorStyle = tieneLogros ? 'cursor: pointer;' : '';
    const onclickAttr = tieneLogros ? `onclick="abrirModalLogros(${juego.id})"` : '';
    const colorBanner = colorTexto || '#fff';
    const ops = opcionesPosesion || [];
    
    if (juego.imagenData) {
        return `
            <div class="contenedorImagen" ${onclickAttr} style="${cursorStyle}">
                ${crearBannerPlataforma(juego.plataforma, colorBanner, juegoId, ops)}
                <div class="wrapperImagen">
                    <img src="${juego.imagenData}" alt="${juego.nombre}" class="imagenJuego" loading="lazy">
                </div>
            </div>`;
    }
    
    return `
        <div class="contenedorImagen" ${onclickAttr} style="${cursorStyle}">
            ${crearBannerPlataforma(juego.plataforma, colorBanner, juegoId, ops)}
            <div class="wrapperImagen">
            <img src="imagenes/${nombreArchivo}.png" 
                alt="${juego.nombre}" 
                class="imagenJuego"
                loading="lazy"
                onerror="
                    if(this.src.endsWith('.png')) {
                        this.src='imagenes/${nombreArchivo}.jpg';
                    } else if(this.src.endsWith('.jpg')) {
                        this.src='imagenes/${nombreArchivo}.jpeg';
                    } else if(this.src.endsWith('.jpeg')) {
                        this.src='imagenes/${nombreArchivo}.webp';
                    } else {
                        this.onerror=null;
                        this.style.display='none';
                        this.parentElement.innerHTML='<div class=\\'sinImagen\\'>🎮</div>';
                    }
                ">
            </div>
        </div>`;
}

function mostrarJuegos() {
    const plataformaFiltro = document.getElementById('filtroPlataforma').value;
    const estadoFiltro = document.getElementById('filtroEstado').value;
    const busqueda = document.getElementById('buscador')?.value?.toLowerCase() || '';
    const orden = document.getElementById('ordenar')?.value || 'nombre-asc';

    let juegosFiltrados = juegosCompartidos;

    if (busqueda) {
        juegosFiltrados = juegosFiltrados.filter(j => 
            j.nombre.toLowerCase().includes(busqueda)
        );
    }

    if (plataformaFiltro) {
        juegosFiltrados = juegosFiltrados.filter(j => j.plataforma === plataformaFiltro);
    }

    if (estadoFiltro === 'si') {
        juegosFiltrados = juegosFiltrados.filter(j => {
            const estado = estadoUsuario[j.id];
            return estado && estado.loTengo === true;
        });
    } else if (estadoFiltro === 'no') {
        juegosFiltrados = juegosFiltrados.filter(j => {
            const estado = estadoUsuario[j.id];
            return !estado || estado.loTengo !== true;
        });
    } else if (estadoFiltro && estadoFiltro !== '') {
        juegosFiltrados = juegosFiltrados.filter(j => {
            const estado = estadoUsuario[j.id];
            const progresoFiltro = estadoFiltro.charAt(0).toUpperCase() + estadoFiltro.slice(1);
            return estado && estado.progreso === progresoFiltro;
        });
    }

    juegosFiltrados.sort((a, b) => {
        switch (orden) {
            case 'nombre-asc':
                return a.nombre.localeCompare(b.nombre);
            case 'nombre-desc':
                return b.nombre.localeCompare(a.nombre);
            case 'plataforma':
                return a.plataforma.localeCompare(b.plataforma);
            case 'progreso':
                const progA = estadoUsuario[a.id]?.progreso || 'Pendiente';
                const progB = estadoUsuario[b.id]?.progreso || 'Pendiente';
                const ordenProg = { 'Platino': 5, 'Completado': 4, 'Jugando': 3, 'Pendiente': 2, 'Abandonado': 1 };
                return (ordenProg[progB] || 0) - (ordenProg[progA] || 0);
            default:
                return 0;
        }
    });

    gridJuegos.innerHTML = '';

    if (juegosFiltrados.length === 0) {
        gridJuegos.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #888;">
                <p style="font-size: 48px; margin-bottom: 15px;">🎮</p>
                <p style="font-size: 18px;">No hay juegos para mostrar</p>
                <p style="font-size: 14px;">${esAdmin ? 'Haz clic en "+ Agregar" para añadir juegos' : 'Espera a que un administrador añada juegos'}</p>
            </div>
        `;
        return;
    }

    const coloresDificultad = { 'Fácil': '#4ecca3', 'Normal': '#f0a500', 'Difícil': '#e67e22', 'Muy Difícil': '#e94560' };

    juegosFiltrados.forEach(juego => {
        const tarjeta = document.createElement('div');
        const estado = estadoUsuario[juego.id] || {};
        
        const dificultadActual = estado.dificultad || 'Normal';
        const progresoActual = estado.progreso || 'Pendiente';
        
        tarjeta.className = `tarjetaJuego ${estado.loTengo ? 'loTengo' : ''}`;
        tarjeta.style.borderColor = coloresDificultad[dificultadActual] || '#4ecca3';
        
        let colorBanner;
        if (estado.loTengo) {
            colorBanner = estado.tipoPosesion === 'fisico' ? '#4ecca3' : '#3498db';
        } else {
            colorBanner = '#e94560';
        }
        
        const totalLogros = logrosJuegos[juego.id] ? logrosJuegos[juego.id].length : 0;
        const logrosConseguidos = estado.logrosConseguidos ? estado.logrosConseguidos.length : 0;
        
        const juegoIdStr = juego.id;
        
        const opcionesProgreso = [
            { texto: '📅 Pendiente', valor: 'Pendiente' },
            { texto: '🎮 Jugando', valor: 'Jugando' },
            { texto: '✅ Completado', valor: 'Completado' },
            { texto: '🏆 Platino', valor: 'Platino' },
            { texto: '❌ Abandonado', valor: 'Abandonado' }
        ];
        
        let opcionesPosesion;
        if (estado.loTengo) {
            opcionesPosesion = [
                { texto: '💿 Físico', valor: 'fisico' },
                { texto: '📥 Digital', valor: 'digital' },
                { texto: '❌ No lo tengo', valor: 'no' }
            ];
        } else {
            opcionesPosesion = [
                { texto: '💿 Físico', valor: 'fisico' },
                { texto: '📥 Digital', valor: 'digital' },
                { texto: '💰 Añadir precio', valor: 'precio' }
            ];
        }
        
        const botonEliminar = esAdmin 
            ? `<button class="btnEliminar" onclick="eliminarJuego(${juego.id})" title="Eliminar">🗑️</button>`
            : '';
        
        const botonEditar = esAdmin 
            ? `<button class="btnEditar" onclick="editarJuego(${juego.id})" title="Editar">✏️</button>`
            : '';
        
        let tagsHTML = '';
        if (juego.precio && !estado.loTengo) {
            tagsHTML += `<span class="tag-clickeable precioTag">💰 ${juego.precio.toFixed(2)}€</span>`;
        }
        if (totalLogros > 0) {
            tagsHTML += `
                <span class="tag-clickeable logrosTag" onclick="abrirModalLogros(${juegoIdStr})">
                    🏆 ${logrosConseguidos}/${totalLogros}
                </span>
            `;
        }
        
        tarjeta.innerHTML = `
            ${crearImagenJuego(juego, colorBanner, juego.id, opcionesPosesion)}
            <div class="infoJuego">
                <h3 class="nombreJuego" style="display:flex;justify-content:space-between;align-items:center;width:100%;">
                    <span style="flex:1;min-width:0;">${juego.nombre}</span>
                </h3>
                <div class="tagsJuego">${tagsHTML}</div>
                <div class="acciones">
                    <span id="btn-accion-${juego.id}"></span>
                    ${botonEditar}
                    ${botonEliminar}
                </div>
            </div>
        `;
        
        gridJuegos.appendChild(tarjeta);
        
        setTimeout(() => {
            const wrapper = tarjeta.querySelector('.wrapperImagen');
            if (wrapper) {
                const icono = document.createElement('div');
                icono.className = 'indicador-progreso-img tag-clickeable';
                icono.style.background = COLOR_PROGRESO[progresoActual];
                icono.style.color = '#1a1a2e';
                icono.title = progresoActual;
                icono.innerHTML = ICONO_PROGRESO[progresoActual];
                icono.style.cursor = 'pointer';
                const opsProg = [...opcionesProgreso];
                const jId = juego.id;
                icono.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleMiniMenu(e, jId, opsProg, 'progreso');
                });
                wrapper.appendChild(icono);
            }
        }, 0);
        
        cargarEstadoBotones(juego.id);
    });

    // Asegurar que el scroll llegue hasta el final
    setTimeout(() => {
        if (gridJuegos) {
            // Añadir espacio extra después de cargar los juegos
            const spacer = document.createElement('div');
            spacer.style.cssText = 'grid-column:1/-1;height:60px;width:100%;';
            spacer.className = 'grid-spacer';
            
            // Eliminar spacer anterior si existe
            const oldSpacer = gridJuegos.querySelector('.grid-spacer');
            if (oldSpacer) oldSpacer.remove();
            
            gridJuegos.appendChild(spacer);
        }
    }, 200);
}

// ===== VERIFICACIÓN DE ROM EN LOTE =====
let colaVerificacion = [];
let verificando = false;

function cargarEstadoBotones(juegoId) {
    colaVerificacion.push(juegoId);
    if (!verificando) procesarCola();
}

async function procesarCola() {
    verificando = true;
    
    while (colaVerificacion.length > 0) {
        const lote = colaVerificacion.splice(0, 5);
        
        await Promise.all(lote.map(async (juegoId) => {
            try {
                const res = await fetch('/api/verificar-rom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ juegoId })
                });
                const datos = await res.json();
                
                const btnSpan = document.getElementById(`btn-accion-${juegoId}`);
                if (!btnSpan) return;

                const juego = juegosCompartidos.find(j => j.id === juegoId);
                const tieneRuta = juego && juego.rutaPersonalizada && juego.rutaPersonalizada.trim() !== '';

                if (datos.existeLocal || tieneRuta) {
                    if (document.getElementById(`ring-${juegoId}`)) {
                        const btn = document.getElementById(`btn-accion-${juegoId}`);
                        if (btn) btn.innerHTML = '';
                        return;
                    }
                    
                    const btn = document.getElementById(`btn-accion-${juegoId}`);
                    if (btn) btn.innerHTML = '';
                    
                    setTimeout(() => {
                        const tarjeta = document.getElementById(`btn-accion-${juegoId}`)?.closest('.tarjetaJuego');
                        const nombreH3 = tarjeta?.querySelector('.nombreJuego');
                        if (nombreH3 && !nombreH3.querySelector('.btn-descargar-ring')) {
                            const span = document.createElement('span');
                            span.style.cssText = 'margin-left:6px;flex-shrink:0;';
                            span.innerHTML = `
                                <div class="btn-descargar-ring" id="ring-${juegoId}" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;position:relative;width:24px;height:24px;vertical-align:middle;" title="Jugar">
                                    <span style="font-size:18px;">🎮</span>
                                </div>`;
                            nombreH3.appendChild(span);
                            
                            const ringDiv = document.getElementById(`ring-${juegoId}`);
                            if (ringDiv) {
                                ringDiv.onclick = function(e) { 
                                    e.stopPropagation(); 
                                    fetch('/api/juego-en-ejecucion')
                                        .then(r => r.json())
                                        .then(data => {
                                            const estaJugando = data.juegos && data.juegos.includes(juegoId);
                                            if (estaJugando) {
                                                detenerJuego(juegoId);
                                            } else {
                                                jugarJuego(juegoId);
                                            }
                                        });
                                };
                            }
                        }
                    }, 100);
                    
                } else if (datos.existeUSB && !tieneRuta) {
                    if (!estadoUsuario[juegoId]) estadoUsuario[juegoId] = {};
                    if (!estadoUsuario[juegoId].loTengo) {
                        estadoUsuario[juegoId].loTengo = true;
                        estadoUsuario[juegoId].tipoPosesion = 'digital';
                        guardarEstadoServidor();
                        window.dispatchEvent(new Event('actualizarContadores'));
                        mostrarJuegos();
                    }
                    btnSpan.innerHTML = '';
                    setTimeout(() => {
                        const tarjeta = document.getElementById(`btn-accion-${juegoId}`)?.closest('.tarjetaJuego');
                        const nombreH3 = tarjeta?.querySelector('.nombreJuego');
                        if (nombreH3 && !nombreH3.querySelector('.btn-descargar-ring')) {
                            const span = document.createElement('span');
                            span.style.cssText = 'margin-left:6px;flex-shrink:0;';
                            span.innerHTML = `
                                <div class="btn-descargar-ring" onclick="descargarJuego(${juegoId})" id="ring-${juegoId}" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;position:relative;width:24px;height:24px;vertical-align:middle;" title="Descargar">
                                    <svg width="24" height="24" viewBox="0 0 32 32">
                                        <circle cx="16" cy="16" r="14" fill="none" stroke="#333" stroke-width="2"/>
                                        <circle cx="16" cy="16" r="14" fill="none" stroke="#3498db" stroke-width="2" stroke-dasharray="88" stroke-dashoffset="88" id="ring-circle-${juegoId}" transform="rotate(-90 16 16)" style="transition: stroke-dashoffset 0.3s;"/>
                                    </svg>
                                    <span id="ring-texto-${juegoId}" style="position:absolute;font-size:7px;color:#fff;">📥</span>
                                </div>`;
                            nombreH3.appendChild(span);
                        }
                    }, 100);
                } else {
                    btnSpan.innerHTML = '';
                }
            } catch (e) {}
        }));
        
        await new Promise(r => setTimeout(r, 50));
    }
    
    verificando = false;
}

function actualizarTarjetaJuego(juegoId) {
    const tarjeta = document.querySelector(`.tarjetaJuego [id="btn-accion-${juegoId}"]`)?.closest('.tarjetaJuego');
    if (!tarjeta) {
        mostrarJuegos();
        return;
    }
    
    const juego = juegosCompartidos.find(j => j.id === juegoId);
    const estado = estadoUsuario[juegoId] || {};
    if (!juego) return;
    
    const progresoActual = estado.progreso || 'Pendiente';
    const dificultadActual = estado.dificultad || 'Normal';
    const coloresDificultad = { 'Fácil': '#4ecca3', 'Normal': '#f0a500', 'Difícil': '#e67e22', 'Muy Difícil': '#e94560' };
    
    tarjeta.style.borderColor = coloresDificultad[dificultadActual] || '#4ecca3';
    
    let colorBanner;
    if (estado.loTengo) {
        colorBanner = estado.tipoPosesion === 'fisico' ? '#4ecca3' : '#3498db';
    } else {
        colorBanner = '#e94560';
    }
    const bannerText = tarjeta.querySelector('.bannerPlataformaText');
    if (bannerText) bannerText.style.color = colorBanner;
    
    const iconoProg = tarjeta.querySelector('.indicador-progreso-img');
    if (iconoProg) {
        iconoProg.style.background = COLOR_PROGRESO[progresoActual];
        iconoProg.innerHTML = ICONO_PROGRESO[progresoActual];
        iconoProg.title = progresoActual;
    }
    
    const tagsJuego = tarjeta.querySelector('.tagsJuego');
    if (tagsJuego) {
        let tagsHTML = '';
        if (juego.precio && !estado.loTengo) {
            tagsHTML += `<span class="tag-clickeable precioTag">💰 ${juego.precio.toFixed(2)}€</span>`;
        }
        const totalLogros = logrosJuegos[juegoId] ? logrosJuegos[juegoId].length : 0;
        const logrosConseguidos = estado.logrosConseguidos ? estado.logrosConseguidos.length : 0;
        if (totalLogros > 0) {
            tagsHTML += `<span class="tag-clickeable logrosTag" onclick="abrirModalLogros(${juegoId})">🏆 ${logrosConseguidos}/${totalLogros}</span>`;
        }
        tagsJuego.innerHTML = tagsHTML;
    }
}

function aplicarFiltroSinRecargar() {
    const estadoFiltro = document.getElementById('filtroEstado').value;
    const plataformaFiltro = document.getElementById('filtroPlataforma').value;
    const busqueda = document.getElementById('buscador')?.value?.toLowerCase() || '';
    
    const tarjetas = document.querySelectorAll('.tarjetaJuego');
    
    tarjetas.forEach(tarjeta => {
        const btnAccion = tarjeta.querySelector('[id^="btn-accion-"]');
        if (!btnAccion) { tarjeta.style.display = 'none'; return; }
        
        const juegoId = parseInt(btnAccion.id.replace('btn-accion-', ''));
        const juego = juegosCompartidos.find(j => j.id === juegoId);
        const estado = estadoUsuario[juegoId] || {};
        
        let visible = true;
        
        if (busqueda && juego && !juego.nombre.toLowerCase().includes(busqueda)) {
            visible = false;
        }
        
        if (plataformaFiltro && juego && juego.plataforma !== plataformaFiltro) {
            visible = false;
        }
        
        if (estadoFiltro === 'si') {
            visible = estado.loTengo === true;
        } else if (estadoFiltro === 'no') {
            visible = !estado.loTengo;
        } else if (estadoFiltro && estadoFiltro !== '') {
            const progresoFiltro = estadoFiltro.charAt(0).toUpperCase() + estadoFiltro.slice(1);
            visible = estado.progreso === progresoFiltro;
        }
        
        tarjeta.style.display = visible ? '' : 'none';
    });
}

// ===== APP PRINCIPAL =====
let pestanaActual = 'biblioteca';

async function cambiarEstadoJuego(juegoId, campo, valor) {
    if (!estadoUsuario[juegoId]) {
        estadoUsuario[juegoId] = {};
    }
    
    // Convertir valores correctamente
    if (campo === 'loTengo') {
        // Si viene como string 'no' o booleano false, convertirlo a false
        estadoUsuario[juegoId][campo] = (valor === true || valor === 'true' || valor === 'fisico' || valor === 'digital');
    } else if (campo === 'tipoPosesion' && valor === 'no') {
        estadoUsuario[juegoId].loTengo = false;
        estadoUsuario[juegoId].tipoPosesion = null;
        await guardarEstadoServidor();
        window.dispatchEvent(new Event('actualizarContadores'));
        mostrarJuegos();
        return;
    } else {
        estadoUsuario[juegoId][campo] = valor;
    }
    
    if (campo === 'loTengo' && estadoUsuario[juegoId][campo] === true) {
        delete estadoUsuario[juegoId].precio;
    }
    
    await guardarEstadoServidor();
    window.dispatchEvent(new Event('actualizarContadores'));
    mostrarJuegos();
}

async function cambiarPrecioJuego(juegoId) {
    if (!esAdmin) {
        alert('Solo el administrador puede cambiar el precio');
        return;
    }
    
    const juego = juegosCompartidos.find(j => j.id === juegoId);
    const precioActual = juego?.precio || '';
    const nuevoPrecio = prompt('💰 Introduce el precio:', precioActual);
    
    if (nuevoPrecio !== null) {
        const precioNum = parseFloat(nuevoPrecio);
        if (!isNaN(precioNum) && precioNum >= 0) {
            juego.precio = precioNum;
            await fetch(`/api/juegos/${juegoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: usuarioActual, juego: juego })
            });
            mostrarJuegos();
        } else if (nuevoPrecio === '') {
            juego.precio = null;
            await fetch(`/api/juegos/${juegoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: usuarioActual, juego: juego })
            });
            mostrarJuegos();
        }
    }
}

function toggleMiniMenu(e, juegoId, opciones, campo) {
    e.stopPropagation();

    const btn = e.target.closest('.tag-clickeable');
    if (!btn) return;

    const menuExistente = document.querySelector('.mini-menu');
    if (menuExistente && btn.classList.contains('mini-menu-activo')) {
        menuExistente.remove();
        btn.classList.remove('mini-menu-activo');
        return;
    }

    document.querySelectorAll('.mini-menu').forEach(m => m.remove());
    document.querySelectorAll('.mini-menu-activo').forEach(el => el.classList.remove('mini-menu-activo'));

    btn.classList.add('mini-menu-activo');

    const menu = document.createElement('div');
    menu.className = 'mini-menu';
    menu.style.cssText = `
        position: fixed;
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 10px;
        padding: 6px;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        min-width: 130px;
    `;

opciones.forEach(op => {
    const item = document.createElement('div');
    item.className = 'mini-menu-item';
    item.textContent = op.texto;
    item.style.cssText = `padding: 10px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; color: #ccc; transition: background 0.2s; white-space: nowrap;`;
    item.addEventListener('mouseenter', () => item.style.background = '#0f3460');
    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
    item.addEventListener('click', async (ev) => {  // ← Añade async aquí
        ev.stopPropagation();
        if (op.valor === 'precio') { menu.remove(); btn.classList.remove('mini-menu-activo'); cambiarPrecioJuego(juegoId); }
else if (campo === 'tipoPosesion' && op.valor === 'no') {
    cambiarEstadoJuego(juegoId, 'tipoPosesion', 'no');
    menu.remove();
    btn.classList.remove('mini-menu-activo');
}
else if (campo === 'loTengo' && (op.valor === 'fisico' || op.valor === 'digital')) {
    if (!estadoUsuario[juegoId]) estadoUsuario[juegoId] = {};
    estadoUsuario[juegoId].loTengo = true;
    estadoUsuario[juegoId].tipoPosesion = op.valor;
    
    await guardarEstadoServidor();
    
    // Recargar estado desde el servidor para asegurar
    const res = await fetch(`/api/estado/${usuarioActual}`, { cache: 'no-store' });
    const estadoActualizado = await res.json();
    Object.assign(estadoUsuario, estadoActualizado);
    
    cambiarPestanaClasica('biblioteca');
    menu.remove();
    btn.classList.remove('mini-menu-activo');
}
        else { 
            await cambiarEstadoJuego(juegoId, campo, op.valor); 
            menu.remove(); 
            btn.classList.remove('mini-menu-activo');
            mostrarJuegos();  // ← Recargar la vista también para progreso
        }
    });
    menu.appendChild(item);
});

    document.body.appendChild(menu);

    const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
    const rect = btn.getBoundingClientRect();

    let left = rect.left / zoom;
    let top  = (rect.bottom / zoom) + 4;

    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';

    requestAnimationFrame(() => {
        const menuRect = menu.getBoundingClientRect();
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        if (menuRect.bottom > vh) {
            menu.style.top = ((rect.top / zoom) - (menuRect.height / zoom) - 4) + 'px';
        }
        if (menuRect.right > vw) {
            menu.style.left = ((rect.right / zoom) - (menuRect.width / zoom)) + 'px';
        }
    });
}

// Eventos de filtros
document.getElementById('buscador').addEventListener('input', mostrarJuegos);
document.getElementById('ordenar').addEventListener('change', mostrarJuegos);
document.getElementById('filtroPlataforma').addEventListener('change', mostrarJuegos);
document.getElementById('filtroEstado').addEventListener('change', mostrarJuegos);

function cambiarPestanaClasica(pestana) {
    pestanaActual = pestana;
    
    const mc = document.getElementById('mainContent');
    mc.scrollTop = 0;
    
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('activo'));
    
    const grid = document.getElementById('gridJuegos');
    grid.style.display = 'none';
    grid.innerHTML = '';
    document.getElementById('topbar').classList.add('oculto');
    
    ['panelAdmin','panelEmuladores','panelAgregar','panelOpciones'].forEach(id => {
        const p = document.getElementById(id);
        p.style.display = 'none';
    });
    
if (pestana === 'biblioteca' || pestana === 'tienda') {
    grid.style.display = 'grid';
    document.getElementById('topbar').classList.remove('oculto');
    document.getElementById('filtroEstado').value = pestana === 'biblioteca' ? 'si' : 'no';
    mostrarJuegos();
        links[pestana === 'biblioteca' ? 0 : 1].classList.add('activo');
    } else {
        const mapa = {
            'agregar': ['panelAgregar', cargarPanelAgregar, 3],
            'admin': ['panelAdmin', cargarPanelAdmin, 4],
            'emuladores': ['panelEmuladores', cargarPanelEmuladores, 5],
            'opciones': ['panelOpciones', cargarPanelOpciones, -1]
        };
        const [id, fn, idx] = mapa[pestana];
        const panel = document.getElementById(id);
        // Mover panel al principio del main-content
        mc.insertBefore(panel, mc.firstChild);
        panel.style.display = 'block';
        fn();
        if (idx >= 0) links[idx].classList.add('activo');
    }
}

function cargarPanelAgregar() {
    const panel = document.getElementById('panelAgregar');
    panel.innerHTML = `
        <div style="max-width:520px;margin:0 auto;padding:20px 10px;">

            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <div style="width:36px;height:36px;background:rgba(233,69,96,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">➕</div>
                <h2 style="color:#fff;font-size:18px;margin:0;">Agregar Nuevo Juego</h2>
            </div>
            <form id="formJuego" style="display:flex;flex-direction:column;gap:10px;">
                <input type="hidden" id="juegoId">
                
                <div style="display:flex;align-items:center;gap:8px;background:#111;border-radius:12px;padding:12px 16px;border:1px solid #1a1a2e;">
                    <span style="font-size:20px;">🎮</span>
                    <input type="text" id="nombre" required placeholder="Nombre del juego" style="flex:1;padding:10px 0;border:none;background:transparent;color:#fff;font-size:16px;outline:none;">
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <select id="plataforma" required style="background:#111;border:1px solid #1a1a2e;border-radius:10px;padding:12px;color:#fff;font-size:13px;">
                        <option value="">🎮 Plataforma</option>
                        <option value="GBA">GBA</option><option value="DS">DS</option><option value="3DS">3DS</option>
                        <option value="PSP">PSP</option><option value="PS2">PS2</option><option value="PS3">PS3</option>
                        <option value="PS4">PS4</option><option value="PS5">PS5</option>
                        <option value="Switch">Switch</option><option value="Switch 2">Switch 2</option>
                        <option value="WII">WII</option><option value="PC">PC</option>
                    </select>
                    <select id="dificultad" style="background:#111;border:1px solid #1a1a2e;border-radius:10px;padding:12px;color:#fff;font-size:13px;">
                        <option value="Fácil">🟢 Fácil</option><option value="Normal">🟡 Normal</option><option value="Difícil">🟠 Difícil</option><option value="Muy Difícil">🔴 Muy Difícil</option>
                    </select>
                    <select id="progreso" style="background:#111;border:1px solid #1a1a2e;border-radius:10px;padding:12px;color:#fff;font-size:13px;">
                        <option value="Pendiente">📅 Pendiente</option><option value="Jugando">🎮 Jugando</option><option value="Completado">✅ Completado</option><option value="Platino">🏆 Platino</option><option value="Abandonado">❌ Abandonado</option>
                    </select>
                    <input type="date" id="fechaLanzamiento" placeholder="📅 Lanzamiento" style="background:#111;border:1px solid #1a1a2e;border-radius:10px;padding:12px;color:#fff;font-size:13px;">
                </div>
                
                <div style="display:flex;gap:8px;">
                    <label style="flex:1;background:#111;border:1px solid #1a1a2e;border-radius:10px;padding:14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                        <span style="color:#ccc;font-size:13px;">¿Lo tienes?</span>
                        <input type="checkbox" id="loTengo" style="width:20px;height:20px;accent-color:#4ecca3;">
                    </label>
                    <div style="flex:1;background:#111;border:1px solid rgba(240,165,0,0.2);border-radius:10px;padding:10px;display:flex;align-items:center;gap:8px;">
                        <span style="color:#f0a500;font-size:18px;">💰</span>
                        <input type="number" id="precio" placeholder="19.99€" step="0.01" min="0" style="flex:1;padding:8px 0;border:none;background:transparent;color:#f0a500;font-size:18px;font-weight:bold;text-align:center;outline:none;">
                    </div>
                </div>
                
                <div id="tipoPosesionDiv" style="display:none;background:#111;border:1px solid rgba(78,204,163,0.2);border-radius:10px;padding:14px;">
                    <div style="display:flex;gap:16px;justify-content:center;">
                        <label style="display:flex;align-items:center;gap:6px;color:#ccc;font-size:14px;cursor:pointer;padding:10px 16px;background:rgba(255,255,255,0.02);border-radius:8px;"><input type="radio" name="tipoPosesion" value="fisico"><span>💿 Físico</span></label>
                        <label style="display:flex;align-items:center;gap:6px;color:#ccc;font-size:14px;cursor:pointer;padding:10px 16px;background:rgba(255,255,255,0.02);border-radius:8px;"><input type="radio" name="tipoPosesion" value="digital"><span>📥 Digital</span></label>
                    </div>
                </div>
                
                <div style="background:#111;border:1px solid rgba(52,152,219,0.2);border-radius:10px;padding:12px;display:flex;align-items:center;gap:8px;">
                    <span style="color:#3498db;font-size:16px;">🔗</span>
                    <input type="text" id="rutaPersonalizada" placeholder="Ruta del .exe (PC)" style="flex:1;padding:8px 0;border:none;background:transparent;color:#3498db;font-size:13px;outline:none;">
                </div>
                
                <div id="seccionLogrosAdmin" style="background:#111;border:1px solid #1a1a2e;border-radius:10px;padding:12px;max-height:140px;overflow-y:auto;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="color:#f0a500;font-size:14px;">🏆 Logros</span>
                        <input type="text" id="busquedaLogros" placeholder="🔍 Buscar..." style="flex:1;padding:6px 10px;border:1px solid #1a1a2e;border-radius:6px;background:#0a0a14;color:#eee;font-size:11px;outline:none;" oninput="filtrarLogros()">
                        <button type="button" id="btnAgregarLogro" style="background:#f0a500;color:#000;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:11px;white-space:nowrap;">+ Añadir</button>
                    </div>
                    <div id="listaLogrosAdmin"></div>
                </div>
                
                <div style="display:flex;gap:10px;margin-top:4px;">
                    <button type="submit" style="flex:1;padding:14px;background:#e94560;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;">💾 Guardar juego</button>
                    <button type="button" onclick="cambiarPestanaClasica('biblioteca')" style="padding:14px 20px;background:transparent;color:#888;border:1px solid #1a1a2e;border-radius:12px;font-size:14px;cursor:pointer;">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('loTengo').addEventListener('change', function() {
        document.getElementById('tipoPosesionDiv').style.display = this.checked ? 'block' : 'none';
    });
    
    document.getElementById('btnAgregarLogro').onclick = function() {
        const lista = document.getElementById('listaLogrosAdmin');
        if (!lista) return;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;gap:6px;margin-top:6px;align-items:center;padding:8px 10px;background:#0a0a14;border-radius:8px;';
        div.innerHTML = `
            <div style="flex:1;">
                <input type="text" class="logro-nombre" placeholder="Nombre" style="width:100%;padding:5px 8px;border:1px solid #1a1a2e;border-radius:4px;background:#000;color:#eee;font-size:11px;margin-bottom:4px;">
                <input type="text" class="logro-descripcion" placeholder="Descripción" style="width:100%;padding:5px 8px;border:1px solid #1a1a2e;border-radius:4px;background:#000;color:#888;font-size:10px;">
            </div>
            <button type="button" class="btn-quitar-logro" style="background:#e94560;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:10px;">✕</button>
        `;
        div.querySelector('.btn-quitar-logro').onclick = function() { div.remove(); };
        lista.appendChild(div);
    };
}

async function quitarAdmin(usuario) {
    if (!confirm('¿Quitar admin a ' + usuario + '?')) return;
    await fetch('/api/usuarios/quitar-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioActual, usuarioObjetivo: usuario })
    });
    cargarPanelAdmin();
}

async function cargarPanelAdmin() {
    const panel = document.getElementById('panelAdmin');
    panel.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">Cargando...</p>';
    try {
        const res = await fetch('/api/usuarios?usuario=' + usuarioActual);
        const datos = await res.json();
        if (!datos.ok) { panel.innerHTML = '<p style="color:#e94560;">' + datos.error + '</p>'; return; }
        
        let html = `
            <div style="max-width:550px;margin:0 auto;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                    <div style="width:36px;height:36px;background:rgba(240,165,0,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">👥</div>
                    <h2 style="color:#fff;font-size:18px;margin:0;">Gestión de Usuarios</h2>
                </div>
                <div style="display:grid;gap:8px;">`;
        
        datos.usuarios.forEach(u => {
            html += `
                <div style="background:#111;border:1px solid #1a1a2e;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:32px;height:32px;background:${u.admin ? 'rgba(240,165,0,0.15)' : 'rgba(78,204,163,0.1)'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;">${u.admin ? '👑' : '👤'}</div>
                        <div>
                            <div style="color:#fff;font-size:13px;font-weight:600;">${u.usuario}</div>
                            <div style="color:#888;font-size:10px;">${u.admin ? 'Administrador' : 'Usuario'} · ${new Date(u.fechaCreacion).toLocaleDateString('es-ES')}</div>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="cambiarPasswordAdmin('${u.usuario}')" style="background:rgba(240,165,0,0.1);color:#f0a500;border:1px solid rgba(240,165,0,0.2);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">🔒</button> ${u.admin ? `<button onclick="quitarAdmin('${u.usuario}')" style="background:rgba(233,69,96,0.1);color:#e94560;border:1px solid rgba(233,69,96,0.2);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">⬇️</button>` : `<button onclick="hacerAdmin('${u.usuario}')" style="background:rgba(240,165,0,0.1);color:#f0a500;border:1px solid rgba(240,165,0,0.2);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">👑</button>`}
                        ${!u.admin ? `<button onclick="eliminarUsuarioAdmin('${u.usuario}')" style="background:rgba(233,69,96,0.1);color:#e94560;border:1px solid rgba(233,69,96,0.2);padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">🗑️</button>` : ''}
                    </div>
                </div>`;
        });
        html += '</div></div>';
        panel.innerHTML = html;
    } catch(e) { panel.innerHTML = '<p style="color:#e94560;">Error al cargar</p>'; }
}

async function cargarPanelEmuladores() {
    const panel = document.getElementById('panelEmuladores');
    panel.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">Cargando...</p>';
    try {
        const res = await fetch('/api/emuladores');
        const config = await res.json();
        const plataformas = ['GBA', 'DS', '3DS', 'PSP', 'PS2', 'PS3', 'PS4', 'WII'];
        const iconos = { 'GBA': '🟣', 'DS': '⚪', '3DS': '🔴', 'PSP': '🔵', 'PS2': '⚫', 'PS3': '🔵', 'PS4': '🔵', 'WII': '⚪' };
        const colores = { 'GBA': '#6f42c1', 'DS': '#999', '3DS': '#d32f2f', 'PSP': '#4a90d9', 'PS2': '#333', 'PS3': '#003791', 'PS4': '#003087', 'WII': '#0099cc' };
        
        let html = `
            <div style="max-width:580px;margin:0 auto;padding:10px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                    <div style="width:36px;height:36px;background:rgba(78,204,163,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">⚡</div>
                    <h2 style="color:#fff;font-size:18px;margin:0;">Configurar Emuladores</h2>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
        
        plataformas.forEach(p => {
            html += `
                <div style="background:${colores[p]}10;border:1px solid ${colores[p]}30;border-radius:12px;padding:14px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span style="font-size:20px;">${iconos[p]}</span>
                        <span style="color:#fff;font-weight:600;font-size:13px;">${p}</span>
                    </div>
                    <input type="text" id="rom_${p}" value="${config['rom_' + p] || ''}" placeholder="Carpeta de ROMs..." style="width:100%;padding:8px;background:rgba(0,0,0,0.3);border:1px solid ${colores[p]}20;border-radius:8px;color:#ccc;font-size:11px;outline:none;">
                </div>`;
        });
        
        html += `
                </div>
                <button onclick="guardarEmuladores()" style="width:100%;padding:14px;background:linear-gradient(135deg,#4ecca3,#2ecc71);color:#000;border:none;border-radius:12px;cursor:pointer;font-weight:bold;margin-top:14px;font-size:14px;">💾 Guardar configuración</button>
            </div>`;
        
        panel.innerHTML = html;
    } catch(e) { panel.innerHTML = '<p style="color:#e94560;">Error al cargar</p>'; }
}

async function guardarEmuladores() {
    const plataformas = ['GBA', 'DS', '3DS', 'PSP', 'PS2', 'PS3', 'PS4', 'PS5', 'Switch', 'Switch 2', 'WII', 'PC'];
    const config = {};
    plataformas.forEach(p => { const valor = document.getElementById('rom_' + p)?.value; if (valor) config['rom_' + p] = valor; });
    await fetch('/api/emuladores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: usuarioActual, emuladores: config }) });
    alert('✅ Configuración guardada');
}

async function cambiarPasswordAdmin(usuario) {
    const nueva = prompt('Nueva contraseña para ' + usuario);
    if (!nueva) return;
    await fetch('/api/usuarios/cambiar-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: usuarioActual, usuarioObjetivo: usuario, nuevaPassword: nueva }) });
    alert('✅ Contraseña actualizada');
}

async function hacerAdmin(usuario) {
    if (!confirm('¿Hacer admin a ' + usuario + '?')) return;
    await fetch('/api/usuarios/hacer-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioActual, usuarioObjetivo: usuario })
    });
    cargarPanelAdmin();
}

async function eliminarUsuarioAdmin(usuario) {
    if (!confirm('¿Eliminar a ' + usuario + '?')) return;
    await fetch('/api/usuarios/' + usuario, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: usuarioActual }) });
    cargarPanelAdmin();
}

async function cargarDatosIniciales() {
    try {
        juegosCompartidos = await apiCargarJuegos();
        estadoUsuario = await apiCargarEstado();
        logrosJuegos = await apiCargarLogros();
    } catch (error) {}
    
    // Forzar filtro de Biblioteca: solo juegos que tienes
    document.getElementById('filtroEstado').value = 'si';
    document.getElementById('filtroPlataforma').value = '';
    document.getElementById('buscador').value = '';
    
    pestanaActual = 'biblioteca';
    const links = document.querySelectorAll('.sidebar-link');
    links.forEach(l => l.classList.remove('activo'));
    if (links[0]) links[0].classList.add('activo');
    
    mostrarJuegos();
}

document.addEventListener('submit', function(e) {
    if (e.target.id === 'formJuego') {
        e.preventDefault();
        guardarJuego();
    }
});

function filtrarLogros() {
    const busqueda = document.getElementById('busquedaLogros')?.value?.toLowerCase() || '';
    const logros = document.querySelectorAll('#listaLogrosAdmin .logro-item');
    logros.forEach(logro => {
        const nombre = logro.querySelector('.logro-nombre')?.value?.toLowerCase() || '';
        const desc = logro.querySelector('.logro-descripcion')?.value?.toLowerCase() || '';
        logro.style.display = (!busqueda || nombre.includes(busqueda) || desc.includes(busqueda)) ? '' : 'none';
    });
}

// ===== MODAL DE LOGROS =====

function abrirModalLogros(juegoId) {
    const juego = juegosCompartidos.find(j => j.id === juegoId);
    const logros = logrosJuegos[juegoId] || [];
    const estado = estadoUsuario[juegoId] || {};
    const conseguidos = estado.logrosConseguidos || [];
    
    if (logros.length === 0) return;
    
    const totalLogros = logros.length;
    const conseguidosCount = conseguidos.length;
    const porcentaje = Math.round((conseguidosCount / totalLogros) * 100);
    
    let caratulaHTML = '';
    const nombreArchivo = obtenerNombreArchivo(juego.nombre);
    
    if (juego.imagenData) {
        caratulaHTML = `<img src="${juego.imagenData}" alt="${juego.nombre}" style="width:100%;border-radius:12px;">`;
    } else {
        caratulaHTML = `<img src="imagenes/${nombreArchivo}.jpg" alt="${juego.nombre}" style="width:100%;border-radius:12px;" onerror="this.onerror=null;this.src='imagenes/${nombreArchivo}.png';">`;
    }
    
    const modalContent = document.querySelector('.modal-logros-contenido');
    modalContent.style.cssText = 'display:flex;flex-direction:row;background:#0f0f1a;border-radius:20px;width:600px;max-height:65vh;border:1px solid #1a1a2e;overflow:hidden;box-shadow:0 25px 70px rgba(0,0,0,0.7);';
    
    modalContent.innerHTML = `
        <div style="width:140px;min-width:140px;background:linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%);display:flex;flex-direction:column;align-items:center;padding:20px 14px;border-right:1px solid #1a1a2e;">
            <div style="width:100px;height:100px;margin-bottom:16px;">
                ${caratulaHTML}
            </div>
            <div style="text-align:center;">
                <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;">${juego.nombre}</div>
                <div style="font-size:11px;color:#888;">${juego.plataforma}</div>
            </div>
            <div style="position:relative;width:70px;height:70px;margin-top:14px;">
                <svg width="70" height="70" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#1a1a2e" stroke-width="3"/>
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#4ecca3" stroke-width="3" stroke-dasharray="${porcentaje * 0.94} 100" transform="rotate(-90 18 18)" style="transition:stroke-dasharray 0.5s ease;"/>
                </svg>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:16px;font-weight:700;color:#4ecca3;">${porcentaje}%</div>
            </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #1a1a2e;">
                <div>
                    <div style="color:#fff;font-size:16px;font-weight:600;">🏆 Logros</div>
                    <div style="color:#888;font-size:11px;margin-top:2px;">${conseguidosCount} de ${totalLogros} completados</div>
                </div>
                <button onclick="cerrarModalLogros()" style="background:none;color:#888;border:none;font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
            </div>
            <div style="padding:8px 14px;border-bottom:1px solid #1a1a2e;">
                <input type="text" id="busquedaLogrosModal" placeholder="🔍 Buscar logros..." style="width:100%;padding:8px 12px;border:1px solid #1a1a2e;border-radius:10px;background:#0a0a14;color:#eee;font-size:12px;outline:none;" oninput="filtrarLogrosModal()">
            </div>
            <div id="modalLogrosLista" style="overflow-y:auto;flex:1;padding:6px 0;"></div>
        </div>
    `;
    
    const lista = document.getElementById('modalLogrosLista');
    
    logros.forEach((logro) => {
        const conseguido = conseguidos.includes(logro.id);
        const div = document.createElement('div');
        div.style.cssText = `
            display:flex;align-items:center;gap:12px;padding:10px 16px;margin:2px 8px;
            border-radius:10px;cursor:pointer;transition:all 0.2s;
            background:${conseguido ? 'rgba(78,204,163,0.05)' : 'transparent'};
        `;
        div.setAttribute('data-nombre', logro.nombre.toLowerCase());
        div.setAttribute('data-logro-id', logro.id);
        div.setAttribute('data-desc', (logro.descripcion || '').toLowerCase());
        div.onmouseenter = () => { if (!conseguido) div.style.background = 'rgba(255,255,255,0.02)'; };
        div.onmouseleave = () => { if (!conseguido) div.style.background = 'transparent'; };
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = conseguido;
        checkbox.style.cssText = 'width:18px;height:18px;cursor:pointer;accent-color:#4ecca3;flex-shrink:0;';
        checkbox.onchange = function() {
            toggleLogro(juegoId, logro.id, this.checked);
        };
        
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'flex:1;min-width:0;';
        infoDiv.innerHTML = `
            <div style="color:${conseguido ? '#4ecca3' : '#ddd'};font-size:13px;font-weight:500;text-decoration:${conseguido ? 'line-through' : 'none'};">${logro.nombre}</div>
            ${logro.descripcion ? `<div style="color:${conseguido ? '#5a8a7a' : '#666'};font-size:11px;margin-top:3px;text-decoration:${conseguido ? 'line-through' : 'none'};">${logro.descripcion}</div>` : ''}
        `;
        
        div.appendChild(checkbox);
        div.appendChild(infoDiv);
        
        if (conseguido) {
            const check = document.createElement('span');
            check.textContent = '✓';
            check.style.cssText = 'color:#4ecca3;font-size:16px;flex-shrink:0;';
            div.appendChild(check);
        }
        
        lista.appendChild(div);
    });
    
    document.getElementById('modalLogros').classList.add('activo');
    document.body.style.overflow = 'hidden';
}

function cerrarModalLogros() {
    document.getElementById('modalLogros').classList.remove('activo');
    document.body.style.overflow = '';
    setTimeout(() => {
        document.querySelector('.modal-logros-contenido').innerHTML = '';
    }, 300);
}

async function toggleLogro(juegoId, logroId, conseguido) {
    if (!estadoUsuario[juegoId]) estadoUsuario[juegoId] = {};
    if (!estadoUsuario[juegoId].logrosConseguidos) estadoUsuario[juegoId].logrosConseguidos = [];
    
    if (conseguido) {
        if (!estadoUsuario[juegoId].logrosConseguidos.includes(logroId)) {
            estadoUsuario[juegoId].logrosConseguidos.push(logroId);
        }
    } else {
        estadoUsuario[juegoId].logrosConseguidos = estadoUsuario[juegoId].logrosConseguidos.filter(id => id !== logroId);
    }
    
    const totalLogros = logrosJuegos[juegoId] ? logrosJuegos[juegoId].length : 0;
    const conseguidosCount = estadoUsuario[juegoId].logrosConseguidos.length;
    
    if (totalLogros > 0 && conseguidosCount >= totalLogros) {
        estadoUsuario[juegoId].progreso = 'Platino';
    }
    
    await guardarEstadoServidor();
    window.dispatchEvent(new Event('actualizarContadores'));
    actualizarContadorLogros(juegoId, conseguidosCount, totalLogros);
    
    const valorBuscador = document.getElementById('busquedaLogrosModal')?.value || '';
    abrirModalLogros(juegoId);
    if (valorBuscador) {
        document.getElementById('busquedaLogrosModal').value = valorBuscador;
        filtrarLogrosModal();
    }
}

function filtrarLogrosModal() {
    const busqueda = document.getElementById('busquedaLogrosModal')?.value?.toLowerCase() || '';
    const items = document.querySelectorAll('#modalLogrosLista > div');
    items.forEach(item => {
        const nombre = item.getAttribute('data-nombre') || '';
        const desc = item.getAttribute('data-desc') || '';
        item.style.display = (!busqueda || nombre.includes(busqueda) || desc.includes(busqueda)) ? 'flex' : 'none';
    });
}

function actualizarContadorLogros(juegoId, conseguidos, total) {
    const tags = document.querySelectorAll('.logrosTag');
    tags.forEach(tag => {
        const onclick = tag.getAttribute('onclick') || '';
        if (onclick.includes(juegoId)) {
            tag.textContent = `🏆 ${conseguidos}/${total}`;
        }
    });
}

// ===== DESCARGAS, JUEGO Y DESINSTALACIÓN =====

async function descargarJuego(juegoId) {
    const ringCircle = document.getElementById(`ring-circle-${juegoId}`);
    const ringText = document.getElementById(`ring-texto-${juegoId}`);
    const circunferencia = 88;
    
    if (ringCircle && ringText) {
        ringText.textContent = '0%';
        ringText.style.fontSize = '6px';
        
        try {
            const promesaDescarga = fetch('/api/descargar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: usuarioActual, juegoId })
            });
            
            const intervalo = setInterval(async () => {
                try {
                    const resProg = await fetch(`/api/progreso-descarga/${juegoId}`);
                    const prog = await resProg.json();
                    
                    if (prog.ok) {
                        const offset = circunferencia - (prog.progreso / 100) * circunferencia;
                        ringCircle.setAttribute('stroke-dashoffset', offset);
                        ringText.textContent = prog.progreso + '%';
                        
                        if (prog.progreso >= 100) {
                            clearInterval(intervalo);
                            
                            const ringDiv = document.getElementById(`ring-${juegoId}`);
                            if (ringDiv) {
                                ringDiv.innerHTML = `<span style="font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;width:100%;height:100%;" onclick="jugarJuego(${juegoId})" title="Jugar">🎮</span>`;
                                ringDiv.style.width = '24px';
                                ringDiv.style.height = '24px';
                                ringDiv.onclick = function(e) { 
                                    e.stopPropagation(); 
                                    fetch('/api/juego-en-ejecucion')
                                        .then(r => r.json())
                                        .then(data => {
                                            const estaJugando = data.juegos && data.juegos.includes(juegoId);
                                            if (estaJugando) {
                                                detenerJuego(juegoId);
                                                ringDiv.innerHTML = `<span style="font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;width:100%;height:100%;" title="Jugar">🎮</span>`;
                                            } else {
                                                jugarJuego(juegoId);
                                                ringDiv.innerHTML = `<span style="font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;width:100%;height:100%;" title="Detener">🎮</span>`;
                                            }
                                        });
                                };
                            }
                        }
                    }
                } catch (e) {}
            }, 500);
            
            await promesaDescarga;
        } catch (error) {
            ringText.textContent = '📥';
            ringText.style.fontSize = '7px';
            alert('❌ Error de conexión');
        }
        return;
    }
    
    if (document.getElementById('descargasSteam')) {
        if (typeof window.iniciarDescarga === 'function') {
            window.iniciarDescarga(juegoId);
        }
        const btnContainer = document.getElementById('btnJugarContainer');
        if (btnContainer) {
            btnContainer.innerHTML = `<button class="btn-jugar-steam" onclick="jugarJuego(${juegoId})">▶ JUGAR</button>`;
        }
        return;
    }
    
    const btnSpan = document.getElementById(`btn-accion-${juegoId}`);
    if (!btnSpan) return;
    
    btnSpan.style.cssText = 'flex: 3 !important;';
    
    btnSpan.innerHTML = `
        <div class="barra-progreso" style="width: 100%;">
            <div class="barra-progreso-relleno" id="progreso-${juegoId}" style="width: 0%;"></div>
            <span class="barra-progreso-texto" id="texto-${juegoId}">⏳ Preparando...</span>
        </div>
    `;
    
    const acciones = btnSpan.parentElement;
    const otrosBotones = acciones.querySelectorAll('.btnEditar, .btnEliminar, .btnDesinstalar');
    otrosBotones.forEach(b => b.style.display = 'none');
    
    try {
        const promesaDescarga = fetch('/api/descargar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioActual, juegoId })
        });
        
        const intervalo = setInterval(async () => {
            try {
                const resProg = await fetch(`/api/progreso-descarga/${juegoId}`);
                const prog = await resProg.json();
                
                if (prog.ok) {
                    const relleno = document.getElementById(`progreso-${juegoId}`);
                    const texto = document.getElementById(`texto-${juegoId}`);
                    if (relleno) relleno.style.width = prog.progreso + '%';
                    if (texto) {
                        const mbTotal = (prog.total / (1024 * 1024)).toFixed(0);
                        const mbDescargado = ((prog.progreso / 100) * (prog.total / (1024 * 1024))).toFixed(0);
                        texto.textContent = `📥 ${prog.progreso}% · ${mbDescargado}/${mbTotal} MB`;
                    }
                }
            } catch (e) {}
        }, 500);
        
        const res = await promesaDescarga;
        const datos = await res.json();
        clearInterval(intervalo);
        
        if (datos.ok) {
            const relleno = document.getElementById(`progreso-${juegoId}`);
            const texto = document.getElementById(`texto-${juegoId}`);
            if (relleno) relleno.style.width = '100%';
            if (texto) texto.textContent = '✅ Completado';
            
            await new Promise(resolve => setTimeout(resolve, 600));
            
            otrosBotones.forEach(b => b.style.display = '');
            btnSpan.style.cssText = '';
            
            btnSpan.innerHTML = `
                <button class="btnJugar" onclick="jugarJuego(${juegoId})" title="Ejecutar juego" style="flex: 2;">🎮 Jugar</button>
                <button class="btnDesinstalar" onclick="desinstalarJuego(${juegoId})" title="Eliminar ROM">🗑️</button>
            `;
        } else {
            otrosBotones.forEach(b => b.style.display = '');
            btnSpan.style.cssText = '';
            btnSpan.innerHTML = `<button class="btnDescargar" onclick="descargarJuego(${juegoId})" title="Descargar ROM">📥 Descargar</button>`;
            alert('❌ ' + (datos.error || 'Error al descargar'));
        }
    } catch (error) {
        otrosBotones.forEach(b => b.style.display = '');
        btnSpan.style.cssText = '';
        btnSpan.innerHTML = `<button class="btnDescargar" onclick="descargarJuego(${juegoId})" title="Descargar ROM">📥 Descargar</button>`;
        alert('❌ Error de conexión');
    }
}

async function jugarJuego(juegoId) {
    const btnSpan = document.getElementById(`btn-accion-${juegoId}`);
    if (btnSpan) btnSpan.innerHTML = '';
    
    fetch('/api/ejecutar-juego', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juegoId })
    }).catch(() => {});
    
    const intervalo = setInterval(async () => {
        try {
            const res = await fetch('/api/emulador-abierto');
            const datos = await res.json();
            if (!datos.abierto) {
                clearInterval(intervalo);
                actualizarBotonJugar(juegoId);
            }
        } catch(e) {}
    }, 2000);

    const ringDiv = document.getElementById(`ring-${juegoId}`);
    if (ringDiv) {
        ringDiv.innerHTML = `<span style="font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;width:100%;height:100%;" title="Detener">🎮</span>`;
    }
}

function actualizarBotonJugar(juegoId) {
    const btnSpan = document.getElementById(`btn-accion-${juegoId}`);
    if (btnSpan) btnSpan.innerHTML = '';
}

async function detenerJuego(juegoId) {
    await fetch('/api/detener-juego', { method: 'POST' });
    actualizarBotonJugar(juegoId);
}

async function desinstalarJuego(juegoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar la ROM de este juego? Tendrás que descargarla de nuevo para jugar.')) {
        return;
    }
    
    try {
        const res = await fetch('/api/desinstalar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ juegoId })
        });
        
        const datos = await res.json();
        
        if (datos.ok) {
            const btnSpan = document.getElementById(`btn-accion-${juegoId}`);
            if (btnSpan) btnSpan.innerHTML = '';
            
            setTimeout(() => {
                const tarjeta = document.getElementById(`btn-accion-${juegoId}`)?.closest('.tarjetaJuego');
                const nombreH3 = tarjeta?.querySelector('.nombreJuego');
                if (nombreH3 && !nombreH3.querySelector('.btn-descargar-ring')) {
                    const span = document.createElement('span');
                    span.style.cssText = 'margin-left:6px;flex-shrink:0;';
                    span.innerHTML = `
                        <div class="btn-descargar-ring" onclick="descargarJuego(${juegoId})" id="ring-${juegoId}" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;position:relative;width:24px;height:24px;vertical-align:middle;" title="Descargar">
                            <svg width="24" height="24" viewBox="0 0 32 32">
                                <circle cx="16" cy="16" r="14" fill="none" stroke="#333" stroke-width="2"/>
                                <circle cx="16" cy="16" r="14" fill="none" stroke="#3498db" stroke-width="2" stroke-dasharray="88" stroke-dashoffset="88" id="ring-circle-${juegoId}" transform="rotate(-90 16 16)" style="transition: stroke-dashoffset 0.3s;"/>
                            </svg>
                            <span id="ring-texto-${juegoId}" style="position:absolute;font-size:7px;color:#fff;">📥</span>
                        </div>`;
                    nombreH3.appendChild(span);
                }
            }, 100);
        } else {
            alert('❌ ' + (datos.error || 'Error al desinstalar'));
        }
    } catch (error) {
        alert('❌ Error de conexión');
    }
}

function cargarPanelOpciones() {
    const panel = document.getElementById('panelOpciones');
    panel.innerHTML = `
        <div class="panel-opciones">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <div style="width:36px;height:36px;background:rgba(240,165,0,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">⚙️</div>
                <h2 style="color:#fff;font-size:18px;margin:0;">Opciones</h2>
            </div>
            <div class="mensaje" id="mensajeOpciones"></div>
            <div class="opcion-tarjeta">
                <h3>🎨 Apariencia</h3>
                <div class="opcion-fila">
                    <label>Vista predeterminada</label>
                    <select id="vistaPredeterminada">
                        <option value="clasica">📋 Vista Clásica</option>
                        <option value="steam">🖥️ Vista Steam</option>
                    </select>
                </div>
            </div>
            <button class="btn-guardar-opciones" onclick="guardarOpciones()">💾 Guardar opciones</button>
        </div>
    `;
    
    // Cargar preferencia actual
    fetch(`/api/configuracion/${usuarioActual}`)
        .then(r => r.json())
        .then(config => {
            document.getElementById('vistaPredeterminada').value = config.vista || 'clasica';
        })
        .catch(() => {});
}

async function guardarOpciones() {
    const vista = document.getElementById('vistaPredeterminada').value;
    const m = document.getElementById('mensajeOpciones');
    
    try {
        const res = await fetch('/api/configuracion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioActual, config: { vista } })
        });
        
        const datos = await res.json();
        
        if (datos.ok) {
            m.textContent = '✅ Opciones guardadas. Redirigiendo...';
            m.className = 'mensaje exito';
            m.style.display = 'block';
            setTimeout(() => {
                window.location.href = vista === 'steam' ? 'steam.html' : 'index.html';
            }, 600);
        } else {
            m.textContent = '❌ Error al guardar';
            m.className = 'mensaje error';
            m.style.display = 'block';
        }
    } catch (e) {
        m.textContent = '❌ Error de conexión';
        m.className = 'mensaje error';
        m.style.display = 'block';
    }
}

setInterval(async () => {
    try {
        const res = await fetch('/api/emulador-abierto');
        const datos = await res.json();
        if (!datos.abierto) {
            colaVerificacion = [...new Set([...colaVerificacion, ...juegosCompartidos.map(j => j.id)])];
            if (!verificando) procesarCola();
        }
    } catch(e) {}
}, 3000);

cargarDatosIniciales();