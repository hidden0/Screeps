var roleExpansion = {
    /** Claim and guard until death **/
    /** @param {Creep} creep **/
    run: function(creep) {
        // What room am I going to?
        if(creep.memory.controllerClaim!=null)
        {
            var roomN = creep.memory.controllerClaim;
            
            console.log(creep.claimController(creep.room.controller));
            if(creep.claimController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.findExitTo(roomN));
            }
        }
        // Otherwise just chill
	}
};

module.exports = roleExpansion;