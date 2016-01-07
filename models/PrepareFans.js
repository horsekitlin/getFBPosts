import MongoBase from '../lib/MongoBase';
import { Schema } from "mongoose";

class PrepareFansBase extends MongoBase{
    constructor(name, schema){
        super(name, schema);
    }
}

let PrepareFans = new PrepareFansBase('prepare_fans', new Schema({
    fans_id : {
        type : String,
        unique : true,
        required : true
    },
    status : {
        type : Boolean,
        default : false,
        enum : [false, true]
    },
    created_time : {
        type : Number,
        required : true
    }
}));

export default PrepareFans;
