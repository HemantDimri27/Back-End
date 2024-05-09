// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'


dotenv.config({
  path: './env'
})



connectDB()
.then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is runnig at port: ${process.env.PORT}`);
  })
})
.catch((error) => {
  console.log("MONGO db connection failed !!!", error);
})












/*  // First Approach: function, connect and handle database in index file

import mongoose from "mongoose";
import { DB_NAME} from "./constants";
import express from "express"
const app = express()


// ;()()    // iffi function, execute immidiatly, ; used for clear above
;( async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    app.on("error", (error) => {
      console.log("ERROR: ", error);
      throw error
    })

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port: ${process.env.PORT}`)
    })
  } catch (error) {
    console.error("ERROR: ", error)
    throw error
  }
})()

*/