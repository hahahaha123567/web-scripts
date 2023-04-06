// ==UserScript==
// @name         编程随想专注阅读
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  
// @author       You
// @match        https://program-think.blogspot.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=blogspot.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var $ = window.jQuery;

    let isContentPage = false;
    for (let i = 2009; i <= 2022; i++) {
        if (window.location.href.includes(i)) {
            isContentPage = true;
        }
    }

    if (isContentPage) {
        // 右侧推荐和评论
        document.getElementById("sidebar-wrapper").remove();
        $("#main").css({"width": '100%'});

        // 底部评论区
        document.getElementById("comments").remove();
    } else {
        // 右侧评论
        document.getElementById("HTML4").remove();
    }

})();
