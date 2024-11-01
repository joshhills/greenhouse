<script setup lang="ts">

    import { io } from "socket.io-client"
    import { ref, useTemplateRef, onMounted } from 'vue'
    import { Canvas, Rect } from 'fabric'

    const props = defineProps(['accessToken'])

    const socket = io("http://localhost:3002", {
        autoConnect: false
    })

    const PIXEL_WIDTH = 10
    const COLUMNS = 50
    const ROWS = 50

    const isConnected = ref(false)
    const profileData = ref({} as any)
    const mouseDown = ref(false)

    const canvas = useTemplateRef('canvasRef')
    const actualCanvas = ref()

    function populateCanvas(canvas: Canvas) {
        for (let i = 0; i < COLUMNS; i++) {
            for (let j = 0; j < ROWS; j++) {
                canvas.add(new Rect({ 
                    height: PIXEL_WIDTH,
                    width: PIXEL_WIDTH,
                    top: (j % ROWS) * PIXEL_WIDTH,
                    left: (i % COLUMNS) * PIXEL_WIDTH,
                    fill: '#ffffff',
                    hoverCursor: 'cursor',
                    selectable: false
                }))
            }
        }
    }

    function requestPaint(x: number, y: number, colour: string) {
        socket.emit('paint', { x, y, colour })
    }

    onMounted(() => {

        actualCanvas.value = new Canvas(canvas.value as HTMLCanvasElement,
            {
                height: ROWS * PIXEL_WIDTH,
                width: COLUMNS * PIXEL_WIDTH,
                selection: false
            })

        let actualCanvasC = actualCanvas.value as Canvas

        populateCanvas(actualCanvasC)

        actualCanvasC.on('mouse:down', (e) => {

            mouseDown.value = true

            if (!e.target) {
                return
            }

            requestPaint(
                e.target.getX() / PIXEL_WIDTH,
                e.target.getY() / PIXEL_WIDTH,
                profileData.value.colour
            )

            e.target.set('fill', profileData.value.colour)
            // e.target.set('height', 8)
            // e.target.set('width', 8)
            // e.target.set('stroke', '#880E4F')
            // e.target.set('strokeWidth', 2)

            // actualCanvasC.requestRenderAll()
            e.target.render(actualCanvasC.getContext())
        })

        actualCanvasC.on('mouse:up', (e) => {
            mouseDown.value = false
        })

        actualCanvasC.on('mouse:move', (e) => {

            if (mouseDown.value) {

                if (!e.target) {
                    return
                }

                requestPaint(
                    e.target.getX() / PIXEL_WIDTH,
                    e.target.getY() / PIXEL_WIDTH,
                    profileData.value.colour
                )

                e.target.set('fill', profileData.value.colour)
                // e.target.set('height', 8)
                // e.target.set('width', 8)
                // e.target.set('stroke', '#880E4F')
                // e.target.set('strokeWidth', 2)
    
                // actualCanvasC.requestRenderAll()
                e.target.render(actualCanvasC.getContext())
            }
        })

        actualCanvasC.renderAll()

        handleConnect()
    })

    function handleConnect() {

        socket.auth = {
            token: props.accessToken
        }

        socket.on('connect', () => {
            isConnected.value = true
        })

        socket.on('disconnect', () => {
            isConnected.value = false
        })

        socket.on('profile', (_profileData) => {
            profileData.value = _profileData
        })

        socket.on('fullCanvas', (canvasData) => {

            let actualCanvasC = actualCanvas.value as Canvas

            for (let rect of actualCanvasC.getObjects('Rect')) {
                const x = rect.getX() / PIXEL_WIDTH
                const y = rect.getY() / PIXEL_WIDTH

                rect.set('fill', canvasData[y][x].colour)
                rect.render(actualCanvasC.getContext())
            }
        })

        socket.on('partialCanvas', (canvasData) => {
            
            let actualCanvasC = actualCanvas.value as Canvas

            // TODO: Store this in a map on creation so we don't have to seek it each time
            // Get specific rect
            for (let rect of actualCanvasC.getObjects('Rect')) {
                const x = rect.getX() / PIXEL_WIDTH
                const y = rect.getY() / PIXEL_WIDTH

                if (x === canvasData.x && y === canvasData.y) {
                    rect.set('fill', canvasData.colour)
                    rect.render(actualCanvasC.getContext())
                    break
                }
            }
            
        })

        socket.connect()
    }

</script>

<template>
  <div class="game">
    <h1>Game View</h1>
    
    <!-- Connection status -->
    <p v-if="isConnected">Connected!</p>
    <p v-if="!isConnected">Not connected</p>
    
    <!-- Profile data -->
    <p>Profile data: {{ profileData }}</p>

    <!-- Embedded game client -->
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>

</style>
