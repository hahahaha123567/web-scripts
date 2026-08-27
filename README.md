# 浏览器脚本合集

一些自用的 Tampermonkey 用户脚本，用于改善常用网站的浏览体验。

## 脚本说明

| 脚本 | 适用网站 | 功能 |
| --- | --- | --- |
| `Generate_Table_of_Contents.js` | 微信公众号文章 | 根据正文标题生成可折叠目录 |
| `SteamWeeklyCharts-HideIgnored.js` | Steam 畅销榜 | 快速将游戏标记为“不感兴趣”，并隐藏或置灰已忽略游戏 |
| `program-think-reader.js` | 编程随想博客 | 隐藏侧栏和评论区，扩大正文区域 |
| `wowhead-link-to-cn.js` | Archon | 将 Wowhead 物品链接转换为简体中文页面 |

## 安装

1. 安装 Tampermonkey、Violentmonkey 等用户脚本管理器。
2. 在仓库中打开所需脚本的源码。
3. 将源码复制到脚本管理器中新建的用户脚本中并保存。
4. 打开或刷新对应网站。

Steam 脚本需要登录 Steam，才能读取当前账号的忽略列表和执行快速忽略。每个游戏左侧的“忽略”按钮会调用 Steam 官方操作；页面右上角的“已忽略游戏显示”开关可在“直接隐藏”和“置灰并标记”两种方式间切换，选择会保存在当前浏览器中。

## 兼容性

脚本按目标网站当前页面结构维护。网站改版后如果功能失效，请检查浏览器控制台，并根据最新 DOM 或接口结构更新脚本。

## 验证

可使用 Node.js 检查 JavaScript 语法：

```bash
node --check Generate_Table_of_Contents.js
node --check SteamWeeklyCharts-HideIgnored.js
node --check program-think-reader.js
node --check wowhead-link-to-cn.js
```
