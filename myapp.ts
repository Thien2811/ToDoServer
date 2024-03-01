import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql";
import cors, { CorsOptions } from "cors";
import session from "express-session";
import redis from "redis";
import RedisStore from "connect-redis";
import cookieParser from "cookie-parser";
import fs from "fs";

require("dotenv").config();

declare module "express-session" {
  interface Session {
    user: User;
    loggedIn: boolean;
  }
}

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

// app.use((req, res, next) => {
//   const allowedRoutes = ["/", "/login"];
//   if (!req.session.loggedIn) {
//     if (allowedRoutes.includes(req.url)) {
//       res.status(200).end();
//     } else {
//       res.status(401).end();
//     }
//   } else {
//     next();
//   }
// });

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

        console.log(req.session.loggedIn);
        res.status(200).json({ user: req.session.user });
      }
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

app.post("/changelist", (req, res) => {
  const data = req.body;
  console.log(data);
  connection.query(
    `
  UPDATE tasks SET listname='${data.listname}' WHERE taskname='${data.taskname}'
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
  connection.query(`DELETE FROM tags WHERE taskid=${id} `);
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
  connection.query(
    `UPDATE tasks SET progress='DONE', datum='${newDate}' WHERE taskname='${data}' `
  );
});

// app.post("/afterdrag", (req, res) => {
//   const data = req.body.tasks;
//   const listname = req.body.listname;
//   console.log(data.length);
//   // connection.query(`
//   // DELETE FROM tasks WHERE listname='${listname}'`,(error, results) => {
//   //   if(error) throw error
//   //   res.status(200)
//   // })
//   for (let task of data) {
//     connection.query();
//   }
// });

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
  if (data.progressnumber == null) {
    data.progressnumber = 0;
  }
  const date = data.datum.split(".").reverse().join("-");
  connection.query(
    `
  UPDATE tasks SET taskname='${data.taskname}',description='${data.description}',user='${data.user}',datum='${date}',priority='${data.priority}',progressnumber='${data.progressnumber}' WHERE id='${data.id}'
  `,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end;
    }
  );
});

app.get("/getalltasks", (req, res) => {
  console.log("hallo");
  connection.query(
    `
  SELECT * from tasks`,
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
