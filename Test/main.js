/* Philosophy as it develops */
/*** 

Energy accumulation and appropriate distribution are critical. 
Pros and cons from previous coding engagement below...

Pros:
- Population control
- Creep management by role (via for loop)
- State management, however it could use some heavy revamping
- - Cache everything
- - do it until your done! none of this hit it and revert to idle shit
- Automation over time in terms of scaling up based on controller/energy available
- - This included some structure automation, which would be nice

Cons:
- Nothing was cached, and CPU usage was high
- Function cost was never considered (CPU)
- Deprecated code, need to use better pathing systems

To improve:
- Update code for latest release
- Use more static data, don't try to be dynamic for *everything*
- Add attack code

ToDO:
1) Create a mining role.

The miner should be capable of being assigned a source ID for its entire lifetime
no need to switch to a new source


***/

// Creep Roles

// 
// Primary game loop
module.exports.loop = function () {

};