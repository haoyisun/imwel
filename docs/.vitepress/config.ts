import { defineConfig } from 'vitepress';

// English under docs/en/; zh-CN under docs/zh-CN/. Sidebar follows Diátaxis:
// Tutorials → How-to → Reference → Explanation.
const enSidebar = [
  {
    text: 'Tutorials',
    items: [{ text: 'Quick Start (5 min)', link: '/en/tutorials/quick-start' }],
  },
  {
    text: 'How-to',
    items: [
      { text: 'Install', link: '/en/how-to/install' },
      { text: 'Create a template repo', link: '/en/how-to/create-template-repo' },
      { text: 'Add a rule', link: '/en/how-to/add-rule' },
      { text: 'Add a skill', link: '/en/how-to/add-skill' },
      { text: 'Consume for Cursor', link: '/en/how-to/consume-for-cursor' },
      { text: 'Consume for Claude Code', link: '/en/how-to/consume-for-claude-code' },
      { text: 'Sync and handle drift', link: '/en/how-to/sync-and-drift' },
      { text: 'Push via PR', link: '/en/how-to/push-via-pr' },
      { text: 'Manage modules and tools', link: '/en/how-to/manage-modules-and-tools' },
      { text: 'Adopt existing rules', link: '/en/how-to/adopt-existing-rules' },
      { text: 'Draft rules from a codebase', link: '/en/how-to/draft-rules-from-codebase' },
      { text: 'Lint and publish', link: '/en/how-to/lint-and-publish' },
      { text: 'Add an adapter', link: '/en/how-to/add-adapter' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Commands', link: '/en/reference/commands' },
      { text: 'Manifest', link: '/en/reference/manifest' },
      { text: 'In-tool skills', link: '/en/reference/in-tool-skills' },
      { text: 'Supported tools', link: '/en/reference/supported-tools' },
    ],
  },
  {
    text: 'Explanation',
    items: [
      { text: 'Author vs consumer', link: '/en/explanation/author-vs-consumer' },
      { text: 'Architecture', link: '/en/explanation/architecture' },
      { text: 'Drift and history', link: '/en/explanation/drift-and-history' },
      { text: 'Glossary', link: '/en/explanation/glossary' },
    ],
  },
];

const zhSidebar = [
  {
    text: '教程',
    items: [{ text: '5 分钟快速上手', link: '/zh-CN/tutorials/quick-start' }],
  },
  {
    text: '操作指南',
    items: [
      { text: '安装', link: '/zh-CN/how-to/install' },
      { text: '建立模板仓库', link: '/zh-CN/how-to/create-template-repo' },
      { text: '添加 rule', link: '/zh-CN/how-to/add-rule' },
      { text: '添加 skill', link: '/zh-CN/how-to/add-skill' },
      { text: '为 Cursor 消费渲染', link: '/zh-CN/how-to/consume-for-cursor' },
      { text: '为 Claude Code 消费渲染', link: '/zh-CN/how-to/consume-for-claude-code' },
      { text: '同步与处理漂移', link: '/zh-CN/how-to/sync-and-drift' },
      { text: '经 PR 回推上游', link: '/zh-CN/how-to/push-via-pr' },
      { text: '管理模块与工具', link: '/zh-CN/how-to/manage-modules-and-tools' },
      { text: '归并已有规则', link: '/zh-CN/how-to/adopt-existing-rules' },
      { text: '从代码库起草规则', link: '/zh-CN/how-to/draft-rules-from-codebase' },
      { text: 'Lint 与发布', link: '/zh-CN/how-to/lint-and-publish' },
      { text: '贡献适配器', link: '/zh-CN/how-to/add-adapter' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: '命令', link: '/zh-CN/reference/commands' },
      { text: 'Manifest', link: '/zh-CN/reference/manifest' },
      { text: '工具内 skill', link: '/zh-CN/reference/in-tool-skills' },
      { text: '支持的工具', link: '/zh-CN/reference/supported-tools' },
    ],
  },
  {
    text: '解释',
    items: [
      { text: '作者与消费者', link: '/zh-CN/explanation/author-vs-consumer' },
      { text: '架构', link: '/zh-CN/explanation/architecture' },
      { text: '漂移与 history', link: '/zh-CN/explanation/drift-and-history' },
      { text: '术语词表', link: '/zh-CN/explanation/glossary' },
    ],
  },
];

export default defineConfig({
  title: 'imwel',
  description: 'Git-native CLI for AI coding rules and skills',
  lastUpdated: true,
  cleanUrls: true,
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      description: 'Git-native CLI for distributing AI coding rules, skills, and agent instructions',
      themeConfig: {
        nav: [
          { text: 'Quick Start', link: '/en/tutorials/quick-start' },
          { text: 'How-to', link: '/en/how-to/create-template-repo' },
          { text: 'Reference', link: '/en/reference/commands' },
          { text: 'Concepts', link: '/en/explanation/architecture' },
          { text: 'GitHub', link: 'https://github.com/haoyisun/imwel' },
        ],
        sidebar: { '/en/': enSidebar },
        socialLinks: [{ icon: 'github', link: 'https://github.com/haoyisun/imwel' }],
        editLink: {
          pattern: 'https://github.com/haoyisun/imwel/edit/main/docs/:path',
          text: 'Edit this page on GitHub',
        },
      },
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh-CN/',
      description: '用于分发 AI 编程规则、技能与 agent 说明的 Git 原生 CLI',
      themeConfig: {
        nav: [
          { text: '快速上手', link: '/zh-CN/tutorials/quick-start' },
          { text: '操作指南', link: '/zh-CN/how-to/create-template-repo' },
          { text: '参考', link: '/zh-CN/reference/commands' },
          { text: '概念', link: '/zh-CN/explanation/architecture' },
          { text: 'GitHub', link: 'https://github.com/haoyisun/imwel' },
        ],
        sidebar: { '/zh-CN/': zhSidebar },
        socialLinks: [{ icon: 'github', link: 'https://github.com/haoyisun/imwel' }],
        editLink: {
          pattern: 'https://github.com/haoyisun/imwel/edit/main/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
        outlineTitle: '本页目录',
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdatedText: '最后更新',
        darkModeSwitchLabel: '外观',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
      },
    },
  },
});
