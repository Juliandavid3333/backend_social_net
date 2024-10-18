import User from '../models/user.js'
import bcrypt from 'bcrypt'
import { createToken } from '../services/jwt.js';

// Método de prueba del controlador user
export const testUser = (req, res) => {
    return res.status(200).send({
      message: "Mensaje enviado desde el controlador de Usuarios"
    });
  };

export const register = async (req, res) => {
  try {
    let params = req.body;

    if(!params.name || !params.last_name || !params.nick || !params.email || !params.password){
    return res.status(400).json({
      status: 'error',
      message:  'datos incompletos'
    });
  }

  let save_user = new User(params);

  const existing_user= await User.findOne({
    $or: [
      { email: save_user.email.toLowerCase()},
      { nick: save_user.nick.toLowerCase()}
    ]
  });

  if (existing_user){
    return res.status(200).send({
      status: 'success',
      message: 'El usuario ya existe'
    });
  }

  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash( save_user.password, salt);

  save_user.password = hashedPassword;

  await save_user.save();

  return res.status(201).json({
    status: "created",
    message: "Registro Exitoso",
    save_user
  });

 } catch (error) {
    console.log('Error en e lregistro de ususarios: ', error);

    return res.status(500).send({
      status: "error",
      message: "Error en el registro del usuario"
    })
  }
}



export const login = async (req, res) => {
  try {

    let params = req.body;

    if(!params.email || !params.password){

      return res.status(400).send({
        status: "error",
        message: "Faltan datos por enviar"
      });
    }

    const userBD = await User.findOne({ email: params.email.toLowerCase() })

    if(!userBD) {
      return res.status(404).send({
        status: "error",
        message: "Usuario no existe"
      })
    }

    const validPass = await bcrypt.compare(params.password, userBD.password)

    if(!validPass) {
      return res.status(401).send({
        status: "error",
        message: "Contraseña incorrecta"
      })
    }

    const token = createToken(userBD);

    return res.status(200).json({
      status: "success",
      message: "autenticacion exitosa",
      token,
      userBD: {
        id: userBD._id,
        name: userBD.name,
        last_name: userBD.last_name,
        email: userBD.email,
        nick: userBD.nick,
        image: userBD.image
      }
    });
    
  } catch (error) {
    console.log("Error en autenticacion del usuario: ", error);

    return res.status(500).send({
      status: "error",
      message: "Error en la autenticacion del usuario"
    });
  }
}