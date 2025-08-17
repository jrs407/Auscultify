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

const crearCategoriaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { nombreCategoria } = req.body as { nombreCategoria: string };

    // Validación de entrada más detallada
    if (!nombreCategoria) {
        res.status(400).json({ mensaje: 'El nombre de la categoría es requerido' });
        return;
    }

    if (typeof nombreCategoria !== 'string') {
        res.status(400).json({ mensaje: 'El nombre de la categoría debe ser una cadena de texto' });
        return;
    }

    const categoriaLimpia = nombreCategoria.trim();

    if (categoriaLimpia.length === 0) {
        res.status(400).json({ mensaje: 'El nombre de la categoría no puede estar vacío' });
        return;
    }

    if (categoriaLimpia.length < 2) {
        res.status(400).json({ mensaje: 'El nombre de la categoría debe tener al menos 2 caracteres' });
        return;
    }

    if (categoriaLimpia.length > 50) {
        res.status(400).json({ mensaje: 'El nombre de la categoría no puede exceder 50 caracteres' });
        return;
    }

    // Validar caracteres especiales
    const caracteresValidos = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s0-9\-_.]+$/;
    if (!caracteresValidos.test(categoriaLimpia)) {
        res.status(400).json({ mensaje: 'El nombre contiene caracteres no válidos. Solo se permiten letras, números, espacios, guiones y puntos' });
        return;
    }

    // Validar que no empiece o termine con espacios
    if (categoriaLimpia !== categoriaLimpia.trim()) {
        res.status(400).json({ mensaje: 'El nombre no puede empezar o terminar con espacios' });
        return;
    }

    try {
        // Verificar si la categoría ya existe (insensible a mayúsculas/minúsculas)
        const [categoriaExistente]: any = await pool.execute(
            'SELECT idCategorias FROM Categorias WHERE LOWER(nombreCategoria) = LOWER(?)',
            [categoriaLimpia]
        );

        if (categoriaExistente.length > 0) {
            res.status(409).json({ mensaje: 'Ya existe una categoría con este nombre' });
            return;
        }

        // Crear la categoría en la base de datos
        const [resultado]: any = await pool.execute(
            'INSERT INTO Categorias (nombreCategoria) VALUES (?)',
            [categoriaLimpia]
        );

        // Crear la carpeta en el directorio ./Audios
        console.log('Directorio de trabajo actual:', process.cwd());
        
        // Intentar diferentes rutas para encontrar el directorio Audios
        const posiblesRutas = [
            path.join(process.cwd(), 'Audios', categoriaLimpia),
            path.join(process.cwd(), '..', 'Audios', categoriaLimpia),
            path.join(process.cwd(), '..', '..', 'Audios', categoriaLimpia),
            path.join('/app', 'Audios', categoriaLimpia),
            path.join('/Audios', categoriaLimpia)
        ];

        let carpetaCreada = false;
        let rutaFinal = '';

        for (const rutaPosible of posiblesRutas) {
            try {
                const directorioBase = path.dirname(rutaPosible);
                console.log(`Intentando crear directorio base: ${directorioBase}`);
                
                // Crear directorios padre recursivamente
                if (!fs.existsSync(directorioBase)) {
                    fs.mkdirSync(directorioBase, { recursive: true });
                    console.log(`Directorio base creado: ${directorioBase}`);
                }

                // Crear la carpeta de la categoría
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

        if (!carpetaCreada) {
            console.error('No se pudo crear la carpeta en ninguna ruta');
            // Si falla la creación de la carpeta, eliminar la categoría de la base de datos
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

    } catch (error) {
        console.error('Error al crear categoría:', error);
        
        // Verificar tipos específicos de errores de MySQL
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

app.post('/crear-categoria', crearCategoriaHandler);

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
    console.log(`CrearCategoria service running on port ${PORT}`);
});
