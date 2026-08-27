// ==UserScript==
// @name         Steam 畅销榜隐藏已忽略游戏
// @name:en      Steam Weekly Charts - Hide Ignored
// @namespace    https://github.com/hahahaha123567/web-scripts
// @version      1.2.2
// @description  在 Steam 畅销榜快速忽略游戏，并隐藏或置灰已忽略游戏
// @description:en Hide or dim ignored games on Steam weekly top sellers
// @author       hahahaha123567
// @homepageURL  https://github.com/hahahaha123567/web-scripts/blob/master/SteamWeeklyCharts-HideIgnored.js
// @supportURL   https://github.com/hahahaha123567/web-scripts/issues
// @match        https://store.steampowered.com/charts/topselling/*
// @match        https://store.steampowered.com/charts/topsellers/*
// @noframes
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(async function () {
    'use strict';

    const MODE_KEY = 'steam-hide-ignored-mode';
    const HIDE_MODE = 'hide';
    const DIM_MODE = 'dim';

    function loadMode() {
        try {
            return localStorage.getItem(MODE_KEY) === DIM_MODE
                ? DIM_MODE
                : HIDE_MODE;
        } catch {
            return HIDE_MODE;
        }
    }

    let mode = loadMode();

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .steam-hide-ignored-hidden {
                display: none !important;
            }

            .steam-hide-ignored-dimmed {
                position: relative !important;
            }

            .steam-hide-ignored-dimmed > *:not(.steam-hide-ignored-badge) {
                filter: grayscale(1) !important;
                opacity: .48 !important;
            }

            .steam-hide-ignored-badge {
                position: absolute;
                top: 50%;
                left: 50%;
                z-index: 20;
                padding: 5px 10px;
                border: 1px solid rgba(255, 255, 255, .35);
                border-radius: 2px;
                background: rgba(27, 40, 56, .92);
                color: #d6d7d8;
                font: 600 14px/1.2 Arial, sans-serif;
                letter-spacing: .05em;
                pointer-events: none;
                transform: translate(-50%, -50%);
                white-space: nowrap;
            }

            .steam-quick-ignore-button {
                position: absolute;
                z-index: 1;
                padding: 4px 7px;
                border: 1px solid #567b9d;
                border-radius: 2px;
                background: #2a475e;
                color: #d6d7d8;
                cursor: pointer;
                font: 12px/1.2 Arial, sans-serif;
                transform: translateY(-50%);
                white-space: nowrap;
            }

            #steam-quick-ignore-layer {
                position: absolute;
                top: 0;
                left: 0;
                z-index: 10001;
                width: 0;
                height: 0;
                overflow: visible;
                pointer-events: none;
            }

            #steam-quick-ignore-layer .steam-quick-ignore-button {
                pointer-events: auto;
            }

            .steam-quick-ignore-button:hover {
                border-color: #66c0f4;
                background: #417a9b;
                color: #fff;
            }

            .steam-quick-ignore-button:disabled {
                cursor: default;
                opacity: .7;
            }

            #steam-hide-ignored-switch {
                position: fixed;
                top: 16px;
                right: 16px;
                z-index: 10000;
                padding: 10px 12px;
                border: 1px solid #4b6b87;
                border-radius: 3px;
                background: #1b2838;
                box-shadow: 0 2px 8px rgba(0, 0, 0, .35);
                color: #d6d7d8;
                font: 13px/1.4 Arial, sans-serif;
            }

            #steam-hide-ignored-switch strong {
                display: block;
                margin-bottom: 6px;
                color: #fff;
            }

            #steam-hide-ignored-switch button {
                margin-right: 5px;
                padding: 4px 8px;
                border: 1px solid #567b9d;
                border-radius: 2px;
                background: #2a475e;
                color: #d6d7d8;
                cursor: pointer;
            }

            #steam-hide-ignored-switch button:last-child {
                margin-right: 0;
            }

            #steam-hide-ignored-switch button[aria-pressed="true"] {
                border-color: #66c0f4;
                background: #417a9b;
                color: #fff;
            }
        `;
        document.head.appendChild(style);
    }

    function createModeSwitch(onChange) {
        const panel = document.createElement('div');
        panel.id = 'steam-hide-ignored-switch';
        panel.innerHTML = `
            <strong>已忽略游戏显示</strong>
            <button type="button" data-mode="hide">直接隐藏</button>
            <button type="button" data-mode="dim">置灰并标记</button>
        `;

        const buttons = [...panel.querySelectorAll('button')];
        function updateButtons() {
            buttons.forEach(button => {
                button.setAttribute(
                    'aria-pressed',
                    button.dataset.mode === mode ? 'true' : 'false'
                );
            });
        }

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                mode = button.dataset.mode;
                try {
                    localStorage.setItem(MODE_KEY, mode);
                } catch {
                    // The current mode still works if storage is unavailable.
                }
                updateButtons();
                onChange();
            });
        });

        updateButtons();
        document.body.appendChild(panel);
    }

    function toSet(value) {
        if (!value) return new Set();

        // Steam historically used both array/object forms
        if (Array.isArray(value)) {
            return new Set(value.map(String));
        }

        return new Set(Object.keys(value));
    }

    let userdata;
    try {
        const response = await fetch(
            `/dynamicstore/userdata/?t=${Date.now()}`,
            {
                credentials: 'include',
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        userdata = await response.json();
    } catch (error) {
        console.warn('[Steam Hide Ignored] Failed to load userdata', error);
        return;
    }

    const ignoredApps = toSet(userdata.rgIgnoredApps);
    const ignoredPackages = toSet(userdata.rgIgnoredPackages);
    const quickIgnoreButtons = new WeakMap();
    const quickIgnoreRows = new Set();
    const observedContainers = new Set();
    let quickIgnoreLayer;

    addStyles();

    /*
     * Steam uses generated/minified CSS class names, so don't depend on them.
     *
     * Starting from the app link, walk upward until we find the direct child
     * of a container containing several chart entries.
     */
    function findChartRow(link) {
        const tableRow = link.closest('tr');
        if (tableRow) {
            return tableRow;
        }

        let node = link;

        while (
            node &&
            node.parentElement &&
            node.parentElement !== document.body
        ) {
            const parent = node.parentElement;

            const candidates = [...parent.children].filter(child => {
                return (
                    child.matches?.('a[href*="/app/"], a[href*="/sub/"]') ||
                    child.querySelector?.('a[href*="/app/"], a[href*="/sub/"]')
                );
            });

            // The parent looks like the chart list container.
            if (candidates.length >= 3) {
                return node;
            }

            node = parent;
        }

        return link;
    }

    function getGameName(link, appId) {
        const label = link.getAttribute('aria-label') ||
            link.querySelector('img[alt]')?.alt;
        if (label?.trim()) return label.trim();

        try {
            const segments = new URL(link.href).pathname
                .split('/')
                .filter(Boolean);
            const appIdIndex = segments.indexOf(appId);
            const slug = segments[appIdIndex + 1];
            if (slug) {
                return decodeURIComponent(slug).replaceAll('_', ' ');
            }
        } catch {
            // Fall back to the AppID when Steam provides a malformed URL.
        }

        return `App ${appId}`;
    }

    function setRowMode(row, ignored) {
        row.classList.toggle(
            'steam-hide-ignored-hidden',
            ignored && mode === HIDE_MODE
        );
        row.classList.toggle(
            'steam-hide-ignored-dimmed',
            ignored && mode === DIM_MODE
        );

        let badge = row.querySelector(':scope > .steam-hide-ignored-badge');
        if (ignored && mode === DIM_MODE && !badge) {
            badge = document.createElement('span');
            badge.className = 'steam-hide-ignored-badge';
            badge.textContent = '已忽略';
            row.appendChild(badge);
        } else if ((!ignored || mode === HIDE_MODE) && badge) {
            badge.remove();
        }

        if (ignored) {
            row.dataset.hideIgnoredProcessed = '1';
        } else {
            delete row.dataset.hideIgnoredProcessed;
        }
    }

    function getSessionId() {
        if (typeof window.g_sessionID === 'string' && window.g_sessionID) {
            return window.g_sessionID;
        }

        const inputSessionId = document.querySelector(
            'input[name="sessionid"]'
        )?.value;
        if (inputSessionId) return inputSessionId;

        const sessionCookie = document.cookie
            .split('; ')
            .find(cookie => cookie.startsWith('sessionid='));
        if (!sessionCookie) return null;

        return decodeURIComponent(sessionCookie.slice('sessionid='.length));
    }

    async function ignoreApp(appId) {
        const sessionId = getSessionId();
        if (!sessionId) {
            throw new Error('Steam session ID is unavailable; please reload the page');
        }

        const response = await fetch('/recommended/ignorerecommendation/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: new URLSearchParams({
                sessionid: sessionId,
                appid: appId,
                remove: '0'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
    }

    function getQuickIgnoreContainer(row) {
        if (row.matches('tr')) {
            const table = row.closest('table');
            return table?.parentElement || table;
        }

        return row.parentElement;
    }

    function ensureQuickIgnoreLayer() {
        if (quickIgnoreLayer?.isConnected) {
            return quickIgnoreLayer;
        }

        quickIgnoreLayer = document.createElement('div');
        quickIgnoreLayer.id = 'steam-quick-ignore-layer';
        document.body.appendChild(quickIgnoreLayer);
        return quickIgnoreLayer;
    }

    function addQuickIgnoreButton(row, appId) {
        const current = quickIgnoreButtons.get(row);
        if (
            row.dataset.steamQuickIgnoreAppId === appId &&
            current?.isConnected
        ) {
            return current;
        }

        removeQuickIgnoreButton(row);

        const container = getQuickIgnoreContainer(row);
        if (!container) return null;
        observeChartContainer(container);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'steam-quick-ignore-button';
        button.textContent = '忽略';
        button.title = '将此游戏标记为“不感兴趣”';

        button.addEventListener('click', async event => {
            event.preventDefault();
            event.stopPropagation();
            button.disabled = true;
            button.textContent = '处理中…';

            try {
                await ignoreApp(appId);
                ignoredApps.add(appId);
                button.textContent = '已忽略';
                button.title = '已标记为“不感兴趣”';
                setRowMode(row, true);
                positionQuickIgnoreButton(row, button);
            } catch (error) {
                button.disabled = false;
                button.textContent = '忽略';
                console.warn('[Steam Hide Ignored] Failed to ignore app', appId, error);
            }
        });

        ensureQuickIgnoreLayer().appendChild(button);
        quickIgnoreButtons.set(row, button);
        quickIgnoreRows.add(row);
        row.dataset.steamQuickIgnoreAppId = appId;
        positionQuickIgnoreButton(row, button);
        return button;
    }

    function positionQuickIgnoreButton(row, button) {
        if (!button.isConnected || !row.isConnected) {
            button.style.display = 'none';
            return;
        }

        const rowRect = row.getBoundingClientRect();
        if (
            !rowRect.width ||
            !rowRect.height ||
            row.classList.contains('steam-hide-ignored-hidden')
        ) {
            button.style.display = 'none';
            return;
        }

        button.style.display = 'block';
        const gap = 8;
        const rowLeft = window.scrollX + rowRect.left;
        const rowCenter = window.scrollY + rowRect.top + rowRect.height / 2;
        const left = Math.max(4, rowLeft - button.offsetWidth - gap);
        button.style.left = `${left}px`;
        button.style.top = `${rowCenter}px`;
    }

    function repositionQuickIgnoreButtons() {
        quickIgnoreRows.forEach(row => {
            const button = quickIgnoreButtons.get(row);
            if (!row.isConnected || !button?.isConnected) {
                removeQuickIgnoreButton(row);
                return;
            }
            positionQuickIgnoreButton(row, button);
        });
    }

    function updateQuickIgnoreButton(row, appId, ignored) {
        const button = addQuickIgnoreButton(row, appId);
        if (!button) return;

        button.disabled = ignored;
        button.textContent = ignored ? '已忽略' : '忽略';
        button.title = ignored
            ? '已标记为“不感兴趣”'
            : '将此游戏标记为“不感兴趣”';
    }

    function removeQuickIgnoreButton(row) {
        const button = quickIgnoreButtons.get(row);
        button?.remove();
        quickIgnoreButtons.delete(row);
        quickIgnoreRows.delete(row);
        delete row.dataset.steamQuickIgnoreAppId;
    }

    function markIgnoredRow(row, ignored) {
        setRowMode(row, ignored);
    }

    function filterChart() {
        const rows = new Map();

        const gameLinks = document.querySelectorAll(
            'a[href*="store.steampowered.com/app/"],' +
            'a[href*="store.steampowered.com/sub/"],' +
            'a[href^="/app/"],' +
            'a[href^="/sub/"]'
        );

        gameLinks.forEach(link => {
            let match = link.href.match(/\/app\/(\d+)/);

            if (match) {
                const row = findChartRow(link);
                const current = rows.get(row);
                rows.set(row, {
                    id: match[1],
                    appId: match[1],
                    name: getGameName(link, match[1]),
                    ignored: (current?.ignored || false) || ignoredApps.has(match[1])
                });
            } else {
                match = link.href.match(/\/sub\/(\d+)/);

                if (match) {
                    const row = findChartRow(link);
                    const current = rows.get(row);
                    rows.set(row, {
                        id: match[1],
                        appId: current?.appId,
                        name: current?.name || `Package ${match[1]}`,
                        ignored: (current?.ignored || false) || ignoredPackages.has(match[1])
                    });
                }
            }
        });

        // Reconcile every current row so reused React nodes cannot retain a
        // hidden/dimmed state after changing the store country.
        quickIgnoreRows.forEach(row => {
            if (!rows.has(row)) {
                removeQuickIgnoreButton(row);
            }
        });

        const affectedGames = [];
        rows.forEach(({ id, appId, name, ignored }, row) => {
            markIgnoredRow(row, ignored);
            if (ignored) {
                affectedGames.push({ id: appId || id, name });
            }
            if (appId) {
                updateQuickIgnoreButton(row, appId, ignored);
            } else {
                removeQuickIgnoreButton(row);
            }
        });
        repositionQuickIgnoreButtons();
        return affectedGames;
    }

    function logInitialSummary(games) {
        const uniqueGames = [...new Map(
            games.map(game => [game.id, game])
        ).values()];
        const action = mode === HIDE_MODE ? '隐藏' : '置灰标记';
        const details = uniqueGames.map(game => `${game.name} (${game.id})`);
        console.log(
            `[Steam Hide Ignored] 加载完成，共${action} ${uniqueGames.length} 个游戏`,
            details
        );
    }

    let filterScheduled = false;
    function scheduleFilter() {
        if (filterScheduled) {
            return;
        }

        filterScheduled = true;
        window.requestAnimationFrame(() => {
            filterScheduled = false;
            filterChart();
        });
    }

    function isScriptElement(node) {
        return node instanceof Element && node.matches(
            '#steam-quick-ignore-layer,' +
            '.steam-quick-ignore-button,' +
            '.steam-hide-ignored-badge,' +
            '#steam-hide-ignored-switch'
        );
    }

    function isRelevantMutation(record) {
        if (record.type === 'attributes') {
            return record.attributeName === 'href';
        }

        if (record.target.closest?.('#steam-quick-ignore-layer')) {
            return false;
        }

        return [...record.addedNodes, ...record.removedNodes].some(node => {
            return node.nodeType === Node.ELEMENT_NODE && !isScriptElement(node);
        });
    }

    const chartObserver = new MutationObserver(records => {
        if (records.some(isRelevantMutation)) {
            scheduleFilter();
        }
    });

    const containerResizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(repositionQuickIgnoreButtons);
    });

    function refreshObserverTargets() {
        chartObserver.disconnect();

        observedContainers.forEach(container => {
            if (!container.isConnected) {
                observedContainers.delete(container);
                containerResizeObserver.unobserve(container);
                return;
            }

            chartObserver.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['href']
            });
            if (container.parentElement) {
                chartObserver.observe(container.parentElement, {
                    childList: true
                });
            }
        });

        // Keep a temporary discovery observer until the first chart
        // container is available after Steam's asynchronous render.
        if (!observedContainers.size) {
            chartObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    function observeChartContainer(container) {
        if (observedContainers.has(container)) return;
        observedContainers.add(container);
        containerResizeObserver.observe(container);
        refreshObserverTargets();
    }

    refreshObserverTargets();
    createModeSwitch(filterChart);
    logInitialSummary(filterChart());
    window.addEventListener('resize', () => {
        window.requestAnimationFrame(repositionQuickIgnoreButtons);
    });
})();
