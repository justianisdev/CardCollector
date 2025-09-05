import { REST, Routes } from "discord.js";
import { readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import dotenv from "dotenv";
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];
const commandsFolder = join(__dirname, "commands");


const commandFolders = readdirSync(commandsFolder).filter((f) =>
  statSync(join(commandsFolder, f)).isDirectory()
);

for (const folder of commandFolders) {
  const folderPath = join(commandsFolder, folder);
  const commandFiles = readdirSync(folderPath).filter((file) =>
    file.endsWith(".js")
  );

  for (const file of commandFiles) {
    const filePath = join(folderPath, file);

    try {
      const imported = await import(pathToFileURL(filePath).href);
      const command = imported.default;

      if (command && "data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(
          `[WARNING] The command at ${filePath} is missing "data" or "execute".`
        );
      }
    } catch (err) {
      console.error(`[ERROR] Failed to import command ${filePath}:`, err);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} global application (/) commands.`
    );

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // Global deployment
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} global application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
