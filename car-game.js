// car-game.js - Enhanced multi-map terrain system for ultra-realistic driving game
// Upload this file to: https://raw.githubusercontent.com/manywebby/manydots/refs/heads/main/car-game.js

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

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }

    noise(x, y, z) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = this.fade(x), v = this.fade(y), w = this.fade(z);
        const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

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
        let value = 0, amplitude = 1, frequency = scale, maxValue = 0;
        for(let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return value / maxValue;
    }
}

// Biome definitions
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
    RIVER: { name: 'River', color: 0x4169E1, height: -5 },
    VILLAGE: { name: 'Village', color: 0x8B7355, height: 3 },
    INDUSTRIAL: { name: 'Industrial', color: 0x555555, height: 2 },
    PARK: { name: 'Park', color: 0x32CD32, height: 2 },
    DESERT: { name: 'Desert', color: 0xF4E4BC, height: 0 }
};

// Traffic Light Controller
class TrafficLight {
    constructor(x, z, direction = 'north-south') {
        this.x = x;
        this.z = z;
        this.direction = direction;
        this.state = 'green'; // green, yellow, red
        this.timer = 0;
        this.greenTime = 15000; // 15 seconds
        this.yellowTime = 3000; // 3 seconds  
        this.redTime = 12000; // 12 seconds
    }

    update(deltaTime) {
        this.timer += deltaTime;
        
        switch(this.state) {
            case 'green':
                if (this.timer >= this.greenTime) {
                    this.state = 'yellow';
                    this.timer = 0;
                }
                break;
            case 'yellow':
                if (this.timer >= this.yellowTime) {
                    this.state = 'red';
                    this.timer = 0;
                }
                break;
            case 'red':
                if (this.timer >= this.redTime) {
                    this.state = 'green';
                    this.timer = 0;
                }
                break;
        }
    }

    getColor() {
        switch(this.state) {
            case 'green': return 0x00FF00;
            case 'yellow': return 0xFFFF00;
            case 'red': return 0xFF0000;
            default: return 0x00FF00;
        }
    }
}

// Train System
class Train {
    constructor(route, speed = 50) {
        this.route = route; // Array of {x, z} waypoints
        this.currentWaypoint = 0;
        this.position = { ...route[0] };
        this.speed = speed; // km/h
        this.length = 200; // meters
        this.direction = 0;
    }

    update(deltaTime) {
        if (this.route.length < 2) return;

        const target = this.route[this.currentWaypoint];
        const dx = target.x - this.position.x;
        const dz = target.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < 10) {
            this.currentWaypoint = (this.currentWaypoint + 1) % this.route.length;
            return;
        }

        const speedMS = (this.speed / 3.6) * deltaTime;
        this.direction = Math.atan2(dx, dz);
        
        this.position.x += Math.sin(this.direction) * speedMS;
        this.position.z += Math.cos(this.direction) * speedMS;
    }
}

// Map Configuration System
const MAP_CONFIGS = {
    'empty-fields': {
        name: 'Empty Fields',
        description: '10km × 10km peaceful countryside',
        worldSize: 10,
        chunkSize: 1000,
        memory: 'Low',
        features: ['Rolling hills', 'Scattered trees', 'Simple roads'],
        generateTerrain: function(chunkManager, chunkX, chunkZ) {
            return chunkManager.generateEmptyFields(chunkX, chunkZ);
        }
    },
    'megacity': {
        name: 'Megacity',
        description: '20km × 20km dense urban environment',
        worldSize: 20,
        chunkSize: 1000,
        memory: 'Medium',
        features: ['Dense buildings', 'Traffic lights', 'Complex road network', 'Skyscrapers'],
        generateTerrain: function(chunkManager, chunkX, chunkZ) {
            return chunkManager.generateMegacity(chunkX, chunkZ);
        }
    },
    'world': {
        name: 'Realistic World',
        description: '100km × 100km diverse world with everything',
        worldSize: 100,
        chunkSize: 1000,
        memory: 'High',
        features: ['Multiple biomes', 'Villages', 'Airports', 'Train system', 'Theme parks', 'Railway crossings'],
        generateTerrain: function(chunkManager, chunkX, chunkZ) {
            return chunkManager.generateRealisticWorld(chunkX, chunkZ);
        }
    }
};

// Enhanced Chunk Manager with multiple map support
class ChunkManager {
    constructor(mapType = 'empty-fields') {
        this.mapConfig = MAP_CONFIGS[mapType];
        this.chunks = new Map();
        this.loadedChunks = new Set();
        this.heightMap = new Map();
        this.noise = new ImprovedNoise();
        this.trafficLights = new Map();
        this.trains = [];
        this.villages = [];
        
        // Initialize based on map type
        this.CHUNK_SIZE = this.mapConfig.chunkSize;
        this.WORLD_SIZE = this.mapConfig.worldSize;
        this.TOTAL_CHUNKS = this.WORLD_SIZE * this.WORLD_SIZE;

        // Initialize trains for world map
        if (mapType === 'world') {
            this.initializeTrainSystem();
        }
    }

    initializeTrainSystem() {
        // Main railway line across the world
        const mainRoute = [];
        for (let x = -40000; x <= 40000; x += 1000) {
            mainRoute.push({ x, z: 0 });
        }
        this.trains.push(new Train(mainRoute, 80));

        // Cross railway
        const crossRoute = [];
        for (let z = -40000; z <= 40000; z += 1000) {
            crossRoute.push({ x: 0, z });
        }
        this.trains.push(new Train(crossRoute, 60));
    }

    updateTrains(deltaTime) {
        this.trains.forEach(train => train.update(deltaTime));
    }

    updateTrafficLights(deltaTime) {
        this.trafficLights.forEach(light => light.update(deltaTime));
    }

    getChunkKey(x, z) { return `${x},${z}`; }

    getCurrentChunk(position) {
        return {
            x: Math.floor(position.x / this.CHUNK_SIZE),
            z: Math.floor(position.z / this.CHUNK_SIZE)
        };
    }

    // Empty Fields Generation (10km x 10km, lightweight)
    generateEmptyFields(chunkX, chunkZ) {
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;
        
        const vertices = [];
        const heightData = [];
        
        // Simple height generation
        for (let i = 0; i < 65; i++) {
            for (let j = 0; j < 65; j++) {
                const x = centerX + (i / 64) * this.CHUNK_SIZE - this.CHUNK_SIZE / 2;
                const z = centerZ + (j / 64) * this.CHUNK_SIZE - this.CHUNK_SIZE / 2;
                
                // Gentle rolling hills
                const height = this.noise.octaveNoise(x * 0.001, 0, z * 0.001, 3, 0.5, 1) * 8;
                vertices.push(x, height, z);
                
                if (i % 8 === 0 && j % 8 === 0) {
                    heightData.push({ x, z, height });
                }
            }
        }

        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        this.heightMap.set(chunkKey, heightData);

        return {
            vertices,
            biome: BIOMES.PLAINS,
            heightData,
            objects: this.generateEmptyFieldsObjects(chunkX, chunkZ)
        };
    }

    generateEmptyFieldsObjects(chunkX, chunkZ) {
        const objects = [];
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;

        // Sparse trees
        for (let i = 0; i < 2; i++) {
            if (Math.random() > 0.5) {
                objects.push({
                    type: 'tree',
                    x: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerX,
                    z: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerZ,
                    scale: Math.random() * 0.3 + 0.7
                });
            }
        }

        // Simple road network
        if (Math.abs(chunkX) % 3 === 0 || Math.abs(chunkZ) % 3 === 0) {
            objects.push({
                type: 'road',
                x: centerX,
                z: centerZ,
                width: 12,
                length: this.CHUNK_SIZE,
                direction: Math.abs(chunkX) % 3 === 0 ? 'north-south' : 'east-west'
            });
        }

        return objects;
    }

    // Megacity Generation (20km x 20km, dense urban)
    generateMegacity(chunkX, chunkZ) {
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;
        
        const vertices = [];
        const heightData = [];
        
        // Flat urban terrain
        for (let i = 0; i < 129; i++) {
            for (let j = 0; j < 129; j++) {
                const x = centerX + (i / 128) * this.CHUNK_SIZE - this.CHUNK_SIZE / 2;
                const z = centerZ + (j / 128) * this.CHUNK_SIZE - this.CHUNK_SIZE / 2;
                
                const height = this.noise.octaveNoise(x * 0.0001, 0, z * 0.0001, 2, 0.3, 1) * 3;
                vertices.push(x, height, z);
                
                if (i % 4 === 0 && j % 4 === 0) {
                    heightData.push({ x, z, height });
                }
            }
        }

        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        this.heightMap.set(chunkKey, heightData);

        return {
            vertices,
            biome: BIOMES.CITY,
            heightData,
            objects: this.generateMegacityObjects(chunkX, chunkZ)
        };
    }

    generateMegacityObjects(chunkX, chunkZ) {
        const objects = [];
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;

        // Dense building grid
        for (let i = -4; i <= 4; i++) {
            for (let j = -4; j <= 4; j++) {
                const buildingX = centerX + i * 100;
                const buildingZ = centerZ + j * 100;
                
                // Skip road intersections
                if (Math.abs(i) % 2 !== 0 && Math.abs(j) % 2 !== 0) {
                    const height = Math.random() * 80 + 20;
                    objects.push({
                        type: 'building',
                        x: buildingX,
                        z: buildingZ,
                        height: height,
                        width: 80,
                        depth: 80
                    });
                }
            }
        }

        // Street grid with traffic lights
        for (let i = -5; i <= 5; i++) {
            // North-South roads
            objects.push({
                type: 'road',
                x: centerX + i * 100,
                z: centerZ,
                width: 20,
                length: this.CHUNK_SIZE,
                direction: 'north-south'
            });

            // East-West roads  
            objects.push({
                type: 'road',
                x: centerX,
                z: centerZ + i * 100,
                width: 20,
                length: this.CHUNK_SIZE,
                direction: 'east-west'
            });

            // Traffic lights at intersections
            for (let j = -5; j <= 5; j++) {
                const lightX = centerX + i * 100;
                const lightZ = centerZ + j * 100;
                const lightKey = `${Math.floor(lightX/100)},${Math.floor(lightZ/100)}`;
                
                if (!this.trafficLights.has(lightKey)) {
                    this.trafficLights.set(lightKey, new TrafficLight(lightX, lightZ));
                    objects.push({
                        type: 'trafficLight',
                        x: lightX,
                        z: lightZ,
                        key: lightKey
                    });
                }
            }
        }

        return objects;
    }

    // Realistic World Generation (100km x 100km, everything included)
    generateRealisticWorld(chunkX, chunkZ) {
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;
        
        const vertices = [];
        const heightData = [];
        
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

        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        this.heightMap.set(chunkKey, heightData);

        return {
            vertices,
            biome: this.getBiome(centerX, centerZ),
            heightData,
            objects: this.generateRealisticWorldObjects(chunkX, chunkZ)
        };
    }

    getBiome(x, z) {
        const continentNoise = this.noise.octaveNoise(x * 0.00005, 0, z * 0.00005, 4, 0.5, 1);
        const biomeNoise = this.noise.octaveNoise(x * 0.0002, 0, z * 0.0002, 3, 0.6, 1);
        const distanceFromCenter = Math.sqrt(x * x + z * z) / 1000;
        
        if (continentNoise < -0.4 || distanceFromCenter > 40) return BIOMES.OCEAN;
        if (continentNoise < -0.2) return BIOMES.BEACH;
        
        // Major cities
        if (distanceFromCenter < 8) return BIOMES.CITY;
        
        // Villages scattered around
        const villageNoise = this.noise.octaveNoise(x * 0.0001, 0, z * 0.0001, 2, 0.4, 1);
        if (villageNoise > 0.7 && distanceFromCenter > 10 && distanceFromCenter < 35) {
            return BIOMES.VILLAGE;
        }
        
        // Airports
        if (Math.abs(x - 15000) < 1000 && Math.abs(z - 15000) < 1000) return BIOMES.AIRPORT;
        if (Math.abs(x + 20000) < 1000 && Math.abs(z - 10000) < 1000) return BIOMES.AIRPORT;
        
        // Theme parks
        if (Math.abs(x - 8000) < 800 && Math.abs(z - 12000) < 800) return BIOMES.PARK;
        
        // Rivers
        const riverNoise = this.noise.octaveNoise(x * 0.0005, 0, z * 0.0003, 2, 0.5, 1);
        if (Math.abs(riverNoise) < 0.08 && continentNoise > -0.2) return BIOMES.RIVER;
        
        // Mountains and other biomes
        if (continentNoise > 0.4) return continentNoise > 0.6 ? BIOMES.SNOW : BIOMES.MOUNTAINS;
        if (biomeNoise > 0.3) return continentNoise > 0.2 ? BIOMES.HILLS : BIOMES.FOREST;
        if (biomeNoise < -0.3) return BIOMES.DESERT;
        
        return BIOMES.PLAINS;
    }

    getHeightAtWorldPosition(x, z) {
        let height = this.noise.octaveNoise(x * 0.0003, 0, z * 0.0003, 6, 0.6, 1) * 60;
        height += this.noise.octaveNoise(x * 0.0001, 0, z * 0.0001, 4, 0.5, 1) * 120;
        height += this.noise.octaveNoise(x * 0.001, 0, z * 0.001, 3, 0.4, 1) * 30;

        const biome = this.getBiome(x, z);
        if (biome === BIOMES.OCEAN) height = Math.min(height, -15);
        else if (biome === BIOMES.BEACH) height = Math.max(-3, Math.min(height, 3));
        else if (biome === BIOMES.RIVER) height = Math.min(height, -3);
        else if (biome === BIOMES.AIRPORT || biome === BIOMES.CITY) height = Math.max(0, Math.min(height, 8));
        else if (biome === BIOMES.VILLAGE) height = Math.max(2, Math.min(height, 15));

        return height;
    }

    generateRealisticWorldObjects(chunkX, chunkZ) {
        const objects = [];
        const centerX = chunkX * this.CHUNK_SIZE;
        const centerZ = chunkZ * this.CHUNK_SIZE;
        const biome = this.getBiome(centerX, centerZ);

        switch(biome) {
            case BIOMES.VILLAGE:
                objects.push(...this.generateVillage(centerX, centerZ));
                break;
            case BIOMES.CITY:
                objects.push(...this.generateMegacityObjects(chunkX, chunkZ));
                break;
            case BIOMES.AIRPORT:
                objects.push(...this.generateAirport(centerX, centerZ));
                break;
            case BIOMES.PARK:
                objects.push(...this.generateThemePark(centerX, centerZ));
                break;
            case BIOMES.FOREST:
                for (let i = 0; i < 25; i++) {
                    objects.push({
                        type: 'tree',
                        x: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerX,
                        z: (Math.random() - 0.5) * this.CHUNK_SIZE * 0.8 + centerZ,
                        scale: Math.random() * 0.6 + 0.8
                    });
                }
                break;
        }

        // Railway system
        if (Math.abs(centerX) < 100 || Math.abs(centerZ) < 100) {
            objects.push(...this.generateRailway(centerX, centerZ));
        }

        // Highway system
        objects.push(...this.generateHighways(centerX, centerZ));

        return objects;
    }

    generateVillage(centerX, centerZ) {
        const objects = [];
        
        // Village buildings
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const radius = Math.random() * 300 + 100;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            objects.push({
                type: 'house',
                x, z,
                height: Math.random() * 8 + 6,
                width: Math.random() * 15 + 20,
                depth: Math.random() * 15 + 20
            });
        }

        // Village center
        objects.push({
            type: 'fountain',
            x: centerX,
            z: centerZ
        });

        // Village roads
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            objects.push({
                type: 'road',
                x: centerX + Math.cos(angle) * 200,
                z: centerZ + Math.sin(angle) * 200,
                width: 8,
                length: 400,
                direction: i % 2 === 0 ? 'north-south' : 'east-west'
            });
        }

        return objects;
    }

    generateAirport(centerX, centerZ) {
        const objects = [];
        
        // Terminal building
        objects.push({
            type: 'terminal',
            x: centerX,
            z: centerZ,
            width: 200,
            height: 15,
            depth: 100
        });

        // Runways
        objects.push({
            type: 'runway',
            x: centerX + 300,
            z: centerZ,
            width: 50,
            length: 2000,
            direction: 'north-south'
        });

        objects.push({
            type: 'runway',
            x: centerX,
            z: centerZ + 400,
            width: 40,
            length: 1800,
            direction: 'east-west'
        });

        return objects;
    }

    generateThemePark(centerX, centerZ) {
        const objects = [];
        
        // Roller coaster
        objects.push({
            type: 'rollercoaster',
            x: centerX,
            z: centerZ,
            width: 200,
            height: 40,
            depth: 200
        });

        // Ferris wheel
        objects.push({
            type: 'ferriswheel',
            x: centerX + 300,
            z: centerZ + 300,
            height: 60,
            radius: 40
        });

        // Theme park buildings
        for (let i = 0; i < 10; i++) {
            objects.push({
                type: 'attraction',
                x: centerX + (Math.random() - 0.5) * 600,
                z: centerZ + (Math.random() - 0.5) * 600,
                height: Math.random() * 20 + 10,
                width: Math.random() * 30 + 20
            });
        }

        return objects;
    }

    generateRailway(centerX, centerZ) {
        const objects = [];
        
        // Railway tracks
        if (Math.abs(centerX) < 50) {
            objects.push({
                type: 'railway',
                x: centerX,
                z: centerZ,
                width: 4,
                length: this.CHUNK_SIZE,
                direction: 'north-south'
            });

            // Railway crossing
            if (Math.abs(centerZ) < 50) {
                objects.push({
                    type: 'railwayCrossing',
                    x: centerX,
                    z: centerZ
                });
            }
        }

        if (Math.abs(centerZ) < 50) {
            objects.push({
                type: 'railway',
                x: centerX,
                z: centerZ,
                width: 4,
                length: this.CHUNK_SIZE,
                direction: 'east-west'
            });
        }

        // Train stations
        const distanceFromCenter = Math.sqrt(centerX * centerX + centerZ * centerZ) / 1000;
        if (distanceFromCenter > 5 && distanceFromCenter < 40 && Math.abs(centerX) < 100 && Math.abs(centerZ) < 100) {
            if (Math.random() > 0.95) {
                objects.push({
                    type: 'trainStation',
                    x: centerX,
                    z: centerZ,
                    width: 60,
                    height: 12,
                    depth: 30
                });
            }
        }

        return objects;
    }

    generateHighways(centerX, centerZ) {
        const objects = [];
        const distanceFromCenter = Math.sqrt(centerX * centerX + centerZ * centerZ) / 1000;
        
        // Major highways
        if (distanceFromCenter > 8 && distanceFromCenter < 45) {
            if (Math.abs(centerX) < 100 || Math.abs(centerZ) < 100 || 
                Math.abs(centerX - centerZ) < 100 || Math.abs(centerX + centerZ) < 100) {
                objects.push({
                    type: 'highway',
                    x: centerX,
                    z: centerZ,
                    width: 25,
                    length: this.CHUNK_SIZE,
                    direction: Math.abs(centerX) < Math.abs(centerZ) ? 'north-south' : 'east-west'
                });
            }
        }

        return objects;
    }

    async loadChunk(chunkX, chunkZ) {
        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        
        if (this.loadedChunks.has(chunkKey)) {
            return this.chunks.get(chunkKey);
        }

        const terrainData = this.mapConfig.generateTerrain(this, chunkX, chunkZ);
        this.chunks.set(chunkKey, terrainData);
        this.loadedChunks.add(chunkKey);

        return terrainData;
    }

    getHeightAtPosition(x, z) {
        const chunkX = Math.floor(x / this.CHUNK_SIZE);
        const chunkZ = Math.floor(z / this.CHUNK_SIZE);
        const chunkKey = this.getChunkKey(chunkX, chunkZ);
        
        if (!this.heightMap.has(chunkKey)) return 0;

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

    getTrafficLightAt(x, z) {
        const key = `${Math.floor(x/100)},${Math.floor(z/100)}`;
        return this.trafficLights.get(key);
    }

    getNearbyTrains(x, z, radius = 1000) {
        return this.trains.filter(train => {
            const dx = train.position.x - x;
            const dz = train.position.z - z;
            return Math.sqrt(dx * dx + dz * dz) < radius;
        });
    }
}

// Time management system
class TimeManager {
    constructor() {
        this.gameTimeMinutes = 720;
        this.timeScale = 10;
        this.isDaytime = true;
        this.skyColor = { r: 0.53, g: 0.81, b: 0.92 };
    }

    update(deltaTime) {
        this.gameTimeMinutes += (deltaTime / 1000) * this.timeScale / 60;
        if (this.gameTimeMinutes >= 1440) this.gameTimeMinutes -= 1440;
        
        this.isDaytime = this.gameTimeMinutes >= 360 && this.gameTimeMinutes < 1080;
        this.skyColor = this.isDaytime ? 
            { r: 0.53, g: 0.81, b: 0.92 } : 
            { r: 0.1, g: 0.1, b: 0.3 };
    }

    getTimeString() {
        const hours = Math.floor(this.gameTimeMinutes / 60);
        const minutes = Math.floor(this.gameTimeMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
}

// Export system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChunkManager, BIOMES, ImprovedNoise, TimeManager, MAP_CONFIGS, TrafficLight, Train };
} else {
    window.TerrainEngine = { ChunkManager, BIOMES, ImprovedNoise, TimeManager, MAP_CONFIGS, TrafficLight, Train };
}
