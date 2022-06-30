# Discord Trivia Bot

Wholesome Dsicord bot for your trivia games in your servers 

## Table of Contents

  - [Features](#features)
  - [Installing](#installing)
  - [Usage](#usage)
  - [Resources](#resources)
  - [License](#license)

## Features

There will be more features in the future but for new here are the features:
- Trivia Games on your server and saved to a mongodb database
- Trivia leaderboards using prisma aggregations

## Installing

Clone the repo:

```bash
$ git clone https://github.com/BR4INL3SS/trivia-discord-bot.git
```

Install dependencies:

```bash
$ npm install
# or
$ yarn # recommended
```

Generate Prisma types:

```bash
$ npx prisma generate
```

Add environment variables:

```bash
# .env

DISCORD_CLIENT_TOKEN= # Discord bot token

CLIENT_ID = # Discord bot client ID

DATABASE_URL= # YOUR DATABASE URL HERE
```

Deploy commands to your bot pnpm:

```bash
$ yarn run commands
```

Start your bot:

```bash
# In dev mode

$ yarn dev

# In production mode

$ yarn build && yarn start 

```

## Usage

- Add a command:

```ts
/*
 * src/commands/yournewcommand.ts
*/

export default new SlashCommandBuilder()
  .setName("mycommand")
  .setDescription("Add command description here")
  .addStringOption((option) =>
    option
      .setName("parameter")
      .setDescription("add parameter description here")
      .setRequired(true)
      .addChoices([{ name: 'option 1', value: '1' }])
  )

/*
 * src/bot.ts
*/

discordClient.on(
  "interactionCreate",
  async (interaction: Interaction<CacheType>) => {
    if (!interaction.isCommand()) return;

    switch (interaction.commandName) {
      // ...other commands

      case: 'mycommand':
        return await interaction.reply({
            content: 'My command response'
        })

      default:
        break;
    }
  }
);


```


## Resources

* [Trivia database](https://opentdb.com)
* [Discord.js](https://discord.js.org/#/)
* [Discord.js Guide ](https://discordjs.guide/)
<!-- * [Contributing Guide](https://github.com/axios/axios/blob/master/CONTRIBUTING.md)
* [Code of Conduct](https://github.com/axios/axios/blob/master/CODE_OF_CONDUCT.md) -->
## License

[MIT](LICENSE)