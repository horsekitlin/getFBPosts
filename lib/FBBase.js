import FB from 'fb';
import _ from 'lodash';
import co from 'co';
import ErrorManager from './ErrorBase';
import { format, add, now } from '../lib/TimeBase';

const config = {
    post_fields : 'message,created_time,story,link,full_picture,comments,picture,from',
    FB : {
        appId : '1724899327731863',
        secret : '6332803ee65a913901e491bd020ae009',
    },
};

class FBBase {
    constructor(){
        this.appToken = '1724899327731863|3xTxBl1nku2nb60Di77bwSiVdo8';
    }
    initial_app(){
        this.getAppToken()
        .then((resp) => {
            this.appToken = resp.access_token;
        }.bind(this));
    }
    getToken(){
        return this.appToken;
    }
    getLikesFans(ID){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}/likes`, {
                access_token : token,
                limit : 100
            }, (err, resp) => {
                if(err) reject(err);
                else resolve(resp);
            });
        });
    }
    /**
     *  @params ID : 文章的ID
     *  @params type : enum ["likes", "comments"]
     *      likes : 按讚數量
     *      comments : 留言數量
    * **/
    getPostTotal(ID, type){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}/${type}`, {
                access_token : token,
                summary : true
            }, (err, resp) => {
                if(err) reject(err);
                else resolve(resp);
            });
        });
    }
    getAppToken(){
        return new Promise((resolve, reject) => {
            FB.api('oauth/access_token', {
                client_id : config.FB.appId,
                client_secret : config.FB.secret,
                grant_type: 'client_credentials'
            }, (res) => {
                if(!res || res.error){
                    reject(res.error);
                }else{
                    resolve(res);
                }
            });
        });
    }
    getOldPosts(fans_id, url){
        let _this = this;

        return co(function* (){
            let posts = yield _this.nextpage(fans_id, url);

            if(posts.data.length === 100
                && !_.isUndefined(posts.paging)
                && !_.isUndefined(posts.paging.next)){
                let nextpage = yield _this.getOldPosts(fans_id
                    , posts.paging.next);

                nextpage.map((p) => {
                    posts.data.push(p);
                });
                return posts.data;
            }else{
                return posts.data;
            }
        });
    }
    nextpage(fans_id, url){
        return fetch(`${url}&fields=${config.post_fields}`)
        .then((resp) => {
            return resp.json();
        });
    }
    getPosts(ID, options){
        const token = this.getToken();
        options.access_token = token;
        return new Promise((resolve, reject) => {
            return FB.napi(`/${ID}/feed`, options, (err, resp) => {
                if(err){
                    reject(err);
                }else{
                    resolve(resp);
                }
            });
        });
    }
    /**
     * @params ID : 粉絲團ID
    * **/
    getFans(ID){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}`, {
                access_token : token,
                fields : 'location,emails,about,name'
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
    /**
     * @params ID : 文章ID
    * **/
    getShared(ID){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}/sharedposts`, {
                access_token : token,
                fields : 'id'
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
    /**
     * @params ID : 粉絲團ID
     * @params start : 開始的timestamp
     * @params end : 結束的timestamp
    * **/
    getMoreDaysPosts(ID, start, end){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            const start_date = format(start);
            const end_date = format(end);
            FB.napi(`${ID}/feed`, {
                access_token : token,
                limit : 100,
                fields : config.post_fields,
                since : start_date,
                until : end_date
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
    /**
     * @params ID : 粉絲團或會員ID
     * @params timestamp : 要取得某天的timestamp 或 字串(2015-11-12)
    * **/
    getSomeDayPosts(ID, timestamp){
        const token = this.getToken();
        timestamp = timestamp || now();
        return new Promise((resolve, reject) => {
            const start_date = format(timestamp);
            const end_date = format(add('1', 'days'));
            FB.napi(`${ID}/feed`, {
                access_token : token,
                limit : 100,
                fields : config.post_fields,
                since : start_date,
                until : end_date
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
    getAllPosts(ID){
        FB.api(`${ID}/feed?limit=100`);
    }
}

let FBManager = new FBBase();

FBManager.initial_app();

export default FBManager;
