import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';
import multer from 'multer';
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

app.use('/audio', express.static(path.join(process.cwd(), 'Audios')));

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

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'audio/mpeg',
            'audio/wav', 
            'audio/ogg',
            'audio/mp3',
            'audio/m4a',
            'audio/aac',
            'audio/mp4',
            'video/mp4'
        ];
        
        const allowedExtensions = /\.(mp3|wav|ogg|m4a|aac|mp4)$/i;
        
        if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no válido. Solo se permiten archivos de audio.'));
        }
    }
});

const actualizarArchivoRutasAudios = async (rutaAudio: string) => {
    try {
        const rutaAudios = path.join(process.cwd(), 'Audios');
        const rutaArchivoRutas = path.join(rutaAudios, 'rutaAudios.txt');

        if (!fs.existsSync(rutaAudios)) {
            fs.mkdirSync(rutaAudios, { recursive: true });
        }

        let rutasExistentes: string[] = [];
        if (fs.existsSync(rutaArchivoRutas)) {
            const contenido = fs.readFileSync(rutaArchivoRutas, 'utf8');
            rutasExistentes = contenido
                .split('\n')
                .map(linea => linea.trim())
                .filter(linea => linea.length > 0);
        }

        if (!rutasExistentes.includes(rutaAudio)) {
            rutasExistentes.push(rutaAudio);
        }

        const contenidoFinal = rutasExistentes.join('\n');
        fs.writeFileSync(rutaArchivoRutas, contenidoFinal, 'utf8');
        
        console.log(`Archivo rutaAudios.txt actualizado con ruta: ${rutaAudio}`);

    } catch (error) {
        console.error('Error al actualizar archivo de rutas de audios:', error);
        throw error;
    }
};

const guardarArchivoAudio = async (buffer: Buffer, nombreCategoria: string, nombreArchivo: string): Promise<string> => {
    const posiblesRutasBase = [
        path.join(process.cwd(), 'Audios'),
        path.join('/app', 'Audios'),
        path.join('/Audios')
    ];

    for (const rutaBase of posiblesRutasBase) {
        try {
            const rutaCategoria = path.join(rutaBase, nombreCategoria);
            

            if (!fs.existsSync(rutaCategoria)) {
                fs.mkdirSync(rutaCategoria, { recursive: true });
            }

            const rutaCompleta = path.join(rutaCategoria, nombreArchivo);
            
            fs.writeFileSync(rutaCompleta, buffer);
            
            console.log(`Archivo guardado exitosamente en: ${rutaCompleta}`);
            
            return path.join(nombreCategoria, nombreArchivo);
            
        } catch (error) {
            console.log(`Error al guardar en ${rutaBase}:`, error);
            continue;
        }
    }

    throw new Error('No se pudo guardar el archivo en ninguna ruta');
};

const crearPreguntaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;

    try {
        const { categoria, respuesta } = req.body;
        const archivo = req.file;

        if (!archivo) {
            res.status(400).json({ mensaje: 'El archivo de audio es requerido' });
            return;
        }

        if (!categoria || categoria === 'Elija una categoría') {
            res.status(400).json({ mensaje: 'Debe seleccionar una categoría válida' });
            return;
        }

        if (!respuesta || respuesta.trim().length === 0) {
            res.status(400).json({ mensaje: 'La respuesta es requerida' });
            return;
        }

        if (respuesta.trim().length < 2) {
            res.status(400).json({ mensaje: 'La respuesta debe tener al menos 2 caracteres' });
            return;
        }

        if (respuesta.trim().length > 200) {
            res.status(400).json({ mensaje: 'La respuesta no puede exceder 200 caracteres' });
            return;
        }

        const [categoriaResult]: any = await pool.execute(
            'SELECT idCategorias FROM Categorias WHERE nombreCategoria = ?',
            [categoria]
        );

        if (categoriaResult.length === 0) {
            res.status(404).json({ mensaje: 'Categoría no encontrada' });
            return;
        }

        const idCategoria = categoriaResult[0].idCategorias;

        
        const [resultadoPregunta]: any = await pool.execute(
            'INSERT INTO Preguntas (urlAudio, respuestaCorrecta, Categorias_idCategorias) VALUES (?, ?, ?)',

            ['temp', respuesta.trim(), idCategoria]
        );

        const idPregunta = resultadoPregunta.insertId;

        const extension = path.extname(archivo.originalname);
        const nombreArchivo = `${respuesta.trim()}${idPregunta}${extension}`;
        const rutaRelativa = await guardarArchivoAudio(archivo.buffer, categoria, nombreArchivo);


        await pool.execute(
            'UPDATE Preguntas SET urlAudio = ? WHERE idPregunta = ?',
            [rutaRelativa, idPregunta]
        );

        await actualizarArchivoRutasAudios(rutaRelativa);

        res.status(201).json({
            mensaje: 'Pregunta creada correctamente',
            pregunta: {
                id: idPregunta,
                rutaAudio: rutaRelativa,
                respuesta: respuesta.trim(),
                categoria: categoria,
                idCategoria: idCategoria
            }
        });

    } catch (error) {
        console.error('Error al crear pregunta:', error);

        if (error instanceof Error) {
            if (error.message.includes('No se pudo guardar el archivo')) {
                res.status(500).json({ mensaje: 'Error al guardar el archivo de audio' });
                return;
            }
            if (error.message.includes('Tipo de archivo no válido')) {
                res.status(400).json({ mensaje: 'Tipo de archivo no válido. Solo se permiten archivos de audio.' });
                return;
            }
        }

        res.status(500).json({ mensaje: 'Error interno del servidor al crear la pregunta' });
    }
};

const obtenerPreguntasHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { categoria } = req.query;

    try {
        let query = `
            SELECT p.idPregunta, p.urlAudio, p.respuestaCorrecta, c.nombreCategoria, c.idCategorias
            FROM Preguntas p JOIN Categorias c ON p.Categorias_idCategorias = c.idCategorias
        `;
        
        const params: any[] = [];

        if (categoria) {
            query += ' WHERE c.nombreCategoria = ?';
            params.push(categoria);
        }

        query += ' ORDER BY c.nombreCategoria, p.idPregunta';

        const [preguntas]: any = await pool.execute(query, params);

        const protocol = req.get('x-forwarded-proto') || 'http';
        const host = req.get('host') || `localhost:${process.env.PORT || 3012}`;
        const baseUrl = `${protocol}://${host}`;
        
        const preguntasFormateadas = preguntas.map((pregunta: any) => ({
            idPregunta: pregunta.idPregunta,
            rutaAudio: pregunta.urlAudio,
            audioUrl: `${baseUrl}/audio/${pregunta.urlAudio.replace(/\\/g, '/')}`,
            respuestaCorrecta: pregunta.respuestaCorrecta,
            nombreCategoria: pregunta.nombreCategoria,
            idCategorias: pregunta.idCategorias
        }));

        res.status(200).json({
            preguntas: preguntasFormateadas,
            total: preguntasFormateadas.length
        });

    } catch (error) {
        console.error('Error al obtener preguntas:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al obtener las preguntas' });
    }
};

const eliminarRutaDeArchivoRutas = async (rutaAudioEliminar: string) => {
    try {
        const rutaAudios = path.join(process.cwd(), 'Audios');
        const rutaArchivoRutas = path.join(rutaAudios, 'rutaAudios.txt');

        if (!fs.existsSync(rutaArchivoRutas)) {
            console.log('No existe el archivo rutaAudios.txt');
            return;
        }

        const contenido = fs.readFileSync(rutaArchivoRutas, 'utf8');
        const rutasExistentes = contenido
            .split('\n')
            .map(linea => linea.trim())
            .filter(linea => linea.length > 0 && linea !== rutaAudioEliminar);

        const contenidoFinal = rutasExistentes.join('\n');
        fs.writeFileSync(rutaArchivoRutas, contenidoFinal, 'utf8');
        
        console.log(`Ruta eliminada del archivo rutaAudios.txt: ${rutaAudioEliminar}`);

    } catch (error) {
        console.error('Error al eliminar ruta del archivo de rutas de audios:', error);
    }
};

const eliminarPreguntaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { idPregunta } = req.body;

    if (!idPregunta) {
        res.status(400).json({ mensaje: 'El ID de la pregunta es requerido' });
        return;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {

        const [preguntaResult]: any = await connection.execute(
            'SELECT p.urlAudio, c.nombreCategoria FROM Preguntas p JOIN Categorias c ON p.Categorias_idCategorias = c.idCategorias WHERE p.idPregunta = ?',
            [idPregunta]
        );

        if (preguntaResult.length === 0) {
            await connection.rollback();
            connection.release();
            res.status(404).json({ mensaje: 'Pregunta no encontrada' });
            return;
        }

        const rutaAudio = preguntaResult[0].urlAudio;

        await connection.execute(
            'DELETE FROM Usuarios_has_Preguntas WHERE Preguntas_idPregunta = ?',
            [idPregunta]
        );

        await connection.execute(
            'DELETE FROM Preguntas WHERE idPregunta = ?',
            [idPregunta]
        );

        await connection.commit();
        connection.release();

        let archivoEliminado = false;
        
        if (rutaAudio && typeof rutaAudio === 'string') {
            const posiblesRutasBase = [
                path.join(process.cwd(), 'Audios'),
                path.join('/app', 'Audios'),
                path.join('/Audios')
            ];

            for (const rutaBase of posiblesRutasBase) {
                try {
                    const rutaCompleta = path.join(rutaBase, rutaAudio);
                    if (fs.existsSync(rutaCompleta)) {
                        fs.unlinkSync(rutaCompleta);
                        console.log(`Archivo eliminado: ${rutaCompleta}`);
                        archivoEliminado = true;
                        break;
                    }
                } catch (error) {
                    console.log(`Error al eliminar archivo en ${rutaBase}:`, error);
                    continue;
                }
            }

            await eliminarRutaDeArchivoRutas(rutaAudio);
        } else {
            console.warn(`Ruta de audio no válida: ${rutaAudio}`);
        }

        res.status(200).json({
            mensaje: 'Pregunta eliminada correctamente',
            archivoEliminado: archivoEliminado
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Error al eliminar pregunta:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al eliminar la pregunta' });
    }
};

app.post('/crear-pregunta', upload.single('audio'), crearPreguntaHandler);
app.get('/obtener-preguntas', obtenerPreguntasHandler);
app.delete('/eliminar-pregunta', eliminarPreguntaHandler);

const PORT = process.env.PORT || 3012;
app.listen(PORT, () => {
    console.log(`GestionarPreguntas service running on port ${PORT}`);
});
