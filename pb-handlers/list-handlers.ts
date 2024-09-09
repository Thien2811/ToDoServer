import { type Request, type Response } from "express";
import PocketBase from "pocketbase";
import { List } from "../../todowithtypescript/src/types/types";

const pb = new PocketBase("http://127.0.0.1:8090/");
pb.autoCancellation(false);

export async function addList(req: Request, res: Response){
    const list: List = req.body.list

    try{
        const newList = {
            listname: list.listname,
            hex: list.hex,
            user: req.session.user
        }

        const newEntry = await pb.collection('lists').create(newList)

        res.status(200).json({id: newEntry.id}).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function getListnames(req: Request, res: Response){

    try{
        const allLists = await pb.collection('lists').getFullList({
            filter: `user = '${req.session.user}'`
        })
        
        res.status(200).json(allLists).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function deleteList(req: Request, res: Response){
    const id = req.params.id
    try {
    await pb.collection('lists').delete(id)

    res.status(200).end()
    } catch(e){
        res.status(500).end()
    }
}

export async function updateListname(req: Request, res: Response){

    const {id, listname} = req.params

    try {
        await pb.collection('lists').update(id, {listname: listname})
        res.status(200).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }
}

export async function updateColor(req: Request, res: Response){

    const {id, hex} = req.body

    try{
        await pb.collection('lists').update(id, {hex: hex})

        res.status(200).end()
    } catch(e) {
        console.log(e)
        res.status(500).end()
    }

}