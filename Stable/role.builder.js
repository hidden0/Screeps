var roleBuilder = {
    /** @param {Creep} creep
        @Description: To maintain the hive. The builder ensures all buildings are constructed, and walls maintained.

        Logic Flow / States (priority by number with 1 being highest priority)
            - 1) Wall upkeep. The spawn will hold a value for wallStr in memory, and this should be the
                minimum wall strength of all walls in the current room. Maintain this first!
                creep.memory.action = 'walls';
            - 2) Constructions sites. The builder, if not busy with walls, will build construction sites if they exist.
                creep.memory.action = 'sites';
            - 3) Chill out at the builder flag (idle mode). Just be ready for scenario 1 or 2.
                creep.memory.action = 'idle';
    **/
    run: function(creep) {
        // Tell the creep what to do based on the action value, if null figure out what state to
        var homeRoom = null;
        if(creep.memory.homeRoom==null)
        {
            for(var spawnP in Game.spawns)
            {
                if(Game.spawns[spawnP].room.name==creep.room.name)
                {
                    creep.memory.homeRoom=Game.spawns[spawnP].room.name;
                    break;
                }
            }
        }
        switch(creep.memory.action)
        {
            // Creep is building sites
            case 'sites':
                buildSites(creep);
                break;
            // Creep is chilling out
            case 'idle':
                goIdle(creep);
                break;
            // Creep doesn't have a state set (either new creep or previous job done). State manage
            default:
                setState(creep);
                break;
        }
    }
};

module.exports = roleBuilder;
function mapDistance(creep, target)
{
    var distanceCounter = 0;
    var spawn_xPos = creep.pos.x;
    var spawn_yPos = creep.pos.y;
    var i=0;
    // Find the distance via pythagorean theorem to this source

    var source_xPos = target.pos.x;
    var source_yPos = target.pos.y;
    var x_1 = 0;
    var x_2 = 0;
    var y_1 = 0;
    var y_2 = 0;
    if(spawn_xPos > source_xPos)
    {
        x_2 = spawn_xPos;
        x_1 = source_xPos;
    }
    else
    {
        x_1 = spawn_xPos;
        x_2 = source_xPos;
    }
    if(spawn_yPos > source_yPos)
    {
        y_2 = spawn_yPos;
        y_1 = source_yPos;
    }
    else
    {
        y_1 = spawn_yPos;
        y_2 = source_yPos;
    }
    var xCalc = ((x_2-x_1)*(x_2-x_1));
    var yCalc = ((y_2-y_1)*(y_2-y_1));

    var distance = Math.sqrt(xCalc+yCalc);

    return distance;
}
// Methods region
function dumpEnergy(creep)
{
    var reUsePath = 4;
    var extensions = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION) &&
                    structure.energy < (structure.energyCapacity);
            }
    });
    var fullExtensions = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_EXTENSION) &&
                    structure.energy == (structure.energyCapacity);
            }
    });
    var spawnsInRoom = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_SPAWN) &&
                    structure.energy < (structure.energyCapacity);
            }
    });
    var containersWithRoom = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_CONTAINER) &&
                    structure.store[RESOURCE_ENERGY] < (structure.storeCapacity);
            }
    });
    var storageCont = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => i.structureType == STRUCTURE_STORAGE && 
                       i.store[RESOURCE_ENERGY] < i.storeCapacity
    });

    if(creep.memory.distantRoom!=null && creep.room.name!=creep.memory.homeRoom)
    {
        // Go home first

        creep.moveTo(new RoomPosition(37,37,creep.memory.homeRoom));
    }
    else
    {
        if(storageCont.length>0 && fullExtensions.length>10)
        {
            if(creep.transfer(storageCont[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(storageCont[0]);
            }
        }
        else
        {
            if(extensions.length > 0) {
                // Fill extensions first to prioritize creep spawning
                // TAKE TO CLOSEST
                // Now that energy storage is identified, loop through the array to find the closest energy storage
                var i=0;
                var winner_index=0;
                var lowest=null;
                var dist=0;

                while(i<extensions.length)
                {
                    dist = mapDistance(creep,extensions[i]);
                    //console.log("Container["+i+"] distance: " + dist);
                    if(lowest==null)
                    {
                        lowest=dist;
                    }
                    else if(dist<lowest)
                    {
                        lowest=dist;
                        winner_index=i;
                    }
                    i++;
                }
                if(creep.transfer(extensions[winner_index], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(extensions[winner_index], {reusePath: reUsePath});
                }
            }
            else if(spawnsInRoom.length>0)
            {
                if(creep.transfer(spawnsInRoom[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawnsInRoom[0]);
                }
            }
            // Extensions/spawns are full, find containers
            else if(containersWithRoom.length>0)
            {
                if(creep.transfer(containersWithRoom[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(containersWithRoom[0]);
                }
            }
            else
            {
                // At least we could dump some of it? Go back to mining...
                if(creep.carry.energy==0)
                {
                    creep.memory.full=false;
                }
                else
                {
                    // We'd only be here if energy is 100% full and there is just no where to dump its
                    goIdle(creep);
                }
            }
        }
        // Did we manage to empty energy?
        if(creep.carry.energy==0)
        {
            creep.memory.full=false;
        }
    }
}
// buildSites(creep): No walls to be built, so build sites if they exist.
function buildSites(creep)
{
    var targetSite;
    var constructionSites = null; // Assume no sites every tick
    var building = null;
    if(Game.rooms[creep.memory.homeRoom].memory.energyReserveMode==true)
    {
        creep.memory.action='idle';
        return;
    }
    if(creep.memory.building!=null)
    {
        building = creep.memory.building;
    }
    
    // Do we have energy for the creep?
    if(creep.carry.energy == 0 && creep.memory.building==false)
    {
        // Go get some!
        getEnergy(creep);
    }
    // If we do have energy, great! Build sites
    else
    {
        // Energy obtained, set "building" to true until we can't
        creep.memory.building=true;
        // Does the creep have a target already?
        if(creep.memory.targetSite!=null)
        {
            // Repair the wall to the necessary strength
            targetSite = Game.getObjectById(creep.memory.targetSite);
            var output = creep.build(targetSite);
            if(output == ERR_NOT_IN_RANGE)
            {
                creep.moveTo(targetSite);
            }
            else if(output == ERR_NOT_ENOUGH_ENERGY)
            {
                creep.memory.building=false; // resets need for energy
            }
            else if (output == ERR_INVALID_TARGET) 
            {
                creep.memory.targetSite=null
                creep.memory.building=false;
            }
            
        }
        // Creep doesn't have a target, so find the closest one and keep it in memory
        else
        {
            // Find all walls and store them in memory
            constructionSites = creep.room.find(FIND_CONSTRUCTION_SITES)
            // Set the target
            if(constructionSites.length)
            {
                creep.memory.targetSite = constructionSites[0].id;
            }
            else
            {
                if(creep.carry.energy>0)
                {
                    dumpEnergy(creep);
                }
                else
                {
                    creep.memory.targetSite=null
                    creep.memory.building=false;
                    creep.memory.action=null;
                }
            }
        }
    }
}
// goIdle(creep): Nothing to do so chill at flag or default positions.
// *TODO* This needs to be unique to a room, so prefixing the name with the room name would be ideal.
function goIdle(myCreep)
{
    var reusePathVal = 3;
    // if a flag is already set, don't loop for it
    if(myCreep.memory.idleFlag!=null)
    {
        if(myCreep.moveTo(Game.flags[myCreep.memory.idleFlag], {reusePath: reusePathVal})==ERR_INVALID_TARGET)
        {
            myCreep.memory.idleFlag=null;
        }
    }
    // Otherwise, see if a flag is in the room
    else
    {
        for (var flagName in Game.flags)
        {
            if(flagName.includes("builder") && Game.flags[flagName].pos.roomName==myCreep.room.name)
            {
                myCreep.memory.idleFlag=flagName;
                break;
            }
        }
    }
    if(myCreep.carry.energy>0)
    {
        dumpEnergy(myCreep);
    }
    myCreep.memory.action=null;
}
// setState(creep): Figure out what state the creep should be in now.
function setState(creep)
{
    if(Game.rooms[creep.memory.homeRoom].memory.energyReserveMode!=null)
    {
        if(Game.rooms[creep.memory.homeRoom].memory.energyReserveMode==false)
        {
            var sites = creep.room.find(FIND_CONSTRUCTION_SITES);
            // Is action set?
            if(creep.memory.action==null || creep.memory.action=='idle')
            {
                var spawnEnergy = creep.room.find(FIND_STRUCTURES, {
                    filter: (i) => ((i.structureType==STRUCTURE_SPAWN))});
                if(spawnEnergy.length)
                {
                    // What should this creep do right now?
                    if(sites.length>0 && spawnEnergy[0].energy>100)
                    {
                        creep.memory.action='sites';
                    }
                    else
                    {
                        creep.memory.action='idle';
                    }
                }
                else
                {
                    creep.memory.action='sites';
                }
            }
            // Should the action be unset?
            else
            {
                if(creep.memory.action!='idle')
                {
                    if(sites.length <= 0 && creep.memory.action=='sites')
                    {
                        creep.memory.action=null;
                    }
                    else
                    {
                        if((walls.length || sites.length) && creep.memory.action=='idle')
                        {
                            creep.memory.action=null;
                        }
                    }
                }
            }
        }
        else
        {
            goIdle(creep);
        }
    }
}
// getEnergy(creep): Logic for obtaining energy.
function getEnergy(creep)
{
    /*
        Energy logic: Find the closest energy containing item and use it
    */
    var creepEnergy = creep.carry.energy;
    var creepCapacity = creep.carry.capacity;
    var withdrawE = creepCapacity - creepEnergy;
    var containers = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_CONTAINER)
            && i.store['energy'] > 100)
    });
    var primaryEnergy = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_STORAGE)
            && i.store['energy'] > 1500)
    });
    var backupEnergy = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_SPAWN)
            && i.energy > 50)
    });
    if(primaryEnergy.length>0)
    {
        if(creep.withdraw(primaryEnergy[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(primaryEnergy[0]);
        }
    }
    else if(containers.length>0)
    {
        if(creep.withdraw(containers[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(containers[0]);
        }
    }
    else if(backupEnergy.length>0)
    {
        if(creep.withdraw(backupEnergy[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(backupEnergy[0]);
        }
    }
}