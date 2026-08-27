// ==UserScript==
// @name         编程随想专注阅读
// @namespace    local.program-think.reader
// @version      1.0.0
// @description  在文章页隐藏侧栏和评论区，在列表页隐藏最新评论组件
// @match        https://program-think.blogspot.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=blogspot.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const isPostPage = /^\/(?:19|20)\d{2}\/\d{2}\/[^/]+\.html$/.test(
        window.location.pathname
    );

    function remove(selector) {
        document.querySelector(selector)?.remove();
    }

    if (isPostPage) {
        remove('#sidebar-wrapper');
        remove('#comments');

        const main = document.querySelector('#main');
        if (main) {
            main.style.width = '100%';
            main.style.maxWidth = 'none';
        }
    } else {
        remove('#HTML4');
    }
})();
