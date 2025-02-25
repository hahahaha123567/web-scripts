// ==UserScript==
// @name         Generate Table of Contents
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  提取微信公众号文章页面内的 h1-h5 以及特定样式的 section 标题，并生成目录，保持原文顺序
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
        tocContainer.style.backgroundColor = '#404040'; // 目录背景色
        tocContainer.style.border = '1px solid #ccc';
        tocContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        tocContainer.style.zIndex = '9999';
        tocContainer.style.fontFamily = 'Arial, sans-serif';
        tocContainer.style.fontSize = '14px';
        tocContainer.style.lineHeight = '1.5';
        tocContainer.style.borderRadius = '5px';
        tocContainer.style.color = 'white';

        const tocTitle = document.createElement('h3');
        tocTitle.textContent = 'Table of Contents';
        tocTitle.style.marginTop = '0';
        tocTitle.style.textAlign = 'center';
        tocTitle.style.color = 'white';

        tocContainer.appendChild(tocTitle);
        document.body.appendChild(tocContainer);
        return tocContainer;
    }

    // Function to generate the TOC
    function generateTOC() {
        const tocContainer = createTOCContainer();
        const tocList = document.createElement('ul');
        tocList.style.listStyleType = 'none';
        tocList.style.padding = '0';

        // 1. 获取所有 h1-h5 标题
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).map(heading => ({
            element: heading,
            level: parseInt(heading.tagName.substring(1), 10),
            position: heading.getBoundingClientRect().top // 记录在页面中的位置
        }));

        // 2. 获取自定义 section 标题
        const customHeadings = Array.from(document.querySelectorAll('section[style*="border-bottom: 5px solid rgb(255, 129, 36)"] p')).map(heading => ({
            element: heading,
            level: 1, // 作为 H1 级别
            position: heading.getBoundingClientRect().top // 记录在页面中的位置
        }));

        // 3. 合并所有标题，并按照它们在页面中的位置排序
        const allHeadings = [...headings, ...customHeadings].sort((a, b) => a.position - b.position);

        // 4. 生成 TOC
        allHeadings.forEach(({ element, level }) => {
            if (!element.textContent.trim()) return;

            const listItem = document.createElement('li');
            listItem.style.marginLeft = `${(level - 1) * 20}px`;

            const link = document.createElement('a');
            link.textContent = element.textContent.trim();
            link.style.textDecoration = 'none';
            link.style.color = '#007BFF';

            // 确保标题有唯一的 ID
            if (!element.id) {
                element.id = `heading-${Math.random().toString(36).substring(2, 10)}`;
            }
            link.href = `#${element.id}`;

            listItem.appendChild(link);
            tocList.appendChild(listItem);
        });

        tocContainer.appendChild(tocList);
    }

    // Run the TOC generation function
    generateTOC();
})();
