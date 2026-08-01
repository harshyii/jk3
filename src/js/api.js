let CACHE_VERSION = "v1.2", BASE_URL = "/dist/data";

// Helper for native IndexedDB caching
const IDB_CACHE = {
    dbName: "haryana_tools_db",
    storeName: "cache",
    
    openDB() {
        return new Promise((resolve, reject) => {
            let request = indexedDB.open(this.dbName, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                let db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    },

    async getItem(key) {
        let db = await this.openDB();
        return new Promise((resolve, reject) => {
            let transaction = db.transaction(this.storeName, "readonly");
            let store = transaction.objectStore(this.storeName);
            let request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    async setItem(key, value) {
        let db = await this.openDB();
        return new Promise((resolve, reject) => {
            let transaction = db.transaction(this.storeName, "readwrite");
            let store = transaction.objectStore(this.storeName);
            let request = store.put(value, key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    async removeItem(key) {
        let db = await this.openDB();
        return new Promise((resolve, reject) => {
            let transaction = db.transaction(this.storeName, "readwrite");
            let store = transaction.objectStore(this.storeName);
            let request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    },

    async keys() {
        let db = await this.openDB();
        return new Promise((resolve, reject) => {
            let transaction = db.transaction(this.storeName, "readonly");
            let store = transaction.objectStore(this.storeName);
            let request = store.getAllKeys();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
};

export const API = {
    async fetchData(t) {
        let a = `haryana_tools_${CACHE_VERSION}_${t}`;
        
        // 1. Check IndexedDB cache
        try {
            let e = await IDB_CACHE.getItem(a);
            if (e) return e;
        } catch (err) {
            console.warn(`Cache read error for ${t}:`, err);
        }

        // 2. Fetch from network if not cached
        try {
            let r = t.startsWith("/") ? t.slice(1) : t;
            let s = await fetch(`${BASE_URL}/${r}`);
            if (!s.ok) throw Error(`API Fetch failed: ${s.status} for ${t}`);
            
            let o = await s.json();
            
            // 3. Save to IndexedDB (handles large datasets easily)
            await IDB_CACHE.setItem(a, o);
            return o;
        } catch (c) {
            console.error(`API Error fetching ${t}:`, c);
            return null;
        }
    },

    async getCatalog() {
        return await this.fetchData("catalog.json");
    },

    async getProduct(t) {
        if (!t) throw Error("No SKU provided");
        let a = t.toString().trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
        return await this.fetchData(`products/${a}.json`);
    },

    async getBlogs() {
        return await this.fetchData("blogs.json");
    },

    async getBlog(t) {
        return await this.fetchData(`blogs/${t.toString().trim()}.json`);
    },

    async getSearchIndex() {
        return await this.fetchData("search.json");
    },

    async clearCache() {
        try {
            let keys = await IDB_CACHE.keys();
            await Promise.all(
                keys.map(t => {
                    if (t.startsWith("haryana_tools_")) {
                        return IDB_CACHE.removeItem(t);
                    }
                })
            );
            // Fallback clear for old localStorage artifacts
            Object.keys(localStorage).forEach(t => {
                if (t.startsWith("haryana_tools_")) localStorage.removeItem(t);
            });
        } catch (err) {
            console.error("Error clearing cache:", err);
        }
    }
};

window.API = API;