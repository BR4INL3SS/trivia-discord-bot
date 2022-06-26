import { REST } from "@discordjs/rest";
import dotenv from "dotenv";
import fs from "fs";
import { discordClient } from "./utils/discord";
import {
  Routes,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v9";
import { SlashCommandBuilder } from "@discordjs/builders";
import path from "path";
import { CacheType, Interaction } from "discord.js";
import { startTrivia } from "./commands/trivia";
import { getLeaderboards } from "./commands/triviaLeaderboards";

dotenv.config();

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((file) => file.endsWith(".ts"));

for (const file of commandFiles) {
  const command: {
    default: SlashCommandBuilder;
  } = require(`./commands/${file}`);
  commands.push(command["default"].toJSON());
}

// Place your client and guild ids here
const clientId = process.env.CLIENT_ID || "";
const guildId = process.env.GUILD_ID || "";

const commandPrefix = "br4!";

discordClient.on("ready", async () => {
  console.info("BR4 BOT v2 is up and running!");

  const rest = new REST({ version: "9" }).setToken(
    process.env.DISCORD_TOKEN || ""
  );

  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
});

discordClient.on(
  "interactionCreate",
  async (interaction: Interaction<CacheType>) => {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
      case "trivia":
        return await startTrivia(interaction, interaction.options);
      case "trivia_leaderboards":
        return await getLeaderboards(interaction);

      default:
        break;
    }
  }
);

discordClient.login(process.env.DISCORD_TOKEN);
