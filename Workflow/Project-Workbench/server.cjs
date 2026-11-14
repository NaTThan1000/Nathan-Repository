"use strict";
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
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

function read(file) {
  const raw = fs.readFileSync(file);
  return {
    plan: logic.validate(JSON.parse(raw)),
    revision: crypto.createHash("sha256").update(raw).digest("hex")
  };
}

function serialize(plan) {
  return JSON.stringify(logic.validate(plan), null, 2) + "\n";
}

function save(file, plan, revision) {
  const text = serialize(plan);
  const temporary = file + "." + crypto.randomUUID() + ".tmp";
  fs.writeFileSync(temporary, text, { flag: "wx" });
  try {
    if (read(file).revision !== revision) {
      throw Object.assign(Error("计划已在别处更新。当前输入仍在页面，请复制需要保留的内容，再重新载入。"), { status: 409 });
    }
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  return read(file);
}

function list() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
    .filter(entry => fs.existsSync(path.join(root, entry.name, filename)))
    .map(entry => entry.name);
}

function start(open) {
  const token = crypto.randomBytes(24).toString("hex");
  const staticFiles = {
    "/": ["workbench.html", "text/html; charset=utf-8"],
    "/plan.js": ["plan.js", "text/javascript; charset=utf-8"]
  };
  const server = http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const json = (data, status = 200) => {
      response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(data));
    };
    try {
      if (request.headers.host !== "127.0.0.1:" + server.address().port) return json({ error: "无效的本机地址。" }, 403);
      const url = new URL(request.url, "http://" + request.headers.host);
      const asset = Object.hasOwn(staticFiles, url.pathname) ? staticFiles[url.pathname] : undefined;
      if (request.method === "GET" && asset) {
        response.setHeader("Content-Type", asset[1]);
        return response.end(fs.readFileSync(path.join(__dirname, asset[0])));
      }
      if (request.method === "GET" && url.pathname === "/api/projects") return json({ projects: list(), token });
      if (url.pathname === "/api/plan") {
        const file = projectFile(url.searchParams.get("project"));
        if (request.method === "GET") return json(read(file));
        if (request.method === "PUT") {
          if (request.headers["x-plan-token"] !== token || request.headers.origin !== url.origin) {
            return json({ error: "保存请求须来自当前工作台。" }, 403);
          }
          let body = "";
          request.setEncoding("utf8");
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 2_000_000) throw Error("项目计划过大。");
          }
          const { plan, revision } = JSON.parse(body);
          return json(save(file, plan, revision));
        }
      }
      json({ error: "未找到入口。" }, 404);
    } catch (error) {
      json({ error: error.message }, error.status || 400);
    }
  });
  server.listen(0, "127.0.0.1", () => {
    const address = "http://127.0.0.1:" + server.address().port + "/";
    console.log(address);
    if (open && process.platform === "win32") {
      console.log("请在使用工作台时保持此窗口打开。");
      execFile("rundll32.exe", ["url.dll,FileProtocolHandler", address], { windowsHide: true }, error => {
        if (error) console.error("请手动打开上方地址。");
      });
    }
  });
}

try {
  const [command, project] = process.argv.slice(2);
  if (command === "--init") fs.writeFileSync(projectFile(project), serialize(logic.create(project)), { flag: "wx" });
  else if (command === "--check") {
    const { plan } = read(projectFile(project));
    const { focus, remaining } = logic.overview(plan);
    console.log(JSON.stringify({ current: plan.current, focus: focus.map(logic.label), remaining: remaining.map(logic.label) }, null, 2));
  } else start(command === "--open");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
