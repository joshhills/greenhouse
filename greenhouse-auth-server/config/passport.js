import 'dotenv/config'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import passport from 'passport'
import { v4 as uuidv4 } from 'uuid'
import { getUserByEmail, putUser } from '../services/dbService.js'
import { publicKey } from '../utils/jwt.js'

// Job of strategy is to verify user exists and return it
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URI,
    scope: 'profile email'
}, 
// These codes are *Google's*
async function (request, accessToken, refreshToken, profile, done) {

    try {
        
        // Retrieve data from profile
        let data = profile?._json

        // Find the user in database, otherwise create one
        let user = await getUserByEmail(data.email)

        if (!user) {

            user = {
                id: uuidv4(),
                email: data.email,
                googleId: data.sub,
                name: data.name
            }

            const newUser = await putUser(user) 
            
            return await done(null, newUser)
        }

        // TODO: Could check for difference in name and update name, discuss names
        // and isseus with account linking

        return await done(null, user)
        
    } catch (error) {
        return done(error, false)
    }
}))

passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
    passReqToCallback: true,
    secretOrKey: publicKey
}, async function (req, payload, done) {

    try {

        // TODO: Better differentiate user from machine
        if (payload.aud === 'postman' || payload.aud === 'greenhouse-game-server') {
            return done(null, { id: payload.sub }, payload)
        }

        // Find the user in database, otherwise create one
        let user = await getUserByEmail(payload.sub)

        // Check non-existence
        if (!user) {
            return done(null, false)
        }

        return done(null, user, payload)
        
    } catch (error) {
        return done(error, false)
    }
}))

passport.serializeUser((user, done) => {
    done(null, user)
})

passport.deserializeUser((user, done) => {
    done(null, user)
})