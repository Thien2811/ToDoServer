import bodyParser from "body-parser";
import RedisStore from "connect-redis";
import cors, { CorsOptions } from "cors";
import express from "express";
import session from "express-session";
import redis from "redis";
import type { User } from "../todowithtypescript/src/types/types";
import { addList, deleteList, getListnames, updateColor, updateListname } from "./pb-handlers/list-handlers";
import { addTask, addTaskInfo, archiveTask, deleteTask, getAllTasks, getDueTasks, getFinishedTasks, getTasks, updateListOfTask, updateProgress } from "./pb-handlers/task-handlers";
import { checkLoginStatus, getWeatherData, login, logout, register, writeDataToJSON } from "./utils";

require("dotenv").config();

declare module "express-session" {
  interface Session {
    user: User;
    loggedIn: boolean;
  }
}

const PORT = 5000;

const redisClient = await redis
  .createClient({
    socket: {
      host: "localhost",
      port: 6379,
    },
  })
  .on("error", (err) =>
    console.warn("Fehler bei Erstellung von redisClient", err)
  )
  .on("connect", (err) => {
    console.info(`Mit redis verbunden`);
  })
  .connect();

const app = express();

const sessionOptions = {
  store: new RedisStore({ client: redisClient }),
  secret: "1",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
  },
};

app.use(session(sessionOptions));

const corsOptions: CorsOptions = {
  credentials: true,
  origin: ["http://localhost:9000"],
};

app.use(cors(corsOptions));

app.use(express.static("./spa"));

app.get("/isloggedin", checkLoginStatus);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

app.post('/register', register)

app.post('/login', login)

app.get('/logout', logout)

app.post("/getweatherdata", getWeatherData);

app.post('/addlist', addList)

app.get('/getlistnames', getListnames)

app.put('/color', updateColor)

app.get('/gettasks/:url', getTasks)

app.put('/changelist', updateListOfTask)

app.get('/weatherdata', getWeatherData)

app.get('/duetasks/:date', getDueTasks)

app.delete('/task/:id', deleteTask)

app.delete('/list/:id', deleteList)

app.post('/addtask', addTask)

app.put('/listname/:id/:listname', updateListname)

app.put('/progress/:id', updateProgress)

app.get("/finishedtasks", getFinishedTasks)

app.put('/archivetask/:id', archiveTask)

app.post('/taskinfo', addTaskInfo)

app.get('/alltasks', getAllTasks)

app.get("/download", async (req, res) => {
  await writeDataToJSON();
  res.download("databaseinfo.json");
});

app.listen(PORT, () => {
  console.info(`Server offen auf Port ${PORT}`);
});
