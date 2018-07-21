/***
localMiner is built for simplicity. It will be assigned a sourceId and mine it for it's lifetime
It will return energy to the nearest storage source with available space.
If idle, it will find a flag on the room with the word "miner" in it.
***/

var localMinerCreep = {
    /** @param {Creep} creep object **/
    /** goal: mine source **/
    run: function(creep) {
        var reUsePath = 2;
        var sourceRoom = null;
        var remoteRoom = null;
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
        // Mine if assigned a source
        var borderCheck = checkPerim(creep.pos);
            if(borderCheck!=true)
            {
                creep.move(borderCheck);
            }
        if(creep.memory.source!=null && (creep.memory.full==false || creep.memory.full==null))
        {
            // Go idle to flag if source is empty
            if(Game.getObjectById(creep.memory.source)!=null)
            {
              if(Game.getObjectById(creep.memory.source).energy==0)
              {
                    goIdle(creep);
              }
            }
            // if it is in the room
            // otherwise move to the room
            if(creep.memory.distantRoom!=null)
            {
                remoteRoom = creep.memory.distantRoom;
            }
            if(remoteRoom!=null && creep.room.name!=remoteRoom)
            {
                var borderCheck = checkPerim(creep.pos);
                if(borderCheck!=true)
                {
                    creep.move(borderCheck);
                }
                else
                {
                    creep.moveTo(new RoomPosition(37,37,remoteRoom));
                }
            }
            // If it is in the room, mine the source defined
            else
            {
                if(creep.harvest(Game.getObjectById(creep.memory.source)) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(Game.getObjectById(creep.memory.source), {reusePath: reUsePath});
                }
                if(creep.carry.energy==creep.carryCapacity)
                {
                    creep.memory.full=true;
                }
            }
        }
        // Energy might be full, go dump it
        else if (creep.memory.full)
        {
            // Dump energy
            dumpEnergy(creep);
        }
        // The source may not be set
        else if(creep.memory.source==null)
        {
            var creepTier = 0;
            if(creep.room.memory.tier!=null)
            {
                creepTier = creep.room.memory.tier;
            }
            if(creepTier>=4 && creep.room.memory.localMinersMax==2)
            {
                if(creep.memory.source==null)
                {
                    var sourcesInRoom = creep.room.find(FIND_SOURCES);
                    if(creep.room.memory.sourceAssignment==null)
                    {
                        creep.room.memory.sourceAssignment = sourcesInRoom[0].id;
                        creep.memory.source=sourcesInRoom[0].id;
                    }
                    else
                    {
                        creep.memory.source=sourcesInRoom[1].id;
                        creep.room.memory.sourceAssignment=null;
                    }
                }
            }
        }
        // Otherwise find a flag containing "miner"
        else
        {
            goIdle(creep);
        }
    }
};
module.exports = localMinerCreep;

function checkPerim(cPos)
{
    if(cPos.x==0 || cPos.x==49 || cPos.y==0 || cPos.y==49)
    {
        if(cPos.y==0)
        {
            return BOTTOM;
        }
        else if(cPos.x==0)
        {
            return RIGHT;
        }
        else if(cPos.y==49)
        {
            return TOP;
        }
        else if(cPos.x=49)
        {
            return LEFT;
        }
    }
    else
    {
        return true;
    }
}
function dumpEnergy(creep)
{
    var reUsePath = 3;
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
        if(storageCont.length>0 && fullExtensions.length>15)
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
                    // We'd only be here if energy is 100% full and there is just no where to dump it
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
function goIdle(myCreep)
{
    var reUsePath = 3;
    // Dump any excess energy
    if(myCreep.carry.energy>0)
    {
        myCreep.memory.full=true;
    }
    // if a flag is already set, don't loop for it
    if(myCreep.memory.idleFlag!=null)
    {
        if(myCreep.moveTo(Game.flags[myCreep.memory.idleFlag], {reusePath: reUsePath})==ERR_INVALID_TARGET)
        {
            myCreep.memory.idleFlag=null;
        }
    }
    // Otherwise, see if a flag is in the room
    else
    {
        for (var flagName in Game.flags)
        {
            if(flagName.includes("miner") && Game.flags[flagName].pos.roomName==myCreep.room.name)
            {
                myCreep.memory.idleFlag=flagName;
                break;
            }
        }
    }
}
// Find a path to a given target
// Return the number of tiles you would have to move from the creeps current position to reach given target
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
function checkPerim(cPos)
{
    if(cPos.x==0 || cPos.x==49 || cPos.y==0 || cPos.y==49)
    {
        if(cPos.y==0)
        {
            return BOTTOM;
        }
        else if(cPos.x==0)
        {
            return RIGHT;
        }
        else if(cPos.y==49)
        {
            return TOP;
        }
        else if(cPos.x=49)
        {
            return LEFT;
        }
    }
    else
    {
        return true;
    }
}