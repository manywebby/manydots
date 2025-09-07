// car-game-terrain.js - Terrain generation module for ultra-realistic driving game
// Upload this file to: https://raw.githubusercontent.com/manywebby/manydots/refs/heads/main/car-game

// Enhanced noise function for procedural generation
class ImprovedNoise {
    constructor(seed = 12345) {
        this.seed = seed;
        this.p = [];
        this.permutation = [
            151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
            8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
            35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
            134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
            55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
            18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
            250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
            189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
            172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
            228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
            107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
            138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
        ];
        
        for(let i = 0; i < 256; i++) {
            this.p[256 + i] = this.p[i] = this.permutation[i];
        }
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }

    noise(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
                                                      this.grad(this.p[BA], x - 1, y, z)),
                                     this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                                                  this.grad(this.p[BB], x - 1, y - 1, z))),
                         this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                                                  this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                                     this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                                                  this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
    }

    octaveNoise(x, y, z, octaves, persistence, scale) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;

        for(let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return value / maxValue;
    }
}

// Biome definitions for realistic world generation
const BIOMES = {
    OCEAN: { name: 'Ocean', color: 0x006994, height: -20 },
    BEACH: { name: 'Beach', color: 0xF4A460, height: 0 },
    PLAINS: { name: 'Plains', color: 0x90EE90, height: 5 },
    FOREST: { name: 'Forest', color: 0x228B22, height: 10 },
    HILLS: { name: 'Hills', color: 0x8FBC8F, height: 25 },
    MOUNTAINS: { name: 'Mountains', color: 0x708090, height: 60 },
    SNOW: { name: 'Snow', color: 0xFFFAFA, height: 80 },
    CITY: { name: 'City', color: 0x696969, height: 8 },
    AIRPORT: { name: 'Airport', color: 0x333333, height: 5 },
    RIVER: { name: 'River', color: 0x4169E1, height: -5 }
};

// Enhanced Chunk Manager with realistic terrain generation
class ChunkManager {
    constructor() {
        this.chunks = new Map();
        this.loadedChunks = new Set();
        this.currentChunk = { x: 0, z: 0 };
        this.loadingQueue = [];
        this.isLoading = false;
        this.heightMap = new Map();
        this.roads = new Map();
        this.gasStationLocations = [];
        this.noise = new ImprovedNoise();
        
        // World constants
        this.CHUNK_SIZE = 1000; // 1km chunks
        this.WORLD_SIZE = 20; // 20km x 20km world
        this.RENDER_DISTANCE = 1;
        this.TOTAL_CHUNKS = 400; // 20x20 grid
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    getCurrentChunk(position) {
        return {
            x: Math.floor(position.x / this.CHUNK_SIZE),
            z: Math.floor(position.z / this.CHUNK_SIZE)
        };
    }

    getBiome(x, z) {
        const continentNoise = this.noise.octaveNoise(x * 0.0001, 0, z * 0.0001, 4, 0.5, 1);
        const biomeNoise = this.noise.octaveNoise(x * 0.0005, 0, z * 0.0005, 3, 0.6, 1);
        const distanceFromCenter = Math.sqrt(x * x + z * z) / 1000;
        
        if (continentNoise < -0.3 || distanceFromCenter > 8) {
            return BIOMES.OCEAN;
        }
        
        if (continentNoise < -0.1) {
            return BIOMES.BEACH;
        }
        
        if (distanceFromCenter < 5) {
            return BIOMES.CITY;
        }
        
        if (Math.abs(x - 6000) < 500 && Math.abs(z - 6000) < 500) {
            return BIOMES.AIRPORT;
        }
        
        const riverNoise = this.noise.octaveNoise(x * 0.001, 0, z * 0.0005, 2, 0.5, 1);
        if (Math.abs(riverNoise) < 0.1 && continentNoise > -0.1) {
            return BIOMES.RIVER;
        }
        
        if (continentNoise > 0.4) {
            return continentNoise > 0.6 ? BIOMES.SNOW : BIOMES.MOUNTAINS;
        }
        
        if (biomeNoise > 0.2) {
            return continentNoise > 0.2 ? BIOMES.HILLS : BIOMES.FOREST;
        }
        
        return BIOMES.PLAINS;
    }

    generateTerrain(chunkX, chunkZ) {
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;
        const biome = this.getBiome(centerX, centerZ);

        // Generate height map with multiple noise layers
        const heightData = [];
        const vertices = [];
        
        for (let i = 0; i < 129; i++) {
            for (let j = 0; j < 129; j++) {
                const x = centerX + (i / 128) * this.CHUNK_SIZE - this.CHUNK_SIZE / 2;
                const z = centerZ + (j / 128) * this.CHUNK_SIZE - this.CHUNK_SIZE / 2;
                
                const height = this.getHeightAtWorldPosition(x, z);
                vertices.push(x, height, z);
                
                if (i % 4 === 0 && j % 4 === 0) {
                    heightData.push({ x, z, height });
                }
            }
        }

        // Store height data for collision detection
        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        this.heightMap.set(chunkKey, heightData);

        return {
            vertices,
            biome,
            heightData,
            objects: this.generateObjects(chunkX, chunkZ, biome)
        };
    }

    getHeightAtWorldPosition(x, z) {
        let height = this.noise.octaveNoise(x * 0.0008, 0, z * 0.0008, 6, 0.6, 1) * 40;
        height += this.noise.octaveNoise(x * 0.0003, 0, z * 0.0003, 4, 0.5, 1) * 80;
        height += this.noise.octaveNoise(x * 0.002, 0, z * 0.002, 3, 0.4, 1) * 20;
        height += this.noise.octaveNoise(x * 0.01, 0, z * 0.01, 2, 0.3, 1) * 3;

        const biome = this.getBiome(x, z);
        if (biome === BIOMES.OCEAN) {
            height = Math.min(height, -10);
        } else if (biome === BIOMES.BEACH) {
            height = Math.max(-2, Math.min(height, 2));
        } else if (biome === BIOMES.RIVER) {
            height = Math.min(height, -2);
        } else if (biome === BIOMES.AIRPORT) {
            height = 0;
        } else if (biome === BIOMES.CITY) {
            height = Math.max(0, Math.min(height, 5));
        }

        return height;
    }

    generateObjects(chunkX, chunkZ, biome) {
        const objects = [];
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;

        switch(biome) {
            case BIOMES.FOREST:
                for (let i = 0; i < 15; i++) {
                    objects.push({
                        type: 'tree',
                        x: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerX,
                        z: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerZ,
                        scale: Math.random() * 0.5 + 0.8
                    });
                }
                break;

            case BIOMES.CITY:
                for (let i = 0; i < 20; i++) {
                    const x = (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerX;
                    const z = (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerZ;
                    
                    const nearRoad = (Math.abs(x - centerX) % 200 < 30) || (Math.abs(z - centerZ) % 200 < 30);
                    if (!nearRoad) {
                        objects.push({
                            type: 'building',
                            x,
                            z,
                            height: Math.random() * 30 + 10
                        });
                    }
                }
                break;

            case BIOMES.PLAINS:
                for (let i = 0; i < 3; i++) {
                    if (Math.random() > 0.7) {
                        objects.push({
                            type: 'tree',
                            x: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerX,
                            z: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerZ,
                            scale: Math.random() * 0.3 + 0.5
                        });
                    }
                }

                // Gas stations along highways
                const distanceFromCenter = Math.sqrt(centerX * centerX + centerZ * centerZ) / 1000;
                if (distanceFromCenter > 3 && distanceFromCenter < 8) {
                    if (Math.abs(centerX) < 100 || Math.abs(centerZ) < 100) {
                        if (Math.random() > 0.7) {
                            const gasStationX = centerX + (Math.random() - 0.5) * 200;
                            const gasStationZ = centerZ + (Math.random() - 0.5) * 200;
                            objects.push({
                                type: 'gasStation',
                                x: gasStationX,
                                z: gasStationZ
                            });
                            this.gasStationLocations.push({ x: gasStationX, z: gasStationZ });
                        }
                    }
                }
                break;
        }

        // Generate roads
        objects.push(...this.generateRoads(chunkX, chunkZ, biome));

        return objects;
    }

    generateRoads(chunkX, chunkZ, biome) {
        const roads = [];
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;
        
        if (biome === BIOMES.CITY) {
            // Grid road system for cities
            for (let i = -2; i <= 2; i++) {
                roads.push({
                    type: 'road',
                    x: centerX + i * 200,
                    z: centerZ,
                    width: 20,
                    length: this.CHUNK_SIZE,
                    direction: 'north-south'
                });
                
                roads.push({
                    type: 'road',
                    x: centerX,
                    z: centerZ + i * 200,
                    width: 20,
                    length: this.CHUNK_SIZE,
                    direction: 'east-west'
                });
            }
        }

        // Major highways
        const distanceFromCenter = Math.sqrt(centerX * centerX + centerZ * centerZ) / 1000;
        if (distanceFromCenter > 4 && distanceFromCenter < 9) {
            if (Math.abs(centerX) < 50 || Math.abs(centerZ) < 50) {
                roads.push({
                    type: 'highway',
                    x: centerX,
                    z: centerZ,
                    width: 15,
                    length: this.CHUNK_SIZE,
                    direction: Math.abs(centerX) < 50 ? 'north-south' : 'east-west'
                });
            }
        }

        return roads;
    }

    async loadChunk(chunkX, chunkZ) {
        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        
        if (this.loadedChunks.has(chunkKey)) {
            return this.chunks.get(chunkKey);
        }

        const terrainData = this.generateTerrain(chunkX, chunkZ);
        this.chunks.set(chunkKey, terrainData);
        this.loadedChunks.add(chunkKey);

        return terrainData;
    }

    getHeightAtPosition(x, z) {
        const chunkX = Math.floor(x / this.CHUNK_SIZE);
        const chunkZ = Math.floor(z / this.CHUNK_SIZE);
        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        
        if (!this.heightMap.has(chunkKey)) {
            return 0;
        }

        const heightData = this.heightMap.get(chunkKey);
        let closest = heightData[0];
        let minDistance = Infinity;

        for (const point of heightData) {
            const distance = Math.sqrt((point.x - x) ** 2 + (point.z - z) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                closest = point;
            }
        }

        return closest ? closest.height : 0;
    }
}

// Time management system
class TimeManager {
    constructor() {
        this.gameTimeMinutes = 720; // Start at 12:00 (720 minutes from midnight)
        this.timeScale = 10; // 10x faster than real time
        this.isDaytime = true;
        this.skyColor = { r: 0.53, g: 0.81, b: 0.92 }; // Sky blue
    }

    update(deltaTime) {
        this.gameTimeMinutes += (deltaTime / 1000) * this.timeScale / 60;
        
        if (this.gameTimeMinutes >= 1440) {
            this.gameTimeMinutes -= 1440; // Reset to 0 at midnight
        }
        
        this.isDaytime = this.gameTimeMinutes >= 360 && this.gameTimeMinutes < 1080; // 6 AM to 6 PM
        
        // Update sky color based on time
        if (this.isDaytime) {
            this.skyColor = { r: 0.53, g: 0.81, b: 0.92 }; // Day sky
        } else {
            this.skyColor = { r: 0.1, g: 0.1, b: 0.3 }; // Night sky
        }
    }

    getTimeString() {
        const hours = Math.floor(this.gameTimeMinutes / 60);
        const minutes = Math.floor(this.gameTimeMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}

// Export the terrain generation system
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { ChunkManager, BIOMES, ImprovedNoise, TimeManager };
} else {
    // Browser environment
    window.TerrainEngine = { ChunkManager, BIOMES, ImprovedNoise, TimeManager };
}
