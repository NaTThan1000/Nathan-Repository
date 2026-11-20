const runHistoryKey='turnbased-shoot.history.'+(document.getElementById('floor-map-sidebar').hidden?'arena':'main');
const finishedRuns=new WeakSet();
let sessionRunHistory=[];
let runHistoryStorageWarning=false;

function readRunHistory(){
  try{
    const stored=JSON.parse(localStorage.getItem(runHistoryKey)??'[]');
    if(Array.isArray(stored)){
      const merged=new Map([...stored,...sessionRunHistory].filter(record=>record?.id).map(record=>[record.id,record]));
      return [...merged.values()].sort((a,b)=>b.finishedAt.localeCompare(a.finishedAt));
    }
  }catch{
    runHistoryStorageWarning=true;
  }
  return sessionRunHistory;
}

recordSettlementHistory=function(outcome,panel){
  if(!runStats||finishedRuns.has(runStats))return;
  finishedRuns.add(runStats);
  const finishedAt=new Date().toISOString();
  const texts=(parent,selector)=>[...parent.querySelectorAll(selector)].map(el=>el.textContent.trim());
  const record={
    id:crypto.randomUUID?.()??(finishedAt+'-'+Math.random()),
    updatedAt:RUN_BUILD_UPDATED_AT,finishedAt,outcome,
    balance:texts(panel,'.settlement-balance .stat-line:not([hidden])'),
    events:[...panel.querySelectorAll('.settlement-events > div')].map(el=>texts(el,'dt,dd')),
    resources:[...panel.querySelectorAll('.settlement-resources tr')].map(el=>texts(el,'th,td')),
    items:[...panel.querySelectorAll('.settlement-item-list li')].map(el=>{
      const [icon,label]=el.children;
      return {icon:icon.textContent,label:label.textContent,quality:icon.dataset.quality};
    }),
  };
  sessionRunHistory=[record,...readRunHistory()];
  try{
    localStorage.setItem(runHistoryKey,JSON.stringify(sessionRunHistory));
    runHistoryStorageWarning=false;
  }catch{
    runHistoryStorageWarning=true;
  }
};

const stepHistoryDialog=document.createElement('dialog');
stepHistoryDialog.id='step-history';
stepHistoryDialog.setAttribute('aria-labelledby','step-history-title');
stepHistoryDialog.innerHTML='<h2 id="step-history-title">历史记录</h2><div class="step-history-list"></div><form method="dialog"><button type="submit">关闭</button></form>';
document.body.append(stepHistoryDialog);
const stepHistoryDate=new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'medium',hour12:false});

function historyElement(tag,value,className){
  const el=document.createElement(tag);
  if(value!=null)el.textContent=value;
  if(className)el.className=className;
  return el;
}

function drawHistoricalRun(record){
  const detail=historyElement('details',null,'step-history-run');
  detail.append(historyElement('summary',record.outcome+' · '+stepHistoryDate.format(new Date(record.finishedAt))));
  const balance=historyElement('div',null,'settlement-balance');
  balance.append(...record.balance.map(value=>historyElement('span',value)));
  detail.append(balance);
  if(record.events.length){
    const events=historyElement('dl',null,'settlement-events');
    for(const [name,value] of record.events){
      const row=historyElement('div');
      row.append(historyElement('dt',name),historyElement('dd',value));
      events.append(row);
    }
    detail.append(events);
  }
  if(record.resources.length){
    const table=historyElement('table',null,'settlement-resources');
    const heading=table.createTHead().insertRow();
    for(const value of record.resources[0])heading.append(historyElement('th',value));
    const body=table.createTBody();
    for(const values of record.resources.slice(1)){
      const row=body.insertRow();
      for(const [index,value] of values.entries())row.append(historyElement(index?'td':'th',value));
    }
    detail.append(table);
  }
  const collected=historyElement('div',null,'settlement-items');
  collected.append(historyElement('h3','拾取道具'));
  if(record.items.length){
    const list=historyElement('ul',null,'settlement-item-list');
    for(const {icon,label,quality} of record.items){
      const row=historyElement('li'),symbol=historyElement('span',icon,'settlement-item-icon');
      symbol.dataset.quality=quality;
      row.append(symbol,historyElement('span',label));
      list.append(row);
    }
    collected.append(list);
  }else collected.append(historyElement('span','无'));
  detail.append(collected);
  return detail;
}

function openRunHistory(){
  const list=stepHistoryDialog.querySelector('.step-history-list');
  list.replaceChildren();
  const builds=new Map();
  for(const record of readRunHistory()){
    if(!builds.has(record.updatedAt))builds.set(record.updatedAt,[]);
    builds.get(record.updatedAt).push(record);
  }
  if(runHistoryStorageWarning)list.append(historyElement('p','浏览器暂时无法保存记录，本次新增记录只保留到页面关闭。'));
  if(!builds.size)list.append(historyElement('p','还没有通关或失败记录。'));
  for(const [updatedAt,records] of [...builds].sort(([a],[b])=>b.localeCompare(a))){
    const group=historyElement('section',null,'step-history-build');
    group.append(historyElement('h3','更新时间 '+stepHistoryDate.format(new Date(updatedAt))));
    group.append(...records.map(drawHistoricalRun));
    list.append(group);
  }
  stepHistoryDialog.showModal();
}

for(const id of ['btn-retry-death','btn-retry-victory','.step-settings-options']){
  const button=historyElement('button','历史记录','step-history-button');
  button.type='button';
  button.onclick=()=>{
    if(stepSettings.open)stepSettings.close();
    openRunHistory();
  };
  if(id.startsWith('.'))document.querySelector(id).append(button);
  else document.getElementById(id).before(button);
}
