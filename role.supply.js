var roleSupplier = {
    /** Goal of this creep is to distribute energy effectively **/
    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log("Creep: "+creep.name + " Building: " + creep.memory.building + " Cur Energy: " + creep.carry.energy + " Capacity: " + creep.carryCapacity + " Home Spawn Energy: " + Game.spawns['Home'].energy);
        // Are there energy laden containers/storage, and empty extensions/towers/spawn/anything? Fill them!
        /* Methodology here
            1) Do we have energy?
            - yes/no
            2) Does anything *need* energy?
            - yes/no
            
            3) If 1==yes, and 2==yes, move energy to it
        */
        // Find all storage available
        var enContainer = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.structureType == STRUCTURE_CONTAINER) && 
                (i.store[RESOURCE_ENERGY] < i.storeCapacity)
        });
        var enStorage = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.structureType == STRUCTURE_STORAGE) &&
                (i.store[RESOURCE_ENERGY] < i.storeCapacity)
        });
        var enSpawn = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.energy < i.energyCapacity) &&
                (i.structureType == STRUCTURE_SPAWN)
        });
        
        // Find all energy targets
        var dstTower = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.energy < i.energyCapacity) &&
                (i.structureType == STRUCTURE_TOWER)
        });
        var dstExtension = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.energy < i.energyCapacity) &&
                (i.structureType == STRUCTURE_EXTENSION)
        });
        
        // Energy should be sourced from largest storage point at the time
        var energySource = enStorage;
        var largestFound = enStorage[0].energy;
        
        // Loop through containers
        var i = 0;
        while (i<enContainer.length)
        {
            if(enContainer[i].store[RESOURCE_ENERGY] > largestFound)
            {
                // A container is the largest
                energySource = container[i];
                largestFound = container[i].store[RESOURCE_ENERGY];
            }
            i++;
        }
        console.log(largestFound.energy);
        // Logic for delivery
        if(energySource.energy > 0)
        {
            // Check for a destination
            if(dstTower.length>0)
            {
                // Send to a tower first
                var result = creep.transfer(dstTower[0],RESOURCE_ENERGY,creep.energy);
                if(result != OK && result != ERR_NOT_IN_RANGE)
                {
                    console.log(result);
                }
                else
                {
                    creep.moveTo(dstTower[0]);
                }
            }
            // Otherwise fill extensions
            else if(dstExtension.length>0)
            {
                var result = creep.transfer(dstExtension[0],RESOURCE_ENERGY,creep.energy);
                if(result != OK && result != ERR_NOT_IN_RANGE)
                {
                    //console.log(result);
                }
                else
                {
                    creep.moveTo(dstExtension[0]);
                }
            }
            else
            {
                creep.moveTo((Game.spawns['Spawn1'].pos.x-3), Game.spawns['Spawn1'].pos.y-3);
            }
        }
        else
        {
            creep.moveTo((Game.spawns['Spawn1'].pos.x-3), Game.spawns['Spawn1'].pos.y-3);
        }
    }
};

module.exports = roleSupplier;