import { createClient } from 'redis'

const client = createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`})
await client.connect()

const getUserByEmail = async (email) => {

    const key = `auth:user:${email}`

    const exists = await client.exists(key)

    if (!exists) {
        return null
    }

    return await client.hGetAll(key)
}

const putUser = async (user) => {

    console.log(user)

    await client.hSet(`auth:user:${user.email}`, user)

    return getUserByEmail(user.email)
}

const putAccessToken = async (email, accessToken, accessTokenExpiresIn) => {

    await client.hSet(`auth:accessToken:${accessToken}`, { email, accessToken })
    return await client.expire(`auth:accessToken:${accessToken}`, accessTokenExpiresIn)
}

const putRefreshToken = async (email, refreshToken, scope) => {

    await client.hSet(`auth:refreshToken:${refreshToken}`, { email, refreshToken, scope })
    return await client.expire(`auth:refreshToken:${refreshToken}`, +process.env.JWT_REFRESH_EXPIRATION_S)
}

const getRefreshToken = async (refreshToken) => {
    
    const key = `auth:refreshToken:${refreshToken}`

    const exists = await client.exists(key)

    if (!exists) {
        return null
    }

    return await client.hGetAll(key)
}

const putAuthorizationCode = async (email, authorizationCode, scope, redirectUri, clientId, accessType) => {

    let _authorizationCode = {
        'email': email,
        'authorizationCode': authorizationCode,
        'scope': scope,
        'redirectUri': redirectUri,
        'clientId': clientId
    }

    if (accessType) {
        _authorizationCode['accessType'] = accessType
    }

    await client.hSet(
        `auth:authorizationCode:${authorizationCode}`,
        _authorizationCode
    )

    return await client.expire(`auth:authorizationCode:${authorizationCode}`, +process.env.AUTHORIZATION_CODE_EXPIRATION_S)
}

const getAuthorizationCode = async (authorizationCode) => {
    
    const key = `auth:authorizationCode:${authorizationCode}`

    const exists = await client.exists(key)

    if (!exists) {
        return null
    }

    return await client.hGetAll(key)
}

const notifyBan = async (email) => {
    client.publish('bans', email)
}

export {
    getUserByEmail,
    putUser,
    putAccessToken,
    putAuthorizationCode,
    getAuthorizationCode,
    putRefreshToken,
    getRefreshToken,
    notifyBan
}