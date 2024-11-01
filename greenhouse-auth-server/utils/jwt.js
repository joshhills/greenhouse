import 'dotenv/config'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import { clients } from '../config/registeredClients.js'

// The signing key for tokens (no key rotation)
const privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH)
const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH)

const checkAuthorized = (query) => {

    // Check for allowed flows
    if (query.response_type && query.response_type !== 'token' && query.response_type !== 'code') {
        return false
    }
    if (query.grant_type && query.grant_type !== 'password' && query.grant_type !== 'authorization_code' && query.grant_type !== 'client_credentials') {
        return false
    }
    if (!query.grant_type && !query.response_type) {
        return false
    }

    // Find registered client
    if (!clients[query.client_id]) {
        return false
    }

    // Check client exists by ID
    const clientConfig = clients[query.client_id]

    // Check refresh token is allowed if requested
    if (query.access_type === 'offline' && !clientConfig.allowOffline) {
        return false
    }

    // Ensure response type is supported
    if (query.response_type) {
        if (query.response_type === 'token' && clientConfig.grantTypes.indexOf('token') === -1) {
            return false
        } else if (query.response_type === 'code' && clientConfig.grantTypes.indexOf('authorization_code') === -1) {
            return false
        }
    }
    if (query.grant_type) {
        if (clientConfig.grantTypes.indexOf(query.grant_type) === -1) {
            return false
        }
    }

    // Check other options as necessary
    if (query.response_type === 'token' || query.response_type === 'code' || query.grant_type === 'authorization_code') {
        // Check that the redirect URI is a subset of permitted redirect URIs
        if (clientConfig.redirectUris.indexOf(query.redirect_uri) === -1) {
            return false
        }
    }
    if (query.grant_type === 'password' || query.grant_type === 'client_credentials' || query.grant_type === 'authorization_code') {
        // Ensure client secret matches
        if (clientConfig.secret !== query.client_secret) {
            return false
        }
    }

    // Check that the requested scopes is a subset of permitted scopes
    for (const requestedScope of query.scope.split(' ')) {
        if (clientConfig.scopes.indexOf(requestedScope) === -1) {
            return false
        }
    }

    return true
}

const generateToken = (userId, audience, payload) => {

    // Time from now that the token expires
    const expiresIn = +process.env.JWT_EXPIRATION_S

    // Which service issues the token
    const issuer = process.env.JWT_ISSUER

    // Create JWT signed by key
    return [ jwt.sign(
        payload,
        privateKey,
        {
            algorithm: 'RS256',
            expiresIn,
            audience,
            issuer,
            subject: userId.toString()
        }
    ), expiresIn ]
}

const verifyToken = (token) => {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] })
}

export { checkAuthorized, generateToken, verifyToken, publicKey }