const clients = {
    'postman': {
        id: 'postman',
        secret: 's3cr3t',
        grantTypes: ['client_credentials', 'password'],
        scopes: [
            'admin',
            'game'
        ]
    },
    'greenhouse-game-client': {
        id: 'greenhouse-game-client',
        secret: 'publicS3cr3t',
        grantTypes: ['token', 'authorization_code'],
        redirectUris: [
            'http://localhost:3000/login/callback'
        ],
        scopes: [
            'game'
        ],
        allowOffline: true
    },
    'greenhouse-game-server': {
        id: 'greenhouse-game-server',
        secret: 's3cr3t',
        grantTypes: ['client_credentials'],
        scopes: [
            'server'
        ]
    }
}

export { clients }