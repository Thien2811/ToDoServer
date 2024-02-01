import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql";
import cors from "cors";

require("dotenv").config();

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

const app = express();

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

app.get("/", (req, res) => {
  res.send("Thiens ToDo!");
});

app.post("/addlist", (req, res) => {
  const data = req.body.name;
  connection.query(
    `INSERT INTO lists (listname) VALUES ('${data}')`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

app.get("/getlistnames", (req, res) => {
  connection.query(`SELECT listname FROM lists`, (error, results) => {
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

app.delete("/task/:id", (req, res) => {
  const id = req.params.id;
  connection.query(`DELETE FROM tasks WHERE id=${id}`);
  res.status(200).end();
});

app.delete("/deletelist/:deletedlistname", (req, res) => {
  const data = req.params.deletedlistname;
  console.log(data);
  connection.query(
    `DELETE FROM lists WHERE listname='${data}'`,
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
    `INSERT INTO tasks (listname, taskname, description, user, datum, priority) VALUES ('${data.listname}','${data.taskname}','${data.description}','${data.user}',${datum},'${data.priority}')`,
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
    `UPDATE tasks SET taskname='${task.taskname}',description='${task.description}',user='${task.user}',datum=${datum},priority='${task.priority}' WHERE id=${task.id}`,
    (error, results) => {
      if (error) throw error;
      res.status(200).json(results).end();
    }
  );
});

const server = app.listen(PORT, () => {
  console.info(`Server offen auf Port ${PORT}`);
});
