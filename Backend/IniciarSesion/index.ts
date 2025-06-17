import express from 'express';
import { Request, Response } from 'express';
import mysql, { Pool } from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json());


const iniciarSesionHandler: express.RequestHandler = async (req, res) => {
    const pool = (req as any).db as Pool;
    const { usuario, contrasena } = req.body as {
        usuario: string;
        contrasena: string;
    };

    try {
        // Busca por correoElectronico igual a usuario
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
                email: usuarioDb.correoElectronico
            }
        });

    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
};
