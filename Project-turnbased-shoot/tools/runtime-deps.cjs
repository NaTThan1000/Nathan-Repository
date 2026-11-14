// 优先使用项目本地依赖；兼容当前 Codex 已安装的运行环境。
const path=require('path'),os=require('os');
function runtimeDependency(name){
 try{return require(name)}catch(error){
  if(error.code!=='MODULE_NOT_FOUND')throw error;
  const cached=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',name);
  try{return require(cached)}catch(cachedError){
   throw new Error('缺少依赖 '+name+'，请从项目根目录运行 npm --prefix tools ci。原始错误：'+cachedError.message);
  }
 }
}
module.exports={runtimeDependency};
