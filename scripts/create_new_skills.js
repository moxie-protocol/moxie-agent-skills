const fs = require("fs");
const path = require("path");

try {
    const pluginName = process.argv[2];

    if (!pluginName) {
        console.error("Please provide a skills name as an argument.");
        process.exit(1);
    }

    // Check if the skills name is already taken
    const skillsDir = path.join(__dirname, `../packages/${pluginName}`);
    if (fs.existsSync(skillsDir)) {
        console.error(`Skills name ${pluginName} already exists.`);
        process.exit(1);
    }

    fs.cpSync(
        path.join(__dirname, "../packages/_examples/plugin"),
        skillsDir,
        { recursive: true }
    );

    const tsConfigFilePath = path.join(
        skillsDir,
        `/tsconfig.json`
    );

    const tsConfig = JSON.parse(fs.readFileSync(tsConfigFilePath), "utf8");

    // Check if extends property exists
    if (tsConfig.extends) {
        // Remove one level of parent directory navigation
        tsConfig.extends = tsConfig.extends.replace("../../", "../");

        // Write the modified config back to file
        fs.writeFileSync(tsConfigFilePath, JSON.stringify(tsConfig, null, 4));
        console.log(`Updated extends path in ${tsConfigFilePath}`);
    }

    // Rewrite the package.json file name to the skills name
    const packageJsonFilePath = path.join(
        skillsDir,
        `/package.json`
    );
    const packageJson = JSON.parse(
        fs.readFileSync(packageJsonFilePath),
        "utf8"
    );
    packageJson.name = `@moxie-protocol/${pluginName}`;
    fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, null, 4));
    console.log(`Updated package.json name in ${packageJsonFilePath}`);
} catch (error) {
    console.error("Error creating new skills:", error);
    process.exit(1);
}
