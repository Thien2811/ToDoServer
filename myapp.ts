import bodyParser from "body-parser";
import RedisStore from "connect-redis";
import cors, { CorsOptions } from "cors";
import express from "express";
import session from "express-session";
import fs from "fs";
import mysql from "mysql";
import redis from "redis";
import PocketBase, { type RecordAuthResponse } from 'pocketbase'
import { addTask, getTasks } from "./pb-handlers/task-handlers";
import { addList, deleteList, getListnames, updateColor, updateListname } from "./pb-handlers/list-handlers";

require("dotenv").config();

declare module "express-session" {
  interface Session {
    user: User;
    loggedIn: boolean;
  }
}

const pb = new PocketBase('http://127.0.0.1:8090')

type User = {
  id: number;
  name: string;
  passHash: string;
};

type Task = {
  id: number;
  listname: string;
  taskname: string;
  description: string;
  user: string;
  date: string;
  priority: string;
  uuid: string;
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

const connection = mysql.createConnection({
  host: "localhost",
  user: "thien",
  password: "Thien2811",
  database: "todo",
});
connection.connect();

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

app.get("/isloggedin", (req, res) => {
  if (req.session.loggedIn) {
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Thiens ToDo!");
});

async function query(query: string): Promise<any> {
  return new Promise((resolve) => {
    connection.query(query, (error, results) => {
      if (error) throw error;
      resolve(results);
    });
  });
}

app.post("/register", async (req, res) => {
  const user = req.body.user[0];
  user.password = await Bun.password.hash(req.body.user.password);
  connection.query(
    `
    SELECT * FROM users WHERE username='${user.username}'
  `,
    (error, results) => {
      if (error) throw error;
      if (results.length > 0) {
        res.status(409).end();
      } else {
        connection.query(
          `INSERT INTO users (username,password) VALUES ('${user.username}','${user.password}')`,
          (error, results) => {
            if (error) throw error;
            res.status(200).json(results).end();
          }
        );
      }
    }
  );
});

app.post("/login", (req, res) => {
  const { user, password } = req.body;
  connection.query(
    `SELECT * FROM users WHERE username='${user}'`,
    (error, results) => {
      if (error) {
        res.status(500).end();
        throw error;
      }
      let check = false;
      if (Bun.password.verify(password, results[0].password)) {
        check = true;
      }
      if (check == true) {
        req.session.user = user;
        req.session.loggedIn = true;

        res.status(200).json({ user: req.session.user });
      }
    }
  );
});

app.post('/addlist', addList)

app.get('/getlistnames', getListnames)

// app.post("/color", (req, res) => {
//   const data = req.body;
//   connection.query(
//     `
//     UPDATE lists SET hex='${data.hex}' WHERE uuid='${data.uuid}'
//   `,
//     (error, results) => {
//       if (error) throw error;
//       res.status(200).end();
//     }
//   );
// });

app.put('/color', updateColor)

app.post("/getcolor", (req, res) => {
  const data = req.body.uuid;
  connection.query(
    `
    SELECT * FROM lists WHERE uuid='${data}'
  `,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.get('/gettasks/:url', getTasks)

app.post("/changelist", (req, res) => {
  const data = req.body;
  connection.query(
    `
  UPDATE tasks SET listname='${data.listname}' WHERE taskname='${data.taskname}' AND user='${req.session.user}'
  `,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.get("/tags/:id", (req, res) => {
  const id = req.params.id;
  connection.query(
    `SELECT * FROM tags WHERE taskid='${id}' AND user='${req.session.user}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/getweatherdata", (req, res) => {
  const data = req.body.condition;
  const weatherdata = JSON.parse(
    fs.readFileSync(
      "/home/thien2811/Documents/azubi-aufgaben/uebungen/todo_typescript/myapp/data/conditions.json",
      "utf8"
    )
  );
  res.json(weatherdata[data]);
});

app.post("/getduetasks", (req, res) => {
  const user = req.session.user;
  const currentDate = req.body.currentDate;
  const datum = currentDate;
  connection.query(
    `SELECT * from tasks WHERE datum='${datum}' AND useraccount='${req.session.user}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.delete("/task/:id", (req, res) => {
  const id = req.params.id;
  connection.query(
    `DELETE FROM tasks WHERE id=${id} AND useraccount='${req.session.user}'`
  );
  connection.query(
    `DELETE FROM tags WHERE taskid=${id} AND user='${req.session.user}' `
  );
  res.status(200).end();
});

app.delete('/list/:id', deleteList)

app.post('/addtask', addTask)

app.post("/save", (req, res) => {
  const task: Task = req.body.task;
  const datum = task.date
    ? `"${task.date.split(".").reverse().join("-")}"`
    : "NULL";
  connection.query(
    `UPDATE tasks SET taskname='${task.taskname}',description='${task.description}',user='${task.user}',datum=${datum},priority='${task.priority}',uuid='${task.uuid}' WHERE id=${task.id} and useraccount='${req.session.user}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/savelistname", (req, res) => {
  const list = req.body;
  connection.query(
    `UPDATE lists SET listname='${list.listname}' WHERE uuid='${list.id}' AND user='${req.session.user}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
  connection.query(
    `UPDATE tasks SET listname='${list.listname}' WHERE uuid='${list.id}' AND useraccount='${req.session.user}'`
  );
});

app.put('/listname/:id/:listname', updateListname)

app.post("/updateprio", (req, res) => {
  const data = req.body.taskname;
  const datum = new Date().toLocaleString("de").split(",")[0];
  const newDate = datum.split(".").reverse().join("-");
  connection.query(
    `UPDATE tasks SET progress='DONE', datum='${newDate}' WHERE taskname='${data}' AND useraccount='${req.session.user}'`
  );
});

app.get("/finishedtasks", (req, res) => {
  connection.query(
    `SELECT * FROM tasks WHERE progress='DONE' AND deleted=false AND useraccount='${req.session.user}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/archivetask", (req, res) => {
  const id = req.body.id;
  connection.query(
    `UPDATE tasks SET deleted=true WHERE id='${id}' AND useraccount='${req.session.user}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end;
    }
  );
});

app.post("/addtaskinfo", (req, res) => {
  const data = req.body;
  if (data.progressnumber == null) {
    data.progressnumber = 0;
  }
  const date = data.datum.split(".").reverse().join("-");
  connection.query(
    `
  UPDATE tasks SET taskname='${data.taskname}',description='${data.description}',user='${data.user}',datum='${date}',priority='${data.priority}',progressnumber='${data.progressnumber}' WHERE id='${data.id}' AND useraccount='${req.session.user}'
  `,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end;
    }
  );
});

app.get("/getalltasks", (req, res) => {
  connection.query(
    `
  SELECT * from tasks WHERE useraccount='${req.session.user}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.status(200).end();
  });
});

async function writeDataToJSON() {
  const tasks = await query(
    `
  SELECT * FROM tasks
  `
  );
  const lists = await query(`
  SELECT * FROM lists
  `);
  const tags = await query(`
  SELECT * FROM tags
  `);

  fs.writeFileSync(
    "databaseinfo.json",
    JSON.stringify({ tasks, lists, tags }, null, "\t")
  );
}

app.get("/download", async (req, res) => {
  await writeDataToJSON();
  res.download("databaseinfo.json");
});

const server = app.listen(PORT, () => {
  console.info(`Server offen auf Port ${PORT}`);
});
