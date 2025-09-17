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

const registrarseHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { usuario, contrasena1, contrasena2 } = req.body as {
        usuario: string;
        contrasena1: string;
        contrasena2: string;
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(usuario)) {
        res.status(400).json({ mensaje: 'Dirección de correo electrónico no válida' });
        return;
    }

    try {
        if (contrasena1 !== contrasena2) {
            res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
            return;
        }

        const [usuarios] = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            [usuario]
        );

        if (Array.isArray(usuarios) && usuarios.length > 0) {
            res.status(400).json({ mensaje: 'El usuario ya existe' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(contrasena1, salt);

        const [result]: any = await pool.execute(
            `INSERT INTO Usuarios (
                correoElectronico, 
                contrasena, 
                totalPreguntasAcertadas,
                totalPreguntasFalladas, 
                totalPreguntasContestadas,
                racha,
                esPublico,
                idCriterioMasUsado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                usuario,
                hashedPassword,
                0,
                0,
                0,
                0,
                1,
                1
            ]
        );

        res.status(201).json({
            usuario: {
                id: result.insertId,
                email: usuario,
                totalPreguntasAcertadas: 0,
                totalPreguntasFalladas: 0,
                totalPreguntasContestadas: 0,
                racha: 0,
                ultimoDiaPregunta: null,
                esPublico: 1,
                idCriterioMasUsado: 1
            }
        });

    } catch (error) {
        console.error('Error en el registro de sesión:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};


app.post('/registrarse', registrarseHandler);


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});
