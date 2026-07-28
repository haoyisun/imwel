import { defineConfig } from 'vitepress';

// English content lives under docs/en/ (VitePress locale key `en`).
// Design calls this the canonical / "root" locale; zh-CN is parallel under docs/zh-CN/.
// The sidebar is grouped by purpose + audience (Diátaxis-lite), not one flat list,
// so prev/next follows a real learning path. en and zh-CN mirror each other.
const enSidebar = [
  {
    text: 'Getting started',
    items: [
      { text: 'Overview', link: '/en/' },
      { text: 'Install & prerequisites', link: '/en/getting-started/install' },
      { text: 'Quick walkthrough', link: '/en/guide/usage' },
    ],
  },
  {
    text: 'Consumer path',
    items: [
      { text: '1. Install a template', link: '/en/consume/quickstart' },
      { text: '2. Sync, drift & rollback', link: '/en/consume/sync-and-drift' },
      { text: '3. Contribute changes back', link: '/en/consume/contribute-back' },
    ],
  },
  {
    text: 'Author path',
    items: [
      { text: '1. Author a template', link: '/en/author/quickstart' },
      { text: '2. Lint & quality bar', link: '/en/author/lint' },
      { text: '3. Publish & maintain', link: '/en/author/publish' },
      { text: 'Draft rules from your codebase', link: '/en/author/from-codebase' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Commands', link: '/en/guide/commands' },
      { text: 'In-tool skills & commands', link: '/en/guide/in-tool-skills' },
      { text: 'Manifest', link: '/en/guide/manifest' },
    ],
  },
  {
    text: 'Concepts',
    items: [
      { text: 'Architecture', link: '/en/guide/architecture' },
      { text: 'Glossary', link: '/en/concepts/glossary' },
    ],
  },
  {
    text: 'Contribute',
    items: [{ text: 'Adapters', link: '/en/contribute/adapters' }],
  },
];

const zhSidebar = [
  {
    text: '快速上手',
    items: [
      { text: '概览', link: '/zh-CN/' },
      { text: '安装与前置', link: '/zh-CN/getting-started/install' },
      { text: '快速走查', link: '/zh-CN/guide/usage' },
    ],
  },
  {
    text: '消费者路径',
    items: [
      { text: '1. 安装模板', link: '/zh-CN/consume/quickstart' },
      { text: '2. 同步、漂移与回滚', link: '/zh-CN/consume/sync-and-drift' },
      { text: '3. 回馈上游', link: '/zh-CN/consume/contribute-back' },
    ],
  },
  {
    text: '作者路径',
    items: [
      { text: '1. 编写模板', link: '/zh-CN/author/quickstart' },
      { text: '2. Lint 与质量条', link: '/zh-CN/author/lint' },
      { text: '3. 发布与维护', link: '/zh-CN/author/publish' },
      { text: '从代码库起草规则', link: '/zh-CN/author/from-codebase' },
    ],
  },
  {
    text: '参考',
    items: [
      { text: '命令', link: '/zh-CN/guide/commands' },
      { text: '工具内 skill 与命令', link: '/zh-CN/guide/in-tool-skills' },
      { text: 'Manifest', link: '/zh-CN/guide/manifest' },
    ],
  },
  {
    text: '概念',
    items: [
      { text: '架构', link: '/zh-CN/guide/architecture' },
      { text: '术语词表', link: '/zh-CN/concepts/glossary' },
    ],
  },
  {
    text: '贡献',
    items: [{ text: '适配器', link: '/zh-CN/contribute/adapters' }],
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
          { text: 'Guide', link: '/en/guide/usage' },
          { text: 'Contribute', link: '/en/contribute/adapters' },
          {
            text: 'GitHub',
            link: 'https://github.com/haoyisun/imwel',
          },
        ],
        sidebar: {
          '/en/': enSidebar,
        },
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
          { text: '指南', link: '/zh-CN/guide/usage' },
          { text: '贡献', link: '/zh-CN/contribute/adapters' },
          {
            text: 'GitHub',
            link: 'https://github.com/haoyisun/imwel',
          },
        ],
        sidebar: {
          '/zh-CN/': zhSidebar,
        },
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
