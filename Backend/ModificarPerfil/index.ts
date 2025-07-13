import express from 'express';
import { Request, Response, NextFunction } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';

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

const modificarPerfilHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { userId, esPublico, nuevaContrasena, nuevoCorreo } = req.body as {
        userId: number;
        esPublico?: boolean;
        nuevaContrasena?: string;
        nuevoCorreo?: string;
    };

    try {
        // Validar formato de email si se proporciona
        if (nuevoCorreo) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(nuevoCorreo)) {
                res.status(400).json({ mensaje: 'Dirección de correo electrónico no válida' });
                return;
            }

            // Verificar si el nuevo correo ya existe en otro usuario
            const [existingUsers] = await pool.execute(
                'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ? AND idUsuario != ?',
                [nuevoCorreo, userId]
            );

            if (Array.isArray(existingUsers) && existingUsers.length > 0) {
                res.status(400).json({ mensaje: 'El correo electrónico ya está en uso' });
                return;
            }
        }

        let updateFields: string[] = [];
        let updateValues: any[] = [];

        if (esPublico !== undefined) {
            updateFields.push('esPublico = ?');
            updateValues.push(esPublico ? 1 : 0);
        }

        if (nuevaContrasena) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(nuevaContrasena, salt);
            updateFields.push('contrasena = ?');
            updateValues.push(hashedPassword);
        }

        if (nuevoCorreo) {
            updateFields.push('correoElectronico = ?');
            updateValues.push(nuevoCorreo);
        }

        if (updateFields.length === 0) {
            res.status(400).json({ mensaje: 'No hay campos para actualizar' });
            return;
        }

        updateValues.push(userId);

        await pool.execute(
            `UPDATE Usuarios SET ${updateFields.join(', ')} WHERE idUsuario = ?`,
            updateValues
        );

        // Obtener los datos actualizados del usuario
        const [updatedUser]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE idUsuario = ?',
            [userId]
        );

        if (updatedUser.length > 0) {
            const usuario = updatedUser[0];
            res.json({
                mensaje: 'Perfil actualizado correctamente',
                usuario: {
                    id: usuario.idUsuario,
                    email: usuario.correoElectronico,
                    totalPreguntasAcertadas: usuario.totalPreguntasAcertadas,
                    totalPreguntasFalladas: usuario.totalPreguntasFalladas,
                    totalPreguntasContestadas: usuario.totalPreguntasContestadas,
                    racha: usuario.racha,
                    ultimoDiaPregunta: usuario.ultimoDiaPregunta,
                    esPublico: usuario.esPublico,
                    idCriterioMasUsado: usuario.idCriterioMasUsado
                }
            });
        } else {
            res.json({ mensaje: 'Perfil actualizado correctamente' });
        }

    } catch (error) {
        console.error('Error al modificar perfil:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.put('/modificar-perfil', modificarPerfilHandler);


const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`ModificarPerfil service running on port ${PORT}`);
});
