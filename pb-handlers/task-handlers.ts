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

export async function updateListOfTask(req: Request, res: Response){
    
    const { currentlistname, listname, taskname} = req.body 

    try {
        const taskToUpdate = await pb.collection('task').getFirstListItem(`listname = '${currentlistname}' && taskname = '${taskname}'`)

        await pb.collection('task').update(taskToUpdate.id, {listname: listname})

        res.status(200).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function getDueTasks(req: Request, res: Response){
    const date = req.params.date

    try {
        const dueTasks: (RecordModel & Task)[] = []
        const allTasks = await pb.collection('task').getFullList({
        }) as (RecordModel & Task)[]

        for(const task of allTasks){
            if(task.datum.split(' ')[0] === date) dueTasks.push(task)
        }

        res.status(200).json(dueTasks).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function deleteTask(req: Request, res: Response){
    const id = req.params.id

    try {
        await pb.collection('task').delete(id)
        res.status(200).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function updateProgress(req: Request, res: Response){
    const id = req.params.id

    try {
        await pb.collection('task').update(id, {progress: 1})
        res.status(200).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function getFinishedTasks(req: Request, res: Response){

    try{
        const finishedTasks = await pb.collection('task').getFullList({
            filter: `useraccount = '${req.session.user}' && progress = 1 && deleted = false`
        })

        res.status(200).json(finishedTasks).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function archiveTask(req: Request, res: Response){

    const id = req.params.id

    try{
        await pb.collection('task').update(id, {deleted: true})
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function addTaskInfo(req: Request, res: Response){
    
    const {datum, description, id, listname, priority, progress, progressnumber, tags, taskname, user} = req.body

    try {
        const updatedData: Task = {
            datum: datum,
            description: description,
            listname: listname,
            priority: priority,
            progress: progress,
            progressnumber: progressnumber,
            tags: tags,
            taskname: taskname,
            user: user,
        }

        await pb.collection('task').update(id, updatedData )
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function getAllTasks(req: Request, res: Response){

    try {
        const allTasks: (RecordModel & Task)[] = await pb.collection('task').getFullList({
            filter: `useraccount = '${req.session.user}'`
        })

        res.status(200).json(allTasks).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}