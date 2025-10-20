import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';
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

// Función para actualizar el archivo categorias.txt
const actualizarArchivoCategorias = async (pool: Pool) => {
    try {
        // Obtener todas las categorías de la base de datos
        const [categorias]: any = await pool.execute(
            'SELECT nombreCategoria FROM Categorias ORDER BY nombreCategoria'
        );

        // Ruta del archivo categorias.txt
        const rutaAudios = path.join(process.cwd(), 'Audios');
        const rutaArchivoCategorias = path.join(rutaAudios, 'categorias.txt');

        // Crear la carpeta Audios si no existe
        const contenido = categorias.map((cat: any) => cat.nombreCategoria).join('\n');
        
        // Escribir las categorías en el archivo categorias.txt
        fs.writeFileSync(rutaArchivoCategorias, contenido, 'utf8');
        
        console.log(`Archivo categorias.txt actualizado con ${categorias.length} categorías`);

    } catch (error) {
        console.error('Error al actualizar archivo de categorías:', error);
    }
};

// Handler para crear una nueva categoría
const crearCategoriaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    // Parametro de entrada
    const { nombreCategoria } = req.body as { nombreCategoria: string };

    // Comprobar que el nombre de la categoría ha sido introducido
    if (!nombreCategoria) {
        res.status(400).json({ mensaje: 'El nombre de la categoría es obligatorio' });
        return;
    }

    // Variable para almacenar el nombre de la categoría sin espacios al inicio o final
    const categoriaLimpia = nombreCategoria.trim();

    // Comprobar que el nombre de la categoría no esté vacío después de limpiar espacios
    if (categoriaLimpia.length === 0) {
        res.status(400).json({ mensaje: 'El nombre de la categoría no puede estar vacío' });
        return;
    }

    // Comprobar la longitud del nombre de la categoría sea adecuado
    if (categoriaLimpia.length < 2) {
        res.status(400).json({ mensaje: 'El nombre de la categoría debe tener al menos 3 caracteres' });
        return;
    }

    // Comprobar que no se exceda la longitud máxima permitida
    if (categoriaLimpia.length > 50) {
        res.status(400).json({ mensaje: 'El nombre de la categoría no puede exceder los 50 caracteres' });
        return;
    }

    // Comprobar que el nombre de la categoría no contenga caracteres especiales
    const caracteresValidos = /^[a-zA-Z0-9ÁÉÍÓÚáéíóúÑñÜü\s]+$/;
    if (!caracteresValidos.test(categoriaLimpia)) {
        res.status(400).json({ mensaje: 'El nombre de la categoría contiene caracteres no permitidos' });
        return;
    }

    try {

        // Obtenemos alguna categoría con el mismo nombre.
        const [categoriaExistente]: any = await pool.execute(
            'SELECT idCategorias FROM Categorias WHERE LOWER(nombreCategoria) = LOWER(?)',
            [categoriaLimpia]
        );

        // Si ya existe una categoría con ese nombre, devolvemos un error.
        if (categoriaExistente.length > 0) {
            res.status(409).json({ mensaje: 'Ya existe una categoría con este nombre' });
            return;
        }

        // Insertar la nueva categoría en la base de datos
        const [resultado]: any = await pool.execute(
            'INSERT INTO Categorias (nombreCategoria) VALUES (?)',
            [categoriaLimpia]
        );

        console.log('Directorio de trabajo actual:', process.cwd());
        
        // Intentar crear la carpeta de la nueva categoría en varias rutas posibles
        const posiblesRutas = [
            path.join(process.cwd(), 'Audios', categoriaLimpia),
            path.join(process.cwd(), '..', 'Audios', categoriaLimpia),
            path.join(process.cwd(), '..', '..', 'Audios', categoriaLimpia),
            path.join('/app', 'Audios', categoriaLimpia),
            path.join('/Audios', categoriaLimpia)
        ];

        // Variable para rastrear si la carpeta fue creada exitosamente
        let carpetaCreada = false;
        let rutaFinal = '';

        // Intentar crear la carpeta en cada una de las rutas posibles
        for (const rutaPosible of posiblesRutas) {
            try {
                const directorioBase = path.dirname(rutaPosible);
                console.log(`Intentando crear directorio base: ${directorioBase}`);
                
                if (!fs.existsSync(directorioBase)) {
                    fs.mkdirSync(directorioBase, { recursive: true });
                    console.log(`Directorio base creado: ${directorioBase}`);
                }

                if (!fs.existsSync(rutaPosible)) {
                    fs.mkdirSync(rutaPosible, { recursive: true });
                    console.log(`Carpeta de categoría creada exitosamente: ${rutaPosible}`);
                } else {
                    console.log(`La carpeta ya existe: ${rutaPosible}`);
                }
                
                carpetaCreada = true;
                rutaFinal = rutaPosible;
                break;
            } catch (error) {
                console.log(`Fallo al crear carpeta en: ${rutaPosible}`, error);
                continue;
            }
        }

        // Si no se pudo crear la carpeta en ninguna ruta, eliminar la categoría creada y devolver un error
        if (!carpetaCreada) {
            console.error('No se pudo crear la carpeta en ninguna ruta');

            try {
                await pool.execute(
                    'DELETE FROM Categorias WHERE idCategorias = ?',
                    [resultado.insertId]
                );
            } catch (rollbackError) {
                console.error('Error en rollback:', rollbackError);
            }
            res.status(500).json({ mensaje: 'Error al crear la estructura de archivos para la categoría' });
            return;
        }

        console.log(`Carpeta creada exitosamente en: ${rutaFinal}`);

        res.status(201).json({
            mensaje: 'Categoría creada correctamente',
            categoria: {
                id: resultado.insertId,
                nombre: categoriaLimpia
            }
        });

    await actualizarArchivoCategorias(pool);

    } catch (error) {
        console.error('Error al crear categoría:', error);
        

        if (error instanceof Error) {
            if (error.message.includes('Duplicate entry')) {
                res.status(409).json({ mensaje: 'Ya existe una categoría con este nombre' });
                return;
            }
            if (error.message.includes('Data too long')) {
                res.status(400).json({ mensaje: 'El nombre de la categoría es demasiado largo' });
                return;
            }
        }
        
        res.status(500).json({ mensaje: 'Error interno del servidor al crear la categoría' });
    }
};

// Handler para obtener todas las categorías
const obtenerCategoriasHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    try {
        // Obtener todas las categorías de la base de datos
        const [categorias]: any = await pool.execute(
            'SELECT idCategorias, nombreCategoria FROM Categorias ORDER BY nombreCategoria'
        );

        res.status(200).json({
            categorias: categorias,
            total: categorias.length
        });

    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};


app.post('/crear-categoria', crearCategoriaHandler);
app.get('/obtener-categorias', obtenerCategoriasHandler);

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`GestionCategoria service running on port ${PORT}`);
});
