// ==UserScript==
// @name         Generate Table of Contents
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  提取微信公众号文章页面内的 h1-h5 内容并生成目录
// @author       ChatGPT 4o
// @match        *://mp.weixin.qq.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Function to create the TOC container
    function createTOCContainer() {
        const tocContainer = document.createElement('div');
        tocContainer.id = 'toc-container';
        tocContainer.style.position = 'fixed';
        tocContainer.style.top = '10px';
        tocContainer.style.left = '10px';
        tocContainer.style.width = '300px';
        tocContainer.style.maxHeight = '90%';
        tocContainer.style.overflowY = 'auto';
        tocContainer.style.padding = '10px';
        tocContainer.style.backgroundColor = '#f9f9f9';
        tocContainer.style.border = '1px solid #ccc';
        tocContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        tocContainer.style.zIndex = '9999';
        tocContainer.style.fontFamily = 'Arial, sans-serif';
        tocContainer.style.fontSize = '14px';
        tocContainer.style.lineHeight = '1.5';
        tocContainer.style.borderRadius = '5px';
        tocContainer.style.backgroundColor = '#404040'; // 修改背景颜色

        const tocTitle = document.createElement('h3');
        tocTitle.textContent = 'Table of Contents';
        tocTitle.style.marginTop = '0';
        tocTitle.style.textAlign = 'center';

        tocContainer.appendChild(tocTitle);

        document.body.appendChild(tocContainer);
        return tocContainer;
    }

    // Function to generate the TOC
    function generateTOC() {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5');
        if (!headings.length) return;

        const tocContainer = createTOCContainer();

        const tocList = document.createElement('ul');
        tocList.style.listStyleType = 'none';
        tocList.style.padding = '0';

        headings.forEach((heading) => {
            const level = parseInt(heading.tagName.substring(1), 10); // Extract level from h1-h5
            const listItem = document.createElement('li');
            listItem.style.marginLeft = `${(level - 1) * 20}px`; // Indent based on level

            const link = document.createElement('a');
            link.textContent = heading.textContent.trim();
            link.href = `#${heading.id || heading.textContent.trim().replace(/\s+/g, '-').toLowerCase()}`;
            link.style.textDecoration = 'none';
            link.style.color = '#007BFF';

            // Add id to heading if it doesn't already have one
            if (!heading.id) {
                heading.id = heading.textContent.trim().replace(/\s+/g, '-').toLowerCase();
            }

            listItem.appendChild(link);
            tocList.appendChild(listItem);
        });

        tocContainer.appendChild(tocList);
    }

    // Run the TOC generation function
    generateTOC();
})();
