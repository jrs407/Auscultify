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

const sincronizarDatosHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { email } = req.body as { email: string };
    const arrayConfirmacion: string[] = [];

    try {
        // Parte 1: Creación del admin para asegurar su existencia.

        // Consulta para obtener un usuario cuyo correo coincida con el del admin
        const [obtenerAdmin]: any = await pool.execute(
            'SELECT idUsuario FROM Usuarios WHERE correoElectronico = ?',
            ['admin@auscultify.com']
        );


        // Si no hay admin, obtenerAdmin debe dar como resultado 0, por que no coincide la consulta
        if (obtenerAdmin.length === 0) {
            
            // Creamos un string basico para encriptarlo y que sea la contraseña inicial del admin
            const contrasenaAdmin = 'admin';
            const salt = await bcrypt.genSalt(10);
            const contrasenaEncriptada = await bcrypt.hash(contrasenaAdmin, salt);

            // Insertar el admin en la base de datos
            await pool.execute(
                `INSERT INTO Usuarios (
                    correoElectronico, contrasena, totalPreguntasAcertadas,
                    totalPreguntasFalladas, totalPreguntasContestadas, racha, 
                    esPublico, idCriterioMasUsado
                )VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    'admin@auscultify.com', contrasenaEncriptada, 0,
                    0, 0, 0,
                    0, 0
                ]
            );

            arrayConfirmacion.push('Admin creado exitosamente.');

            console.log('Admin creado exitosamente: "admin@auscultify.com" con contraseña "admin"');
        }else{
            arrayConfirmacion.push('El admin ya existía previamente.');
            console.log('El admin ya existía previamente.');
        }
        
        res.status(200).json({ 
            mensaje: 'Datos sincronizados correctamente',
            email: email
        });

    } catch (error) {
        console.error('Error al sincronizar datos:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};

app.post('/sincronizar-datos', sincronizarDatosHandler);

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
    console.log(`SincronizarDatos service running on port ${PORT}`);
});
