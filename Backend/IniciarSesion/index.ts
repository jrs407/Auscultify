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

const iniciarSesionHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { usuario, contrasena } = req.body as {
        usuario: string;
        contrasena: string;
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usuario)) {
        res.status(400).json({ mensaje: 'Dirección de correo electrónico no válida' });
        return;
    }

    try {

        const [rows]: any = await pool.execute(
            'SELECT * FROM Usuarios WHERE correoElectronico = ?',
            [usuario]
        );

        if (rows.length === 0) {
            res.status(401).json({ mensaje: 'Usuario no encontrado' });
            return;
        }

        const usuarioDb = rows[0];
        const contrasenaValida = await bcrypt.compare(contrasena, usuarioDb.contrasena);

        if (!contrasenaValida) {
            res.status(401).json({ mensaje: 'Contraseña incorrecta' });
            return;
        }

        res.json({
            usuario: {
                id: usuarioDb.idUsuario,
                email: usuarioDb.correoElectronico,
                totalPreguntasAcertadas: usuarioDb.totalPreguntasAcertadas,
                totalPreguntasFalladas: usuarioDb.totalPreguntasFalladas,
                totalPreguntasContestadas: usuarioDb.totalPreguntasContestadas,
                racha: usuarioDb.racha,
                ultimoDiaPregunta: usuarioDb.ultimoDiaPregunta,
                esPublico: usuarioDb.esPublico,
                idCriterioMasUsado: usuarioDb.idCriterioMasUsado
            }
        });

    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.post('/login', iniciarSesionHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Auth service running on port ${PORT}`);
});
