import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Bot } from '../../global.ts'

Bot.globalCommands.commands.add({
    command: 'COMMAND_HERE',
    usage: `${Bot.prefix}.COMMAND_HERE`,
    description: 'DESCRIPTION_HERE',
    execute: (_msg: Discordeno.DiscordenoMessage, _tokens: string[]) => {

    }
})

// REMEMBER TO IMPORT IN ALL.TS