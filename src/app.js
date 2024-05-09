import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";             // for excess and set cookies in user's browser

const app = express()

app.use(cors({      // use is for middle-wares
  origin: process.env.CORS_ORIGIN,
  credentialsa: true
}))


app.use(express.json({limit: "16kb"}))                             // data form of jsom, like forms info etc.
app.use(express.urlencoded({extended: true, limit: "16kb"}))       // data in url and its extends
app.use(express.static("public"))                                  // folder name "public" for store media on server

app.use(cookieParser())


// routes import
import userRouter from "./routers/user.routes.js";      // ex: routes


// routes declaration
app.use("/api/v1/users", userRouter)                     // it become prefix

// http://localhost:8000/api/v1/users/register 


export { app }