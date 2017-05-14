/***
Expander creep. Goals:
1) Claim controller
2) Mine energy 
3) Build spawn

Repeat steps 2-3 until spawn complete
***/

var expanderCreep = {
	/** @param {Creep} creep object **/
	run: function(creep) {
	    // What is the target?
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
	        // Step 1 - claim
    		if(creep.room.controller && creep.room.controller.owner!="hidden0") {
                if(creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller);
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
module.exports = expanderCreep;

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
			if(flagName.includes("expander"))
			{
				myCreep.memory.idleFlag=flagName;
				break;
			}
		}
	}
}