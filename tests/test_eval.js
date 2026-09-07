const fs = require('fs');
const locales = ['vi', 'en', 'zh', 'ru', 'ja'];
let code = '';
for (const lang of locales) {
    code += fs.readFileSync(`/mnt/c/TakaExtension/OS/locales/${lang}.js`, 'utf8') + '\n';
}
code += fs.readFileSync('/mnt/c/TakaExtension/OS/js/i18n.js', 'utf8');
const mock = `
const window = {};
const document = { querySelectorAll: () => [], readyState: 'loading', addEventListener: () => {}, getElementById: () => null };
const chrome = {};
let currentAppLanguage = "vi";
`;
eval(mock + code + `
console.log("tip_tab_cite for zh:", I18N_DATA["zh"]["tip_tab_cite"]);
`);
