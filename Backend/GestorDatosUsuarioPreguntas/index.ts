import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';

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

interface PreguntaResultado {
    id: number;
    acertada: boolean;
}

interface ActualizarDatosUsuarioRequest {
    usuarioId: number;
    preguntasResultados: PreguntaResultado[];
    fechaContestacion?: string;
}

const actualizarDatosUsuarioHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { usuarioId, preguntasResultados, fechaContestacion } = req.body as ActualizarDatosUsuarioRequest;

    if (!usuarioId || !preguntasResultados || !Array.isArray(preguntasResultados)) {
        res.status(400).json({ mensaje: 'Datos de entrada inválidos' });
        return;
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const fechaActual = fechaContestacion || new Date().toISOString().split('T')[0];
        
        const [usuarioActual]: any = await connection.execute(
            'SELECT * FROM Usuarios WHERE idUsuario = ?',
            [usuarioId]
        );

        if (usuarioActual.length === 0) {
            await connection.rollback();
            connection.release();
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
            return;
        }

        console.log(preguntasResultados)

        const usuario = usuarioActual[0];
        
        const preguntasAcertadas = preguntasResultados.filter(p => p.acertada).length;
        const preguntasFalladas = preguntasResultados.filter(p => !p.acertada).length;
        const totalPreguntasContestadas = preguntasResultados.length;

        const nuevasPreguntasAcertadas = (usuario.totalPreguntasAcertadas || 0) + preguntasAcertadas;
        const nuevasPreguntasFalladas = (usuario.totalPreguntasFalladas || 0) + preguntasFalladas;
        const nuevasTotalContestadas = (usuario.totalPreguntasContestadas || 0) + totalPreguntasContestadas;

        let nuevaRacha = usuario.racha || 0;
        const ultimoDia = usuario.ultimoDiaPregunta;
        const fechaActualObj = new Date(fechaActual);
        
        if (ultimoDia) {
            const ultimoDiaObj = new Date(ultimoDia);
            const diferenciaDias = Math.floor((fechaActualObj.getTime() - ultimoDiaObj.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias === 1) {
                if (preguntasAcertadas > 0) {
                    nuevaRacha += 1;
                } else {
                    nuevaRacha = 0;
                }
            } else if (diferenciaDias > 1) {
                nuevaRacha = preguntasAcertadas > 0 ? 1 : 0;
            } else if (diferenciaDias === 0) {
            }
        } else {
            nuevaRacha = preguntasAcertadas > 0 ? 1 : 0;
        }

        await connection.execute(
            `UPDATE Usuarios SET 
                totalPreguntasAcertadas = ?, 
                totalPreguntasFalladas = ?, 
                totalPreguntasContestadas = ?, 
                racha = ?, 
                ultimoDiaPregunta = ?
            WHERE idUsuario = ?`,
            [nuevasPreguntasAcertadas, nuevasPreguntasFalladas, nuevasTotalContestadas, nuevaRacha, fechaActual, usuarioId]
        );

        for (const preguntaResultado of preguntasResultados) {
            await connection.execute(
                'INSERT INTO Usuarios_has_Preguntas (Usuarios_idUsuario, Preguntas_idPregunta, fechaDeContestacion, respuestaCorrecta) VALUES (?, ?, ?, ?)',
                [usuarioId, preguntaResultado.id, fechaActual, preguntaResultado.acertada ? 1 : 0]
            );
        }

        await connection.commit();
        connection.release();

        const [usuarioActualizado]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE idUsuario = ?',
            [usuarioId]
        );

        const usuarioFinal = usuarioActualizado[0];

        res.json({
            mensaje: 'Datos de usuario actualizados correctamente',
            usuario: {
                id: usuarioFinal.idUsuario,
                email: usuarioFinal.correoElectronico,
                totalPreguntasAcertadas: usuarioFinal.totalPreguntasAcertadas,
                totalPreguntasFalladas: usuarioFinal.totalPreguntasFalladas,
                totalPreguntasContestadas: usuarioFinal.totalPreguntasContestadas,
                racha: usuarioFinal.racha,
                ultimoDiaPregunta: usuarioFinal.ultimoDiaPregunta,
                esPublico: usuarioFinal.esPublico,
                idCriterioMasUsado: usuarioFinal.idCriterioMasUsado
            },
            estadisticasSesion: {
                preguntasAcertadas,
                preguntasFalladas,
                totalPreguntasContestadas
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Error al actualizar datos del usuario:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};


const obtenerEstadisticasUsuarioHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { usuarioId } = req.params;

    try {
        const [estadisticasGenerales]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE idUsuario = ?',
            [usuarioId]
        );

        if (estadisticasGenerales.length === 0) {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
            return;
        }

        const usuario = estadisticasGenerales[0];
        const porcentajeGeneral = usuario.totalPreguntasContestadas > 0 
            ? Math.round((usuario.totalPreguntasAcertadas * 100) / usuario.totalPreguntasContestadas * 100) / 100
            : 0;

        const [estadisticasCategorias]: any = await pool.execute(
            `SELECT 
                c.idCategorias,
                c.nombreCategoria,
                COUNT(*) as totalPreguntas,
                SUM(uhp.respuestaCorrecta) as preguntasAcertadas
             FROM Usuarios_has_Preguntas uhp
             JOIN Preguntas p ON uhp.Preguntas_idPregunta = p.idPregunta
             JOIN Categorias c ON p.Categorias_idCategorias = c.idCategorias
             WHERE uhp.Usuarios_idUsuario = ?
             GROUP BY c.idCategorias, c.nombreCategoria`,
            [usuarioId]
        );

        let categoriaMasUsada = null;
        let porcentajeMejorCategoria = 0;
        let porcentajePeorCategoria = 100;

        if (estadisticasCategorias.length > 0) {

            const categoriaConMasPreguntas = estadisticasCategorias.reduce((prev: any, current: any) => 
                (prev.totalPreguntas > current.totalPreguntas) ? prev : current
            );
            categoriaMasUsada = categoriaConMasPreguntas.nombreCategoria;

            const porcentajesPorCategoria = estadisticasCategorias.map((cat: any) => ({
                categoria: cat.nombreCategoria,
                porcentaje: cat.totalPreguntas > 0 ? Math.round((cat.preguntasAcertadas * 100) / cat.totalPreguntas * 100) / 100 : 0
            }));

            if (porcentajesPorCategoria.length > 0) {
                porcentajeMejorCategoria = Math.max(...porcentajesPorCategoria.map((p: any) => p.porcentaje));
                porcentajePeorCategoria = Math.min(...porcentajesPorCategoria.map((p: any) => p.porcentaje));
            }
        }

        const fechaActual = new Date();
        const preguntasPor7Dias = [];
        const preguntasAcertadasPor7Dias = [];
        const preguntasfalladasPor7Dias = [];

        for (let i = 6; i >= 0; i--) {
            const fecha = new Date(fechaActual);
            fecha.setDate(fecha.getDate() - i);
            const fechaString = fecha.toISOString().split('T')[0];

            const [preguntasDelDia]: any = await pool.execute(
                'SELECT * FROM Usuarios_has_Preguntas WHERE Usuarios_idUsuario = ? AND fechaDeContestacion = ?',
                [usuarioId, fechaString]
            );

            const [preguntasAcertadasDelDia]: any = await pool.execute(
                'SELECT * FROM Usuarios_has_Preguntas WHERE Usuarios_idUsuario = ? AND fechaDeContestacion = ? AND respuestaCorrecta = 1',
                [usuarioId, fechaString]
            );

            const [preguntasfalladasDelDia]: any = await pool.execute(
                'SELECT * FROM Usuarios_has_Preguntas WHERE Usuarios_idUsuario = ? AND fechaDeContestacion = ? AND respuestaCorrecta = 0',
                [usuarioId, fechaString]
            );

            preguntasPor7Dias.push(preguntasDelDia.length);
            preguntasAcertadasPor7Dias.push(preguntasAcertadasDelDia.length);
            preguntasfalladasPor7Dias.push(preguntasfalladasDelDia.length);
        }

        res.json({
            categoriaMasUsada,
            porcentajeGeneral,
            porcentajeMejorCategoria,
            porcentajePeorCategoria,
            preguntasPor7Dias,
            preguntasAcertadasPor7Dias,
            preguntasfalladasPor7Dias,
            datosUsuario: {
                totalPreguntasAcertadas: usuario.totalPreguntasAcertadas || 0,
                totalPreguntasFalladas: usuario.totalPreguntasFalladas || 0,
                totalPreguntasContestadas: usuario.totalPreguntasContestadas || 0,
                racha: usuario.racha || 0
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas del usuario:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

const obtenerUsuarioPorCorreoHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { correo } = req.query;

    if (!correo) {
        res.status(400).json({ mensaje: 'Correo electrónico es requerido' });
        return;
    }

    try {
        const [usuario]: any = await pool.execute(
            'SELECT idUsuario, totalPreguntasContestadas, totalPreguntasAcertadas, racha FROM Usuarios WHERE correoElectronico = ?',
            [correo]
        );

        if (usuario.length === 0) {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
            return;
        }

        const usuarioData = usuario[0];
        const promedioGeneral = usuarioData.totalPreguntasContestadas > 0
            ? Math.round((usuarioData.totalPreguntasAcertadas * 100) / usuarioData.totalPreguntasContestadas * 100) / 100
            : 0;

        res.json({
            idUsuario: usuarioData.idUsuario,
            totalPreguntasContestadas: usuarioData.totalPreguntasContestadas || 0,
            totalPreguntasAcertadas: usuarioData.totalPreguntasAcertadas || 0,
            racha: usuarioData.racha || 0,
            promedioGeneral
        });

    } catch (error) {
        console.error('Error al obtener usuario por correo:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

app.post('/actualizar-datos-usuario', actualizarDatosUsuarioHandler);
app.get('/estadisticas-usuario/:usuarioId', obtenerEstadisticasUsuarioHandler);
app.get('/obtener-usuario-correo', obtenerUsuarioPorCorreoHandler);

const PORT = process.env.PORT || 3015;
app.listen(PORT, () => {
    console.log(`GestorDatosUsuarioPreguntas service running on port ${PORT}`);
});