// ==UserScript==
// @name         论坛主贴长图 · NGA / V2EX / Bangumi
// @namespace    https://github.com/hahahaha123567/web-scripts
// @version      1.5.0
// @description  将 V2EX 主楼（含附言）、NGA 主楼和已加载热评、Bangumi 小组主楼和本页表情总数超过 10 的回复导出为 Carbon 风格 PNG 长图
// @match        https://www.v2ex.com/t/*
// @match        https://v2ex.com/t/*
// @match        https://*.nga.cn/read.php*
// @match        https://ngabbs.com/read.php*
// @match        https://*.ngabbs.com/read.php*
// @match        https://nga.178.com/read.php*
// @match        https://bgm.tv/group/topic/*
// @match        https://bangumi.tv/group/topic/*
// @match        https://chii.in/group/topic/*
// @require      https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js
// @grant        GM_xmlhttpRequest
// @connect      *
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const WIDTH = 880;
    const IMAGE_TIMEOUT_MS = 15000;
    const CAPTURE_STYLES = `
                *{box-sizing:border-box}body{margin:0;color:#292d3e;font:16px/1.85 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
                #capture{width:${WIDTH}px;padding:48px;background:linear-gradient(135deg,#b9cdf4,#dfc3ec 55%,#f3ccbe)}
                article{background:#fff;border-radius:14px;box-shadow:0 16px 35px #3333;overflow:hidden}
                .chrome{padding:16px 24px;background:#f7f8fb;border-bottom:1px solid #eaecf2;color:#777;font-size:13px}
                .dots{color:#ed7774;letter-spacing:6px;margin-right:16px}.content{padding:26px 32px;overflow-wrap:anywhere}
                h1{font-size:25px;line-height:1.5;margin:8px 0 16px}h2,h3,h4{line-height:1.6}p{margin:14px 0}
                small,.gray,.fade,.silver{color:#858995;font-size:13px}a{color:#5269a6}img{max-width:100%;height:auto;vertical-align:middle}
                .avatar{width:42px;height:42px;border-radius:8px}.fr{float:right}.header{padding-bottom:20px;border-bottom:1px solid #e9ebf2}
                .subtle{margin-top:24px;padding:18px;background:#f5f6fa;border-radius:8px}.topic_content{margin-top:16px}
                pre{white-space:pre-wrap;background:#f4f5f8;padding:12px}blockquote,.quote{margin:12px 0;padding:10px 16px;border-left:3px solid #bac7e3;background:#f5f6fa}
                table{max-width:100%;width:100%;border-collapse:collapse}td,th{overflow-wrap:anywhere}.comment_c{display:block;margin:18px 0;padding:16px;background:#f5f6fa;border-radius:8px}
                .comment_c_1,.commentblkoffset{display:none}.comment_c img{max-width:100%}.postcontent{display:block}.collapse,.collapseContent{max-height:none!important;height:auto!important;overflow:visible!important}
                footer{padding:16px 32px;border-top:1px solid #eceef4;font-size:12px;color:#888;overflow-wrap:anywhere}
                .capture-stats{margin-top:16px;color:#858995;font-size:13px}
                .capture-hot-title{font-size:20px}
                .bangumi-post{margin-top:20px;padding-top:16px;border-top:1px solid #e9ebf2}.bangumi-post:first-child{margin-top:0;padding-top:0;border:0}
                .bangumi-post .message,.bangumi-post .cmt_sub_content{margin-top:12px}
                .likes_grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.likes_grid .item{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:6px;background:#f5f6fa;font-size:13px}
                .likes_grid .emoji{width:20px;height:20px}.bangumi-post .smile{width:auto;max-height:40px}
                #capture.nga{background:linear-gradient(135deg,#f2dfad,#fff0c9 55%,#ecd5a2);color:#514638}
                .nga article{background:#fff8e7}.nga .chrome{background:#f6e8c5;border-color:#e7d5ab;color:#877252}
                .nga .comment_c,.nga pre,.nga blockquote,.nga .quote{background:#f7edcf}
                .nga small,.nga .silver,.nga .capture-stats,.nga footer{color:#8c795b}
                .nga footer{border-color:#e7d5ab}.nga a{color:#876c3e}
            `;

    const text = (selector, root = document) => root.querySelector(selector)?.textContent.trim() || '';

    function likes(root) {
        const value = root?.querySelector('.recommendvalue');
        // NGA 将零分渲染为空白；节点缺失则不能视为零
        return value ? `点赞 ${value.textContent.trim() || '0'}` : '点赞数未加载';
    }

    function extract() {
        if (/^(bgm\.tv|bangumi\.tv|chii\.in)$/.test(location.hostname)) return extractBangumi();
        const heading = document.querySelector('#Main h1');
        if (heading) {
            // 从主题标题向上寻找同时包含正文的最小容器，不依赖外观 class 或内联样式
            let root = heading.parentElement;
            while (root && !root.querySelector('.topic_content')) root = root.parentElement;
            if (!root || root.id === 'Main' || root === document.body) throw new Error('无法识别 V2EX 主楼边界，未生成截图');
            return { site: 'V2EX', title: heading.textContent.trim(), nodes: [root] };
        }
        const body = document.querySelector('#postcontent0');
        if (!body || !document.querySelector('#pid0Anchor')) {
            throw new Error('未找到主楼，请打开帖子第一页并等待正文加载完成');
        }
        const title = text('#postsubject0');
        if (!title) throw new Error('主楼标题尚未加载，请稍后重试');
        const header = document.createElement('header');
        const h1 = document.createElement('h1');
        h1.textContent = title;
        const meta = document.createElement('small');
        meta.textContent = [text('#postauthor0'), text('#postdate0'), likes(document.querySelector('#postcontentandsubject0'))].filter(Boolean).join(' · ');
        header.append(h1, meta);
        // NGA 原站 ID 拼作 hightlight；comment_for_0 是另一组贴条评论
        const comments = document.querySelector('#hightlight_for_0');
        return { site: 'NGA', title, nodes: [header, body, ...(comments ? [comments] : [])] };
    }

    function extractBangumi() {
        const root = document.querySelector('.postTopic');
        const heading = document.querySelector('#pageHeader h1')?.cloneNode(true);
        heading?.querySelector('span')?.remove();
        const title = heading?.textContent.trim();
        if (!root?.querySelector('.topic_content') || !title) {
            throw new Error('未找到 Bangumi 小组主楼，请等待正文加载完成');
        }
        const nodes = [];
        for (const post of [root, ...document.querySelectorAll('#comment_list .row_reply, #comment_list .sub_reply_bg')]) {
            // 按回复自身的表情网格计数，避免把楼中楼的表情累计到父楼
            const reactions = post.querySelector(`#likes_grid_${post.id.slice(5)}`);
            const count = [...(reactions?.querySelectorAll('.num') || [])]
                .reduce((sum, num) => sum + (Number(num.textContent.trim()) || 0), 0);
            if (post !== root && count <= 10) continue;
            const content = post.querySelector('.topic_content, .message, .cmt_sub_content');
            if (!content) throw new Error('回复正文尚未加载，请稍后重试');
            const section = document.createElement('section');
            section.className = 'bangumi-post';
            if (post === root) {
                const h1 = document.createElement('h1');
                h1.textContent = title;
                section.append(h1);
            }
            const meta = document.createElement('small');
            meta.textContent = [text('.inner > strong, .userInfo strong', post), text('.re_info small', post), `表情 ${count}`].filter(Boolean).join(' · ');
            section.append(meta, content.cloneNode(true));
            if (reactions) section.append(reactions.cloneNode(true));
            nodes.push(section);
        }
        const label = document.createElement('h2');
        label.className = 'capture-hot-title';
        label.textContent = '热评（回复表情数>10）';
        nodes.splice(1, 0, label);
        if (nodes.length === 2) {
            const empty = document.createElement('p');
            empty.textContent = '本页暂无表情总数超过 10 的回复';
            nodes.push(empty);
        }
        return { site: 'Bangumi', title, nodes };
    }

    function copyContent(source, doc) {
        const copy = doc.importNode(source, true);
        const originals = [...source.querySelectorAll('img')];
        copy.querySelectorAll('img').forEach((img, i) => {
            const original = originals[i];
            img.src = original.currentSrc || original.src;
            img.removeAttribute('srcset');
            img.loading = 'eager';
        });
        // Bangumi 贴贴使用背景图；转成普通图片以复用跨域读取和失败占位流程
        copy.querySelectorAll('.likes_grid .emoji').forEach(emoji => {
            const url = emoji.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
            if (!url) return;
            const img = doc.createElement('img');
            img.className = 'emoji';
            img.alt = '表情';
            img.src = new URL(url, location.href).href;
            emoji.replaceWith(img);
        });
        copy.querySelectorAll('picture source').forEach(el => el.remove());
        const topicButtons = copy.querySelector('.topic_buttons');
        if (topicButtons) {
            const stats = doc.createElement('div');
            stats.className = 'capture-stats';
            stats.textContent = ['收藏', '感谢'].map(label => {
                const count = text('.topic_stats', topicButtons).match(new RegExp(`([\\d,]+)\\s*人${label}`));
                return count ? `${label} ${count[1]}` : `${label}数未显示`;
            }).join(' · ');
            topicButtons.replaceWith(stats);
        }
        copy.querySelectorAll('.comment_c').forEach(comment => {
            const stats = doc.createElement('div');
            stats.className = 'capture-stats';
            stats.textContent = likes(comment);
            comment.append(stats);
        });
        copy.querySelectorAll('script,style,link,iframe,object,embed,form,button,input,.topic_buttons,.votes,.postBtnPos,.postInfo,.postoptb,.iconfont,.hld__extra-icon,.hld__post-author').forEach(el => el.remove());
        for (const el of [copy, ...copy.querySelectorAll('*')]) {
            if (el.hidden || el.style.display === 'none') { el.remove(); continue; }
            for (const attr of [...el.attributes]) {
                if (/^on/i.test(attr.name) || ['style', 'srcdoc'].includes(attr.name)) el.removeAttribute(attr.name);
            }
            if (el.matches('a')) {
                el.removeAttribute('href');
                el.removeAttribute('target');
            }
        }
        copy.querySelectorAll('video,audio,canvas').forEach(el => {
            const placeholder = doc.createElement('p');
            placeholder.textContent = '［动态媒体，请在原帖查看］';
            el.replaceWith(placeholder);
        });
        return copy;
    }

    function requestImage(url) {
        const address = new URL(url);
        const localImage = ['data:', 'blob:'].includes(address.protocol);
        if (!localImage && !['https:', 'http:'].includes(address.protocol)) throw new Error('不支持的图片来源');
        const privilegedRequest = typeof GM_xmlhttpRequest === 'function'
            ? GM_xmlhttpRequest
            : globalThis.GM?.xmlHttpRequest;
        if (!localImage && address.origin !== location.origin && !privilegedRequest) {
            throw new Error('浏览器不支持跨域图片读取');
        }
        if (privilegedRequest && !localImage) {
            let timer;
            return new Promise((resolve, reject) => {
                let request;
                // anonymous 会启用 fetch 模式，部分管理器不再执行内置 timeout
                timer = setTimeout(() => {
                    reject(new Error('图片请求超时'));
                    request?.abort();
                }, IMAGE_TIMEOUT_MS);
                request = privilegedRequest({
                    method: 'GET',
                    url,
                    anonymous: true,
                    responseType: 'blob',
                    timeout: IMAGE_TIMEOUT_MS,
                    onload: response => {
                        if (response.status >= 200 && response.status < 300 && response.response instanceof Blob) {
                            resolve(response.response);
                        } else {
                            reject(new Error(`图片请求失败（HTTP ${response.status}）`));
                        }
                    },
                    onerror: () => reject(new Error('图片请求失败')),
                    ontimeout: () => reject(new Error('图片请求超时')),
                    onabort: () => reject(new Error('图片请求取消'))
                });
            }).finally(() => clearTimeout(timer));
        }
        return fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS), credentials: 'omit' }).then(response => {
            if (!response.ok) throw new Error('图片请求失败');
            return response.blob();
        });
    }

    async function prepareImages(doc) {
        let failed = 0;
        await Promise.all([...doc.images].map(async img => {
            try {
                const blob = await requestImage(img.src);
                if (!blob.type.startsWith('image/')) throw new Error('图片格式无效');
                img.src = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                await img.decode();
            } catch {
                failed++;
                const label = doc.createElement('span');
                label.textContent = `［图片加载失败${img.alt ? `：${img.alt}` : ''}］`;
                img.replaceWith(label);
            }
        }));
        return failed;
    }

    function getSourceUrl(site) {
        if (site === 'Bangumi') {
            const topic = location.pathname.match(/^\/group\/topic\/(\d+)/)?.[1];
            return topic ? `${location.origin}/group/topic/${topic}` : '原帖地址未识别';
        }
        const source = site === 'V2EX'
            ? document.querySelector('link[rel="canonical"]')?.href
            : document.querySelector('#posterinfo0 a[name="l0"][href]')?.href;
        const url = new URL(source || location.href);
        const topic = site === 'V2EX' ? url.pathname.match(/^\/t\/(\d+)/)?.[1] : url.searchParams.get('tid');
        return topic && /^\d+$/.test(topic)
            ? `${url.origin}${site === 'V2EX' ? `/t/${topic}` : `/read.php?tid=${topic}`}` : '原帖地址未识别';
    }

    async function renderPost(post, isOpen) {
        let frame;
        try {
            frame = document.createElement('iframe');
            frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;height:1000px;border:0;`;
            document.body.append(frame);
            const doc = frame.contentDocument;
            const style = doc.createElement('style');
            style.textContent = CAPTURE_STYLES;
            doc.head.append(style);
            const capture = doc.createElement('div');
            capture.id = 'capture';
            if (post.site === 'NGA') capture.className = 'nga';
            capture.innerHTML = '<article><div class="chrome"><span class="dots">● ● ●</span><span class="site"></span></div><div class="content"></div><footer></footer></article>';
            capture.querySelector('.site').textContent = `${post.site} · 主贴${['NGA', 'Bangumi'].includes(post.site) ? '与热评' : ''}`;
            capture.querySelector('footer').textContent = getSourceUrl(post.site);
            for (const node of post.nodes) capture.querySelector('.content').append(copyContent(node, doc));
            doc.body.append(capture);
            const failures = await prepareImages(doc);
            await doc.fonts.ready;
            const height = Math.ceil(capture.getBoundingClientRect().height);
            // 限制画布边长与像素总量，超长内容自动降低倍率；不截断正文
            const scale = Math.min(2, 16000 / height, Math.sqrt(24000000 / (WIDTH * height)));
            if (scale < 0.75) throw new Error('帖子过长，无法在可读清晰度下导出单张 PNG');
            if (!isOpen()) return;
            const canvas = await html2canvas(capture, { scale, backgroundColor: null, logging: false, windowWidth: WIDTH, windowHeight: height, scrollX: 0, scrollY: 0 });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('浏览器无法生成 PNG，请尝试更短的帖子');
            if (!isOpen()) return;
            return { blob, width: canvas.width, height: canvas.height, failures };
        } finally {
            frame?.remove();
        }
    }

    const trigger = document.createElement('button');
    trigger.textContent = '主贴截图';
    trigger.style.cssText = 'position:fixed;right:24px;bottom:28px;z-index:2147483646;padding:11px 18px;border:0;border-radius:10px;background:#262b40;color:white;font:14px system-ui;cursor:pointer;box-shadow:0 4px 20px #0003';
    document.body.append(trigger);
    trigger.addEventListener('click', capturePost);

    async function capturePost() {
        if (trigger.disabled) return;
        trigger.disabled = true;
        let objectURL;
        const overlay = document.createElement('dialog');
        overlay.style.cssText = 'width:min(1040px,94vw);height:90vh;box-sizing:border-box;padding:20px;border:0;border-radius:14px;background:#eef0f6;color:#252a3d;font:14px system-ui';
        const bar = document.createElement('div');
        bar.style.cssText = 'display:flex;gap:16px;align-items:center;position:sticky;top:0;background:#eef0f6;padding:8px;z-index:1';
        const status = document.createElement('span');
        status.textContent = '正在生成完整长图…';
        status.style.flex = '1';
        const copyButton = document.createElement('button');
        copyButton.textContent = '复制图片';
        copyButton.hidden = true;
        const close = document.createElement('button');
        close.textContent = '关闭';
        close.onclick = () => overlay.close();
        bar.append(status, copyButton, close);
        overlay.append(bar);
        document.body.append(overlay);
        overlay.addEventListener('close', () => {
            overlay.remove();
            if (objectURL) URL.revokeObjectURL(objectURL);
        }, { once: true });
        try {
            overlay.showModal();
            const post = extract();
            const result = await renderPost(post, () => overlay.open);
            if (!result) return;
            const { blob, width, height, failures } = result;
            const imageWarning = failures ? ` · ${failures} 张图片加载失败，已在图中标注` : '';
            objectURL = URL.createObjectURL(blob);
            const preview = document.createElement('img');
            preview.src = objectURL;
            preview.alt = post.title;
            preview.style.cssText = 'display:block;width:100%;height:auto;margin-top:12px';
            overlay.append(preview);
            copyButton.hidden = false;
            copyButton.onclick = async () => {
                copyButton.disabled = true;
                try {
                    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
                        throw new Error('当前浏览器不支持复制图片，请使用支持图片剪贴板的浏览器并通过 HTTPS 打开帖子');
                    }
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                    status.textContent = `图片已复制，可直接粘贴${imageWarning}`;
                } catch (error) {
                    status.textContent = `复制失败：${error.message}；请检查浏览器剪贴板权限后重试`;
                } finally {
                    copyButton.disabled = false;
                }
            };
            status.textContent = `${width} × ${height}${imageWarning || ' · 已生成'}`;
        } catch (error) {
            status.textContent = `截图失败：${error.message}`;
        } finally {
            trigger.disabled = false;
        }
    }
})();
