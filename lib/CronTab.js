import Schedule from 'node-schedule';
import Promise from 'bluebird';
import _ from 'lodash';
import co from 'co';
import FBManager from './FBBase';
import ErrorManager from './ErrorBase';
import { Fans, Posts, Logs, PrepareFans } from '../models';
import { now, getTimeStamp, add, format } from '../lib/TimeBase';

const config = {
    post_fields : 'message,created_time,story,link,full_picture,comments,picture,from',
    posts_limit : 100,
    shared_post : {
        unit : 'day',
        num : -60
    },
};

class CronTabClass extends Object {
    constructor(){
        super();
        this._addjob = Schedule.scheduleJob;
        this._jobs = [];
    }
    createJob(time, job){
        const newjob = this._addjob(time, job);
        this._jobs.push(newjob);
    }
    getLikesFans(){
        co(function* (){
            let query = [],
                newpages = [],
                new_ids = [],
                old_ids = [],
                pages = [],
                result = [],
                timestamp = now(),
                index;

            const fanspages = yield Fans.listAll({
                initial : false
            }, '-created_time', {skip : 0, limit : 10});

            pages = _.map(fanspages.content, (fanspage) => {
                old_ids.push(fanspage._id);
                return FBManager.getLikesFans(fanspage.fans_id);
            });

            const pages_rs = yield pages;

            pages_rs.map((page_rs) => {
                page_rs.data.map((f) => {
                    new_ids.push(f.id);
                });
            });
            const old_fanspages = yield Fans.listAll({
                fans_id : {
                    "$in" :  new_ids
                }
            }, '-created_time', {
                skip : 0,
                limit : new_ids.length,
                select : 'fans_id'
            });
            new_ids = _.difference(new_ids, _.map(old_fanspages.content, (f) => {
                return f.fans_id;
            }));

            result = yield _.map(new_ids, (new_id) => {
                return FBManager.getFans(new_id);
            });
            result.map((new_f) => {
                let query = {
                    fans_id : new_f.id,
                    name : new_f.name,
                    created_time : timestamp,
                    about : new_f.about,
                    emails : new_f.emails || [],
                };
                if(!_.isUndefined(result.location)){
                    query.city = new_f.location.city;
                    query.country = new_f.location.country;
                    query.zip = new_f.location.zip;
                    query.street = new_f.location.street;
                }
                newpages.push(query);
            });
            yield [
                Fans.create(newpages),
                Fans.update({_id : {
                    "$in" : old_ids
                }}, {
                    "$set" : {
                        initial : true
                    }
                }, {multi : true}),
                Logs.commit({
                    type : 'getLikesFans',
                    created_time : timestamp
                })
            ];
        }).catch((err) => {
            err.type = 'getLikesFans';
            ErrorManager.catchError(err)
        });
    }
    getTotal(){
        co(function* (){
            let index;
            let fanspages = yield Fans.listAll({}, {skip : 0, limit : 500});
            let posts = [],
                result = [];
            for(index in fanspages.content){
                const p = yield Posts.listAll({}, '-created_time', {skip : 0, limit:20}, '_id post_id likes_total comments_total');
                p.content.map((content) => {
                    posts.push(content);
                });
            }

            for(index in posts){
                const post = posts[index];
                const Like = yield FBManager.getPostTotal(post.post_id, 'likes');
                const Comments = yield FBManager.getPostTotal(post.post_id, 'comments');
                post.likes_total = Like.summary.total_count;
                post.comments_total = Comments.summary.total_count;
                result.push(yield post.syncSave());
            }
        }).catch(ErrorManager.catchError);
    }
    checkFans(){
        co(function* (){
            const P_fans = yield PrepareFans.listAll({
                status : false
            });
            if(P_fans.content.length < 1){
                throw ErrorManager.EmptyError("沒有需要檢查的粉絲團");
            }else{
                const ids = _.map(P_fans.content, (fans) => {
                    return fans.fans_id;
                });

                let oldfans = yield Fans.listAll({
                    fans_id : {
                        "$in" : ids
                    }
                });
                const old_ids = _.map(oldfans.content, (f) => {
                    return f.fans_id;
                });
                const newfans = _.difference(ids, old_ids);

                const result = yield PrepareFans.update({status : false}, {"$set":{status:true}}, {multi:true});

                if(newfans.length < 1){
                    throw ErrorManager.EmptyError('沒有增加新的粉絲團');
                }else{
                    const timestamp = now();

                    let query = [];

                    for(var index in newfans){
                        const fans_detail = yield FBManager.getFans(newfans[index]);
                        query.push({
                            fans_id : fans_detail.id,
                            name : fans_detail.name,
                            about : fans_detail.about,
                            created_time : timestamp
                        });
                    }

                    const new_fans = yield Fans.create(query);
                }
            }
        }).catch(ErrorManager.catchError);
    }
    initialFans(){
        co(function* (){
            const timestamp = now();
            let fans = yield Fans.show({
                initial : false
            });
            if(_.isNull(fans)){
                throw ErrorManager.EmptyError('沒有需要initial 的粉絲團');
            }else{
                const check = yield Posts.count({fans_id : fans.fans_id});
                if(check < 1){
                    const posts = yield FBManager.getPosts(fans.fans_id,{
                        limit : 100,
                        fields : config.post_fields
                    });
                    const newposts = yield Posts.insertMultiPosts(posts.data, fans.fans_id);

                    if(!_.isUndefined(posts.paging)
                    && !_.isUndefined(posts.paging.next)){
                        fans.nextpage = posts.paging.next;
                    }
                }
                fans.initial = true;
                const newfans = yield fans.syncSave();
                return newfans;
            }
        }).catch(ErrorManager.catchError);
    }
    initialFansStatus(){
        co(function* (){
            yield Fans.update({}, {"$set":{
                "days.sharedposts" : false
            }}, {muiti:true});
        });
    }
    getSharedFans(){
        const end = now();
        const start = add(config.shared_post.num, config.shared_post.unit);
        const type = 'sharedposts';
        co(function* (){
            let fanspage = yield Fans.show({
                "days.sharedposts" : false
            });
            if(_.isNull(fanspage)){
                throw ErrorManager.EmptyError('已無其他粉絲團需要查詢');
            }else{
                fanspage.days.sharedposts = true;
                fanspage = yield fanspage.syncSave();
                const posts = yield FBManager.getMoreDaysPosts(fanspage.fans_id, start, end);
                const ids = _.map(posts.data, (post) => {
                    return post.id;
                });

                let existposts = yield Posts.listAll({
                    post_id : {
                        "$in" : ids
                    }
                }, '-created_time', {
                    skip : 0,
                    limit : 100
                });
                let new_ids = [];
                for(var index in existposts.content){
                    const post = existposts.content[index];
                    let newfans = yield FBManager.getShared(post.post_id);

                    if(newfans.data.length > 0){
                        let ids = [];

                        for(const key in newfans.data){
                            let f = newfans.data[key];
                            const f_id = f.id.split('_')[0];
                            const p_fans = yield PrepareFans.show({ fans_id : f_id });
                            if(_.isNull(p_fans)){
                                ids.push(f_id);
                            }
                        }
                        new_ids = _.union(new_ids, _.compact(ids));
                    }
                }
                const query = _.map(new_ids, (f_id) => {
                    return {
                        fans_id : f_id,
                        created_time : end,
                    };
                });
                const result = yield PrepareFans.create(query);
            }
        }).catch(ErrorManager.catchError);
    }

    getNextPage(fans_id, nextpage){
        co(function* (){
            let fanspage = yield Fans.show({
                nextpage : {
                    '$ne' : null
                },
                lock : false
            });
            if(_.isNull(fanspage)){
                throw ErrorManager.EmptyError('沒有粉絲團需要更新');
            }else{
                fanspage.lock = true;
                fanspage = yield fanspage.syncSave();
                const nextpage = yield FBManager.nextpage(fanspage.fans_id, fanspage.nextpage);
                if(nextpage.data.length < 1){
                    fanspage.nextpage = null;
                    fanspage.lock = false;
                    fanspage = yield fanspage.syncSave();
                    throw ErrorManager.EmptyError('已無舊文章');
                }else if(nextpage.data.length < config.posts_limit){
                    fanspage.nextpage = null;
                }else{
                    fanspage.nextpage = nextpage.paging.next;
                }
                const newposts = yield Posts.insertMultiPosts(nextpage.data, fanspage.fans_id);
                fanspage.lock = false;
                fanspage = yield fanspage.syncSave();
            }
        }).catch(ErrorManager.catchError);
    }
    getNewPosts(){
        co(function* (){
            const fanspages = yield Fans.listAll({});

            let result = [];
            for(var index in fanspages.content){
                const fanspage = fanspages.content[index];
                result.push(yield CronTab.saveSomeDayPosts(fanspage.fans_id));
            }
        }).catch(ErrorManager.catchError);
    }
    saveSomeDayPosts(ID, timestamp=now()){
        co(function* (){
            let posts = yield FBManager.getSomeDayPosts(ID, timestamp);
            const result = yield Posts.insertMultiPosts(posts.data, ID);
        });
    }
    /**
     * @params posts取回的文章
    * **/
    saveMorePosts(posts, fans_id){
        let result = [];
        _.map(posts.data, (post) => {
            Posts.show({post_id : post.id})
            .then((p) => {
                if(_.isNull(p)){
                    let query = _.pick(post, 'message', 'link', 'full_picture', 'picture', 'from');
                    query.created_time = getTimeStamp(post.created_time) * 1000;
                    query.post_id = post.id;
                    query.fans_id = post.from.id;
                    if(!_.isUndefined(post.comments)){
                        query.comments = _.map(post.comments.data, (comment) => {
                            let newcomment = _.pick(comment, 'from', 'message');
                            newcomment.created_time = getTimeStamp(comment.created_time) * 1000;
                            return newcomment;
                        });
                        if(!_.isUndefined(post.comments.paging.next)){
                            query.next = post.comments.paging.next;
                        }
                    }
                    result.push(Posts.commit(query));
                }
            }).catch(ErrorManager.catchError);
        });
        return result;
    }
}

let CronTab = new CronTabClass();

export default CronTab;
