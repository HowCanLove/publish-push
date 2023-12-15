#!/usr/bin/env node
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import moment from "moment";
import shell from "shelljs";

const { exec } = shell;
const promptList = [
	{
		type: "input",
		message: "更新内容:",
		name: "updateCommit",
	},
	{
		type: "confirm",
		message: "将更新内容同步到readme.md:",
		name: "addToReadme",
	},
];

async function pub() {
	const currentDir = exec("pwd").trim();
	const defaultReadmePath = `${currentDir}/readme.md`;
	const currentFiles = readdirSync(currentDir);

	const packageFile = currentFiles.find((i) => /package.json/i.test(i));
	const packagePath = packageFile ? `${currentDir}/${packageFile}` : "";

	const readmeFile = currentFiles.find((i) => /readme.md/i.test(i));
	let readmePath = readmeFile ? `${currentDir}/${readmeFile}` : "";

	const packageResult = readFileSync(packagePath, "utf-8");
	const versionLineMatch = packageResult.match(/version[^,]*/);
	if (Array.isArray(versionLineMatch)) {
		const versionLine = versionLineMatch[0];
		const nextVersion =
			+versionLine
				.replace(/[^\d\.]/g, "")
				.split(".")
				.pop() + 1;
		const newVersionLine = versionLine.replace(/\d+"$/, `${nextVersion}"`);

		const newPackage = packageResult.replace(versionLine, newVersionLine);

		const { updateCommit, addToReadme } = await inquirer.prompt(promptList);
		if (updateCommit && addToReadme) {
			if (!readmePath) {
				readmePath = defaultReadmePath;
			}
			const readmeFileContent = readFileSync(readmePath, "utf-8");

			if (!readmeFileContent.includes("## 更新备注")) {
				appendFileSync(readmePath, "\n## 更新备注\n  \n");
			}

			appendFileSync(
				readmePath,
				`${newVersionLine.replace(/[^\d^.]/g, "")} ---------- ${moment().format(
					"YYYY-MM-DD HH:mm:ss"
				)}  \n`
			);
			appendFileSync(readmePath, `更新内容: ${updateCommit}  \n`);
		}
		writeFileSync(packagePath, newPackage);
		// 获取当前分支名称，提交上去
		const branch = exec("git rev-parse --abbrev-ref HEAD");
		exec("npm publish");
		exec("git status");
		exec("git add .");
		exec(`git commit -m "${updateCommit || "update"}"`);
		exec(`git push origin ${branch}`);
	}
}
pub();
