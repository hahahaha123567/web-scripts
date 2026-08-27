// ==UserScript==
// @name         Archon.gg Wowhead 中文链接
// @namespace    local.archon.wowhead-cn
// @version      1.0.0
// @description  将 Archon 页面中的 Wowhead 物品链接切换到简体中文页面
// @match        https://www.archon.gg/*
// @match        https://archon.gg/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const WOWHEAD_HOST_PATTERN = /(^|\.)wowhead\.com$/i;
    const ITEM_PATH_PATTERN = /^\/(?:[a-z]{2}\/)?item[=/](\d+)(.*)$/i;

    function rewriteLink(link) {
        let url;
        try {
            url = new URL(link.href, window.location.href);
        } catch {
            return;
        }

        if (!WOWHEAD_HOST_PATTERN.test(url.hostname) || url.pathname.startsWith('/cn/')) {
            return;
        }

        const match = url.pathname.match(ITEM_PATH_PATTERN);
        if (!match) {
            return;
        }

        url.protocol = 'https:';
        url.hostname = 'www.wowhead.com';
        url.pathname = `/cn/item=${match[1]}${match[2]}`;
        link.href = url.toString();
    }

    function rewriteLinks(root) {
        if (root instanceof HTMLAnchorElement) {
            rewriteLink(root);
        }

        root.querySelectorAll?.('a[href*="wowhead.com/"]').forEach(rewriteLink);
    }

    rewriteLinks(document);

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
                rewriteLink(mutation.target);
                continue;
            }

            mutation.addedNodes.forEach(node => {
                if (node instanceof Element) {
                    rewriteLinks(node);
                }
            });
        }
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['href'],
        childList: true,
        subtree: true
    });
})();
