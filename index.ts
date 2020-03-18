#!/usr/bin/env node

import https from "https";
import http from "http";
import fs from "fs";
import mkdirp from "mkdirp";
import { join, resolve } from "path";
import { URL } from "url";
import { cd, exec, rm } from "shelljs";
import modules from "builtin-modules";

const url = process.argv[2];
if (!url) throw new Error("No URL found");

const parsed = new URL(url);
if (!parsed.protocol) throw new Error("Invalid URL");

const rootDir = join("temp");

mkdirp(rootDir).then(() => {
  const file = fs.createWriteStream(join(rootDir, "script.js"));
  const request = (parsed.protocol === "https:" ? https : http).get(
    url,
    response => {
      response.pipe(file);
      response.on("end", () => {
        const jsFile = fs.readFileSync(join(rootDir, "script.js"), {
          encoding: "utf8"
        });
        fs.writeFileSync(
          join(rootDir, "package.json"),
          JSON.stringify({
            name: "run-url-file",
            private: true
          })
        );
        const dependencies = jsFile
          .split("require(")
          .filter(i => i.startsWith('"') || i.startsWith("'"))
          .map(i => {
            if (i.includes("'")) i = i.split("'")[1];
            if (i.includes('"')) i = i.split('"')[1];
            return i;
          })
          .filter(i => !modules.includes(i));
        cd(resolve(rootDir));
        exec(`npm install ${dependencies.join(" ")}`);
        exec("node script.js");
        exec("cd ..");
        rm("-rf", rootDir);
      });
    }
  );
});
