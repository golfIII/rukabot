export class CSet<Type> {
    private data: Type[]
    private equality: (lhs: Type, rhs: Type) => boolean

    constructor(equality: (lhs: Type, rhs: Type) => boolean) {
        this.equality = equality
        this.data = []
    }

    public has(val: Type): boolean {
        for(const item of this.data) {
            if(this.equality(item, val))
                return true
        }
        return false
    }

    public add(val: Type) {
        if(!this.has(val))
            this.data.push(val)
    }

    public *[Symbol.iterator]() {
        for(const item of this.data)
            yield item
    }
}
