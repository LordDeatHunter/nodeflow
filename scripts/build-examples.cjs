const fs = require('fs');
const path = require('path');
const child_process = require("child_process");
const buildPath = path.resolve(__dirname, "..", "examples-build");
const examplesPath = path.resolve(__dirname, "..", "examples");
// Single landing page shared with the `bun dev` landing server (scripts/dev-landing.ts).
const landingPath = path.resolve(__dirname, "landing.html");

const FOLDER_MAP = {
    "BlueprintApp": "blueprint",
    "FamilyTreeApp": "familytree",
    "NoStyle": "nostyle",
};

const recreateFolder = (path) => {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true });
    }

    fs.mkdirSync(path);
};

const copyFolder = (from, to) => {
    console.log(`Copying folder from ${from} to ${to}...`);
    fs.cp(from, to, { recursive: true }, (err) => {
        if (err) {
            console.error(`Failed to copy folder from ${from} to ${to}.`);
            process.exit(1);
        } else {
            console.log(`Successfully copied folder from ${from} to ${to}.`);
        }
    });
};

const buildExamples = async () => {
    recreateFolder(buildPath);
    fs.copyFileSync(landingPath, path.join(buildPath, "index.html"));

    await fs.readdir(examplesPath, (err, files) => {
        if (err) {
            console.error("Could not list the directory.", err);
            process.exit(1);
        }

        files.forEach((file) => {
            if (!fs.lstatSync(path.join(examplesPath, file)).isDirectory()) {
                return;
            }
            const packageJsonPath = path.join(examplesPath, file, "package.json");
            if (!fs.existsSync(packageJsonPath) || !JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).scripts?.build) {
                console.log(`Skipping ${file} (no package.json with a build script).`);
                return;
            }
            const outputFolderName = file in FOLDER_MAP ? FOLDER_MAP[file] : file;
            recreateFolder(path.join(buildPath, outputFolderName));

            const examplePath = path.join(examplesPath, file);
            console.log(`Building ${examplePath}...`);
            const childProcess = child_process.exec("bun run build", { cwd: examplePath });
            childProcess.stdout.pipe(process.stdout);
            childProcess.stderr.pipe(process.stderr);

            childProcess.on("exit", (code) => {
                if (code === 0) {
                    console.log(`Successfully built "${outputFolderName}".`);
                    copyFolder(path.join(examplePath, "dist"), path.join(buildPath, outputFolderName));
                    return;
                }
                console.error(`Failed to build "${outputFolderName}" with code ${code}.`);
                process.exit(1);
            });
        });
    });
};

buildExamples();