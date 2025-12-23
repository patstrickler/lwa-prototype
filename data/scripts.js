// Mock scripts storage (in-memory)
// This will store analysis scripts that can be applied to datasets

class ScriptsStore {
    constructor() {
        this.scripts = new Map();
        this.nextId = 1;
    }
    
    create(name, code, description) {
        const id = `script_${this.nextId++}`;
        const script = {
            id,
            name,
            code,
            description,
            createdAt: new Date().toISOString()
        };
        this.scripts.set(id, script);
        return script;
    }
    
    get(id) {
        return this.scripts.get(id);
    }
    
    getAll() {
        return Array.from(this.scripts.values());
    }
    
    delete(id) {
        return this.scripts.delete(id);
    }
}

export const scriptsStore = new ScriptsStore();

