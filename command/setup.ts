import { DiscordenoMessage } from 'https://deno.land/x/discordeno@12.0.1/mod.ts'
import { CSet } from '../internal/cset.ts'
import { Bot } from '../global.ts'

interface BotCommand {
    command: string,
    usage: string,
    description: string,
    execute: (msg: DiscordenoMessage, tokens: string[]) => void
}

interface CommandHandler {
    commands: CSet<BotCommand>,
    buildCommand: (command: string) => string,
    handleCommand: (msg: DiscordenoMessage, cmd: BotCommand) => void
}

const BotCommands: CommandHandler = {
    commands: new CSet<BotCommand>((lhs: BotCommand, rhs: BotCommand) => { 
        return lhs.command == rhs.command
    }),

    // Small helper function
    buildCommand: function(command: string): string {
        return `${Bot.prefix}.${command}`
    },

    handleCommand: function(msg: DiscordenoMessage, cmd: BotCommand): void {
        if(!msg.content.toLowerCase().startsWith(
            this.buildCommand(cmd.command)
        )) {
            return
        }

        const tokens = msg.content.split(' ')
        tokens.shift()
        cmd.execute(msg, tokens)
    }
}

export { BotCommands }