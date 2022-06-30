import dotenv from 'dotenv';
import fs from 'fs';
import { discordClient } from './utils/discord';
import {
  RESTPostAPIApplicationCommandsJSONBody
} from 'discord-api-types/v9';
import { SlashCommandBuilder } from '@discordjs/builders';
import path from 'path';
import { CacheType, Interaction } from 'discord.js';
import { startTrivia } from './commands/trivia';
import { getLeaderboards } from './commands/triviaLeaderboards';

dotenv.config();

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter((file) => file.endsWith('.ts'));

for (const file of commandFiles) {
  const command: {
    default: SlashCommandBuilder;
  } = require(`./commands/${file}`);
  commands.push(command.default.toJSON());
}

discordClient.on('ready', async (client) => {
  console.info(`${client.user.tag} is up and running!`);
});

discordClient.on(
  'interactionCreate',
  async (interaction: Interaction<CacheType>) => {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
      case 'trivia':
        return await startTrivia(interaction, interaction.options);
      case 'trivia_leaderboards':
        return await getLeaderboards(interaction);

      default:
        break;
    }
  }
);

discordClient.login(process.env.DISCORD_TOKEN);
