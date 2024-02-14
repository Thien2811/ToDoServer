import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql";
import cors from "cors";
import session from "express-session";
import redis from "redis";
import RedisStore from "connect-redis";
import cookieParser from "cookie-parser";
import fs from "fs";

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

app.post("/register", async (req, res) => {
  const user = req.body.user[0];
  user.password = await Bun.password.hash(req.body.user.password);
  connection.query(
    `INSERT INTO users (username,password) VALUES ('${user.username}','${user.password}')`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
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

app.get("/tags/:id", (req, res) => {
  const id = req.params.id;
  connection.query(
    `SELECT * FROM tags WHERE taskid='${id}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/getduetasks", (req, res) => {
  const currentDate = req.body.currentDate;
  const datum = currentDate;
  connection.query(
    `SELECT * from tasks WHERE datum='${datum}'`,
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

// app.post("/addtask", (req, res) => {
//   const data = req.body.task;
//   console.log(req.body);
//   const datum = data.datum
//     ? `"${data.datum.split(".").reverse().join("-")}"`
//     : "NULL";

//   connection.query(
//     `INSERT INTO tasks (listname, taskname, description, user, datum, priority, uuid, deleted) VALUES ('${data.listname}','${data.taskname}','${data.description}','${data.user}',${datum},'${data.priority}','${data.uuid}', false)`,
//     (error, results) => {
//       if (error) throw error;
//       res.status(200).json(results).end();
//     }
//   );
// });

app.post("/addtask", async (req, res) => {
  const data = req.body.task;
  console.log(req.body);
  const datum = data.datum
    ? `"${data.datum.split(".").reverse().join("-")}"`
    : "NULL";

  const id = (
    await query(
      `INSERT INTO tasks (listname, taskname, description, user, datum, priority, uuid, deleted) VALUES ('${data.listname}','${data.taskname}','${data.description}','${data.user}',${datum},'${data.priority}','${data.uuid}', false)`
    )
  ).insertId;
  data.tags.forEach(async (el: { tagname: string }) => {
    await query(
      `INSERT INTO tags (tagname, taskid) VALUES ('${el.tagname}',${id})`
    );
  });
  res.status(200).json({ insertId: id }).end();
});

async function query(query: string): Promise<any> {
  return new Promise((resolve) => {
    connection.query(query, (error, results) => {
      if (error) throw error;
      resolve(results);
    });
  });
}

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

app.post("/updateprio", (req, res) => {
  const data = req.body.taskname;
  const datum = new Date().toLocaleString("de").split(",")[0];
  const newDate = datum.split(".").reverse().join("-");
  console.log(datum);
  console.log(data);
  connection.query(
    `UPDATE tasks SET progress='DONE', datum='${newDate}' WHERE taskname='${data}' `
  );
});

app.get("/finishedtasks", (req, res) => {
  connection.query(
    `SELECT * FROM tasks WHERE progress='DONE' AND deleted=false`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.post("/archivetask", (req, res) => {
  const id = req.body.id;
  connection.query(
    `UPDATE tasks SET deleted=true WHERE id='${id}'`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end;
    }
  );
});

app.post("/addtaskinfo", (req, res) => {
  const data = req.body;
  const date = data.datum.split(".").reverse().join("-");
  connection.query(
    `
  UPDATE tasks SET taskname='${data.taskname}',description='${data.description}',user='${data.user}',datum='${date}',priority='${data.priority}' WHERE id='${data.id}'
  `,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end;
    }
  );
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
