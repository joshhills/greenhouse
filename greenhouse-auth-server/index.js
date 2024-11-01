// https://github.com/jeromyevans/node-oauth2-jwt-example

import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import passport from 'passport'
import './config/passport.js'
import cors from 'cors'

import { router as sharedRouter } from './routers/sharedRouter.js'

const app = express()

app.use(cors({
    origin: ['http://localhost:3000']
}))
app.use(json())
app.use(urlencoded({extended: false}))

app.use(passport.initialize())

app.use("/", sharedRouter)

app.listen(process.env.PORT, ()=>{
    console.log(`Server is listening on port ${process.env.PORT}`)
})