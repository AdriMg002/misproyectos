// ===== STEAM VIEW =====
let juegoSeleccionadoId = null;
let tabActual = 'biblioteca';
let juegoEnEjecucionActual = null;

const params = new URLSearchParams(window.location.search);
tabActual = params.get('tab') || 'biblioteca';

const COLORES_PLATAFORMA = {
    'GBA': '#6f42c1', 'DS': '#999', '3DS': '#d32f2f', 'PSP': '#4a90d9',
    'PS2': '#1a1a5e', 'PS3': '#003791', 'PS4': '#003087', 'PS5': '#2d64e6',
    'Switch': '#e60012', 'Switch 2': '#cc0000', 'WII': '#0099cc'
};

// ===== INICIALIZACIÓN SEGÚN LA PÁGINA =====
const esTiendaIndependiente = !!document.getElementById('modalTienda');
const esSteam = !!document.getElementById('contenedorSteam');

if (esTiendaIndependiente) {
    // Estamos en tienda.html, solo cargar la parte de tienda
    async function initTienda() {
        try {
            juegosCompartidos = await apiCargarJuegos();
            estadoUsuario = await apiCargarEstado();
            logrosJuegos = await apiCargarLogros();
            mostrarTiendaSteam();
        } catch(e) {}
    }
    initTienda();
}

if (esSteam) {
    // Estamos en steam.html, cargar todo
    async function cargarSteam() {
        try {
            juegosCompartidos = await apiCargarJuegos();
            estadoUsuario = await apiCargarEstado();
            logrosJuegos = await apiCargarLogros();
            
            // Configurar navegación
            document.getElementById('navBiblioteca').addEventListener('click', function(e) {
                e.preventDefault();
                tabActual = 'biblioteca';
                document.getElementById('navBiblioteca').classList.add('activo');
                document.getElementById('navTienda').classList.remove('activo');
                document.getElementById('navDescargas').classList.remove('activo');
                document.getElementById('descargasSteam').style.display = 'none';
                mostrarBiblioteca();
            });
            
            document.getElementById('navTienda').addEventListener('click', function(e) {
                e.preventDefault();
                tabActual = 'tienda';
                document.getElementById('navTienda').classList.add('activo');
                document.getElementById('navBiblioteca').classList.remove('activo');
                document.getElementById('navDescargas').classList.remove('activo');
                document.getElementById('descargasSteam').style.display = 'none';
                mostrarTienda();
            });
            
            document.getElementById('navDescargas').addEventListener('click', function(e) {
                e.preventDefault();
                tabActual = 'descargas';
                document.getElementById('navDescargas').classList.add('activo');
                document.getElementById('navBiblioteca').classList.remove('activo');
                document.getElementById('navTienda').classList.remove('activo');
                document.getElementById('listaJuegosSteam').style.display = 'none';
                document.getElementById('detalleJuegoSteam').style.display = 'none';
                document.getElementById('tiendaSteam').style.display = 'none';
                document.getElementById('descargasSteam').style.display = 'block';
                mostrarDescargas();
                actualizarContador();
            });

            // Cargar pestaña inicial
            if (tabActual === 'biblioteca') {
                mostrarBiblioteca();
            } else if (tabActual === 'tienda') {
                document.getElementById('navTienda').classList.add('activo');
                document.getElementById('navBiblioteca').classList.remove('activo');
                mostrarTienda();
            }
        } catch(e) {
            console.error('Error al cargar Steam:', e);
        }
    }
    cargarSteam();
}

// ===== FUNCIONES DE BIBLIOTECA =====

function mostrarBiblioteca() {
    document.getElementById('listaJuegosSteam').style.display = 'flex';
    document.getElementById('detalleJuegoSteam').style.display = 'flex';
    document.getElementById('tiendaSteam').style.display = 'none';
    document.getElementById('descargasSteam').style.display = 'none';
    filtrarBiblioteca();
}

function seleccionarJuegoSteam(juegoId) {
    juegoSeleccionadoId = juegoId;
    mostrarBiblioteca();
    const juego = juegosCompartidos.find(j => j.id === juegoId);
    if (!juego) return;
    const estado = estadoUsuario[juegoId] || {};
    const n = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const detalle = document.getElementById('detalleJuegoSteam');
    const l = estado.logrosConseguidos ? estado.logrosConseguidos.length : 0;
    const t = logrosJuegos[juegoId] ? logrosJuegos[juegoId].length : 0;
    const screenshots = [];
    for (let i = 1; i <= 4; i++) screenshots.push({ jpg: `imagenes/screenshots/${n}_${i}.jpg`, png: `imagenes/screenshots/${n}_${i}.png` });

    detalle.innerHTML = `
        <div style="width:100%;">
            <div style="width:100%;position:relative;background-color:#0d0d1a;max-height:350px;overflow:hidden;">
                <img src="imagenes/horizontal/${n}.jpg" style="width:100%;height:350px;object-fit:cover;object-position:center;display:block;" onerror="this.onerror=null;this.src='imagenes/horizontal/${n}.png';">
                <div style="position:absolute;bottom:0;left:0;right:0;padding:40px;background:linear-gradient(transparent,rgba(27,40,56,0.95)60%,#1b2838);">
                    <h2 style="font-size:36px;margin-bottom:8px;">${juego.nombre}</h2>
                    <div style="color:#aaa;font-size:14px;">${juego.plataforma} · ${estado.tipoPosesion === 'fisico' ? '💿 Físico' : '📥 Digital'} · ${estado.dificultad || 'Normal'}</div>
                </div>
            </div>
            <div style="display:flex;gap:12px;padding:20px 40px;background:rgba(0,0,0,0.3);align-items:center;">
                <span id="btnJugarContainer"><button disabled style="padding:14px 40px;background:linear-gradient(135deg,#4ecca3,#2ecc71);color:#fff;border:none;border-radius:4px;font-size:16px;font-weight:bold;opacity:0.5;">⏳ Verificando...</button></span>
                <span id="gearContainer"></span>
            </div>
            <div style="display:flex;gap:40px;padding:20px 40px;border-bottom:1px solid rgba(255,255,255,0.05);">
                <div class="estadistica-item"><div class="valor">${estado.ultimaSesion || 'Hoy'}</div><div class="etiqueta">ÚLTIMA SESIÓN</div></div>
                <div class="estadistica-item"><div class="valor">${formatearSegundos(estado.tiempoJuegoSegundos) || estado.tiempoJuego || '0 minutos'}</div><div class="etiqueta">TIEMPO DE JUEGO</div></div>
                <div class="estadistica-item"><div class="valor" id="espacio-${juegoId}">--</div><div class="etiqueta">ESPACIO</div></div>
                <div class="estadistica-item"><div class="valor">${l}/${t}</div><div class="etiqueta">LOGROS</div></div>
            </div>
            <div style="padding:30px 40px;display:flex;gap:30px;">
                <div style="flex:2;">
                    <h3 style="color:#ccc;font-size:14px;text-transform:uppercase;letter-spacing:2px;margin-bottom:15px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">Acerca del juego</h3>
                    <p style="color:#999;font-size:14px;">${juego.nombre} es un juego de ${juego.plataforma}.</p>
                </div>
                <div style="flex:1;min-width:250px;">
                    <h3 style="color:#ccc;font-size:14px;text-transform:uppercase;letter-spacing:2px;margin-bottom:15px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">Detalles</h3>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        <span style="padding:6px 14px;background:rgba(255,255,255,0.05);border-radius:20px;font-size:12px;color:#aaa;">${juego.plataforma}</span>
                        <span style="padding:6px 14px;background:rgba(255,255,255,0.05);border-radius:20px;font-size:12px;color:#aaa;">${estado.dificultad || 'Normal'}</span>
                        ${juego.precio ? `<span style="padding:6px 14px;background:rgba(255,255,255,0.05);border-radius:20px;font-size:12px;color:#aaa;">💰 ${juego.precio.toFixed(2)}€</span>` : ''}
                    </div>
                </div>
            </div>
            <div style="padding:0 40px 30px;display:flex;gap:12px;overflow-x:auto;">
                ${screenshots.map(s => `<img src="${s.jpg}" style="width:280px;height:160px;object-fit:cover;border-radius:8px;cursor:pointer;" onerror="this.onerror=null;this.src='${s.png}';" onclick="window.open(this.src,'_blank')">`).join('')}
            </div>
        </div>`;

    fetch('/api/verificar-rom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juegoId })
    }).then(r => r.json()).then(d => {
        const btn = document.getElementById('btnJugarContainer');
        const gear = document.getElementById('gearContainer');
        if (!btn) return;
        gear.innerHTML = '';
        const dropId = 'drop-' + juegoId;
        const gearHTML = '<div class="dropdown-engranaje"><button class="btn-engranaje" onclick="toggleDropdown(event,\'' + dropId + '\')">⚙️</button><div class="dropdown-menu" id="' + dropId + '" style="display:none;"><button onclick="desinstalarJuegoSteam(' + juegoId + ')">🗑️ Desinstalar</button><button onclick="quitarDeBiblioteca(' + juegoId + ')">📤 Quitar de biblioteca</button></div></div>';

        if (d.existeLocal) {
            const estaJugando = juegoEnEjecucionActual === juegoId;
            const jugar = estaJugando
                ? '<button class="btn-jugar-steam" onclick="detenerJuegoSteam(' + juegoId + ')" style="background:#e94560;">⏹ DETENER</button>'
                : '<button class="btn-jugar-steam" onclick="jugarJuegoSteam(' + juegoId + ')">▶ JUGAR</button>';
            btn.innerHTML = jugar;
            gear.innerHTML = gearHTML;
        } else if (d.existeUSB) {
            btn.innerHTML = '<button class="btn-descargar-steam" onclick="descargarJuego(' + juegoId + ')">📥 DESCARGAR</button>';
            gear.innerHTML = gearHTML;
        } else {
            btn.innerHTML = '<button class="btn-descargar-steam" disabled style="opacity:0.5;background:#555;">🚫 NO DISPONIBLE</button>';
            gear.innerHTML = gearHTML;
        }
    });
}

// ===== FUNCIONES DE TIENDA =====

function mostrarTienda() {
    document.getElementById('listaJuegosSteam').style.display = 'none';
    document.getElementById('detalleJuegoSteam').style.display = 'none';
    document.getElementById('tiendaSteam').style.display = 'block';
    document.getElementById('descargasSteam').style.display = 'none';
    
    const fp = document.getElementById('filtroPlataformaSteam')?.value || '';
    const juegos = juegosCompartidos
        .filter(j => !estadoUsuario[j.id] || !estadoUsuario[j.id].loTengo)
        .filter(j => !fp || j.plataforma === fp)
        .sort(() => Math.random() - 0.5);
    
    const grid = document.getElementById('gridTienda');
    grid.innerHTML = '';
    
    const crear = (juego) => {
        const n = juego.nombre.toLowerCase().replace(/\s+/g, '');
        const d = document.createElement('div');
        d.style.cssText = 'background:#16213e;border-radius:10px;overflow:hidden;cursor:pointer;transition:transform 0.3s;border:1px solid transparent;';
        d.onmouseenter = () => { d.style.transform = 'translateY(-5px)'; d.style.borderColor = '#f0a500'; };
        d.onmouseleave = () => { d.style.transform = ''; d.style.borderColor = 'transparent'; };
        d.innerHTML = `
            ${juego.imagenData
                ? `<img src="${juego.imagenData}" style="width:100%;aspect-ratio:3/4;object-fit:fill;">`
                : `<img src="imagenes/${n}.jpg" style="width:100%;aspect-ratio:3/4;object-fit:fill;" onerror="this.onerror=null;this.src='imagenes/${n}.png';">`
            }
            <div style="padding:14px;">
                <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${juego.nombre}</div>
                <div style="font-size:12px;color:#888;margin-bottom:8px;">${juego.plataforma}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#f0a500;font-weight:bold;font-size:15px;">${juego.precio ? juego.precio.toFixed(2) + '€' : `<a href="https://psprices.com/region-es/games?q=${encodeURIComponent(juego.nombre)}" target="_blank" onclick="event.stopPropagation();" style="color:#3498db;text-decoration:none;font-size:13px;">🔗 Ver precio</a>`}</span>
                    <button onclick="event.stopPropagation();comprarJuegoSteam(${juego.id})" style="padding:8px 14px;background:#4ecca3;color:#1a1a2e;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;">🛒 Comprar</button>
                </div>
            </div>`;
        return d;
    };
    
    juegos.slice(0, 30).forEach(j => grid.appendChild(crear(j)));
    
    document.getElementById('busquedaTienda').oninput = e => {
        const b = e.target.value.toLowerCase();
        const f = b ? juegos.filter(j => j.nombre.toLowerCase().includes(b)) : juegos.slice(0, 30);
        grid.innerHTML = '';
        f.length ? f.forEach(j => grid.appendChild(crear(j))) : grid.innerHTML = '<p style="color:#888;text-align:center;grid-column:1/-1;padding:40px;">No se encontraron juegos</p>';
    };
}

// ===== FUNCIONES DE NAVEGACIÓN =====

function toggleDropdown(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => { if (m.id !== id) m.style.display = 'none'; });
    const m = document.getElementById(id);
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
}

async function quitarDeBiblioteca(id) {
    if (!confirm('¿Quitar de tu biblioteca?')) return;
    if (!estadoUsuario[id]) estadoUsuario[id] = {};
    estadoUsuario[id].loTengo = false;
    estadoUsuario[id].tipoPosesion = null;
    await guardarEstadoServidor();
    window.dispatchEvent(new Event('actualizarContadores'));
    mostrarBiblioteca();
    document.getElementById('detalleJuegoSteam').innerHTML = '<div class="detalle-vacio"><p style="font-size:60px;">🎮</p><p style="font-size:20px;">Selecciona un juego</p></div>';
}

async function desinstalarJuegoSteam(id) {
    if (!confirm('¿Eliminar ROM?')) return;
    try {
        const r = await fetch('/api/desinstalar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ juegoId: id }) });
        const d = await r.json();
        if (d.ok) seleccionarJuegoSteam(id);
        else alert('❌ Error');
    } catch (e) { alert('❌ Error de conexión'); }
}

async function comprarJuegoSteam(id) {
    if (!estadoUsuario[id]) estadoUsuario[id] = {};
    estadoUsuario[id].loTengo = true;
    estadoUsuario[id].tipoPosesion = 'digital';
    await guardarEstadoServidor();
    window.dispatchEvent(new Event('actualizarContadores'));
    alert('✅ Añadido');
    mostrarTienda();
}

// ===== FUNCIONES DE JUEGO =====

async function detenerJuegoSteam(id) {
    await fetch('/api/detener-juego', { method: 'POST' });
    detenerContador(id);
    juegoEnEjecucionActual = null;
    seleccionarJuegoSteam(id);
}

function jugarJuegoSteam(id) {
    const b = document.getElementById('btnJugarContainer');
    const g = document.getElementById('gearContainer');

    if (b) b.innerHTML = '<button class="btn-jugar-steam" onclick="detenerJuegoSteam(' + id + ')" style="background:#e94560;">⏹ DETENER</button>';
    if (g) g.innerHTML = '<div class="dropdown-engranaje"><button class="btn-engranaje" onclick="toggleDropdown(event,\'drop-' + id + '\')">⚙️</button><div class="dropdown-menu" id="drop-' + id + '" style="display:none;"><button onclick="desinstalarJuegoSteam(' + id + ')">🗑️ Desinstalar</button><button onclick="quitarDeBiblioteca(' + id + ')">📤 Quitar</button></div></div>';

    juegoEnEjecucionActual = id;

    if (!localStorage.getItem('juego_inicio_' + id)) {
        localStorage.setItem('juego_inicio_' + id, Date.now());
        const segundosPrevios = (estadoUsuario[id] && estadoUsuario[id].tiempoJuegoSegundos) || 0;
        localStorage.setItem('juego_tiempo_previo_segundos_' + id, segundosPrevios);
    }
    actualizarTiempoJuego(id);

    fetch('/api/ejecutar-juego', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ juegoId: id }) }).catch(() => {});

    const intervalo = setInterval(async () => {
        try {
            actualizarTiempoJuego(id);
            const r = await fetch('/api/emulador-abierto');
            const d = await r.json();
            if (!d.abierto) {
                clearInterval(intervalo);
                detenerContador(id);
                juegoEnEjecucionActual = null;
                seleccionarJuegoSteam(id);
            }
        } catch (e) {}
    }, 1000);
}

function actualizarTiempoJuego(id) {
    if (juegoSeleccionadoId !== id) return;
    
    const inicio = localStorage.getItem('juego_inicio_' + id);
    if (!inicio) return;

    const segundosNuevos = Math.floor((Date.now() - parseInt(inicio)) / 1000);
    const previoSegundos = parseInt(localStorage.getItem('juego_tiempo_previo_segundos_' + id) || '0');
    const totalSegundos = previoSegundos + segundosNuevos;
    const horasTotales = Math.floor(totalSegundos / 3600);
    const minutosTotales = Math.floor((totalSegundos % 3600) / 60);
    const segundosRestantes = totalSegundos % 60;

    let tiempo;
    if (horasTotales > 0) {
        tiempo = horasTotales + ' horas';
        if (minutosTotales > 0) tiempo += ' y ' + minutosTotales + ' minutos';
    } else if (minutosTotales > 0) {
        tiempo = minutosTotales + ' minutos';
        if (segundosRestantes > 0) tiempo += ', ' + segundosRestantes + ' segundos';
    } else {
        tiempo = totalSegundos + ' segundos';
    }

    if (estadoUsuario[id]) {
        estadoUsuario[id].tiempoJuegoSegundos = totalSegundos;
    }

    const stats = document.querySelectorAll('.estadistica-item');
    if (stats.length >= 2) {
        const tiempoEl = stats[1].querySelector('.valor');
        if (tiempoEl) tiempoEl.textContent = tiempo;
    }
}

function detenerContador(id) {
    const inicio = localStorage.getItem('juego_inicio_' + id);
    if (!inicio) return;

    const segundosNuevos = Math.floor((Date.now() - parseInt(inicio)) / 1000);
    const previoSegundos = parseInt(localStorage.getItem('juego_tiempo_previo_segundos_' + id) || '0');
    const totalSegundos = previoSegundos + segundosNuevos;
    const horasTotales = Math.floor(totalSegundos / 3600);
    const minutosTotales = Math.floor((totalSegundos % 3600) / 60);
    const segundosRestantes = totalSegundos % 60;

    let tiempo;
    if (horasTotales > 0) {
        tiempo = horasTotales + ' horas';
        if (minutosTotales > 0) tiempo += ' y ' + minutosTotales + ' minutos';
    } else if (minutosTotales > 0) {
        tiempo = minutosTotales + ' minutos';
        if (segundosRestantes > 0) tiempo += ', ' + segundosRestantes + ' segundos';
    } else {
        tiempo = totalSegundos + ' segundos';
    }

    const ahora = new Date();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioDate = new Date(parseInt(inicio));
    inicioDate.setHours(0, 0, 0, 0);

    let ultimaSesion;
    if (inicioDate.getTime() === hoy.getTime()) {
        ultimaSesion = 'Hoy';
    } else {
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const dia = inicioDate.getDate();
        const mes = meses[inicioDate.getMonth()];
        ultimaSesion = inicioDate.getFullYear() === ahora.getFullYear() ? dia + ' ' + mes : dia + ' ' + mes + ' ' + inicioDate.getFullYear();
    }

    fetch('/api/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario: usuarioActual,
            juegoId: id,
            estado: {
                ...estadoUsuario[id],
                tiempoJuegoSegundos: totalSegundos,
                tiempoJuego: tiempo,
                ultimaSesion: ultimaSesion
            }
        })
    });

    if (!estadoUsuario[id]) estadoUsuario[id] = {};
    estadoUsuario[id].tiempoJuego = tiempo;
    estadoUsuario[id].tiempoJuegoSegundos = totalSegundos;
    estadoUsuario[id].ultimaSesion = ultimaSesion;

    localStorage.removeItem('juego_inicio_' + id);
    localStorage.removeItem('juego_tiempo_previo_segundos_' + id);
}

function filtrarBiblioteca() {
    const busqueda = document.getElementById('busquedaBiblioteca')?.value?.toLowerCase() || '';
    const plataforma = document.getElementById('filtroPlataformaBib')?.value || '';
    const lista = document.getElementById('listaJuegosSteamContenido');
    const juegos = juegosCompartidos
        .filter(j => estadoUsuario[j.id] && estadoUsuario[j.id].loTengo)
        .filter(j => !busqueda || j.nombre.toLowerCase().includes(busqueda))
        .filter(j => j.plataforma === 'GBA' || j.plataforma === 'PSP')
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    if (!lista) return;
    lista.innerHTML = '';
    if (!juegos.length) { lista.innerHTML = '<p style="color:#888;text-align:center;padding:40px;">No se encontraron juegos</p>'; return; }
    juegos.forEach(juego => {
        const item = document.createElement('div');
        item.className = 'juego-item' + (juego.id === juegoSeleccionadoId ? ' seleccionado' : '');
        item.onclick = () => seleccionarJuegoSteam(juego.id);
        const n = juego.nombre.toLowerCase().replace(/\s+/g, '');
        const img = juego.imagenData ? `<img src="${juego.imagenData}">` : `<img src="imagenes/${n}.jpg" onerror="this.onerror=null;this.src='imagenes/${n}.png';">`;
        item.innerHTML = `${img}<div class="info-item"><div class="nombre-item">${juego.nombre}</div><div class="plataforma-item">${juego.plataforma}</div></div>`;
        lista.appendChild(item);
    });
}

function formatearSegundos(totalSegundos) {
    if (!totalSegundos || totalSegundos <= 0) return null;
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;
    
    let resultado = '';
    if (horas > 0) resultado += horas + ' horas';
    if (minutos > 0) {
        if (resultado) resultado += ', ';
        resultado += minutos + ' minutos';
    }
    if (segundos > 0) {
        if (resultado) resultado += ', ';
        resultado += segundos + ' segundos';
    }
    return resultado || '0 minutos';
}

document.addEventListener('click', () => document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none'));

// ===== GESTOR DE DESCARGAS STEAM =====
let colaDescargas = [];
let descargasActivas = [];
let descargasCompletadas = [];

try {
    const guardadas = JSON.parse(localStorage.getItem('descargasSteam') || '[]');
    descargasCompletadas = guardadas.filter(d => d.estado === 'completada');
} catch (e) {}

function guardarDescargas() {
    const todas = [...descargasActivas, ...descargasCompletadas, ...colaDescargas];
    localStorage.setItem('descargasSteam', JSON.stringify(todas));
}

function actualizarContador() {
    const contador = document.getElementById('contadorDescargas');
    if (!contador) return;
    const total = descargasActivas.length + colaDescargas.length;
    if (total > 0) {
        contador.textContent = total;
        contador.style.display = 'inline';
    } else {
        contador.style.display = 'none';
    }
}

function iniciarDescarga(juegoId) {
    const juego = juegosCompartidos.find(j => j.id === juegoId);
    if (!juego) return;
    
    if (descargasActivas.find(d => d.juegoId === juegoId)) return;
    
    fetch(`/api/progreso-descarga/${juegoId}`, { method: 'DELETE' }).catch(() => {});
    
    const descarga = {
        juegoId,
        nombre: juego.nombre,
        plataforma: juego.plataforma,
        progreso: 0,
        estado: 'descargando',
        imagenData: juego.imagenData
    };
    
    descargasActivas.push(descarga);
    mostrarDescargas();
    actualizarContador();
    
    fetch('/api/descargar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioActual, juegoId })
    });
    
    const intervalo = setInterval(async () => {
        try {
            const res = await fetch(`/api/progreso-descarga/${juegoId}`);
            const prog = await res.json();
            if (prog.ok) {
                descarga.progreso = prog.progreso;
                mostrarDescargas();
                
                if (prog.progreso >= 100) {
                    clearInterval(intervalo);
                    descarga.estado = 'completada';
                    descargasActivas = descargasActivas.filter(d => d.juegoId !== juegoId);
                    descargasCompletadas.unshift(descarga);
                    mostrarDescargas();
                    actualizarContador();
                    guardarDescargas();
                }
            }
        } catch (e) {}
    }, 500);
}

function mostrarDescargas() {
    const enProgreso = document.getElementById('descargasEnProgreso');
    const completadas = document.getElementById('descargasCompletadas');
    
    if (!enProgreso || !completadas) return;
    
    const activas = [...descargasActivas, ...colaDescargas];
    if (activas.length === 0) {
        enProgreso.innerHTML = '<div class="descarga-vacia">No hay descargas en curso.</div>';
    } else {
        enProgreso.innerHTML = activas.map(d => {
            const nombreArchivo = d.nombre ? d.nombre.toLowerCase().replace(/\s+/g, '') : '';
            const imgSrc = d.imagenData ? d.imagenData : `imagenes/${nombreArchivo}.png`;
            return `
                <div class="descarga-item">
                    <img src="${imgSrc}" style="width:150px;height:85px;object-fit:cover;border-radius:8px;background:#0d0d1a;" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex';">
                    <div style="width:150px;height:85px;display:none;align-items:center;justify-content:center;background:#0d0d1a;border-radius:8px;font-size:30px;flex-shrink:0;">🎮</div>
                    <div class="descarga-info">
                        <div class="descarga-nombre">${d.nombre || 'Desconocido'}</div>
                        <div class="descarga-estado">${d.estado === 'en_cola' ? '⏳ En cola...' : d.estado === 'descargando' ? '📥 Descargando...' : '❌ Error'}</div>
                        ${d.estado !== 'en_cola' ? `
                        <div class="descarga-progreso-barra">
                            <div class="descarga-progreso-relleno" style="width:${d.progreso}%;"></div>
                        </div>
                        <div style="font-size:11px;color:#888;margin-top:4px;">${d.progreso}%</div>
                        ` : ''}
                    </div>
                    ${d.estado === 'en_cola' ? `<button onclick="cancelarDescarga(${d.juegoId})" style="background:#e94560;color:#fff;">✕</button>` : ''}
                </div>
            `;
        }).join('');
    }
    
    if (descargasCompletadas.length === 0) {
        completadas.innerHTML = '<div class="descarga-vacia">No hay descargas completadas todavía.</div>';
    } else {
        completadas.innerHTML = descargasCompletadas.slice(0, 10).map(d => {
            const nombreArchivo = d.nombre ? d.nombre.toLowerCase().replace(/\s+/g, '') : '';
            const imgSrc = d.imagenData ? d.imagenData : `imagenes/${nombreArchivo}.png`;
            return `
                <div class="descarga-item completada">
                    <img src="${imgSrc}" style="width:150px;height:85px;object-fit:cover;border-radius:8px;background:#0d0d1a;" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex';">
                    <div style="width:150px;height:85px;display:none;align-items:center;justify-content:center;background:#0d0d1a;border-radius:8px;font-size:30px;flex-shrink:0;">🎮</div>
                    <div class="descarga-info">
                        <div class="descarga-nombre">${d.nombre || 'Desconocido'}</div>
                        <div class="descarga-estado" style="color:#4ecca3;">✅ Completada</div>
                        <div class="descarga-progreso-barra">
                            <div class="descarga-progreso-relleno" style="width:100%;"></div>
                        </div>
                    </div>
                    <button onclick="jugarJuegoSteam(${d.juegoId})" style="background:linear-gradient(135deg,#4ecca3,#2ecc71);color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">▶ JUGAR</button>
                </div>
            `;
        }).join('');
    }
}

function cancelarDescarga(juegoId) {
    colaDescargas = colaDescargas.filter(d => d.juegoId !== juegoId);
    guardarDescargas();
    actualizarContador();
    mostrarDescargas();
}

// ===== TIENDA INDEPENDIENTE (tienda.html) =====
let carrito = [];

async function cargarTienda() {
    try {
        juegosCompartidos = await apiCargarJuegos();
        estadoUsuario = await apiCargarEstado();
        logrosJuegos = await apiCargarLogros();
        mostrarTiendaSteam();
    } catch (error) {
        console.warn('Error al cargar tienda:', error.message);
    }
}

function getJuegosNoComprados() {
    return juegosCompartidos.filter(j => {
        const estado = estadoUsuario[j.id];
        return !estado || !estado.loTengo;
    });
}

function mostrarTiendaSteam() {
    const juegos = getJuegosNoComprados();
    const aleatorios = [...juegos].sort(() => Math.random() - 0.5);
    
    mostrarGrid('gridRecomendados', aleatorios.slice(0, 8));
    mostrarGrid('gridNovedades', aleatorios.slice(8, 12));
    
    const conPrecio = aleatorios.filter(j => j.precio && j.precio > 0);
    mostrarGridOfertas('gridOfertas', conPrecio.slice(0, 4));
    
    if (aleatorios.length > 0) {
        const destacado = aleatorios[Math.floor(Math.random() * aleatorios.length)];
        const bannerTitulo = document.getElementById('bannerTitulo');
        const bannerDescripcion = document.getElementById('bannerDescripcion');
        const btnBanner = document.getElementById('btnBanner');
        if (bannerTitulo) bannerTitulo.textContent = destacado.nombre;
        if (bannerDescripcion) bannerDescripcion.textContent = `Descubre ${destacado.nombre} para ${destacado.plataforma}`;
        if (btnBanner) btnBanner.onclick = () => abrirModalJuego(destacado.id);
    }
}

function mostrarGrid(gridId, juegos) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    
    juegos.forEach(juego => {
        const estado = estadoUsuario[juego.id] || {};
        const tarjeta = crearTarjetaTienda(juego, estado);
        grid.appendChild(tarjeta);
    });
}

function mostrarGridOfertas(gridId, juegos) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    
    juegos.forEach(juego => {
        const estado = estadoUsuario[juego.id] || {};
        const tarjeta = crearTarjetaTienda(juego, estado, true);
        grid.appendChild(tarjeta);
    });
}

function crearTarjetaTienda(juego, estado, esOferta = false) {
    const div = document.createElement('div');
    div.className = 'tarjeta-tienda-steam';
    div.onclick = () => abrirModalJuego(juego.id);
    
    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const precioOriginal = (estado.precio || 0) * (esOferta ? 1.5 : 1);
    const precioFinal = estado.precio || 0;
    
    let imagenHTML = '';
    if (juego.imagenData) {
        imagenHTML = `<img src="${juego.imagenData}" alt="${juego.nombre}" class="img-tienda">`;
    } else {
        imagenHTML = `<img src="imagenes/${nombreArchivo}.jpg" alt="${juego.nombre}" class="img-tienda" onerror="this.onerror=null;this.src='imagenes/${nombreArchivo}.png';">`;
    }
    
    div.innerHTML = `
        ${imagenHTML}
        <div class="info-tienda">
            <div class="nombre-tienda">${juego.nombre}</div>
            <div class="plataforma-tienda">${juego.plataforma}</div>
            <div class="precio-tienda">
                <div>
                    ${esOferta ? `<span class="precio-descuento">${precioOriginal.toFixed(2)}€</span>` : ''}
                    <span class="precio-valor">${precioFinal > 0 ? precioFinal.toFixed(2) + '€' : 'Gratis'}</span>
                </div>
                <button class="btn-agregar-carrito" onclick="event.stopPropagation(); agregarAlCarrito(${juego.id})">🛒</button>
            </div>
        </div>
    `;
    
    return div;
}

function abrirModalJuego(juegoId) {
    const juego = juegosCompartidos.find(j => j.id === juegoId);
    if (!juego) return;
    
    const estado = estadoUsuario[juegoId] || {};
    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    
    const body = document.getElementById('modalTiendaBody');
    if (!body) return;
    
    body.innerHTML = `
        ${juego.imagenData ? `<img src="${juego.imagenData}" alt="${juego.nombre}">` : `<img src="imagenes/${nombreArchivo}.jpg" alt="${juego.nombre}" onerror="this.onerror=null;this.src='imagenes/${nombreArchivo}.png';">`}
        <h2>${juego.nombre}</h2>
        <span class="modal-plataforma">${juego.plataforma}</span>
        ${estado.precio ? `<div class="modal-precio">${estado.precio.toFixed(2)}€</div>` : '<div class="modal-precio">Gratis</div>'}
        <button class="btn-comprar-tienda" onclick="comprarJuego(${juegoId})">🛒 Añadir a mi biblioteca</button>
    `;
    
    document.getElementById('modalTienda').classList.add('activo');
    document.body.style.overflow = 'hidden';
}

function cerrarModalTienda() {
    const modal = document.getElementById('modalTienda');
    if (modal) modal.classList.remove('activo');
    document.body.style.overflow = '';
}

async function comprarJuego(juegoId) {
    if (!estadoUsuario[juegoId]) estadoUsuario[juegoId] = {};
    estadoUsuario[juegoId].loTengo = true;
    estadoUsuario[juegoId].tipoPosesion = 'digital';
    await guardarEstadoServidor();
    window.dispatchEvent(new Event('actualizarContadores'));
    cerrarModalTienda();
    mostrarTiendaSteam();
    alert('✅ Juego añadido a tu biblioteca');
}

function agregarAlCarrito(juegoId) {
    if (!carrito.includes(juegoId)) {
        carrito.push(juegoId);
        const contador = document.getElementById('contadorCarrito');
        if (contador) contador.textContent = carrito.length;
        alert('🛒 Añadido al carrito');
    }
}

function mostrarCarrito() {
    if (carrito.length === 0) {
        alert('🛒 Tu carrito está vacío');
        return;
    }
    alert(`🛒 Tienes ${carrito.length} juego(s) en el carrito`);
}

// Evento para cerrar modal de tienda
const modalTienda = document.getElementById('modalTienda');
if (modalTienda) {
    modalTienda.addEventListener('click', function(e) {
        if (e.target === this) cerrarModalTienda();
    });
}

// Buscador de tienda (solo si existe)
const busquedaTiendaEl = document.getElementById('busquedaTienda');
if (busquedaTiendaEl && esTiendaIndependiente) {
    busquedaTiendaEl.addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase();
        if (busqueda.length > 0) {
            const filtrados = getJuegosNoComprados().filter(j => j.nombre.toLowerCase().includes(busqueda));
            mostrarGrid('gridRecomendados', filtrados);
            const gridNovedades = document.getElementById('gridNovedades');
            const gridOfertas = document.getElementById('gridOfertas');
            if (gridNovedades) gridNovedades.innerHTML = '';
            if (gridOfertas) gridOfertas.innerHTML = '';
            const bannerDestacado = document.getElementById('bannerDestacado');
            if (bannerDestacado) bannerDestacado.style.display = 'none';
        } else {
            const bannerDestacado = document.getElementById('bannerDestacado');
            if (bannerDestacado) bannerDestacado.style.display = 'flex';
            mostrarTiendaSteam();
        }
    });
}