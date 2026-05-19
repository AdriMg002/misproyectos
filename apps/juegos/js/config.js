// ===== CONFIGURACIÓN Y VARIABLES GLOBALES =====
const usuarioActual = localStorage.getItem('usuarioActual');
const esAdmin = localStorage.getItem('esAdmin') === 'true';

if (!usuarioActual) {
    window.location.href = '/selector.html';
}

let juegosCompartidos = [];
let estadoUsuario = {};
let logrosJuegos = {};

let editandoId = null;
let imagenTemporal = null;

// Constantes compartidas
const ICONO_DIFICULTAD = { 'Fácil': '🟢', 'Normal': '🟡', 'Difícil': '🟠', 'Muy Difícil': '🔴' };
const ICONO_PROGRESO = { 'Pendiente': '📅', 'Jugando': '🎮', 'Completado': '✅', 'Platino': '🏆', 'Abandonado': '❌' };
const COLOR_PROGRESO = { 'Pendiente': '#888', 'Jugando': '#3498db', 'Completado': '#4ecca3', 'Platino': '#f0a500', 'Abandonado': '#e94560' };

function obtenerNombreArchivo(nombreJuego) {
    return nombreJuego.toLowerCase().replace(/\s+/g, '');
}

// ===== LLAMADAS A LA API =====

async function guardarEstadoServidor() {
    // No esperar la respuesta, fuego y olvido
    fetch('/api/estado-todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioActual, estado: estadoUsuario }),
        cache: 'no-store'
    }).catch(e => console.warn('Error guardando estado:', e));
}

async function guardarLogrosServidor(juegoId) {
    try {
        await fetch('/api/logros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioActual, juegoId, logros: logrosJuegos[juegoId] || [] })
        });
    } catch (error) {
        console.warn('⚠️ No se pudieron guardar logros:', error.message);
    }
}

async function apiGuardarJuego(juego, esEdicion) {
    let respuesta;
    if (esEdicion) {
        respuesta = await fetch(`/api/juegos/${juego.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioActual, juego })
        });
    } else {
        respuesta = await fetch('/api/juegos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: usuarioActual, juego })
        });
    }
    return await respuesta.json();
}

async function apiEliminarJuego(id) {
    await fetch(`/api/juegos/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioActual })
    });
}

async function apiCargarJuegos() {
    const res = await fetch('/api/juegos');
    return await res.json();
}

async function apiCargarEstado() {
    const res = await fetch(`/api/estado/${usuarioActual}`);
    return await res.json();
}

async function apiCargarLogros() {
    const res = await fetch('/api/logros');
    return await res.json();
}