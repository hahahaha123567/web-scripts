// ==UserScript==
// @name         leave bilibili
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  close bilibili page
// @author       hahahaha123567
// @match        https://www.bilibili.com/
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

	// info
	let cookies = document.cookie;
    let userId = cookies.match(/DedeUserID=(\d+)/)[1];
    let data;
    $.post("https://space.bilibili.com/ajax/member/GetInfo", {mid:userId}, function(result){
        data = result.data;
    });
    let title = "otaku";
    let body = "再不学习要没饭吃了";
    let icon = "https://www.bilibili.com/favicon.ico";
    let link = "https://leetcode-cn.com/problemset/algorithms/";

    localStorage.setItem('testTime', 0)

    setInterval(
        () => {
            let time = parseInt(localStorage.getItem('testTime'), 10);
            time++;
            localStorage.setItem('testTime', time);
            if (time < 3) return;
            title = data.name;
            let hour = 0, minute = 0, second = 0;
            second = time % 60;
            minute = Math.floor(time/60) % 60;
            hour = Math.floor(time / 60 / 60);
            body = '今天你在bilibili花了 ';
            if (hour > 0) {
                body += hour;
                body += '小时 ';
            }
            if (minute > 0) {
                body += minute;
                body += '分钟';
            }
            body += second;
            body += '秒';
            if (second === 0 && minute > 0 && minute % 10 === 0) {
                createNotification(title, body, icon, link);
            }
        }, 1000
    );
})();

function createNotification (title, body, icon, link) {
    let options = {
        body: body,
        icon: icon
    };
    Notification.requestPermission().then(function(result) {
        console.log(result);
    });
    let notification = new Notification(title, options);
    notification.onclick = function() {
        this.close();
        window.close();
        window.open(link);
    };
}
