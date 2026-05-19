// server.js 
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const PLATAFORMAS = ['GBA', 'DS', '3DS', 'PSP', 'PS2', 'PS3', 'PS4', 'PS5', 'Switch', 'Switch 2', 'PC'];

// Crear carpetas si no existen
const backupDir = path.join(__dirname, 'backup');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// ===== ESTADO DE EJECUCIÓN PERSISTIDO =====
let juegosEnEjecucion = {};
const ejecucionFile = path.join(dataDir, 'ejecucion.json');

function cargarEjecucion() {
    if (fs.existsSync(ejecucionFile)) {
        try { juegosEnEjecucion = JSON.parse(fs.readFileSync(ejecucionFile, 'utf8')); } catch(e) {}
    }
}
function guardarEjecucion() {
    fs.writeFileSync(ejecucionFile, JSON.stringify(juegosEnEjecucion, null, 2));
}
cargarEjecucion();

// Archivo de usuarios
const usuariosFile = path.join(dataDir, 'usuarios.json');
if (!fs.existsSync(usuariosFile)) {
    fs.writeFileSync(usuariosFile, JSON.stringify({ usuarios: [] }, null, 2));
}

// Archivo maestro de juegos (compartido)
const juegosFile = path.join(backupDir, 'backup.json');
if (!fs.existsSync(juegosFile)) {
    fs.writeFileSync(juegosFile, JSON.stringify([], null, 2));
}

app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.redirect('/login.html');
});
app.use('/apps/juegos', express.static(path.join(__dirname, 'apps', 'juegos')));
app.use('/apps/banco', express.static(path.join(__dirname, 'apps', 'banco')));
app.use(express.json({ limit: '50mb' }));

// ===== FUNCIONES AUXILIARES =====

function leerUsuarios() {
    const data = fs.readFileSync(usuariosFile, 'utf8');
    return JSON.parse(data);
}

function guardarUsuarios(data) {
    fs.writeFileSync(usuariosFile, JSON.stringify(data, null, 2));
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function esAdmin(usuario) {
    // Primero verifica por el nombre (para el admin inicial "admin")
    if (usuario.toLowerCase().startsWith('adm')) return true;
    
    // Luego verifica en la base de datos
    const data = leerUsuarios();
    const user = data.usuarios.find(u => u.usuario.toLowerCase() === usuario.toLowerCase());
    return user ? user.admin === true : false;
}

function leerJuegos() {
    const data = fs.readFileSync(juegosFile, 'utf8');
    return JSON.parse(data);
}

function guardarJuegos(juegos) {
    fs.writeFileSync(juegosFile, JSON.stringify(juegos, null, 2));
}

function leerEstadoUsuario(usuario) {
    const estadoFile = path.join(backupDir, `${usuario}.json`);
    if (!fs.existsSync(estadoFile)) {
        return {};
    }
    const data = fs.readFileSync(estadoFile, 'utf8');
    return JSON.parse(data);
}

function guardarEstadoUsuario(usuario, estado) {
    const estadoFile = path.join(backupDir, `${usuario}.json`);
    fs.writeFileSync(estadoFile, JSON.stringify(estado, null, 2));
}

// ===== RUTAS DE USUARIOS =====

app.post('/api/registro', (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.json({ ok: false, error: 'Usuario y contraseña requeridos' });
    }

    if (usuario.length < 3) {
        return res.json({ ok: false, error: 'El usuario debe tener al menos 3 caracteres' });
    }

    if (password.length < 4) {
        return res.json({ ok: false, error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const data = leerUsuarios();

    if (data.usuarios.find(u => u.usuario.toLowerCase() === usuario.toLowerCase())) {
        return res.json({ ok: false, error: 'El usuario ya existe' });
    }

     const admin = usuario.toLowerCase().startsWith('adm');

    const nuevoUsuario = {
        usuario: usuario,
        password: hashPassword(password),
        admin: admin,
        fechaCreacion: new Date().toISOString()
    };

    data.usuarios.push(nuevoUsuario);
    guardarUsuarios(data);
    guardarEstadoUsuario(usuario, {});

    res.json({ ok: true, mensaje: 'Usuario creado correctamente', admin: admin });
});

app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.json({ ok: false, error: 'Usuario y contraseña requeridos' });
    }

    const data = leerUsuarios();
    const user = data.usuarios.find(u => u.usuario.toLowerCase() === usuario.toLowerCase());

    if (!user) {
        return res.json({ ok: false, error: 'Usuario no encontrado' });
    }

    if (user.password !== hashPassword(password)) {
        return res.json({ ok: false, error: 'Contraseña incorrecta' });
    }

    res.json({ ok: true, usuario: user.usuario, admin: esAdmin(user.usuario) });
});

// ===== RUTAS DE ADMINISTRACIÓN DE USUARIOS =====

app.get('/api/usuarios', (req, res) => {
    const { usuario } = req.query;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo administradores' });
    }

    const data = leerUsuarios();
    const usuariosSeguros = data.usuarios.map(u => ({
        usuario: u.usuario,
        admin: u.admin,
        fechaCreacion: u.fechaCreacion
    }));
    res.json({ ok: true, usuarios: usuariosSeguros });
});

app.post('/api/usuarios/ver-password', (req, res) => {
    const { usuario, usuarioConsultado } = req.body;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo administradores' });
    }

    const data = leerUsuarios();
    const user = data.usuarios.find(u => u.usuario.toLowerCase() === usuarioConsultado.toLowerCase());

    if (!user) {
        return res.json({ ok: false, error: 'Usuario no encontrado' });
    }

    res.json({ ok: true, hash: user.password });
});

app.post('/api/usuarios/cambiar-password', (req, res) => {
    const { usuario, usuarioObjetivo, nuevaPassword } = req.body;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo administradores' });
    }

    if (!nuevaPassword || nuevaPassword.length < 4) {
        return res.json({ ok: false, error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const data = leerUsuarios();
    const user = data.usuarios.find(u => u.usuario.toLowerCase() === usuarioObjetivo.toLowerCase());

    if (!user) {
        return res.json({ ok: false, error: 'Usuario no encontrado' });
    }

    user.password = hashPassword(nuevaPassword);
    guardarUsuarios(data);

    console.log(`🔒 Admin ${usuario} cambió la contraseña de ${usuarioObjetivo}`);
    res.json({ ok: true, mensaje: `Contraseña de ${usuarioObjetivo} actualizada` });
});

app.delete('/api/usuarios/:usuarioObjetivo', (req, res) => {
    const { usuario } = req.body;
    const usuarioObjetivo = req.params.usuarioObjetivo;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo administradores' });
    }

    if (esAdmin(usuarioObjetivo) && usuario.toLowerCase() !== usuarioObjetivo.toLowerCase()) {
        return res.json({ ok: false, error: 'No puedes eliminar a otro administrador' });
    }

    const data = leerUsuarios();
    data.usuarios = data.usuarios.filter(u => u.usuario.toLowerCase() !== usuarioObjetivo.toLowerCase());
    guardarUsuarios(data);

    const estadoFile = path.join(backupDir, `${usuarioObjetivo}.json`);
    if (fs.existsSync(estadoFile)) {
        fs.unlinkSync(estadoFile);
    }

    console.log(`🗑️ Admin ${usuario} eliminó al usuario ${usuarioObjetivo}`);
    res.json({ ok: true, mensaje: `Usuario ${usuarioObjetivo} eliminado` });
});

// ===== RUTAS DE JUEGOS =====

app.get('/api/juegos', (req, res) => {
    const juegos = leerJuegos();
    res.json(juegos);
});

app.post('/api/juegos', (req, res) => {
    const { usuario, juego } = req.body;

    const juegos = leerJuegos();

    const existe = juegos.find(j =>
        j.nombre.toLowerCase() === juego.nombre.toLowerCase() &&
        j.plataforma === juego.plataforma
    );
    if (existe) {
        return res.json({ ok: false, error: 'Ya existe un juego con ese nombre y plataforma' });
    }

    juegos.push(juego);
    guardarJuegos(juegos);

    console.log(`🎮 Juego añadido por admin ${usuario}: ${juego.nombre} (${juego.plataforma})`);
    res.json({ ok: true, juegos: juegos });
});

app.put('/api/juegos/:id', (req, res) => {
    const { usuario, juego } = req.body;
    const id = parseInt(req.params.id);

    let juegos = leerJuegos();
    const index = juegos.findIndex(j => j.id === id);

    if (index === -1) {
        return res.json({ ok: false, error: 'Juego no encontrado' });
    }

    juegos[index] = { ...juegos[index], ...juego };
    guardarJuegos(juegos);

    console.log(`✏️ Juego editado por admin ${usuario}: ${juego.nombre}, precio: ${juego.precio}`);
    res.json({ ok: true, juegos: juegos });
});

app.delete('/api/juegos/:id', (req, res) => {
    const { usuario } = req.body;
    const id = parseInt(req.params.id);

    let juegos = leerJuegos();
    const juegoEliminado = juegos.find(j => j.id === id);
    juegos = juegos.filter(j => j.id !== id);
    guardarJuegos(juegos);

    console.log(`🗑️ Juego eliminado por admin ${usuario}: ${juegoEliminado ? juegoEliminado.nombre : id}`);
    res.json({ ok: true, juegos: juegos });
});

// ===== RUTAS DE LOGROS =====

const logrosFile = path.join(dataDir, 'logros.json');
if (!fs.existsSync(logrosFile)) {
    fs.writeFileSync(logrosFile, JSON.stringify({}, null, 2));
}

function leerLogros() {
    const data = fs.readFileSync(logrosFile, 'utf8');
    return JSON.parse(data);
}

function guardarLogros(data) {
    fs.writeFileSync(logrosFile, JSON.stringify(data, null, 2));
}

app.get('/api/logros', (req, res) => {
    const logros = leerLogros();
    res.json(logros);
});

app.post('/api/logros', (req, res) => {
    const { usuario, juegoId, logros } = req.body;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo administradores' });
    }

    const todosLogros = leerLogros();
    todosLogros[juegoId] = logros;
    guardarLogros(todosLogros);

    console.log(`🏆 Logros guardados para juego ${juegoId}: ${logros.length} logros`);
    res.json({ ok: true });
});

// ===== RUTAS DE ESTADO DE USUARIO =====

app.post('/api/estado-todo', (req, res) => {
    const { usuario, estado } = req.body;

    if (!usuario) {
        return res.json({ ok: false, error: 'Usuario requerido' });
    }

    guardarEstadoUsuario(usuario, estado || {});

    console.log(`💾 Estado completo guardado para ${usuario}`);
    res.json({ ok: true });
});

app.get('/api/estado/:usuario', (req, res) => {
    const usuario = req.params.usuario;
    const estado = leerEstadoUsuario(usuario);
    res.json(estado);
});

app.post('/api/estado', (req, res) => {
    const { usuario, juegoId, estado: estadoJuego } = req.body;

    if (!usuario || juegoId === undefined) {
        return res.json({ ok: false, error: 'Datos incompletos' });
    }

    const estado = leerEstadoUsuario(usuario);
    estado[juegoId] = estadoJuego;
    guardarEstadoUsuario(usuario, estado);

    console.log(`💾 Estado guardado para ${usuario}: juego ${juegoId}`);
    res.json({ ok: true });
});

// ===== RUTAS DE EMULADORES =====

const emuladoresFile = path.join(dataDir, 'emuladores.json');
if (!fs.existsSync(emuladoresFile)) {
    fs.writeFileSync(emuladoresFile, JSON.stringify({}, null, 2));
}

function leerEmuladores() {
    const data = fs.readFileSync(emuladoresFile, 'utf8');
    return JSON.parse(data);
}

function guardarEmuladores(data) {
    fs.writeFileSync(emuladoresFile, JSON.stringify(data, null, 2));
}

app.get('/api/emuladores', (req, res) => {
    const emuladores = leerEmuladores();
    res.json(emuladores);
});

app.post('/api/emuladores', (req, res) => {
    const { usuario, emuladores: emus } = req.body;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo el administrador puede configurar los emuladores' });
    }

    guardarEmuladores(emus);
    console.log(`⚙️ Admin ${usuario} actualizó la configuración de emuladores`);
    res.json({ ok: true });
});

// ===== DESCARGAR ROM =====

app.post('/api/descargar', (req, res) => {
    const { usuario, juegoId } = req.body;

    const juegos = leerJuegos();
    const juego = juegos.find(j => j.id === parseInt(juegoId));
    if (!juego) {
        return res.json({ ok: false, error: 'Juego no encontrado' });
    }

    const emuladores = leerEmuladores();
    const rutaRom = emuladores[`rom_${juego.plataforma}`];

    if (!rutaRom) {
        return res.json({ ok: false, error: `El administrador no ha configurado la carpeta de ROMs para ${juego.plataforma}` });
    }

    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const extensiones = ['.gba', '.nds', '.3ds', '.cia', '.iso', '.pbp', '.cso', '.bin', '.nsp', '.xci', '.chd', '.cue'];

    let romEncontrada = null;
    for (const ext of extensiones) {
        const rutaCompleta = path.join(rutaRom, nombreArchivo + ext);
        if (fs.existsSync(rutaCompleta)) {
            romEncontrada = rutaCompleta;
            break;
        }
    }

    if (!romEncontrada) {
        return res.json({ ok: false, error: `ROM no encontrada: ${nombreArchivo}.* en ${rutaRom}` });
    }

    const carpetaDestino = path.join(__dirname, 'Juegos', juego.plataforma);
    if (!fs.existsSync(carpetaDestino)) {
        fs.mkdirSync(carpetaDestino, { recursive: true });
    }

    const nombreDescarga = nombreArchivo + path.extname(romEncontrada);
    const rutaDestino = path.join(carpetaDestino, nombreDescarga);

    const stats = fs.statSync(romEncontrada);
    const totalSize = stats.size;

    descargasActivas[juegoId] = 0;
    descargasActivas[juegoId + '_total'] = totalSize;

    const readStream = fs.createReadStream(romEncontrada);
    const writeStream = fs.createWriteStream(rutaDestino);
    let bytesCopied = 0;
    let lastUpdate = 0;

    readStream.on('data', (chunk) => {
        bytesCopied += chunk.length;
        const now = Date.now();
        if (now - lastUpdate > 100 || bytesCopied === totalSize) {
            lastUpdate = now;
            const progreso = Math.round((bytesCopied / totalSize) * 100);
            descargasActivas[juegoId] = progreso;
        }
    });

    readStream.on('error', (err) => {
        console.error('Error al leer:', err);
        delete descargasActivas[juegoId];
        delete descargasActivas[juegoId + '_total'];
        if (!res.headersSent) {
            res.json({ ok: false, error: 'Error al leer la ROM' });
        }
    });

    writeStream.on('error', (err) => {
        console.error('Error al escribir:', err);
        delete descargasActivas[juegoId];
        delete descargasActivas[juegoId + '_total'];
        if (!res.headersSent) {
            res.json({ ok: false, error: 'Error al guardar la ROM' });
        }
    });

    writeStream.on('finish', () => {
        descargasActivas[juegoId] = 100;
        setTimeout(() => {
            delete descargasActivas[juegoId];
            delete descargasActivas[juegoId + '_total'];
        }, 3000);
        console.log(`📥 ${usuario} descargó: ${nombreDescarga} → Juegos/${juego.plataforma}/ (${(totalSize / (1024*1024)).toFixed(1)} MB)`);
        res.json({ ok: true, mensaje: `ROM copiada a Juegos\\${juego.plataforma}\\${nombreDescarga}`, tamano: totalSize });
    });

    readStream.pipe(writeStream);
});

app.post('/api/verificar-rom', (req, res) => {
    const { juegoId } = req.body;

    const juegos = leerJuegos();
    const juego = juegos.find(j => j.id === parseInt(juegoId));
    if (!juego) {
        return res.json({ existeLocal: false, existeUSB: false });
    }

    if (juego.rutaPersonalizada && juego.rutaPersonalizada.trim() !== '') {
        return res.json({ existeLocal: true, existeUSB: false });
    }

    const emuladores = leerEmuladores();
    const rutaUSB = emuladores[`rom_${juego.plataforma}`];
    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const extensiones = ['.gba', '.nds', '.3ds', '.cia', '.iso', '.pbp', '.cso', '.bin', '.nsp', '.xci', '.chd', '.cue'];

    const carpetaLocal = path.join(__dirname, 'Juegos', juego.plataforma);
    let existeLocal = false;
    if (fs.existsSync(carpetaLocal)) {
        for (const ext of extensiones) {
            if (fs.existsSync(path.join(carpetaLocal, nombreArchivo + ext))) {
                existeLocal = true;
                break;
            }
        }
    }

    let existeUSB = false;
    if (rutaUSB) {
        for (const ext of extensiones) {
            if (fs.existsSync(path.join(rutaUSB, nombreArchivo + ext))) {
                existeUSB = true;
                break;
            }
        }
    }

    res.json({ existeLocal, existeUSB });
});

app.post('/api/generar-bat', (req, res) => {
    const { juegoId } = req.body;

    const juegos = leerJuegos();
    const juego = juegos.find(j => j.id === parseInt(juegoId));
    if (!juego) {
        return res.json({ ok: false, error: 'Juego no encontrado' });
    }

    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const extensiones = ['.gba', '.nds', '.3ds', '.cia', '.iso', '.pbp', '.cso', '.bin', '.nsp', '.xci', '.chd', '.cue'];
    const carpetaLocal = path.join(__dirname, 'Juegos', juego.plataforma);

    let romLocal = null;
    if (fs.existsSync(carpetaLocal)) {
        for (const ext of extensiones) {
            const rutaCompleta = path.join(carpetaLocal, nombreArchivo + ext);
            if (fs.existsSync(rutaCompleta)) {
                romLocal = rutaCompleta;
                break;
            }
        }
    }

    if (!romLocal) {
        return res.json({ ok: false, error: 'ROM no encontrada en local. Descárgala primero.' });
    }

    const carpetaEmulador = path.join(__dirname, 'emuladores', juego.plataforma);
    const emuladorExe = path.join(carpetaEmulador, juego.plataforma.toLowerCase() + '.exe');

    if (!fs.existsSync(emuladorExe)) {
        return res.json({ ok: false, error: `Emulador no encontrado: ${emuladorExe}` });
    }

    const batContent = `@echo off
title ${juego.nombre}
echo 🎮 Iniciando ${juego.nombre}...
echo Emulador: ${emuladorExe}
echo ROM: ${romLocal}
echo.
if not exist "${emuladorExe}" (
    echo ❌ ERROR: No se encuentra el emulador
    echo Ruta: ${emuladorExe}
    pause
    exit /b 1
)
if not exist "${romLocal}" (
    echo ❌ ERROR: No se encuentra la ROM
    echo Ruta: ${romLocal}
    pause
    exit /b 1
)
echo ✅ Todo correcto. Iniciando...
start "" "${emuladorExe}" "${romLocal}"
echo ✅ Juego iniciado.
exit
`;

    const nombreBat = nombreArchivo + '.bat';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreBat}"`);
    res.send(batContent);

    console.log(`🎮 .bat generado para ${juego.nombre}`);
});

app.post('/api/desinstalar', (req, res) => {
    const { juegoId } = req.body;

    const juegos = leerJuegos();
    const juego = juegos.find(j => j.id === parseInt(juegoId));
    if (!juego) {
        return res.json({ ok: false, error: 'Juego no encontrado' });
    }

    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const extensiones = ['.gba', '.nds', '.3ds', '.cia', '.iso', '.pbp', '.cso', '.bin', '.nsp', '.xci', '.chd', '.cue'];
    const carpetaLocal = path.join(__dirname, 'Juegos', juego.plataforma);

    let eliminado = false;
    if (fs.existsSync(carpetaLocal)) {
        for (const ext of extensiones) {
            const rutaCompleta = path.join(carpetaLocal, nombreArchivo + ext);
            if (fs.existsSync(rutaCompleta)) {
                fs.unlinkSync(rutaCompleta);
                eliminado = true;
                console.log(`🗑️ ROM eliminada: ${nombreArchivo}${ext}`);
                break;
            }
        }
    }

    if (eliminado) {
        res.json({ ok: true });
    } else {
        res.json({ ok: false, error: 'ROM no encontrada en local' });
    }
});

app.post('/api/info-rom', (req, res) => {
    const { juegoId } = req.body;

    const juegos = leerJuegos();
    const juego = juegos.find(j => j.id === parseInt(juegoId));
    if (!juego) {
        return res.json({ ok: false, error: 'Juego no encontrado' });
    }

    const emuladores = leerEmuladores();
    const rutaUSB = emuladores[`rom_${juego.plataforma}`];

    if (!rutaUSB) {
        return res.json({ ok: false, error: 'Carpeta de ROMs no configurada' });
    }

    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const extensiones = ['.gba', '.nds', '.3ds', '.cia', '.iso', '.pbp', '.cso', '.bin', '.nsp', '.xci', '.chd', '.cue'];

    for (const ext of extensiones) {
        const rutaCompleta = path.join(rutaUSB, nombreArchivo + ext);
        if (fs.existsSync(rutaCompleta)) {
            const stats = fs.statSync(rutaCompleta);
            return res.json({ ok: true, tamano: stats.size, nombre: nombreArchivo + ext });
        }
    }

    res.json({ ok: false, error: 'ROM no encontrada' });
});

// ===== PROGRESO DE DESCARGA =====

const descargasActivas = {};

app.get('/api/progreso-descarga/:juegoId', (req, res) => {
    const { juegoId } = req.params;
    const progreso = descargasActivas[juegoId];

    if (progreso !== undefined) {
        res.json({ ok: true, progreso: progreso, total: descargasActivas[juegoId + '_total'] || 0 });
    } else {
        res.json({ ok: false });
    }
});

app.delete('/api/progreso-descarga/:juegoId', (req, res) => {
    const { juegoId } = req.params;
    delete descargasActivas[juegoId];
    delete descargasActivas[juegoId + '_total'];
    res.json({ ok: true });
});

// ===== CONFIGURACIÓN DE USUARIO =====

const configFile = path.join(dataDir, 'configuracion.json');
if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify({}, null, 2));
}

function leerConfiguracion() {
    const data = fs.readFileSync(configFile, 'utf8');
    return JSON.parse(data);
}

function guardarConfiguracion(data) {
    fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
}

app.get('/api/configuracion/:usuario', (req, res) => {
    const config = leerConfiguracion();
    res.json(config[req.params.usuario] || { vista: 'clasica' });
});

app.post('/api/configuracion', (req, res) => {
    const { usuario, config: configUsuario } = req.body;
    const config = leerConfiguracion();
    config[usuario] = configUsuario;
    guardarConfiguracion(config);
    res.json({ ok: true });
});

// ===== EJECUTAR / DETENER JUEGOS =====

app.post('/api/ejecutar-juego', (req, res) => {
    const { juegoId } = req.body;

    const juegos = leerJuegos();
    const juego = juegos.find(j => j.id === parseInt(juegoId));
    if (!juego) return res.json({ ok: false, error: 'Juego no encontrado' });

    // Si tiene ruta personalizada, ejecutar directamente
    if (juego.rutaPersonalizada && juego.rutaPersonalizada.trim() !== '') {
        if (!fs.existsSync(juego.rutaPersonalizada)) {
            return res.json({ ok: false, error: 'No se encuentra el ejecutable: ' + juego.rutaPersonalizada });
        }
        const batFile = path.join(__dirname, 'jugar.bat');
        const batContent = `@echo off\ntitle ${juego.nombre}\necho 🎮 Ejecutando ${juego.nombre}...\nstart "" "${juego.rutaPersonalizada}"\nexit\n`;
        fs.writeFileSync(batFile, batContent);
        const { exec } = require('child_process');
        exec(`start "" "${batFile}"`, (error) => {
            if (error) return res.json({ ok: false, error: 'Error al ejecutar' });
            juegosEnEjecucion[`${juegoId}`] = true;
            guardarEjecucion(); // ← persistir
            res.json({ ok: true });
        });
        return;
    }

    const nombreArchivo = juego.nombre.toLowerCase().replace(/\s+/g, '');
    const carpetaLocal = path.join(__dirname, 'Juegos', juego.plataforma);
    const emuladorExe = path.join(__dirname, 'emuladores', juego.plataforma, juego.plataforma.toLowerCase() + '.exe');
    const batFile = path.join(__dirname, 'jugar.bat');

    if (!fs.existsSync(emuladorExe)) {
        return res.json({ ok: false, error: 'Emulador no encontrado: ' + emuladorExe });
    }

    const extensiones = ['.gba', '.nds', '.3ds', '.cia', '.iso', '.pbp', '.cso', '.bin', '.nsp', '.xci', '.chd', '.cue'];
    let romEncontrada = null;
    for (const ext of extensiones) {
        const ruta = path.join(carpetaLocal, nombreArchivo + ext);
        if (fs.existsSync(ruta)) {
            romEncontrada = ruta;
            break;
        }
    }

    if (!romEncontrada) {
        return res.json({ ok: false, error: 'ROM no encontrada' });
    }

    const batContent = `@echo off\ntitle ${juego.nombre}\necho 🎮 Iniciando ${juego.nombre}...\nstart "" "${emuladorExe}" "${romEncontrada}"\nexit\n`;
    fs.writeFileSync(batFile, batContent);

    const { exec } = require('child_process');
    exec(`start "" "${batFile}"`, (error) => {
        if (error) {
            console.error('Error al ejecutar:', error);
            return res.json({ ok: false, error: 'Error al ejecutar' });
        }
        console.log(`🎮 Ejecutando: ${juego.nombre}`);
        juegosEnEjecucion[juegoId] = true;
        guardarEjecucion(); // ← persistir
        res.json({ ok: true });
    });
});

app.post('/api/detener-juego', (req, res) => {
    const { exec } = require('child_process');
    const procesos = new Set();

    const juegos = leerJuegos();
    juegos.forEach(j => {
        if (j.rutaPersonalizada && j.rutaPersonalizada.trim() !== '') {
            const nombre = path.basename(j.rutaPersonalizada);
            procesos.add(nombre);
            procesos.add(nombre.replace('.exe', ''));
        }
    });

    const emuladores = leerEmuladores();
    PLATAFORMAS.forEach(p => {
        const ruta = emuladores[p];
        if (ruta) procesos.add(path.basename(ruta));
    });

    const carpetaEmuladores = path.join(__dirname, 'emuladores');
    if (fs.existsSync(carpetaEmuladores)) {
        fs.readdirSync(carpetaEmuladores).forEach(p => {
            procesos.add(p.toLowerCase() + '.exe');
        });
    }

    procesos.forEach(proc => {
        exec(`taskkill /f /im "${proc}"`, (err, stdout) => {
            if (err) console.log('Error matando:', proc, err.message);
            else console.log('✅ Cerrado:', proc);
        });
    });

    juegosEnEjecucion = {};
    guardarEjecucion(); // ← persistir vaciado
    res.json({ ok: true });
});

app.get('/api/emulador-abierto', (req, res) => {
    const { exec } = require('child_process');
    exec('tasklist', (err, stdout) => {
        if (err) return res.json({ abierto: false });
        const salida = stdout.toLowerCase();
        const emuladores = ['mgba.exe', 'visualboyadvance-m.exe', 'gba.exe', 'ppsspp.exe', 'desmume.exe', 'psp.exe',
            'citra.exe', 'pcsx2.exe', 'rpcs3.exe', 'yuzu.exe', 'ryujinx.exe', 'dolphin.exe', 'cemu.exe', 'xenia.exe'];

        const juegos = leerJuegos();
        juegos.forEach(j => {
            if (j.rutaPersonalizada && j.rutaPersonalizada.trim() !== '') {
                let nombre = path.basename(j.rutaPersonalizada);
                if (!nombre.toLowerCase().endsWith('.exe')) nombre += '.exe';
                emuladores.push(nombre.toLowerCase());
            }
        });

        const abierto = emuladores.some(emu => salida.includes(emu));
        if (!abierto) {
            juegosEnEjecucion = {};
            guardarEjecucion(); // ← persistir cuando se detecta que no hay nada abierto
        }
        res.json({ abierto });
    });
});

app.get('/api/juego-en-ejecucion', (req, res) => {
    res.json({ juegos: Object.keys(juegosEnEjecucion).map(Number) });
});

// ===== RUTAS DE ACCESORIOS =====

const accesoriosFile = path.join(dataDir, 'accesorios.json');
if (!fs.existsSync(accesoriosFile)) {
    fs.writeFileSync(accesoriosFile, JSON.stringify([], null, 2));
}

const estadoAccesoriosFile = path.join(dataDir, 'estadoAccesorios.json');
if (!fs.existsSync(estadoAccesoriosFile)) {
    fs.writeFileSync(estadoAccesoriosFile, JSON.stringify({}, null, 2));
}

function leerAccesorios() {
    const data = fs.readFileSync(accesoriosFile, 'utf8');
    return JSON.parse(data);
}

function guardarAccesorios(data) {
    fs.writeFileSync(accesoriosFile, JSON.stringify(data, null, 2));
}

function leerEstadoAccesorios() {
    const data = fs.readFileSync(estadoAccesoriosFile, 'utf8');
    return JSON.parse(data);
}

function guardarEstadoAccesorios(data) {
    fs.writeFileSync(estadoAccesoriosFile, JSON.stringify(data, null, 2));
}

app.get('/api/accesorios', (req, res) => {
    const accesorios = leerAccesorios();
    res.json(accesorios);
});

app.post('/api/accesorios', (req, res) => {
    const { usuario, accesorio, esEdicion } = req.body;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo el administrador puede añadir accesorios' });
    }

    const accesorios = leerAccesorios();

    if (esEdicion) {
        const index = accesorios.findIndex(a => a.id === accesorio.id);
        if (index !== -1) {
            accesorios[index] = accesorio;
        }
    } else {
        accesorios.push(accesorio);
    }

    guardarAccesorios(accesorios);
    console.log(`🔧 Admin ${usuario} guardó accesorio: ${accesorio.nombre}`);
    res.json({ ok: true });
});

app.delete('/api/accesorios/:id', (req, res) => {
    const { usuario } = req.body;
    const id = parseInt(req.params.id);

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo el administrador puede eliminar accesorios' });
    }

    let accesorios = leerAccesorios();
    accesorios = accesorios.filter(a => a.id !== id);
    guardarAccesorios(accesorios);

    console.log(`🗑️ Admin ${usuario} eliminó accesorio ${id}`);
    res.json({ ok: true });
});

app.get('/api/estado-accesorios/:usuario', (req, res) => {
    const estados = leerEstadoAccesorios();
    res.json(estados[req.params.usuario] || {});
});

app.post('/api/estado-accesorios', (req, res) => {
    const { usuario, accesorioId, estado } = req.body;
    const estados = leerEstadoAccesorios();
    
    if (!estados[usuario]) estados[usuario] = {};
    estados[usuario][accesorioId] = estado;
    
    guardarEstadoAccesorios(estados);
    res.json({ ok: true });
});

// ===== RUTAS DEL BANCO =====

const bancoDir = path.join(dataDir, 'banco');
if (!fs.existsSync(bancoDir)) fs.mkdirSync(bancoDir);

app.get('/api/banco/:usuario', (req, res) => {
    const archivo = path.join(bancoDir, `${req.params.usuario}.json`);
    if (!fs.existsSync(archivo)) {
        return res.json({ ingresos: [], gastos: [], prestamos: [] });
    }
    res.json(JSON.parse(fs.readFileSync(archivo, 'utf8')));
});

app.post('/api/banco', (req, res) => {
    const { usuario, datos } = req.body;
    const archivo = path.join(bancoDir, `${usuario}.json`);
    fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
    res.json({ ok: true });
});

// Hacer admin a un usuario
app.post('/api/usuarios/hacer-admin', (req, res) => {
    const { usuario, usuarioObjetivo } = req.body;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo administradores' });
    }

    const data = leerUsuarios();
    const user = data.usuarios.find(u => u.usuario.toLowerCase() === usuarioObjetivo.toLowerCase());

    if (!user) {
        return res.json({ ok: false, error: 'Usuario no encontrado' });
    }

    user.admin = true;
    guardarUsuarios(data);
    res.json({ ok: true });
});

// Quitar admin a un usuario
app.post('/api/usuarios/quitar-admin', (req, res) => {
    const { usuario, usuarioObjetivo } = req.body;

    if (!esAdmin(usuario)) {
        return res.json({ ok: false, error: 'Solo administradores' });
    }

    const data = leerUsuarios();
    const user = data.usuarios.find(u => u.usuario.toLowerCase() === usuarioObjetivo.toLowerCase());

    if (!user) {
        return res.json({ ok: false, error: 'Usuario no encontrado' });
    }

    user.admin = false;
    guardarUsuarios(data);
    res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎮 Servidor activo en: http://localhost:${PORT}`);
    console.log(`👥 Sistema de usuarios activo`);
    console.log(`👑 Usuarios que empiecen por "adm" son administradores`);
    console.log(`📁 Backup maestro: backup/backup.json`);
    console.log(`📁 Estados de usuario: backup/{usuario}.json`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});