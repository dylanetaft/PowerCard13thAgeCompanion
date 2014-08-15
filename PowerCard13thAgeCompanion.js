on("chat:message", function (msg) {
    if (msg.type != "api") return;
    
    // Get the API Chat Command
    var isGM = (msg.who.indexOf("GM") > -1); //is the speaker a GM?
    msg.who = msg.who.replace(" (GM)", "");
    msg.content = msg.content.replace("(GM) ", "");
    var commands = msg.content.split(" ", 2);

    if (commands[0] == "!help") {
        sendChat("","!recharge - recharge daily powers with recharge dies");
        sendChat("","!recharge all - recover all daily abilities, and recoveries");
        sendChat("", "!recharge encounter - recharge all encounter powers");
        sendChat("", "!recharge overworld - only for those who have overworld advantage - if unspecified recharge die on daily power is 16");
        sendChat("","!recover x - spend x amount of recoveries");
        
    }
	else if (commands[0] == "!recharge") 
    {
        if (commands.length > 1 && commands[1].toLowerCase() == "encounter") rechargePowers(msg.who, "Encounter", isGM);
        else if (commands.length > 1 && commands[1].toLowerCase() == "overworld") rechargePowers(msg.who, "Overworld", isGM);
        else if (commands.length > 1 && commands[1].toLowerCase() == "all") rechargePowers(msg.who, "all", isGM);
        else rechargePowers(msg.who, "Recharge Die", isGM);
        
	}
    
    else if (commands[0] == "!recover" && commands.length > 1) 
    {
        characterRecovery(msg.who, commands[1]);
    }
    
    else if (commands[0] == "!power") 
    {
        var powercard = readPowerCard(msg.content);   
        usePower(msg.who, powercard);
        
        /*
        if (powercard.name.toLowerCase() == "rally") { //spend a surge
             if (powercard.name !== null) {
                characterRecovery(msg.who);
            }       
        }
        */
    }
});

function getCharacterAttribute(who, charid, aname) {
    var attributes = findObjs({
       _type: "attribute",    
       _characterid: charid,
       name:aname,
    });
    if (attributes.length != 1) { //not necessarily an error
        return null;        
    }
    return attributes[0];
}

function getCharacterByWho(who) {
    var characters = findObjs({
        _type: "character",
        name: who,
    });    
    if (characters.length != 1) {
        sendChat("","Error - duplicate character sheets, or no character sheet found for the name " + who);  
        return null;
    }    
    return characters[0];
}

function characterRecovery(who, recoveries) { //13th age stuff
    
    recoveries = parseInt(recoveries);
    if (isNaN(recoveries)) recoveries = 0;
    
    var character = getCharacterByWho(who);
    if (character === null) return;
    var cid = character.get("_id");
    
    var rdie = getCharacterAttribute(who,cid,"RDtype");
    var con = getCharacterAttribute(who,cid,"CON");
    var chp = getCharacterAttribute(who, cid,"HP");
    var level = getCharacterAttribute(who, cid,"level");
    var crecoveries = getCharacterAttribute(who,cid,"Recoveries");
    if (con == null || rdie === null || recoveries === null || chp === null || level === null) return;
    
    var rdiev = parseInt(rdie.get("current").replace(new RegExp("[^0-9]","g"),"")); //strip out letters
    if (isNaN(rdiev)) rdiev = 0;
    
    var rcon = parseInt(con.get("current"));
    if (isNaN(rcon)) rcon = 0;
    var rconmod = Math.floor((rcon-10)/2);
    
    
    var levelv = parseInt(level.get("current"));
    if (isNaN(levelv)) levelv = 0;
    
    var rollsmade = "";
    var totalhprecov = 0;
    for (var count=0;count<levelv;count++) {
        var rnum = randomInteger(rdiev);
        rollsmade += "" + rnum + " ";
        totalhprecov += rnum;
    }
    totalhprecov += rconmod;
    
    var hpv = parseInt(chp.get("current"));
    var mhp = parseInt(chp.get("max"));
    var crec = parseInt(crecoveries.get("current"));
    if (isNaN(crec)) crec = 0;
    if (isNaN(hpv)) hpv = 0;
    if (isNaN(mhp)) mhp = 0;
    var nhp = (hpv + totalhprecov);
    if (nhp > mhp) nhp = mhp;
    
    if (crec < recoveries) { //cant heal
        sendChat(who,"You are out of recoveries...'");
    }
    else
    {
        sendChat(who,"I attempt a recovery and roll " + rollsmade + " and recover " + totalhprecov + " hp.  My hp was " + hpv +" and is now " + nhp + ". I spend " + recoveries + " recovery(s).")
        chp.set("current",nhp);
        crecoveries.set("current",crec - recoveries);
    }
    
    
}

function usePower(who, powercard) { //dylan
    if (powercard.name === undefined) return; 
    var usage = powercard.usage;
    if (usage === undefined) usage = "";
    var pc_recoveries_str = powercard.Recoveries;
    if (pc_recoveries_str === undefined) pc_recoveries_str = "";
    var pc_recoveries = parseInt(pc_recoveries_str);
    
    var character = getCharacterByWho(who);
    if (character === null) return;
    var cid = character.get("_id");
    var abilities = findObjs({
        _type: "ability",
        _characterid: cid,
    });
        
    
    if (usage.toLowerCase() == "encounter" || usage.toLowerCase() == "daily") //reduce use count
    {
        var uses = getCharacterAttribute(who,character.get("_id"),"" + "pt_uses_" + powercard.name); //power use counter
        var useval = undefined;
        if (uses !== null) useval = parseInt(uses.get("current"));
        
        if (useval > 0 || isNaN(useval)) { //use power if it's a one time deal or it has multiple uses remaining
           if (!isNaN(useval)) useval--;
           for (var acounter=0;acounter<abilities.length;acounter++) {
        
                action = abilities[acounter].get("action");
                if (action.substring(0,6) == "!power" && action.toLowerCase().indexOf("--name|" + powercard.name.toLowerCase()) != -1) {
                    if (isNaN(useval) || useval <= 0) abilities[acounter].set("istokenaction",false);
                }            
            }  
            
            if (!isNaN(useval)) uses.set("current",useval); //only set it if it actually exists
        }
        else 
        {
            sendChat(who,"I can't do whatever I just did since I have no uses left for " + powercard.name);
            return; //exit function
        }
    }
    
    if (!isNaN(pc_recoveries)) //spend some recoveries
    {
        var crecoveries = getCharacterAttribute(who, cid,"Recoveries");
        if (crecoveries !== null) 
        {
            vrecoveries = parseInt(crecoveries.get("current"));
            if (!isNaN(vrecoveries)) 
            {
                if (vrecoveries < pc_recoveries) //not enough recoveries 
                {
                    sendChat(who,"I can't do what I just did - not enough recoveries");
                }
                else
                {
                    crecoveries.set("current",vrecoveries - pc_recoveries); //decrement recoveries
                }
            }
        }
    }    

}

function rechargePowers(who, rtype, isGM) { 
    var characters = new Array();

    if (!isGM) //not a gm, only recover self
    {
        characters.push(getCharacterByWho(who));
        if (character === null) return;
    }
    else {
        log("you're a GM");
        var tokens = findObjs({
            _type: "graphic",
            _subtype: "token",
            _pageid: Campaign().get("playerpageid"),    
        });            
        for (var count = 0;count < tokens.length;count++) {
            var charid = tokens[count].get("represents");
            if (charid != "") {
                var character = getObj("character",charid);
                characters.push(character);
            }
        }
        
    }
    
    for (var charcounter = 0;charcounter < characters.length;charcounter++)
    {
       
        var character = characters[charcounter];
        var abilities = findObjs({
            _type: "ability",
            _characterid: character.get("_id"),
        });

        for (var acounter=0;acounter<abilities.length;acounter++) {
            action = abilities[acounter].get("action").toLowerCase();
            if (action.substring(0,6) == "!power" && abilities[acounter].get("istokenaction") != true) { // this might be a power to recharge
                var powercard = readPowerCard(abilities[acounter].get("action"));    
                if ( powercard.hasOwnProperty("usage") && powercard.usage == "Daily" && ((rtype == "Recharge Die" && powercard.hasOwnProperty("Recharge Die")) || rtype == "Overworld")) {
                    var rdie = 21;
                    if (powercard.hasOwnProperty("Recharge Die")) rdie = parseInt(powercard["Recharge Die"]);
                    if (rtype == "Overworld" && rdie > 16) rdie = 16;
    
                    
                    var myroll = randomInteger(20);
                    
                    if (myroll >= rdie) {
                        sendChat(character.get("name"), "I rolled a " + myroll + " and succesfully recharged " + powercard.name + "!");
                        abilities[acounter].set("istokenaction",true);
                        resetPowerCardUses(character.get("name"),character.get("_id"), powercard.name);
                    }
                    else {
                         sendChat(character.get("name"), "I rolled a " + myroll + " and failed to recharge " + powercard.name + "!");
                    }
                }
                else if ((rtype == "Encounter") && powercard.hasOwnProperty("usage") && powercard.usage == "Encounter")
                {
                    abilities[acounter].set("istokenaction",true);
                    sendChat(character.get("name"), "The encounter ended and I have recharged " + powercard.name + "!"); 
                    resetPowerCardUses(character.get("name"),character.get("_id"), powercard.name);
                }
                else if (rtype == "all" && powercard.hasOwnProperty("usage") && (powercard.usage == "Encounter" || powercard.usage == "Daily")) {
                    abilities[acounter].set("istokenaction",true);
                    sendChat(character.get("name"), "I'm recharging " + powercard.name + "!"); 
                    resetPowerCardUses(character.get("name"),character.get("_id"), powercard.name); 
                }
            }            
        }  
        
        if (rtype == "all") {
            var crecoveries = getCharacterAttribute(character.get("name"), character.get("_id"),"Recoveries");
            if (crecoveries !== null) 
            {
                crecoveries.set("current",crecoveries.get("max"));
                sendChat(character.get("name"),"I'm resetting my recoveries");
            }   
            var chp = getCharacterAttribute(character.get("name"), character.get("_id"),"HP");
            if (chp !== null) 
            {
                chp.set("current",chp.get("max"));
                sendChat(character.get("name"),"I'm resetting my hp.");
            }       
            
        }
    }

}

function resetPowerCardUses(who, cid, powername) {
    var uses = getCharacterAttribute(who,cid,"" + "pt_uses_" + powername); //power use counter
    var usemaxval = undefined;
    if (uses !== null) usemaxval = parseInt(uses.get("max"));
    if (!isNaN(usemaxval)) { //reset power use counter to max
        uses.set("current",usemaxval);
    }             
}

function readPowerCard(msg) {
    	// DEFINE VARIABLES
	var n = msg.split(" --");
	var PowerCard = {};
	var DisplayCard = "";
	var NumberOfAttacks = 1;
	var NumberOfDmgRolls = 1;
    var NumberOfRolls = 1;
	var Tag = "";
	var Content = "";
    
	// CREATE POWERCARD OBJECT ARRAY
	var a = 1;
	while (n[a]) {
		Tag = n[a].substring(0, n[a].indexOf("|"));
		Content = n[a].substring(n[a].indexOf("|") + 1);
		if (Tag.substring(0, 6).toLowerCase() == "attack") {
			NumberOfAttacks = Tag.substring(6);
			if (NumberOfAttacks === 0 || !NumberOfAttacks) NumberOfAttacks = 1;
			Tag = "attack";
		}
		if (Tag.substring(0, 6).toLowerCase() == "damage") {
			NumberOfDmgRolls = Tag.substring(6);
			if (NumberOfDmgRolls === 0 || !NumberOfDmgRolls) NumberOfDmgRolls = 1;
			Tag = "damage";
		}
        if (Tag.substring(0, 9).toLowerCase() == "multiroll") {
            NumberOfRolls = Tag.substring(9);
			if (NumberOfRolls === 0 || !NumberOfRolls) NumberOfRolls = 1;
			Tag = "multiroll";
        }
		PowerCard[Tag] = Content;
		a++;
	}
    
    // ERROR CATCH FOR EMPTY EMOTE
    if (PowerCard.emote == "") PowerCard.emote = '" "';
    return PowerCard
}
