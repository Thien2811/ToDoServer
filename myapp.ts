import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql";
import cors from "cors";
import session from "express-session";
import redis from "redis";
import RedisStore from "connect-redis";
import cookieParser from "cookie-parser";

require("dotenv").config();

declare module "express-session" {
  interface Session {
    user: User;
  }
}

type User = {
  id: number;
  name: string;
  passHash: string;
  loggedIn: boolean;
};

type Task = {
  id: number;
  listname: string;
  taskname: string;
  description: string;
  user: string;
  date: string;
  priority: string;
};

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

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: "123123123123123123123",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
    },
  })
);

const connection = mysql.createConnection({
  host: "localhost",
  user: "thien",
  password: "Thien2811",
  database: "todo",
});

connection.connect();

app.use(cors());

// app.use((req, res, next) => {
//   console.log(req.path, "jetziger pfad");
//   next();
// });

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

app.use(express.static("./spa"));

// app.use((req, res, next) => {
//   if (!req.session.user?.loggedIn) {
//     //nicht eingeloggt
//     if (req.route === "/login") {
//       //route ist ein login
//     } else {
//       res.status(401).end();
//       //request ist kein login
//     }
//   } else {
//     next();
//     //ist eingeloggt
//   }
// });

app.get("/", (req, res) => {
  res.send("Thiens ToDo!");
});

app.post("/addlist", (req, res) => {
  const data = req.body.list[0];
  connection.query(
    `INSERT INTO lists (listname, uuid) VALUES ('${data.listname}','${data.uuid}')`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.get("/getlistnames", (req, res) => {
  connection.query(`SELECT listname,uuid FROM lists`, (error, results) => {
    if (error) throw error;
    res.status(200).json(results);
  });
});

app.post("/gettasks", (req, res) => {
  const data = req.body.url;
  connection.query(
    `SELECT * FROM tasks WHERE listname='${data}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

// app.get("/login", (req, res) => {
//   const dbUser = db.getuser;
//   if (verified) {
//     req.session.user = {
//       id: dbUser.id,
//       name: dbUser.name,
//       pass_hash: dbUser.pass_hash,
//     };
//   }
// });

app.delete("/task/:id", (req, res) => {
  const id = req.params.id;
  connection.query(`DELETE FROM tasks WHERE id=${id}`);
  res.status(200).end();
});

app.delete("/deletelist/:deletedlistname", (req, res) => {
  const data = req.params.deletedlistname;
  connection.query(
    `DELETE FROM lists WHERE listname='${data}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
  connection.query(
    `DELETE FROM tasks WHERE listname='${data}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/addtask", (req, res) => {
  const data = req.body.task;

  const datum = data.date
    ? `"${data.date.split(".").reverse().join("-")}"`
    : "NULL";

  connection.query(
    `INSERT INTO tasks (listname, taskname, description, user, datum, priority, uuid) VALUES ('${data.listname}','${data.taskname}','${data.description}','${data.user}',${datum},'${data.priority}','${data.uuid}')`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/save", (req, res) => {
  const task: Task = req.body.task;
  const datum = task.date
    ? `"${task.date.split(".").reverse().join("-")}"`
    : "NULL";
  connection.query(
    `UPDATE tasks SET taskname='${task.taskname}',description='${task.description}',user='${task.user}',datum=${datum},priority='${task.priority}',uuid='${task.uuid}' WHERE id=${task.id}`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/savelistname", (req, res) => {
  const list = req.body;
  connection.query(
    `UPDATE lists SET listname='${list.listname}' WHERE uuid='${list.id}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
  connection.query(
    `UPDATE tasks SET listname='${list.listname}' WHERE uuid='${list.id}'`
  );
});

const server = app.listen(PORT, () => {
  console.info(`Server offen auf Port ${PORT}`);
});
