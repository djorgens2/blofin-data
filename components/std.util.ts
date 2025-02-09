export const SplitSymbol = (Symbol: string): string[] => {

    const symbols: string[] = Symbol.split('-');

    if (symbols.length === 1) {
        symbols.push('USDT');
    }
    return symbols;
}
