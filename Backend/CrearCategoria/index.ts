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

const actualizarArchivoCategorias = async (pool: Pool) => {
    try {
        const [categorias]: any = await pool.execute(
            'SELECT nombreCategoria FROM Categorias ORDER BY nombreCategoria'
        );

        const rutaAudios = path.join(process.cwd(), 'Audios');
        const rutaArchivoCategorias = path.join(rutaAudios, 'categorias.txt');

        const contenido = categorias.map((cat: any) => cat.nombreCategoria).join('\n');
        
        fs.writeFileSync(rutaArchivoCategorias, contenido, 'utf8');
        
        console.log(`Archivo categorias.txt actualizado con ${categorias.length} categorías`);

    } catch (error) {
        console.error('Error al actualizar archivo de categorías:', error);
    }
};

const leerCategoriasDeArchivo = (): string[] => {
    try {
        const rutaAudios = path.join(process.cwd(), 'Audios');
        const rutaArchivoCategorias = path.join(rutaAudios, 'categorias.txt');

        if (fs.existsSync(rutaArchivoCategorias)) {
            const contenido = fs.readFileSync(rutaArchivoCategorias, 'utf8');
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


// ELIMINAR, FUNCION YA NO UTILIZADA
const sincronizarCategoriasDeArchivo = async (pool: Pool) => {
    try {
        const categoriasArchivo = leerCategoriasDeArchivo();
        
        if (categoriasArchivo.length === 0) {
            console.log('No hay categorías para sincronizar');
            return;
        }

        const [categoriasExistentes]: any = await pool.execute(
            'SELECT nombreCategoria FROM Categorias'
        );
        
        const nombresExistentes = new Set(
            categoriasExistentes.map((cat: any) => cat.nombreCategoria)
        );

        for (const categoria of categoriasArchivo) {
 
            if (nombresExistentes.has(categoria)) {
                console.log(`Categoría ya existe: "${categoria}"`);
                continue;
            }

            try {
                await pool.execute(
                    'INSERT INTO Categorias (nombreCategoria) VALUES (?)',
                    [categoria]
                );

                const posiblesRutas = [
                    path.join(process.cwd(), 'Audios', categoria),
                    path.join(process.cwd(), '..', 'Audios', categoria),
                    path.join(process.cwd(), '..', '..', 'Audios', categoria),
                    path.join('/app', 'Audios', categoria),
                    path.join('/Audios', categoria)
                ];

                let carpetaCreada = false;
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

const crearCategoriaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { nombreCategoria } = req.body as { nombreCategoria: string };

    if (!nombreCategoria) {
        res.status(400).json({ mensaje: 'El nombre de la categoría es requerido' });
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

    const caracteresValidos = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s0-9\-_.]+$/;
    if (!caracteresValidos.test(categoriaLimpia)) {
        res.status(400).json({ mensaje: 'El nombre contiene caracteres no válidos. Solo se permiten letras, números, espacios, guiones y puntos' });
        return;
    }

    if (categoriaLimpia !== categoriaLimpia.trim()) {
        res.status(400).json({ mensaje: 'El nombre no puede empezar o terminar con espacios' });
        return;
    }

    try {

        const [categoriaExistente]: any = await pool.execute(
            'SELECT idCategorias FROM Categorias WHERE LOWER(nombreCategoria) = LOWER(?)',
            [categoriaLimpia]
        );

        if (categoriaExistente.length > 0) {
            res.status(409).json({ mensaje: 'Ya existe una categoría con este nombre' });
            return;
        }

        const [resultado]: any = await pool.execute(
            'INSERT INTO Categorias (nombreCategoria) VALUES (?)',
            [categoriaLimpia]
        );

        console.log('Directorio de trabajo actual:', process.cwd());
        
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

app.post('/crear-categoria', crearCategoriaHandler);

const PORT = process.env.PORT || 3009;
app.listen(PORT, async () => {
    console.log(`CrearCategoria service running on port ${PORT}`);
});