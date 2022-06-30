import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v9';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main () {
  const clientId = process.env.CLIENT_ID;
  const discordToken = process.env.DISCORD_TOKEN;

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

  try {
    if (!clientId || !discordToken) { throw new Error('Client Id or discord Token not provided'); }

    const rest = new REST({ version: '9' }).setToken(discordToken);

    await rest.put(Routes.applicationCommands(clientId), { body: commands });
  } catch (error) {
    console.error(error);
  }
}

main()
  .then(() => console.info('Successfully deployed application (/) commands.'))
  .catch((e) => console.error(e));
