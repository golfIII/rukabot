import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Bot } from '../../global.ts'

Bot.globalCommands.commands.add({
    command: 'ping',
    usage: `${Bot.prefix}.ping`,
    description: 'Test command',
    execute: (msg: Discordeno.DiscordenoMessage, _tokens: string[]) => {
        Bot.replyTextEmbed(msg, 'pong!')
    }
})