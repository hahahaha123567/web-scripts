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

	// notify
    setTimeout ( function () {
        let title = data.name;
        let body = "再不学习要没饭吃了";
        let icon = "https://www.bilibili.com/favicon.ico";
        let link = "https://leetcode-cn.com/problemset/algorithms/";
        createNotification(title, body, icon, link);
    }, 1000);

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
