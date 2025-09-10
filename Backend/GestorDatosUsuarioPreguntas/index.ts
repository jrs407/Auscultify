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

        res.json({
            totalPreguntasAcertadas: usuario.totalPreguntasAcertadas || 0,
            totalPreguntasFalladas: usuario.totalPreguntasFalladas || 0,
            totalPreguntasContestadas: usuario.totalPreguntasContestadas || 0,
            porcentajeAcierto: porcentajeGeneral,
            racha: usuario.racha || 0,
            ultimoDiaPregunta: usuario.ultimoDiaPregunta
        });

    } catch (error) {
        console.error('Error al obtener estadísticas del usuario:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

app.post('/actualizar-datos-usuario', actualizarDatosUsuarioHandler);
app.get('/estadisticas-usuario/:usuarioId', obtenerEstadisticasUsuarioHandler);

const PORT = process.env.PORT || 3015;
app.listen(PORT, () => {
    console.log(`GestorDatosUsuarioPreguntas service running on port ${PORT}`);
});