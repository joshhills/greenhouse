import { format as urlFormat } from 'url'
import express from 'express'
import passport from 'passport'
import { checkAuthorized, generateToken } from '../utils/jwt.js'
import { putAuthorizationCode, getAuthorizationCode, getUserByEmail, putRefreshToken, getRefreshToken, putAccessToken, putUser, notifyBan } from '../services/dbService.js'
import jwks from '../jwks.json' assert { type: "json" }
import { v4 as uuidv4 } from 'uuid'
import hash_sum from 'hash-sum'

const router = express.Router()

const encodeQueryParams = (query) => {
    
    // Only extract the fields we care about
    const _query = {
        state: query.state,
        redirect_uri: query.redirect_uri,
        client_id: query.client_id,
        scope: query.scope,
        response_type: query.response_type,
        access_type: query.access_type
    }

    return encodeURIComponent(JSON.stringify(_query))
}

const decodeQueryParams = (query) => {
    return JSON.parse(decodeURIComponent(query))
}

router.get('/auth/google', (req, res) => {
    passport.authenticate(
        'google',
        {
            scope: 'profile email',
            state: encodeQueryParams(req.query)
        }
    )(req, res)
})

router.get('/auth/google/callback',
    passport.authenticate(
        'google',
        {
            session: false,
        }
    ),
    async (req, res) => {
            
        // Handle errors
        if (!req.user) {
            res.status(400).json({ error })
        }

        const query = decodeQueryParams(req.query.state)

        // At this point, we have the user from our database,
        // and their original request, so ensure that what they
        // have asked for is permitted
        if (!checkAuthorized(query)) {
            return res.sendStatus(401)
        }

        if (query.response_type === 'code') {

            const authorizationCode = uuidv4()
    
            await putAuthorizationCode(
                req.user.email,
                authorizationCode,
                query.scope,
                query.redirect_uri,
                query.client_id,
                query.access_type
            )
    
            return res.redirect(
                urlFormat({
                    pathname: query.redirect_uri,
                    query: {
                        code: authorizationCode,
                        state: query.state
                    }
                })
            )
        }

        if (query.response_type === 'token') {

            // Generate signed access token with requested scopes
            const [ accessToken, accessTokenExpiresIn ] = generateToken(
                req.user.email,
                'greenhouse-game-server',
                {
                    scope: query.scope,
                    'greenhouse-auth-server:name': req.user.name
                }
            )
            
            // Generate ID token with profile data
            const [ idToken, idTokenExpiresIn ] = generateToken(
                req.user.email,
                'greenhouse-game-client',
                {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email
                }
            )

            await putAccessToken(req.user.email, accessToken, accessTokenExpiresIn)
    
            const responseParams = {
                access_token: accessToken,
                id_token: idToken,
                token_type: 'Bearer',
                expires_in: accessTokenExpiresIn, // In seconds
                state: query.state
            }
    
            // Send it back to the client in OAuth2.0 RFC spec format
            return res.redirect(
                urlFormat({
                    pathname: query.redirect_uri,
                    query: responseParams,
                })
            )
        }

        return res.sendStatus(401)
    }
)

router.post('/auth/token', async (req, res) => {

    // Refresh token flow
    if (req.body.grant_type === 'refresh_token') {
        
        // It still exists
        const refreshToken = await getRefreshToken(req.body.refresh_token)
        
        if (!refreshToken) {
            return res.sendStatus(401)
        }
        
        const user = await getUserByEmail(refreshToken.email)

        if (!user) {
            return res.sendStatus(401)
        }

        if (user.banned) {
            return res.status(403).send('Banned')
        }

        // TODO: Do this by virtue of removing the prior one
        // It is the latest token
        // if (req.body.refresh_token !== user.refreshToken) {
        //     return res.sendStatus(401)
        // }
        // TODO: Check refresh token is not out of date (but somehow not cleaned up by Redis TTL)

        // Generate a new token set with the same permissions as the original
        const [ accessToken, accessTokenExpiresIn ] = generateToken(
            user.email,
            'greenhouse-game-server',
            {
                scope: refreshToken.scope,
                'greenhouse-auth-server:name': user.name
            }
        )
        
        // Generate ID token with profile data
        // TODO: Only do this if openid scope requested
        const [ idToken, idTokenExpiresIn ] = generateToken(
            user.email,
            'greenhouse-game-client',
            {
                id: user.id,
                name: user.name,
                email: user.email
            }
        )

        await putAccessToken(user.email, accessToken, accessTokenExpiresIn)

        const responseParams = {
            access_token: accessToken,
            id_token: idToken,
            token_type: 'Bearer',
            expires_in: accessTokenExpiresIn // In seconds
        }

        // Send it back to the client in OAuth2.0 RFC spec format
        return res.send(responseParams)
    }
    // Authorization code flow
    else if (req.body.grant_type === 'authorization_code') {

        // Get access code to compare
        const authorizationCode = await getAuthorizationCode(req.body.code)
        
        // If there's no record of one (expired), deny
        if (!authorizationCode) {
            // TODO: Function-ify this
            return res.sendStatus(401)   
        }

        // Check this request matches what was pre-approved
        if (req.body.client_id !== authorizationCode.clientId
            || req.body.redirect_uri !== authorizationCode.redirectUri) {
            return res.sendStatus(401)
        }

        // Re-build query object for re-verification
        // TODO: Only need to check secret as everthing
        // else was already checked
        const query = {
            grant_type: 'authorization_code',
            scope: authorizationCode.scope,
            redirect_uri: authorizationCode.redirectUri,
            client_id: authorizationCode.clientId,
            client_secret: req.body.client_secret,
            access_type: authorizationCode.accessType
        }

        if (!checkAuthorized(query)) {
            return res.sendStatus(401)
        }

        // TODO: Delete access code after sending response
        
        req.user = await getUserByEmail(authorizationCode.email)

        if (!req.user) {
            return res.sendStatus(401)
        }

        if (req.user.banned) {
            return res.status(403).send('Banned')
        }

        // Generate signed access token with requested scopes
        const [ accessToken, accessTokenExpiresIn ] = generateToken(
            req.user.email,
            'greenhouse-game-server',
            {
                scope: query.scope,
                'greenhouse-auth-server:name': req.user.name
            }
        )
        
        // Generate ID token with profile data
        // TODO: Only do this if openid scope requested
        const [ idToken, idTokenExpiresIn ] = generateToken(
            req.user.email,
            'greenhouse-game-client',
            {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            }
        )

        await putAccessToken(req.user.email, accessToken, accessTokenExpiresIn)

        const responseParams = {
            access_token: accessToken,
            id_token: idToken,
            token_type: 'Bearer',
            expires_in: accessTokenExpiresIn // In seconds
        }

        if (query.access_type === 'offline') {
            
            // Generate refresh token
            const refreshToken = uuidv4()

            await putRefreshToken(
                req.user.email,
                refreshToken,
                query.scope
            )

            responseParams.refresh_token = refreshToken
        }

        // Send it back to the client in OAuth2.0 RFC spec format
        return res.send(responseParams)
    }
    else if (req.body.grant_type === 'password') {

        if (!checkAuthorized(req.body)) {
            return res.sendStatus(401)
        }

        // TODO: Verify user against allow-list
        // TODO: Support initial creation of superuser to seed priveleged accounts
        const email = req.body.username
        const password = req.body.password

        const user = await getUserByEmail(email)

        if (user && user.banned) {
            return res.sendStatus(401)
        }

        // Specifically send 401 instead of 404, discuss why!
        if (!user || !user.password || hash_sum(user.salt + password) !== user.password) {
            return res.sendStatus(401)
        }

        // Generate signed access token with requested scopes
        const [ accessToken, accessTokenExpiresIn ] = generateToken(
            user.email,
            'greenhouse-game-server',
            {
                scope: req.body.scope,
                'greenhouse-auth-server:name': user.name
            }
        )
        
        // Generate ID token with profile data
        // TODO: Only do this if openid scope requested
        const [ idToken, idTokenExpiresIn ] = generateToken(
            user.email,
            'greenhouse-game-client',
            {
                id: user.id,
                name: user.name,
                email: user.email
            }
        )

        await putAccessToken(user.email, accessToken, accessTokenExpiresIn)

        const responseParams = {
            access_token: accessToken,
            id_token: idToken,
            token_type: 'Bearer',
            expires_in: accessTokenExpiresIn // In seconds
        }

        // Send it back to the client in OAuth2.0 RFC spec format
        return res.send(responseParams)
    }
    // Client credentials flow
    else if (req.body.grant_type === 'client_credentials') {

        // Only allow valid M2M auth on the token endpoint
        // Using resource here as a machine instance ID
        if (!req.body.resource
            || !checkAuthorized(req.body)) {
            return res.sendStatus(401)
        }

        const [ token, expiresIn ] = generateToken(req.body.resource, req.body.client_id, { scope: req.body.scope })

        const responseParams = {
            access_token: token,
            token_type: 'Bearer',
            expires_in: expiresIn // In seconds
        }

        return res.send(responseParams)
    }

    // Fallback unauthorized
    return res.sendStatus(401)
})

function requireScopes (...scopes) {
    return (req, res, next) => {

        const hasScopes = req.authInfo.scope.split(' ')
        for (const scope of scopes) {
            if (hasScopes.indexOf(scope) === -1) {
                return res.sendStatus(401)
            }
        }

        next()
    }
}

router.post('/auth/token/verify',
    passport.authenticate(
        'jwt',
        { session: false }
    ),
    // requireScopes('server'),
    async (req, res) => {

        if (req.user.banned) {
            return res.status(403).send('Banned')
        }

        return res.send(req.authInfo)
    }
)

router.post('/private/register',
    passport.authenticate(
        'jwt',
        { session: false }
    ),
    requireScopes('admin'),
    async (req, res) => {

        // Check for bad request
        if (!req.body.username || !req.body.name || !req.body.password) {
            return res.sendStatus(400)
        }

        // Generate random salt to guard against rainbow attacks
        const salt = uuidv4()

        return res.send(await putUser({
            id: uuidv4(),
            email: req.body.username,
            name: req.body.name,
            password: hash_sum(salt + req.body.password),
            salt
        }))
    }
)

router.post('/private/ban',
    passport.authenticate(
        'jwt',
        { session: false }
    ),
    requireScopes('admin'),
    async (req, res) => {
        
        // Check for bad request
        if (!req.body.email) {
            return res.sendStatus(400)
        }

        const user = await getUserByEmail(req.body.email)

        if (!user) {
            return res.sendStatus(404)
        }
        // 
        else if (!user.banned) {
            // TODO: Can just update one field...
            await putUser( { ...user, banned: 1 })

            // Inform other systems
            notifyBan(user.email)
        }

        return res.sendStatus(200)
    }
)

router.post('/private/unban',
    passport.authenticate(
        'jwt',
        { session: false }
    ),
    requireScopes('admin'),
    async (req, res) => {
        
        // Check for bad request
        if (!req.body.email) {
            return res.sendStatus(400)
        }

        const user = await getUserByEmail(req.body.email)
        
        if (!user) {
            return res.sendStatus(404)
        }
        else {
            // TODO: Can just update one field...
            await putUser( { ...user, banned: 0 })
        }

        return res.sendStatus(200)
    }
)

router.post('/auth/revoke', (req, res) => {
    
    // TODO: Decide what is revoked (e.g. just token, or entire grant)
})

router.get('/.well-known/jwks.json', (req, res) => {
    return res.send(jwks)
})

export { router }