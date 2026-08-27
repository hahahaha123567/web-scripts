// ==UserScript==
// @name         Generate Table of Contents
// @namespace    local.wechat.table-of-contents
// @version      2.0.0
// @description  为微信公众号文章正文生成可折叠目录
// @match        *://mp.weixin.qq.com/s*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONTAINER_ID = 'userscript-toc-container';
    const HEADING_ID_PREFIX = 'userscript-toc-heading-';

    function isCustomHeading(element) {
        const section = element.closest('section');
        if (!section) {
            return false;
        }

        const style = window.getComputedStyle(section);
        return style.borderBottomStyle === 'solid'
            && Number.parseFloat(style.borderBottomWidth) >= 4
            && style.borderBottomColor === 'rgb(255, 129, 36)';
    }

    function collectHeadings(article) {
        const elements = article.querySelectorAll('h1, h2, h3, h4, h5, section p');
        return Array.from(elements)
            .filter(element => /^H[1-5]$/.test(element.tagName) || isCustomHeading(element))
            .filter(element => element.textContent.trim())
            .map(element => ({
                element,
                level: /^H[1-5]$/.test(element.tagName)
                    ? Number.parseInt(element.tagName.slice(1), 10)
                    : 1
            }));
    }

    function ensureUniqueId(element, index) {
        if (element.id) {
            return element.id;
        }

        let id = `${HEADING_ID_PREFIX}${index + 1}`;
        let suffix = 2;
        while (document.getElementById(id)) {
            id = `${HEADING_ID_PREFIX}${index + 1}-${suffix}`;
            suffix += 1;
        }

        element.id = id;
        return id;
    }

    function createTOC(headings) {
        document.getElementById(CONTAINER_ID)?.remove();

        const container = document.createElement('nav');
        container.id = CONTAINER_ID;
        container.setAttribute('aria-label', '文章目录');
        Object.assign(container.style, {
            position: 'fixed',
            top: '10px',
            left: '10px',
            width: 'min(300px, calc(100vw - 20px))',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '10px',
            backgroundColor: '#404040',
            border: '1px solid #ccc',
            borderRadius: '5px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            zIndex: '9999'
        });

        const details = document.createElement('details');
        details.open = true;

        const title = document.createElement('summary');
        title.textContent = '文章目录';
        Object.assign(title.style, {
            cursor: 'pointer',
            fontWeight: 'bold',
            textAlign: 'center'
        });

        const list = document.createElement('ul');
        Object.assign(list.style, {
            listStyleType: 'none',
            margin: '10px 0 0',
            padding: '0'
        });

        headings.forEach(({ element, level }, index) => {
            const item = document.createElement('li');
            item.style.marginLeft = `${(level - 1) * 16}px`;

            const link = document.createElement('a');
            link.textContent = element.textContent.trim();
            link.href = `#${ensureUniqueId(element, index)}`;
            link.style.color = '#66b3ff';
            link.style.textDecoration = 'none';

            item.appendChild(link);
            list.appendChild(item);
        });

        details.append(title, list);
        container.appendChild(details);
        document.body.appendChild(container);
    }

    const article = document.querySelector('#js_content, .rich_media_content');
    if (!article) {
        return;
    }

    const headings = collectHeadings(article);
    if (headings.length > 0) {
        createTOC(headings);
    }
})();
