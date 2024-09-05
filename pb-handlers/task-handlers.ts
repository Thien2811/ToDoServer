import PocketBase, { type RecordModel } from "pocketbase";
import { type Request, type Response } from "express";
import type { Task } from '../../todowithtypescript/src/types/types.ts'

const pb = new PocketBase("http://127.0.0.1:8090/");
pb.autoCancellation(false);

type PBTask = RecordModel & Task & {useraccount: string}

export async function addTask(req: Request, res: Response){
    const task: Task = req.body.task
    try{ 
        const newTask = {
            listname: task.listname,
            taskname: task.taskname,
            description: task.description,
            user: task.user,
            datum: task.datum,
            priority: task.priority,
            tags: task.tags,
            useraccount: req.session.user,
            deleted: false,
            progress: task.progress,
            progressnumber: task.progressnumber,
        }

        console.log(newTask)

        const newEntry = await pb.collection('task').create<PBTask>(newTask)

        res.status(200).json({insertId: newEntry.id}).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function getTasks(req: Request, res: Response){
    const url = req.params.url

    try{
        
        const allTasks: PBTask[] = await pb.collection('task').getFullList({
            filter: `useraccount = '${req.session.user}' && listname = '${url}'`
        })

        res.status(200).json(allTasks).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}