// ==UserScript==
// @name         肉漫屋图片全部加载
// @namespace    https://github.com/hahahaha123567/web-scripts
// @version      1.0.0
// @description  进入书籍详情或章节页后立即加载当前页面所有图片，保留正文图片还原逻辑
// @homepageURL  https://github.com/hahahaha123567/web-scripts
// @match        https://rouman5.com/*
// @noframes
// @grant        none
// @sandbox      raw
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const isBookPage = () => /^\/books\/[^/]+(?:\/|$)/.test(location.pathname);
    const READER_IMAGE_SELECTOR = 'img[id^="image_"]';
    const NativeIntersectionObserver = window.IntersectionObserver;

    // 正文含需通过 canvas 还原的图片，必须触发网站原有回调而不是直接替换 src
    window.IntersectionObserver = class extends NativeIntersectionObserver {
        constructor(callback, options) {
            super(callback, options);
            this.callback = callback;
            this.readerTargets = new Map();
        }

        observe(target) {
            const isReaderTarget = isBookPage()
                && target instanceof Element
                && target.closest('.site-reader-canvas')
                && (target.matches(READER_IMAGE_SELECTOR)
                    || target.querySelector(READER_IMAGE_SELECTOR));

            if (!isReaderTarget) {
                super.observe(target);
                return;
            }
            if (this.readerTargets.has(target)) return;

            const timer = setTimeout(() => {
                this.readerTargets.set(target, null);
                const rect = target.getBoundingClientRect();
                this.callback.call(this, [{
                    target,
                    time: performance.now(),
                    isIntersecting: true,
                    intersectionRatio: 1,
                    boundingClientRect: rect,
                    intersectionRect: rect,
                    rootBounds: this.root?.getBoundingClientRect() || null
                }], this);
            }, 0);
            this.readerTargets.set(target, timer);
        }

        unobserve(target) {
            clearTimeout(this.readerTargets.get(target));
            this.readerTargets.delete(target);
            super.unobserve(target);
        }

        disconnect() {
            for (const timer of this.readerTargets.values()) clearTimeout(timer);
            this.readerTargets.clear();
            super.disconnect();
        }
    };

    function loadNativeImages(root) {
        if (!isBookPage()) return;
        if (root instanceof HTMLImageElement && root.loading === 'lazy') {
            root.loading = 'eager';
        }
        root.querySelectorAll?.('img[loading="lazy"]').forEach(image => {
            image.loading = 'eager';
        });
    }

    // 站内导航和 React 后续插入的图片同样立即加载
    new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') {
                loadNativeImages(record.target);
            } else {
                record.addedNodes.forEach(loadNativeImages);
            }
        }
    }).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['loading']
    });

    loadNativeImages(document);
})();
