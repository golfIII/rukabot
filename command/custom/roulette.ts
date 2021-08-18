import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

import { Bot } from '../../global.ts'

Bot.globalCommands.commands.add({
    command: 'roulette',
    usage: `${Bot.prefix}.roulette`,
    description: 'Kicks a random user from the voice channel you\'re in',
    execute: async (msg: Discordeno.DiscordenoMessage, _tokens: string[]) => {

        // Check if user is on cooldown - TODO

        // Check if bot has permissions
        const hasPerms = await Discordeno.hasGuildPermissions(msg.guildId, Discordeno.botId, ['VIEW_CHANNEL', 'MOVE_MEMBERS'])
        if(!hasPerms) {
            await Bot.replyTextEmbed(msg, ':x: I don\'t have permissions to disconnect or view the channel that you\'re in!')
            return
        }

        // Get the guild, automatically try both cache and api if cache fails
        const guild = Discordeno.cache.guilds.get(msg.guildId) || await Discordeno.getGuild(msg.guildId)

        // Attempt to get the voice data (may not exist)
        const memberVoiceData = guild.voiceStates.get(msg.authorId)

        // Handle the case in which the voice data doesn't exist
        if(!memberVoiceData || !memberVoiceData.channelId) {
            await Bot.replyTextEmbed(msg, ':x: You aren\'t in a voice channel!')
            return
        }

        const channel = Discordeno.cache.channels.get(memberVoiceData.channelId) || await Discordeno.getChannel(memberVoiceData.channelId)

        const noBots = channel.connectedMembers?.filter((val: Discordeno.DiscordenoMember | undefined, _key: bigint): boolean => {
            if(val) 
                return !val.bot
            else
                return false
        })

        if(!noBots) {
            await Bot.replyTextEmbed(msg, ':x: Couldn\'t find members')
            return
        }

        const chosen = noBots?.random()
        console.log(chosen)

        if(!chosen) {
            await Bot.replyTextEmbed(msg, ':x: Couldn\'t find members')
            return
        }

        await Discordeno.disconnectMember(msg.guildId, chosen.id)

        await Bot.replyTextEmbed(msg, `:poop: <@${msg.authorId}> kicked <@${chosen.id}>`)
    }
})
