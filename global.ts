import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Player, Node, UpdateVoiceStatus } from 'https://deno.land/x/lavadeno@3.2.0/mod.ts'

import { MessageCollectorHandler } from './collectors/message.ts'
import { ReactionCollectorHandler } from './collectors/reaction.ts'

import { BotCommands } from './command/setup.ts'

import { SongInfo } from './command/custom/music.ts'

const loadJsonFile = (path: string) => { return JSON.parse(Deno.readTextFileSync(path)) }

// Load all of the relevant JSON files
const cfg = loadJsonFile('./config.json')

const Bot = {
    // Collectors
    allMessageCollectors: new MessageCollectorHandler(),
    allReactionCollectors: new ReactionCollectorHandler(),

    // Bot specific properties
    token: cfg.token,
    prefix: cfg.commandInfo.prefix,
    color: Number(cfg.embedDefaults.color),
    globalCommands: BotCommands,

    // Music properties
    musicNode: new Node({
        connection: {
            host: '127.0.0.1',
            port: 2333,
            password: 'youshallnotpass',
        },

        sendGatewayPayload(_id: bigint, payload: UpdateVoiceStatus) {
            Discordeno.ws.sendShardMessage(0, payload)
        },

        userId: Discordeno.botId
    }),

    // Server players & queues
    guildPlayers: new Map<bigint, Player>(),
    guildCurrentTrack: new Map<bigint, SongInfo>(),
    guildQueues: new Map<bigint, SongInfo[]>(),

    // Helper methods
    sendTextEmbed: async (where: Discordeno.DiscordenoMessage, msg: string) => {
        await where.send({
            embeds: [{
                type: 'rich',
                color: Number(cfg.embedDefaults.color),
                description: msg
            }]
        })
    }, 
    replyTextEmbed: async (where: Discordeno.DiscordenoMessage, msg: string) => {
        await where.reply({
            embeds: [{
                type: 'rich',
                color: Number(cfg.embedDefaults.color),
                description: msg
            }]
        }, false)
    }
}

export { Bot }

