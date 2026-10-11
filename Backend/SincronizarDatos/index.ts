import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';


const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'mydb',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).db = pool;
    next();
});

// Ruta de la carpeta Audios (montada como volumen en Docker).
const RUTA_AUDIOS = path.join(process.cwd(), 'Audios');

// Función para leer las líneas no vacías de un archivo de la carpeta Audios.
const leerLineasDeArchivo = (nombreArchivo: string): string[] => {
    const rutaArchivo = path.join(RUTA_AUDIOS, nombreArchivo);

    if (!fs.existsSync(rutaArchivo)) {
        console.log(`No se encontró el archivo ${nombreArchivo} en: ${rutaArchivo}`);
        return [];
    }

    // Dividir el contenido en líneas y limpiar espacios en blanco (incluido el \r de Windows)
    return fs.readFileSync(rutaArchivo, 'utf8')
        .split('\n')
        .map(linea => linea.trim())
        .filter(linea => linea.length > 0);
};

// Función para leer las preguntas desde el archivo rutaAudios.txt.
// Cada línea tiene el formato "Categoria/archivo.m4a|Respuesta".
const leerPreguntasDeArchivo = (): { ruta: string; categoria: string; respuesta: string }[] => {
    return leerLineasDeArchivo('rutaAudios.txt').map(linea => {
        const [rutaCruda, respuestaCruda] = linea.split('|');
        const ruta = rutaCruda.trim().replace(/\\/g, '/');
        const categoria = ruta.split('/')[0];

        // Si la línea no trae respuesta, se usa el nombre del archivo sin extensión
        const respuesta = respuestaCruda?.trim() || path.basename(ruta, path.extname(ruta));

        return { ruta, categoria, respuesta };
    });
};

// Función para sincronizar el admin, las categorías y las preguntas de la carpeta Audios con la base de datos.
// Es idempotente: solo inserta lo que todavía no existe.
const sincronizarDatos = async (pool: Pool): Promise<string[]> => {
    const arrayConfirmacion: string[] = [];

    // Parte 1: Creación del admin para asegurar su existencia.
    const [obtenerAdmin]: any = await pool.execute(
        'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
        ['admin@auscultify.com']
    );

    if (obtenerAdmin.length === 0) {

        // Creamos un string basico para encriptarlo y que sea la contraseña inicial del admin
        const salt = await bcrypt.genSalt(10);
        const contrasenaEncriptada = await bcrypt.hash('admin', salt);

        await pool.execute(
            `INSERT INTO Usuarios (
                correoElectronico, contrasena, totalPreguntasAcertadas,
                totalPreguntasFalladas, totalPreguntasContestadas, racha,
                esPublico, idCriterioMasUsado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['admin@auscultify.com', contrasenaEncriptada, 0, 0, 0, 0, 0, 1]
        );

        arrayConfirmacion.push('Admin creado exitosamente.');
        console.log('Admin creado exitosamente: "admin@auscultify.com" con contraseña "admin"');
    } else {
        arrayConfirmacion.push('El admin ya existía previamente.');
    }

    // Parte 2: Categorías. Se toman de categorias.txt y de las rutas de los audios que existen en disco.
    const preguntasArchivo = leerPreguntasDeArchivo().filter(pregunta => {
        const existe = fs.existsSync(path.join(RUTA_AUDIOS, pregunta.ruta));
        if (!existe) {
            console.warn(`Audio no encontrado, se omite: ${pregunta.ruta}`);
        }
        return existe;
    });
    const nombresCategorias = new Set([
        ...leerLineasDeArchivo('categorias.txt'),
        ...preguntasArchivo.map(p => p.categoria)
    ]);

    const [categoriasExistentes]: any = await pool.execute(
        'SELECT idCategorias, nombreCategoria FROM Categorias'
    );

    // Mapa nombre -> id para poder asignar las preguntas a su categoría
    const idsCategorias = new Map<string, number>(
        categoriasExistentes.map((cat: any) => [cat.nombreCategoria, cat.idCategorias])
    );

    let categoriasCreadas = 0;
    for (const categoria of nombresCategorias) {
        if (!idsCategorias.has(categoria)) {
            const [resultado]: any = await pool.execute(
                'INSERT INTO Categorias (nombreCategoria) VALUES (?)',
                [categoria]
            );
            idsCategorias.set(categoria, resultado.insertId);
            categoriasCreadas++;
        }

        // Se asegura que exista la carpeta de la categoría
        const rutaCategoria = path.join(RUTA_AUDIOS, categoria);
        if (!fs.existsSync(rutaCategoria)) {
            fs.mkdirSync(rutaCategoria, { recursive: true });
        }
    }

    arrayConfirmacion.push(`Categorías sincronizadas: ${categoriasCreadas} nuevas.`);
    console.log(`Categorías sincronizadas: ${categoriasCreadas} nuevas de ${nombresCategorias.size} en archivo.`);

    // Parte 3: Preguntas. Se crea una pregunta por cada audio que no esté ya en la base de datos.
    const [preguntasExistentes]: any = await pool.execute('SELECT urlAudio FROM Preguntas');
    const rutasExistentes = new Set<string>(
        preguntasExistentes.map((p: any) => String(p.urlAudio).replace(/\\/g, '/'))
    );

    let preguntasCreadas = 0;
    for (const pregunta of preguntasArchivo) {
        if (rutasExistentes.has(pregunta.ruta)) {
            continue;
        }

        await pool.execute(
            'INSERT INTO Preguntas (urlAudio, respuestaCorrecta, Categorias_idCategorias) VALUES (?, ?, ?)',
            [pregunta.ruta, pregunta.respuesta, idsCategorias.get(pregunta.categoria)]
        );
        rutasExistentes.add(pregunta.ruta);
        preguntasCreadas++;
    }

    arrayConfirmacion.push(`Preguntas sincronizadas: ${preguntasCreadas} nuevas.`);
    console.log(`Preguntas sincronizadas: ${preguntasCreadas} nuevas de ${preguntasArchivo.length} en archivo.`);

    return arrayConfirmacion;
};

// Evita que dos sincronizaciones (arranque y endpoint) se ejecuten a la vez y dupliquen datos.
let sincronizacionEnCurso: Promise<string[]> | null = null;

const sincronizarDatosUnaVez = (pool: Pool): Promise<string[]> => {
    if (!sincronizacionEnCurso) {
        sincronizacionEnCurso = sincronizarDatos(pool).finally(() => {
            sincronizacionEnCurso = null;
        });
    }
    return sincronizacionEnCurso;
};

// Sincroniza al arrancar el servicio, reintentando mientras la base de datos no esté lista.
const sincronizarAlArrancar = async (intentosRestantes = 40) => {
    try {
        await sincronizarDatosUnaVez(pool);
        console.log('Sincronización inicial completada.');
    } catch (error) {
        if (intentosRestantes <= 0) {
            console.error('No se pudo realizar la sincronización inicial:', error);
            return;
        }
        console.log(`Base de datos no disponible todavía, reintentando en 3s... (quedan ${intentosRestantes} intentos)`);
        setTimeout(() => sincronizarAlArrancar(intentosRestantes - 1), 3000);
    }
};

const sincronizarDatosHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { email } = req.body as { email: string };

    try {
        const arrayConfirmacion = await sincronizarDatosUnaVez(pool);

        res.status(200).json({
            mensaje: 'Datos sincronizados correctamente',
            detalles: arrayConfirmacion,
            email: email
        });

    } catch (error) {
        console.error('Error al sincronizar datos:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.post('/sincronizar-datos', sincronizarDatosHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`SincronizarDatos service running on port ${PORT}`);
    sincronizarAlArrancar();
});
