"use strict";
const fs = require("node:fs");
const path = require("node:path");
const logic = require("./plan.js");
const root = path.resolve(__dirname, "../..");
const filename = "project-plan.json";

function projectFile(project) {
  if (!project || project !== path.basename(project) || project.startsWith(".")) throw Error("请选择仓库内的项目。");
  const directory = path.join(root, project);
  if (!fs.existsSync(directory) || fs.lstatSync(directory).isSymbolicLink() ||
      path.relative(fs.realpathSync(root), fs.realpathSync(directory)) !== project ||
      !fs.statSync(directory).isDirectory()) throw Error("项目目录无效。");
  const file = path.join(directory, filename);
  if (fs.existsSync(file) && (fs.lstatSync(file).isSymbolicLink() || !fs.statSync(file).isFile())) throw Error("计划文件路径无效。");
  return file;
}

try {
  const [command, project] = process.argv.slice(2);
  if (command === "--init") fs.writeFileSync(projectFile(project), JSON.stringify(logic.validate(logic.create(project)), null, 2) + "\n", { flag: "wx" });
  else if (command === "--check") {
    const plan = logic.validate(JSON.parse(fs.readFileSync(projectFile(project), "utf8")));
    const { focus, remaining } = logic.overview(plan);
    console.log(JSON.stringify({ current: plan.current, focus: focus.map(logic.label), remaining: remaining.map(logic.label) }, null, 2));
  } else throw Error("用法：node server.cjs --init 或 --check <项目目录>");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
