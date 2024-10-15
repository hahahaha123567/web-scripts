// ==UserScript==
// @name         Archon.gg Wowhead Link Modifier for Spans
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  修改嵌套在 span 中的 wowhead 链接地址
// @author       You
// @match        *://www.archon.gg/*
// @match        *://archon.gg/*
// @match        *://wowhead.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 监听所有包含 wowhead.com 的链接悬停事件
    document.addEventListener('mouseover', function(e) {
        const target = e.target;

        // 如果鼠标悬停在 <a> 标签或其子元素上
        let linkElement = target.closest('a');
        if (linkElement && linkElement.href.includes('wowhead.com/')) {

            // 检查 href 是否是带有 item 的链接
            let match = linkElement.href.match(/item=(\d+)/);
            if (match) {
                let itemId = match[1];

                // 修改 href 为新的链接格式
                linkElement.href = `https://www.wowhead.com/cn/item=${itemId}`;

                console.log(`链接已修改为: ${linkElement.href}`);
            }
        }
    });
})();
