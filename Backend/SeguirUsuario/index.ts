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

const seguirUsuarioHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { emailSeguidor, emailSeguido } = req.body as {
        emailSeguidor: string;
        emailSeguido: string;
    };

    try {

        const [seguidor]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguidor]
        );

        const [seguido]: any = await pool.execute(
            'SELECT idUsuario, esPublico FROM Usuarios WHERE correoElectronico = ?',
            [emailSeguido]
        );

        if (seguidor.length === 0) {
            res.status(404).json({ mensaje: 'Usuario seguidor no encontrado' });
            return;
        }

        if (seguido.length === 0) {
            res.status(404).json({ mensaje: 'Usuario a seguir no encontrado' });
            return;
        }

        const idSeguidor = seguidor[0].idUsuario;
        const idSeguido = seguido[0].idUsuario;

        if (!seguido[0].esPublico) {
            res.status(403).json({ mensaje: 'No puedes seguir a un usuario privado' });
            return;
        }

        const [existingFollow]: any = await pool.execute(
            'SELECT * FROM Usuarios_Seguidores WHERE idSeguidor = ? AND idSeguido = ?',
            [idSeguidor, idSeguido]
        );

        if (existingFollow.length > 0) {
            res.status(400).json({ mensaje: 'Ya estás siguiendo a este usuario' });
            return;
        }

        await pool.execute(
            'INSERT INTO Usuarios_Seguidores (idSeguidor, idSeguido) VALUES (?, ?)',
            [idSeguidor, idSeguido]
        );

        res.status(201).json({ mensaje: 'Usuario seguido correctamente' });

    } catch (error) {
        console.error('Error al seguir usuario:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.post('/seguir', seguirUsuarioHandler);

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`SeguirUsuario service running on port ${PORT}`);
});
