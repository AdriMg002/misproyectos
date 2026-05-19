const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 8080;

// ===== CONEXIÓN A MONGODB =====
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ FALTA MONGODB_URI en variables de entorno');
    process.exit(1);
}

// Esperar a que MongoDB conecte antes de iniciar el servidor
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Conectado a MongoDB');
        
        app.listen(PORT, () => {
            console.log(`🎮 Servidor activo en: http://localhost:${PORT}`);
            console.log(`✅ Usando MongoDB para persistencia de datos`);
        });
    })
    .catch(err => {
        console.error('❌ Error conectando a MongoDB:', err);
        console.error('⚠️ El servidor NO se iniciará sin MongoDB');
        process.exit(1);
    });

// ===== SCHEMAS =====
const UsuarioSchema = new mongoose.Schema({
    usuario: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    admin: { type: Boolean, default: false },
    fechaCreacion: { type: Date, default: Date.now }
});
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const JuegoSchema = new mongoose.Schema({
    id: { type: Number, unique: true, required: true },
    nombre: String,
    plataforma: String,
    imagenData: String,
    precio: Number,
    rutaPersonalizada: String
});
const Juego = mongoose.model('Juego', JuegoSchema);

const EstadoSchema = new mongoose.Schema({
    usuario: { type: String, required: true },
    juegoId: { type: Number, required: true },
    estado: { type: mongoose.Schema.Types.Mixed, default: {} }
});
EstadoSchema.index({ usuario: 1, juegoId: 1 }, { unique: true });
const Estado = mongoose.model('Estado', EstadoSchema);

const LogroSchema = new mongoose.Schema({
    juegoId: { type: Number, unique: true, required: true },
    logros: { type: Array, default: [] }
});
const Logro = mongoose.model('Logro', LogroSchema);

const EmuladorSchema = new mongoose.Schema({
    plataforma: { type: String, unique: true, required: true },
    ruta: String
});
const Emulador = mongoose.model('Emulador', EmuladorSchema);

const ConfiguracionSchema = new mongoose.Schema({
    usuario: { type: String, unique: true, required: true },
    vista: { type: String, default: 'clasica' }
});
const Configuracion = mongoose.model('Configuracion', ConfiguracionSchema);

const PLATAFORMAS = ['GBA', 'DS', '3DS', 'PSP', 'PS2', 'PS3', 'PS4', 'PS5', 'Switch', 'Switch 2', 'PC'];

// ===== ESTADO DE EJECUCIÓN (sigue en archivo porque es temporal) =====
let juegosEnEjecucion = {};
const ejecucionFile = path.join(__dirname, 'data', 'ejecucion.json');
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function cargarEjecucion() {
    if (fs.existsSync(ejecucionFile)) {
        try { juegosEnEjecucion = JSON.parse(fs.readFileSync(ejecucionFile, 'utf8')); } catch(e) {}
    }
}
function guardarEjecucion() {
    fs.writeFileSync(ejecucionFile, JSON.stringify(juegosEnEjecucion, null, 2));
}
cargarEjecucion();

app.use(express.static(__dirname));
app.get('/', (req, res) => { res.redirect('/login.html'); });
app.use('/apps/juegos', express.static(path.join(__dirname, 'apps', 'juegos')));
app.use('/apps/banco', express.static(path.join(__dirname, 'apps', 'banco')));
app.use(express.json({ limit: '50mb' }));

// ===== FUNCIONES AUXILIARES =====
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function esAdmin(usuario) {
    if (usuario.toLowerCase().startsWith('adm')) return true;
    const user = await Usuario.findOne({ usuario: usuario.toLowerCase() });
    return user ? user.admin === true : false;
}

// ===== RUTAS DE USUARIOS =====
app.post('/api/registro', async (req, res) => {
    const { usuario, password } = req.body;
    if (!usuario || !password) return res.json({ ok: false, error: 'Usuario y contraseña requeridos' });
    if (usuario.length < 3) return res.json({ ok: false, error: 'El usuario debe tener al menos 3 caracteres' });
    if (password.length < 4) return res.json({ ok: false, error: 'La contraseña debe tener al menos 4 caracteres' });

    const existe = await Usuario.findOne({ usuario: usuario.toLowerCase() });
    if (existe) return res.json({ ok: false, error: 'El usuario ya existe' });

    const admin = usuario.toLowerCase().startsWith('adm');
    const nuevoUsuario = new Usuario({ usuario, password: hashPassword(password), admin });
    await nuevoUsuario.save();
    res.json({ ok: true, mensaje: 'Usuario creado correctamente', admin });
});

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    const user = await Usuario.findOne({ usuario: usuario.toLowerCase() });
    if (!user) return res.json({ ok: false, error: 'Usuario no encontrado' });
    if (user.password !== hashPassword(password)) return res.json({ ok: false, error: 'Contraseña incorrecta' });
    res.json({ ok: true, usuario: user.usuario, admin: await esAdmin(user.usuario) });
});

app.get('/api/usuarios', async (req, res) => {
    const { usuario } = req.query;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    const usuarios = await Usuario.find({}, { password: 0 });
    res.json({ ok: true, usuarios });
});

app.post('/api/usuarios/cambiar-password', async (req, res) => {
    const { usuario, usuarioObjetivo, nuevaPassword } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    await Usuario.updateOne({ usuario: usuarioObjetivo.toLowerCase() }, { password: hashPassword(nuevaPassword) });
    res.json({ ok: true });
});

app.post('/api/usuarios/hacer-admin', async (req, res) => {
    const { usuario, usuarioObjetivo } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    await Usuario.updateOne({ usuario: usuarioObjetivo.toLowerCase() }, { admin: true });
    res.json({ ok: true });
});

app.post('/api/usuarios/quitar-admin', async (req, res) => {
    const { usuario, usuarioObjetivo } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    await Usuario.updateOne({ usuario: usuarioObjetivo.toLowerCase() }, { admin: false });
    res.json({ ok: true });
});

app.delete('/api/usuarios/:usuarioObjetivo', async (req, res) => {
    const { usuario } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    await Usuario.deleteOne({ usuario: req.params.usuarioObjetivo.toLowerCase() });
    await Estado.deleteMany({ usuario: req.params.usuarioObjetivo.toLowerCase() });
    res.json({ ok: true });
});

// ===== RUTAS DE JUEGOS =====
app.get('/api/juegos', async (req, res) => {
    const juegos = await Juego.find();
    res.json(juegos);
});

app.post('/api/juegos', async (req, res) => {
    const { usuario, juego } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    
    const existe = await Juego.findOne({ nombre: juego.nombre, plataforma: juego.plataforma });
    if (existe) return res.json({ ok: false, error: 'Ya existe un juego con ese nombre y plataforma' });
    
    const nuevoJuego = new Juego(juego);
    await nuevoJuego.save();
    const juegos = await Juego.find();
    res.json({ ok: true, juegos });
});

app.put('/api/juegos/:id', async (req, res) => {
    const { usuario, juego } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    
    await Juego.updateOne({ id: parseInt(req.params.id) }, juego);
    const juegos = await Juego.find();
    res.json({ ok: true, juegos });
});

app.delete('/api/juegos/:id', async (req, res) => {
    const { usuario } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    
    await Juego.deleteOne({ id: parseInt(req.params.id) });
    const juegos = await Juego.find();
    res.json({ ok: true, juegos });
});

// ===== RUTAS DE LOGROS =====
app.get('/api/logros', async (req, res) => {
    const logros = await Logro.find();
    const resultado = {};
    logros.forEach(l => { resultado[l.juegoId] = l.logros; });
    res.json(resultado);
});

app.post('/api/logros', async (req, res) => {
    const { usuario, juegoId, logros } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    
    await Logro.updateOne({ juegoId }, { logros }, { upsert: true });
    res.json({ ok: true });
});

// ===== RUTAS DE ESTADO DE USUARIO =====
app.post('/api/estado-todo', async (req, res) => {
    const { usuario, estado } = req.body;
    if (!usuario) return res.json({ ok: false, error: 'Usuario requerido' });
    
    // Eliminar estados antiguos y guardar nuevos
    await Estado.deleteMany({ usuario });
    for (const [juegoId, estadoJuego] of Object.entries(estado)) {
        const nuevoEstado = new Estado({ usuario, juegoId: parseInt(juegoId), estado: estadoJuego });
        await nuevoEstado.save();
    }
    console.log(`💾 Estado completo guardado para ${usuario}`);
    res.json({ ok: true });
});

app.get('/api/estado/:usuario', async (req, res) => {
    const estados = await Estado.find({ usuario: req.params.usuario });
    const resultado = {};
    estados.forEach(e => { resultado[e.juegoId] = e.estado; });
    res.json(resultado);
});

app.post('/api/estado', async (req, res) => {
    const { usuario, juegoId, estado: estadoJuego } = req.body;
    if (!usuario || juegoId === undefined) return res.json({ ok: false, error: 'Datos incompletos' });
    
    await Estado.updateOne(
        { usuario, juegoId },
        { estado: estadoJuego },
        { upsert: true }
    );
    console.log(`💾 Estado guardado para ${usuario}: juego ${juegoId}`);
    res.json({ ok: true });
});

// ===== RUTAS DE EMULADORES =====
app.get('/api/emuladores', async (req, res) => {
    const emuladores = await Emulador.find();
    const resultado = {};
    emuladores.forEach(e => { resultado[`rom_${e.plataforma}`] = e.ruta; });
    res.json(resultado);
});

app.post('/api/emuladores', async (req, res) => {
    const { usuario, emuladores: emus } = req.body;
    if (!(await esAdmin(usuario))) return res.json({ ok: false, error: 'Solo administradores' });
    
    for (const [key, ruta] of Object.entries(emus)) {
        const plataforma = key.replace('rom_', '');
        await Emulador.updateOne({ plataforma }, { ruta }, { upsert: true });
    }
    res.json({ ok: true });
});

// ===== CONFIGURACIÓN DE USUARIO =====
app.get('/api/configuracion/:usuario', async (req, res) => {
    const config = await Configuracion.findOne({ usuario: req.params.usuario });
    res.json(config || { vista: 'clasica' });
});

app.post('/api/configuracion', async (req, res) => {
    const { usuario, config: configUsuario } = req.body;
    await Configuracion.updateOne({ usuario }, configUsuario, { upsert: true });
    res.json({ ok: true });
});

// ===== EL RESTO DE LAS RUTAS (descargas, ejecutar, etc.) SIGUEN IGUAL =====
// ... (mantén todas las rutas de descargas, ejecutar juegos, etc. como están)

const descargasActivas = {};

app.post('/api/descargar', (req, res) => {
    const { usuario, juegoId } = req.body;
    // ... (código original de descarga)
    res.json({ ok: true });
});

// ... (el resto de rutas: /api/verificar-rom, /api/generar-bat, /api/desinstalar, /api/ejecutar-juego, etc.)

app.listen(PORT, () => {
    console.log(`🎮 Servidor activo en: http://localhost:${PORT}`);
    console.log(`✅ Usando MongoDB para persistencia de datos`);
});