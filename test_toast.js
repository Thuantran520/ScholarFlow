const I18N_DATA = { vi: {} };
const curLang = "vi";

function showToast(msgKey, type = 'success', variables = []) {
  // Get translation from i18n
  let msg = (I18N_DATA && I18N_DATA[curLang] && I18N_DATA[curLang][msgKey]) ? I18N_DATA[curLang][msgKey] : msgKey;
  
  // Replace variables like {0}, {1} if any
  variables.forEach((val, i) => {
    msg = msg.replace('{' + i + '}', val);
  });
  
  console.log(msg);
}

showToast("Hello world");
