/* vim: set et sta bs=2 sw=4 :*/
(function(){

function TKB() {
    /* cometClient object */
    this.comet = null;

    /* data from server */
    this.roomMapVersion = -1;
    this.occupationVersion = -1;
    this.roomMap = {};
    this.occupation = {};

    /* cached processed data from the server: */
    this.rroomMap = {};         /* pc to room look-up-table */
    this.roomToDom = {};        /* room to DOM element l.u.t. */
    this.rooms = [];            /* list of rooms */
    this.maxPcsPerRoom = 1;     /* maximum number of PCs per room */

    /* message type to handler function map */
    this.msg_map = {
        'welcome': this.msg_welcome,
        'occupation': this.msg_occupation,
        'roomMap': this.msg_roomMap,
        'occupation_update': this.msg_occupation_update};
}

/* initialize cometClient */
TKB.prototype.setup_comet = function() {
    var that = this;
    /* TODO we should not hardcode this */
    this.comet = new joyceCometClient({'host': 'westerbaan.name'})
    this.channel = this.comet.create_channel({
        'message': function(msg) {
            var t = msg.type;
            if(t in that.msg_map)
                that.msg_map[t].call(that, msg);
            else
                console.warn(["I don't know how to handle", msg])
        }});
};

TKB.prototype.run = function() {
    this.setup_comet();
};

TKB.prototype.msg_welcome = function(msg) {
    /* TODO check msg.protocols and error on incompatible version  */
};

TKB.prototype.msg_occupation = function(msg) {
    /* We received a completely new occupation; store ... */
    this.occupation = msg.occupation;
    this.occupationVersion = msg.version;
    /* ... and refresh UI */
    this.ui_update_rooms(this.rooms);
};

TKB.prototype.msg_occupation_update = function(msg) {
    /* We received updates to the occupation.  Check if we missed some
     * updates in between. */
    if(msg.version != this.occupationVersion + 1) {
        log.warn('Apparently we missed some updates; resynching');
        this.comet.send_message('get_occupation');
        return;
    }
    /* Store ... */
    this.occupationVersion++;
    var roomSet = {};   /* set of rooms with pc's occ. changed */
    var rooms = [];     /* list of rooms with pc's occ. changed */
    for (var pc in msg.update) {
        var room = this.rroomMap[pc];
        if(!roomSet[room]) {
            roomSet[room] = true;
            rooms.push(room);
        }
        this.occupation[pc] = msg.update[pc];
    }
    /* ... and update affected rooms in the UI */
    this.ui_update_rooms(rooms);
};

TKB.prototype.msg_roomMap = function(msg) {
    var that = this;
    /* We received a new pc to room map; store ... */
    this.roomMap = msg.roomMap;
    this.roomMapVersion = msg.version;
    /* ... update metadata ... */
    this.rroomMap = {};
    this.rooms = [];
    this.maxPcsPerRoom = 1;
    for (var room in this.roomMap) {
        this.rooms.push(room);
        this.maxPcsPerRoom = Math.max(this.maxPcsPerRoom,
                                      this.roomMap[room].length);
        for (var i = 0; i < this.roomMap[room].length; i++)
            this.rroomMap[this.roomMap[room][i]] = room; 
    }
    this.rooms.sort(function(x,y) {
        return that.roomMap[y].length -  that.roomMap[x].length;
    });
    /* ... and update UI. */
    this.ui_refresh_rooms(this.rooms);
};

TKB.prototype.ui_refresh_rooms = function() {
    /* Refreshes list of rooms: clears all DOM elements and create new. */
    this.roomToDom = {};
    $('#list').empty();
    for (var i = 0; i < this.rooms.length; i++) {
        var room = this.rooms[i];
        var el = $("<div><div class='wf' /><div class='lf' />"+
                        "<div class='f' /><div class='u' />"+
                        "<div class='o' /><div class='wu' />"+
                        "<div class='wx' /><div class='lu' />"+
                        "<div class='lx' /><div class='x' />"+
                        "<div class='name'>"+room+"</div></div>");
        this.roomToDom[room] = el;
        $('#list').append(el);
    }
    /* Fill new DOM elements. */
    this.ui_update_rooms(this.rooms);
};

TKB.prototype.ui_update_rooms = function(rooms) {
    /* Update given rooms */
    for (var i = 0; i < rooms.length; i++) {
        var room = rooms[i];
        var el = this.roomToDom[room];
        /* calculate usage */
        var lut = {'wf': 0, 'lf': 0, 'o': 0, 'wu': 0, 'wx': 0, 'lu': 0,
                            'lx': 0, 'x': 0};
        for (var j = 0; j < this.roomMap[room].length; j++) {
            var key = this.occupation[this.roomMap[room][j]];
            lut[key]++;
        }
        var free = lut.wf + lut.lf + lut.o;
        var used = lut.wu + lut.wx + lut.lu + lut.lx + lut.x;
        var tick = 100.0 / this.maxPcsPerRoom;
        /* move and update elements */
        el.find('.f').animate({'width': (tick * free) + '%'});
        el.find('.u').animate({'width': (tick * used) + '%',
                               'left': (tick * free) + '%'});
        var left = 0.0;
        var states = ['wf', 'lf', 'o', 'wu', 'wx', 'lu', 'lx', 'x'];
        for  (var s = 0; s < states.length; s++) {
            var state = states[s];
            el.find('.'+state).animate({'width': (tick * lut[state]) + '%',
                                        'left': (tick * left) + '%'});
            left += lut[state];
        }
    }
};

$(document).ready(function(){
    tkb = new TKB();
    tkb.run();
});

})();
