const fs=require('fs'),assert=require('assert'),path=require('path');
const {inlineResources}=require('../tools/inline-resources.cjs');
const read=fs.readFileSync,images=[];
fs.readFileSync=function(file,...args){if(/\.(png|svg|jpg|jpeg|gif|webp)$/i.test(String(file)))images.push(path.resolve(file));return read.call(this,file,...args)};
let result;
try{result=inlineResources('<img src="Assets/usable_assets/one_coin.png"><img src="Assets/usable_assets/one_coin.png">')}
finally{fs.readFileSync=read}
assert.equal(images.length,1,'重复引用仅读取一次，不读取未引用图片');
assert.ok(images[0].endsWith(path.join('usable_assets','one_coin.png')));
assert.equal((result.match(/data:image\/png;base64,/g)||[]).length,2);
assert.ok(!result.includes('Assets/'));
images.length=0;fs.readFileSync=function(file,...args){if(/\.(png|svg|jpg|jpeg|gif|webp)$/i.test(String(file)))images.push(file);return read.call(this,file,...args)};
try{inlineResources('<p>没有图片的页面</p>')}finally{fs.readFileSync=read}
assert.equal(images.length,0,'无图片引用时不读取任何图片');
console.log('PASS: 内嵌工具只读取实际引用的图片，重复引用不重复读，无图片时零读取');
