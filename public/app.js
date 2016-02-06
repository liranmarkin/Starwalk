////////// Canvas //////////

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

{ // Resize the canvas
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

////////// Fit graph into view //////////

var players = [];
var currentPlayer = 0;
var killedPlayers = 0;

var size = {
	vertexRadius: 15,
	enlargedVertexRadius: 30,
	edgeWidth: 3,
	vertexCircleLineWidth: 5,
	visitedEdgeWidth: 3 * 3,
	pathHeadBorderWidth: 10,
};

var style = {
	background: '#11314e',
	player: [
		'#ec6fed',
		'#faca22',
		'#70f13d',
		'yellow',
		'pink',
	],
	playerDark: [
		'#d884ff',
		'#8a33b3',
		'#8a33b3',
		'#8a33b3',
		'#8a33b3',
		'#8a33b3',
	],
	edge: '#e0fbfd',
	vertex: '#e0fbfd',
	moveButton: '#56468c',
};

var GAME_TYPE_SINGLEPLAYER = 0,
	GAME_TYPE_LOCAL_MULTIPLAYER = 1,
	GAME_TYPE_MULTIPLAYER = 2;

var gameType = GAME_TYPE_LOCAL_MULTIPLAYER;

function scaleGraphToFitScreen() {
	var screenMinSide = Math.min(canvas.width, canvas.height);

	var xMin = Infinity,
		xMax = -Infinity,
		yMin = Infinity,
		yMax = -Infinity;

	for (var i = 0; i < V.length; ++i) {
		xMin = Math.min(xMin, V[i].x);
		xMax = Math.max(xMax, V[i].x);
		yMin = Math.min(yMin, V[i].y);
		yMax = Math.max(yMax, V[i].y);
	}

	var graphMinSide = Math.min(xMax - xMin, yMax - yMin);

	var scaleFactor = screenMinSide / graphMinSide;
	scaleFactor *= 0.7;

	screenCenterX = canvas.width / 2;
	screenCenterY = canvas.height / 2;

	graphCenterX = (xMax + xMin) / 2;
	graphCenterY = (yMax + yMin) / 2;


	var shiftX = screenCenterX - graphCenterX;
	var shiftY = screenCenterY - graphCenterY;

	for (var i = 0; i < V.length; ++i) {
		V[i].x += shiftX;
		V[i].y += shiftY;

		V[i].x = screenCenterX + (V[i].x - screenCenterX) * scaleFactor;
		V[i].y = screenCenterY + (V[i].y - screenCenterY) * scaleFactor;
	}

	for (prop in size) {
		size[prop] *= scaleFactor;
	}
}

////////// Defining the graph //////////

function connectEdges() {
	for (var i = 0; i < E.length; ++i) {
		E[i].from = V[E[i].fromIndex];
		E[i].to = V[E[i].toIndex];
	}
}

function vertexIndex(vertex) {
	for (var i = 0; i < V.length; ++i) {
		if (V[i] == vertex) {
			return i;
		}
	}
	console.assert(false);
}

function edgeBetween(u, v) {
	for (var i = 0; i < E.length; ++i) {
		if ((E[i].from == u && E[i].to == v) || (E[i].to == u && E[i].from == v))
			return E[i];
	}
	return null;
}

function vertexEdges(vertex) {
	var edges = [];

	for (var i = 0; i < E.length; ++i) {
		if (E[i].from == vertex || E[i].to == vertex) {
			edges.push(E[i]);
		}
	}
	return edges;
}

function removeEdge(e) {
	for (var i = 0; i < E.length; ++i) {
		if (e == E[i]) {
			E.splice(i, 1);
			--i;
		}
	}

	computeNeighbors();
}

function computeNeighbors() {
	for (var i = 0; i < V.length; ++i) {
		V[i].neighbors = [];
	}

	for (var i = 0; i < E.length; ++i) {
		E[i].from.neighbors.push(E[i].to);
		E[i].to.neighbors.push(E[i].from);
	}
}

function removeVertex(vertex) {
	for (var i = 0; i < E.length; ++i) {
		if (E[i].from == vertex || E[i].to == vertex) {
			E.splice(i, 1);
			--i;
		}
	}

	for (var i = 0; i < V.length; ++i) {
		if (V[i] == vertex) {
			V.splice(i, 1);
		}
	}

	computeNeighbors();
}

function isPlayer(vertex) {
	for (var i = 0; i < players.length; ++i) {
		if (players[i] == vertex) {
			return true;
		}
	}
	return false;
}

////////// Drawing the graph //////////

function fillCircle(x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI, false);
	ctx.fill();
}

function strokeCircle(x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI, false);
	ctx.stroke();
}

function strokeLine(x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function polygonPath(cx, cy, r, sides, rotation) {
	ctx.beginPath();

	ctx.moveTo(cx + Math.sin(rotation) * r, cy + Math.cos(rotation) * r);
	rotation += 2 * Math.PI / sides;

	for (var i = 0; i < sides - 1; ++i) {
		ctx.lineTo(cx + Math.sin(rotation) * r, cy + Math.cos(rotation) * r);
		rotation += 2 * Math.PI / sides;
	}
	ctx.closePath();
}

function drawGraph() {
	{ // Fill background
		ctx.fillStyle = style.background;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	{ // Draw the edges
		ctx.lineWidth = size.edgeWidth;

		for (var i = 0; i < E.length; ++i) {
			if (E[i].visited) {
				ctx.lineWidth = size.edgeWidth * 3;
				ctx.strokeStyle = style.player[E[i].visitedBy];
			}
			else {
				ctx.lineWidth = size.edgeWidth;
				ctx.strokeStyle = style.edge;
			}

			strokeLine(E[i].from.x, E[i].from.y, E[i].to.x, E[i].to.y);
		}
	}

	{ // Draw the vertexes
		for (var i = 0; i < V.length; ++i) {
			if (V[i].visited) {
				if (isPlayer(V[i]))
					continue;
				//ctx.shadowBlur = 10;
				//ctx.shadowColor = style.player[V[i].visitedBy];
				ctx.fillStyle = style.player[V[i].visitedBy];

				fillCircle(V[i].x, V[i].y, size.vertexRadius);
				ctx.shadowBlur = 0;
			}
			else {
				ctx.fillStyle = style.vertex;

				fillCircle(V[i].x, V[i].y, size.vertexRadius);
			}
		}
	}

	{ // Draw the players
		for (var i = 0; i < players.length; ++i) {
			if (players[i]) {
				ctx.fillStyle = style.player[i];
				ctx.fillStyle = '#212332';
				ctx.fillStyle = '#2b2e42';

				//ctx.shadowBlur = 10;
				ctx.shadowColor = style.playerDark[i];

				ctx.strokeStyle = '#212332';
				ctx.strokeStyle = style.player[i];
				ctx.lineWidth = size.polygonPath;
				//fillCircle(players[i].x, players[i].y, size.vertexRadius * 1.2);
				polygonPath(players[i].x, players[i].y, size.vertexRadius * 1.5, 6, 0);
				ctx.fill();
				ctx.stroke();

				ctx.shadowBlur = 0;
			}
		}
	}
}

////////// Gameplay //////////

function randomPositionPlayers(playerCount) {
	players = [];
	while (players.length < playerCount) {
		var vertex = V[Math.floor(Math.random() * V.length)];

		if (!vertex.visited) {
			vertex.visited = true;
			players.push(vertex);
		}
	}
}

function isInsideCircle(x, y, cx, cy, r) {
	var dx = x - cx;
	var dy = y - cy;
	return (dx * dx + dy * dy < r * r);
}

function movePlayerToVertex(player, vertex) {
	vertex.visited = true;
	vertex.visitedBy = player;
	var edge = edgeBetween(players[player], vertex);
	edge.visited = true;
	edge.visitedBy = player;
	players[player] = vertex;
}

function selectNextMove() {
	{ // Draw move buttons
		drawGraph();

		ctx.strokeStyle = style.player[currentPlayer];
		ctx.lineWidth = size.vertexCircleLineWidth;

		var edges = vertexEdges(players[currentPlayer]);
		var unvisitedEdges = edges.filter(function(e) { return !e.visited; });

		if (unvisitedEdges.length == 0) {
			server.cannotMove();
			return;
		}

		unvisitedEdges.forEach(function(e) {
			var neighbor = (e.from == players[currentPlayer]) ? e.to : e.from;
			strokeCircle(neighbor.x, neighbor.y, size.enlargedVertexRadius);
		});
	}

	canvas.addEventListener('click', processClick);

	function processClick(e) {
		var x = e.clientX;
		var y = e.clientY;

		for (var i = 0; i < players[currentPlayer].neighbors.length; ++i) {
			var neighbor = players[currentPlayer].neighbors[i];
			var edge = edgeBetween(players[currentPlayer], neighbor);

			if (!edge.visited && isInsideCircle(x, y, neighbor.x, neighbor.y, size.enlargedVertexRadius)) {
				vertexSelected(neighbor);
				return;
			}
		}
	}

	function vertexSelected(v) {
		canvas.removeEventListener('click', processClick);

		movePlayerToVertex(currentPlayer, v);

		switch (gameType) {
			case GAME_TYPE_SINGLEPLAYER:
				simulateOthers();
				selectNextMove();
				break;
			case GAME_TYPE_LOCAL_MULTIPLAYER:
				currentPlayer = (currentPlayer + 1) % players.length;
				selectNextMove();
				break;
			case GAME_TYPE_MULTIPLAYER:
				// Send to server
				server.sendMove(vertexIndex(v));
				drawGraph();
				break;
		}
	}
}

function simulateOthers() {
	for (var i = 1; i < players.length; ++i) {
		var otherPlayer =  players[i];
		var unvisitedNeighbors = [];

		var edges = vertexEdges(players[i]);
		var unvisitedEdges = edges.filter(function(e) { return !e.visited; });

		if (unvisitedEdges.length == 0)
			continue;

		var selectedEdge = unvisitedEdges[Math.floor(Math.random() * unvisitedEdges.length)];
		var selectedNeighbor = (selectedEdge.from == players[i]) ? selectedEdge.to : selectedEdge.from;
		movePlayerToVertex(i, selectedNeighbor);
	}
}

////////// Editor //////////

function editor() {
	///// Right click delete /////
	canvas.addEventListener('contextmenu', function(e) {
		e.preventDefault();

		var x = e.clientX;
		var y = e.clientY;

		///// Remove edges /////
		if (e.ctrlKey) {
			if (!players[0])
				return;

			for (var i = 0; i < V.length; ++i) {
				var vertex = V[i];

				if (isInsideCircle(x, y, vertex.x, vertex.y, size.vertexRadius)) {
					var edge = edgeBetween(players[0], vertex);

					if (edge) {
						removeEdge(edge);
					}
					drawGraph();
					break;
				}
			}
		}
		///// Remove vertexes /////
		else {
			for (var i = 0; i < V.length; ++i) {
				var vertex = V[i];

				if (isInsideCircle(x, y, vertex.x, vertex.y, size.vertexRadius)) {
					removeVertex(vertex);
					drawGraph();
				}
			}
		}
	});

	canvas.addEventListener('click', function(e) {
		var x = e.clientX;
		var y = e.clientY;

		///// Add vertexes /////
		if (e.shiftKey) {
			var vertex = {x: x, y: y, neighbors: []};
			V.push(vertex);
			players[0] = vertex;
			drawGraph();
		}
		///// Add edges /////
		else if (e.ctrlKey) {
			if (!players[0])
				return;

			for (var i = 0; i < V.length; ++i) {
				var vertex = V[i];

				if (isInsideCircle(x, y, vertex.x, vertex.y, size.vertexRadius)) {
					if (vertex != players[0] && edgeBetween(vertex, players[0]) == null) {
						E.push({from: players[0], to: vertex});
						drawGraph();
						break;
					}
				}
			}
		}
		///// Move vertexes /////
		else if (e.altKey) {
			if (!players[0])
				return;

			players[0].x = x;
			players[0].y = y;
			drawGraph();
		}
		///// Select vertexes /////
		else {
			for (var i = 0; i < V.length; ++i) {
				var vertex = V[i];

				if (isInsideCircle(x, y, vertex.x, vertex.y, size.vertexRadius)) {
					players[0] = vertex;
					drawGraph();
					break;
				}
			}
		}
	});

	function save() {
		var graph = 'V = [<br>';

		for (var i = 0; i < V.length; ++i) {
			V[i].index = i;
			graph += ('{x: ' + V[i].x + ', y:' + V[i].y + '},<br>');
		}

		graph += '];<br><br>';

		graph += 'E = [<br>';

		for (var i = 0; i < E.length; ++i) {
			graph += '{fromIndex: ' + E[i].from.index + ', toIndex:' + E[i].to.index + '},<br>';
		}

		graph += '];<br>';


		window.open('').document.write(graph);

	}

	{ // Listen to Ctrl-S
		var isCtrl = false;
		document.onkeyup = function(e){
			if (e.keyCode == 17)
				isCtrl = false;
		}

		document.onkeydown=function(e){
			if (e.keyCode == 17)
				isCtrl=true;
			if (e.keyCode == 83 && isCtrl == true) {
				console.log('hey');
				save();
				return false;
			}
		}
	}
}

function game() {
	if (gameType == GAME_TYPE_SINGLEPLAYER || gameType == GAME_TYPE_LOCAL_MULTIPLAYER) {
		loadLevelGraph(1);
		scaleGraphToFitScreen();
		connectEdges(V, E);
		computeNeighbors();

		randomPositionPlayers(2);

		for (var i = 0; i < players.length; ++i) {
			players[i].visited = true;
			players[i].visitedBy = i;
		}

		drawGraph();

		selectNextMove();
	}
	else if (gameType == GAME_TYPE_MULTIPLAYER) {
		function startGame(level, playerIndex, startPositions) {
			currentPlayer = playerIndex;

			loadLevelGraph(level);
			scaleGraphToFitScreen();
			connectEdges(V, E);
			computeNeighbors();

			for (var i = 0; i < startPositions.length; i++) {
				players[i] = V[startPositions[i]];
				players[i].visited = true;
				players[i].visitedBy = i;
			}
			drawGraph();
			selectNextMove();
		}

		if (server.gameStarted) {
			startGame(server.color);
		}
		server.addStartGameListener(startGame);

		server.addUpdateListener(function(playerData) {
			server.allowMove = !playerData[currentPlayer].lost;
			for (var i = 0; i < playerData.length; ++i) {
				if(i == currentPlayer){
					continue;
				}
				movePlayerToVertex(i, V[playerData[i].current_vertex]);
			}
			drawGraph();
			if (server.allowMove)
				selectNextMove();
		});

		server.addGameOverListener(function() {
			alert('GAME OVER MAN!');
		});
	}
}

function endGame() {
	showLobby();
}

function openEditor() {
	connectEdges(V, E);
	computeNeighbors();
	players = [null];
	drawGraph();
	editor();
}

//game();
//openEditor();
