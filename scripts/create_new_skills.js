const fs = require("fs");
const path = require("path");
const { v4: uuid4 } = require('uuid');

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
    packageJson.name = `@senpi-ai/${pluginName}`;
    fs.writeFileSync(packageJsonFilePath, JSON.stringify(packageJson, null, 4));
    console.log(`Updated package.json name in ${packageJsonFilePath}`);

    // add the skill to senpi.character.json
    const moxieCharacterFilePath = path.join(
        __dirname,
        "../characters/senpi.character.json"
    );
    const moxieCharacter = JSON.parse(fs.readFileSync(moxieCharacterFilePath), "utf8");
    // check if the skill already exists in senpi.character.json
    if (moxieCharacter.plugins.includes(`@senpi-ai/${pluginName}`)) {
        throw new Error(`Skill ${pluginName} already exists in senpi.character.json`);
    }
    moxieCharacter.plugins.push(`@senpi-ai/${pluginName}`);

    fs.writeFileSync(moxieCharacterFilePath, JSON.stringify(moxieCharacter, null, 4));
    console.log(`Updated senpi.character.json in ${moxieCharacterFilePath}`);

    // add the skill to agent/package.json
    const agentPackageJsonFilePath = path.join(
        __dirname,
        "../agent/package.json"
    );
    const agentPackageJson = JSON.parse(fs.readFileSync(agentPackageJsonFilePath), "utf8");
    // check if the skill already exists in agent/package.json
    if (agentPackageJson.dependencies[`@senpi-ai/${pluginName}`]) {
        throw new Error(`Skill ${pluginName} already exists in agent/package.json`);
    }
    agentPackageJson.dependencies[`@senpi-ai/${pluginName}`] = `workspace:*`;

    fs.writeFileSync(agentPackageJsonFilePath, JSON.stringify(agentPackageJson, null, 4));
    console.log(`Updated agent/package.json in ${agentPackageJsonFilePath}`);

    // add the skill to the registry
    const registryFilePath = path.join(
        __dirname,
        "../registry/src/skills.json"
    );
    const registry = JSON.parse(fs.readFileSync(registryFilePath), "utf8");
    registry.push({
        pluginId: uuid4(),
        name: pluginName,
        displayName: pluginName,
        version: "0.0.1",
        author: null,
        description: "A New skill",
        githubUrl: `https://github.com/senpi-ai/senpi-agent-skills/tree/main/packages/${pluginName}`,
        logoUrl: `https://raw.githubusercontent.com/senpi-ai/senpi-agent-skills/refs/heads/main/packages/${pluginName}/images/logo.png`,
        settings: {},
        capabilities: [],
        starterQuestions: [],
        mediaUrls: [],
        actions: [],
        isPremium: false,
        freeQueries: 0,
        skillCoinAddress: "",
        minimumSkillBalance: 0,
        status: "ACTIVE",
        isDefault: false,
        loaders: []
    });
    fs.writeFileSync(registryFilePath, JSON.stringify(registry, null, 4));
    console.log(`Updated registry in ${registryFilePath}`);

} catch (error) {
    console.error("Error creating new skills:", error);
    process.exit(1);
}
