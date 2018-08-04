// ==UserScript==
// @name         bilibili notification
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  notificate per 10 minutes
// @author       hahahaha123567
// @match        https://*.bilibili.com/*
// @grant        none
// ==/UserScript==

// time is calculated independently in different domain
// such as: time in www.bilibili.com and in live.bilibili.com is different

(function () {
    'use strict';

	// info
	const cookie = document.cookie;
    const userId = cookie.match(/DedeUserID=(\d+)/)[1];
    let data;
    $.post("https://space.bilibili.com/ajax/member/GetInfo", {mid:userId}, function(result) {
        data = result.data;
    });
    let title = "otaku";
    // notificate interval
    const interval = 600;

    // variables in localStorage, prefix: 'ls'
    // update lsDate and lsTime
    const lsDate = localStorage.getItem('lsDate');
    const today = new Date().getDate().toString();
    if (lsDate == undefined) {
        localStorage.setItem('lsDate', today);
    } else {
        if (today !== lsDate) {
            localStorage.setItem('lsDate', today);
            localStorage.setItem('lsTime', 0);
        }
    }

    setInterval(
        () => {
            let timeString = localStorage.getItem('lsTime');
            if (timeString == undefined) {
                timeString = '0';
            }
            let time = parseInt(timeString, 10);
            time++;
            localStorage.setItem('lsTime', time);
            if (data.name !== undefined) {
                title = data.name;
            }
            const body = createBody(time);
            if (time > 0 && time % interval === 0) {
                createNotification(title, body);
            }
        }, 1000
    );
})();

function createBody (time) {
    const hour = Math.floor(time / 60 / 60);
    const minute = Math.floor(time / 60) % 60;
    const second = time % 60;
    let body = '今天你在 ' + document.location.host + ' 花了 ';
    if (hour > 0) {
        body += hour;
        body += '小时 ';
    }
    if (minute > 0) {
        body += minute;
        body += '分钟 ';
    }
    if (second > 0) {
        body += second;
        body += '秒';
    }
    return body;
}

function createNotification (title, body) {
    const options = {
        body: body,
        icon: "https://www.bilibili.com/favicon.ico",
    };
    const link = "https://leetcode-cn.com/problemset/algorithms";

    Notification.requestPermission().then(function(result) {
        console.log(result);
    });
    const notification = new Notification(title, options);
    notification.onclick = function() {
        this.close();
        window.close();
        window.open(link);
    };
}
