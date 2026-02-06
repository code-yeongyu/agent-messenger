export async function parallelMap(items, fn, concurrency = 5) {
    const results = new Array(items.length);
    let currentIndex = 0;
    async function worker() {
        while (currentIndex < items.length) {
            const index = currentIndex++;
            results[index] = await fn(items[index], index);
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
//# sourceMappingURL=concurrency.js.map