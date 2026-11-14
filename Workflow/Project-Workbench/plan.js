(function (root) {
  "use strict";
  const stages = {
    A: ["定方向", "确认玩家体验、项目规模和首个验证问题。"],
    B: ["试核心玩法", "通过可玩原型和实际试玩确认核心玩法方向。"],
    C: ["试完整循环", "走完目标循环，确认体验和扩大制作的可行性。"],
    D: ["正式制作", "约定的功能与内容已接入，目标流程完整可玩。"],
    E: ["测试、交付与维护", "实际交付包通过目标环境验收，维护范围明确。"]
  };
  const statuses = { todo: "待做", active: "进行中", review: "待验收", recheck: "待复核", fix: "待修正", done: "已完成", clarify: "待确认", deferred: "后置" };
  const types = { outcome: "成果", design: "设计", code: "代码", art: "美术与音效", balance: "数值", level: "关卡", playtest: "试玩", delivery: "交付" };
  const stageIds = Object.keys(stages);
  const own = (object, key) => Object.hasOwn(object, key);
  const nonempty = value => typeof value === "string" && value.trim().length > 0;

  const version = task => task.version || 1;
  const taskNumberPattern = /^([A-E])(\d+(?:-\d+)*)$/;
  const numberOf = task => task.number || task.series || task.id;
  function numberedTitle(task) {
    const match = taskNumberPattern.exec(numberOf(task));
    if (!match) return task.stage + "-" + task.title;
    const parts = match[2].split("-");
    const separator = parts.every(part => part.length === 1) ? "" : ".";
    return task.stage + parts.join(separator) + "-" + task.title;
  }

  const label = task => numberedTitle(task) + " · v" + version(task);

  function nextTaskId(plan, stage, parentId = "") {
    const parent = parentId && model(plan).byId.get(parentId);
    const parentNumber = parent && numberOf(parent);
    if (parent && !taskNumberPattern.test(parentNumber)) return globalThis.crypto.randomUUID();
    const prefix = parent ? parentNumber + "-" : stage;
    const siblings = plan.tasks.flatMap(task => [task.series || task.id, numberOf(task)])
      .filter(id => id.startsWith(prefix))
      .map(id => id.slice(prefix.length))
      .filter(suffix => /^\d+$/.test(suffix));
    return prefix + (Math.max(0, ...siblings.map(Number)) + 1);
  }
  function model(plan, historical = false) {
    const byId = new Map(plan.tasks.map(task => [task.id, task]));
    const children = new Map(plan.tasks.map(task => [task.id, []]));
    const latest = new Map();
    for (const task of plan.tasks) {
      const key = task.series || task.id;
      if (!latest.has(key) || version(latest.get(key)) < version(task)) latest.set(key, task);
    }
    const current = task => latest.get(task.series || task.id);
    const tasks = historical ? plan.tasks : [...latest.values()];
    const resolve = id => historical ? byId.get(id) : current(byId.get(id));
    for (const task of tasks) if (task.parent) children.get(resolve(task.parent).id).push(task);
    const prerequisites = task => [
      ...task.depends.map(resolve),
      ...children.get(task.id).filter(child => child.required)
    ];
    const status = task => !historical && plan.rechecks?.[task.id] ? "recheck" : task.status;
    return { byId, children, prerequisites, tasks, current, status };
  }

  function validate(plan) {
    if (plan?.version !== 1 || !nonempty(plan.name) || !own(stages, plan.current) ||
        !Array.isArray(plan.tasks) || !plan.stages || Object.keys(plan.stages).length !== stageIds.length) {
      throw Error("项目计划格式无效。");
    }
    for (const stage of stageIds) {
      const item = plan.stages[stage];
      if (!item || !["pending", "passed", "recheck"].includes(item.status) ||
          !Array.isArray(item.history) || item.history.some(entry => !nonempty(entry)) ||
          (item.status === "passed" && !item.history.length)) throw Error("阶段记录无效。");
    }
    const ids = new Set();
    const versions = new Set();
    for (const task of plan.tasks) {
      if (!nonempty(task?.id) || ids.has(task.id) || !nonempty(task.title) ||
          !own(stages, task.stage) || !own(statuses, task.status) || !own(types, task.type) ||
          !["P0", "P1", "P2"].includes(task.priority) || !Number.isSafeInteger(task.order) || task.order < 0 ||
          typeof task.required !== "boolean" || typeof task.parent !== "string" ||
          !Array.isArray(task.depends) || new Set(task.depends).size !== task.depends.length ||
          !["acceptance", "note", "source"].every(field => typeof task[field] === "string") ||
          !Array.isArray(task.history) || task.history.some(entry => !nonempty(entry)) ||
          (task.content!==undefined && typeof task.content!=="string") ||
          (task.number!==undefined && !taskNumberPattern.test(task.number))) {
        throw Error("任务数据无效。");
      }
      ids.add(task.id);
      const series = task.series || task.id;
      const key = JSON.stringify([series,version(task)]);
      if (!nonempty(series) || !Number.isSafeInteger(version(task)) || version(task)<1 || versions.has(key)) throw Error("任务版本无效。");
      versions.add(key);
      if (task.assets !== undefined && (!Array.isArray(task.assets) ||
          task.assets.some((asset,index) => !nonempty(asset?.name) || asset.version!==index+1 ||
            !nonempty(asset.path) || !/^[a-f0-9]{64}$/.test(asset.hash) ||
            !["pending","adopted","changes","rejected"].includes(asset.decision) || typeof asset.note!=="string"))) throw Error("美术审阅记录无效。");
      if (task.status==="done" && task.assets?.length && !task.assets.some(asset=>asset.decision==="adopted")) throw Error("美术任务验收需要已采用的候选素材。");
    }
    for (const task of plan.tasks) {
      if (task.parent && !ids.has(task.parent)) throw Error("父任务不存在。");
    }
    const { byId, prerequisites } = model(plan,true);
    const effective = model(plan);
    if (Object.entries(plan.rechecks || {}).some(([id,reason])=>!ids.has(id) || !nonempty(reason))) throw Error("任务复核记录无效。");
    for (const task of plan.tasks) {
      if (version(task)>1) {
        const previous=byId.get(task.previous);
        if (!previous || (previous.series || previous.id)!==task.series || version(previous)!==version(task)-1 ||
            !nonempty(task.reason)) throw Error("新版缺少有效的旧版或重做原因。");
      }
      if(task.reusedFrom && task.reusedFrom!==task.previous) throw Error("复用来源须指向被复制的任务。");
      if (effective.current(task)===task && task.parent && effective.current(byId.get(task.parent)).stage !== task.stage) throw Error("父子任务须属于同一阶段。");
      for (const id of task.depends) {
        const dependency = byId.get(id);
        if (!dependency) throw Error("关联任务不存在。");
      }
    }
    const visited = new Set();
    const active = new Set();
    function visit(task, edges) {
      if (active.has(task.id)) throw Error("父子关系或前置任务形成循环。");
      if (visited.has(task.id)) return;
      active.add(task.id);
      for (const next of edges(task)) visit(next, edges);
      active.delete(task.id);
      visited.add(task.id);
    }
    for (const task of plan.tasks) visit(task, task => task.parent ? [byId.get(task.parent)] : []);
    visited.clear();
    for (const task of plan.tasks) visit(task, prerequisites);
    visited.clear();
    for (const task of effective.tasks) visit(task,task=>task.parent ? [effective.current(byId.get(task.parent))] : []);
    for (const stage of stageIds) {
      if (plan.stages[stage].status === "passed" && !canPass(plan, stage)) throw Error("已通过阶段存在未验收的必要任务或更早阶段。");
    }
    const nextStage = stageIds.find(stage => plan.stages[stage].status !== "passed") || "E";
    if (plan.current !== nextStage) throw Error("当前阶段应指向最早未通过的阶段。");
    return plan;
  }

  function compare(a, b) {
    return a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id,undefined,{numeric:true});
  }

  function canPass(plan, stage) {
    return stageIds.slice(0, stageIds.indexOf(stage)).every(id => plan.stages[id].status === "passed");
  }

  function overview(plan) {
    const {tasks,status}=model(plan);
    const open=tasks.filter(task=>!["done","deferred","clarify"].includes(status(task)));
    const active=open.filter(task=>status(task)==="active").sort(compare);
    const priority=open.filter(task=>task.priority==="P0" && status(task)!=="active").sort(compare);
    return {focus:[...active,...priority], remaining:open.filter(task=>task.stage===plan.current).sort(compare)};
  }

  function markRechecks(plan,seeds,reason,excluded=new Set()){
    const {tasks,prerequisites}=model(plan);
    const affected=new Set(seeds);
    let count;
    do {
      count=affected.size;
      for(const task of tasks){
        if(prerequisites(task).some(item=>affected.has(item.id))) affected.add(task.id);
      }
    } while(affected.size!==count);
    plan.rechecks ||= {};
    for(const task of tasks){
      if(affected.has(task.id) && !excluded.has(task.id) && ["done","review","active"].includes(task.status)) plan.rechecks[task.id]=reason;
    }
  }

  function reopen(plan, id, reason, changes={}, reuse={}) {
    if (!nonempty(reason)) throw Error("请填写重开原因。");
    const { byId, children, current, status } = model(plan);
    const task = byId.get(id);
    if (!task || current(task)!==task || !["done", "review", "recheck"].includes(status(task))) throw Error("请选择当前版本的已验收、待验收或待复核任务。");
    const former = plan.current;
    const originals=[task];
    for(const item of originals) originals.push(...children.get(item.id));
    const copies=new Map();
    for(const original of originals){
      const series=original.series || original.id;
      const next=version(original)+1;
      const org=original===task;
      const reusable=!org && nonempty(reuse[original.id]) && status(original)==="done";
      const copy={...structuredClone(original),id:series+"@v"+next,series,version:next,previous:original.id,
        reason:reason.trim(),status:reusable ? "done" : org ? "fix" : original.status==="deferred" ? "deferred" : "todo",
        history:reusable ? ["复用 "+label(original)+"："+reuse[original.id].trim()] : []};
      if(org) for(const key of ["title","content","acceptance","note"]) if(typeof changes[key]==="string") copy[key]=changes[key];
      if(!reusable) delete copy.assets;
      else copy.reusedFrom=original.id;
      if(!reusable) delete copy.reusedFrom;
      copies.set(original.id,copy);
    }
    for(const [old,copy] of copies){
      const remap=id=>id ? copies.get(current(byId.get(id)).id)?.id || id : "";
      copy.parent=remap(copy.parent);
      copy.depends=copy.depends.map(remap);
      if(plan.rechecks) delete plan.rechecks[old];
    }
    plan.tasks.push(...copies.values());
    const newIds=new Set([...copies.values()].map(item=>item.id));
    markRechecks(plan,[...newIds],"关联任务已创建新版本："+label(copies.get(id)),newIds);
    if (task.stage < former || plan.stages[task.stage].status === "passed") {
      for (const stage of stageIds.slice(stageIds.indexOf(task.stage), stageIds.indexOf(former) + 1)) {
        plan.stages[stage].status = stage === task.stage ? "pending" : "recheck";
        plan.stages[stage].history.unshift("阶段退回："+label(copies.get(id))+"。"+reason.trim());
      }
      plan.current = task.stage;
    }
    return copies.get(id);
  }

  function keepResult(plan,id,evidence){
    const {byId,current}=model(plan);
    const task=byId.get(id);
    if(!task || current(task)!==task || task.status!=="done" || !plan.rechecks?.[id] ||
        !nonempty(evidence)) throw Error("请填写原成果仍有效的依据。");
    delete plan.rechecks[id];
    plan.stages[task.stage].history.unshift(label(task)+" 复核沿用："+evidence.trim());
  }

  function pass(plan, evidence) {
    const stage = plan.current;
    if (plan.stages[stage].status === "passed" || !canPass(plan, stage) || !nonempty(evidence)) {
      throw Error("请填写整体阶段验收结论。");
    }
    plan.stages[stage].history.unshift(evidence.trim());
    plan.stages[stage].status = "passed";
    const next = stageIds[stageIds.indexOf(stage) + 1];
    if (!next) return;
    plan.current = next;
    if (plan.stages[next].status === "recheck") {
      const {tasks}=model(plan);
      markRechecks(plan,tasks.filter(task=>task.stage===next && task.status==="done").map(task=>task.id),next+" 阶段在上游修正后重新检查。");
    }
  }

  function create(name) {
    return {
      version: 1, name, current: "A", tasks: [],
      stages: Object.fromEntries(stageIds.map(id => [id, { status: "pending", history: [] }]))
    };
  }

  function move(plan,id,stage,parent=""){
    const {byId,current,children}=model(plan);
    const task=byId.get(id);
    if(!task || current(task)!==task || task.status==="done" || !own(stages,stage)) throw Error("请选择当前未完成的任务。");
    const branch=[task];
    for(const item of branch) branch.push(...children.get(item.id));
    const destination=parent && byId.get(parent);
    if(parent && (!destination || destination.stage!==stage || current(destination)!==destination || branch.includes(destination))) throw Error("请选择有效的目标父任务。");
    if(stage!==task.stage && branch.some(item=>item.status==="done")) throw Error("这组任务包含已完成成果，其阶段需要保留。可把未完成的子任务分别移动。");
    if(stage===task.stage && (parent ? destination===current(byId.get(task.parent) || task) : !task.parent)) return;
    if(branch.some(item=>item.status==="done")) throw Error("这组任务包含已完成成果。请分别移动未完成的子任务。");
    task.parent=parent;
    for(const item of branch){
      if(taskNumberPattern.test(item.parent ? numberOf(current(byId.get(item.parent))) : stage+"1")){
        item.number=nextTaskId(plan,stage,item.parent ? current(byId.get(item.parent)).id : "");
      } else {
        delete item.number;
      }
      item.stage=stage;
    }
  }

  const api = { stages, statuses, types, create, validate, model, overview, canPass, reopen, keepResult, pass, move, compare, version, label, numberedTitle, nextTaskId };
  if (typeof module === "object") module.exports = api;
  else root.GamePlan = api;
})(globalThis);
