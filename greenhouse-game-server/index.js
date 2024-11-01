// https://socket.io/docs/v4/redis-adapter/
// https://socket.io/docs/v4/load-testing/

// Necessary to enable sticky sessions if scaling using round-robin load balancing
// https://socket.io/docs/v4/using-multiple-nodes/#enabling-sticky-session

import 'dotenv/config'
// import jwt from 'jsonwebtoken'
// import fs from 'fs'
import { Redis } from 'ioredis'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { getOrCreateProfile } from './services/profileService.js'
import { resetCanvas, getFullCanvas, setCanvasValue } from './services/canvasService.js'

// const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH)

const pubClient = new Redis()
const subClient = pubClient.duplicate()

await resetCanvas()

const io = new Server({
  adapter: createAdapter(pubClient, subClient),
  cors: {
    origin: "http://localhost:3000"
  }
})

// io.use((socket, next) => {
//     next(new Error("thou shall not pass"));
// });

io.on("connection", async (socket) => {

    socket.on('test', (data) => {
        console.log(`Received test message of '${data}'`)
    })

    socket.on('paint', (data) => {
        setCanvasValue(data.x, data.y, data.colour, socket.data.id)
        io.emit('partialCanvas', { x: data.x, y: data.y, colour: data.colour, owner: socket.data.id })
    })

    // Send the socket its profile data
    socket.emit('profile', socket.data.profile)
    
    socket.emit('fullCanvas', await getFullCanvas())
});  

// Auth middleware
io.use((socket, next) => {
    
    const token = socket.handshake.auth.token

    console.log(`New connection with token: ${token}`)

    // Check token validity
    if (token !== null) {
        
        // Can verify locally, check db for bans, or call auth server (to check for bans)
        // Depends on topology! Discuss this...
        // jwt.verify(token, publicKey, {
        //     algorithms: ['RS256'],
        //     audience: 'greenhouse-game-server',
        //     issuer: 'greenhouse-auth-server'
        // }, async (err, decoded) => {
        //     if (err) {
        //         return next(new Error(err))
        //     }

        //     if (!decoded.sub) {
        //         return next(new Error('Needs a player ID'))
        //     }

        //     if (!decoded.scope || decoded.scope.split(' ').indexOf('game') === -1) {
        //         return next(new Error('Insufficient scope'))
        //     }

        //     // Store data on socket private to server
        //     socket.data.id = decoded.sub
        //     socket.data.profile = await getOrCreateProfile(socket.data.id, decoded['greenhouse-auth-server:name'])

        //     return next()
        // })

        fetch('http://localhost:3001/auth/token/verify', {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }).then(response => response.json())
        .then(async (json) => {

            // TODO: Check game scope

            // Store data on socket private to server
            socket.data.id = json.sub
            socket.data.profile = await getOrCreateProfile(socket.data.id, json['greenhouse-auth-server:name'])

            // Join a room of their own ID so they can be communicated to by ID
            socket.join(socket.data.id)

            return next()
        }).catch(err => {
            return next(new Error("Bad token"))
        })
    } else {
        return next(new Error("No token"))
    }
})

subClient.on('message', async (channel, message) => {
    if (channel === 'bans') {

        // Disconnect any local sockets that are open for this user
        io.in(message).local.disconnectSockets(true)
    }
})

subClient.subscribe('bans')

io.listen(process.env.PORT)