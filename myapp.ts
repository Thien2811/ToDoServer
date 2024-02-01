import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql";
import cors from "cors";

require("dotenv").config();

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

app.delete("/task/:taskname", (req, res) => {
  const taskname = req.params.taskname;
  connection.query(`DELETE FROM tasks WHERE taskname='${taskname}'`);
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

const server = app.listen(PORT, () => {
  console.info(`Server offen auf Port ${PORT}`);
});
