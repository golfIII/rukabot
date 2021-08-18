import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Bot } from '../../global.ts'

Bot.globalCommands.commands.add({
    command: 'baby',
    usage: `${Bot.prefix}.baby`,
    description: 'Troll your friends with this EPIC DaBaby (The Baby) command.',
    execute: (msg: Discordeno.DiscordenoMessage, _tokens: string[]) => {
        msg.reply({
            embeds: [{
                color: 0xfc50dd,
                title: 'Character Gacha',
                description: 'Roll Result\n**DaBaby [ζ]**',
                fields: [
                    {
                        name: 'Character Stats:',
                        value: ':heart: HP: She like\n:crossed_swords: ATK: how I\n:zap: MAG: smell\n:shield: PR: cologne.\n:fleur_de_lis: MR: Yeah\n:four_leaf_clover: Luck: Yeah'
                    },
                    {
                        name: 'Roll Type:',
                        value: 'Deezly'
                    }
                ],
                image: {
                    url: 'https://media.discordapp.net/attachments/303036180851851267/876691029267472444/unknown.png'
                }
            }]
        }, false)
    }
})