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

const eliminarCarpetaCategoria = (nombreCategoria: string): boolean => {
    const posiblesRutas = [
        path.join(process.cwd(), 'Audios', nombreCategoria),
        path.join(process.cwd(), '..', 'Audios', nombreCategoria),
        path.join(process.cwd(), '..', '..', 'Audios', nombreCategoria),
        path.join('/app', 'Audios', nombreCategoria),
        path.join('/Audios', nombreCategoria)
    ];

    let carpetaEliminada = false;

    for (const rutaPosible of posiblesRutas) {
        try {
            if (fs.existsSync(rutaPosible)) {
                fs.rmSync(rutaPosible, { recursive: true, force: true });
                console.log(`Carpeta eliminada exitosamente: ${rutaPosible}`);
                carpetaEliminada = true;
            }
        } catch (error) {
            console.log(`Error al eliminar carpeta en: ${rutaPosible}`, error);
            continue;
        }
    }

    return carpetaEliminada;
};

const eliminarCategoriaHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { idCategoria, nombreCategoria } = req.body as { 
        idCategoria?: number; 
        nombreCategoria?: string; 
    };

    if (!idCategoria && !nombreCategoria) {
        res.status(400).json({ mensaje: 'Se requiere el ID o el nombre de la categoría' });
        return;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        let categoriaParaEliminar: any = null;

        if (idCategoria) {
            const [categoria]: any = await connection.execute(
                'SELECT idCategorias, nombreCategoria FROM Categorias WHERE idCategorias = ?',
                [idCategoria]
            );
            categoriaParaEliminar = categoria[0];
        } else {
            const [categoria]: any = await connection.execute(
                'SELECT idCategorias, nombreCategoria FROM Categorias WHERE nombreCategoria = ?',
                [nombreCategoria]
            );
            categoriaParaEliminar = categoria[0];
        }

        if (!categoriaParaEliminar) {
            await connection.rollback();
            connection.release();
            res.status(404).json({ mensaje: 'Categoría no encontrada' });
            return;
        }

        // Obtener las preguntas asociadas a esta categoría
        const [preguntasAsociadas]: any = await connection.execute(
            'SELECT idPregunta FROM Preguntas WHERE Categorias_idCategorias = ?',
            [categoriaParaEliminar.idCategorias]
        );

        let preguntasEliminadas = 0;
        
        if (preguntasAsociadas.length > 0) {
            // Eliminar respuestas de usuarios para cada pregunta
            for (const pregunta of preguntasAsociadas) {
                await connection.execute(
                    'DELETE FROM Usuarios_has_Preguntas WHERE Preguntas_idPregunta = ?',
                    [pregunta.idPregunta]
                );
            }

            // Eliminar todas las preguntas de la categoría
            const [resultadoPreguntas]: any = await connection.execute(
                'DELETE FROM Preguntas WHERE Categorias_idCategorias = ?',
                [categoriaParaEliminar.idCategorias]
            );
            
            preguntasEliminadas = resultadoPreguntas.affectedRows;
        }

        // Eliminar la categoría
        await connection.execute(
            'DELETE FROM Categorias WHERE idCategorias = ?',
            [categoriaParaEliminar.idCategorias]
        );

        await connection.commit();
        connection.release();

        // Eliminar la carpeta del sistema de archivos
        const carpetaEliminada = eliminarCarpetaCategoria(categoriaParaEliminar.nombreCategoria);
        
        if (!carpetaEliminada) {
            console.warn(`No se pudo eliminar la carpeta para la categoría: ${categoriaParaEliminar.nombreCategoria}`);
        }

        // Actualizar el archivo de categorías
        await actualizarArchivoCategorias(pool);

        res.status(200).json({
            mensaje: 'Categoría eliminada correctamente',
            categoria: {
                id: categoriaParaEliminar.idCategorias,
                nombre: categoriaParaEliminar.nombreCategoria
            },
            preguntasEliminadas: preguntasEliminadas,
            carpetaEliminada: carpetaEliminada
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        
        console.error('Error al eliminar categoría:', error);

        if (error instanceof Error) {
            if (error.message.includes('foreign key constraint')) {
                res.status(400).json({ mensaje: 'No se puede eliminar la categoría porque tiene datos relacionados' });
                return;
            }
        }
        
        res.status(500).json({ mensaje: 'Error interno del servidor al eliminar la categoría' });
    }
};

app.delete('/eliminar-categoria', eliminarCategoriaHandler);

const PORT = process.env.PORT || 3011;
app.listen(PORT, () => {
    console.log(`EliminarCategoria service running on port ${PORT}`);
});
