import { defineConfig } from 'vitepress';

// English content lives under docs/en/ (VitePress locale key `en`).
// Design calls this the canonical / "root" locale; zh-CN is parallel under docs/zh-CN/.
const enGuide = [
  { text: 'Usage guide', link: '/en/guide/usage' },
  { text: 'Architecture', link: '/en/guide/architecture' },
  { text: 'Manifest', link: '/en/guide/manifest' },
  { text: 'Commands', link: '/en/guide/commands' },
  { text: 'Example template', link: '/en/guide/example-template' },
  { text: 'Template authoring', link: '/en/template-authoring' },
];

const zhGuide = [
  { text: '使用说明', link: '/zh-CN/guide/usage' },
  { text: '架构', link: '/zh-CN/guide/architecture' },
  { text: 'Manifest', link: '/zh-CN/guide/manifest' },
  { text: '命令', link: '/zh-CN/guide/commands' },
  { text: '示例模板', link: '/zh-CN/guide/example-template' },
  { text: '模板编写', link: '/zh-CN/template-authoring' },
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
          '/en/': [
            { text: 'Guide', items: enGuide },
            {
              text: 'Contribute',
              items: [{ text: 'Adapters', link: '/en/contribute/adapters' }],
            },
          ],
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
          '/zh-CN/': [
            { text: '指南', items: zhGuide },
            {
              text: '贡献',
              items: [{ text: '适配器', link: '/zh-CN/contribute/adapters' }],
            },
          ],
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
