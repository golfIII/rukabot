// import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'
import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Bot } from '../../global.ts'

Bot.globalCommands.commands.add({
    command: 'help',
    usage: `${Bot.prefix}.help`,
    description: 'Shows all available commands',
    execute: async (msg: Discordeno.DiscordenoMessage, _tokens: string[]) => {
        // Build the embed fields
        const embedFields: Discordeno.EmbedField[] = []

        for(const command of Bot.globalCommands.commands) {
            embedFields.push({
                name: `\`${command.usage}\``,
                value: command.description
            })
        }

        await msg.reply({
            embeds: [{
                color: Bot.color,
                title: `${Bot.prefix}.help`,
                fields: embedFields
            }]
        }, false)
    }
})