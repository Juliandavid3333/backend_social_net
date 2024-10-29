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


export const profile = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(userId);
    console.log("User en la solicitud:", req.user);

    if(!req.user || !req.user.userId){
      return res.status(401).send({
        status: "success",
        message: "Usuario no autenticado"
      })
    }

    const userProfile = await User.findById(userId).select('-password -role -email -__v');

    console.log(userProfile);
    

    if(!userProfile){
      return res.status(404).send({
        status: "success",
        message: "usuario no encontrado"
      })
    }

    return res.status(200).json({
      status: "success",
      user: userProfile
    })


  } catch (error) {
    console.log("Error al obtener el perfil del usuario", error);
    return res.status(500).send({
      status: "error", 
      message: "Error al obtener el perfil del usuario"
    });
  }
}


export const listUsers = async (req, res) => {

  try {
    
    let page= req.params.page ? parseInt(req.params.page, 10) : 1;

    let itemsPerPage= req.query.limit ? parseInt(req.params.page, 10) : 4;

    const options = {
      page: page,
      limit: itemsPerPage,
      select: '-password -email -role -__v'
    };
    const users = await User.paginate({}, options);

    if(!users || users.docs.length === 0){
      return res.status(404).send({
        status: "error", 
        message: "No existen usuarios disponibles"
      })
    }

    return res.status(200).json({
      status: "success",
      users:  users.docs,
      totalDocs: users.totalDocs,
      totalPages: users.totalPages,
    })
  } catch (error) {
    
    console.log("Error al listar los usuarios: ", error);
    return res.status(500).send({
      status: "error", 
      message: "Error al listar los usuarios:"
    });
  }
}

export const updateUser = async (req, res) => {
  try {

    let userIdentity = req.user;
    let userToUpdate = req.body;

    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;

    const users = await User.find({
      $or: [
      { email: userToUpdate.email },
      { nick: userToUpdate.nick }
      ]
    }).exec();

    const isDuplicateUser = users.some(user => {
      return user && user._id.toString() === userIdentity.userId;
    });

    if (isDuplicateUser) {
      return res.status(400).send({
        status: "error",
        message: "Solo se puede actualizar datos de usuario logueado"
      });
    }

    if (userToUpdate.password) {
      try {
        let pwd = await bcrypt.hash(userToUpdate.password, 10);
        userToUpdate.password = pwd;
      } catch (error) {
        return res.status(500).send({
          status: "error",
          message: "Error al cifrar la contraseña"
        });
      }
    } else {
      delete userToUpdate.password;
    }

    let userUpdated = await User.findByIdAndUpdate(userIdentity.userId, 
      userToUpdate, {new: true});
      if(!userUpdated){
        return res.status(400).send({
          status: "error",
          message: "Error al actualizar el usuario"
        })
      }
      
    return res.status(200).json({
      status: "success",
      message: "Usuario actualizado correctamente",
      user: userUpdated
    });
    
  } catch (error) {
    console.log("Error al actualizar los datos del usuario: ", error);
    return res.status(500).send({
      status: "error",
      message: "Error al listar usuarios"
    });
  }
}

export const uploadAvatar = async (req, res) => {
  try {
    // Verificar si se ha subido un archivo
    if(!req.file){
      return res.status(400).send({
        status: "error",
        message: "Error la petición no incluye la imagen"
      });
    }

    // Obtener la URL del archivo subido en Cloudinary
    const avatarUrl = req.file.path;

    // Guardar la imagen en la BD
    const userUpdated = await User.findByIdAndUpdate(
      req.user.userId,
      { image: avatarUrl },
      { new: true }
    );

    // Verificar si la actualización fue exitosa
    if(!userUpdated){
      return res.status(500).send({
        status: "error",
        message: "Error al subir el archivo del avatar"
      });
    }

    // Devolver respuesta exitosa
    return res.status(200).json({
      status: "success",
      user: userUpdated,
      file: avatarUrl
    });

  } catch (error) {
    console.log("Error al subir el archivo del avatar", error);
    return res.status(500).send({
      status: "error",
      message: "Error al subir el archivo del avatar"
    });
  }

}

export const avatar = async (req, res) => {
  try {
    // Obtener el ID desde el parámetro del archivo 
    const userId = req.params.id;

    // Buscar el usuario en la base de datos para obtener la URL de Cloudinary
    const user = await User.findById(userId).select('image');

    // Verificar si el usuario existe y tiene una imagen
    if(!user || !user.image){
      return res.status(404).send({
        status: "error",
        message: "No existe usuario o imagen"
      });
    }

    // Redirigir a la URL de la imagen en Cloudinary
    return res.redirect(user.image);

  } catch (error) {
  console.log("Error al mostrar el archivo del avatar", error);
  return res.status(500).send({
    status: "error",
    message: "Error al mostrar el archivo del avatar"
  });
  }
};