// ==UserScript==
// @name         Steam 畅销榜隐藏已忽略游戏
// @name:en      Steam Weekly Charts - Hide Ignored
// @namespace    https://github.com/hahahaha123567/web-scripts
// @version      1.1.1
// @description  隐藏或置灰 Steam 畅销榜中已标记为“不感兴趣”的游戏
// @description:en Hide or dim ignored games on Steam weekly top sellers
// @author       hahahaha123567
// @homepageURL  https://github.com/hahahaha123567/web-scripts/blob/master/SteamWeeklyCharts-HideIgnored.js
// @supportURL   https://github.com/hahahaha123567/web-scripts/issues
// @match        https://store.steampowered.com/charts/topselling/*
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

    addStyles();

    console.log(
        `[Steam Hide Ignored] ${ignoredApps.size} ignored apps loaded`
    );

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

    function markIgnoredRow(row, id, ignored) {
        if (ignored && !row.dataset.hideIgnoredProcessed) {
            console.log('[Steam Hide Ignored] ignoring app', id);
        }
        setRowMode(row, ignored);
    }

    function filterChart() {
        const rows = new Map();

        document
            .querySelectorAll(
                'a[href*="store.steampowered.com/app/"],' +
                'a[href*="store.steampowered.com/sub/"],' +
                'a[href^="/app/"],' +
                'a[href^="/sub/"]'
            )
            .forEach(link => {
                let match = link.href.match(/\/app\/(\d+)/);

                if (match) {
                    const row = findChartRow(link);
                    const current = rows.get(row);
                    rows.set(row, {
                        id: match[1],
                        ignored: (current?.ignored || false) || ignoredApps.has(match[1])
                    });
                } else {
                    match = link.href.match(/\/sub\/(\d+)/);

                    if (match) {
                        const row = findChartRow(link);
                        const current = rows.get(row);
                        rows.set(row, {
                            id: match[1],
                            ignored: (current?.ignored || false) || ignoredPackages.has(match[1])
                        });
                    }
                }
            });

        // Reconcile every current row so reused React nodes cannot retain a
        // hidden/dimmed state after changing the store country.
        rows.forEach(({ id, ignored }, row) => {
            markIgnoredRow(row, id, ignored);
        });
    }

    createModeSwitch(filterChart);
    filterChart();

    // React may render more rows after clicking "See all 100".
    let filterScheduled = false;
    const observer = new MutationObserver(() => {
        if (filterScheduled) {
            return;
        }

        filterScheduled = true;
        window.requestAnimationFrame(() => {
            filterScheduled = false;
            filterChart();
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
