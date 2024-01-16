import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import session from "express-session";
import redis from "redis";
import RedisStore from "connect-redis";

require("dotenv").config();

const PORT = +process.env.EXPRESS_PORT;

declare module "express-session" {
  interface Session {
    loggedIn?: boolean;
    user?: User;
  }
}

export type User = {
  id: number;
  name: string;
  pass_hash: string;
};

const app = express();

const redisClient = await redis
  .createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: +process.env.REDIS_PORT,
    },
  })
  .on("error", (err) =>
    console.warn("Fehler bei Erstellung von redisClient", err)
  )
  .on("connect", (err) => {
    console.info(
      `Mit redis verbunden unter ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
    );
  })
  .connect();

let corsOptions = {
  origin: "http://127.0.0.1:5173",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: false,
    },
  })
);

// app.use((req, res, next) => {
//   console.log(req.method, req.url);
//   next();
// });

// app.use((req, res, next) => {
//   if (
//     !req.session.loggedIn &&
//     req.url !== "/login" &&
//     !req.url.includes("/allsharedpages") &&
//     !req.url.includes("/sharedpage")
//   ) {
//     res.status(403).end().redirect("/");
//     return;
//   }
//   next();
// });

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: false, limit: "50mb" }));

app.post("/login", async (req, res) => {
  const data = req.body;
  const userRequest = {
    pass_hash:
      "$argon2id$v=19$m=65536,t=2,p=1$g3jainSm6OaikDr+sEtiHzRmd6IR9O8feyaie/qBzgM$zCy9V05bD4hJKhNp03D2jS+dA7uQxMXYK1gxosKwODA",
    name: "thien",
    id: 35,
  };
  if (userRequest instanceof Error) {
    res.json({ status: 404 });
    res.end();
    return;
  }
  const match = await Bun.password.verify(data.pass, userRequest.pass_hash);
  if (!match) {
    req.session.user = userRequest;
    req.session.loggedIn = true;
    res.json({ status: 200, username: req.session.user.name });
    return;
  } else {
    res.json({ status: 401 });
    res.end();
    return;
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return console.info(err);
    res.redirect("/");
  });
});

const server = app.listen(PORT, () => {
  console.info(`Server offen auf Port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.info(`An error occured: ${err}`);
  server.close(() => process.exit(1));
});
