#!/usr/bin/env node
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import shell from "shelljs";

const { exec, echo } = shell;
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

	let packageResult;
	try {
		packageResult = JSON.parse(readFileSync(packagePath, "utf-8"));
	} catch (error) {
		echo("package.json 文件解析异常");
		return;
	}

	if (packageResult.version) {
		const versionList = packageResult.version.split(".");
		versionList[versionList.length - 1] =
			+versionList[versionList.length - 1] + 1;
		const nextVersion = versionList.join(".");
		packageResult.version = nextVersion;

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
				`${newVersionLine.replace(
					/[^\d^.]/g,
					""
				)} ---------- ${new Date().toLocaleString()}  \n`
			);
			appendFileSync(readmePath, `更新内容: ${updateCommit}  \n`);
		}
		writeFileSync(
			packagePath,
			JSON.stringify(packageResult, "", "\t"),
			"utf-8"
		);
		// 获取当前分支名称，提交上去
		const branch = exec("git rev-parse --abbrev-ref HEAD");
		!!packageResult.scripts?.build && exec("npm run build");
		exec("npm publish");
		exec("git status");
		exec("git add .");
		exec(`git commit -m "${updateCommit || "update"}"`);
		exec(`git push origin ${branch}`);
	}
}
pub();
