import fs from 'node:fs';
const dir=new URL('../premium/locales/',import.meta.url),base=JSON.parse(fs.readFileSync(new URL('en.json',dir),'utf8'));const output={};
for(const locale of ['en','vi','ru','zh-Hans','es','fr','ko','ja','af']){const file=new URL(locale+'.json',dir);if(!fs.existsSync(file))throw Error('Missing locale '+locale);const data=JSON.parse(fs.readFileSync(file,'utf8'));const missing=Object.keys(base).filter(k=>typeof data[k]!=='string'||!data[k].trim());const extra=Object.keys(data).filter(k=>!(k in base));if(missing.length||extra.length)throw Error(locale+' key mismatch '+missing+' '+extra);output[locale]=data;}
fs.writeFileSync(new URL('../premium/dictionaries.json',import.meta.url),JSON.stringify(output));console.log('Validated nine complete locale dictionaries.');
