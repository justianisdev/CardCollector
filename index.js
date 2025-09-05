// index.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ActivityType,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a new Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Add a Collection to store commands
client.commands = new Collection();

// Load commands dynamically with safety checks
const foldersPath = join(__dirname, "commands");
const commandFolders = fs
  .readdirSync(foldersPath)
  .filter((f) => fs.statSync(join(foldersPath, f)).isDirectory());

(async () => {
  for (const folder of commandFolders) {
    const commandsPath = join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);

      try {
        const imported = await import(pathToFileURL(filePath).href);
        const command = imported.default;

        if (command && "data" in command && "execute" in command) {
          client.commands.set(command.data.name, command);
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

  // Ready event
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);

    const activities = [
      { name: "catching cats", type: ActivityType.Playing },
      { name: "my card collection", type: ActivityType.Watching },
    ];
    let i = 0;
    setInterval(() => {
      client.user.setPresence({
        activities: [activities[i]],
        status: "online",
      });
      i = (i + 1) % activities.length;
    }, 10000);
  });

  // Interaction handler
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  });

  // Log in to Discord
  if (!process.env.BOT_TOKEN) {
    console.error("Error: BOT_TOKEN is not defined in .env!");
    process.exit(1);
  }
  await client.login(process.env.BOT_TOKEN);
})();
