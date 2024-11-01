import { Redis } from 'ioredis'

const client = new Redis()

const getOrCreateProfile = async (playerId, playerName) => {
    
    const key = `game:profile:${playerId}`

    const profileExists = await client.exists(key)
    
    if (!profileExists) {
        await client.hset(key, {
            playerId: playerId,
            displayName: playerName,
            colour: `#${Math.floor(Math.random()*16777215).toString(16)}`
        })
    }

    return await client.hgetall(key)
}

export { getOrCreateProfile }