import { type Request, type Response } from "express";
import fs from "fs";
import PocketBase from 'pocketbase';

const pb = new PocketBase("http://127.0.0.1:8090/");
pb.autoCancellation(false);

require('dotenv').config()

export async function writeDataToJSON() {
    const tasks = await pb.collection('task').getFullList()

    const lists = await pb.collection('lists').getFullList()

    console.log(tasks,lists)
  
    fs.writeFileSync(
      "databaseinfo.json",
      JSON.stringify({ tasks, lists }, null, "\t")
    );
  }

export async function getWeatherData(req: Request, res:Response){
    const condition = req.body.condition

    try {
        const weatherdata = JSON.parse(
            fs.readFileSync(
              "/home/thien2811/Documents/azubi-aufgaben/uebungen/todo_typescript/myapp/data/conditions.json",
              "utf8"
            )
          );
          res.status(200).json(weatherdata[condition]).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function register(req: Request, res: Response){

    const {username, password} = req.body.user

    try {

        const sameUserName = await pb.collection('users').getFullList({
            filter: `username = '${username}'`
        })

        if(sameUserName.length === 0){
            const userData = {
                username: username,
                password: password,
                passwordConfirm: password,
       
            }
            
            await pb.collection('users').create(userData)

            res.status(200).end()

        } else {
            res.status(409).end()
        }

    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function login(req: Request, res: Response){
    
    const {user, password} = req.body

    try {
        await pb.collection('users').authWithPassword(user, password)

            req.session.user = user
            req.session.loggedIn = true

            res.status(200).json({user: req.session.user}).end()

    } catch(e) {
        console.log(e)
        res.status(401).json(e).end()
    }

}

export async function logout(req: Request, res: Response){
    try {
        pb.authStore.clear()
        req.session.destroy((err) => {
            if (err) throw err;
          });
        res.status(200).end() 
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function checkLoginStatus(req: Request, res: Response){
    if (req.session.loggedIn) {
        res.sendStatus(200);
      } else {
        res.sendStatus(403);
      }
}