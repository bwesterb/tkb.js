/* vim: set et sta bs=2 sw=4 :*/
(function(){

function TKB() {
    /* cometClient object */
    this.comet = null;

    /* data from server */
    this.roomMapVersion = -1;
    this.occupationVersion = -1;
    this.scheduleVersion = -1;
    this.roomMap = {};
    this.occupation = {};
    this.schedule = {};

    /* cached processed data from the server: */
    this.rroomMap = {};         /* pc to room look-up-table */
    this.roomToDom = {};        /* room to DOM element l.u.t. */
    this.rooms = [];            /* list of rooms */
    this.maxPcsPerRoom = 1;     /* maximum number of PCs per room */

    /* other */
    this.schedTimeout = null;   /* timeout handle for schedule timeout */

    /* message type to handler function map */
    this.msg_map = {
        'welcome': this.msg_welcome,
        'occupation': this.msg_occupation,
        'roomMap': this.msg_roomMap,
        'schedule': this.msg_schedule,
        'occupation_update': this.msg_occupation_update};
}

/* initialize cometClient */
TKB.prototype.setup_comet = function() {
    var that = this;
    /* TODO we should not hardcode this */
    var cometConfig = {};
    if(tkbConfig.hasOwnProperty('host')) cometConfig.host = tkbConfig.host;
    if(tkbConfig.hasOwnProperty('port')) cometConfig.port = tkbConfig.port;
    this.comet = new joyceCometClient(cometConfig);
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

TKB.prototype.msg_schedule = function(msg) {
    /* We received a completely new schedule; store ... */
    this.schedule = msg.schedule;
    this.scheduleVersion = msg.version;
    /* ... and refresh UI */
    this.ui_update_schedule();
};

TKB.prototype.msg_occupation = function(msg) {
    /* We received a completely new occupation; store ... */
    this.occupation = msg.occupation;
    this.occupationVersion = msg.version;
    /* ... and refresh UI */
    this.ui_update_rooms(this.rooms, false);
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
    this.ui_update_rooms(rooms, true);
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
    $('#list > .rows').empty();
    var odd = true;
    for (var i = 0; i < this.rooms.length; i++) {
        var room = this.rooms[i];
        var odd_or_even = odd ? 'odd' : 'even';
        var el = $("<div class='"+odd_or_even+"'><div class='bar'><div>"+
                        "<div class='u'><div></div></div>"+
                        "<div class='f'><div></div></div>"+
                        "</div></div>"+
                        "<div class='name'>"+room+"</div>"+
                        "<div class='count'></div>"+
                        "<div class='sched'></div></div>");
        this.roomToDom[room] = el;
        $('#list > .rows').append(el);
        odd = !odd;
    }
    /* Fill new DOM elements. */
    this.ui_update_rooms(this.rooms, false);
};

TKB.prototype.ui_update_schedule = function() {
    var that = this;
    var current_date = new Date();
    var current_time = [current_date.getHours(), current_date.getSeconds()];
    /* compares two time pair.  A time pair (3,23) represents the time 3:23 */
    var timeLeq = function(x,y) {
        if (x[0] != y[0])
            return x[0] <= y[0];
        return x[1] <= y[1];
    };
    /* converts a time pair to a string */
    var timeToStr = function(x) {
        var minutes = x[1].toString();
        if (minutes.length == 1)
            minutes = '0' + minutes;
        return x[0] + ':' + minutes;
    };
    /* the minimal time at which we need to refresh the schedule */
    var min_crit_time = null;
    /* iterate over the rooms */
    for (var i = 0; i < this.rooms.length; i++) {
        var room = this.rooms[i];
        var sched = this.schedule[room];
        if (!sched) /* there are no courses scheduled */
            continue;
        /* find next or current course */
        var neigh = null;
        var neigh_is_now = null;
        for (var j = 0; j < sched.length; j++) {
            if (timeLeq(sched[j][0], current_time) &&
                    timeLeq(current_time, sched[j][1])) {
                neigh = sched[j];
                neigh_is_now = true;
                break;
            }
            if (timeLeq(current_time, sched[j][0]) &&
                    (neigh == null || timeLeq(sched[j][0], neigh))) {
                neigh = sched[j];
                neigh_is_now = false;
            }
        }
        /* create the text */
        var crit_time = null;
        if (neigh == null) {
            var txt = "";
            var klass = null;
        } else if (neigh_is_now) {
            var txt = "gereserveerd tot "+timeToStr(neigh[1]);
            var klass = 'resNow';
            crit_time = neigh[1];
        } else {
            var txt = "gereserveerd vanaf  "+timeToStr(neigh[0]);
            var klass = 'resLater';
            crit_time = neigh[0];
        }
        if(crit_time != null && (min_crit_time == null
                    || timeLeq(crit_time, min_crit_time)))
            min_crit_time = crit_time;
        /* set the text */
        this.roomToDom[room].find('.sched').text(txt);
        /* set class */
        var barInnerDiv = this.roomToDom[room].find('.bar > div');
        barInnerDiv.removeClass();
        if (klass)
            barInnerDiv.addClass(klass);
    }
    /* If there is a critical time coming up, set a timeout for it */
    if (min_crit_time == null)
        return;
    /* convert min_crit_time to Date object */
    var min_crit_time_date = new Date(current_date.getUTCFullYear(),
                            current_date.getMonth(), current_date.getDate(),
                                min_crit_time[0], min_crit_time[1]);
    if (this.schedTimeout != null)
        clearTimeout(this.schedTimeout);
    this.schedTimeout = setTimeout(
                    function() { that.ui_update_schedule(); },
                            min_crit_time_date - current_date);
};

TKB.prototype.ui_update_rooms = function(rooms, effects) {
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
        /* update .bar */
        var mod_f = {'width': (tick * free) + '%'};
        var mod_u = {'width': (tick * (used + free)) + '%'};
        if(effects) {
            el.find('.f').animate(mod_f);
            el.find('.u').animate(mod_u);
        } else {
            el.find('.f').css(mod_f);
            el.find('.u').css(mod_u);
        }
        /* update .count */
        el.find('.count').text(free + '/' + (used + free));
        if (effects)
            el.stop(true,true,true).effect('highlight', {}, 1000);
    }
};

$(document).ready(function(){
    /* This little `timeout' will hide the throbber of doom on Chrome
     * (sadly not on MobileSafari) and allow the `loading ...' GIF
     * to animate a bit */
    setTimeout(function(){
        tkb = new TKB();
        tkb.run();
    }, 0);
});

})();