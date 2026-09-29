// ==UserScript==
// @name         CursorBench Model Provider Toggle
// @name:zh-CN   CursorBench 模型厂商选择
// @namespace    https://github.com/hahahaha123567/web-scripts
// @version      1.0.1
// @description  Select or deselect all models and variants from a provider in CursorBench
// @description:zh-CN 按模型厂商批量选择或取消 CursorBench 中的模型及其档位
// @homepageURL  https://github.com/hahahaha123567/web-scripts
// @match        https://cursor.com/cursorbench*
// @match        https://cursor.com/*/cursorbench*
// @noframes
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const PANEL_ID = 'cursorbench-model-group-toggle';
    const CHART_SELECTOR = 'figure.cursorbench-chart';
    const PANEL_GAP = 12;
    const PANEL_EDGE_GAP = 12;
    const MIN_PANEL_WIDTH = 180;
    const EFFORT_SUFFIX = /\s+(?:Extra High|Max|High|Medium|Low|Minimal)$/i;
    const GROUP_NAME_PATTERN = /^[^\s-]+/;
    const PROVIDER_RULES = [
        { name: 'Anthropic', pattern: /^(?:Claude|Fable|Opus|Sonnet)\b/i },
        { name: 'OpenAI', pattern: /^(?:GPT|o\d)\b|^GPT-/i },
        { name: 'xAI', pattern: /^Grok\b/i },
        { name: 'Google', pattern: /^Gemini\b/i },
        { name: 'Meta', pattern: /^Muse\b/i },
        { name: 'Cursor', pattern: /^Composer\b/i }
    ];

    function getTableRows() {
        return [...document.querySelectorAll(
            'main table tbody tr[role="button"][aria-pressed]'
        )];
    }

    function getModelName(row) {
        return row.querySelector('td:nth-child(2) .truncate')?.textContent.trim()
            || row.querySelector('td:nth-child(2)')?.textContent.trim()
            || '';
    }

    function getFamilyName(modelName) {
        return modelName.replace(EFFORT_SUFFIX, '').trim();
    }

    function getGroupName(familyName) {
        return PROVIDER_RULES.find(rule => rule.pattern.test(familyName))?.name
            || familyName.match(GROUP_NAME_PATTERN)?.[0]
            || familyName;
    }

    function collectGroups() {
        const groups = new Map();

        for (const row of getTableRows()) {
            const modelName = getModelName(row);
            const familyName = getFamilyName(modelName);
            if (!familyName) continue;

            const groupName = getGroupName(familyName);
            if (!groups.has(groupName)) {
                groups.set(groupName, {
                    name: groupName,
                    rows: [],
                    rowsByFamily: new Map()
                });
            }

            const group = groups.get(groupName);
            group.rows.push(row);
            if (!group.rowsByFamily.has(familyName)) {
                group.rowsByFamily.set(familyName, row);
            }
        }

        return [...groups.values()]
            .sort((left, right) => left.name.localeCompare(right.name));
    }

    function getGroupState(group) {
        const familyRows = [...group.rowsByFamily.values()];
        const selected = familyRows.filter(row => {
            return row.getAttribute('aria-pressed') === 'true';
        }).length;

        return {
            selected,
            total: familyRows.length,
            selectedRows: group.rows.filter(row => {
                return row.getAttribute('aria-pressed') === 'true';
            }).length,
            totalRows: group.rows.length,
            allSelected: selected === familyRows.length
        };
    }

    function toggleGroup(group) {
        const { allSelected } = getGroupState(group);
        const shouldSelect = !allSelected;

        // Click one row per model family. The native page interaction toggles
        // the whole family, so clicking every effort variant would toggle it repeatedly.
        setGroupsSelected([group], shouldSelect);
    }

    function setGroupsSelected(groups, shouldSelect) {
        for (const group of groups) {
            for (const row of group.rowsByFamily.values()) {
                const isSelected = row.getAttribute('aria-pressed') === 'true';
                if (isSelected !== shouldSelect) row.click();
            }
        }
    }

    function addStyles() {
        if (document.getElementById(`${PANEL_ID}-style`)) return;

        const style = document.createElement('style');
        style.id = `${PANEL_ID}-style`;
        style.textContent = `
            #${PANEL_ID} {
                position: fixed;
                top: 72px;
                right: 12px;
                z-index: 10000;
                box-sizing: border-box;
                width: max-content;
                min-width: 180px;
                max-width: calc(100vw - 24px);
                max-height: calc(100vh - 96px);
                overflow: auto;
                padding: 12px;
                border: 1px solid rgba(127, 127, 127, .28);
                border-radius: 10px;
                background: var(--color-theme-card-02-hex, #ebeae5);
                box-shadow: none;
                color: var(--color-theme-fg, #171717);
                font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            #${PANEL_ID} [data-role="title"] {
                margin-bottom: 8px;
                font-weight: 600;
            }

            #${PANEL_ID} [data-role="hint"] {
                margin-bottom: 8px;
                color: var(--color-theme-text-sec, #737373);
                font-size: 12px;
            }

            #${PANEL_ID} [data-role="actions"] {
                display: flex;
                gap: 6px;
                margin-bottom: 8px;
            }

            #${PANEL_ID} [data-role="groups"] {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            #${PANEL_ID} button {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: auto;
                padding: 7px 9px;
                border: 1px solid rgba(127, 127, 127, .28);
                border-radius: 6px;
                background: transparent;
                color: inherit;
                cursor: pointer;
                font: inherit;
                text-align: left;
            }

            #${PANEL_ID} [data-role="actions"] button {
                flex: 1;
                justify-content: center;
            }

            #${PANEL_ID} button:hover,
            #${PANEL_ID} button:focus-visible {
                border-color: currentColor;
                outline: none;
            }

            #${PANEL_ID} button[data-selected="true"] {
                background: color-mix(in srgb, currentColor 9%, transparent);
            }

            #${PANEL_ID} [data-role="count"] {
                margin-left: 8px;
                color: var(--color-theme-text-sec, #737373);
                font-size: 12px;
                white-space: nowrap;
            }

            @media (max-width: 640px) {
                #${PANEL_ID} {
                    top: 60px;
                    right: 12px;
                    max-width: calc(100vw - 24px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createPanel() {
        let panel = document.getElementById(PANEL_ID);
        if (panel) return panel;

        panel = document.createElement('aside');
        panel.id = PANEL_ID;
        panel.setAttribute('aria-label', 'CursorBench model provider selection');
        panel.innerHTML = `
            <div data-role="title">Model providers</div>
            <div data-role="hint">Click to select or deselect all models from a provider</div>
            <div data-role="actions">
                <button type="button" data-action="select-all">Select all</button>
                <button type="button" data-action="deselect-all">Deselect all</button>
            </div>
            <div data-role="groups"></div>
        `;
        panel.addEventListener('click', event => {
            const button = event.target.closest('button[data-action], button[data-group]');
            if (!button || !panel.contains(button)) return;

            if (button.dataset.action) {
                setGroupsSelected(collectGroups(), button.dataset.action === 'select-all');
                return;
            }

            const group = collectGroups().find(item => {
                return item.name === button.dataset.group;
            });
            if (group) toggleGroup(group);
        });
        document.body.appendChild(panel);
        return panel;
    }

    function updatePanelLayout(panel) {
        const chart = document.querySelector(CHART_SELECTOR);
        if (!chart) return;

        const chartRect = chart.getBoundingClientRect();
        const pageWidth = document.documentElement.clientWidth;
        const scrollbarWidth = Math.max(0, window.innerWidth - pageWidth);
        const rightInset = `${scrollbarWidth + PANEL_EDGE_GAP}px`;
        const sideWidth = Math.floor(
            pageWidth - chartRect.right - PANEL_GAP - PANEL_EDGE_GAP
        );

        if (sideWidth >= MIN_PANEL_WIDTH) {
            panel.dataset.layout = 'side';
            panel.style.position = 'fixed';
            panel.style.top = '72px';
            panel.style.right = rightInset;
            panel.style.width = `${sideWidth}px`;
            panel.style.minWidth = '0';
            panel.style.maxWidth = 'none';
            return;
        }

        // Move below the chart when the right-side space is too narrow
        panel.dataset.layout = 'below';
        panel.style.position = 'absolute';
        panel.style.top = `${Math.ceil(chartRect.bottom + window.scrollY + PANEL_GAP)}px`;
        panel.style.right = rightInset;
        panel.style.width = 'max-content';
        panel.style.minWidth = `${MIN_PANEL_WIDTH}px`;
        panel.style.maxWidth = `${Math.max(0, pageWidth - PANEL_EDGE_GAP)}px`;
    }

    function renderPanel() {
        const groups = collectGroups();
        if (!groups.length) return;

        const panel = createPanel();
        updatePanelLayout(panel);
        const container = panel.querySelector('[data-role="groups"]');
        const signature = groups.map(group => {
            const state = getGroupState(group);
            return `${group.name}:${state.selectedRows}/${state.totalRows}`;
        }).join('|');

        if (panel.dataset.signature === signature) return;
        panel.dataset.signature = signature;
        container.replaceChildren(...groups.map(group => {
            const state = getGroupState(group);
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.group = group.name;
            button.dataset.selected = String(state.allSelected);
            button.setAttribute('aria-pressed', String(state.allSelected));
            button.setAttribute(
                'aria-label',
                `${state.allSelected ? 'Deselect' : 'Select'} all ${group.name} models`
            );

            const label = document.createElement('span');
            label.textContent = group.name;
            const count = document.createElement('span');
            count.dataset.role = 'count';
            count.textContent = `${state.selectedRows}/${state.totalRows}`;
            button.append(label, count);
            return button;
        }));
    }

    addStyles();

    let renderQueued = false;
    function scheduleRender() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(() => {
            renderQueued = false;
            renderPanel();
        });
    }

    let layoutQueued = false;
    function scheduleLayout() {
        if (layoutQueued) return;
        layoutQueued = true;
        requestAnimationFrame(() => {
            layoutQueued = false;
            const panel = document.getElementById(PANEL_ID);
            if (panel) updatePanelLayout(panel);
        });
    }

    const observer = new MutationObserver(scheduleRender);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-pressed']
    });
    window.addEventListener('resize', scheduleLayout);
    window.addEventListener('scroll', scheduleLayout, { passive: true });
    scheduleRender();
})();
