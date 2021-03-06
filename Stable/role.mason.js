var roleMason = {
    /** @param {Creep} creep
        @Description: To maintain the hive. The builder ensures all buildings are constructed, and walls maintained.

        Logic Flow / States (priority by number with 1 being highest priority)
            - 1) Wall upkeep. The spawn will hold a value for wallStr in memory, and this should be the
                minimum wall strength of all walls in the current room. Maintain this first!
                creep.memory.action = 'walls';
    **/
    run: function(creep) {
        // Tell the creep what to do based on the action value, if null figure out what state to
    var reusePathVal = 20;
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
            // Creep is reinforcing ramparts
            case 'walls':
                reinforceRamparts(creep);
                break;
            // Creep is reinforcing ramparts
            case 'ramparts':
                reinforceRamparts(creep);
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

module.exports = roleMason;

// Methods region
var wallStr = 500; // default wall strength so nothing is ever at 1

function reinforceRamparts(creep)
{

    var walls;
    var targetWall; // The wall this creep is currently working on
    if(creep.memory.building!=null)
    {
        building = creep.memory.building;
    }
    /* Fix to make creps work multi-room */
    var roomSpawn = Game.rooms[creep.memory.homeRoom]; // <- this gun break ?
    if(roomSpawn.memory.wallStr!=null)
    {
        wallStr = roomSpawn.memory.wallStr;
    }
    // Do we have energy for the creep?
    if(creep.carry.energy == 0 && creep.memory.building==false)
    {
        // Go get some!
        getEnergy(creep);
    }
    // If we do have energy, great! Fix walls
    else
    {
        // Energy obtained, set "creep.memory.building" to true until we can't
        creep.memory.building=true;
        // Does the creep have a target already?
        if(creep.memory.targetWall!=null)
        {
            // Repair the wall to the necessary strength
            targetWall = Game.getObjectById(creep.memory.targetWall);
            var output = creep.repair(targetWall);
            if(output == ERR_NOT_IN_RANGE)
            {
                creep.moveTo(targetWall);
            }
            else if(output == ERR_NOT_ENOUGH_ENERGY)
            {
                creep.memory.building=false; // resets need for energy
            }
            else
            {
                // try constructing it?
                creep.build(targetWall);
            }
            // Remember to unset this target from memory when we hit our target strength
            if(!targetWall)
            {
                creep.memory.targetWall=null;
            }
            else
            {
                if(targetWall.hits >= wallStr)
                {
                    creep.memory.targetWall=null;
                }
            }
        }
        // Creep doesn't have a target, so find the closest one and keep it in memory
        else
        {
            // Find all RAMPARTS and store them in memory
            walls = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.hits < (wallStr) && i.structureType==STRUCTURE_RAMPART)
            });
            var wallsR = creep.room.find(FIND_STRUCTURES, {
                filter: (i) => (i.hits < (wallStr) && i.structureType==STRUCTURE_WALL)
            });
            var rampartSites = creep.room.find(FIND_CONSTRUCTION_SITES, {
                filter: (i) => (i.structureType==STRUCTURE_RAMPART)
            });
            // Were there any walls?
            if(walls.length>0)
            {
                // Set the target
                creep.memory.targetWall = walls[0].id;
            }
            else if(rampartSites.length)
            {
                // Set the target
                creep.memory.targetWall = rampartSites[0].id;
            }
            else if(wallsR.length)
            {
                // Set the target
                creep.memory.targetWall = wallsR[0].id;
            }
            // Otherwise, reset state check
            else
            {
                creep.memory.action=null;
            }
        }
    }
}

// goIdle(creep): Nothing to do so chill at flag or default positions.
// *TODO* This needs to be unique to a room, so prefixing the name with the room name would be ideal.
function goIdle(myCreep)
{
    var reusePathVal = 20;
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
    myCreep.memory.action=null;
}
// setState(creep): Figure out what state the creep should be in now.
function setState(creep)
{
    if(Game.rooms[creep.memory.homeRoom].memory.energyReserveMode!=null)
    {
        if(Game.rooms[creep.memory.homeRoom].memory.energyReserveMode==false)
        {
            var wallStr = 500
            if(Game.rooms[creep.memory.homeRoom].memory.wallStr!=null)
            {
                wallStr = Game.rooms[creep.memory.homeRoom].memory.wallStr;
            }
            var walls = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.hits < (wallStr) && i.structureType==STRUCTURE_WALL)
                });
            var ramparts = creep.room.find(FIND_STRUCTURES, {
            filter: (i) => (i.hits < (wallStr) && i.structureType==STRUCTURE_RAMPART)
                });
            // Is action set?
            if(creep.memory.action==null || creep.memory.action=='idle')
            {
                // What should this creep do right now?
                if(walls.length>0)
                {
                    creep.memory.action='walls';
                }
                else if(ramparts.length>0)
                {
                    creep.memory.action='ramparts';
                }
                else
                {
                    creep.memory.action='idle';
                }
            }
            // Should the action be unset?
            else
            {
                if(creep.memory.action!='idle')
                {
                    if(walls.length <= 0 && creep.memory.action=='walls')
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
    var energyStorage = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_SPAWN || i.structureType==STRUCTURE_CONTAINER || i.structureType==STRUCTURE_STORAGE)
            && i.energy > 0)
    });
    var primaryEnergy = creep.room.find(FIND_STRUCTURES, {
        filter: (i) => ((i.structureType==STRUCTURE_STORAGE)
            && i.store['energy'] > 2000)
    });
    if(primaryEnergy.length>0)
    {
        if(creep.withdraw(primaryEnergy[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(primaryEnergy[0]);
        }
    }
    else
    {
        if(creep.withdraw(energyStorage[0],RESOURCE_ENERGY,withdrawE) == ERR_NOT_IN_RANGE)
        {
            creep.moveTo(energyStorage[0]);
        }
    }
}