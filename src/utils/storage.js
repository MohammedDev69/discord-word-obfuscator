const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

class Storage {
    constructor(fileName, defaultValue = {}) {
        this.filePath = path.join(dataDir, fileName);
        this.data = this.load(defaultValue);
    }

    load(defaultValue) {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (err) {
            console.error(`[Storage] Failed to read ${this.filePath}:`, err.message);
        }
        this.save(defaultValue);
        return defaultValue;
    }

    save(data = this.data) {
        try {
            this.data = data;
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (err) {
            console.error(`[Storage] Failed to save ${this.filePath}:`, err.message);
        }
    }

    get(key, fallback = null) {
        return this.data[key] !== undefined ? this.data[key] : fallback;
    }

    set(key, value) {
        this.data[key] = value;
        this.save();
    }

    delete(key) {
        if (key in this.data) {
            delete this.data[key];
            this.save();
        }
    }

    all() {
        return this.data;
    }
}

const warningsStorage = new Storage('warnings.json', {});

module.exports = {
    Storage,
    warningsStorage
};
