import CronTab from './lib/CronTab';

CronTab.createJob('* * * * * * ', () => {
    console.log(1);
});
