import MongoBase from '../lib/MongoBase';
import { Schema } from "mongoose";

class FansBase extends MongoBase{
    constructor(name, schema){
        super(name, schema);
    }
}

let Fans = new FansBase('fans', new Schema({
    fans_id : {
        type : String,
        index : true,
        required : true
    },
    zip : {
        type : String
    },
    street : {
        type : String
    },
    emails : [{
        type : String
    }],
    abount : {
        type : String
    },
    country : {
        type : String
    },
    city : {
        type : String
    },
    initial : {
        type : Boolean,
        default : false,
        enums : [true, false]
    },
    days : {
        sharedposts : {
            type : Boolean,
            default : false,
            enums : [false, true]
        }
    },
    lock : {
        type : Boolean,
        default : false
    },
    name : {
        type : String,
        index : true,
        required : true
    },
    nextpage : {
        type : String
    },
    created_time : {
        type : Number,
        required : true
    }
}));

export default Fans;
