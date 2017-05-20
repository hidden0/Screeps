var pilgrimCreep = {
    /** @param {Creep} creep
        Pilgrim will build in a new room
    **/
    run: function(creep) {
        // Tell the creep what to do based on the action value, if null figure out what state to
        if(creep.memory.targetRoom==null)
	    {
	        if(Game.spawns['home'].memory.targetRoom!=null)
	        {
	            creep.memory.targetRoom=Game.spawns['home'].memory.targetRoom;
	        }
	        else
	        {
	            creep.memory.targetRoom="none";
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
	        
	        // Find and build the spawn, mine source if need be
	        var spawnCon = creep.room.find(FIND_CONSTRUCTION_SITES);
	        var sources = creep.room.find(FIND_SOURCES);
	        if(creep.memory.full==null || creep.memory.full==false)
	        {
	            // Get energy
	            if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(sources[0]);
                }
                else
                {
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
}
