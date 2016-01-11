import CronTab from './lib/CronTab';
import co from 'co';
import _ from 'lodash';
import FBManager from './lib/FBBase';
import ErrorManager from './lib/ErrorBase';
import { Fans, Posts, Logs } from './models';
import { getTimeStamp, now } from './lib/TimeBase';

const fields = 'message,created_time,story,link,full_picture,comments,picture,from';

CronTab.createJob('*/20 * * * * * ', getAllPosts);

function getAllPosts(){
    co(function* (){
        let fanspage = yield Fans.show({
            lock : false,
            nextpage : {
                "$ne" : 'done'
            }
        });
        fanspage.lock = true;
        yield fanspage.syncSave();

        if(!_.isNull(fanspage)){
            let posts = yield FBManager.getPosts(fanspage.fans_id, {limit : 100,fields : fields });

            if(!_.isUndefined(posts.paging)
                    && !_.isUndefined(posts.paging.next)){

                    const content = yield FBManager.getOldPosts(fanspage.fans_id
                        , posts.paging.next);
                    content.map((p) => {
                        posts.data.push(p);
                    });

                    const query = _.map(posts.data, (post) => {
                        let content = FBManager.getPostContent(post);
                        content.post_id = post.id;
                        content.created_time = getTimeStamp(post.created_time);
                        return content;
                    });

                    fanspage.lock = false;
                    fanspage.nextpage = 'done';

                    yield [
                        Posts.create(query),
                        fanspage.syncSave()
                    ];
                    yield Logs.commit({
                        type : 'addposts',
                        created_time : now(),
                        message : 'success',
                        querys : query
                    });

            }
        }
    }).catch(ErrorManager.catchError);
}
