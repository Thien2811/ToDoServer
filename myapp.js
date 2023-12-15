import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Thiens ToDo!");
});

app.post("/savelist", (req, res) => {
  fs.writeFile("lists.json", JSON.stringify(req.body), (err) => {
    console.log("err", err);
  });

  res.status(200).end();
});

app.get("/list", (req, res) => {
  fs.readFile("lists.json", (err, data) => {
    res.status(200).json(JSON.parse(data));
  });
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
