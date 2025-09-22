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

// Función para leer categorías desde el archivo categorias.txt
const leerCategoriasDeArchivo = (): string[] => {
    try {

        // Construir la ruta al archivo categorias.txt
        const rutaAudios = path.join(process.cwd(), 'Audios');
        const rutaArchivoCategorias = path.join(rutaAudios, 'categorias.txt');

        // Intentar leer el archivo desde varias ubicaciones posibles
        if (fs.existsSync(rutaArchivoCategorias)) {
            const contenido = fs.readFileSync(rutaArchivoCategorias, 'utf8');

            // Dividir el contenido en líneas y limpiar espacios en blanco
            const categorias = contenido
                .split('\n')
                .map(linea => linea.trim())
                .filter(linea => linea.length > 0);

            console.log(`Total de categorías encontradas: ${categorias.length}`);
            return categorias;
        } else {
            console.log(`No se encontró el archivo categorias.txt en: ${rutaArchivoCategorias}`);
            return [];
        }
    } catch (error) {
        console.log('Error leyendo archivo categorias.txt:', error);
        return [];
    }
};

// Función para sincronizar categorías desde el archivo a la base de datos
const sincronizarCategoriasDeArchivo = async (pool: Pool) => {
    try {
        // Se obtienen las categorías del archivo
        const categoriasArchivo = leerCategoriasDeArchivo();
        
        // Si no hay categorías en el archivo, no se hace nada
        if (categoriasArchivo.length === 0) {
            console.log('No hay categorías para sincronizar');
            return;
        }

        // Se obtienen las categorías existentes en la base de datos
        const [categoriasExistentes]: any = await pool.execute(
            'SELECT nombreCategoria FROM Categorias'
        );
        
        // Se crea un conjunto para facilitar la verificación de existencia
        const nombresExistentes = new Set(
            categoriasExistentes.map((cat: any) => cat.nombreCategoria)
        );

        // Se insertan las categorías que no existen en la base de datos
        for (const categoria of categoriasArchivo) {
 
            // Si la categoría ya existe, se omite
            if (nombresExistentes.has(categoria)) {
                console.log(`Categoría ya existe: "${categoria}"`);
                continue;
            }

            try {
                // Se inserta la nueva categoría en la base de datos
                await pool.execute(
                    'INSERT INTO Categorias (nombreCategoria) VALUES (?)',
                    [categoria]
                );

                // Se crea la carpeta correspondiente en el sistema de archivos
                const posiblesRutas = [
                    path.join(process.cwd(), 'Audios', categoria),
                    path.join(process.cwd(), '..', 'Audios', categoria),
                    path.join(process.cwd(), '..', '..', 'Audios', categoria),
                    path.join('/app', 'Audios', categoria),
                    path.join('/Audios', categoria)
                ];

                // Se intenta crear la carpeta en una de las rutas posibles
                let carpetaCreada = false;

                // Intentar crear la carpeta en cada una de las rutas posibles
                for (const rutaPosible of posiblesRutas) {
                    try {
                        const directorioBase = path.dirname(rutaPosible);
                        if (!fs.existsSync(directorioBase)) {
                            fs.mkdirSync(directorioBase, { recursive: true });
                        }

                        if (!fs.existsSync(rutaPosible)) {
                            fs.mkdirSync(rutaPosible, { recursive: true });
                        }
                        
                        carpetaCreada = true;
                        break;
                    } catch (error) {
                        continue;
                    }
                }
                
                nombresExistentes.add(categoria);


            } catch (error) {
                console.error(`Error al agregar categoría "${categoria}":`, error);
            }
        }

    } catch (error) {
        console.error('Error en sincronización de categorías:', error);
    }
};

const sincronizarDatosHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { email } = req.body as { email: string };
    const arrayConfirmacion: string[] = [];

    try {
        // Parte 1: Creación del admin para asegurar su existencia.

        // Consulta para obtener un usuario cuyo correo coincida con el del admin
        const [obtenerAdmin]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            ['admin@auscultify.com']
        );


        // Si no hay admin, obtenerAdmin debe dar como resultado 0, por que no coincide la consulta
        if (obtenerAdmin.length === 0) {
            
            // Creamos un string basico para encriptarlo y que sea la contraseña inicial del admin
            const contrasenaAdmin = 'admin';
            const salt = await bcrypt.genSalt(10);
            const contrasenaEncriptada = await bcrypt.hash(contrasenaAdmin, salt);

            // Insertar el admin en la base de datos
            await pool.execute(
                `INSERT INTO Usuarios (
                    correoElectronico, contrasena, totalPreguntasAcertadas,
                    totalPreguntasFalladas, totalPreguntasContestadas, racha, 
                    esPublico, idCriterioMasUsado
                )VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'admin@auscultify.com', contrasenaEncriptada, 0,
                    0, 0, 0,
                    0, 0
                ]
            );

            arrayConfirmacion.push('Admin creado exitosamente.');

            console.log('Admin creado exitosamente: "admin@auscultify.com" con contraseña "admin"');
        }else{
            arrayConfirmacion.push('El admin ya existía previamente.');
            console.log('El admin ya existía previamente.');
        }

        const [obtenerCategoria]: any = await pool.execute(
            'SELECT * FROM Categorias'
        );

        if (obtenerCategoria.length === 0) {
            await sincronizarCategoriasDeArchivo(pool);
            arrayConfirmacion.push('Categorías sincronizadas desde el archivo.');
            console.log('Categorías sincronizadas desde el archivo.');
        } else {
            arrayConfirmacion.push('Las categorías ya estaban sincronizadas previamente.');
            console.log('Las categorías ya estaban sincronizadas previamente.');
        } 
        
        res.status(200).json({ 
            mensaje: 'Datos sincronizados correctamente',
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
});
