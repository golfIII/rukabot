// Reaction collector

import * as Discordeno from 'https://deno.land/x/discordeno@12.0.1/mod.ts'

interface ReactionCollectorConfig {
    filter: (im: Discordeno.MessageReactionAdd) => boolean,
    onResolution: (collected: Partial<Discordeno.Emoji>[]) => void,
    max: number
}

class ReactionCollector {
    private genesisMsg: Discordeno.DiscordenoMessage

    private collected: Partial<Discordeno.Emoji>[]
    private cfg: ReactionCollectorConfig

    constructor(
        msg: Discordeno.DiscordenoMessage,
        cfg: ReactionCollectorConfig
    ) {

        this.genesisMsg = msg
        this.collected = []
        if(cfg.max < 1)
            throw new Error('Invalid maximum listening size')
        this.cfg = cfg
    }

    public onReactionAdd(reactionInfo: Discordeno.MessageReactionAdd): boolean {
        // check if the msg is the same, if the filter condition is met,
        // and if the reaction emoji is not null
        if(
            BigInt(reactionInfo.messageId) == this.genesisMsg.id
            && this.cfg.filter(reactionInfo)
            && reactionInfo.emoji
        ) {
            this.collected.push(reactionInfo.emoji)

            if(this.collected.length < this.cfg.max) {
                return false
            }
            else {
                this.cfg.onResolution(this.collected)
                return true
            }
        }

        return false

    }
}

class ReactionCollectorHandler {
    private collectors: ReactionCollector[]

    constructor() {
        this.collectors = []
    }

    public addCollector(col: ReactionCollector): number {
        this.collectors.push(col)
        return this.collectors.length - 1
    }

    public getCollector(idx: number): ReactionCollector | undefined {
        return this.collectors[idx]
    }

    public onUpdate(reaction: Discordeno.MessageReactionAdd) {
        for(const collector of this.collectors) {
            const isResolved = collector.onReactionAdd(reaction)

            if(isResolved)
                this.collectors.splice(this.collectors.indexOf(collector), 1)
        }
    }
}

export { ReactionCollector, ReactionCollectorHandler }