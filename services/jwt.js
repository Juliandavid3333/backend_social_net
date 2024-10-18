import jwt from 'jwt-simple';
import moment from 'moment';


const secret = 'SECRET_KEY_PROJECT_SOCIAL_NET.@';

const createToken = (user) => {
    const payload = {
        userId: user._id,
        role: user.role,
        iat: moment().unix(),
        exp: moment().add(7, 'days').unix()
    }


    return jwt.encode(payload, secret);
}

export { secret, createToken}