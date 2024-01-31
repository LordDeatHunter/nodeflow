const fs = require('fs');
const path = require('path');
const child_process = require("child_process");
const buildPath = path.resolve(__dirname, "..", "examples-build");
const examplesPath = path.resolve(__dirname, "..", "examples");

const FOLDER_MAP = {
    "BlueprintApp": "blueprint",
    "FamilyTreeApp": "familytree"
}

const recreateFolder = (path) => {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true })
    }

    fs.mkdirSync(path);
}

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
}

const buildExamples = async () => {
    await fs.readdir(examplesPath, (err, files) => {
        if (err) {
            console.error("Could not list the directory.", err);
            process.exit(1);
        }

        files.forEach((file) => {
            if (!fs.lstatSync(path.join(examplesPath, file)).isDirectory()) {
                return;
            }
            const outputFolderName = file in FOLDER_MAP ? FOLDER_MAP[file] : file;
            recreateFolder(path.join(buildPath, outputFolderName), { recursive: true });

            const examplePath = path.join(examplesPath, file);
            console.log(`Building ${examplePath}...`);
            const childProcess = child_process.exec("pnpm run build", { cwd: examplePath });
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
}

buildExamples();