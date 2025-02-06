import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
    AgentRuntime,
    CacheManager,
    Character,
    DbCacheAdapter,
    defaultCharacter,
    elizaLogger,
    FsCacheAdapter,
    IDatabaseCacheAdapter,
    ModelProviderName,
    settings,
    stringToUuid,
    validateCharacterConfig,
} from "@elizaos/core";
import { validateEnv } from "./config/dotenvConfig";
import yargs from "yargs";
import { scheduleCrons } from "./utils/utilities";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

async function handlePluginImporting(plugins: string[]) {
    if (plugins.length > 0) {
        elizaLogger.info("Plugins are: ", plugins);
        const importedPlugins = await Promise.all(
            plugins.map(async (plugin) => {
                try {
                    const importedPlugin = await import(plugin);
                    const functionName =
                        plugin
                            .replace("@elizaos/plugin-", "")
                            .replace(/-./g, (x) => x[1].toUpperCase()) +
                        "Plugin"; // Assumes plugin function is camelCased with Plugin suffix
                    return (
                        importedPlugin.default || importedPlugin[functionName]
                    );
                } catch (importError) {
                    elizaLogger.error(
                        `Failed to import plugin: ${plugin}`,
                        importError
                    );
                    return []; // Return null for failed imports
                }
            })
        );
        return importedPlugins;
    } else {
        return [];
    }
}

const logFetch = async (url: string, options: any) => {
    elizaLogger.debug(`Fetching ${url}`);
    return fetch(url, options);
};

function tryLoadFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return null;
    }
}

function mergeCharacters(base: Character, child: Character): Character {
    const mergeObjects = (baseObj: any, childObj: any) => {
        const result: any = {};
        const keys = new Set([...Object.keys(baseObj || {}), ...Object.keys(childObj || {})]);
        keys.forEach(key => {
            if (typeof baseObj[key] === 'object' && typeof childObj[key] === 'object' && !Array.isArray(baseObj[key]) && !Array.isArray(childObj[key])) {
                result[key] = mergeObjects(baseObj[key], childObj[key]);
            } else if (Array.isArray(baseObj[key]) || Array.isArray(childObj[key])) {
                result[key] = [...(baseObj[key] || []), ...(childObj[key] || [])];
            } else {
                result[key] = childObj[key] !== undefined ? childObj[key] : baseObj[key];
            }
        });
        return result;
    };
    return mergeObjects(base, child);
}

async function loadCharacter(filePath: string): Promise<Character> {
    const content = tryLoadFile(filePath);
    if (!content) {
        throw new Error(`Character file not found: ${filePath}`);
    }
    let character = JSON.parse(content);
    validateCharacterConfig(character);

     // .id isn't really valid
     const characterId = character.id || character.name;
     const characterPrefix = `CHARACTER.${characterId.toUpperCase().replace(/ /g, "_")}.`;
     const characterSettings = Object.entries(process.env)
         .filter(([key]) => key.startsWith(characterPrefix))
         .reduce((settings, [key, value]) => {
             const settingKey = key.slice(characterPrefix.length);
             return { ...settings, [settingKey]: value };
         }, {});
     if (Object.keys(characterSettings).length > 0) {
         character.settings = character.settings || {};
         character.settings.secrets = {
             ...characterSettings,
             ...character.settings.secrets,
         };
     }
     // Handle plugins
     character.plugins = await handlePluginImporting(
        character.plugins
    );
    if (character.extends) {
        elizaLogger.info(`Merging  ${character.name} character with parent characters`);
        for (const extendPath of character.extends) {
            const baseCharacter = await loadCharacter(path.resolve(path.dirname(filePath), extendPath));
            character = mergeCharacters(baseCharacter, character);
            elizaLogger.info(`Merged ${character.name} with ${baseCharacter.name}`);
        }
    }
    return character;
}

export async function loadCharacters(
    charactersArg: string
): Promise<Character[]> {
    let characterPaths = charactersArg
        ?.split(",")
        .map((filePath) => filePath.trim());
    const loadedCharacters: Character[] = [];

    if (characterPaths?.length > 0) {
        for (const characterPath of characterPaths) {
            let content: string | null = null;
            let resolvedPath = "";

            // Try different path resolutions in order
            const pathsToTry = [
                characterPath, // exact path as specified
                path.resolve(process.cwd(), characterPath), // relative to cwd
                path.resolve(process.cwd(), "agent", characterPath), // Add this
                path.resolve(__dirname, characterPath), // relative to current script
                path.resolve(
                    __dirname,
                    "characters",
                    path.basename(characterPath)
                ), // relative to agent/characters
                path.resolve(
                    __dirname,
                    "../characters",
                    path.basename(characterPath)
                ), // relative to characters dir from agent
                path.resolve(
                    __dirname,
                    "../../characters",
                    path.basename(characterPath)
                ), // relative to project root characters dir
            ];

            elizaLogger.info(
                "Trying paths:",
                pathsToTry.map((p) => ({
                    path: p,
                    exists: fs.existsSync(p),
                }))
            );

            for (const tryPath of pathsToTry) {
                content = tryLoadFile(tryPath);
                if (content !== null) {
                    resolvedPath = tryPath;
                    break;
                }
            }

            if (content === null) {
                elizaLogger.error(
                    `Error loading character from ${characterPath}: File not found in any of the expected locations`
                );
                elizaLogger.error("Tried the following paths:");
                pathsToTry.forEach((p) => elizaLogger.error(` - ${p}`));
                process.exit(1);
            }

            try {
                const character: Character = await loadCharacter(resolvedPath);

                loadedCharacters.push(character);
                elizaLogger.info(
                    `Successfully loaded character from: ${resolvedPath}`
                );
            } catch (e) {
                elizaLogger.error(
                    `Error parsing character from ${resolvedPath}: ${e}`
                );
                process.exit(1);
            }
        }
    }

    if (loadedCharacters.length === 0) {
        elizaLogger.info("No characters found, using default character");
        loadedCharacters.push(defaultCharacter);
    }

    return loadedCharacters;
}

export function parseArguments(): {
    character?: string;
    characters?: string;
} {
    return yargs(process.argv.slice(2))
        .option("character", {
            type: "string",
            description: "Path to the character JSON file",
        })
        .option("characters", {
            type: "string",
            description:
                "Comma separated list of paths to character JSON files",
        })
        .parseSync();
}

export function getTokenForProvider(
    provider: ModelProviderName,
    character: Character
): string | undefined {

    switch (provider) {
        // no key needed for llama_local or gaianet
        case ModelProviderName.LLAMALOCAL:
            return "";
        case ModelProviderName.OLLAMA:
            return "";
        case ModelProviderName.GAIANET:
            return "";
        case ModelProviderName.OPENAI:
            return (
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.CLAUDE_VERTEX:
        case ModelProviderName.ANTHROPIC:
            return (
                character.settings?.secrets?.ANTHROPIC_API_KEY ||
                character.settings?.secrets?.CLAUDE_API_KEY ||
                settings.ANTHROPIC_API_KEY ||
                settings.CLAUDE_API_KEY
            );
        default:
            const errorMessage = `Failed to get token - unsupported model provider: ${provider}`;
            elizaLogger.error(errorMessage);
            throw new Error(errorMessage);
    }
}

function initializeDbCache(character: Character, db: IDatabaseCacheAdapter) {
    if (!character?.id) {
        throw new Error(
            "initializeFsCache requires id to be set in character definition"
        );
    }
    const cache = new CacheManager(new DbCacheAdapter(db, character.id));
    return cache;
}

function initializeFsCache(baseDir: string, character: Character) {
    if (!character?.id) {
        throw new Error(
            "initializeFsCache requires id to be set in character definition"
        );
    }
    const cacheDir = path.resolve(baseDir, character.id, "cache");

    const cache = new CacheManager(new FsCacheAdapter(cacheDir));
    return cache;
}å

export async function createAgent(
    character: Character,
    token: string
): Promise<AgentRuntime> {
    elizaLogger.log(`Creating runtime for character ${character.name}`);

    return new AgentRuntime({
        agentId: character.id,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [],
        providers: [],
        actions: [],
        services: [],
        managers: [],
        fetch: logFetch
    });
}

// Main function for initializing runtime and character
async function initializeCharacterAndRuntime(character: Character) {
    try {

        const token = getTokenForProvider(character.modelProvider, character);
        const runtime: AgentRuntime = await createAgent(character, token);

        await runtime.initialize();
        return { runtime };
    } catch (error) {
        elizaLogger.error(`Error initializing character ${character.name}: ${error}`);
        throw error;
    }
}

async function scheduleTasks() {
    const args = parseArguments();
    let charactersArg = args.characters || args.character;
    let characters = [defaultCharacter];
    if (charactersArg) {
        characters = await loadCharacters(charactersArg);
    }
    for (const character of characters) {
        character.id ??= stringToUuid(character.name);
        character.username ??= character.name;

        const { runtime } = await initializeCharacterAndRuntime(character);
        await scheduleCrons(character, runtime);
    }
}

elizaLogger.info("Validating environment variables...");
validateEnv();
elizaLogger.success("Environment variables validated successfully");

// Start the cron job scheduling
scheduleTasks().catch((error) => {
    elizaLogger.error(`Error scheduling tasks: ${error}`);
    throw error;
});
