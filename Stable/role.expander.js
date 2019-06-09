/***
Expander creep. Goals:
1) Claim controller
2) Mine energy 
3) Build spawn

Repeat steps 2-3 until spawn complete
***/
// Constant
const HOMEBASE = 'W8N3';
const USERNAME = 'hidden0';
var expanderCreep = {
	/** @param {Creep} creep object **/
	run: function(creep) {
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
        else
        {
        	homeRoom = creep.memory.homeRoom;
        }
	    // What is the target?
	    if(creep.memory.targetRoom==null)
	    {
	        if(Game.rooms[HOMEBASE].memory.targetRoom!=null)
	        {
	            creep.memory.targetRoom=Game.rooms[HOMEBASE].memory.targetRoom;
	            creep.memory.targetAction=Game.rooms[HOMEBASE].memory.targetAction;
	        }
	        else
	        {
	            creep.memory.targetRoom=null;
	            goIdle();
	        }
	    }
	    if(creep.memory.targetRoom==creep.room.name)
	    {
            // Step 1 - claim if using claim flag, otherwise use reserve action
    		if(creep.room.controller.owner!=USERNAME) {
    			if(creep.memory.targetAction=="claim")
    			{
    			    console.log(creep.claimController(creep.room.controller))
	                if(creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
	                	var moveResult = creep.moveTo(creep.room.controller);
	                	console.log("Neat")
	                    if(moveResult!=OK)
	                    {
	                    	if(moveResult==ERR_NO_PATH)
	                    	{
	                    		// Move a direction a few times
	                    		creep.move(LEFT);
	                    	}
	                    }
	                }
           		}
           		else
           		{
           			if(creep.reserveController(creep.room.controller) == ERR_NOT_IN_RANGE) {
	                	var moveResult = creep.moveTo(creep.room.controller);
	                    if(moveResult!=OK)
	                    {
	                    	if(moveResult==ERR_NO_PATH)
	                    	{
	                    		// Move a direction a few times
	                    		creep.move(LEFT);
	                    	}
	                    }
	                }
           		}
           		if(creep.room.controller.owner==USERNAME)
           		{
           		    Game.rooms[creep.memory.homeRoom].memory.targetRoom=null;
           		    Game.rooms[creep.memory.homeRoom].memory.targetAction=null;
           		}
           		var borderCheck = checkPerim(creep.pos);
				if(borderCheck!=-10)
		        {
		            creep.move(borderCheck); 
		        }
            }        
	    }
	    // otherwise move to the room
	    else
	    {
	    	var borderCheck = checkPerim(creep.pos);
			if(borderCheck!=-10)
	        {
	            creep.move(borderCheck); 
	        }
	        else
	        {
	        	creep.moveTo(new RoomPosition(37, 37, creep.memory.targetRoom));
	        }
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
			if(flagName.includes("expander") && Game.flags[flagName].pos.roomName==myCreep.room.name)
			{
				myCreep.memory.idleFlag=flagName;
				break;
			}
		}
	}
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
        else if(cPos.x==49)
        {
            return LEFT;
        }
    }
    else
    {
        return -10;
    }
}