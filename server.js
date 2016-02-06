var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var levels = [{
		NUM_OF_PLAYERS: 2,
		NUM_OF_VERTICIES: 42
	}];
const MIN_COLOR = 0;

var TURNS_MODE = false;

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});
var nextLevel =  Math.floor((Math.random() * levels.length));
var socketQueue = [];
var roomNumber = 0;
var rooms = {};
/*
	Room Template:
	[player,player,player,...],
	level
*/
var users = {}; //index is socket.id
/*User Template:
	current_vertex,
	color,
	played
*/

function GameOver(roomNumber){
	io.to(roomNumber).emit('gameOver');
}

function sendData(array, roomNumber){
	var obj = [];
	for(key in array){
		if(users[key].room != roomNumber){
			continue;
		}
		obj[users[key].color] = {
			current_vertex: users[key].current_vertex,
			lost: users[key].lost
		};
	}
	return obj;
};

function everyonePlayed(roomNumber){
	for(var i = 0;i<rooms[roomNumber].length;i++){
		var id = rooms[roomNumber][i];
		if(!users[id].played)
			return false;
	}
	return true;
};

function everyoneLost(roomNumber){
	for(var i = 0;i<rooms[roomNumber].length;i++){
		var id = rooms[roomNumber][i];
		if(!users[id].lost)
			return false;
	}
	return true;
};

function makeStep(roomNumber){
	for(var i = 0;i<rooms[roomNumber].length;i++){
		var id = rooms[roomNumber][i];
		users[id].played = false;
		/* ---same Vertex Fight---
		for(var j = 0;j<rooms[roomNumber].length;j++){
			var idj = rooms[roomNumber][j];
			if(j != i && users[id].current_vertex == users[idj].current_vertex){
				users[id].lost = true;
			}
		}*/
	}
	return true;
}


io.on('connection', function(socket){
	console.log('a user connected');
	socketQueue.push(socket);
	if(socketQueue.length == levels[nextLevel].NUM_OF_PLAYERS){
		var color = MIN_COLOR;
		rooms[roomNumber] = [];
		var verticies = [];
		for(var i = 0;i<levels[nextLevel].NUM_OF_VERTICIES;i++)
			verticies.push(i);
		verticies.sort(function(){return 0.5-Math.random();});
		verticies = verticies.slice(0,levels[nextLevel].NUM_OF_PLAYERS);
		for(var i = 0;i<socketQueue.length;i++){
			var element = socketQueue[i];
			users[element.id] = {
				current_vertex : verticies[i],
				visited_verticies : [],
				color: color,
				played: false,
				lost: false,
				room: roomNumber
			};
			rooms[roomNumber].push(element.id);
			element.emit('startGame',{color: color, vertex: verticies, level: nextLevel});
			color++;
			element.join(roomNumber);
		}
		nextLevel =  Math.floor((Math.random() * levels.length));
		roomNumber++;
		socketQueue = [];
		console.log('game started');
	}
	//console.log('there are '+Object.keys(users).length+' users online');
	socket.on('disconnect', function(){
		console.log('user disconnected');
		if(users[socket.id] !== undefined){
			var index = rooms[users[socket.id].room].indexOf(socket.id);
			if(index > -1){
				rooms[users[socket.id].room].splice(index,1);
			}
			delete users[socket.id];
		}
		else{
			var index = socketQueue.indexOf(socket);
			if(index > -1){
				socketQueue.splice(index,1);
			}
		}
		//console.log('there are '+Object.keys(users).length+' users online');
	});

	socket.on('move',function(vertex){
		if(users[socket.id] !== undefined && !users[socket.id].lost && !users[socket.id].played){
		    //users[socket.id].visited_verticies.push(users[socket.id].current_vertex);
		  	users[socket.id].current_vertex = vertex;
				if(!TURNS_MODE){
					users[socket.id].played = true;
			  	if(everyonePlayed(users[socket.id].room)){
						makeStep(users[socket.id].room);
			  		io.to(users[socket.id].room).emit('news',JSON.stringify(sendData(users,users[socket.id].room)));
			  	}
				}
				else{
					io.to(users[socket.id].room).emit('news',JSON.stringify({moved: {color: users[socket.id].color, current_vertex: vertex} }));
				}
		}
	});

	socket.on('forfeit',function(){
		if(users[socket.id] !== undefined){
			users[socket.id].lost = true;
			//users[socket.id].visited_verticies.push(users[socket.id].current_vertex);
			users[socket.id].played = true;
			socket.emit('gameOver');
			if(everyonePlayed(users[socket.id].room)){
				if(everyoneLost(users[socket.id].room)){
					GameOver(users[socket.id].room);
				}
				else{
					makeStep(users[socket.id].room);
					io.to(users[socket.id].room).emit('news',JSON.stringify(sendData(users,users[socket.id].room)));
				}
			}
		}
	});
});

http.listen(app.get('port') ,app.get('ip'), function () {
    console.log("listening at %s:%d ", app.get('ip'),app.get('port'));
});
