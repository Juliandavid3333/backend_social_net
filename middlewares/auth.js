import jwt from 'jwt-simple';
import moment from 'moment';
import {secret} from '../services/jwt.js';


export const ensureAuth = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(403).send({
            status: "error",
            message: "La petición no tiene la cabecera de autenticación"
        });
    }

    const token = req.headers.authorization.replace(/['"]+/g, '').replace("Bearer ", "");
    console.log(token);
    try {
        let payload = jwt.decode(token, secret);

        if (payload.exp <= moment().unix()) {
            return res.status(401).send({
                status: "error",
                message: "El token no es válido"
            });
        }

        req.user = payload;

    } catch (error) {
        console.error("Error al verificar el token", error);
        return res.status(403).send({
            status: "error",
            message: "Token no válido"
        });
    }

    next();
}
