import { Redis } from 'ioredis'

const client = new Redis()

const NUM_ROWS = 50
const NUM_COLUMNS = 50

const blankCanvas = () => {
    let canvas = [...Array(NUM_ROWS)].map(()=>Array(NUM_COLUMNS).fill({colour: '#ffffff', owner: null}))

    return canvas
}

const resetCanvas = async () => {

    // Remove anything already there
    const keys = await client.keys('canvas:*')
    if (keys.length > 0) {
        await client.del(keys)
    }

    // Get the structure of a blank canvas
    const canvas = blankCanvas()
    
    for (let i = 0; i < canvas.length; i++) {

        const row = canvas[i]
        
        await client.lpush(`canvas:${i}`, row.map(e=>JSON.stringify(e)))
    }
}

const getFullCanvas = async () => {
    
    let canvas = []

    for (let i = 0; i < NUM_ROWS; i++) {
        const row = await client.lrange(`canvas:${i}`, 0, -1)
        
        canvas[i] = row.map(e=>JSON.parse(e))
    }

    return canvas
}

const setCanvasValue = async (x, y, colour, owner) => {
    return await client.lset(`canvas:${y}`, +x, JSON.stringify({colour, owner}))
}

export { getFullCanvas, setCanvasValue, resetCanvas }