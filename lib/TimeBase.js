import moment from "moment";
import _ from "lodash";

export default {
    /**
     *  DESC : 取回現在的時間
    * **/
    now : () => {
        return moment().unix();
    },
    /**
     *  @ params timestamp : unix時間標記
     *  @ params units : 時間單位
     *      day : 天
     *      month : 月
     *      year : 年
     *      week : 週
     *      hour : 小時
     *      minute : 分鐘
     *  DESC : 依照時間標記取得當天(月, 年)的開始時間
     *  DOC : http://momentjs.com/docs/#/manipulating/start-of/
    * **/
    startOf : (timestamp, unit='day') => {
        return moment(timestamp * 1000).startOf(unit).unix();
    },
    /**
     *  @ params timestamp : unix時間標記
     *  @ params units : 時間單位
     *      day : 天
     *      month : 月
     *      year : 年
     *      week : 週
     *      hour : 小時
     *      minute : 分鐘
     *  DESC : 依照時間標記取得當天(月, 年)的開始時間
     *  DOC : http://momentjs.com/docs/#/manipulating/end-of/
    * **/
    endOf : (timestamp, unit='days') => {
        return moment(timestamp * 1000).endOf(unit).unix();
    },
    /**
     *  將字串轉為timestamp
     *  2015-12-17 00:00:00 => 1450281600
    * **/
    getTimeStamp : (str) => {
        return (_.isUndefined(str)) ? moment(str) : moment();
    },
    /**
     *  在某個時間為基準點增加一段時間
     *  DOC : http://momentjs.com/docs/#/manipulating/add/
    * **/
    add : (number, unit) => {
        return moment().add(number, unit).unix();
    },
    /**
     * @params time : 時間
     * @params number : 數字
     * @params unit : 單位[day, month, year]
    * **/
    addmore : (time, number, unit) => {
        return moment(time).add(number, unit).unix();
    },
    /**
     * 將timestamp 轉為字串
     * DOC : http://momentjs.com/docs/#/displaying/format/
    * **/
    format : (time, format="YYYY-MM-DD") => {
        return moment(time * 1000).format(format);
    }
};
