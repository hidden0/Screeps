// Constant
const HOMEBASE = 'W18S15';
const USERNAME = 'hidden0';
var pilgrimCreep = {
    /** @param {Creep} creep
        Pilgrim will build in a new room
    **/
    run: function(creep) {
        var homeRoom = HOMEBASE;
        var spawnCon = creep.room.find(FIND_CONSTRUCTION_SITES);
        var sources = creep.room.find(FIND_SOURCES);
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
        var reuseVal = 5;
        // Tell the creep what to do based on the action value, if null figure out what state to
        if(creep.memory.targetRoom==null || creep.memory.targetRoom=="none")
	    {
	        if(Game.rooms[homeRoom].memory.targetRoom!=null)
	        {
	            creep.memory.targetRoom=Game.rooms[homeRoom].memory.targetRoom;
	        }
	        else
	        {
	            creep.memory.targetRoom=null;
	            goIdle();
	        }
	    }
	    if(creep.memory.targetRoom==creep.room.name)
	    {
	        if(creep.pos.x==0 || creep.pos.x==49 || creep.pos.y==0 || creep.pos.y==49)
	        {
	            if(creep.pos.y==0)
	            {
	                creep.move(BOTTOM);   
	            }
	            else if(creep.pos.x==0)
	            {
	                creep.move(RIGHT);
	            }
	            else if(creep.pos.y==49)
	            {
	                creep.move(TOP);
	            }
	            else if(creep.pos.x=49)
	            {
	                creep.move(LEFT);
	            }
	        }
	        var spawnsInRoom = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType == STRUCTURE_SPAWN)
            }
            });
            if(!spawnCon.length && spawnsInRoom.length && creep.carry.energy>0)
            {
                dumpEnergy(creep);
            }
            else if(!spawnCon.length && spawnsInRoom.length)
            {
                creep.memory.role="localMiner";
                creep.memory.homeRoom=creep.room.name;
                creep.memory.source=creep.memory.mySource;
            }
	        // Find and build the spawn, mine source if need be
	        
	        if(creep.memory.full==null || creep.memory.full==false)
	        {
	            // Get energy
	            // Random roll on sources
	            var sourceInt = 0;
	            if(creep.memory.mySource==null)
	            {
    	            if(sources.length>1)
                    {
                          var min = Math.ceil(0);
                          var max = Math.floor(1);
                          var value = Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
                          creep.memory.mySource=sources[value].id;
    	            }
    	            else
    	            {
    	                creep.memory.mySource=sources[0].id;
                        sourceInt = sources[0].id;
    	            }
	            }
                else
                {
                    sourceInt = creep.memory.mySource;
    	            if(creep.harvest(Game.getObjectById(sourceInt)) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(Game.getObjectById(sourceInt));
                    }
                    if(creep.carry.energy==creep.carryCapacity)
                    {
                        creep.memory.full=true;
                    }
                }
	        }
	        else
	        {
	            // Build spawn
	            if(creep.build(spawnCon[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawnCon[0]);
                }
                if(creep.carry.energy==0)
                {
                    creep.memory.full=false;
                }
	        }
	    }
	    // otherwise move to the room
	    else
	    {
	        creep.moveTo(new RoomPosition(37, 37, creep.memory.targetRoom));
	    }
    }
};

module.exports = pilgrimCreep;

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
// goIdle(creep): Nothing to do so chill at flag or default positions.
// *TODO* This needs to be unique to a room, so prefixing the name with the room name would be ideal.
function goIdle(myCreep)
{
    // if a flag is already set, don't loop for it
    if(myCreep.memory.idleFlag!=null)
    {
        if(myCreep.moveTo(Game.flags[myCreep.memory.idleFlag])==ERR_INVALID_TARGET)
        {
            myCreep.memory.idleFlag=null;
        }
    }
    // Otherwise, see if a flag is in the room
    else
    {
        for (var flagName in Game.flags)
        {
            if(flagName.includes("pilgrim") && Game.flags[flagName].pos.roomName==myCreep.room.name)
            {
                myCreep.memory.idleFlag=flagName;
                break;
            }
        }
    }
    // unset room
    creep.memory.targetRoom = null;
}
